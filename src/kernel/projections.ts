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
  /**
   * Forward-gate required kinds present. Null exactly when gateFraction
   * is null.
   */
  gatePresent: number | null;
  /**
   * Forward-gate required kinds total. Null exactly when gateFraction is
   * null.
   */
  gateTotal: number | null;
  /** At of the last change. Carried so the board can sort by Time updated. */
  updatedAt: number;
  /** The workspace key of the ticket's own workspace. Carried for the board's per-workspace storage key. */
  workspaceKey: string;
  /** The slug of the ticket. The full global id is `<workspaceKey>:<slug>`. */
  slug: string;
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
 * The forward gate progress of one ticket: state -> its successor in
 * STATE_ORDER only. The last state has no successor. No gate for the
 * forward pair: all three fields null. Empty required kinds: fraction
 * 1.0 with present 0 and total 0. Else present over required.
 */
export interface GateProgress {
  fraction: number | null;
  present: number | null;
  total: number | null;
}

/**
 * The forward gate progress of one ticket. The fraction is present over
 * required. The pair present and total is null exactly when the fraction
 * is null.
 */
export function gateProgressOf(
  config: AidosConfig,
  snapshot: TicketSnapshot,
  evidence: readonly EvidenceRow[],
): GateProgress {
  const index = STATE_ORDER.indexOf(snapshot.state);
  if (index < 0 || index + 1 >= STATE_ORDER.length) {
    return { fraction: null, present: null, total: null };
  }
  const successor = STATE_ORDER[index + 1];
  const gate = config.gates.find(
    (candidate) =>
      candidate.fromState === snapshot.state && candidate.toState === successor,
  );
  if (!gate) {
    return { fraction: null, present: null, total: null };
  }
  if (gate.requiredKinds.length === 0) {
    return { fraction: 1.0, present: 0, total: 0 };
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
  return {
    fraction: present / gate.requiredKinds.length,
    present,
    total: gate.requiredKinds.length,
  };
}

/** The forward gate fraction of one ticket. See gateProgressOf. */
export function gateFractionOf(
  config: AidosConfig,
  snapshot: TicketSnapshot,
  evidence: readonly EvidenceRow[],
): number | null {
  return gateProgressOf(config, snapshot, evidence).fraction;
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
    allowlist: [...snapshot.allowlist],
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
    const progress = gateProgressOf(config, snapshot, evidence);
    out.set(id, {
      ...rowFromSnapshot(snapshot),
      confidenceScore: confidenceScoreOf(config, evidence),
      gateFraction: progress.fraction,
      gatePresent: progress.present,
      gateTotal: progress.total,
      updatedAt: snapshot.updatedAt,
      workspaceKey: snapshot.workspaceKey,
      slug: snapshot.slug,
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

/** The sort keys shared by the board filter panel and the get_tickets tool. */
export type TicketSortKey = "confidence" | "gates" | "time" | "alpha";

/** One full filter and sort request, mirror of the board FilterPanel. */
export interface TicketFilter {
  /** Absent or empty means all states. */
  stateIds?: readonly string[];
  /** Absent or null means all projects. */
  projectIds?: readonly number[] | null;
  /** Substring match over title or id; empty matches everything. */
  search?: string;
  sortKey?: TicketSortKey;
  descending?: boolean;
}

function ticketHasCriteria(ticket: TicketRow): boolean {
  return ticket.criteria.trim().length > 0;
}

function compareTicketTitles(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al < bl) return -1;
  if (al > bl) return 1;
  return 0;
}

/**
 * Total order over two ticket rows (board FilterPanel semantics, ticket #49):
 * a ticket without criteria sorts after one with criteria regardless of
 * direction; primary key, tiebreak key, then id. Descending flips the primary
 * and the tiebreak but never the id break.
 */
export function compareTicketViews(
  a: TicketView,
  b: TicketView,
  key: TicketSortKey = "confidence",
  descending = true,
): number {
  const aHas = ticketHasCriteria(a);
  const bHas = ticketHasCriteria(b);
  if (aHas !== bHas) return aHas ? -1 : 1;

  let primary = 0;
  let tiebreak = 0;
  switch (key) {
    case "confidence":
      primary = a.confidenceScore - b.confidenceScore;
      tiebreak = (a.gateFraction ?? 0) - (b.gateFraction ?? 0);
      break;
    case "gates":
      primary = (a.gateFraction ?? 0) - (b.gateFraction ?? 0);
      tiebreak = a.confidenceScore - b.confidenceScore;
      break;
    case "time":
      primary = a.updatedAt - b.updatedAt;
      tiebreak = compareTicketTitles(a.title, b.title);
      break;
    case "alpha":
      primary = compareTicketTitles(a.title, b.title);
      tiebreak = a.updatedAt - b.updatedAt;
      break;
  }

  let cmp = primary;
  if (descending) cmp = -cmp;
  if (cmp === 0) {
    cmp = tiebreak;
    if (descending) cmp = -cmp;
  }
  if (cmp === 0) cmp = a.id - b.id;
  return cmp;
}

/** True when the search term matches the title or the id. */
function ticketMatchesSearch(ticket: TicketRow, query: string): boolean {
  if (query === "") return true;
  if (ticket.title.toLowerCase().includes(query.toLowerCase())) return true;
  return String(ticket.id).includes(query);
}

/** Filter by state, project, and search, then sort (FilterPanel parity). */
export function filterTicketViews(
  views: readonly TicketView[],
  filter: TicketFilter = {},
): TicketView[] {
  const stateSet = filter.stateIds ? new Set<string>(filter.stateIds) : null;
  const projectSet = filter.projectIds ? new Set<number>(filter.projectIds) : null;
  const search = filter.search ?? "";
  const out: TicketView[] = [];
  for (const ticket of views) {
    if (stateSet !== null && !stateSet.has(ticket.state)) continue;
    if (projectSet !== null && !projectSet.has(ticket.projectId)) continue;
    if (!ticketMatchesSearch(ticket, search)) continue;
    out.push(ticket);
  }
  out.sort((a, b) =>
    compareTicketViews(a, b, filter.sortKey ?? "confidence", filter.descending ?? true),
  );
  return out;
}
