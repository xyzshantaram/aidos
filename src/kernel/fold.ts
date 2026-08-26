/**
 * The strict replay fold. Validates in seq order, stops at the first
 * corrupt record. SPEC.md section 8 is the contract.
 */

import type { AidosEvent } from "./events";
import { validateAidosEvent } from "./invariants";
import { normalizeTicketSnapshot } from "./slug";
import type {
  CommentRecord,
  EvidenceRow,
  PlanValue,
  ProjectId,
  TicketId,
  TicketSnapshot,
} from "./types";

/** The derived state the fold builds. */
export interface AidosState {
  projects: Map<ProjectId, { absPath: string; name: string }>;
  phases: Map<ProjectId, Map<number, { title: string; state: string }>>;
  tickets: Map<TicketId, TicketSnapshot>;
  evidence: Map<TicketId, EvidenceRow[]>;
  plans: Map<ProjectId, PlanValue>;
  comments: Map<TicketId, CommentRecord[]>;
  /** Per-ticket non-decreasing at. */
  lastAt: Map<TicketId, number>;
  lastRevision: Map<TicketId, number>;
  /** The next ticket number to allocate. Advanced on create, never recomputed. */
  nextTicketId: number;
}

/** A fresh, empty derived state. */
export function createInitialState(): AidosState {
  return {
    projects: new Map(),
    phases: new Map(),
    tickets: new Map(),
    evidence: new Map(),
    plans: new Map(),
    comments: new Map(),
    lastAt: new Map(),
    lastRevision: new Map(),
    nextTicketId: 1,
  };
}

/**
 * Validate one event against the current state, then apply it.
 * A violation throws InvariantError before any mutation.
 */
export function foldAidosEvents(state: AidosState, event: AidosEvent): AidosState {
  validateAidosEvent(state, event);
  switch (event.kind) {
    case "ticket/change": {
      const id = event.ticket.id;
      const ticket = normalizeTicketSnapshot(
        event.ticket as unknown as Record<string, unknown>,
        (projectId) => state.projects.get(projectId)?.absPath,
      ) as unknown as TicketSnapshot;
      // Last write wins per ticket id, in seq order.
      state.tickets.set(id, ticket);
      state.lastAt.set(id, event.at);
      state.lastRevision.set(id, ticket.revision);
      if (event.operation === "create") {
        state.nextTicketId = Math.max(state.nextTicketId, ticket.id + 1);
      }
      return state;
    }
    case "evidence/attached": {
      const rows = state.evidence.get(event.ticketId);
      if (rows) {
        rows.push(event.row);
      } else {
        state.evidence.set(event.ticketId, [event.row]);
      }
      state.lastAt.set(event.ticketId, event.row.at);
      return state;
    }
    case "plan/change": {
      // Whole-value replace.
      state.plans.set(event.projectId, event.plan);
      return state;
    }
    case "comment/added": {
      const record: CommentRecord = {
        ticketId: event.ticketId,
        text: event.text,
        author: event.author,
        at: event.at,
      };
      const comments = state.comments.get(event.ticketId);
      if (comments) {
        comments.push(record);
      } else {
        state.comments.set(event.ticketId, [record]);
      }
      // A comment is a write to the ticket. It must advance the ticket's
      // timeline so later writes cannot fall below it.
      state.lastAt.set(event.ticketId, event.at);
      return state;
    }
    case "aidos/refusal": {
      // Log-only: replay keeps it, the projection ignores it.
      return state;
    }
    case "project/created": {
      state.projects.set(event.projectId, {
        absPath: event.absPath,
        name: event.name,
      });
      return state;
    }
    case "project/moved": {
      // Whole-value: the event carries the name unchanged.
      state.projects.set(event.projectId, {
        absPath: event.absPath,
        name: event.name,
      });
      return state;
    }
    case "phase/set": {
      let perProject = state.phases.get(event.projectId);
      if (!perProject) {
        perProject = new Map();
        state.phases.set(event.projectId, perProject);
      }
      perProject.set(event.number, { title: event.title, state: event.state });
      return state;
    }
  }
}
