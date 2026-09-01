/**
 * The Store service. A port of prototype/aidos_proto/store.py on the dsh
 * event vocabulary. The log is append-only and in memory. Every read
 * derives from a fold of the log.
 *
 * SPEC.md section 10 is the contract.
 */

import type { AidosEvent } from "./events";
import { foldAidosEvents, createInitialState } from "./fold";
import type { AidosState } from "./fold";
import { checkGate, isLegalTransition } from "./gates";
import { planContextLineCount, validateAidosEvent } from "./invariants";
import { confidenceScoreOf, gateFractionOf } from "./projections";
import { PLAN_CONTEXT_LIMIT } from "./constants";
import {
  ContextTooLongError,
  EvidenceAuthorRefused,
  DuplicateSlug,
  GateRefused,
  UnknownKind,
  UnknownProject,
  UnknownTicket,
} from "./types";
import type {
  AidosConfig,
  Actor,
  ContextSection,
  EvidenceViewRow,
  PhaseView,
  PlanMetaView,
  PlanValue,
  ProjectId,
  ProjectView,
  SortKey,
  TicketId,
  TicketPage,
  TicketPageRow,
  TicketRow,
  TicketSnapshot,
  TicketState,
} from "./types";
import { slugFromTitle, workspaceKeyFromPath } from "./slug";
import { deepClone, refusalReason, rowOf } from "./helpers";

export interface StoreOptions {
  /** Replay an existing log at construction. */
  log?: AidosEvent[];
  /** Seconds as a float. Default Date.now() / 1000. */
  now?: () => number;
}

/** The plan of a project that never held one. */
const EMPTY_PLAN: PlanValue = {
  frontmatter: "",
  context: { preamble: "", contextSections: [] },
  rules: "",
};

/** Freeze one value and everything it holds. */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    deepFreeze(record[key]);
  }
  return Object.freeze(value);
}

/** One column getter of the tickets page sort. */
type RowGetter = (row: TicketPageRow) => unknown;

/** The sort columns per key, mirroring the prototype's _SORT_COLUMNS. */
const SORT_COLUMNS: Record<SortKey, RowGetter[]> = {
  id: [(row) => row.id],
  title: [(row) => row.title],
  phase: [(row) => row.phase, (row) => row.order],
  score: [(row) => row.score],
  gate_fraction: [(row) => row.gateFraction],
};

/** Compare two sort values. Null sorts before every value (SQLite). */
function compareValues(a: unknown, b: unknown): number {
  // Normalize undefined -> null so gateFraction nulls and undefineds sort consistently.
  if (a === undefined) a = null;
  if (b === undefined) b = null;
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return -1;
  }
  if (b === null) {
    return 1;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  const textA = String(a);
  const textB = String(b);
  if (textA < textB) {
    return -1;
  }
  if (textA > textB) {
    return 1;
  }
  return 0;
}

export class Store {
  constructor(config: AidosConfig, options?: StoreOptions) {
    this.config = config;
    this._nowFn = options?.now ?? (() => Date.now() / 1000);
    this._log = options?.log ? (deepClone(options.log) as AidosEvent[]) : [];
    this.replay();
  }

  readonly config: AidosConfig;

  private readonly _nowFn: () => number;
  private readonly _log: AidosEvent[] = [];
  private _state: AidosState = createInitialState();

  /**
   * Rebuild the derived state from the log. Construction folds
   * options.log; a corrupt record throws InvariantError here.
   */
  replay(): void {
    const state = createInitialState();
    for (const event of this._log) {
      foldAidosEvents(state, event);
    }
    this._state = state;
  }

  /** The whole log, oldest first, as a frozen copy. */
  events(): readonly AidosEvent[] {
    return deepFreeze(deepClone(this._log));
  }

  // ---- internal ----

  /** Validate, then append, then fold. The log changes only on allow. */
  private _append(event: AidosEvent): void {
    validateAidosEvent(this._state, event);
    this._log.push(event);
    foldAidosEvents(this._state, event);
  }

  /**
   * The at of one write to one ticket. The injectable clock may repeat a
   * value (ties are legal) but must never let a ticket's at fall, so the
   * store floors the clock at the ticket's last at and its last updatedAt.
   */
  private _atFor(ticketId: TicketId, floor?: number): number {
    let at = this._nowFn();
    const lastAt = this._state.lastAt.get(ticketId);
    if (lastAt !== undefined && lastAt > at) {
      at = lastAt;
    }
    if (floor !== undefined && floor > at) {
      at = floor;
    }
    return at;
  }

