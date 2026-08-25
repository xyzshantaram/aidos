/**
 * The aidos-core service. A Cordis Service over the session log, following
 * the dsh-goal pattern. SPEC-B1.md sections 4b and 6 are the contract.
 *
 * The service wraps the B0 kernel over the session log: reads fold the
 * session's aidos events and run the pure projection units; writes validate
 * (the invariant), append one whole-value aidos event via
 * `session.append`, then fold. The author is always stamped from the entry
 * point — the tool body passes the agent, and the agent is never read from
 * a payload.
 */

import type { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { z as zod } from "zod";
import type { Agent } from "@deepseek-ai/dsh-agent";
import { Session } from "@deepseek-ai/dsh-session";
import type { SessionEvent } from "@deepseek-ai/dsh-session";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
// The Remote decorator and the Typert service base: the B2 human surface.
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
// Load the Context augmentations the service reads (workspace binding and
// the projection registry) and the projection table its units merge into.
import "@deepseek-ai/dsh-workspace";
import "@deepseek-ai/dsh-session-projection";
import type { KindDef } from "../kernel/types";

// The node builtins ("fs", "path") are declared in ./node-builtins.d.ts.
import { readFileSync } from "fs";
import { isAbsolute, join, basename } from "path";
import { createInitialState } from "../kernel/fold";
import type { AidosState } from "../kernel/fold";
import { validateAidosEvent, planContextLineCount } from "../kernel/invariants";
import { checkGate, isLegalTransition } from "../kernel/gates";
import {
  confidenceScoreOf,
  gateFractionOf,
  ticketsProjection,
} from "../kernel/projections";
import type { TicketView } from "../kernel/projections";
import { parsePlan, renderPlan } from "../plan/plan";
import type { PlanTicket } from "../plan/plan";
import { DEFAULT_CONFIG, PLAN_CONTEXT_LIMIT } from "../kernel/constants";
import { STATE_ORDER } from "../kernel/types";
import { slugFromTitle, workspaceKeyFromPath } from "../kernel/slug";
import { delegationDepthOf } from "@deepseek-ai/dsh-subagent";
import { scratchRootForAgent } from "../tools/scratch";
import type {
  Actor,
  AidosConfig,
  CommentRecord,
  ContextSection,
  EvidenceRow,
  PlanValue,
  ProjectId,
  TicketId,
  TicketRow,
  TicketSnapshot,
  TicketState,
} from "../kernel/types";
import {
  AllowlistActorRefused,
  AllowlistCoverageRefused,
  ContextTooLongError,
  EvidenceAuthorRefused,
  DuplicateSlug,
  ForeignWorkspace,
  GateRefused,
  ProjectNotEmptyError,
  UnknownKind,
  UnknownProject,
  UnknownTicket,
} from "../kernel/types";
import type { AidosEvent } from "../kernel/events";
import { AIDOS_EVENT_TYPES, foldSessionEvent, registerAidosInvariant } from "./invariant";
import { registerAidosSessionEventTypes } from "./session-events";

/** The session event types the aidos stream owns (the kernel event kinds). */
export { AIDOS_EVENT_TYPES };

/**
 * A payload that is not one JSON object. The tool renders it as
 * `bad_payload`; the service refuses it before any append.
 */
export class BadPayloadError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * A plan file that could not be read. The tool renders it as
 * `file_not_read`; the refusal carries the path.
 */
export class FileNotReadError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(message);
    this.path = path;
  }
}

// ---- the session event vocabulary ----

declare module "@deepseek-ai/dsh-session/types" {
  interface SessionEventMap {
    "ticket/change": import("../kernel/events").TicketChangeEvent;
    "evidence/attached": import("../kernel/events").EvidenceAttachedEvent;
    "plan/change": import("../kernel/events").PlanChangeEvent;
    "comment/added": import("../kernel/events").CommentAddedEvent;
    "aidos/refusal": import("../kernel/events").RefusalEvent;
    "project/created": import("../kernel/events").ProjectCreatedEvent;
    "project/moved": import("../kernel/events").ProjectMovedEvent;
    "phase/set": import("../kernel/events").PhaseSetEvent;
  }
}

// ---- the projection table ----

declare module "@deepseek-ai/dsh-session-projection/types" {
  interface SessionProjectionMap {
    /** Ticket id to the board row: the snapshot plus score and fraction. */
    "aidos.tickets": Record<string, TicketView>;
    /** Ticket id to its evidence rows, oldest first. */
    "aidos.evidence": Record<string, EvidenceRow[]>;
    /** Project id to the whole-value plan. */
    "aidos.plan": Record<string, PlanValue>;
    /** Ticket id to its comments, oldest first. */
    "aidos.comments": Record<string, CommentRecord[]>;
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    aidos: AidosService;
  }
}

// ---- the aidos settings namespace ----

/** The settings shape of one evidence kind. */
export interface AidosSettingsKind {
  id: string;
  label: string;
  description: string;
  weight: number;
  allowedAuthors: Actor[];
}

/** The settings shape of one gate. */
export interface AidosSettingsGate {
  fromState: TicketState;
  toState: TicketState;
  requiredKinds: string[];
  allowedActors: Actor[];
}

/** The resolved value of the `aidos` settings namespace. */
export interface AidosSettings {
  kinds: AidosSettingsKind[];
  gates: AidosSettingsGate[];
}

const ACTOR_UNION = z.union(["agent", "user", "system"]);

/** The schemastery schema of the aidos settings namespace. */
export const AIDOS_SETTINGS_SCHEMA = z.object({
  kinds: z
    .array(
      z.object({
        id: z.string().required(),
        label: z.string().default(""),
        description: z.string().default(""),
        weight: z.number().default(1),
        allowedAuthors: z.array(ACTOR_UNION).default(["agent", "user"]),
      }),
    )
    .default([]),
  gates: z
    .array(
      z.object({
        fromState: z.union([...STATE_ORDER]).required(),
        toState: z.union([...STATE_ORDER]).required(),
        requiredKinds: z.array(z.string()).default([]),
        allowedActors: z.array(ACTOR_UNION).default([]),
      }),
    )
    .default([]),
});

/**
 * Validate one resolved settings value and detach it as an AidosConfig.
 * A gate referencing an unregistered kind fails here, at config load, not at
 * gate time (SPEC-B1 decision 14).
 */
