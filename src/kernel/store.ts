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
import {
  BACKFILL_IMPORTER_VERSION,
  V1_SKIPPED_KINDS,
  foldSessionLog,
  importedRowsOf,
} from "./backfill";
import type { BackfillSessionLog, FoldedSessionLog } from "./backfill";
import type {
  AnyBackfillCompletedEvent,
  BackfillCompletedEvent,
  BackfillPendingEdge,
  BackfillRepairedEdge,
  BackfillSlugRename,
  BackfillTicketMapEntry,
  DroppedDependencyEdge,
  DroppedRefusalRecord,
  SkippedPhaseRecord,
  SkippedPlanRecord,
} from "./events";
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
  EvidenceStamp,
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

/**
 * #230: one origin-scan disagreement the seq-keyed match won. Both the
 * exact (session, last-touch seq) index and the slug fallback index named
 * a stored create for the same folded ticket, but different stored ids —
 * storage holds two rows claiming one source ticket. The import maps the
 * ticket to `seqMatchedId` and names `slugMatchedId` as the overruled
 * candidate, so the choice is on the record instead of silent.
 */
export interface SlugMatchConflict {
  sessionId: string;
  localId: TicketId;
  seqMatchedId: TicketId;
  slugMatchedId: TicketId;
}

/**
 * What one backfill run did. Counts are THIS run's deltas (zero plus
 * `alreadyRan` when it skipped); the edge/skip/pending lists are what this
 * run newly recorded or resolved — a v1 completion recomputes the drops v1
 * never wrote, a resume records only its fresh sessions. The MARKER
 * accumulates across runs, so the durable cumulative account lives on
 * `backfillReport()`, not here.
 */
export interface BackfillResult {
  alreadyRan: boolean;
  sessionIds: string[];
  tickets: number;
  evidence: number;
  comments: number;
  /** #211: plan, phase and refusal events this run replayed. */
  plans: number;
  phases: number;
  refusals: number;
  /** #211: dependency references (re)wired through the renumbering map. */
  edgesRewritten: number;
  /**
   * #211: every dropped edge, named with the ticket that lost it and the
   * exact reference dropped — what the #209 migration summary reports.
   */
  droppedDependencies: DroppedDependencyEdge[];
  /** #211: every unmapped plan/change, named with its reason. */
  skippedPlans: SkippedPlanRecord[];
  /** #211: every unmapped phase/set, named with its reason. */
  skippedPhases: SkippedPhaseRecord[];
  /** #211: every unmapped refusal, named with its reason. */
  droppedRefusals: DroppedRefusalRecord[];
  /**
   * #211 round 2: edges this call pended that are STILL waiting. Neither
   * rewritten nor dropped — a later batch carrying the target session
   * rewires them (see repairedEdges). A pending created and finalized in
   * the same call is NOT listed here: it appears under droppedDependencies
   * instead, and never on the marker's waiting list. The full waiting list
   * lives on `backfillReport().pendingEdges`.
   */
  pendingEdges: BackfillPendingEdge[];
  /** #211 round 2: pending edges this run rewired with a corrective set. */
  repairedEdges: BackfillRepairedEdge[];
  /** #211 round 2: slug-collision renames this run applied. */
  slugRenames: BackfillSlugRename[];
  /**
   * #230: seq-vs-slug scan-match disagreements this run resolved, by name.
   * The seq-keyed match is exact and always wins; a conflict means storage
   * held TWO rows claiming one source ticket (same session, same slug and
   * birth instant, different stored ids), so the slug fallback's loser is
   * named here rather than silently dropped. Recomputed by the origin scan
   * on every call, never accumulated on the marker: re-handing the session
   * re-derives the same entry.
   */
  slugMatchConflicts: SlugMatchConflict[];
  /** #211: source-local kinds seen but given no direct replay. */
  skippedKinds: string[];
  /** #211: the importer generation that ran. */
  importerVersion: number;
  /**
   * #211: true when this call needs no human glance — every drop, skip,
   * pending, rename AND scan-match conflict list is empty. (Ticket history
   * stays intentionally collapsed to create + final set per #41's design;
   * see backfillSessionLogs.)
   */
  lossless: boolean;
}

/**
 * #211: what the latest backfill marker says, for the #209 migration
 * script's summary — and the resume base for #221's batched driver, which
 * reads `sessionIds` + `ticketMap` to hand only unimported logs. Read the
 * marker, not the result: the result describes one call, the marker is the
 * durable CUMULATIVE record across every run so far.
 */
export interface BackfillReport {
  importerVersion: number;
  sessionIds: string[];
  tickets: number;
  evidence: number;
  comments: number;
  plans: number;
  phases: number;
  refusals: number;
  edgesRewritten: number;
  droppedDependencies: DroppedDependencyEdge[];
  skippedPlans: SkippedPlanRecord[];
  skippedPhases: SkippedPhaseRecord[];
  droppedRefusals: DroppedRefusalRecord[];
  /** #211 round 2: edges still waiting on unhanded sessions, cumulative. */
  pendingEdges: BackfillPendingEdge[];
  /** #211 round 2: pending edges rewired so far, cumulative. */
  repairedEdges: BackfillRepairedEdge[];
  /** #211 round 2: slug-collision renames applied so far, cumulative. */
  slugRenames: BackfillSlugRename[];
  skippedKinds: string[];
  ticketMap: BackfillTicketMapEntry[];
  /**
   * True only for a v1 marker, which predates reporting: its drops were
   * never recorded, so the lists read empty-but-unknown. The consumer must
   * print its caveat rather than a comforting zero.
   */
  dropsUnknown: boolean;
  /** True when every attention list is known-empty. Never true for v1. */
  lossless: boolean;
  at: number;
}

/** The plan of a project that never held one. */
const EMPTY_PLAN: PlanValue = {
  frontmatter: "",
  context: { preamble: "", contextSections: [] },
  rules: "",
};

/**
 * #222: the merged-board migration document. The export half (host) writes
 * this as JSON a human can read and edit by hand; the load half
 * (`importBoardDocument` below) reads it back into a FRESH store.
 *
 * Tickets are final snapshots, not creates: `createdAt`/`updatedAt` are
 * floats preserved exactly, `state` transfers as-is (the load never
 * re-gates), and `tags` is OMITTED when the board row carries none rather
 * than defaulted. Evidence payloads are verbatim (`Record<string, unknown>`
 * — 100+ ad-hoc keys in the wild, so no exact-shape validation may touch
 * them); row identity is `(ticket, at, kind)` with a float `at`.
 *
 * `dependsOn` keeps the ORIGINAL reference strings (what the human
 * recognises); `depTargets` is the machine resolution the export computed
 * while the source folds were still available (`workspaceKey:NN` is
 * session-local addressing and means nothing to a fresh store). A `null`
 * target is unresolvable: the loader carries the original string verbatim
 * and REPORTS it by name (#211's rule), never silently dropping it.
 */
export interface BoardMigrationTicket {
  slug: string;
  title: string;
  description: string;
  body: string;
  criteria: string;
  phase: number;
  order: number;
  state: TicketState;
  allowlist: string[];
  dependsOn: string[];
  /** Original ref -> surviving target slug, or null when unresolvable. */
  depTargets: Record<string, string | null>;
  /** Absent reads as untagged. */
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  /** The board identity this row was exported from (audit trail only). */
  oldId: number;
  /** The owning session id, or "store" for a store-resident row. */
  oldSource: string;
}

/** #222: one evidence row of the migration document, payload verbatim. */
export interface BoardMigrationEvidence {
  ticketSlug: string;
  kind: string;
  author: Actor;
  at: number;
  payload: Record<string, unknown>;
  stamp?: EvidenceStamp;
}

/** #222: one comment of the migration document. */
export interface BoardMigrationComment {
  ticketSlug: string;
  text: string;
  author: Actor;
  at: number;
}

/** #222: the whole migration document. Version 1 is the only version. */
export interface BoardMigrationDocument {
  version: 1;
  exportedAt: number;
  workspaceKey: string;
  absPath: string;
  projectName: string;
  tickets: BoardMigrationTicket[];
  evidence: BoardMigrationEvidence[];
  comments: BoardMigrationComment[];
  plan: PlanValue;
  phases: Array<{ number: number; title: string; state: string }>;
  /**
   * The export's certification prerequisites, embedded in the file so the
   * real run can REFUSE an incomplete export instead of blessing it. Set
   * by the export builder; absent (or hand-stripped) refuses the load —
   * unknown provenance cannot certify.
   */
  exportReport: BoardMigrationExportReport;
}

/**
 * #222: what the export saw, for the real run's gates. `retiredExcluded`
 * counts DISTINCT identities (one retired ticket in two folds counts once);
 * `exportedSlugs` lets the real run tell owner-deleted rows (humanRemoved,
 * acknowledged) from walk-missed rows (exportLoss, refused).
 * `duplicateResolutions` names each dropped row's keeper so the real run
 * can EXONERATE a missing board row it already certified as a duplicate —
 * without the keeper's slug in the file, a kept twin would read as loss.
 */
export interface BoardMigrationExportReport {
  retiredExcluded: number;
  backfillVerified: boolean;
  exportedSlugs: string[];
  duplicateResolutions: Array<{ keptSlug: string; droppedSlug: string }>;
}

/** #222: one dependency reference the loader could not resolve. */
export interface UnresolvedMigrationDependency {
  ticketSlug: string;
  ticketTitle: string;
  ref: string;
}

/** #222: what one `importBoardDocument` call did. */
export interface BoardMigrationLoadResult {
  projectId: ProjectId;
  tickets: number;
  evidence: number;
  comments: number;
  plans: number;
  phases: number;
  edgesRewritten: number;
  unresolvedDependencies: UnresolvedMigrationDependency[];
  skippedPlans: Array<{ at: number; reason: string }>;
  /** Surviving slug -> the fresh id the store's own counter allocated. */
  newIds: Record<string, TicketId>;
  /**
   * Tickets whose `updatedAt` the load dragged forward: `setAt` is the
   * later of `updatedAt` and the last write (Rule 6 forbids a falling `at`,
   * so evidence or comments newer than the last ticket edit force it).
   * Named so a future dedupe never mistakes the drag for newer work.
   */
  adjustedUpdatedAt: Array<{ slug: string; from: number; to: number }>;
}

/**
 * One classified dependency reference (see Store._classifyDependency).
 * `mapped` carries the rewritten `workspaceKey:newId` and is the ONLY
 * outcome counted as rewired. `pending` waits on a session the driver
 * claimed but has not handed in yet. `dropped` carries the reason.
 */