  /** The next free order in one phase, counted from 1. */
  private _nextOrder(projectId: ProjectId, phase: number): number {
    let max = 0;
    for (const snapshot of this._state.tickets.values()) {
      if (
        snapshot.projectId === projectId &&
        snapshot.phase === phase &&
        snapshot.order > max
      ) {
        max = snapshot.order;
      }
    }
    return max + 1;
  }

  /** Whether one workspace already holds the given slug on another ticket. */
  private _slugTaken(workspaceKey: string, slug: string, excludeId: TicketId | null): boolean {
    for (const snapshot of this._state.tickets.values()) {
      if (
        snapshot.workspaceKey === workspaceKey &&
        snapshot.slug === slug &&
        snapshot.id !== excludeId
      ) {
        return true;
      }
    }
    return false;
  }

  /** One ticket row from a folded snapshot. The one read code path. */
  private _row(snapshot: TicketSnapshot): TicketRow {
    return {
      id: snapshot.id,
      projectId: snapshot.projectId,
      title: snapshot.title,
      description: snapshot.description,
      body: snapshot.body,
      criteria: snapshot.criteria,
      phase: snapshot.phase,
      order: snapshot.order,
      state: snapshot.state,
      dependsOn: [...snapshot.dependsOn],
      allowlist: [...snapshot.allowlist],
    };
  }

  // ---- projects ----

  createProject(absPath: string, name: string): ProjectId {
    let max = 0;
    for (const id of this._state.projects.keys()) {
      if (id > max) {
        max = id;
      }
    }
    const projectId = max + 1;
    this._append({
      kind: "project/created",
      version: 1,
      projectId,
      absPath,
      name,
      at: this._nowFn(),
    });
    return projectId;
  }

  moveProject(projectId: ProjectId, absPath: string): void {
    const current = this._state.projects.get(projectId);
    if (!current) {
      throw new UnknownProject(projectId);
    }
    this._append({
      kind: "project/moved",
      version: 1,
      projectId,
      absPath,
      name: current.name,
      at: this._nowFn(),
    });
  }

  getProject(projectId: ProjectId): ProjectView {
    const project = this._state.projects.get(projectId);
    if (!project) {
      throw new UnknownProject(projectId);
    }
    return { id: projectId, absPath: project.absPath, name: project.name };
  }