function resolveConfig(settings: AidosSettings): AidosConfig {
  const kinds = settings.kinds.map((kind) => ({
    id: kind.id,
    label: kind.label,
    description: kind.description,
    weight: kind.weight,
    allowedAuthors: [...kind.allowedAuthors],
  }));
  const gates = settings.gates.map((gate) => ({
    fromState: gate.fromState,
    toState: gate.toState,
    requiredKinds: [...gate.requiredKinds],
    allowedActors: [...gate.allowedActors],
  }));
  const known = new Set(kinds.map((kind) => kind.id));
  for (const gate of gates) {
    for (const kind of gate.requiredKinds) {
      if (!known.has(kind)) {
        throw new Error(
          `aidos config: gate ${gate.fromState} -> ${gate.toState} requires an unregistered kind ${kind}`,
        );
      }
    }
  }
  return { kinds, gates };
}

// ---- projection state and apply bodies (plain JSON per the unit contract) ----

/** The internal state of the aidos.tickets unit: snapshots plus evidence. */
export interface TicketsProjectionState {
  tickets: Record<string, TicketSnapshot>;
  evidence: Record<string, EvidenceRow[]>;
}

/** The projection-grade fold of the tickets unit. */
export function applyTicketsProjection(
  state: TicketsProjectionState,
  event: SessionEvent,
): TicketsProjectionState {
  if (event.type === "ticket/change") {
    const ticket = event.data.ticket;
    return {
      tickets: { ...state.tickets, [String(ticket.id)]: ticket },
      evidence: state.evidence,
    };
  }
  if (event.type === "evidence/attached") {
    const id = String(event.data.ticketId);
    const rows = state.evidence[id] ?? [];
    return {
      tickets: state.tickets,
      evidence: { ...state.evidence, [id]: [...rows, event.data.row] },
    };
  }
  return state;
}

/** The projection-grade fold of the aidos.evidence unit. */
export function applyEvidenceProjection(
  state: Record<string, EvidenceRow[]>,
  event: SessionEvent,
): Record<string, EvidenceRow[]> {
  if (event.type !== "evidence/attached") return state;
  const id = String(event.data.ticketId);
  const rows = state[id] ?? [];
  return { ...state, [id]: [...rows, event.data.row] };
}

/** The projection-grade fold of the aidos.plan unit. */
export function applyPlanProjection(
  state: Record<string, PlanValue>,
  event: SessionEvent,
): Record<string, PlanValue> {
  if (event.type !== "plan/change") return state;
  return { ...state, [String(event.data.projectId)]: event.data.plan };
}

/** The projection-grade fold of the aidos.comments unit. */
export function applyCommentsProjection(
  state: Record<string, CommentRecord[]>,
  event: SessionEvent,
): Record<string, CommentRecord[]> {
  if (event.type !== "comment/added") return state;
  const id = String(event.data.ticketId);
  const rows = state[id] ?? [];
  return {
    ...state,
    [id]: [
      ...rows,
      {
        ticketId: event.data.ticketId,
        text: event.data.text,
        author: event.data.author,
        at: event.data.at,
      },
    ],
  };
}

// ---- projection schemas (zod, the wire payload validator) ----

const STATE_ENUM = zod.enum([...STATE_ORDER]);
const ACTOR_ZOD = zod.union([
  zod.literal("agent"),
  zod.literal("user"),
  zod.literal("system"),
]);
const EVIDENCE_ROW_ZOD = zod.object({
  kind: zod.string(),
  author: ACTOR_ZOD,
  at: zod.number(),
  payload: zod.record(zod.string(), zod.unknown()),
});
const TICKET_VIEW_ZOD = zod.object({
  id: zod.number(),
  projectId: zod.number(),
  title: zod.string(),
  description: zod.string(),
  body: zod.string(),
  criteria: zod.string(),
  phase: zod.number(),
  order: zod.number(),
  state: STATE_ENUM,
  confidenceScore: zod.number(),
  gateFraction: zod.number().nullable(),
  updatedAt: zod.number(),
  workspaceKey: zod.string(),
  dependsOn: zod.array(zod.string()),
});
const PLAN_VALUE_ZOD = zod.object({
  frontmatter: zod.string(),
  context: zod.object({
    preamble: zod.string(),
    contextSections: zod.array(
      zod.object({ heading: zod.string(), text: zod.string(), index: zod.number() }),
    ),
  }),
  rules: zod.string(),
});
const COMMENT_ZOD = zod.object({
  ticketId: zod.number(),
  text: zod.string(),
  author: ACTOR_ZOD,
  at: zod.number(),
});
const TICKETS_PROJECTION_ZOD = zod.record(zod.string(), TICKET_VIEW_ZOD);
const EVIDENCE_PROJECTION_ZOD = zod.record(zod.string(), zod.array(EVIDENCE_ROW_ZOD));
const PLAN_PROJECTION_ZOD = zod.record(zod.string(), PLAN_VALUE_ZOD);
const COMMENTS_PROJECTION_ZOD = zod.record(zod.string(), zod.array(COMMENT_ZOD));

// ---- shared small helpers ----

/** One plain JSON object. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Clone one JSON-safe value; the log must never alias caller data. */
function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = deepClone((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
}

/** One ticket row from a folded snapshot. The one read code path. */
function rowOf(snapshot: TicketSnapshot): TicketRow {
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
  };
}

/** The title a newly created phase takes when none is named. */
const DEFAULT_PHASE_TITLE = "Untitled phase";

/** The refusal reason string, mirroring the prototype's _refusal_reason. */
function refusalReason(missing: string[], allowedActors: string[]): string {
  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`missing evidence kinds: ${missing.join(", ")}`);
  }
  if (allowedActors.length > 0) {
    parts.push(`allowed actors: ${allowedActors.join(", ")}`);
  }
  return parts.join(" ");
}

// ---- the service ----

/** One per-session fold cache. */
interface SessionCache {
  state: AidosState;
  observedSeq: number;
}

export interface AidosCoreConfig {
  /** The project name a session takes when it binds its workspace. */
  defaultProjectName?: string;
}

