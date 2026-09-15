/**
 * The aidos event vocabulary. All events are whole-value and versioned.
 *
 * This file is part of the B0 contract (SPEC.md). The union and payload
 * types here are normative.
 */

import type {
  Actor,
  EvidenceRow,
  PlanValue,
  ProjectId,
  TicketId,
  TicketOperation,
  TicketSnapshot,
  TicketState,
} from "./types";

/** One whole-value ticket change. Last write wins per ticket id. */
export interface TicketChangeEvent {
  kind: "ticket/change";
  version: 1;
  operation: TicketOperation;
  ticket: TicketSnapshot;
  at: number;
}

/** One evidence row appended to a ticket. */
export interface EvidenceAttachedEvent {
  kind: "evidence/attached";
  version: 1;
  ticketId: TicketId;
  row: EvidenceRow;
}

/**
 * One evidence row removed from a ticket. The row is identified by its
 * stamped `at` within the ticket's row list (monotonic per ticket, so it
 * names the row to drop); `kind` rides along as a sanity check for the fold.
 */
/**
 * Link one existing evidence row to one criterion label. `at` + `rowKind`
 * name the row (same identity rule as evidence/detached); `criterion` is the
 * verbatim criterion line it addresses, stored on the row's payload.criteria
 * so grouping, coverage, and the #69 linker all read one channel.
 */
export interface EvidenceLinkedEvent {
  kind: "evidence/linked";
  version: 1;
  ticketId: TicketId;
  at: number;
  rowKind: string;
  criterion: string;
}

export interface EvidenceDetachedEvent {
  kind: "evidence/detached";
  version: 1;
  ticketId: TicketId;
  at: number;
  rowKind: string;
}

/** One whole-value plan replace. */
export interface PlanChangeEvent {
  kind: "plan/change";
  version: 1;
  projectId: number;
  plan: PlanValue;
  at: number;
}

/** One comment appended to a ticket. */
export interface CommentAddedEvent {
  kind: "comment/added";
  version: 1;
  ticketId: TicketId;
  text: string;
  author: Actor;
  at: number;
}

/** One refused move. Log-only: replay keeps it, the projection ignores it. */
export interface RefusalEvent {
  kind: "aidos/refusal";
  version: 1;
  ticketId: TicketId;
  fromState: TicketState | null;
  toState: TicketState | null;
  actor: Actor | null;
  reason: string;
  at: number;
}

/** One project creation. The store auto-increments project ids from 1. */
export interface ProjectCreatedEvent {
  kind: "project/created";
  version: 1;
  projectId: ProjectId;
  absPath: string;
  name: string;
  at: number;
}

/** One project move. Whole-value: the name rides along unchanged. */
export interface ProjectMovedEvent {
  kind: "project/moved";
  version: 1;
  projectId: ProjectId;
  absPath: string;
  name: string;
  at: number;
}

/** One whole-value phase record. The state is a label, never gated on. */
export interface PhaseSetEvent {
  kind: "phase/set";
  version: 1;
  projectId: ProjectId;
  number: number;
  title: string;
  state: string;
  at: number;
}

/**
 * #180: attach freeform tags to one ticket as a DELTA — the names to add,
 * never the whole list. The fold unions them into the snapshot's tags, so
 * two concurrent writers editing one ticket cannot clobber each other's
 * tags the way a whole-value snapshot replace would.
 */
export interface TagsAttachedEvent {
  kind: "tags/attached";
  version: 1;
  ticketId: TicketId;
  /** Deduped, non-empty tag names to add. */
  names: string[];
  at: number;
}

/**
 * #180: remove tags from one ticket as a DELTA. Human-only (the agent may
 * only attach); the fold differences them from the snapshot's tags.
 */
export interface TagsDetachedEvent {
  kind: "tags/detached";
  version: 1;
  ticketId: TicketId;
  /** Deduped, non-empty tag names to remove. */
  names: string[];
  at: number;
}

/**
 * #211: one dropped dependency edge, named so a human can restore it by
 * hand. Dropping stays CORRECT (a preserved `workspaceKey:99` would resolve
 * to a stranger's ticket once future creates reuse the number); the defect
 * was that the drop was invisible. `fromTitle` names the ticket that lost
 * the edge, `ref` the exact reference that was dropped.
 */
export interface DroppedDependencyEdge {
  fromSessionId: string;
  fromLocalId: TicketId;
  fromNewId: TicketId;
  fromTitle: string;
  ref: string;
  reason: string;
}