  /** Every project, sorted by id. */
  projects(): ProjectView[] {
    return [...this._state.projects.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, project]) => ({
        id,
        absPath: project.absPath,
        name: project.name,
      }));
  }

  /** The id of the project at one path, or null. */
  findProject(absPath: string): ProjectId | null {
    for (const [id, project] of this._state.projects) {
      if (project.absPath === absPath) {
        return id;
      }
    }
    return null;
  }

  // ---- phases ----

  setPhase(
    projectId: ProjectId,
    number: number,
    opts?: { title?: string; state?: string; actor?: Actor },
  ): void {
    if (!this._state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const current = this._state.phases.get(projectId)?.get(number);
    this._append({
      kind: "phase/set",
      version: 1,
      projectId,
      number,
      title: opts?.title ?? current?.title ?? "",
      state: opts?.state ?? current?.state ?? "open",
      at: this._nowFn(),
    });
  }

  getPhase(projectId: ProjectId, number: number): PhaseView {
    if (!this._state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const phase = this._state.phases.get(projectId)?.get(number);
    return {
      projectId,
      number,
      title: phase?.title ?? "",
      state: phase?.state ?? "open",
    };
  }

  /** Every phase of one project, sorted by number. */
  phasesFor(projectId: ProjectId): PhaseView[] {
    const phases = this._state.phases.get(projectId);
    if (!phases) {
      return [];
    }
    return [...phases.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([number, phase]) => ({
        projectId,
        number,
        title: phase.title,
        state: phase.state,
      }));
  }

  // ---- plan meta ----

  setPlanMeta(
    projectId: ProjectId,
    opts: {
      frontmatter?: string;
      preamble?: string;
      contextSections?: ContextSection[];
      rules?: string;
      actor?: Actor;
    },
  ): void {
    if (!this._state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const current = this._state.plans.get(projectId) ?? EMPTY_PLAN;
    const next: PlanValue = {
      frontmatter: opts.frontmatter ?? current.frontmatter,
      context: {
        preamble: opts.preamble ?? current.context.preamble,
        contextSections: (opts.contextSections ?? current.context.contextSections).map(
          (section) => ({ ...section }),
        ),
      },
      rules: opts.rules ?? current.rules,
    };
    const lines = planContextLineCount(next);
    if (lines > PLAN_CONTEXT_LIMIT) {
      throw new ContextTooLongError(lines - PLAN_CONTEXT_LIMIT);
    }
    this._append({
      kind: "plan/change",
      version: 1,
      projectId,
      plan: next,
      at: this._nowFn(),
    });
  }

  /** Replace only the rules of a plan. One whole-value event. */
  setRules(projectId: ProjectId, rules: string, actor?: Actor): void {
    if (!this._state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const current = this._state.plans.get(projectId) ?? EMPTY_PLAN;
    this._append({
      kind: "plan/change",
      version: 1,
      projectId,
      plan: { ...current, rules },
      at: this._nowFn(),
    });
  }

  getPlanMeta(projectId: ProjectId): PlanMetaView & { rules: string } {
    if (!this._state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const plan = this._state.plans.get(projectId);
    if (!plan) {
      return { frontmatter: "", preamble: "", contextSections: [], rules: "" };
    }
    return {
      frontmatter: plan.frontmatter,
      preamble: plan.context.preamble,
      contextSections: plan.context.contextSections.map((section) => ({
        ...section,
      })),
      rules: plan.rules,
    };
  }

  // ---- tickets ----

  createTicket(
    projectId: ProjectId,
    title: string,
    description: string,
    opts?: {
      actor?: Actor;
      body?: string;
      criteria?: string;
      phase?: number;
      order?: number;
      allowlist?: string[];
      dependsOn?: string[];
      slug?: string;
    },
  ): TicketId {
    if (!this._state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const ticketId = this._state.nextTicketId;
    const workspaceKey = workspaceKeyFromPath(this._state.projects.get(projectId)!.absPath);
    const slug = opts?.slug?.trim() || slugFromTitle(title) || `ticket-${ticketId}`;
    if (this._slugTaken(workspaceKey, slug, null)) {
      throw new DuplicateSlug(slug, workspaceKey);
    }
    const phase = opts?.phase ?? 1;
    const order = opts?.order ?? this._nextOrder(projectId, phase);
    const at = this._nowFn();
    const snapshot: TicketSnapshot = {
      id: ticketId,
      projectId,
      title,
      description,
      body: opts?.body ?? "",
      criteria: opts?.criteria ?? "",
      phase,
      order,
      state: "open",
      allowlist: [...(opts?.allowlist ?? [])],
      dependsOn: [...(opts?.dependsOn ?? [])],
      slug,
      workspaceKey,
      revision: 1,
      createdAt: at,
      updatedAt: at,
    };
    this._append({
      kind: "ticket/change",
      version: 1,
      operation: "create",
      ticket: snapshot,
      at,
    });
    return ticketId;
  }

  setTicket(
    ticketId: TicketId,
    opts: {
      actor?: Actor;
      title?: string;
      description?: string;
      body?: string;
      criteria?: string;
      phase?: number;
      order?: number;
      allowlist?: string[];
      dependsOn?: string[];
      slug?: string;
    },
  ): void {
    const prev = this._state.tickets.get(ticketId);
    if (!prev) {
      throw new UnknownTicket(ticketId);
    }
    const nextSlug = opts.slug?.trim() ?? prev.slug;
    if (nextSlug !== prev.slug && this._slugTaken(prev.workspaceKey, nextSlug, ticketId)) {
      throw new DuplicateSlug(nextSlug, prev.workspaceKey);
    }
    const at = this._atFor(ticketId, prev.updatedAt);
    const snapshot: TicketSnapshot = {
      ...prev,
      title: opts.title ?? prev.title,
      description: opts.description ?? prev.description,
      body: opts.body ?? prev.body,
      criteria: opts.criteria ?? prev.criteria,
      phase: opts.phase ?? prev.phase,
      order: opts.order ?? prev.order,
      allowlist: opts.allowlist ? [...opts.allowlist] : prev.allowlist,
      dependsOn: opts.dependsOn ? [...opts.dependsOn] : prev.dependsOn,
      slug: nextSlug,
      revision: prev.revision + 1,
      updatedAt: at,
    };
    this._append({
      kind: "ticket/change",
      version: 1,
      operation: "set",
      ticket: snapshot,
      at,
    });
  }

  getTicket(ticketId: TicketId): TicketRow {
    const snapshot = this._state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    return this._row(snapshot);
  }

  /** Every ticket of one project, in phase and order. */
  ticketsFor(projectId: ProjectId): TicketRow[] {
    const rows: TicketRow[] = [];
    for (const snapshot of this._state.tickets.values()) {
      if (snapshot.projectId === projectId) {
        rows.push(this._row(snapshot));
      }
    }
    rows.sort((a, b) => a.phase - b.phase || a.order - b.order || a.id - b.id);
    return rows;
  }

  ticketsPage(opts?: {
    projectId?: ProjectId;
    sort?: SortKey;
    descending?: boolean;
    limit?: number;
    offset?: number;
  }): TicketPage {
    const sort = opts?.sort ?? "id";
    const descending = opts?.descending ?? false;
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    const columns = SORT_COLUMNS[sort];
    if (!columns) {
      throw new Error(`unknown sort key: '${sort}'`);
    }

    const matching: TicketPageRow[] = [];
    for (const snapshot of this._state.tickets.values()) {
      if (opts?.projectId !== undefined && snapshot.projectId !== opts.projectId) {
        continue;
      }
      const evidence = this._state.evidence.get(snapshot.id) ?? [];
      matching.push({
        ...this._row(snapshot),
        score: confidenceScoreOf(this.config, evidence),
        gateFraction: gateFractionOf(this.config, snapshot, evidence),
      });
    }
    const total = matching.length;

    const direction = descending ? -1 : 1;
    matching.sort((a, b) => {
      for (const get of columns) {
        const order = compareValues(get(a), get(b));
        if (order !== 0) {
          return order * direction;
        }
      }
      return (a.id - b.id) * direction;
    });

    return {
      page: matching.slice(offset, offset + limit),
      total,
    };
  }

  // ---- evidence ----

  attachEvidence(
    ticketId: TicketId,
    kind: string,
    payload: Record<string, unknown>,
    actor: Actor,
  ): void {
    const def = this.config.kinds.find((candidate) => candidate.id === kind);
    if (!def) {
      throw new UnknownKind(kind);
    }
    if (!def.allowedAuthors.includes(actor)) {
      throw new EvidenceAuthorRefused(kind, actor);
    }
    if (!this._state.tickets.has(ticketId)) {
      throw new UnknownTicket(ticketId);
    }
    const at = this._atFor(ticketId);
    this._append({
      kind: "evidence/attached",
      version: 1,
      ticketId,
      row: {
        kind,
        author: actor,
        at,
        payload: deepClone(payload),
      },
    });
  }

  /** Every evidence row on one ticket, oldest first. */
  evidenceFor(ticketId: TicketId): EvidenceViewRow[] {
    const rows = this._state.evidence.get(ticketId);
    if (!rows) {
      return [];
    }
    return rows.map((row) => ({
      kind: row.kind,
      payload: deepClone(row.payload),
      author: row.author,
      createdAt: row.at,
    }));
  }

  /** Sum one weight per kind per distinct author. Advisory only. */
  confidenceScore(ticketId: TicketId): number {
    return confidenceScoreOf(this.config, this._state.evidence.get(ticketId) ?? []);
  }

  addComment(ticketId: TicketId, text: string, author: Actor): void {
    if (!this._state.tickets.has(ticketId)) {
      throw new UnknownTicket(ticketId);
    }
    this._append({
      kind: "comment/added",
      version: 1,
      ticketId,
      text,
      author,
      at: this._atFor(ticketId),
    });
  }

  // ---- transitions ----

  moveTicket(ticketId: TicketId, toState: TicketState, actor: Actor): void {
    const ticket = this._state.tickets.get(ticketId);
    if (!ticket) {
      throw new UnknownTicket(ticketId);
    }
    const fromState = ticket.state;

    // 1. The pair must be legal. An illegal pair is a refusal like any
    //    other: it appends one aidos/refusal record and changes no state.
    if (!isLegalTransition(fromState, toState)) {
      this._appendRefusal(
        ticketId,
        fromState,
        toState,
        actor,
        "no gate configured for this transition",
      );
      throw new GateRefused({ noGate: true, fromState, toState, actor });
    }

    // 2. The gate. A refusal appends one aidos/refusal record, then throws.
    const evidence = this._state.evidence.get(ticketId) ?? [];
    try {
      checkGate(this.config, ticket, evidence, toState, actor);
    } catch (error) {
      if (error instanceof GateRefused) {
        this._appendRefusal(
          ticketId,
          fromState,
          toState,
          actor,
          refusalReason(error.missingKinds, error.allowedActors),
        );
        throw error;
      }
      throw error;
    }

    // 3. The move itself. One whole-value ticket/change record.
    const at = this._atFor(ticketId, ticket.updatedAt);
    const snapshot: TicketSnapshot = {
      ...ticket,
      state: toState,
      revision: ticket.revision + 1,
      updatedAt: at,
    };
    this._append({
      kind: "ticket/change",
      version: 1,
      operation: "move",
      ticket: snapshot,
      at,
    });
  }

  private _appendRefusal(
    ticketId: TicketId,
    fromState: TicketState,
    toState: TicketState,
    actor: Actor,
    reason: string,
  ): void {
    this._append({
      kind: "aidos/refusal",
      version: 1,
      ticketId,
      fromState,
      toState,
      actor,
      reason,
      at: this._nowFn(),
    });
  }
}