export interface SetTicketArgs {
  ticketId?: number | string;
  projectId?: number;
  title?: string;
  description?: string;
  body?: string;
  criteria?: string;
  phase?: number;
  phaseTitle?: string;
  order?: number;
  slug?: string;
  /**
   * Ticket dependencies as `<workspaceKey>:<ticketId>` references. Empty
   * or absent leaves the field unchanged on edit. Informational only: no
   * gate enforces them.
   */
  dependsOn?: string[];
  /**
   * The file allowlist for this ticket. User-only: the agent tool path
   * cannot set it, and every path must be covered by an approved
   * `builtin:file_allowlist` evidence row on this ticket.
   */
  allowlist?: string[];
}

export interface AttachEvidenceArgs {
  ticketId: number | string;
  kind: string;
  payload?: Record<string, unknown>;
}

export interface MoveTicketArgs {
  ticketId: number | string;
  to: TicketState;
}

export interface AddCommentArgs {
  ticketId: number | string;
  text: string;
}

export interface PlanImportArgs {
  file: string;
  projectId?: number;
}

export interface EvidenceView {
  ticketId: number;
  kind: string;
  payload: Record<string, unknown>;
}

/** One dependency-search hit, carrying the stored reference fields. */
export interface TicketSearchResult {
  sessionId: string;
  ticketId: number;
  title: string;
  state: string;
  workspaceKey: string;
  dependsOn: string[];
}

/**
 * The ticket service, backed by the owning session log. The constructor
 * registers the four projection units and the invariant companion.
 * The class extends TypertRemoteService, so the Gateway exports the
 * user-actor entry points under the `aidos` namespace. The agent tool
 * layer calls the agent-actor methods directly.
 */
export class AidosService extends TypertRemoteService {
  static inject = [
    "agents",
    "sessionProjections",
    "invariants",
    "settings",
    "workspaceRegistry",
  ];

  static Config = z.object({});

  private readonly _config: AidosCoreConfig;
  private readonly _caches = new WeakMap<Session, SessionCache>();
  private _resolvedConfig: AidosConfig;
  constructor(ctx: Context, config?: AidosCoreConfig) {
    super(ctx, "aidos");

    // Register the aidos session event types with the host reader before any
    // session bootstrap append (project/created in _ensureProject below) can
    // happen. Idempotent; see ./session-events for the issue-#52 rationale.
registerAidosSessionEventTypes();

    // Stamp ignorable:true onto aidos-typed events before deepFreeze runs.
    // deepFreeze calls Object.freeze on the envelope first, so a temporary
    // trap on Object.freeze catches it. Lifecycle-owned: restored on dispose.
    ctx.effect(() => {
      const originalAppend = Session.prototype.append;
      const patchedAppend = function (this: Session, type: string, data: any, ...opts: any[]) {
        if (!AIDOS_EVENT_TYPES.has(type)) return (originalAppend as any).call(this, type, data, ...opts);
        const originalFreeze = Object.freeze;
        let injected = false;
        Object.freeze = function (obj: any) {
          if (!injected && obj && typeof obj.type === "string" && AIDOS_EVENT_TYPES.has(obj.type)) {
            obj.ignorable = true;
            injected = true;
          }
          return originalFreeze.call(this, obj);
        };
        try {
          return (originalAppend as any).call(this, type, data, ...opts);
        } finally {
          Object.freeze = originalFreeze;
        }
      } as unknown as typeof Session.prototype.append;
      Session.prototype.append = patchedAppend;
      return () => { Session.prototype.append = originalAppend; };
    });
    this._config = config ?? {};
    this._resolvedConfig = {
      kinds: DEFAULT_CONFIG.kinds.map((kind) => ({ ...kind, allowedAuthors: [...kind.allowedAuthors] })),
      gates: DEFAULT_CONFIG.gates.map((gate) => ({
        ...gate,
        requiredKinds: [...gate.requiredKinds],
        allowedActors: [...gate.allowedActors],
      })),
    };

    // Config: the aidos settings namespace. Defaults are DEFAULT_CONFIG;
    // the resolved value layers schema defaults, then base, then the user.
    // The registration and the watch ride the inject child's fiber, so a
    // settings service going away restores the defaults with it.
    ctx.inject(["settings"], (settingsCtx) => {
      const scope = settingsCtx.settings.register(
        settingsNamespace("aidos"),
        AIDOS_SETTINGS_SCHEMA,
        { base: DEFAULT_CONFIG },
      );
      this._resolvedConfig = resolveConfig(scope.get());
      scope.watch((next) => {
        this._resolvedConfig = resolveConfig(next);
      });
    });

    // The four projection units, registered under their keys.
    ctx.inject(["sessionProjections"], (projectionCtx) => {
      this._registerProjections(projectionCtx);
    });

    // The invariant companion, when the registry is composed.
    if (ctx.invariants) {
      registerAidosInvariant(ctx);
    }

  }

  // ---- reads ----

  /** The board rows of one agent's session. Sorted by phase and order. */
  getTickets(agent: Agent, opts?: { projectId?: number }): TicketView[] {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    let projectId: ProjectId;
    if (opts?.projectId !== undefined) {
      projectId = opts.projectId;
      if (!cache.state.projects.has(projectId)) {
        throw new UnknownProject(projectId);
      }
    } else {
      projectId = this._ensureProject(agent).projectId;
    }
    const views = ticketsProjection(cache.state, this._resolvedConfig);
    const rows = [...views.values()].filter((view) => view.projectId === projectId);
    rows.sort((a, b) => a.phase - b.phase || a.order - b.order || a.id - b.id);
    return rows;
  }

  /** The distinct ticket states of one agent's session (the mask input). */
  ticketStates(agent: Agent): TicketState[] {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const states = new Set<TicketState>();
    for (const snapshot of cache.state.tickets.values()) {
      states.add(snapshot.state);
    }
    return STATE_ORDER.filter((state) => states.has(state));
  }

