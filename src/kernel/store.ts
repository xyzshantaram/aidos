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
import { foldSessionLog, importedRowsOf } from "./backfill";
import type { BackfillSessionLog, FoldedSessionLog } from "./backfill";
import { checkGate, isLegalTransition } from "./gates";
import { planContextLineCount, validateAidosEvent } from "./invariants";
import { confidenceScoreOf, gateFractionOf } from "./projections";
import { PLAN_CONTEXT_LIMIT } from "./constants";
import { MemoryStorage } from "./storage-memory";
import type { EventOrigin, StoredEvent, StoragePort } from "./storage";
import {
  ContextTooLongError,
  EvidenceAuthorRefused,
  DuplicateSlug,
  GateRefused,
  InvariantError,
  StoreWriteRefused,
  UnknownEvidenceRow,
  UnknownKind,
  UnknownProject,
  UnknownTicket,
} from "./types";
import type {
  AidosConfig,
  Actor,
  CommentRecord,
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
  /**
   * #38: the persistence port this store writes through. Defaults to an
   * ephemeral in-memory port, which is exactly the behaviour the whole
   * existing suite was written against — so passing nothing changes
   * nothing. Pass the SQLite implementation for a durable workspace store.
   *
   * When BOTH `log` and `storage` are given, the explicit `log` seeds the
   * in-memory fold and the storage persists only what flows through
   * `_append` from here on; a fresh `new Store(config, { storage })` with
   * no `log` replays the storage's rows. Seeding and durable truth are
   * never merged, so a reopen can neither duplicate nor drop a row.
   */
  storage?: StoragePort;
  /**
   * #38: the dsh session id stamped as the origin of every write through
   * this store. Absent (the default) stamps no origin — the normal case
   * until #41's importer flushes session-log rows, which is the only writer
   * that passes one. Both origin columns stay nullable in every schema.
   */
  originSessionId?: string;
}

/** One kernel-level search hit: identity plus the title it matched on. */
export interface TicketSearchHit {
  ticketId: TicketId;
  projectId: ProjectId;
  title: string;
  state: TicketState;
  workspaceKey: string;
}

