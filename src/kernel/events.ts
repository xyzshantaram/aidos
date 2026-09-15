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
 */
export interface BackfillTicketMapEntry {
  sessionId: string;
  localId: TicketId;
  newId: TicketId;
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
 * #211: the one-time backfill's completion marker, version 2.
 *
 * Appended ONCE per import inside the same storage bracket as the rows it
 * vouches for. Its presence in the log IS the "the backfill ran" record,
 * exactly as in v1 — but where v1 recorded counts alone, v2 records WHAT
 * the importer ran (`importerVersion`), what it deliberately did not replay
 * (`skippedKinds`), and every single loss BY NAME (`droppedDependencies`,
 * `skippedPlans`, `skippedPhases`, `droppedRefusals`). A backfill that lost
 * nothing records empty lists, so silence and success are distinguishable.
 * The `ticketMap` lets a still-later importer finish the job without
 * importing anything twice.
 */
export interface BackfillCompletedEvent {
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

/** Either marker generation the log can hold. */
export type AnyBackfillCompletedEvent =
  | BackfillCompletedEventV1
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
  | BackfillCompletedEvent;