  /**
   * The bash policy context for one agent: which guard profile applies and
   * where scratch lives. bash-guard reads this to pick a command-ruleset and
   * to allow writes to the scratch dirs in every phase (no phase may block
   * scratch — both /tmp/dsh and the aidos durable scratch stay writable).
   *
   * Profile derivation:
   *  - primary agent, no ticket in_progress         => "planning"
   *  - primary agent, at least one in_progress       => "implementation"
   *  - subagent (delegation depth > 0), provider p   => `subagent-${p}`
   *    (an unknown provider falls back to "subagent-coder")
   */
  bashContext(agent: Agent): { profile: string; scratchDir: string; workspaceRoot: string } {
    let profile: string;
    if (delegationDepthOf(agent) === 0) {
      let states: TicketState[];
      try {
        states = this.ticketStates(agent);
      } catch {
        states = [];
      }
      profile = states.some((state) => state === "in_progress") ? "implementation" : "planning";
    } else {
      const kind = this.subagentKind(agent);
      profile = kind ? `subagent-${kind}` : "subagent-coder";
    }
    let scratchDir: string;
    try {
      scratchDir = scratchRootForAgent(agent);
    } catch {
      scratchDir = "";
    }
    const workspaceRoot = (agent.session?.header?.cwd as string | undefined) ?? "";
    return { profile, scratchDir, workspaceRoot };
  }

  /** The dsh-subagent provider that spawned the agent, if it is a subagent. */
  private subagentKind(agent: Agent): string | undefined {
    const session = agent.session as unknown as { events?: ReadonlyArray<{ type?: string; provider?: string }> } | undefined;
    const events = session?.events;
    if (!events) return undefined;
    for (const event of events) {
      if (event.type === "subagent/descriptor") return event.provider;
    }
    return undefined;
  }

  /** The union of the in-progress tickets' allowlists (the write boundary). */
  allowlistUnion(agent: Agent): string[] {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const union: string[] = [];
    const seen = new Set<string>();
    for (const snapshot of cache.state.tickets.values()) {
      if (snapshot.state !== "in_progress") continue;
      for (const entry of snapshot.allowlist) {
        if (!seen.has(entry)) {
          seen.add(entry);
          union.push(entry);
        }
      }
    }
    return union;
  }

  /** Serialize one project's plan as markdown. */
  plan(agent: Agent, opts?: { projectId?: number }): string {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const projectId = opts?.projectId ?? this._ensureProject(agent).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const meta = this._planMetaOf(projectId, cache.state);
    const tickets: PlanTicket[] = this._ticketsFor(projectId, cache.state).map((row): PlanTicket => ({
      id: String(row.id),
      title: row.title,
      body: row.body,
      criteria: row.criteria,
      claimedState: row.state,
      order: row.order,
    }));
    return renderPlan({
      frontmatter: meta.frontmatter,
      preamble: meta.preamble,
      contextSections: meta.contextSections,
      tickets,
    });
  }

  // ---- writes ----

  /** Create or edit one ticket. Creates the phase when absent. */
  setTicket(agent: Agent, args: SetTicketArgs): TicketRow {
    if (args.ticketId !== undefined) {
      return this._editTicket(agent, args, "agent");
    }
    return this._createTicket(agent, args);
  }

  /**
   * The user-actor set path, exported over the typert Remote surface. It
   * creates a ticket and edits the named fields. It never changes state,
   * and only this path may set a ticket's allowlist. The agent path passes
   * the "agent" actor and refuses the field.
   */
  @Remote("userSetTicket")
  userSetTicket(agent: Agent, args: SetTicketArgs): TicketRow {
    if (args.ticketId !== undefined) {
      return this._editTicket(agent, args, "user");
    }
    return this._createTicket(agent, args);
  }

  /**
   * The cross-workspace dependency search, exported over the typert Remote
   * surface. Matches one query against the title of every live session's
   * tickets, and returns the stored reference fields the board needs to
   * render a dependency badge and to add a dependency. Only live sessions
   * are reachable: a session that is not open right now has no disk-scan
   * path and contributes nothing.
   */
  @Remote("searchTickets")
  searchTickets(agent: Agent, args: { query: string }): TicketSearchResult[] {
    const query = (args.query ?? "").toLowerCase().trim();
    if (!query) return [];
    const results: TicketSearchResult[] = [];
    for (const session of this.ctx.sessions.list()) {
      const snap = this.ctx.sessionProjections.snapshot(session);
      const tickets = snap.values["aidos.tickets"];
      if (!tickets) continue;
      for (const [id, ticket] of Object.entries(tickets)) {
        if (!ticket.title.toLowerCase().includes(query)) continue;
        results.push({
          sessionId: session.id,
          ticketId: Number(id),
          title: ticket.title,
          state: ticket.state,
          workspaceKey: ticket.workspaceKey,
          dependsOn: ticket.dependsOn ?? [],
        });
      }
    }
    return results.slice(0, 50);
  }

  /**
   * The cross-workspace board read, exported over the typert Remote surface.
   * Reads one session's tickets by its session id, through the live session
   * store and the aidos.tickets projection. The board UI (U2d) calls this
   * with a session id it does not itself own, so the arg carries the id
   * instead of the calling agent. Only live sessions are reachable: a
   * session that is not open right now has no disk-scan path and returns an
   * empty board (the client treats that as "session not open").
   */
  @Remote("coldTickets")
  coldTickets(agent: Agent, args: { sessionId: string; states?: string[] }): TicketView[] {
    const session = this.ctx.sessions.get(args.sessionId as any);
    if (!session) return [];
    const snap = this.ctx.sessionProjections.snapshot(session);
    const tickets = snap.values["aidos.tickets"];
    if (!tickets) return [];
    let rows = Object.values(tickets);
    if (args.states && args.states.length > 0) {
      rows = rows.filter((ticket) => (args.states as string[]).includes(ticket.state));
    }
    return rows;
  }

  /** Attach agent-authored evidence. The author is the agent, never the payload. */
  agentAttachEvidence(agent: Agent, args: AttachEvidenceArgs): EvidenceView {
    return this._attachEvidence(agent, args, "agent");
  }

  /**
   * The user-actor attach path, exported over the typert Remote surface.
   * The human-only kinds (`builtin:user_signoff` and `builtin:user_verified`)
   * accept rows here and nowhere else. No tool reaches this path.
   */
  @Remote("userAttachEvidence")
  userAttachEvidence(agent: Agent, args: AttachEvidenceArgs): EvidenceView {
    return this._attachEvidence(agent, args, "user");
  }

  /** Move one ticket as the agent. The gate enforces every transition. */
  agentMoveTicket(agent: Agent, args: MoveTicketArgs): {
    ticketId: number;
    fromState: TicketState;
    toState: TicketState;
  } {
    return this._moveTicket(agent, args, "agent");
  }

