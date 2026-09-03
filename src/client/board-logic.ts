/**
 * Ticket U2a: the ticket board-logic helpers.
 *
 * Pure functions over the kernel projection types. No React, no DOM, no dsh
 * imports. The one kernel data import is BUILTIN_KINDS, which kindLabel
 * reads. This module satisfies the contract in tests/u2a-board-logic.test.ts.
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

import { BUILTIN_KINDS } from "../kernel/constants";
import type { TicketState } from "../kernel/types";

/**
 * A row addressable on the merged workspace board. Own rows are plain ids;
 * FOREIGN rows (from another session, merged in by workspaceTickets) are
 * addressed `sourceSessionId:id`, because ids collide across sessions.
 */
export interface BoardKeyed {
  id: number | string;
  foreign?: boolean;
  sourceSessionId?: string;
}

/**
 * THE board key of a row — the single implementation.
 *
 * This lived as a local closure inside ticket-view.tsx, and #93's review
 * found the consequence: the work queue keyed its evidence lookups with a
 * bare `String(ticket.id)`, so a foreign ticket read the WRONG rows (empty,
 * or a same-numbered own ticket's), and an action on it wrote to the own
 * ticket with that number. Anything addressing a board row uses this.
 */
export function boardKeyOf(ticket: BoardKeyed): string {
  return ticket.foreign === true && ticket.sourceSessionId !== undefined
    ? ticket.sourceSessionId + ":" + ticket.id
    : String(ticket.id);
}

/** The ticket fields the board logic reads. TicketView satisfies this. */
interface TicketLike {
  id: number;
  /** The workspace key. The id badge color folds over it. */
  workspaceKey: string;
  /** The slug. The full global id is `<workspaceKey>:<slug>`. */
  slug: string;
  projectId: number;
  title: string;
  criteria: string;
  confidenceScore: number;
  gateFraction: number | null;
  updatedAt: number;
  state: string;
}


/** The evidence fields the board logic reads. EvidenceRow satisfies this. */
export interface EvidenceRowLike {
  kind: string;
  payload: Record<string, unknown>;
  author?: string;
  /** The row's stamped timestamp; the detach Remote names rows by it. */
  at?: number;
}

/** The state checklist order. Done is always last. */
export const STATE_CHECKLIST_ORDER: TicketState[] = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done",
];

/** The sort keys the board offers. */
export type BoardSortKey = "confidence" | "gates" | "time" | "alpha";
export type SortKey = BoardSortKey; // alias for compat; prefer BoardSortKey

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

/** The CSS suffix for one state badge. */
export function stateClass(state: string): string {
  switch (state) {
    case "open":
      return "open";
    case "in_progress":
      return "in-progress";
    case "awaiting_verification":
      return "awaiting-verification";
    case "done":
      return "done";
    default:
      return state;
  }
}

/** The full CSS class string for a state badge. */
export function badgeClass(state: string): string {
  return "aidos-chip aidos-chip-state-" + stateClass(state);
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
 * Format the gate for the summary table and the tile. No criteria reads
 * "N/A". A null present or total with criteria reads an em dash. A real
 * gate reads present over total.
 */
export function formatGateFraction(
  present: number | null,
  total: number | null,
  hasCriteriaValue: boolean,
): string {
  if (!hasCriteriaValue) return "N/A";
  if (present === null || total === null) return "\u2014";
  return present + "/" + total;
}

/**
 * Map the advisory score to a ring percent. The score runs 0..5 and the
 * percent is clamped to 0..100.
 */
export function ringPercent(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, score * 20));
}

/** One criterion line, trimmed to its text. */