export type DependencyOutcome =
  | { kind: "mapped"; ref: string }
  | {
      kind: "pending";
      targetSessionId: string | null;
      targetLocalId: TicketId | null;
      slug: string | null;
    }
  | { kind: "dropped"; reason: string };

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
   * #43: one HOST write lands in the store directly — the orphan-ticket
   * write path. When a ticket's origin session is closed or deleted, the
   * host's write methods still compute the same event they always did, but
   * the synthetic orphan session appends HERE instead of into a session
   * log: the store is the only durable home the ticket has left. The write
   * rides the same mirrored `_append` every other store write uses (#40),
   * so a store refusal throws and the whole write is refused.
   */
  commitHostEvent(event: AidosEvent): void {
    this._append(event);
  }

  /**
   * #218: one LIVE host write lands in BOTH homes — the session log and
   * the store — under #40's mirrored all-or-nothing rule.
   *
   * The host validates the event against its own session fold BEFORE
   * calling (a session-invalid event never reaches the store); this
   * method validates against the STORE fold first, so a store-invalid
   * event never reaches the session either. Then, inside ONE storage
   * bracket: stage the store write (log push, port append, fold), run
   * the session append (`sessionWrite`), and commit. A failure at any
   * stage rolls everything back — the store log gives the event back,
   * the fold replays, the port bracket rolls back — and:
   *  - a STORE-stage failure throws StoreWriteRefused naming the store,
   *    with the session log untouched (the refusal leaves no event
   *    behind, which is #40 criterion 2's shape at host level);
   *  - a SESSION-stage failure propagates raw (it is not the store
   *    refusing), with the staged store write rolled back.
   *
   * The session append is assumed atomic (one event or nothing, which
   * holds for the in-memory log and for a single-record durable
   * append). A session persistence failure AFTER the store staged is
   * still rolled back here; only a session failure the callback cannot
   * report (a half-appended session log) escapes, and that shape means
   * dsh's own session persistence is broken — a bigger problem than one
   * ticket write.
   *
   * `origin` stamps the stored row exactly like the backfill's rows
   * (#41): the host passes the creating session on a mirrored create so
   * `originSessionOf` answers the owner and the board merge stamps the
   * store copy with the session that owns it rather than with whoever
   * happens to be reading. Updates carry no origin (only creates are
   * noted). `localSeq` is null — unknown at mirror time, and the
   * columns stay nullable on purpose.
   *
   * #230: the null seq is structural, not a TODO. The session envelope
   * seq is assigned by the session append, which runs AFTER the store
   * row stages (the #40 order above); the port is append-only, so the
   * staged row cannot be patched afterwards, and running the session
   * first would leave a session event with no store row on a store
   * refusal - the exact disagreement #40 exists to prevent. Predicting
   * the seq would be inventing one. So mirrored rows stay seq-less and
   * the backfill origin scan matches them by slug (+ createdAt)
   * instead: the slug fallback is the standing mechanism, not a
   * migration crutch.
   */
  commitHostMirror(
    event: AidosEvent,
    sessionWrite: () => void,
    origin?: { sessionId: string; localSeq?: number | null },
  ): void {
    validateAidosEvent(this._state, event);
    const storage = this._storage;
    const mirrored =
      typeof storage.beginTransaction === "function" &&
      typeof storage.commitTransaction === "function";
    if (!mirrored) {
      // A bracket-less port keeps the persist-first order: the store
      // refuses before the session is touched, but a session failure
      // after a successful store append cannot be rolled back. Both
      // shipped ports implement the bracket, so this is the
      // hypothetical-port path, documented not hidden.
      const originValue =
        origin !== undefined
          ? { sessionId: origin.sessionId, localSeq: origin.localSeq ?? null }
          : undefined;
      try {
        if (originValue) {
          if (originValue.sessionId !== undefined && originValue.sessionId !== null) {
            this._noteOrigin({ seq: 0, event, sessionId: originValue.sessionId, localSeq: originValue.localSeq ?? null });
          }
          storage.append(event, originValue);
        } else {
          storage.append(event);
        }
      } catch (error) {
        throw new StoreWriteRefused(error);
      }
      this._log.push(event);
      foldAidosEvents(this._state, event);
      sessionWrite();
      return;
    }
    storage.beginTransaction!();
    let stage: "store" | "session" | "commit" = "store";
    let notedOrigin = false;
    try {
      this._log.push(event);
      if (origin !== undefined && origin.sessionId !== undefined && origin.sessionId !== null) {
        const id =
          event.kind === "ticket/change" ? (event.ticket.id as TicketId) : null;
        if (event.kind === "ticket/change" && id !== null && !this._originSessionOfTicket.has(id)) {
          notedOrigin = true;
        }
        this._noteOrigin({
          seq: 0,
          event,
          sessionId: origin.sessionId,
          localSeq: origin.localSeq ?? null,
        });
      }
      if (origin !== undefined) {
        storage.append(event, { sessionId: origin.sessionId, localSeq: origin.localSeq ?? null });
      } else {
        storage.append(event);
      }
      foldAidosEvents(this._state, event);
      stage = "session";
      sessionWrite();
      stage = "commit";
      storage.commitTransaction!();
    } catch (error) {
      this._log.pop();
      this.replay();
      if (notedOrigin) {
        const id =
          event.kind === "ticket/change" ? (event.ticket.id as TicketId) : undefined;
        if (id !== undefined) {
          this._originSessionOfTicket.delete(id);
        }
      }
      storage.rollbackTransaction?.();
      if (stage === "session") {
        throw error;
      }
      throw error instanceof StoreWriteRefused ? error : new StoreWriteRefused(error);
    }
  }

  /**
   * #218: claim the next workspace-unique ticket id from the store port
   * for a HOST create. This is the public form of the private
   * allocation every `Store.createTicket` already uses: the port
   * counter (atomic across processes on SQLite, shared across sessions
   * in one process on every port) floored by the store fold's own
   * counter, so a store seeded from an explicit log never reissues a
   * seeded id. The host maxes this once more against its session
   * fold's counter, so a session holding legacy fold-counter tickets
   * ahead of the port still mints a fresh id in both spaces.
   *
   * A refused allocation throws StoreWriteRefused before any log
   * append, exactly like #40's allocation rule. A refused CREATE still
   * consumes the claimed port id (a monotonic gap, never a reuse) —
   * the same consumption #39 already accepts for the fallback slug.
   */
  allocateTicketId(): TicketId {
    return this._nextTicketId();
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
   * #211: what the latest backfill marker records, for the #209 migration
   * script's summary — real (re)written/dropped/pending edge lists, not a
   * predicted fold. Null when no backfill has run. A v1 marker predates
   * reporting: it reads back with `dropsUnknown` true and `lossless` false,
   * because its drops were never recorded and silence must not parse as
   * success. A v2 marker predates pending/repair/rename tracking and reads
   * those back empty. Copies: mutating the report never touches the log.
   */
  backfillReport(): BackfillReport | null {
    const marker = this._latestBackfillMarker();
    if (marker === null) {
      return null;
    }
    if (marker.version === 1) {
      return {
        importerVersion: 1,
        sessionIds: [...marker.sessionIds],
        tickets: marker.tickets,
        evidence: marker.evidence,
        comments: marker.comments,
        plans: 0,
        phases: 0,
        refusals: 0,
        edgesRewritten: 0,
        droppedDependencies: [],
        skippedPlans: [],
        skippedPhases: [],
        droppedRefusals: [],
        pendingEdges: [],
        repairedEdges: [],
        slugRenames: [],
        skippedKinds: [...V1_SKIPPED_KINDS],
        ticketMap: [],
        dropsUnknown: true,
        lossless: false,
        at: marker.at,
      };
    }
    const pendingEdges =
      marker.version === 3 ? marker.pendingEdges.map((entry) => ({ ...entry })) : [];
    const repairedEdges =
      marker.version === 3 ? marker.repairedEdges.map((entry) => ({ ...entry })) : [];
    const slugRenames =
      marker.version === 3 ? marker.slugRenames.map((entry) => ({ ...entry })) : [];
    return {
      importerVersion: marker.importerVersion,
      sessionIds: [...marker.sessionIds],
      tickets: marker.tickets,
      evidence: marker.evidence,
      comments: marker.comments,
      plans: marker.plans,
      phases: marker.phases,
      refusals: marker.refusals,
      edgesRewritten: marker.edgesRewritten,
      droppedDependencies: marker.droppedDependencies.map((entry) => ({ ...entry })),
      skippedPlans: marker.skippedPlans.map((entry) => ({ ...entry })),
      skippedPhases: marker.skippedPhases.map((entry) => ({ ...entry })),
      droppedRefusals: marker.droppedRefusals.map((entry) => ({ ...entry })),
      pendingEdges,
      repairedEdges,
      slugRenames,
      skippedKinds: [...marker.skippedKinds],
      ticketMap: marker.ticketMap.map((entry) => ({ ...entry })),
      dropsUnknown: false,
      lossless:
        marker.droppedDependencies.length === 0 &&
        marker.skippedPlans.length === 0 &&
        marker.skippedPhases.length === 0 &&
        marker.droppedRefusals.length === 0 &&
        pendingEdges.length === 0 &&
        slugRenames.length === 0,
      at: marker.at,
    };
  }

  /** The latest backfill marker in the log, either generation, or null. */
  private _latestBackfillMarker(): AnyBackfillCompletedEvent | null {
    let latest: AnyBackfillCompletedEvent | null = null;
    for (const event of this._log) {
      if (event.kind === "backfill/completed") {
        latest = event;
      }
    }
    return latest;
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

  /**
   * #218: the host's pre-allocation slug check. A refused create consumes
   * nothing (the port contract), so the host validates the slug against
   * the store fold BEFORE claiming an id — the same order
   * `Store.createTicket` uses above. Without it a cross-session duplicate
   * slug would only fail inside the mirrored append, after the port id
   * was already consumed.
   */
  slugTaken(workspaceKey: string, slug: string, excludeId: TicketId | null): boolean {
    return this._slugTaken(workspaceKey, slug, excludeId);
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
   * #211, what the current importer adds over #41. Plan meta, phases and
   * refusal history are replayed through their workspace mapping instead
   * of dropped: a plan/phase event whose source project shares the target
   * workspace is re-emitted against the target project, oldest first, so
   * history survives; a refusal is re-emitted against the ticket's
   * renumbered id. Anything without a mapping — a plan/phase for a foreign
   * project, a refusal for a ticket in no log, a dependency edge whose
   * target no log holds — is RECORDED BY NAME on the marker, never silently
   * dropped. Dropping a dangling edge stays correct (a preserved
   * `workspaceKey:99` would resolve to a stranger's ticket once future
   * creates reuse the number); the defect was the silence, and the marker
   * ends it.
   *
   * Dependency references are CLASSIFIED, never guessed (`_classifyDependency`):
   * `workspaceKey:N` and bare `N` resolve within the own log; a session id
   * prefix resolves within that session when handed in, else through the
   * CARRIED ticket map when that session finished earlier; slug tails
   * (`workspaceKey:slug`, bare slugs, session-scoped slugs) resolve through
   * the source slugs the same way. A session prefix naming no known session
   * never falls back to the own log. What cannot resolve becomes PENDING
   * when the driver claimed the full session set (`opts.expectedSessionIds`)
   * and the target is among the not-yet-imported — repaired with a
   * corrective set when the session arrives — or a NAMED DROP otherwise.
   * Only wired edges count as `edgesRewritten`.
   *
   * RUNS ONCE PER SESSION, RESUMABLE PER WORKSPACE (#221). The import lands
   * inside ONE storage bracket and finishes with a `backfill/completed`
   * version-3 marker carrying the importer version, the history-finished
   * session ids, the whole ticket map (with source slugs), and every loss,
   * wait, and rename by name. A later call whose sessions are all already
   * on the marker imports nothing. A later call with unfinished sessions
   * RESUMES: only those sessions flush, against the marker's ticket map,
   * and the next marker accumulates — session ids, ticket map, counts,
   * losses, pendings, repairs, renames — so the marker stays the complete
   * account of the workspace import and a driver can batch logs to bound
   * memory instead of accumulating every log first. A v1
   * marker (#41's
   * counts-only record) means INCOMPLETE: the call COMPLETES the workspace
   * — imports the plans, phases and refusals v1 never did, recomputes the
   * drops v1 never recorded from the source logs it is handed — and skips
   * every ticket v1 already imported, so nothing lands twice. When the
   * driver claimed the full session set and every claimed session is now
   * imported, remaining pendings finalize to named drops: their targets
   * will never materialize. A crash midway rolls the uncommitted bracket
   * back, so no marker lands, nothing half-imported survives, and the next
   * open retries the whole import: at-least-once attempts, exactly-once
   * effect.
   *
   * `sessionIds` on the marker is deliberately NARROW: sessions whose
   * tickets AND history both landed. A v1 session is not listed until a
   * later call replays its history — listing it early would make a later
   * call skip it as finished and lose that history silently. Under-claiming
   * is safe (re-handing is idempotent); over-claiming loses data. Read the
   * marker for the cumulative account (`backfillReport`); read the result
   * for what one call did — notably, `result.pendingEdges` lists only this
   * call's still-waiting pendings, while a pending created AND finalized in
   * the same call appears under `droppedDependencies` instead and never on
   * the marker's waiting list. Durable truth is exact; the result narrates
   * the call.
   *
   * Honest collapse, kept from #41: one ticket's history lands as a create
   * plus its live rows plus one final set — intermediate revisions are not
   * replayed as events. Evidence detach/link outcomes and folded tags ride
   * the final state, so they are captured, not lost. Source-local project
   * records (`project/created`, `project/moved`) get no direct replay: the
   * import targets the single project it was handed, and they are listed on
   * the marker's `skippedKinds`.
   *
   * Import shape per source ticket, respecting the create invariants
   * (a create is revision 1, open, createdAt = at): one `create` carrying
   * the ticket's content, then its live evidence rows and comments
   * (ascending `at`, the order the source's Rule 7 already guarantees),
   * then one `set` carrying the final snapshot — final state, remapped
   * dependencies, folded tags — at revision 2. A mirror-stale ticket
   * (live-mirrored CREATE, history never imported) replays the same shape
   * minus the create, with the set continuing the stored revision chain —
   * but only the DELTA the store does not already hold. The live mirror
   * is lockstep, so replayed evidence/comments already present by row
   * identity are skipped, and a ticket whose stored content already
   * equals the fold final emits no set at all: a content-identical no-op
   * plus its marker entry, contributing zero to the run deltas, which
   * count only what was ACTUALLY emitted. Origin stamping: each
   * imported row carries the source session id and the seq of the source
   * event that produced it, so every row traces back to the log it came
   * from.
   */
  backfillSessionLogs(
    projectId: ProjectId,
    logs: readonly BackfillSessionLog[],
    opts?: { expectedSessionIds?: readonly string[] },
  ): BackfillResult {
    const project = this._state.projects.get(projectId);
    if (!project) {
      throw new UnknownProject(projectId);
    }
    const workspaceKey = workspaceKeyFromPath(project.absPath);
    // #221: the driver's claim of the FULL session set, when it batches.
    // A session-scoped reference naming an expected-but-unimported session
    // becomes a PENDING edge (repaired when the session arrives) instead of
    // a drop. Without the claim, such a reference is dropped and recorded:
    // the importer can never know whether the session is merely late.
    const expected =
      opts?.expectedSessionIds === undefined ? null : new Set(opts.expectedSessionIds);

    const folded = logs.map(foldSessionLog);
    const latest = this._latestBackfillMarker();
    // The import base: what previous runs already finished.
    //
    // - No marker: a fresh import. Nothing is prior to anything.
    // - A v1 marker (#41's counts-only record): tickets flushed, history
    //   unfinished for every session it lists. The ticket map v1 never
    //   recorded is rebuilt per handed-in batch from the origin columns v1
    //   did stamp (see _reconstructTicketMap); v1's ticket/evidence/comment
    //   counts carry forward so the cumulative counts stay truthful.
    // - A v2/v3 marker: RESUME (#221). Its sessionIds name every
    //   history-finished log and its ticketMap carries every imported
    //   ticket, so a driver that batches logs to bound memory hands any
    //   subset and only unfinished sessions flush. When every handed-in
    //   session is already finished the call is a no-op. Carried lists go
    //   straight onto the next marker, so the marker stays the cumulative
    //   account of the whole workspace import.
    //
    // `historyDone` is deliberately narrow: sessions whose tickets AND
    // history both landed. A v1 session is NOT history-done until a later
    // call replays its history — listing it early would make a later call
    // skip it as finished and lose that history silently (F4 in reverse).
    // Under-claiming is safe (re-handing is idempotent: scan-matched
    // tickets skip, finished histories don't replay); over-claiming loses
    // data. The marker's session list therefore only ever grows with
    // sessions this importer actually finished.
    //
    // A session whose history is finished is never re-examined: its tickets
    // are never re-imported, its drops never recomputed, its plans, phases
    // and refusals never replayed. A handed-in session whose history is NOT
    // finished but whose tickets the map already holds (the v1 shape: v1
    // flushed tickets without history) is completed: tickets skipped,
    // history replayed, silent drops recomputed.
    let priorMap = new Map<string, TicketId>();
    let historyDone: string[] = [];
    let carriedEdgesRewritten = 0;
    let carriedCounts = { tickets: 0, evidence: 0, comments: 0, plans: 0, phases: 0, refusals: 0 };
    let carriedDrops: DroppedDependencyEdge[] = [];
    let carriedSkippedPlans: SkippedPlanRecord[] = [];
    let carriedSkippedPhases: SkippedPhaseRecord[] = [];
    let carriedDroppedRefusals: DroppedRefusalRecord[] = [];
    let carriedPendings: BackfillPendingEdge[] = [];
    let carriedRepaired: BackfillRepairedEdge[] = [];
    let carriedRenames: BackfillSlugRename[] = [];
    let carriedSkippedKinds: string[] = [];
    // Carried ticket source slugs, for cross-batch slug references.
    const carriedSlugs = new Map<string, string>();
    if (latest !== null && latest.version === 1) {
      carriedCounts = {
        tickets: latest.tickets,
        evidence: latest.evidence,
        comments: latest.comments,
        plans: 0,
        phases: 0,
        refusals: 0,
      };
    } else if (latest !== null && (latest.version === 2 || latest.version === 3)) {      for (const entry of latest.ticketMap) {
        priorMap.set(`${entry.sessionId}#${entry.localId}`, entry.newId);
        if (latest.version === 3 && entry.slug !== undefined) {
          carriedSlugs.set(`${entry.sessionId}#${entry.localId}`, entry.slug);
        }
      }
      historyDone = [...latest.sessionIds];
      carriedEdgesRewritten = latest.edgesRewritten;
      carriedCounts = {
        tickets: latest.tickets,
        evidence: latest.evidence,
        comments: latest.comments,
        plans: latest.plans,
        phases: latest.phases,
        refusals: latest.refusals,
      };
      carriedDrops = latest.droppedDependencies.map((entry) => ({ ...entry }));
      carriedSkippedPlans = latest.skippedPlans.map((entry) => ({ ...entry }));
      carriedSkippedPhases = latest.skippedPhases.map((entry) => ({ ...entry }));
      carriedDroppedRefusals = latest.droppedRefusals.map((entry) => ({ ...entry }));
      carriedSkippedKinds = [...latest.skippedKinds];
      if (latest.version === 3) {
        carriedPendings = latest.pendingEdges.map((entry) => ({ ...entry }));
        carriedRepaired = latest.repairedEdges.map((entry) => ({ ...entry }));
        carriedRenames = latest.slugRenames.map((entry) => ({ ...entry }));
      }
      const finished = new Set(historyDone);
      if (folded.every((fold) => finished.has(fold.sessionId))) {
        return {
          alreadyRan: true,
          sessionIds: [],
          tickets: 0,
          evidence: 0,
          comments: 0,
          plans: 0,
          phases: 0,
          refusals: 0,
          edgesRewritten: 0,
          droppedDependencies: [],
          skippedPlans: [],
          skippedPhases: [],
          droppedRefusals: [],
          pendingEdges: [],
          repairedEdges: [],
          slugRenames: [],
          slugMatchConflicts: [],
          skippedKinds: [],
          importerVersion: BACKFILL_IMPORTER_VERSION,
          lossless: true,
        };
      }
    }
    // Origin re-derivation for the handed-in folds, on EVERY path: the
    // marker's map covers sessions it finished, but a v1-origin session
    // handed in after a v3 marker was written (subset completion) is in no
    // map yet — while its tickets' origins ARE in storage. Unioning the
    // scan cannot contradict the carried map (origins are immutable and the
    // fold recomputes them deterministically); it only fills the gaps that
    // would otherwise re-import as duplicates (F4). #230: the scan also
    // covers live-mirrored rows through its slug fallback, which is what
    // lets the host hand mirrored sessions back in.
    // #230 round 2: the scan's two provenances split HERE and never merge.
    // A marker entry or a seq-keyed scan hit means "fully imported before,
    // history landed" — skip. A slug-fallback hit on a seq-less mirrored
    // row (scan.mirrorStale) means "mirrored CREATE only" — REPLAY under
    // the matched id in pass 3a. Unioning them indistinguishably is what
    // silently dropped post-mirror evidence, comments and sets while
    // reporting lossless.
    const scan = this._reconstructTicketMap(folded);
    const skipSet = new Set<string>(priorMap.keys());
    for (const key of scan.map.keys()) {
      if (!scan.mirrorStale.has(key)) {
        skipSet.add(key);
      }
    }

    // Pass 1 — renumber. One workspace-unique id per imported ticket, from
    // the same port counter every create uses; two logs may both hold a
    // local ticket 1, and they leave here with different ids. Tickets the
    // previous generation already mapped keep their ids: they are reported
    // but never re-imported. Scan-matched tickets keep the stored id the
    // scan paired them with — mirrored replays and seq-matched skips alike
    // resolve through the same map, so dependency wiring sees one identity.
    const newIdOf = new Map<string, TicketId>(priorMap);
    for (const [key, id] of scan.map) {
      if (!newIdOf.has(key)) {
        newIdOf.set(key, id);
      }
    }
    for (const fold of folded) {
      for (const localId of sortedLocalIds(fold)) {
        const key = `${fold.sessionId}#${localId}`;
        if (newIdOf.has(key)) {
          continue;
        }
        let newId: TicketId;
        try {
          newId = this._storage.allocateTicketId();
        } catch (error) {
          throw new StoreWriteRefused(error);
        }
        newIdOf.set(key, newId);
      }
    }

    // Pass 2 — slugs. The workspace slug is unique per workspace; two
    // sessions can hold the same slug, so later collisions get a numeric
    // suffix, deterministically in import order. Previously imported
    // tickets keep the slugs they landed with. Every rename is recorded:
    // the ticket is intact, but anyone holding the old slug must update.
    const slugOf = new Map<string, string>();
    const slugRenames: BackfillSlugRename[] = [];
    const takenSlugs = new Set<string>();
    for (const snapshot of this._state.tickets.values()) {
      if (snapshot.workspaceKey === workspaceKey) {
        takenSlugs.add(snapshot.slug);
      }
    }
    for (const fold of folded) {
      for (const localId of sortedLocalIds(fold)) {
        const key = `${fold.sessionId}#${localId}`;
        if (skipSet.has(key)) {
          continue;
        }
        // #230 round 2: a mirror-stale replay keeps the slug it landed
        // with — no fresh assignment, no rename, never a suffix. The slug
        // is already taken (the mirrored row holds it) and the scan only
        // matched because fold and storage agree on it.
        const stale = scan.mirrorStale.get(key);
        if (stale !== undefined) {
          slugOf.set(key, stale.slug);
          continue;
        }
        const final = fold.state.tickets.get(localId)!;
        let slug = final.slug;
        let suffix = 2;
        while (takenSlugs.has(slug)) {
          slug = `${final.slug}-${suffix}`;
          suffix += 1;
        }
        takenSlugs.add(slug);
        slugOf.set(key, slug);
        if (slug !== final.slug) {
          slugRenames.push({
            sessionId: fold.sessionId,
            localId,
            newId: newIdOf.get(key)!,
            title: final.title,
            fromSlug: final.slug,
            toSlug: slug,
          });
        }
      }
    }

    // The source-local project records get no direct replay: the import
    // targets the single project it was handed. Seen here, listed on the
    // marker, so a later importer knows exactly what was left behind.
    const skippedKinds = [...new Set(folded.flatMap((fold) => fold.seenKinds))].filter(
      (kind) => kind === "project/created" || kind === "project/moved",
    );

    // The cumulative slug index: source slug -> workspace id, for slug-form
    // references. Handed-in folds first (they carry full snapshots), then
    // already-imported sessions via the carried source slugs. Session order
    // is always explicit at the call site — own session first for
    // workspace-scoped refs, exactly one session for session-scoped ones —
    // so this lookup never guesses across sessions on its own.
    const lookupSlugIn = (slug: string, sessionIds: readonly string[]): TicketId | null => {
      for (const sessionId of sessionIds) {
        const fold = folded.find((candidate) => candidate.sessionId === sessionId);
        if (fold !== undefined) {
          for (const localId of sortedLocalIds(fold)) {
            if (fold.state.tickets.get(localId)!.slug === slug) {
              const newId = newIdOf.get(`${sessionId}#${localId}`);
              if (newId !== undefined) {
                return newId;
              }
            }
          }
        }
        for (const [key, sourceSlug] of carriedSlugs) {
          if (sourceSlug !== slug) {
            continue;
          }
          const hash = key.lastIndexOf("#");
          if (key.slice(0, hash) !== sessionId) {
            continue;
          }
          const newId = newIdOf.get(key);
          if (newId !== undefined) {
            return newId;
          }
        }
      }
      return null;
    };
    // Workspace-scoped lookup order: the depending ticket's own session
    // first, then the other handed-in sessions in order, then the carried
    // sessions nobody handed in. Deterministic, so a repeated import
    // resolves identically.
    const workspaceSlugOrder = (ownSessionId: string): string[] => {
      const order = [ownSessionId];
      for (const fold of folded) {
        if (!order.includes(fold.sessionId)) {
          order.push(fold.sessionId);
        }
      }
      for (const key of carriedSlugs.keys()) {
        const sessionId = key.slice(0, key.lastIndexOf("#"));
        if (!order.includes(sessionId)) {
          order.push(sessionId);
        }
      }
      return order;
    };

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
    let plans = 0;
    let phases = 0;
    let refusals = 0;
    let edgesRewritten = 0;
    const droppedDependencies: DroppedDependencyEdge[] = [];
    const skippedPlans: SkippedPlanRecord[] = [];
    const skippedPhases: SkippedPhaseRecord[] = [];
    const droppedRefusals: DroppedRefusalRecord[] = [];
    const pendings: BackfillPendingEdge[] = [];
    const repaired: BackfillRepairedEdge[] = [];
    // This call's still-waiting pendings (see below); assigned in the bracket.
    let newStillPending: BackfillPendingEdge[] = [];
    try {
      for (const fold of folded) {
        const rows = importedRowsOf(fold);
        for (const localId of sortedLocalIds(fold)) {
          const key = `${fold.sessionId}#${localId}`;
          // A completion run never re-imports a ticket its predecessor
          // mapped: its drops are recomputed for the report below.
          // #230 round 2: the skip is the MARKER's provenance plus the
          // scan's seq-proven rows only — mirror-stale rows fall through
          // to the replay below instead of vanishing here.
          if (skipSet.has(key)) {
            continue;
          }
          const newId = newIdOf.get(key)!;
          const slug = slugOf.get(key)!;
          const final = fold.state.tickets.get(localId)!;
          const origin = (localSeq: number | null): EventOrigin => ({
            sessionId: fold.sessionId,
            localSeq,
          });
          const ticketOrigin = origin(fold.seqOfTicket.get(localId) ?? null);
          // #230 round 3: a mirror-stale ticket already holds its create
          // (the live mirror landed it) — replaying a second create would
          // refuse (the id exists) or duplicate. And the mirror is
          // LOCKSTEP, not a bare create: every later session write to the
          // ticket landed too, as the identical event object. Replaying
          // the fold's FULL history would re-emit rows the store already
          // holds — refusing under Rule 7 when their `at` falls below
          // the stored lastAt, or silently duplicating them when it
          // merely ties. So only the DELTA is emitted: rows the store
          // does not already hold, by ROW IDENTITY. The replayed set
          // continues the STORED ticket's revision chain (normally
          // 1 -> 2, the mirror create being revision 1) and never lets
          // its timestamps fall below what the store already holds.
          const stale = scan.mirrorStale.get(key);
          const stored = stale !== undefined ? this._state.tickets.get(newId)! : null;
          // The row identities the store already holds for this ticket.
          // Evidence identity is (at, kind) — the row half of evidenceKey
          // (backfill.ts); the ticketId half is this loop's own ticket on
          // both sides, so it is factored out, not dropped. Comments
          // carry no kind, so (at, author, text) is the identity. Counts,
          // not presence: two identical rows held twice skip twice.
          const heldEvidence = new Map<string, number>();
          const heldComments = new Map<string, number>();
          if (stale !== undefined) {
            for (const row of this._state.evidence.get(newId) ?? []) {
              const heldKey = `${row.at}\0${row.kind}`;
              heldEvidence.set(heldKey, (heldEvidence.get(heldKey) ?? 0) + 1);
            }
            for (const record of this._state.comments.get(newId) ?? []) {
              const heldKey = `${record.at}\0${record.author}\0${record.text}`;
              heldComments.set(heldKey, (heldComments.get(heldKey) ?? 0) + 1);
            }
          }

          // The create: content as-is, but a create is open, revision 1,
          // createdAt = at — the invariants' only legal birth. Skipped
          // for replays: the mirrored create already landed.
          if (stale === undefined) {
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
          }

          // The ticket's live writes, ascending at — the order the source
          // log's Rule 7 guarantees, so no at falls. For a mirror-stale
          // replay each write is checked against the rows the store
          // already holds FIRST: held rows are skipped (and counted down,
          // so a doubled row emits exactly its missing copies), the
          // remainder emits ascending. The deltas count what was ACTUALLY
          // emitted, so a fully mirrored ticket contributes zero.
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
            if (stale !== undefined) {
              if (write.kind === "evidence") {
                const heldKey = `${write.row.row.at}\0${write.row.row.kind}`;
                const held = heldEvidence.get(heldKey) ?? 0;
                if (held > 0) {
                  heldEvidence.set(heldKey, held - 1);
                  continue;
                }
              } else {
                const record = write.comment.record;
                const heldKey = `${record.at}\0${record.author}\0${record.text}`;
                const held = heldComments.get(heldKey) ?? 0;
                if (held > 0) {
                  heldComments.set(heldKey, held - 1);
                  continue;
                }
              }
            }
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
          // folded tags — at revision 2, no earlier than any write. Every
          // reference is CLASSIFIED, never guessed: mapped (wired and
          // counted), pending (the target session is expected but not here
          // yet — left out of the set, repaired on arrival), or dropped and
          // recorded by name. A session prefix naming no handed-in log never
          // falls back to the own session: that miswire (F2) is what made a
          // corrupt graph report success. Classification lands in ticket
          // locals first: a mirror-stale ticket whose stored content
          // already equals the fold final emits NO set (see below), and
          // nothing it classified may leak into the run's account then.
          const remappedDeps: string[] = [];
          const ticketDrops: DroppedDependencyEdge[] = [];
          const ticketPendings: BackfillPendingEdge[] = [];
          let ticketMapped = 0;
          for (const ref of final.dependsOn) {
            const outcome = this._classifyDependency(
              ref,
              fold,
              folded,
              newIdOf,
              lookupSlugIn,
              workspaceSlugOrder(fold.sessionId),
              workspaceKey,
              expected,
            );
            this._collectRefOutcome(
              outcome,
              { sessionId: fold.sessionId, localId, newId, title: final.title },
              ref,
              {
                remapped: remappedDeps,
                drops: ticketDrops,
                pendings: ticketPendings,
                onMapped: () => {
                  ticketMapped += 1;
                },
              },
            );
          }
          // #230 round 3: a mirror-stale ticket whose stored content
          // already equals the fold final replays to a pure no-op plus
          // its marker entry — NO content-identical set, NO revision
          // bump. A set that changes nothing carries no information
          // (the mirror already stamped the origin; the marker records
          // the session as finished so nothing re-emits), while emitting
          // it would churn the revision chain and inflate the tickets
          // delta for work that never happened. Fresh imports always
          // emit: their create just landed and the set IS the content.
          const sameStrings = (a: readonly string[], b: readonly string[]): boolean =>
            a.length === b.length && a.every((value, index) => value === b[index]);
          const storedEqualsFinal =
            stale !== undefined &&
            stored!.title === final.title &&
            stored!.description === final.description &&
            stored!.body === final.body &&
            stored!.criteria === final.criteria &&
            stored!.phase === final.phase &&
            stored!.order === final.order &&
            stored!.state === final.state &&
            stored!.slug === stale.slug &&
            sameStrings(stored!.allowlist, final.allowlist) &&
            sameStrings(stored!.tags, final.tags) &&
            sameStrings(stored!.dependsOn, remappedDeps);
          if (storedEqualsFinal) {
            continue;
          }
          droppedDependencies.push(...ticketDrops);
          pendings.push(...ticketPendings);
          edgesRewritten += ticketMapped;
          // A replay continues the stored ticket's chain instead of
          // restarting it at revision 2: the mirror create is already
          // revision 1, and the set must neither reuse a revision nor let
          // the stored timestamps fall. The floor is the ticket's live
          // lastAt, not just its updatedAt: tag writes advance lastAt
          // without touching updatedAt, so updatedAt alone falls short.
          // A fresh import restarts at 2 by construction (create just
          // landed at revision 1).
          const setAt =
            stale === undefined
              ? Math.max(final.updatedAt, lastWriteAt)
              : Math.max(
                  final.updatedAt,
                  lastWriteAt,
                  stored!.updatedAt,
                  this._state.lastAt.get(newId) ?? stored!.updatedAt,
                );
          const setRevision = stale === undefined ? 2 : stored!.revision + 1;
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
                dependsOn: remappedDeps,
                revision: setRevision,
                updatedAt: setAt,
              },
              at: setAt,
            },
            ticketOrigin,
          );
          tickets += 1;
        }
      }
      // Pass 3b — the wiring a previous run left unreported. Its sets
      // already landed, so there is nothing to re-emit: the source logs
      // still hold the original references, and reclassifying them here
      // names every edge the workspace lost — or pends it, when the driver
      // claimed the target session up front. #230 round 2: mirror-stale
      // replays are NOT re-examined here — their wiring was really
      // remapped (and counted) by the replay set in pass 3a above, and
      // reclassifying it here would double-count every edge. Runs ONLY for
      // handed-in
      // sessions whose history no marker finished (the v1 shape: tickets
      // flushed, history skipped). A first import has no prior tickets and
      // skips for free; a resume carries its recorded wiring forward
      // instead of recomputing it.
      for (const fold of folded) {
        if (historyDone.includes(fold.sessionId)) {
          continue;
        }
        for (const localId of sortedLocalIds(fold)) {
          const key = `${fold.sessionId}#${localId}`;
          if (!skipSet.has(key) || scan.mirrorStale.has(key)) {
            continue;
          }
          const final = fold.state.tickets.get(localId)!;
          // #230 round 2: the renumbering map, not the marker map — the
          // key may resolve through the origin scan (the v1 shape, no
          // marker entry) rather than through a previous run.
          const newId = newIdOf.get(key)!;
          for (const ref of final.dependsOn) {
            const outcome = this._classifyDependency(
              ref,
              fold,
              folded,
              newIdOf,
              lookupSlugIn,
              workspaceSlugOrder(fold.sessionId),
              workspaceKey,
              expected,
            );
            this._collectRefOutcome(
              outcome,
              { sessionId: fold.sessionId, localId, newId, title: final.title },
              ref,
              {
                remapped: [],
                drops: droppedDependencies,
                pendings,
                onMapped: () => {
                  edgesRewritten += 1;
                },
              },
            );
          }
        }
      }
      // Pass 4 — project history: plans, phases, refusals. Logs in the
      // order handed in, events oldest first per log; the last replay wins,
      // exactly the source logs' own last-write-wins. A resume replays only
      // sessions the marker does not already account for: re-running an old
      // session's history would duplicate it. Refusals and
      // plan/phase events carry no fold monotonicity, so source `at` values
      // replay verbatim. An over-cap plan is SKIPPED, never refused: one
      // long document must not fail the whole cutover.
      for (const fold of folded) {
        if (historyDone.includes(fold.sessionId)) {
          continue;
        }
        for (const plan of fold.planEvents) {
          const source = fold.state.projects.get(plan.sourceProjectId);
          const sourceKey = source !== undefined ? workspaceKeyFromPath(source.absPath) : null;
          if (sourceKey !== workspaceKey) {
            skippedPlans.push({
              sessionId: fold.sessionId,
              sourceProjectId: plan.sourceProjectId,
              absPath: source?.absPath ?? `<unknown project ${plan.sourceProjectId}>`,
              at: plan.at,
              reason:
                source === undefined
                  ? `source project id ${plan.sourceProjectId} names no project in its own log`
                  : `source project ${source.absPath} has no workspace equivalent for ${workspaceKey}`,
            });
            continue;
          }
          const lines = planContextLineCount(plan.plan);
          if (lines > PLAN_CONTEXT_LIMIT) {
            skippedPlans.push({
              sessionId: fold.sessionId,
              sourceProjectId: plan.sourceProjectId,
              absPath: source!.absPath,
              at: plan.at,
              reason: `plan context is ${lines} lines, over the ${PLAN_CONTEXT_LIMIT}-line cap`,
            });
            continue;
          }
          this._emit(
            {
              kind: "plan/change",
              version: 1,
              projectId,
              plan: deepClone(plan.plan),
              at: plan.at,
            },
            { sessionId: fold.sessionId, localSeq: plan.seq },
          );
          plans += 1;
        }
        for (const phase of fold.phaseEvents) {
          const source = fold.state.projects.get(phase.sourceProjectId);
          const sourceKey = source !== undefined ? workspaceKeyFromPath(source.absPath) : null;
          if (sourceKey !== workspaceKey) {
            skippedPhases.push({
              sessionId: fold.sessionId,
              sourceProjectId: phase.sourceProjectId,
              number: phase.number,
              title: phase.title,
              at: phase.at,
              reason:
                source === undefined
                  ? `source project id ${phase.sourceProjectId} names no project in its own log`
                  : `source project ${source.absPath} has no workspace equivalent for ${workspaceKey}`,
            });
            continue;
          }
          this._emit(
            {
              kind: "phase/set",
              version: 1,
              projectId,
              number: phase.number,
              title: phase.title,
              state: phase.state,
              at: phase.at,
            },
            { sessionId: fold.sessionId, localSeq: phase.seq },
          );
          phases += 1;
        }
        for (const refusal of fold.refusalEvents) {
          const newId = newIdOf.get(`${fold.sessionId}#${refusal.localTicketId}`);
          if (newId === undefined) {
            droppedRefusals.push({
              sessionId: fold.sessionId,
              localTicketId: refusal.localTicketId,
              at: refusal.at,
              reason: `ticket ${refusal.localTicketId} of session ${fold.sessionId} is in no imported log`,
            });
            continue;
          }
          this._emit(
            {
              kind: "aidos/refusal",
              version: 1,
              ticketId: newId,
              fromState: refusal.fromState,
              toState: refusal.toState,
              actor: refusal.actor,
              reason: refusal.reason,
              at: refusal.at,
            },
            { sessionId: fold.sessionId, localSeq: refusal.seq },
          );
          refusals += 1;
        }
      }
      // Pass 5 — repairs: carried pendings plus this run's, resolved against
      // the cumulative map now that this batch's tickets hold ids. A pending
      // whose target session is imported either rewires — a corrective set
      // built from the ticket's CURRENT snapshot, so intervening writes
      // survive — or becomes a recorded drop (the session holds no such
      // ticket). Anything still waiting stays pending for a later batch. One
      // corrupt edge can never refuse the batch: a refused repair is itself
      // recorded as a drop.
      // Sessions this call finished: the already-finished plus every
      // handed-in session (each got its tickets flushed or skipped and its
      // history replayed — or was already finished and skipped whole).
      const allSessionIds = [...historyDone];
      for (const fold of folded) {
        if (!allSessionIds.includes(fold.sessionId)) {
          allSessionIds.push(fold.sessionId);
        }
      }
      const importedNow = new Set(allSessionIds);
      const bareSlugOrder: string[] = folded.map((fold) => fold.sessionId);
      for (const key of carriedSlugs.keys()) {
        const sessionId = key.slice(0, key.lastIndexOf("#"));
        if (!bareSlugOrder.includes(sessionId)) {
          bareSlugOrder.push(sessionId);
        }
      }
      const stillPending: BackfillPendingEdge[] = [];
      for (const pending of [...carriedPendings, ...pendings]) {
        const resolution = this._resolvePendingEdge(
          pending,
          newIdOf,
          lookupSlugIn,
          bareSlugOrder,
          importedNow,
        );
        if (resolution.status === "waiting") {
          stillPending.push(pending);
          continue;
        }
        if (resolution.status === "missing") {
          droppedDependencies.push({
            fromSessionId: pending.fromSessionId,
            fromLocalId: pending.fromLocalId,
            fromNewId: pending.fromNewId,
            fromTitle: pending.fromTitle,
            ref: pending.ref,
            reason:
              pending.targetSessionId !== null && pending.targetLocalId !== null
                ? `target session ${pending.targetSessionId} holds no ticket ${pending.targetLocalId}`
                : pending.targetSessionId !== null
                  ? `target session ${pending.targetSessionId} holds no ticket with slug ${JSON.stringify(pending.slug)}`
                  : `reference ${JSON.stringify(pending.ref)} matches no ticket slug in the imported logs`,
          });
          continue;
        }
        const repair = this._repairDependencyEdge(pending, resolution.newId, workspaceKey);
        if ("repaired" in repair) {
          repaired.push(repair.repaired);
          edgesRewritten += 1;
        } else {
          droppedDependencies.push(repair.dropped);
        }
      }
      // Pass 6 — finalize: with the full session claim satisfied, anything
      // still waiting names a target that will never materialize, so it
      // becomes a recorded drop rather than a forever-pending maybe.
      if (expected !== null && [...expected].every((id) => importedNow.has(id))) {
        for (const pending of stillPending.splice(0)) {
          const targetGone =
            pending.targetSessionId !== null && !importedNow.has(pending.targetSessionId);
          droppedDependencies.push({
            fromSessionId: pending.fromSessionId,
            fromLocalId: pending.fromLocalId,
            fromNewId: pending.fromNewId,
            fromTitle: pending.fromTitle,
            ref: pending.ref,
            reason: targetGone
              ? `target session ${pending.targetSessionId} was never imported`
              : pending.targetSessionId !== null && pending.targetLocalId !== null
                ? `target session ${pending.targetSessionId} holds no ticket ${pending.targetLocalId}`
                : pending.targetSessionId !== null
                  ? `target session ${pending.targetSessionId} holds no ticket with slug ${JSON.stringify(pending.slug)}`
                  : `reference ${JSON.stringify(pending.ref)} matches no ticket slug in the imported logs`,
          });
        }
      }
      // What this call leaves still waiting: its newly-pended edges minus
      // the ones it finalized or repaired in the same bracket. A pending
      // created AND finalized here appears under droppedDependencies instead
      // and never on any waiting list — durable truth (the marker) is exact,
      // and the result narrates the call rather than echoing it.
      newStillPending = stillPending.filter((pending) => pendings.includes(pending));
      // The marker: the record that this backfill ran, committed in the
      // same bracket as the rows it vouches for. Version 3 names the
      // importer, EVERY imported session, the whole ticket map, and every
      // loss — a backfill that lost nothing records empty lists, so silence
      // and success are distinguishable. Everything here is CUMULATIVE
      // across runs (this run's work plus what earlier markers carried), so
      // the latest marker is always the complete account of the workspace
      // import — the shape #221's batched driver resumes from.
      // Source slugs for the ticket map: handed-in folds carry full
      // snapshots; carried entries refresh from them when present (a v2
      // marker's entries predate slug recording and stay slug-less until
      // their session is handed in again).
      const sourceSlugOf = new Map<string, string>(carriedSlugs);
      for (const fold of folded) {
        for (const localId of sortedLocalIds(fold)) {
          sourceSlugOf.set(
            `${fold.sessionId}#${localId}`,
            fold.state.tickets.get(localId)!.slug,
          );
        }
      }
      const ticketMap: BackfillTicketMapEntry[] = [...newIdOf.entries()]
        .map(([key, newId]) => {
          const hash = key.lastIndexOf("#");
          const slug = sourceSlugOf.get(key);
          return {
            sessionId: key.slice(0, hash),
            localId: Number(key.slice(hash + 1)),
            newId,
            ...(slug === undefined ? {} : { slug }),
          };
        })
        .sort(
          (a, b) => (a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : a.localId - b.localId),
        );
      const unionKinds = [...carriedSkippedKinds];
      for (const kind of skippedKinds) {
        if (!unionKinds.includes(kind)) {
          unionKinds.push(kind);
        }
      }
      const marker: BackfillCompletedEvent = {
        kind: "backfill/completed",
        version: 3,
        importerVersion: BACKFILL_IMPORTER_VERSION,
        sessionIds: allSessionIds,
        tickets: carriedCounts.tickets + tickets,
        evidence: carriedCounts.evidence + evidence,
        comments: carriedCounts.comments + comments,
        plans: carriedCounts.plans + plans,
        phases: carriedCounts.phases + phases,
        refusals: carriedCounts.refusals + refusals,
        edgesRewritten: carriedEdgesRewritten + edgesRewritten,
        droppedDependencies: [...carriedDrops, ...droppedDependencies],
        skippedPlans: [...carriedSkippedPlans, ...skippedPlans],
        skippedPhases: [...carriedSkippedPhases, ...skippedPhases],
        droppedRefusals: [...carriedDroppedRefusals, ...droppedRefusals],
        pendingEdges: stillPending,
        repairedEdges: [...carriedRepaired, ...repaired],
        slugRenames: [...carriedRenames, ...slugRenames],
        skippedKinds: unionKinds,
        ticketMap,
        at: this._nowFn(),
      };
      this._emit(marker);
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
    const lossless =
      droppedDependencies.length === 0 &&
      skippedPlans.length === 0 &&
      skippedPhases.length === 0 &&
      droppedRefusals.length === 0 &&
      newStillPending.length === 0 &&
      slugRenames.length === 0 &&
      scan.slugConflicts.length === 0;
    return {
      alreadyRan: false,
      sessionIds: folded.map((fold) => fold.sessionId),
      tickets,
      evidence,
      comments,
      plans,
      phases,
      refusals,
      edgesRewritten,
      droppedDependencies,
      skippedPlans,
      skippedPhases,
      droppedRefusals,
      pendingEdges: newStillPending,
      repairedEdges: repaired,
      slugRenames,
      slugMatchConflicts: scan.slugConflicts,
      skippedKinds: [...skippedKinds],
      importerVersion: BACKFILL_IMPORTER_VERSION,
      lossless,
    };
  }

  /**
   * #211: rebuild the (session, local) -> workspace ticket map a v1 import
   * left behind. Each imported create's origin columns are the source
   * ticket's last-touch seq, which the fold recomputes deterministically,
   * so matching them pairs every source ticket with the id v1 gave it.
   *
   * #230: plus the slug-keyed fallback for LIVE-mirrored rows. A mirrored
   * create stamps its origin session but no localSeq (unknown at mirror
   * time — see commitHostMirror), so the seq-keyed index above is blind to
   * exactly the rows the old host-side mirrored exclusion used to protect.
   * The fallback indexes stored creates of each handed-in session by slug
   * (the stable identity the migration path already keys on, unique per
   * project) and matches folded tickets the seq lookup missed. A slug hit
   * must ALSO agree on createdAt — birth data no write path rewrites, and
   * the mirror lands the same event object in both homes — so a ticket
   * that reused a renamed sibling's slug is imported fresh (suffixed)
   * instead of fused onto the sibling's id. Several stored rows may
   * share a slug (rename-then-reuse); the birth instant disambiguates,
   * and an ambiguity that birth cannot resolve (same slug AND same
   * instant, different ids) declines to match rather than guessing —
   * a suffixed fresh import is always safer than a fused identity.
   * The seq match stays primary: where both match and disagree, the seq
   * id wins and the disagreement is returned alongside the map, never
   * silently picked.
   *
   * Known residual, deliberately out of scope: a ticket renamed AFTER its
   * mirrored create carries its NEW slug at lookup while storage holds the
   * OLD one, so the fallback misses and the ticket imports fresh (suffixed)
   * next to its mirrored row. Narrower than the stranding it replaces, and
   * visible rather than silent — but not yet closed.
   */
  private _reconstructTicketMap(folded: readonly FoldedSessionLog[]): {
    map: Map<string, TicketId>;
    slugConflicts: SlugMatchConflict[];
    mirrorStale: Map<string, { newId: TicketId; slug: string }>;
  } {
    const createsByOrigin = new Map<string, TicketId>();
    const createsBySlug = new Map<string, { id: TicketId; createdAt: number; localSeq: number | null }[]>();
    for (const stored of this._storage.readAll()) {
      const event = stored.event;
      if (
        event.kind !== "ticket/change" ||
        event.operation !== "create" ||
        stored.sessionId === null
      ) {
        continue;
      }
      if (stored.localSeq !== null) {
        createsByOrigin.set(`${stored.sessionId}#${stored.localSeq}`, event.ticket.id);
      }
      const slugKey = `${stored.sessionId}#${event.ticket.slug}`;
      const bucket = createsBySlug.get(slugKey);
      const candidate = { id: event.ticket.id, createdAt: event.ticket.createdAt, localSeq: stored.localSeq };
      if (bucket === undefined) {
        createsBySlug.set(slugKey, [candidate]);
      } else {
        bucket.push(candidate);
      }
    }
    const map = new Map<string, TicketId>();
    const slugConflicts: SlugMatchConflict[] = [];
    const mirrorStale = new Map<string, { newId: TicketId; slug: string }>();
    for (const fold of folded) {
      for (const localId of sortedLocalIds(fold)) {
        const key = `${fold.sessionId}#${localId}`;
        const final = fold.state.tickets.get(localId)!;
        const originSeq = fold.seqOfTicket.get(localId) ?? null;
        const seqFound =
          originSeq === null
            ? undefined
            : createsByOrigin.get(`${fold.sessionId}#${originSeq}`);
        const candidates = createsBySlug.get(`${fold.sessionId}#${final.slug}`) ?? [];
        const agreeing = candidates.filter(
          (candidate) => candidate.createdAt === final.createdAt,
        );
        // Exactly one birth-matching row: a resolved identity. Zero, or
        // several that birth cannot tell apart, is no match — the ticket
        // imports fresh (suffixed on collision) instead of fused.
        const slugFound = agreeing.length === 1 ? agreeing[0] : undefined;
        if (seqFound !== undefined) {
          map.set(key, seqFound);
          if (slugFound !== undefined && slugFound.id !== seqFound) {
            slugConflicts.push({
              sessionId: fold.sessionId,
              localId,
              seqMatchedId: seqFound,
              slugMatchedId: slugFound.id,
            });
          }
          continue;
        }
        if (slugFound !== undefined) {
          map.set(key, slugFound.id);
          // #230 round 2: no seq hit, and the one birth-matching row is
          // seq-less — a live-mirrored CREATE whose history never landed.
          // The importer replays it under the matched id instead of
          // skipping it. A birth-matching row that DOES carry a seq is a
          // real prior import and keeps the skip behaviour.
          if (slugFound.localSeq === null) {
            mirrorStale.set(key, { newId: slugFound.id, slug: final.slug });
          }
        }
      }
    }
    return { map, slugConflicts, mirrorStale };
  }

  /**
   * One classified dependency reference — see the module-level
   * `DependencyOutcome` type. `mapped` carries the rewritten
   * `workspaceKey:newId` and is the ONLY outcome counted as
   * `edgesRewritten`. `pending` means the target session is claimed by the
   * driver's full set but not handed in yet — the edge waits on the marker,
   * it is not wired anywhere. `dropped` carries the human-readable reason.
   */

  /**
   * Classify one `dependsOn` reference from one source ticket. Host parity
   * (`resolveDependencyRef`): a missing scope means the own workspace,
   * `/^\d+$/` tails are ticket numbers, anything else a slug. Numeric tails
   * resolve through the renumbering map; slug tails through the source
   * slugs.
   *
   * Scope parsing is colon-safe: session ids are an unverified shape and
   * may themselves contain a colon, so a prefix that exactly names a KNOWN
   * session (own, handed-in, or driver-claimed — longest first) wins over
   * the first-colon split. Anything else keeps the host-style split, and an
   * unknown colon-session stays a named drop: the guard only ever ADDS
   * successful parses for verifiable sessions, it never reinterprets one.
   *
   * The rule that fixes F1/F2: the own session answers ONLY for the
   * workspace-key scope (and, by exact session match, for its own session
   * id). A session prefix naming no handed-in log consults the CARRIED map
   * next — a finished-but-unhanded session's tickets are already renumbered,
   * and on a resumed import that is the normal path, not a corner — and
   * NEVER falls back to the own log: that fallback wired edges onto
   * strangers and reported success. With a full session claim an
   * unresolvable prefix waits; otherwise it is dropped and named.
   */
  private _classifyDependency(
    ref: string,
    own: FoldedSessionLog,
    folded: readonly FoldedSessionLog[],
    newIdOf: Map<string, TicketId>,
    lookupSlugIn: (slug: string, sessionIds: readonly string[]) => TicketId | null,
    workspaceOrder: readonly string[],
    workspaceKey: string,
    expected: Set<string> | null,
  ): DependencyOutcome {
    const scope = this._splitRefScope(ref, own, folded, expected);
    const prefix = scope.prefix;
    const tail = scope.tail;
    if (tail === "") {
      return { kind: "dropped", reason: `reference ${JSON.stringify(ref)} names no ticket or slug` };
    }
    const handed = folded.some((fold) => fold.sessionId === prefix);
    if (/^\d+$/.test(tail)) {
      const localId = Number(tail);
      if (localId < 1) {
        return { kind: "dropped", reason: `reference ${JSON.stringify(ref)} names no ticket number` };
      }
      if (prefix === workspaceKey || !scope.hadColon) {
        const newId = newIdOf.get(`${own.sessionId}#${localId}`);
        return newId === undefined
          ? {
              kind: "dropped",
              reason: `target ${ref} is in no imported log (${own.sessionId} holds no ticket ${localId})`,
            }
          : { kind: "mapped", ref: `${workspaceKey}:${newId}` };
      }
      if (handed) {
        const newId = newIdOf.get(`${prefix}#${localId}`);
        return newId === undefined
          ? {
              kind: "dropped",
              reason: `target ${ref} is in no imported log (session ${prefix} holds no ticket ${localId})`,
            }
          : { kind: "mapped", ref: `${workspaceKey}:${newId}` };
      }
      // Unhanded session: the carried map may already hold the answer —
      // on a resumed import every previously-imported session is exactly
      // "finished but unhanded", so this lookup is the normal path there.
      const carried = newIdOf.get(`${prefix}#${localId}`);
      if (carried !== undefined) {
        return { kind: "mapped", ref: `${workspaceKey}:${carried}` };
      }
      if (expected !== null && expected.has(prefix)) {
        return { kind: "pending", targetSessionId: prefix, targetLocalId: localId, slug: null };
      }
      return {
        kind: "dropped",
        reason:
          prefix.startsWith("--") && prefix.endsWith("--")
            ? `target ${ref} names workspace ${prefix}, which is not this import's workspace (${workspaceKey})`
            : `target ${ref} names session ${prefix}, which was not handed to this import` +
              (expected !== null ? ` and is not among the expected sessions` : ``),
      };
    }
    // Slug tail: workspace scope (or bare) searches own session first, then
    // the other handed-in sessions in order, then the carried ones — the
    // import's equivalent of the host's workspace-wide scan. A session scope
    // searches exactly that session, handed (fold) or finished (carried).
    if (prefix === workspaceKey || !scope.hadColon) {
      const newId = lookupSlugIn(tail, workspaceOrder);
      if (newId !== null) {
        return { kind: "mapped", ref: `${workspaceKey}:${newId}` };
      }
      if (expected !== null) {
        return { kind: "pending", targetSessionId: null, targetLocalId: null, slug: tail };
      }
      return {
        kind: "dropped",
        reason: `reference ${JSON.stringify(ref)} matches no ticket slug in the imported logs`,
      };
    }
    const newId = lookupSlugIn(tail, [prefix]);
    if (newId !== null) {
      return { kind: "mapped", ref: `${workspaceKey}:${newId}` };
    }
    if (handed) {
      return {
        kind: "dropped",
        reason: `target ${ref} is in no imported log (session ${prefix} holds no ticket with slug ${JSON.stringify(tail)})`,
      };
    }
    if (expected !== null && expected.has(prefix)) {
      return { kind: "pending", targetSessionId: prefix, targetLocalId: null, slug: tail };
    }
    return {
      kind: "dropped",
      reason:
        `target ${ref} names session ${prefix}, which was not handed to this import` +
        (expected !== null ? ` and is not among the expected sessions` : ``),
    };
  }

  /**
   * Split one reference into scope and tail. A prefix exactly naming a KNOWN
   * session (own, handed-in, or driver-claimed — longest first, so a
   * colon-bearing session id wins over its own head) scopes to that
   * session; the workspace key keeps the host-style first-colon split. An
   * unknown prefix keeps the first-colon split and resolves as unhanded.
   * The guard only ever ADDS successful parses for verifiable sessions —
   * an unknown colon-session stays a named drop, documented below.
   */
  private _splitRefScope(
    ref: string,
    own: FoldedSessionLog,
    folded: readonly FoldedSessionLog[],
    expected: Set<string> | null,
  ): { prefix: string; tail: string; hadColon: boolean } {
    const colon = ref.indexOf(":");
    if (colon < 0) {
      return { prefix: "", tail: ref, hadColon: false };
    }
    const firstPrefix = ref.slice(0, colon);
    const known: string[] = [own.sessionId];
    for (const fold of folded) {
      if (!known.includes(fold.sessionId)) {
        known.push(fold.sessionId);
      }
    }
    if (expected !== null) {
      for (const id of expected) {
        if (!known.includes(id)) {
          known.push(id);
        }
      }
    }
    known.sort((a, b) => b.length - a.length);
    for (const sessionId of known) {
      if (ref === sessionId || ref.startsWith(`${sessionId}:`)) {
        return {
          prefix: sessionId,
          tail: ref.slice(sessionId.length + 1),
          hadColon: true,
        };
      }
    }
    return { prefix: firstPrefix, tail: ref.slice(colon + 1), hadColon: true };
  }

  /**
   * File one classified reference: wire it, pend it, or name its loss. Only
   * `mapped` advances the rewritten count — a misresolved edge must never
   * be counted as rewritten (F2).
   */
  private _collectRefOutcome(
    outcome: DependencyOutcome,
    from: { sessionId: string; localId: TicketId; newId: TicketId; title: string },
    ref: string,
    into: {
      remapped: string[];
      drops: DroppedDependencyEdge[];
      pendings: BackfillPendingEdge[];
      onMapped: () => void;
    },
  ): void {
    if (outcome.kind === "mapped") {
      into.remapped.push(outcome.ref);
      into.onMapped();
    } else if (outcome.kind === "pending") {
      into.pendings.push({
        fromSessionId: from.sessionId,
        fromLocalId: from.localId,
        fromNewId: from.newId,
        fromTitle: from.title,
        ref,
        targetSessionId: outcome.targetSessionId,
        targetLocalId: outcome.targetLocalId,
        slug: outcome.slug,
      });
    } else {
      into.drops.push({
        fromSessionId: from.sessionId,
        fromLocalId: from.localId,
        fromNewId: from.newId,
        fromTitle: from.title,
        ref,
        reason: outcome.reason,
      });
    }
  }

  /**
   * Resolve one pending edge against the cumulative import: numeric tails
   * through the renumbering map once the target session is imported, slug
   * tails through the cumulative slug index. `waiting` keeps it on the
   * marker; `missing` drops it with a name; `found` rewires it.
   */
  private _resolvePendingEdge(
    pending: BackfillPendingEdge,
    newIdOf: Map<string, TicketId>,
    lookupSlugIn: (slug: string, sessionIds: readonly string[]) => TicketId | null,
    bareSlugOrder: readonly string[],
    imported: Set<string>,
  ): { status: "waiting" } | { status: "missing" } | { status: "found"; newId: TicketId } {
    if (pending.targetSessionId !== null) {
      if (!imported.has(pending.targetSessionId)) {
        return { status: "waiting" };
      }
      if (pending.targetLocalId !== null) {
        const newId = newIdOf.get(`${pending.targetSessionId}#${pending.targetLocalId}`);
        return newId === undefined ? { status: "missing" } : { status: "found", newId };
      }
      const newId = lookupSlugIn(pending.slug!, [pending.targetSessionId]);
      return newId === null ? { status: "missing" } : { status: "found", newId };
    }
    const newId = lookupSlugIn(pending.slug!, bareSlugOrder);
    return newId === null ? { status: "waiting" } : { status: "found", newId };
  }

  /**
   * Rewire one resolved pending edge with a corrective `set` built from the
   * ticket's CURRENT snapshot — only `dependsOn` changes, so writes that
   * landed after the import survive. Revision continues, `at` never falls.
   * A refused repair (a cross-session cycle, a vanished ticket, a
   * self-edge) is recorded as a drop, never thrown: one corrupt edge must
   * not refuse the batch.
   */
  private _repairDependencyEdge(
    pending: BackfillPendingEdge,
    resolvedNewId: TicketId,
    workspaceKey: string,
  ): { repaired: BackfillRepairedEdge } | { dropped: DroppedDependencyEdge } {
    const drop = (reason: string): { dropped: DroppedDependencyEdge } => ({
      dropped: {
        fromSessionId: pending.fromSessionId,
        fromLocalId: pending.fromLocalId,
        fromNewId: pending.fromNewId,
        fromTitle: pending.fromTitle,
        ref: pending.ref,
        reason,
      },
    });
    const repaired = (resolvedTo: string): { repaired: BackfillRepairedEdge } => ({
      repaired: {
        fromSessionId: pending.fromSessionId,
        fromLocalId: pending.fromLocalId,
        fromNewId: pending.fromNewId,
        fromTitle: pending.fromTitle,
        ref: pending.ref,
        resolvedTo,
      },
    });
    if (resolvedNewId === pending.fromNewId) {
      return drop(`repair of ${JSON.stringify(pending.ref)} would create a self-edge`);
    }
    const current = this._state.tickets.get(pending.fromNewId);
    if (current === undefined) {
      return drop(`ticket ${pending.fromNewId} no longer exists, cannot restore ${JSON.stringify(pending.ref)}`);
    }
    const resolved = `${workspaceKey}:${resolvedNewId}`;
    if (current.dependsOn.includes(resolved)) {
      return repaired(resolved);
    }
    const at = this._atFor(pending.fromNewId, current.updatedAt);
    const updatedAt = Math.max(current.updatedAt, at);
    try {
      this._emit(
        {
          kind: "ticket/change",
          version: 1,
          operation: "set",
          ticket: {
            ...current,
            dependsOn: [...current.dependsOn, resolved],
            revision: current.revision + 1,
            updatedAt,
          },
          at: updatedAt,
        },
        { sessionId: pending.fromSessionId, localSeq: null },
      );
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      return drop(`repair of ${JSON.stringify(pending.ref)} refused: ${cause}`);
    }
    return repaired(resolved);
  }

  // ---- #222: merged-board migration load ----

  /**
   * #222: load a merged-board migration document into this store.
   *
   * The load half of the owner's JSON round-trip (exported by the host from
   * the MERGED board, optionally hand-edited, loaded here). Intended for a
   * FRESH store — every id is allocated from the store's own port counter
   * (#39/#218), so nothing collides — but safe on any store: a slug the
   * store already holds refuses the whole load, and the single transaction
   * bracket below makes a refusal all-or-nothing.
   *
   * Per ticket the shape mirrors #41's flush exactly: a `create` (open,
   * revision 1, `createdAt` == at — the invariants' only legal birth), the
   * ticket's evidence and comments oldest-first with their stamped `at`
   * values verbatim, then a `set` (revision 2, final state, remapped deps,
   * at the later of `updatedAt` and the last write — so no `at` ever falls).
   * States transfer as-is: the load never re-gates. Tags ride the snapshots
   * (the backfill precedent); refusals ride nothing — the owner chose to let
   * them die at cutover, so no refusals table is built here.
   *
   * Dependency references resolve through the export's `depTargets` table
   * (computed while the source folds were available). A null target — or a
   * remap that would point a ticket at itself — is CARRIED VERBATIM and
   * reported by name (#211's rule), never silently dropped. A remapped graph
   * that closes a cycle refuses the load naming the cycle: the validator
   * would throw mid-bracket anyway, and the pre-check names tickets instead
   * of event indexes. Orphaned evidence or comments (a hand-edit removed the
   * ticket but not its history) refuse the same way.
   */
  importBoardDocument(doc: BoardMigrationDocument): BoardMigrationLoadResult {
    if (doc.version !== 1) {
      throw new Error(`unsupported board migration document version ${JSON.stringify(doc.version)}`);
    }
    if (doc.workspaceKey !== workspaceKeyFromPath(doc.absPath)) {
      throw new Error(
        `board migration workspaceKey ${JSON.stringify(doc.workspaceKey)} does not match absPath ${JSON.stringify(doc.absPath)}`,
      );
    }
    const workspaceKey = doc.workspaceKey;
    const projectId = this.findProject(doc.absPath) ?? this.createProject(doc.absPath, doc.projectName);

    // Slug guard BEFORE any allocation or emit, so a refusal consumes
    // nothing and names the slug.
    const seenSlugs = new Set<string>();
    for (const ticket of doc.tickets) {
      if (seenSlugs.has(ticket.slug)) {
        throw new Error(`board migration lists slug ${JSON.stringify(ticket.slug)} twice`);
      }
      seenSlugs.add(ticket.slug);
      if (this._slugTaken(workspaceKey, ticket.slug, null)) {
        throw new Error(`board migration slug ${JSON.stringify(ticket.slug)} is already used in workspace ${workspaceKey}`);
      }
    }
    const knownSlugs = new Set(seenSlugs);
    for (const row of doc.evidence) {
      if (!knownSlugs.has(row.ticketSlug)) {
        throw new Error(
          `board migration evidence ${JSON.stringify(row.kind)} at ${row.at} names no ticket ${JSON.stringify(row.ticketSlug)}`,
        );
      }
    }
    for (const comment of doc.comments) {
      if (!knownSlugs.has(comment.ticketSlug)) {
        throw new Error(
          `board migration comment at ${comment.at} names no ticket ${JSON.stringify(comment.ticketSlug)}`,
        );
      }
    }

    // Fresh ids from the store's own counter, in document order.
    const newIds = new Map<string, TicketId>();
    for (const ticket of doc.tickets) {
      newIds.set(ticket.slug, this._nextTicketId());
    }

    // Resolve every dependency reference before emitting anything.
    const remapped = new Map<string, string[]>();
    const unresolved: UnresolvedMigrationDependency[] = [];
    let edgesRewritten = 0;
    for (const ticket of doc.tickets) {
      const out: string[] = [];
      for (const ref of ticket.dependsOn) {
        const targetSlug = ticket.depTargets?.[ref] ?? null;
        const targetId = targetSlug !== null ? newIds.get(targetSlug) : undefined;
        if (targetSlug !== null && targetId !== undefined && targetId !== newIds.get(ticket.slug)) {
          out.push(`${workspaceKey}:${targetId}`);
          edgesRewritten += 1;
        } else {
          // Null target, a target edited out of the document, or a remap
          // onto the ticket itself (a dep on its own dropped twin): carry
          // the original string and report it by name.
          out.push(ref);
          unresolved.push({ ticketSlug: ticket.slug, ticketTitle: ticket.title, ref });
        }
      }
      remapped.set(ticket.slug, out);
    }

    // Cycle pre-check over the remapped graph: the set validator would
    // refuse a cycle mid-bracket, and this names the tickets up front —
    // both the refs and the slugs, so the message identifies rows a human
    // can find in the document.
    {
      const liveIds = new Set(newIds.values());
      const slugOfId = new Map<TicketId, string>();
      for (const [slug, id] of newIds) slugOfId.set(id, slug);
      const adjacency = new Map<string, string[]>();
      for (const ticket of doc.tickets) {
        const self = `${workspaceKey}:${newIds.get(ticket.slug)}`;
        const edges: string[] = [];
        for (const ref of remapped.get(ticket.slug) ?? []) {
          const colon = ref.lastIndexOf(":");
          if (colon < 0) continue;
          if (ref.slice(0, colon) !== workspaceKey) continue;
          const target = Number(ref.slice(colon + 1));
          if (!Number.isInteger(target) || target < 1) continue;
          if (liveIds.has(target)) {
            edges.push(`${workspaceKey}:${target}`);
          }
        }
        adjacency.set(self, edges);
      }
      const color = new Map<string, number>();
      for (const node of adjacency.keys()) color.set(node, 0);
      const path: string[] = [];
      const visit = (node: string): void => {
        color.set(node, 1);
        path.push(node);
        for (const next of adjacency.get(node) ?? []) {
          if (color.get(next) === 2) continue;
          if (color.get(next) === 1) {
            const cycle = [...path.slice(path.indexOf(next)), next];
            const named = cycle.map((ref) => {
              const slug = slugOfId.get(Number(ref.slice(ref.lastIndexOf(":") + 1)));
              return slug === undefined ? ref : `${ref} (${slug})`;
            });
            throw new Error(`board migration dependency cycle: ${named.join(" -> ")}`);
          }
          visit(next);
        }
        path.pop();
        color.set(node, 2);
      };
      for (const node of adjacency.keys()) {
        if (color.get(node) === 0) visit(node);
      }
    }

    const storage = this._storage;
    const transactional =
      typeof storage.beginTransaction === "function" &&
      typeof storage.commitTransaction === "function";
    if (transactional) {
      storage.beginTransaction!();
    }
    const logLengthBefore = this._log.length;
    const result: BoardMigrationLoadResult = {
      projectId,
      tickets: 0,
      evidence: 0,
      comments: 0,
      plans: 0,
      phases: 0,
      edgesRewritten,
      unresolvedDependencies: unresolved,
      skippedPlans: [],
      newIds: {},
      adjustedUpdatedAt: [],
    };
    try {
      for (const ticket of doc.tickets) {
        const newId = newIds.get(ticket.slug)!;
        const tags = ticket.tags ?? [];
        this._emit({
          kind: "ticket/change",
          version: 1,
          operation: "create",
          ticket: {
            id: newId,
            projectId,
            title: ticket.title,
            description: ticket.description,
            body: ticket.body,
            criteria: ticket.criteria,
            phase: ticket.phase,
            order: ticket.order,
            state: "open",
            dependsOn: [],
            allowlist: [...ticket.allowlist],
            tags: [...tags],
            slug: ticket.slug,
            workspaceKey,
            revision: 1,
            createdAt: ticket.createdAt,
            updatedAt: ticket.createdAt,
          },
          at: ticket.createdAt,
        });
        const writes: Array<{ at: number; seq: number; kind: "evidence" | "comment"; index: number }> = [];
        doc.evidence.forEach((row, index) => {
          if (row.ticketSlug === ticket.slug) {
            writes.push({ at: row.at, seq: index, kind: "evidence", index });
          }
        });
        doc.comments.forEach((comment, index) => {
          if (comment.ticketSlug === ticket.slug) {
            writes.push({ at: comment.at, seq: index, kind: "comment", index });
          }
        });
        // Stable: equal `at` values keep document order, and no at falls.
        writes.sort((a, b) => a.at - b.at || a.seq - b.seq);
        let lastWriteAt = ticket.createdAt;
        for (const write of writes) {
          lastWriteAt = Math.max(lastWriteAt, write.at);
          if (write.kind === "evidence") {
            const row = doc.evidence[write.index]!;
            this._emit({
              kind: "evidence/attached",
              version: 1,
              ticketId: newId,
              row: {
                kind: row.kind,
                author: row.author,
                at: row.at,
                payload: deepClone(row.payload),
                ...(row.stamp === undefined ? {} : { stamp: deepClone(row.stamp) }),
              },
            });
            result.evidence += 1;
          } else {
            const comment = doc.comments[write.index]!;
            this._emit({
              kind: "comment/added",
              version: 1,
              ticketId: newId,
              text: comment.text,
              author: comment.author,
              at: comment.at,
            });
            result.comments += 1;
          }
        }
        const setAt = Math.max(ticket.updatedAt, lastWriteAt);
        if (setAt > ticket.updatedAt) {
          result.adjustedUpdatedAt.push({ slug: ticket.slug, from: ticket.updatedAt, to: setAt });
        }
        this._emit({
          kind: "ticket/change",
          version: 1,
          operation: "set",
          ticket: {
            id: newId,
            projectId,
            title: ticket.title,
            description: ticket.description,
            body: ticket.body,
            criteria: ticket.criteria,
            phase: ticket.phase,
            order: ticket.order,
            state: ticket.state,
            dependsOn: [...(remapped.get(ticket.slug) ?? [])],
            allowlist: [...ticket.allowlist],
            tags: [...tags],
            slug: ticket.slug,
            workspaceKey,
            revision: 2,
            createdAt: ticket.createdAt,
            updatedAt: setAt,
          },
          at: setAt,
        });
        result.tickets += 1;
        result.newIds[ticket.slug] = newId;
      }
      // The live plan, whole-value. An over-cap plan (only reachable by
      // hand-edit: the live one already fits) is skipped and REPORTED, never
      // refused — one long document must not fail the cutover (the backfill
      // rule, #211).
      {
        const lines = planContextLineCount(doc.plan);
        if (lines > PLAN_CONTEXT_LIMIT) {
          result.skippedPlans.push({
            at: doc.exportedAt,
            reason: `plan context is ${lines} lines, over the ${PLAN_CONTEXT_LIMIT}-line cap`,
          });
        } else {
          this._emit({
            kind: "plan/change",
            version: 1,
            projectId,
            plan: deepClone(doc.plan),
            at: doc.exportedAt,
          });
          result.plans += 1;
        }
      }
      for (const phase of doc.phases) {
        this._emit({
          kind: "phase/set",
          version: 1,
          projectId,
          number: phase.number,
          title: phase.title,
          state: phase.state,
          at: doc.exportedAt,
        });
        result.phases += 1;
      }
      if (transactional) {
        storage.commitTransaction!();
      }
    } catch (error) {
      // Nothing half-imported survives: give the log rows back, rebuild the
      // fold, roll the bracket back, and refuse with the cause (the backfill
      // rule, #41).
      this._log.length = logLengthBefore;
      this.replay();
      if (transactional) {
        storage.rollbackTransaction?.();
      }
      throw new StoreWriteRefused(error);
    }
    return result;
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