  /**
   * The user-actor move path, exported over the typert Remote surface. The
   * human-only gates (`awaiting_verification -> done`, and the send-back
   * edge) accept moves here and nowhere else. No tool reaches this path.
   */
  @Remote("userMoveTicket")
  userMoveTicket(agent: Agent, args: MoveTicketArgs): {
    ticketId: number;
    fromState: TicketState;
    toState: TicketState;
  } {
    return this._moveTicket(agent, args, "user");
  }

  /** Append one agent-authored comment to one ticket. */
  agentAddComment(agent: Agent, args: AddCommentArgs): CommentRecord {
    return this._addComment(agent, args, "agent");
  }

  /** The user-actor comment path, exported over the typert Remote surface. */
  @Remote("userAddComment")
  userAddComment(agent: Agent, args: AddCommentArgs): CommentRecord {
    return this._addComment(agent, args, "user");
  }

  /** Import one plan file into an empty project. */
  planImport(agent: Agent, args: PlanImportArgs): {
    tickets: number[];
  } {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const projectId = args.projectId ?? this._ensureProject(agent).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }

    // The file read (through the workspace root), then parse first: a parse
    // error imports nothing.
    const text = this._readPlanFile(agent, args.file);
    const document = parsePlan(text);

    // An import loads a whole plan into an empty project; it never merges.
    if (this._ticketsFor(projectId, cache.state).length > 0) {
      throw new ProjectNotEmptyError(projectId);
    }

    // The plan meta stores verbatim; rules stay "".
    const planValue: PlanValue = {
      frontmatter: document.frontmatter,
      context: {
        preamble: document.preamble,
        contextSections: document.contextSections,
      },
      rules: "",
    };
    const lines = planContextLineCount(planValue);
    if (lines > PLAN_CONTEXT_LIMIT) {
      throw new ContextTooLongError(lines - PLAN_CONTEXT_LIMIT);
    }
    this._commit(agent, {
      kind: "plan/change",
      version: 1,
      projectId,
      plan: planValue,
      at: this._now(),
    });

