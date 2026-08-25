/**
 * The projection units. Pure functions over a folded state. The dsh
 * sessionProjections registration (init/apply/view, stateVersion,
 * restore) is B1; these functions are the apply/view bodies.
 * SPEC.md section 11 is the contract.
 */

import type { AidosState } from "./fold";
import { STATE_ORDER } from "./types";
import type {
  AidosConfig,
  CommentRecord,
  EvidenceRow,
  PlanValue,
  ProjectId,
  TicketId,
  TicketRow,
  TicketSnapshot,
} from "./types";

/** One ticket view: the row plus the derived pair. */
export interface TicketView extends TicketRow {
  /** Confidence score. Advisory: it never unlocks anything. */
  confidenceScore: number;
  /** Forward gate only. Null for done and for a missing forward gate. */
  gateFraction: number | null;
  /** At of the last change. Carried so the board can sort by Time updated. */
  updatedAt: number;
  /** The workspace key of the ticket's own workspace. Carried for the board's per-workspace storage key. */
  workspaceKey: string;
}

/**
 * The confidence score of one evidence list: one weight per distinct
 * (kind, author) pair. A kind that the config does not hold contributes
 * nothing (the write boundary refuses it; replay may still see it).
 */
export function confidenceScoreOf(
  config: AidosConfig,
  evidence: readonly EvidenceRow[],
): number {
  const weights = new Map<string, number>();
  for (const kind of config.kinds) {
    weights.set(kind.id, kind.weight);
  }
  const counted = new Set<string>();
  let total = 0;
  for (const row of evidence) {
    const key = `${row.kind}\u0000${row.author}`;
    if (counted.has(key)) {
      continue;
    }
    counted.add(key);
    const weight = weights.get(row.kind);
    if (weight !== undefined) {
      total += weight;
    }
  }
  return total;
}

/**
 * The forward gate fraction of one ticket: state -> its successor in
 * STATE_ORDER only. The last state has no successor. No gate for the
 * forward pair: null. Empty required kinds: 1.0. Else present over
 * required.
 */
export function gateFractionOf(
  config: AidosConfig,
  snapshot: TicketSnapshot,
  evidence: readonly EvidenceRow[],
): number | null {
  const index = STATE_ORDER.indexOf(snapshot.state);
  if (index < 0 || index + 1 >= STATE_ORDER.length) {
    return null;
  }
  const successor = STATE_ORDER[index + 1];
  const gate = config.gates.find(
    (candidate) =>
      candidate.fromState === snapshot.state && candidate.toState === successor,
  );
  if (!gate) {
    return null;
  }
  if (gate.requiredKinds.length === 0) {
    return 1.0;
  }
  const attached = new Set<string>();
  for (const row of evidence) {
    attached.add(row.kind);
  }
  let present = 0;
  for (const kind of gate.requiredKinds) {
    if (attached.has(kind)) {
      present += 1;
    }
  }
  return present / gate.requiredKinds.length;
}

/** One ticket row built from a folded snapshot. One code path. */
function rowFromSnapshot(snapshot: TicketSnapshot): TicketRow {
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

/**
 * Ticket id to ticket view. The config is required: the score reads the
 * kind weights and the fraction reads the forward gate, and both live in
 * the config, never in the log.
 */
export function ticketsProjection(
  state: AidosState,
  config: AidosConfig,
): Map<TicketId, TicketView> {
  const out = new Map<TicketId, TicketView>();
  for (const [id, snapshot] of state.tickets) {
    const evidence = state.evidence.get(id) ?? [];
    out.set(id, {
      ...rowFromSnapshot(snapshot),
      confidenceScore: confidenceScoreOf(config, evidence),
      gateFraction: gateFractionOf(config, snapshot, evidence),
      updatedAt: snapshot.updatedAt,
      workspaceKey: snapshot.workspaceKey,
    });
  }
  return out;
}

/** Ticket id to evidence rows, in seq order. */
export function evidenceProjection(state: AidosState): Map<TicketId, EvidenceRow[]> {
  const out = new Map<TicketId, EvidenceRow[]>();
  for (const [id, rows] of state.evidence) {
    out.set(id, [...rows]);
  }
  return out;
}

/** Project id to whole-value plan. */
export function planProjection(state: AidosState): Map<ProjectId, PlanValue> {
  return new Map(state.plans);
}

/** Ticket id to comments, in seq order. */
export function commentsProjection(state: AidosState): Map<TicketId, CommentRecord[]> {
  const out = new Map<TicketId, CommentRecord[]>();
  for (const [id, comments] of state.comments) {
    out.set(id, [...comments]);
  }
  return out;
}