/** #211: one plan/change the import could not map, named with its reason. */
export interface SkippedPlanRecord {
  sessionId: string;
  sourceProjectId: ProjectId;
  absPath: string;
  at: number;
  reason: string;
}

/** #211: one phase/set the import could not map, named with its reason. */
export interface SkippedPhaseRecord {
  sessionId: string;
  sourceProjectId: ProjectId;
  number: number;
  title: string;
  at: number;
  reason: string;
}

/** #211: one refusal the import could not remap, named with its reason. */
export interface DroppedRefusalRecord {
  sessionId: string;
  localTicketId: TicketId;
  at: number;
  reason: string;
}

/**
 * #211: one imported ticket's identity map entry. The marker carries the
 * whole map so a later importer can complete the workspace — remap
 * refusals, recompute drops — without re-importing a single ticket.
 * `slug` is the SOURCE slug (pre-rename): it lets a later batch resolve a
 * slug-form reference against already-imported tickets without their folds.
 */
export interface BackfillTicketMapEntry {
  sessionId: string;
  localId: TicketId;
  newId: TicketId;
  /** The source slug. Absent on markers predating slug recording (v2). */
  slug?: string;
}

/**
 * #211 round 2: one dependency edge waiting on a session that has not been
 * handed to the import yet. Recorded instead of dropped when the driver
 * names the full session set up front (`expectedSessionIds`) and the target
 * session is among the not-yet-imported: a LATER batch carrying that
 * session rewires the edge with a corrective set and moves it to
 * `repairedEdges`. A pending edge is neither rewritten nor dropped — it is
 * the import saying "not yet", out loud, where round 1 said "done" (F2).
 */
export interface BackfillPendingEdge {
  fromSessionId: string;
  fromLocalId: TicketId;
  fromNewId: TicketId;
  fromTitle: string;
  /** The original reference, verbatim. */
  ref: string;
  /** The session whose arrival resolves this edge, or null for bare slugs. */
  targetSessionId: string | null;
  /** The ticket number waited on (numeric tails), or null for slug tails. */
  targetLocalId: TicketId | null;
  /** The slug waited on (slug tails), or null for numeric tails. */
  slug: string | null;
}

/**
 * #211 round 2: one pending edge a later batch rewired. The corrective set
 * is built from the ticket's CURRENT snapshot (only `dependsOn` changes),
 * so intervening writes are never clobbered.
 */
export interface BackfillRepairedEdge {
  fromSessionId: string;
  fromLocalId: TicketId;
  fromNewId: TicketId;
  fromTitle: string;
  /** The original reference, verbatim. */
  ref: string;
  /** The workspaceKey:newId it resolved to. */
  resolvedTo: string;
}

/**
 * #211 round 2: one slug the import renamed to keep workspace-unique
 * (`x` → `x-2`). The ticket is intact, but anyone referencing the old slug
 * must update — so renames are recorded, and a run with renames is not
 * reported as `lossless`.
 */
export interface BackfillSlugRename {
  sessionId: string;
  localId: TicketId;
  newId: TicketId;
  title: string;
  fromSlug: string;
  toSlug: string;
}

/**
 * #41: the one-time backfill's completion marker, version 1. Tickets,
 * evidence and comments only, counts alone — plan meta, phases, refusal
 * history and every dropped edge went unrecorded. Kept so an old log still
 * replays; a v2 importer that finds one COMPLETES the workspace.
 */
export interface BackfillCompletedEventV1 {
  kind: "backfill/completed";
  version: 1;
  /** The session ids the import flushed, in import order. */
  sessionIds: string[];
  tickets: number;
  evidence: number;
  comments: number;
  at: number;
}

/**
 * #211 round 1: the version-2 marker — importer version, per-run session
 * ids, counts, every loss by name, and the whole ticket map. Retained so a
 * log written between round 1 and round 2 still replays; no production
 * workspace ever completed under it (the cutover had not run), but a
 * scratch database might hold one, and replay must not call that corrupt.
 * A v2 marker resumes exactly like a v3 one, except its ticketMap entries
 * carry no source slug, so cross-batch SLUG references against its sessions
 * cannot resolve (numeric references can).
 */