    const ticketIds: TicketId[] = [];
    for (const ticket of document.tickets) {
      // Every ticket lands in open, order from the document, phase and ids
      // from the session's defaults.
      const ticketId = this._createTicketInternal(agent, projectId, ticket.title, "", {
        body: ticket.body,
        criteria: ticket.criteria,
        order: ticket.order,
      });
      // One imported_state row per ticket, author system.
      this._attachEvidenceInternal(
        agent,
        ticketId,
        "builtin:imported_state",
        { claimed_state: ticket.claimedState, source: args.file },
        "system",
      );
      ticketIds.push(ticketId);
    }
    return { tickets: ticketIds };
  }

  // ---- internals: the session port ----

  /** The per-session fold cache, seeding once from the session log. */
  private _cache(session: Session): SessionCache {
    let cache = this._caches.get(session);
    if (cache) return cache;
    const state = createInitialState();
    for (const event of session.events) {
      foldSessionEvent(state, event);
    }
    cache = { state, observedSeq: session.events.length };
    this._caches.set(session, cache);
    return cache;
  }

  /** Fold the events appended since the last observation. */
  private _sync(session: Session, cache: SessionCache): void {
    const events = session.events;
    for (let index = cache.observedSeq; index < events.length; index += 1) {
      foldSessionEvent(cache.state, events[index]);
    }
    cache.observedSeq = events.length;
  }

  /**
   * The append path: validate the candidate against the folded state (the
   * invariant companion's check), append to the session log, then fold.
   * A violation throws InvariantError and the log does not change.
   */
  private _commit(agent: Agent, event: AidosEvent): void {
    const session = agent.session;
    const cache = this._cache(session);
    this._sync(session, cache);
    validateAidosEvent(cache.state, event);
    // The plugin registers the aidos session event types with the host session
    // reader at startup (see ./session-events.ts, the llm-fallbacks issue #52
    // pattern), so a durable append here is always readable on a later load.
    session.append(event.kind, event);
    this._sync(session, cache);
  }

  /** The clock, seconds as a float, floored per ticket at the last at. */
  private _now(): number {
    return Date.now() / 1000;
  }

  private _atFor(session: Session, ticketId: TicketId, floor?: number): number {
    const cache = this._cache(session);
    this._sync(session, cache);
    let at = this._now();
    const lastAt = cache.state.lastAt.get(ticketId);
    if (lastAt !== undefined && lastAt > at) {
      at = lastAt;
    }
    if (floor !== undefined && floor > at) {
      at = floor;
    }
    return at;
  }

  // ---- internals: the workspace project ----

  /**
   * The workspace binding: the session's workspace record (path and name),
   * falling back to the session header cwd and then a default.
   */
  private _workspaceOf(agent: Agent): { absPath: string; name: string } {
    const registry = this.ctx.workspaceRegistry;
    if (registry) {
      try {
        for (const workspace of registry.list()) {
          if (workspace.sessionIds.includes(agent.session.id)) {
            return { absPath: workspace.path, name: workspace.title };
          }
        }
      } catch {
        // The registry may be unavailable mid-bootstrap; fall through.
      }
    }
    const cwd = agent.session.header.cwd;
    if (cwd) {
      return {
        absPath: cwd,
        name: this._config.defaultProjectName ?? (basename(cwd) || cwd),
      };
    }
    return { absPath: ".", name: this._config.defaultProjectName ?? "aidos" };
  }

  /** The workspace path the session binds to. */
  private _workspacePath(agent: Agent): string {
    return this._workspaceOf(agent).absPath;
  }

  /**
   * Bootstrap one session's workspace project: create it once, keyed by the
   * workspace path. The project id is the session's first (1 on a fresh
   * session), mirroring the CLI's init.
   */
  private _ensureProject(agent: Agent): { projectId: ProjectId } {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const binding = this._workspaceOf(agent);
    for (const [projectId, project] of cache.state.projects) {
      if (project.absPath === binding.absPath) {
        return { projectId };
      }
}
    // Gate: only create a project in aidos-preset sessions.  Standard
    // sessions must never receive aidos events.
    const presets = this.ctx.get("agentPresets");
    if (presets && presets.composedPreset(agent.ctx) !== "aidos") {
      throw new Error("aidos: _ensureProject called in non-aidos session");
    }
    const projectId = this._nextProjectId(cache.state);
    this._commit(agent, {
      kind: "project/created",
      version: 1,
      projectId,
      absPath: binding.absPath,
      name: binding.name,
      at: this._now(),
    });
    return { projectId };
  }

  // ---- internals: ticket writes ----

  /** Create one ticket in open, creating the phase when it is absent. */
  private _createTicket(agent: Agent, args: SetTicketArgs): TicketRow {
    const title = args.title;
    if (typeof title !== "string" || title.trim() === "") {
      throw new BadPayloadError("set_ticket requires a title to create a ticket");
    }
    if (args.allowlist !== undefined) {
      // A new ticket has no ticket id yet, so no approved builtin:file_allowlist
      // evidence row can exist to cover it. Refuse rather than silently drop the
      // field: the caller must create the ticket first, then set the allowlist
      // once a covering row exists.
      throw new BadPayloadError(
        "a new ticket cannot carry an allowlist; create it, then set the allowlist once an approved builtin:file_allowlist evidence row exists",
      );
    }

    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const projectId = args.projectId ?? this._ensureProject(agent).projectId;
    if (!cache.state.projects.has(projectId)) {
      throw new UnknownProject(projectId);
    }
    const phase = args.phase ?? 1;
    const phases = cache.state.phases.get(projectId);
    if (!phases || !phases.has(phase)) {
      this._commit(agent, {
        kind: "phase/set",
        version: 1,
        projectId,
        number: phase,
        title: args.phaseTitle ?? DEFAULT_PHASE_TITLE,
        state: "open",
        at: this._now(),
      });
    }
    const ticketId = this._createTicketInternal(agent, projectId, title, args.description ?? "", {
      body: args.body,
      criteria: args.criteria,
      phase,
      order: args.order,
      slug: args.slug,
      dependsOn: args.dependsOn === undefined ? undefined : [...args.dependsOn],
    });
    const snapshot = this._cache(agent.session).state.tickets.get(ticketId);
    if (!snapshot) {
      throw new Error("a created ticket is missing from the folded state");
    }
    return rowOf(snapshot);
  }

  /**
   * Edit the named fields of one ticket; an absent field leaves its value.
   * The allowlist field is user-only: an agent actor that names it is
   * refused, and a user actor must first attach a covering
   * `builtin:file_allowlist` evidence row for every proposed path.
   */
  private _editTicket(agent: Agent, args: SetTicketArgs, actor: Actor): TicketRow {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const ticketId = this._resolveTicketId(agent, args.ticketId as number | string);
    const prev = cache.state.tickets.get(ticketId);
    if (!prev) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, prev);
    const nextSlug = args.slug?.trim() ?? prev.slug;
    if (nextSlug !== prev.slug && this._slugTaken(cache.state, prev.workspaceKey, nextSlug, ticketId)) {
      throw new DuplicateSlug(nextSlug, prev.workspaceKey);
    }
    const at = this._atFor(agent.session, ticketId, prev.updatedAt);
    let allowlist: string[] | undefined;
    if (args.allowlist !== undefined) {
      if (actor !== "user") {
        throw new AllowlistActorRefused(actor);
      }
      const uncovered = this._uncoveredAllowlistPaths(cache.state.evidence, ticketId, args.allowlist);
      if (uncovered.length > 0) {
        throw new AllowlistCoverageRefused(ticketId, uncovered);
      }
      // Every requested path is covered; dedupe, keep the requested order.
      allowlist = [...new Set(args.allowlist)];
    }
    const snapshot: TicketSnapshot = {
      ...prev,
      title: args.title ?? prev.title,
      description: args.description ?? prev.description,
      body: args.body ?? prev.body,
      criteria: args.criteria ?? prev.criteria,
      phase: args.phase ?? prev.phase,
      order: args.order ?? prev.order,
      slug: nextSlug,
      ...(args.dependsOn !== undefined ? { dependsOn: [...args.dependsOn] } : {}),
      ...(allowlist !== undefined ? { allowlist } : {}),
      revision: prev.revision + 1,
      updatedAt: at,
    };
    this._commit(agent, {
      kind: "ticket/change",
      version: 1,
      operation: "set",
      ticket: snapshot,
      at,
    });
    return rowOf(snapshot);
  }

  /**
   * One evidence attach with the actor pinned at the entry point. The kind
   * definition's allowedAuthors list decides, so one check accepts a user
   * row for a human-only kind here and refuses an agent row.
   */
  private _attachEvidence(agent: Agent, args: AttachEvidenceArgs, actor: Actor): EvidenceView {
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, snapshot);
    // The kind comes first, like the CLI: a human-only kind refuses before
    // the payload is looked at, and an unregistered kind refuses after.
    const def = this._resolveKind(args.kind);
    if (!def) {
      throw new UnknownKind(args.kind);
    }
    if (!def.allowedAuthors.includes(actor)) {
      throw new EvidenceAuthorRefused(args.kind, actor);
    }
    const payload = args.payload ?? {};
    if (!isPlainRecord(payload)) {
      throw new BadPayloadError("the payload must be a JSON object");
    }
    const attached = this._attachEvidenceInternal(agent, ticketId, def.id, payload, actor);
    return { ticketId, kind: args.kind, payload: attached };
  }

  /**
   * One gate-checked move with the actor pinned at the entry point. The
   * gate's allowedActors list decides, so a human-only edge accepts a user
   * move here and refuses an agent move on the same check.
   */
  private _moveTicket(agent: Agent, args: MoveTicketArgs, actor: Actor): {
    ticketId: number;
    fromState: TicketState;
    toState: TicketState;
  } {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const toState = args.to;
    const ticket = cache.state.tickets.get(ticketId);
    if (!ticket) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, ticket);
    const fromState = ticket.state;

    // 1. The pair must be legal. An illegal pair is a refusal like any
    //    other: it appends one aidos/refusal record and changes no state.
    if (!isLegalTransition(fromState, toState)) {
      this._appendRefusal(agent, ticketId, fromState, toState, actor, "no gate configured for this transition");
      throw new GateRefused({ noGate: true, fromState, toState, actor });
    }

    // 2. The gate. A refusal appends one aidos/refusal record, then throws.
    const evidence = cache.state.evidence.get(ticketId) ?? [];
    try {
      checkGate(this._resolvedConfig, ticket, evidence, toState, actor);
    } catch (error) {
      if (error instanceof GateRefused) {
        this._appendRefusal(agent, ticketId, fromState, toState, actor, refusalReason(error.missingKinds, error.allowedActors));
        throw error;
      }
      throw error;
    }

    // 3. The move itself. One whole-value ticket/change record.
    const at = this._atFor(agent.session, ticketId, ticket.updatedAt);
    const snapshot: TicketSnapshot = {
      ...ticket,
      state: toState,
      revision: ticket.revision + 1,
      updatedAt: at,
    };
    this._commit(agent, {
      kind: "ticket/change",
      version: 1,
      operation: "move",
      ticket: snapshot,
      at,
    });
    return { ticketId, fromState, toState };
  }

  /**
   * One comment appended to one ticket, with the actor pinned at the entry
   * point. Mirrors Store.addComment's event shape; the fold and the
   * aidos.comments projection own the read side.
   */
  private _addComment(agent: Agent, args: AddCommentArgs, actor: Actor): CommentRecord {
    const ticketId = this._resolveTicketId(agent, args.ticketId);
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const snapshot = cache.state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    this._assertLocalWorkspace(agent, snapshot);
    const at = this._now();
    this._commit(agent, {
      kind: "comment/added",
      version: 1,
      ticketId,
      text: args.text,
      author: actor,
      at,
    });
    return { ticketId, text: args.text, author: actor, at };
  }

  /**
   * The proposed allowlist paths that no approved `builtin:file_allowlist`
   * evidence row on this ticket covers, in order. Each coverage row carries
   * the approved paths under its payload `paths` key (the attach_evidence
   * caller sends `{ paths: string[] }`; no stricter schema is forced beyond
   * `additionalProperties: true`). The kind authors the row, so the coverage
   * check reads existence only and does not re-check the row's author at
   * read time.
   */
  private _uncoveredAllowlistPaths(
    evidence: ReadonlyMap<TicketId, EvidenceRow[]> | undefined,
    ticketId: TicketId,
    proposed: readonly string[],
  ): string[] {
    const approved = new Set<string>();
    for (const row of evidence?.get(ticketId) ?? []) {
      if (row.kind !== "builtin:file_allowlist") continue;
      const paths = row.payload?.paths;
      if (Array.isArray(paths)) {
        for (const path of paths) {
          if (typeof path === "string") approved.add(path);
        }
      }
    }
    return [...new Set(proposed)].filter((path) => !approved.has(path));
  }

  /** The shared create: one whole-value ticket/change create record. */
  private _createTicketInternal(
    agent: Agent,
    projectId: ProjectId,
    title: string,
    description: string,
    opts?: { body?: string; criteria?: string; phase?: number; order?: number; slug?: string; dependsOn?: string[] },
  ): TicketId {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const ticketId = this._nextTicketId(cache.state);
    const project = cache.state.projects.get(projectId);
    const workspaceKey = workspaceKeyFromPath(project?.absPath ?? this._workspacePath(agent));
    const slug = opts?.slug?.trim() || slugFromTitle(title) || `ticket-${ticketId}`;
    if (this._slugTaken(cache.state, workspaceKey, slug, null)) {
      throw new DuplicateSlug(slug, workspaceKey);
    }
    const phase = opts?.phase ?? 1;
    const order = opts?.order ?? this._nextOrder(cache.state, projectId, phase);
    const at = this._now();
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
      allowlist: [],
      dependsOn: [...(opts?.dependsOn ?? [])],
      slug,
      workspaceKey,
      revision: 1,
      createdAt: at,
      updatedAt: at,
    };
    this._commit(agent, {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      ticket: snapshot,
      at,
    });
    return ticketId;
  }

  /** Attach one evidence row with a stamped actor. Returns the row payload. */
  private _attachEvidenceInternal(
    agent: Agent,
    ticketId: TicketId,
    kind: string,
    payload: Record<string, unknown>,
    actor: Actor,
  ): Record<string, unknown> {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    const def = this._resolvedConfig.kinds.find((candidate) => candidate.id === kind);
    if (!def) {
      throw new UnknownKind(kind);
    }
    if (!def.allowedAuthors.includes(actor)) {
      throw new EvidenceAuthorRefused(kind, actor);
    }
    const snapshot = cache.state.tickets.get(ticketId);
    if (snapshot !== undefined && payload.criteria !== undefined) {
      const criteria = payload.criteria;
      if (typeof criteria !== "string") {
        throw new BadPayloadError("the payload.criteria must be a string");
      }
      const lines = criteria.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
      const valid = snapshot.criteria
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      for (const line of lines) {
        if (!valid.includes(line)) {
          throw new BadPayloadError("evidence criterion " + JSON.stringify(line) + " is not one of the ticket's criteria");
        }
      }
    }
    const row: EvidenceRow = {
      kind,
      author: actor,
      at: this._atFor(agent.session, ticketId),
      payload: deepClone(payload),
    };
    this._commit(agent, {
      kind: "evidence/attached",
      version: 1,
      ticketId,
      row,
    });
    return row.payload;
  }

  /** One log-only refusal record, appended before the GateRefused throw. */
  private _appendRefusal(
    agent: Agent,
    ticketId: TicketId,
    fromState: TicketState,
    toState: TicketState,
    actor: Actor,
    reason: string,
  ): void {
    this._commit(agent, {
      kind: "aidos/refusal",
      version: 1,
      ticketId,
      fromState,
      toState,
      actor,
      reason,
      at: this._now(),
    });
  }

  /**
   * Resolve one tool kind name to its registered kind. The agent-allowed
   * kinds are offered by their short names (automated_check and friends);
   * they resolve to the registered builtin: ids so the gate's required kinds
   * match. A full id resolves exactly.
   */
  private _resolveKind(kind: string): KindDef | undefined {
    const direct = this._resolvedConfig.kinds.find((candidate) => candidate.id === kind);
    if (direct) return direct;
    if (!kind.startsWith("builtin:") && !kind.startsWith("plugin:")) {
      return this._resolvedConfig.kinds.find((candidate) => candidate.id === `builtin:${kind}`);
    }
    return undefined;
  }

  // ---- internals: reads over the folded state ----

  private _ticketsFor(projectId: ProjectId, state: AidosState): TicketRow[] {
    const rows: TicketRow[] = [];
    for (const snapshot of state.tickets.values()) {
      if (snapshot.projectId === projectId) {
        rows.push(rowOf(snapshot));
      }
    }
    rows.sort((a, b) => a.phase - b.phase || a.order - b.order || a.id - b.id);
    return rows;
  }

  private _planMetaOf(
    projectId: ProjectId,
    state: AidosState,
  ): { frontmatter: string; preamble: string; contextSections: ContextSection[] } {
    const plan = state.plans.get(projectId);
    if (!plan) {
      return { frontmatter: "", preamble: "", contextSections: [] };
    }
    return {
      frontmatter: plan.frontmatter,
      preamble: plan.context.preamble,
      contextSections: plan.context.contextSections.map((section) => ({ ...section })),
    };
  }

  private _nextProjectId(state: AidosState): ProjectId {
    let max = 0;
    for (const id of state.projects.keys()) {
      if (id > max) max = id;
    }
    return max + 1;
  }

  private _nextTicketId(state: AidosState): TicketId {
    return state.nextTicketId;
  }

  /** Whether one workspace already holds the given slug on another ticket. */
  private _slugTaken(
    state: AidosState,
    workspaceKey: string,
    slug: string,
    excludeId: TicketId | null,
  ): boolean {
    for (const snapshot of state.tickets.values()) {
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

  /**
   * Resolve a ticket reference (a numeric id or a slug) to a numeric id.
   * A bare number or a bare slug means the current workspace; a prefixed
   * `<workspaceKey>:<slug>` reference resolves across workspaces.
   */
  private _resolveTicketId(agent: Agent, ref: number | string): TicketId {
    const cache = this._cache(agent.session);
    this._sync(agent.session, cache);
    if (typeof ref === "number") {
      if (cache.state.tickets.has(ref)) {
        return ref;
      }
      throw new UnknownTicket(ref);
    }
    const current = workspaceKeyFromPath(this._workspacePath(agent));
    const colon = ref.indexOf(":");
    if (colon >= 0) {
      const workspaceKey = ref.slice(0, colon);
      const slug = ref.slice(colon + 1);
      for (const snapshot of cache.state.tickets.values()) {
        if (snapshot.workspaceKey === workspaceKey && snapshot.slug === slug) {
          return snapshot.id;
        }
      }
      throw new UnknownTicket(`${workspaceKey}:${slug}`);
    }
    for (const snapshot of cache.state.tickets.values()) {
      if (snapshot.workspaceKey === current && snapshot.slug === ref) {
        return snapshot.id;
      }
    }
    throw new UnknownTicket(ref);
  }

  /** Refuse a write against a ticket whose workspace is not the current one. */
  private _assertLocalWorkspace(agent: Agent, snapshot: TicketSnapshot): void {
    const current = workspaceKeyFromPath(this._workspacePath(agent));
    if (snapshot.workspaceKey !== current) {
      throw new ForeignWorkspace(snapshot.workspaceKey, current);
    }
  }

  /** The next free order in one phase, counted from 1. */
  private _nextOrder(state: AidosState, projectId: ProjectId, phase: number): number {
    let max = 0;
    for (const snapshot of state.tickets.values()) {
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

  /** Read one plan file, resolved under the session's workspace root. */
  private _readPlanFile(agent: Agent, file: string): string {
    const target = isAbsolute(file) ? file : join(this._workspacePath(agent), file);
    try {
      return readFileSync(target, "utf8");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new FileNotReadError(file, `cannot read the plan file ${file}: ${detail}`);
    }
  }

  // ---- internals: the projection registrations ----

  private _registerProjections(projectionCtx: Context): void {
    projectionCtx.sessionProjections.register({
      key: "aidos.tickets",
      schema: TICKETS_PROJECTION_ZOD,
      init: (): TicketsProjectionState => ({ tickets: {}, evidence: {} }),
      apply: applyTicketsProjection,
      view: (state) => this._ticketsView(state),
      stateVersion: 1,
    });
    projectionCtx.sessionProjections.register({
      key: "aidos.evidence",
      schema: EVIDENCE_PROJECTION_ZOD,
      init: () => ({}),
      apply: applyEvidenceProjection,
      view: (state) => state,
      stateVersion: 1,
    });
    projectionCtx.sessionProjections.register({
      key: "aidos.plan",
      schema: PLAN_PROJECTION_ZOD,
      init: () => ({}),
      apply: applyPlanProjection,
      view: (state) => state,
      stateVersion: 1,
    });
    projectionCtx.sessionProjections.register({
      key: "aidos.comments",
      schema: COMMENTS_PROJECTION_ZOD,
      init: () => ({}),
      apply: applyCommentsProjection,
      view: (state) => state,
      stateVersion: 1,
    });
  }

  /** The board view of the tickets unit, config applied at view time. */
  private _ticketsView(state: TicketsProjectionState): Record<string, TicketView> {
    const config = this._resolvedConfig;
    const out: Record<string, TicketView> = {};
    for (const [id, snapshot] of Object.entries(state.tickets)) {
      const evidence = state.evidence[id] ?? [];
      out[id] = {
        id: snapshot.id,
        projectId: snapshot.projectId,
        title: snapshot.title,
        description: snapshot.description,
        body: snapshot.body,
        criteria: snapshot.criteria,
        phase: snapshot.phase,
        order: snapshot.order,
        state: snapshot.state,
        dependsOn: [...(snapshot.dependsOn ?? [])],
        confidenceScore: confidenceScoreOf(config, evidence),
        gateFraction: gateFractionOf(config, snapshot, evidence),
        updatedAt: snapshot.updatedAt,
        workspaceKey: snapshot.workspaceKey,
      };
    }
    return out;
  }
}

/**
 * Mount the service on a context. Returns the disposer.
 *
 * The service is constructed directly (the Service constructor registers
 * `ctx.aidos` synchronously), so the harness reads the service without
 * awaiting a plugin load; the constructor's own registrations ride the
 * calling fiber and unload with it. The disposer lifts the service off the
 * context for callers that want an explicit handle.
 */
export function registerAidosService(ctx: Context, config?: AidosCoreConfig): () => void {
  const service = new AidosService(ctx, config);
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    try {
      ctx.reflect.set("aidos", undefined);
    } catch {
      // The owning fiber may already be unloading; the registration dies
      // with it, so there is nothing left to lift.
    }
    void service;
  };
}
