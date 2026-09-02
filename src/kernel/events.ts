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

/** Every event the aidos log can hold. */
export type AidosEvent =
  | TicketChangeEvent
  | EvidenceAttachedEvent
  | EvidenceDetachedEvent
  | EvidenceLinkedEvent
  | PlanChangeEvent
  | CommentAddedEvent
  | RefusalEvent
  | ProjectCreatedEvent
  | ProjectMovedEvent
  | PhaseSetEvent;