export interface BackfillCompletedEventV2 {
  kind: "backfill/completed";
  version: 2;
  /** The importer generation that wrote this marker (backfill.ts). */
  importerVersion: 2;
  /** The session ids this run flushed, in import order. */
  sessionIds: string[];
  tickets: number;
  evidence: number;
  comments: number;
  /** Plan, phase and refusal events this run replayed. */
  plans: number;
  phases: number;
  refusals: number;
  /** Dependency references successfully rewritten through the map. */
  edgesRewritten: number;
  /** Every dropped edge, by name — never a bare count. */
  droppedDependencies: DroppedDependencyEdge[];
  /** Every unmapped plan/change, by name with its reason. */
  skippedPlans: SkippedPlanRecord[];
  /** Every unmapped phase/set, by name with its reason. */
  skippedPhases: SkippedPhaseRecord[];
  /** Every unmapped refusal, by name with its reason. */
  droppedRefusals: DroppedRefusalRecord[];
  /**
   * Event kinds seen in the source logs that got no direct replay. Today
   * that is the source-local project records (`project/created`,
   * `project/moved`): the import targets the single project it was handed,
   * so there is no workspace equivalent to replay them into. Collapsed
   * history — intermediate ticket revisions (create + final set only),
   * evidence/detached and evidence/linked (live rows carry the outcome),
   * tag deltas (the final snapshot carries the folded tags) — is captured
   * in final state, not lost, and is not listed here.
   */
  skippedKinds: string[];
  /** Every imported ticket's (session, local) -> workspace id mapping. */
  ticketMap: BackfillTicketMapEntry[];
  at: number;
}

/**
 * #211 round 2: the version-3 marker. Everything v2 records, plus the three
 * lists the batched cutover needs to be lossless across batch boundaries:
 * `pendingEdges` (edges waiting on sessions not yet handed in — neither
 * rewritten nor dropped), `repairedEdges` (pendings a later batch rewired),
 * and `slugRenames` (workspace-uniqueness renames). Session ids, ticket
 * map, counts and loss lists are CUMULATIVE across runs, so the latest
 * marker is always the complete account of the workspace import and the
 * resume base for a batched driver. A run with all seven attention lists
 * empty records `lossless` by report — and renames count: a rename loses
 * nothing but still needs a human glance.
 */
export interface BackfillCompletedEvent {
  kind: "backfill/completed";
  version: 3;
  /**
   * The importer generation that wrote this marker (backfill.ts). v3
   * markers written by the round-2 importer carry 3, by round 3 carry 4:
   * same shape, but round 3 resolves refs against finished-but-unhanded
   * sessions where round 2 dropped them — so the number tells a reader
   * which behavior produced the drops.
   */
  importerVersion: 3 | 4;
  /** Every imported session id, oldest run first. */
  sessionIds: string[];
  tickets: number;
  evidence: number;
  comments: number;
  /** Plan, phase and refusal events replayed, cumulative. */
  plans: number;
  phases: number;
  refusals: number;
  /** Dependency references successfully (re)wired, cumulative. */
  edgesRewritten: number;
  /** Every dropped edge, by name — never a bare count. */
  droppedDependencies: DroppedDependencyEdge[];
  /** Every unmapped plan/change, by name with its reason. */
  skippedPlans: SkippedPlanRecord[];
  /** Every unmapped phase/set, by name with its reason. */
  skippedPhases: SkippedPhaseRecord[];
  /** Every unmapped refusal, by name with its reason. */
  droppedRefusals: DroppedRefusalRecord[];
  /** Edges waiting on sessions not yet handed in. */
  pendingEdges: BackfillPendingEdge[];
  /** Pending edges a later batch rewired. */
  repairedEdges: BackfillRepairedEdge[];
  /** Slug-collision renames. */
  slugRenames: BackfillSlugRename[];
  /**
   * Event kinds seen in the source logs that got no direct replay — the
   * source-local project records (`project/created`, `project/moved`),
   * unioned across runs. See v2 for what is captured rather than skipped.
   */
  skippedKinds: string[];
  /** Every imported ticket's (session, local, source-slug) -> id mapping. */
  ticketMap: BackfillTicketMapEntry[];
  at: number;
}

/** Every marker generation the log can hold. */
export type AnyBackfillCompletedEvent =
  | BackfillCompletedEventV1
  | BackfillCompletedEventV2
  | BackfillCompletedEvent;

/** Every event the aidos log can hold. */
export type AidosEvent =
  | TicketChangeEvent
  | EvidenceAttachedEvent
  | EvidenceDetachedEvent
  | EvidenceLinkedEvent
  | TagsAttachedEvent
  | TagsDetachedEvent
  | PlanChangeEvent
  | CommentAddedEvent
  | RefusalEvent
  | ProjectCreatedEvent
  | ProjectMovedEvent
  | PhaseSetEvent
  | BackfillCompletedEventV1
  | BackfillCompletedEventV2
  | BackfillCompletedEvent;
