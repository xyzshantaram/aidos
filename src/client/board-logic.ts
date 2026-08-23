/**
 * Ticket U2a: the ticket board-logic helpers.
 *
 * Pure functions over the kernel projection types. No React, no DOM, no dsh
 * imports. This module satisfies the contract in tests/u2a-board-logic.test.ts.
 * compareTickets is total and deterministic. A ticket without criteria always
 * sorts after a ticket with criteria, for every key and every direction.
 * filterTickets keeps tickets by project, state, and search, then sorts the
 * survivors. autocompleteTickets returns at most limit matches, sorted by id
 * ascending.
 *
 * The ticket input type is structural, not TicketView: the test helper builds
 * its tickets from a spread literal, which TypeScript widens the state field
 * of. Every function stays generic over that shape and returns the input
 * element type, so a TicketView input yields TicketView output.
 */

import type { TicketState } from "../kernel/types";

/** The ticket fields the board logic reads. TicketView satisfies this. */
interface TicketLike {
  id: number;
  projectId: number;
  title: string;
  criteria: string;
  confidenceScore: number;
  gateFraction: number | null;
  updatedAt: number;
  state: string;
}

/** The state checklist order. Done is always last. */
export const STATE_CHECKLIST_ORDER: TicketState[] = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done",
];

/** The sort keys the board offers. */
export type SortKey = "confidence" | "gates" | "time" | "alpha";

/** One full filter and sort request. */
export interface FilterState {
  projectIds: number[] | null;
  stateIds: TicketState[];
  sortKey: SortKey;
  descending: boolean;
  search: string;
}

/** The display label of one ticket state. */
export function stateLabel(state: string): string {
  switch (state) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "awaiting_verification":
      return "Awaiting verification";
    case "done":
      return "Done";
    default:
      return state;
  }
}
/** True when the ticket carries a non-empty criteria string. */
export function hasCriteria<T extends TicketLike>(ticket: T): boolean {
  return ticket.criteria.trim().length > 0;
}

/** Compare two titles case-insensitively. Total and deterministic. */
function compareTitles(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al < bl) return -1;
  if (al > bl) return 1;
  return 0;
}

/**
 * Total order over two tickets. A ticket without criteria sorts after a
 * ticket with criteria regardless of direction. Within one criteria class the
 * primary key, then the tiebreak key, then the id break the tie. The
 * descending flag flips the primary and the tiebreak but never the id break.
 */
export function compareTickets<T extends TicketLike>(
  a: T,
  b: T,
  key: SortKey,
  descending: boolean,
): number {
  const aHas = hasCriteria(a);
  const bHas = hasCriteria(b);
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
      tiebreak = compareTitles(a.title, b.title);
      break;
    case "alpha":
      primary = compareTitles(a.title, b.title);
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

/** True when the search term matches the ticket title or id. */
function matchesSearch<T extends TicketLike>(ticket: T, query: string): boolean {
  if (query === "") return true;
  if (ticket.title.toLowerCase().includes(query.toLowerCase())) return true;
  return String(ticket.id).includes(query);
}

/** Filter by project, state, and search, then sort the survivors. */
export function filterTickets<T extends TicketLike>(
  tickets: readonly T[],
  filter: FilterState,
): T[] {
  const stateSet = new Set<string>(filter.stateIds);
  const projectSet = filter.projectIds === null ? null : new Set(filter.projectIds);
  const out: T[] = [];
  for (const ticket of tickets) {
    if (!stateSet.has(ticket.state)) continue;
    if (projectSet !== null && !projectSet.has(ticket.projectId)) continue;
    if (!matchesSearch(ticket, filter.search)) continue;
    out.push(ticket);
  }
  out.sort((a, b) => compareTickets(a, b, filter.sortKey, filter.descending));
  return out;
}

/**
 * Narrow by title or id, sort by id ascending, and cap at limit.
 * The default limit is 8.
 */
export function autocompleteTickets<T extends TicketLike>(
  tickets: readonly T[],
  query: string,
  limit = 8,
): T[] {
  const out: T[] = [];
  for (const ticket of tickets) {
    if (!matchesSearch(ticket, query)) continue;
    out.push(ticket);
  }
  out.sort((a, b) => a.id - b.id);
  return out.slice(0, limit);
}

/** Count tickets that are not done. */
export function openCount<T extends TicketLike>(tickets: readonly T[]): number {
  let count = 0;
  for (const ticket of tickets) {
    if (ticket.state !== "done") count += 1;
  }
  return count;
}

/**
 * Format the gate fraction for the tile. No criteria reads "N/A". A null
 * fraction with criteria reads an em dash. A real fraction reads a rounded
 * percent.
 */
export function formatGateFraction(
  fraction: number | null,
  hasCriteriaValue: boolean,
): string {
  if (!hasCriteriaValue) return "N/A";
  if (fraction === null) return "\u2014";
  return Math.round(fraction * 100) + "%";
}

/**
 * Map the advisory score to a ring percent. The score runs 0..5 and the
 * percent is clamped to 0..100.
 */
export function ringPercent(score: number): number {
  return Math.max(0, Math.min(100, score * 20));
}