/** What one backfill run did. Zeros plus `alreadyRan` when it skipped. */
export interface BackfillResult {
  alreadyRan: boolean;
  sessionIds: string[];
  tickets: number;
  evidence: number;
  comments: number;
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

/** One folded log's local ticket ids, ascending — the deterministic import order. */
function sortedLocalIds(fold: FoldedSessionLog): TicketId[] {
  return [...fold.state.tickets.keys()].sort((a, b) => a - b);
}

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
    this._storage = options?.storage ?? new MemoryStorage();
    this._originSessionId = options?.originSessionId;
    // An explicit log seeds the fold; otherwise the storage's own rows are
    // the durable truth (a reopen replays them). Never both — see StoreOptions.
    const storedRows = options?.log === undefined ? this._storage.readAll() : undefined;
    if (storedRows !== undefined) {
      for (const stored of storedRows) {
        this._noteOrigin(stored);
      }
    }
    const seed = options?.log ?? storedRows!.map((stored) => stored.event);
    this._log = deepClone(seed) as AidosEvent[];
    this.replay();
    // #40: an explicit log together with a storage port is the reopen after
    // a failed commit — the log holds events the store lacks. Repair that
    // one surviving window here, before the board is served.
    if (options?.log !== undefined) {
      this._repairStorage();
    }
  }

  readonly config: AidosConfig;

  private readonly _nowFn: () => number;
  private readonly _storage: StoragePort;
  private readonly _originSessionId: string | undefined;
  private _originSeq = 0;
  private readonly _log: AidosEvent[] = [];
  private _state: AidosState = createInitialState();
  /**
   * #42: source session of every imported ticket, by its WORKSPACE id. The
   * board renders a store row with the session that log came from, so the
   * read needs the create event's origin columns without re-walking the
   * storage rows on every board read. Filled from the storage rows on open
   * and from every origin-stamped append (the backfill is the only writer
   * that passes one); a ticket created directly in the store has no origin.
   */
  private readonly _originSessionOfTicket = new Map<TicketId, string>();

  /** Record one stored row's origin when it is a ticket create. */
  private _noteOrigin(stored: StoredEvent): void {
    if (stored.sessionId === null) return;
    const event = stored.event;
    if (event.kind !== "ticket/change" || event.operation !== "create") return;
    this._originSessionOfTicket.set(event.ticket.id, stored.sessionId);
  }

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

  /**
   * #42: the folded state, for the host wrapper's read projections. Read
   * only — the host derives views through `ticketsProjection` and never
   * mutates; a mutating caller would corrupt the store's own fold.
   */
  get state(): AidosState {
    return this._state;
  }

  /**
   * #42: whether the one-time backfill marker is in the log. The host
   * checks this BEFORE gathering any logs, so a board read after the first
   * open never touches the persistence inspect path at all.
   */
  hasBackfillCompleted(): boolean {
    return this._log.some((event) => event.kind === "backfill/completed");
  }

  /**
   * #42: the session id whose log this ticket was imported from, or null
   * when the ticket was created directly in the store.
   */
  originSessionOf(ticketId: TicketId): string | null {
    return this._originSessionOfTicket.get(ticketId) ?? null;
  }

  // ---- internal ----

  /**
   * Validate, then persist, then fold. The log changes only on allow.
   *
   * #40, the mirrored write path. The order is exactly the ticket's:
   * open the store's transaction, append to the session log, then commit
   * the transaction. A failure at ANY step refuses the whole write, so
   * the log and the store can never disagree — the same hard-fail rule
   * as the unregistered-event-type refusal in the host's _commit. A port
   * without the transaction bracket keeps the pre-#40 persist-first
   * order, which is all-or-nothing from the fold's side (see StoragePort).
   */
  private _append(event: AidosEvent): void {
    validateAidosEvent(this._state, event);
    const storage = this._storage;
    const origin = () => {
      if (this._originSessionId === undefined) {
        return undefined;
      }
      this._originSeq += 1;
      return { sessionId: this._originSessionId, localSeq: this._originSeq };
    };
    const mirrored =
      typeof storage.beginTransaction === "function" &&
      typeof storage.commitTransaction === "function";
    if (!mirrored) {
      // Persist BEFORE the in-memory push: a port failure (disk full, locked)
      // throws with the fold untouched, so the store never believes a write
      // the log does not hold.
      const originValue = origin();
      if (originValue) {
        if (originValue.sessionId !== undefined) {
          this._noteOrigin({ seq: 0, event, sessionId: originValue.sessionId, localSeq: originValue.localSeq ?? null });
        }
        storage.append(event, originValue);
      } else {
        storage.append(event);
      }
      this._log.push(event);
      foldAidosEvents(this._state, event);
      return;
    }
    // The mirror: transaction ON, then the log append, then the commit.
    storage.beginTransaction!();
    let originValue: Partial<EventOrigin> | undefined;
    try {
      this._log.push(event);
      originValue = origin();
      if (originValue) {
        storage.append(event, originValue);
      } else {
        storage.append(event);
      }
      foldAidosEvents(this._state, event);
      storage.commitTransaction!();
    } catch (error) {
      // Refuse the WHOLE write: the log gives the event back and the fold
      // is rebuilt from the remaining log (the fold is not invertible, so
      // a replay, not an undo). The id an allocate already claimed stays
      // claimed — the port's counter is outside the bracket, exactly like
      // the fallback-slug consumption #39 already accepts.
      this._log.pop();
      this.replay();
      if (originValue !== undefined) {
        this._originSeq -= 1;
      }
      storage.rollbackTransaction?.();
      throw new StoreWriteRefused(error);
    }
  }

  /**
   * #41: one validated append WITHOUT its own transaction bracket — the
   * bracket belongs to the caller. The backfill uses this to flush a whole
   * import inside ONE bracket, so a crash midway leaves nothing behind and
   * the next open retries cleanly. Order matches _append: log push, store
   * append, fold. Throws whatever fails; the caller owns the rollback.
   */
  private _emit(event: AidosEvent, origin?: EventOrigin): void {
    validateAidosEvent(this._state, event);
    this._log.push(event);
    if (origin) {
      this._noteOrigin({ seq: 0, event, sessionId: origin.sessionId, localSeq: origin.localSeq });
      this._storage.append(event, origin);
    } else {
      this._storage.append(event);
    }
    foldAidosEvents(this._state, event);
  }

  /**
   * #40, the repair half. A commit that failed AFTER a successful log
   * append left log events with no store row — the one window the mirrored
   * order cannot close while it is happening, because the log is already
   * durable when the store refuses. Repair on the next open: if the store
   * holds a proper PREFIX of the seeded log, append the missing tail (one
   * bracket, so the repair is itself all-or-nothing); any other shape is
   * a disagreement the repair refuses to paper over, and the open fails.
   */
  private _repairStorage(): void {
    const storage = this._storage;
    const stored = storage.readAll();
    const log = this._log;
    const shared = Math.min(stored.length, log.length);
    const sameEvent = (a: StoredEvent, b: AidosEvent) =>
      JSON.stringify(a.event) === JSON.stringify(b);
    for (let index = 0; index < shared; index++) {
      if (!sameEvent(stored[index]!, log[index]!)) {
        throw new InvariantError(
          `the store and the log disagree at event ${index + 1}; refusing the open rather than repairing blind`,
        );
      }
    }
    if (stored.length > log.length) {
      throw new InvariantError(
        `the store holds ${stored.length} events but the log holds ${log.length}; refusing the open`,
      );
    }
    if (stored.length === log.length) {
      return;
    }
    const transactional =
      typeof storage.beginTransaction === "function" &&
      typeof storage.commitTransaction === "function";
    if (transactional) {
      storage.beginTransaction!();
    }
    try {
      for (let index = stored.length; index < log.length; index++) {
        if (this._originSessionId !== undefined) {
          this._originSeq += 1;
          storage.append(log[index]!, {
            sessionId: this._originSessionId,
            localSeq: this._originSeq,
          });
        } else {
          storage.append(log[index]!);
        }
      }
      if (transactional) {
        storage.commitTransaction!();
      }
    } catch (error) {
      if (transactional) {
        storage.rollbackTransaction?.();
      }
      throw new StoreWriteRefused(error);
    }
  }

  /**
   * Release the underlying port handle. For a workspace store backed by the
   * shared SQLite registry this drops the shared handle too — reopening the
   * same path re-registers a fresh one. Idempotent.
   */
  close(): void {
    this._storage.close();
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

  /**
   * #39: the next ticket id, allocated from the STORE, not read from the
   * fold's per-session `nextTicketId` counter. The allocation runs before
   * the create event appends, because the id goes into the event payload.
   *
   * The fold counter stays as a FLOOR, not the source: a Store seeded
   * with an explicit `log` (the reopen path every existing test uses)
   * folds ids its ephemeral port never issued, and the floor keeps such
   * a store from reissuing a seeded id. Whenever the port is ahead — the
   * live case, including two sessions sharing one workspace port with
   * stale folds — the port's id wins, so the two sessions' tickets
   * differ. The fold still advances on every create, so `nextTicketId`
   * keeps its monotonic, never-recomputed property.
   *
   * The host harness (`aidos-core.ts`) has no store and keeps reading
   * its own fold counter — that fallback is exactly why every existing
   * harness test still passes; its rescope is #42's wrapper work.
   */
  private _nextTicketId(): TicketId {
    // #40: the allocation is itself a store write (UPDATE ... RETURNING),
    // so a store failure here refuses the whole write under the same
    // named-store rule — before any log append happens.
    try {
      return Math.max(this._storage.allocateTicketId(), this._state.nextTicketId);
    } catch (error) {
      throw new StoreWriteRefused(error);
    }
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
      tags: [...snapshot.tags],
    };
  }

  // ---- tags (#180) ----

  /**
   * Attach freeform tags to one ticket as ONE delta event. The names are
   * trimmed, deduped, and unioned by the fold — a write never carries the
   * whole list, which is the concurrent-edit merge rule. Returns the names
   * that are NEW to this workspace, so the caller can report implicit tag
   * creation instead of doing it silently.
   */
  attachTags(
    ticketId: TicketId,
    names: string[],
    opts?: { actor?: Actor },
  ): { attached: string[]; created: string[] } {
    void opts;
    const snapshot = this._state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    const clean: string[] = [];
    const seen = new Set<string>();
    for (const raw of names) {
      if (typeof raw !== "string") {
        throw new Error("tag names must be strings");
      }
      const name = raw.trim();
      if (name === "") {
        throw new Error("tag names must not be empty");
      }
      if (!seen.has(name)) {
        seen.add(name);
        clean.push(name);
      }
    }
    if (clean.length === 0) {
      throw new Error("attachTags requires at least one tag name");
    }
    // Creation is computed BEFORE the append, over the whole workspace.
    const existing = new Set<string>();
    for (const other of this._state.tickets.values()) {
      if (other.workspaceKey !== snapshot.workspaceKey) continue;
      for (const tag of other.tags) existing.add(tag);
    }
    const created = clean.filter((name) => !existing.has(name));
    this._append({
      kind: "tags/attached",
      version: 1,
      ticketId,
      names: clean,
      at: this._atFor(ticketId),
    });
    return { attached: clean, created };
  }

  /**
   * Detach tags from one ticket as ONE delta event. USER-ONLY by contract:
   * the store cannot see actors here, so the actor gate lives at the
   * service boundary (TagDetachRefused); the store method exists so B0
   * tests can prove the fold, not to offer the agent a path.
   */
  detachTags(ticketId: TicketId, names: string[]): { detached: string[] } {
    const snapshot = this._state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    const clean: string[] = [];
    const seen = new Set<string>();
    for (const raw of names) {
      if (typeof raw !== "string" || raw.trim() === "") {
        throw new Error("tag names must be non-empty strings");
      }
      if (!seen.has(raw.trim())) {
        seen.add(raw.trim());
        clean.push(raw.trim());
      }
    }
    if (clean.length === 0) {
      throw new Error("detachTags requires at least one tag name");
    }
    const present = clean.filter((name) => snapshot.tags.includes(name));
    if (present.length === 0) {
      throw new Error(`ticket ${ticketId} carries none of: ${clean.join(", ")}`);
    }
    this._append({
      kind: "tags/detached",
      version: 1,
      ticketId,
      names: present,
      at: this._atFor(ticketId),
    });
    return { detached: present };
  }

  // ---- backfill (#41) ----

  /**
   * #41: the one-time import of the workspace's existing session logs.
   *
   * The HOST owns the reads: it calls `ctx.get("sessionPersistence").inspect`
   * for every persisted session of this workspace (the same API
   * `workspaceTickets` uses) and hands the inspected logs in here, shaped
   * as `BackfillSessionLog`. The store owns the write: every imported
   * ticket is renumbered into the workspace id space through the same port
   * counter every create uses (so ids can never collide across sessions or
   * with tickets created later), keeps its origin `(sessionId, localSeq)`
   * on every row the import flushes, and has its dependency references and
   * evidence rows rewritten through the renumbering map.
   *
   * RUNS ONCE. The import lands inside ONE storage transaction bracket and
   * finishes with a `backfill/completed` marker event. The marker in the
   * log IS the record that the backfill ran: any later call — same store
   * or a reopen that replays the log — sees it and imports nothing. A crash
   * midway rolls the uncommitted bracket back, so no marker lands, nothing
   * half-imported survives, and the next open retries the whole import:
   * at-least-once attempts, exactly-once effect.
   *
   * Import shape per source ticket, respecting the create invariants
   * (a create is revision 1, open, createdAt = at): one `create` carrying
   * the ticket's content, then its live evidence rows and comments
   * (ascending `at`, the order the source's Rule 7 already guarantees),
   * then one `set` carrying the final snapshot — final state, remapped
   * dependencies, folded tags — at revision 2. Origin stamping: each
   * imported row carries the source session id and the seq of the source
   * event that produced it, so every row traces back to the log it came
   * from.
   */
  backfillSessionLogs(
    projectId: ProjectId,
    logs: readonly BackfillSessionLog[],
  ): BackfillResult {
    // Once and only once: the marker in the log is the record.
    if (this._log.some((event) => event.kind === "backfill/completed")) {
      return { alreadyRan: true, sessionIds: [], tickets: 0, evidence: 0, comments: 0 };
    }
    const project = this._state.projects.get(projectId);
    if (!project) {
      throw new UnknownProject(projectId);
    }
    const workspaceKey = workspaceKeyFromPath(project.absPath);

    const folded = logs.map(foldSessionLog);

    // Pass 1 — renumber. One workspace-unique id per imported ticket, from
    // the same port counter every create uses; two logs may both hold a
    // local ticket 1, and they leave here with different ids.
    const newIdOf = new Map<string, TicketId>();
    for (const fold of folded) {
      for (const localId of sortedLocalIds(fold)) {
        let newId: TicketId;
        try {
          newId = this._storage.allocateTicketId();
        } catch (error) {
          throw new StoreWriteRefused(error);
        }
        newIdOf.set(`${fold.sessionId}#${localId}`, newId);
      }
    }

    // Pass 2 — slugs. The workspace slug is unique per workspace; two
    // sessions can hold the same slug, so later collisions get a numeric
    // suffix, deterministically in import order.
    const slugOf = new Map<string, string>();
    const takenSlugs = new Set<string>();
    for (const snapshot of this._state.tickets.values()) {
      if (snapshot.workspaceKey === workspaceKey) {
        takenSlugs.add(snapshot.slug);
      }
    }
    for (const fold of folded) {
      for (const localId of sortedLocalIds(fold)) {
        const final = fold.state.tickets.get(localId)!;
        let slug = final.slug;
        let suffix = 2;
        while (takenSlugs.has(slug)) {
          slug = `${final.slug}-${suffix}`;
          suffix += 1;
        }
        takenSlugs.add(slug);
        slugOf.set(`${fold.sessionId}#${localId}`, slug);
      }
    }

    // Pass 3 — flush, all inside one bracket.
    const storage = this._storage;
    const transactional =
      typeof storage.beginTransaction === "function" &&
      typeof storage.commitTransaction === "function";
    if (transactional) {
      storage.beginTransaction!();
    }
    const logLengthBefore = this._log.length;
    let tickets = 0;
    let evidence = 0;
    let comments = 0;
    try {
      for (const fold of folded) {
        const rows = importedRowsOf(fold);
        for (const localId of sortedLocalIds(fold)) {
          const key = `${fold.sessionId}#${localId}`;
          const newId = newIdOf.get(key)!;
          const slug = slugOf.get(key)!;
          const final = fold.state.tickets.get(localId)!;
          const origin = (localSeq: number | null): EventOrigin => ({
            sessionId: fold.sessionId,
            localSeq,
          });
          const ticketOrigin = origin(fold.seqOfTicket.get(localId) ?? null);

          // The create: content as-is, but a create is open, revision 1,
          // createdAt = at — the invariants' only legal birth.
          this._emit(
            {
              kind: "ticket/change",
              version: 1,
              operation: "create",
              ticket: {
                id: newId,
                projectId,
                title: final.title,
                description: final.description,
                body: final.body,
                criteria: final.criteria,
                phase: final.phase,
                order: final.order,
                state: "open",
                dependsOn: [],
                allowlist: [...final.allowlist],
                tags: [...final.tags],
                slug,
                workspaceKey,
                revision: 1,
                createdAt: final.createdAt,
                updatedAt: final.createdAt,
              },
              at: final.createdAt,
            },
            ticketOrigin,
          );

          // The ticket's live writes, ascending at — the order the source
          // log's Rule 7 guarantees, so no at falls.
          const writes = [
            ...rows.evidence
              .filter((row) => row.ticketId === localId)
              .map((row) => ({ at: row.row.at, kind: "evidence" as const, row })),
            ...rows.comments
              .filter((comment) => comment.record.ticketId === localId)
              .map((comment) => ({ at: comment.record.at, kind: "comment" as const, comment })),
          ].sort((a, b) => a.at - b.at);
          let lastWriteAt = final.createdAt;
          for (const write of writes) {
            lastWriteAt = Math.max(lastWriteAt, write.at);
            if (write.kind === "evidence") {
              this._emit(
                {
                  kind: "evidence/attached",
                  version: 1,
                  ticketId: newId,
                  row: deepClone(write.row.row),
                },
                origin(write.row.originSeq),
              );
              evidence += 1;
            } else {
              this._emit(
                {
                  kind: "comment/added",
                  version: 1,
                  ticketId: newId,
                  text: write.comment.record.text,
                  author: write.comment.record.author,
                  at: write.comment.record.at,
                },
                origin(write.comment.originSeq),
              );
              comments += 1;
            }
          }

          // The set: the final snapshot — final state, remapped deps,
          // folded tags — at revision 2, no earlier than any write.
          const setAt = Math.max(final.updatedAt, lastWriteAt);
          this._emit(
            {
              kind: "ticket/change",
              version: 1,
              operation: "set",
              ticket: {
                ...final,
                id: newId,
                projectId,
                workspaceKey,
                slug,
                dependsOn: final.dependsOn
                  .map((ref) => this._remapDependency(ref, fold, folded, newIdOf, workspaceKey))
                  .filter((ref): ref is string => ref !== null),
                revision: 2,
                updatedAt: setAt,
              },
              at: setAt,
            },
            ticketOrigin,
          );
          tickets += 1;
        }
      }
      // The marker: the record that this backfill ran, committed in the
      // same bracket as the rows it vouches for.
      this._emit({
        kind: "backfill/completed",
        version: 1,
        sessionIds: folded.map((fold) => fold.sessionId),
        tickets,
        evidence,
        comments,
        at: this._nowFn(),
      });
      if (transactional) {
        storage.commitTransaction!();
      }
    } catch (error) {
      // Nothing half-imported survives: give the log rows back, rebuild the
      // fold, roll the bracket back, and refuse with the cause.
      this._log.length = logLengthBefore;
      this.replay();
      if (transactional) {
        storage.rollbackTransaction?.();
      }
      throw new StoreWriteRefused(error);
    }
    return {
      alreadyRan: false,
      sessionIds: folded.map((fold) => fold.sessionId),
      tickets,
      evidence,
      comments,
    };
  }

  /**
   * Rewrite one `workspaceKey:localId` (or `sessionId:localId`) dependency
   * reference through the renumbering map. The reference resolves within
   * its own session's log first; when the prefix names ANOTHER imported
   * session, that session's mapping answers. A reference whose target no
   * imported log holds is dropped — keeping it raw would leave a local id
   * pointing at whatever new ticket later claims that number.
   */
  private _remapDependency(
    ref: string,
    own: FoldedSessionLog,
    folded: readonly FoldedSessionLog[],
    newIdOf: Map<string, TicketId>,
    workspaceKey: string,
  ): string | null {
    const colon = ref.lastIndexOf(":");
    if (colon < 0) {
      return null;
    }
    const localId = Number(ref.slice(colon + 1));
    if (!Number.isInteger(localId) || localId < 1) {
      return null;
    }
    const prefix = ref.slice(0, colon);
    const source =
      folded.find((fold) => fold.sessionId === prefix) ?? own;
    const newId = newIdOf.get(`${source.sessionId}#${localId}`);
    return newId === undefined ? null : `${workspaceKey}:${newId}`;
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
    const workspaceKey = workspaceKeyFromPath(this._state.projects.get(projectId)!.absPath);
    const base = opts?.slug?.trim() || slugFromTitle(title);
    // Refuse a taken slug BEFORE claiming an id, so a refusal consumes
    // nothing. The id is claimed only for a create that will append —
    // the allocation still runs before the log append, because the id
    // goes into the event payload.
    if (base !== "" && this._slugTaken(workspaceKey, base, null)) {
      throw new DuplicateSlug(base, workspaceKey);
    }
    const ticketId = this._nextTicketId();
    const slug = base || `ticket-${ticketId}`;
    // #186: the empty-base fallback can still collide — a user may have
    // claimed `ticket-5` while a later auto-generated fallback resolves
    // to `ticket-5` too. Re-check the FINAL slug. This second refusal
    // may consume the id it allocated, which is fine: the fallback path
    // fires only when the caller supplied no slug, and the next create
    // simply skips the consumed id.
    if (base === "" && this._slugTaken(workspaceKey, slug, null)) {
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
      // #180: a new ticket starts untagged; tags arrive only as deltas.
      tags: [],
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

  /**
   * Substring search over title, description, and criteria (the same three
   * columns the SQLite FTS table indexes, plus comment text there). The
   * search itself folds from state so both ports answer identically — the
   * FTS table is the future acceleration path and the external query
   * surface, not a second source of truth. Empty query matches nothing;
   * at most 50 hits, in ticket id order.
   */
  searchTickets(query: string, opts?: { projectId?: ProjectId }): TicketSearchHit[] {
    const needle = (query ?? "").toLowerCase().trim();
    if (needle === "") {
      return [];
    }
    const hits: TicketSearchHit[] = [];
    for (const snapshot of this._state.tickets.values()) {
      if (opts?.projectId !== undefined && snapshot.projectId !== opts.projectId) {
        continue;
      }
      const haystacks = [snapshot.title, snapshot.description, snapshot.criteria];
      if (!haystacks.some((field) => field.toLowerCase().includes(needle))) {
        continue;
      }
      hits.push({
        ticketId: snapshot.id,
        projectId: snapshot.projectId,
        title: snapshot.title,
        state: snapshot.state,
        workspaceKey: snapshot.workspaceKey,
      });
    }
    hits.sort((a, b) => a.ticketId - b.ticketId);
    return hits.slice(0, 50);
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

  /**
   * Remove one evidence row the board shows, named by its stamped `at` plus
   * its kind (the same identity the fold drops by). The log keeps both the
   * attachment and this detachment as history — nothing is ever removed
   * from the log, so un-retiring (`builtin:retired` detached) restores the
   * exact prior state. Unknown ticket or no live row throws; the log
   * changes only on allow.
   *
   * No actor parameter, mirroring the host: detach has no agent path —
   * evidence is append-only for the agent — so the only honest caller is
   * the human, and inventing a parameter to check would imply a path that
   * does not exist.
   */
  detachEvidence(ticketId: TicketId, at: number, rowKind: string): void {
    if (!this._state.tickets.has(ticketId)) {
      throw new UnknownTicket(ticketId);
    }
    const rows = this._state.evidence.get(ticketId) ?? [];
    const index = rows.findIndex((row) => row.at === at && row.kind === rowKind);
    if (index < 0) {
      throw new UnknownEvidenceRow(ticketId, at, rowKind);
    }
    this._append({
      kind: "evidence/detached",
      version: 1,
      ticketId,
      at,
      rowKind,
    });
  }

  /**
   * Link one existing evidence row to one criterion line of the ticket's
   * criteria (`criterion: null` clears the link, committing the same empty
   * sentinel the host writes). A non-empty criterion must be one of the
   * ticket's verbatim criterion lines; anything else — unknown ticket, no
   * live row, empty or foreign criterion — throws and the log is untouched.
   * The agent has no link path (payload edits stay user-owned, per the same
   * rule as detach), so like detach this takes no actor.
   */
  linkEvidence(
    ticketId: TicketId,
    at: number,
    rowKind: string,
    criterion: string | null,
  ): void {
    const snapshot = this._state.tickets.get(ticketId);
    if (!snapshot) {
      throw new UnknownTicket(ticketId);
    }
    const rows = this._state.evidence.get(ticketId) ?? [];
    const row = rows.find((candidate) => candidate.at === at && candidate.kind === rowKind);
    if (!row) {
      throw new UnknownEvidenceRow(ticketId, at, rowKind);
    }
    if (criterion === null) {
      this._append({
        kind: "evidence/linked",
        version: 1,
        ticketId,
        at,
        rowKind,
        criterion: "",
      });
      return;
    }
    const trimmed = criterion.trim();
    if (trimmed === "") {
      throw new Error("the criterion must be a non-empty line of the ticket's criteria, or null to unlink");
    }
    const valid = snapshot.criteria
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (!valid.includes(trimmed)) {
      throw new Error(
        `evidence criterion ${JSON.stringify(criterion)} is not one of the ticket's criteria`,
      );
    }
    this._append({
      kind: "evidence/linked",
      version: 1,
      ticketId,
      at,
      rowKind,
      criterion: trimmed,
    });
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

  /** Every comment on one ticket, oldest first. Copies, like every read. */
  commentsFor(ticketId: TicketId): CommentRecord[] {
    if (!this._state.tickets.has(ticketId)) {
      throw new UnknownTicket(ticketId);
    }
    return (this._state.comments.get(ticketId) ?? []).map((record) => ({ ...record }));
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

/*
 * DELIBERATELY NOT ON THE STORE — host surfaces with no kernel event.
 *
 * `requestAllowlist` / pending approvals, `suggestActions` / nominations,
 * review-chain dispatch, worktrees, and git history are SESSION-scoped and
 * in-memory by explicit decision with the user (2026-09-03): NO kernel
 * event and no durable field. A restart drops the nominations and the queue
 * degrades to its derived half, which is recomputed from board state — so
 * the worst case is losing the agent's commentary, never the ask itself.
 * Persisting them here would make a restart restore asks the human already
 * answered elsewhere, which is worse than losing them. They stay in
 * `aidos-core.ts`; the Store owns board state, the host owns the session.
 */