/** Parse a criteria string into trimmed, non-empty lines. */
export function parseCriteria(criteria: string): string[] {
  return criteria
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * The per-criterion evidence-kind annotation (#69): a trailing HTML comment
 * on the criterion line, `text <!-- kinds: a, b -->`. It rides the markdown
 * verbatim (the plan renderer and parseCriteria both store lines whole), is
 * human-readable in the raw field, and strips cleanly for display.
 */
const KINDS_ANNOTATION = /\s*<!--\s*kinds:\s*([a-z0-9_:,\- ]+?)\s*-->\s*$/i;

/** The criterion text with any kind annotation stripped. */
export function stripKindsAnnotation(line: string): string {
  return line.replace(KINDS_ANNOTATION, "").trim();
}

/** The kinds named in the criterion's annotation, empty when it has none. */
export function kindsForCriterion(line: string): string[] {
  const match = KINDS_ANNOTATION.exec(line);
  if (match === null) return [];
  return match[1]
    .split(",")
    .map((kind) => kind.trim())
    .filter((kind) => kind !== "");
}

/** Render one criterion line with a kind annotation ("" kinds clears it). */
export function withKindsAnnotation(text: string, kinds: readonly string[]): string {
  const clean = stripKindsAnnotation(text);
  return kinds.length === 0 ? clean : `${clean} <!-- kinds: ${kinds.join(", ")} -->`;
}

/** The criteria-panel name for parseCriteria. */
export function criteriaLines(criteria: string): string[] {
  return parseCriteria(criteria);
}

/**
 * Match one criterion label against one evidence row. The row's payload.criteria
 * is trimmed and compared with strict equality to the criterion label. Rows
 * whose payload.criteria is absent fall into the ungrouped bucket.
 */

/**
 * Group evidence rows by criterion. Each criterion line gets its own slot,
 * even when no row addresses it (those stay matched=false / uncovered). Rows
 * whose payload.criteria is absent land in the ungrouped bucket. Returns
 * criteria in their original order, with the ungrouped bucket appended last.
 *
 * KEPT ON PURPOSE, with no caller since U16. The detail panel now shows
 * criteria and evidence as two separate lists, so nothing groups them today.
 * The logic stays because a later view that shows evidence under the criterion
 * it addresses wants it back, and `tests/u2b-board-logic.test.ts` still covers
 * it. Do not remove it as dead code without that decision.
 */
export interface EvidenceGroup {
  criterion: string;
  matched: boolean;
  rows: EvidenceRowLike[];
}

export function groupEvidenceByCriterion(
  criteria: string,
  evidence: readonly EvidenceRowLike[],
): EvidenceGroup[] {
  const lines = parseCriteria(criteria);
  const groups: EvidenceGroup[] = lines.map((line) => ({
    criterion: line,
    matched: false,
    rows: [],
  }));
  const byLabel = new Map<string, EvidenceGroup>();
  for (const group of groups) {
    byLabel.set(group.criterion, group);
  }
  const ungrouped: EvidenceRowLike[] = [];
  for (const row of evidence) {
    const raw = row.payload.criteria;
    if (typeof raw !== "string" || raw.trim() === "") {
      ungrouped.push(row);
    } else {
      const label = raw.trim();
      const group = byLabel.get(label);
      if (group) {
        group.rows.push(row);
        group.matched = true;
      } else {
        ungrouped.push(row);
      }
    }
  }
  if (ungrouped.length > 0) {
    groups.push({ criterion: "", matched: true, rows: ungrouped });
  }
  return groups;
}

/** The uncovered criteria: those with no evidence rows. */
export function uncoveredCriteria(
  criteria: string,
  evidence: readonly EvidenceRowLike[],
): string[] {
  const groups = groupEvidenceByCriterion(criteria, evidence);
  const out: string[] = [];
  for (const group of groups) {
    if (group.criterion === "" || group.matched) continue;
    // #69: a criterion with linked kinds is covered when ANY evidence row of
    // a linked kind exists — the text match above is not the only path.
    const linked = kindsForCriterion(group.criterion);
    // The annotation may carry the short name (user_verified) or the full id
    // (builtin:user_verified); accept either against the row's full kind.
    const matches = (kind: string): boolean =>
      linked.includes(kind) || linked.includes(kind.replace(/^builtin:/, ""));
    if (linked.length > 0 && evidence.some((row) => matches(row.kind))) continue;
    out.push(group.criterion);
  }
  return out;
}

/** True when there are more evidence rows than a single screenful. */
export function evidenceIsMany(
  evidence: readonly EvidenceRowLike[],
  threshold = 6,
): boolean {
  return evidence.length > threshold;
}

/**
 * Deterministic color for a kind name, picked from a fixed palette. The
 * hash folds over the kind characters and the index is stable for the same
 * name across renders.
 */
const KIND_COLORS = [
  "var(--border)",
  "var(--border-subtle)",
  "var(--text-secondary)",
  "var(--text-muted)",
  "var(--surface-active)",
  "var(--surface-hover)",
];

export function kindColor(kind: string): string {
  let hash = 0;
  for (let i = 0; i < kind.length; i++) {
    hash = (hash * 31 + kind.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % KIND_COLORS.length;
  return KIND_COLORS[index];
}

/**
 * The display label of one evidence kind. A builtin kind maps to its
 * label from BUILTIN_KINDS. An unknown kind falls back to the raw id.
 */
export function kindLabel(kind: string): string {
  for (const def of BUILTIN_KINDS) {
    if (def.id === kind) return def.label;
  }
  return kind;
}

/**
 * The description of one evidence kind from BUILTIN_KINDS. An unknown kind
 * returns an empty string.
 */
export function kindDescription(kind: string): string {
  for (const def of BUILTIN_KINDS) {
    if (def.id === kind) return def.description;
  }
  return "";
}

/**
 * The chip keyword of one evidence kind. A chip has room for one word, so
 * each builtin kind gets a short token. An unregistered kind falls back to
 * its label in upper case, and an unknown id falls back to the part after
 * the namespace colon.
 */
const KIND_KEYWORDS: Record<string, string> = {
  "builtin:imported_state": "IMPORTED",
  "builtin:user_signoff": "SIGNED OFF",
  "builtin:user_verified": "VERIFIED",
  "builtin:eval_criteria": "CRITERIA",
  "builtin:file_allowlist": "ALLOWLIST",
  "builtin:agent_report": "REPORT",
  "builtin:automated_check": "CHECK",
  "builtin:test_run": "TESTS",
  "builtin:review_pass": "REVIEWED",
  "builtin:review_note": "NOTE",
};

export function kindKeyword(kind: string): string {
  const known = KIND_KEYWORDS[kind];
  if (known !== undefined) return known;
  const label = kindLabel(kind);
  if (label !== kind) return label.toUpperCase();
  const tail = kind.includes(":") ? kind.slice(kind.indexOf(":") + 1) : kind;
  return tail.replace(/[_-]+/g, " ").toUpperCase();
}
/** One kind-count tag for the tile: the kind name and the row count. */
export interface KindCount {
  kind: string;
  count: number;
  color: string;
}

/**
 * Count evidence rows by kind, sorted by descending count then kind name.
 * Each tag carries a deterministic color from the kind name.
 */
export function evidenceKindCounts(
  evidence: readonly EvidenceRowLike[],
): KindCount[] {
  const counts = new Map<string, number>();
  for (const row of evidence) {
    counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
  }
  const out: KindCount[] = [];
  for (const [kind, count] of counts) {
    out.push({ kind, count, color: kindColor(kind) });
  }
  out.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.kind < b.kind) return -1;
    if (a.kind > b.kind) return 1;
    return 0;
  });
  return out;
}

/**
 * The display form of one stored dependency reference. A reference is
 * `<workspaceKey>:<ticketId>`; the board renders it as `aidos#<ticketId>`
 * (the workspace key is stripped, no colon after `aidos`). A reference that
 * is not in that shape passes through unchanged.
 */
export function displayDep(ref: string): string {
  return ref.replace(/^--.*--:/, "aidos#");
}

/**
 * The full ticket id: the workspace key, a colon, and the slug. The
 * display form is displayDep of this string. The badge color hashes this
 * string, so two workspaces whose keys share the last path segment get
 * different colors (C5).
 */
export function fullTicketId(ticket: {
  workspaceKey: string;
  slug: string;
}): string {
  return ticket.workspaceKey + ":" + ticket.slug;
}

/**
 * The short chip label of one ticket: `aidos#<id>`. The chip shows the
 * number because a slug is too long for a chip. The title attribute keeps
 * the full id from fullTicketId.
 */
export function ticketChipLabel(ticket: {
  id: number;
  workspaceKey: string;
}): string {
  return displayDep(ticket.workspaceKey + ":" + ticket.id);
}

/** The id badge hues. Each entry is a mid-saturation background for white text. */
const BADGE_HUES = [
  "var(--badge-hue-1)",
  "var(--badge-hue-2)",
  "var(--badge-hue-3)",
  "var(--badge-hue-4)",
  "var(--badge-hue-5)",
  "var(--badge-hue-6)",
  "var(--badge-hue-7)",
  "var(--badge-hue-8)",
];

/**
 * Deterministic color for the id badge. The hash folds over the full id
 * string and the index is stable for the same id across renders. The
 * palette holds mid-saturation hues that keep white text readable.
 */
export function idColor(fullId: string): string {
  let hash = 0;
  for (let i = 0; i < fullId.length; i++) {
    hash = (hash * 31 + fullId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % BADGE_HUES.length;
  return BADGE_HUES[index];
}

