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

import { BUILTIN_KINDS, DEFAULT_GATES } from "../kernel/constants";
import { STATE_ORDER } from "../kernel/types";
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
 * A BOARD KEY: the address of a row on the merged workspace board.
 *
 * BRANDED DELIBERATELY (#93). Four independent reviews found TEN instances of
 * one defect: a value from one address space used where another was expected.
 * There are three spaces, and every one of them was `string | number`, so
 * TypeScript accepted every confusion silently:
 *
 *   - a TICKET ID (`12`) is unique only within one session;
 *   - a BOARD KEY (`"12"` or `"sess-abc:12"`) is unique across the merged board;
 *   - a DEPENDENCY REF (`"workspaceKey:12"`) is unique across NOTHING, because
 *     every session in a workspace shares the workspace key.
 *
 * Care does not scale against a type system that says string is string. The
 * brand turns that whole class from silent runtime corruption -- reading the
 * wrong ticket's evidence, WRITING to the wrong ticket -- into a compile
 * error at the point of confusion.
 */
declare const boardKeyBrand: unique symbol;
export type BoardKey = string & { readonly [boardKeyBrand]: true };

/**
 * Assert that a string already IS a board key, for values arriving from
 * outside the type system: persisted view state, a deep link, a prop crossing
 * a boundary this refactor has not reached yet.
 *
 * This is the ESCAPE HATCH and it is named loudly on purpose. Every call is a
 * place the brand is not actually being enforced. Prefer boardKeyOf.
 */
export function asBoardKey(value: string): BoardKey {
  return value as BoardKey;
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
export function boardKeyOf(ticket: BoardKeyed): BoardKey {
  return (
    ticket.foreign === true && ticket.sourceSessionId !== undefined
      ? ticket.sourceSessionId + ":" + ticket.id
      : String(ticket.id)
  ) as BoardKey;
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
 *
 * #21: this palette used to contain NO COLOURS -- six greys taken from the
 * border, text and surface tokens. Every evidence chip was therefore a grey
 * chip, which is a direct violation of this ticket's oldest criterion ("no
 * badge or pill anywhere renders grey text on a grey background") and the
 * reason the user reported the allowlist and dependency chips as unreadable.
 * It only became obvious once the chips moved from saturated fills to tinted
 * text, because a grey FILL with white text is legible while grey text on a
 * grey tint is not. Measured: --surface-hover gave a contrast ratio of 2.84,
 * far below the 4.5 AA floor.
 *
 * The id badges' hue palette is reused deliberately: one set of hues for the
 * whole board means a colour means "a hue", not "a hue from whichever list
 * this component happened to import".
 */
const KIND_COLORS = [
  "var(--badge-hue-1)",
  "var(--badge-hue-2)",
  "var(--badge-hue-3)",
  "var(--badge-hue-4)",
  "var(--badge-hue-5)",
  "var(--badge-hue-6)",
  "var(--badge-hue-7)",
  "var(--badge-hue-8)",
];

export function kindColor(kind: string): string {
  /*
   * #96: a FAILED review is a stronger signal than routine hash-distinctness
   * gives it -- it needs to read as a warning at a glance, the same weight
   * the "Needs approval" chip carries, not whatever the hash happens to land
   * on next to a plain review_note.
   */
  if (kind === "builtin:review_fail") return "var(--verdict-fail)";
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
  "builtin:review_pass": "ACCEPTED",
  "builtin:review_fail": "FAILED",
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

/** The gate shape the implication rule reads. Structural, not the full GateDef. */
export interface GateLike {
  fromState: TicketState;
  toState: TicketState;
  requiredKinds: readonly string[];
}

/**
 * The evidence kinds a ticket's STATE already proves it has.
 *
 * #21: an evidence chip should contribute information. A ticket sitting in
 * `in_progress` could only get there through the gate that demands
 * `user_signoff`, so a SIGNED OFF chip beside an "In progress" state chip is
 * pure restatement -- it spends tile space to tell the reader something the
 * chip next to it already said.
 *
 * Derived from the gate table and STATE_ORDER rather than hardcoded, so
 * changing a gate's requiredKinds changes what counts as implied. A kind is
 * implied when the ticket has reached (or passed) the state its gate leads
 * to.
 *
 * KNOWN LIMITATION (#21 review F5), stated rather than papered over: the
 * default table is DEFAULT_GATES, the CONSTANT, while the running service
 * resolves `config.gates`, which a workspace may customise. In such a
 * workspace a tile could suppress a chip the live gates do not actually
 * imply. This is not specific to this function -- the whole client imports
 * BUILTIN_KINDS and DEFAULT_GATES directly and has no channel for the live
 * config at all -- so it is filed as its own ticket rather than bodged here.
 * The blast radius is bounded: suppression only ever HIDES a chip from a
 * tile, never invents one, and the detail panel renders the full evidence
 * list independently.
 */
export function stateImpliedKinds(
  state: TicketState,
  /*
   * The gate table, injectable ONLY so the rules below are testable. The
   * send-back guard is defensive -- every shipped gate that runs backward
   * has an empty requiredKinds today, so reading DEFAULT_GATES directly
   * made the guard impossible to exercise and it survived a mutation test.
   * A rule with no reachable test is a rule nobody can trust.
   */
  gates: readonly GateLike[] = DEFAULT_GATES,
): Set<string> {
  /*
   * #21 review F6: there was an `if (reached < 0) return implied;` guard
   * here. A mutation removing it survived the whole suite -- because it is
   * DEAD: with reached === -1, `reached >= target` is false for every valid
   * gate, so the loop already yields an empty set. Deleted rather than given
   * a test, because a test for an unreachable branch pins nothing. This
   * commit's own message argues that a rule with no reachable test is a rule
   * nobody can trust; shipping one anyway would have been the same error.
   */
  const reached = STATE_ORDER.indexOf(state);
  const implied = new Set<string>();
  for (const gate of gates) {
    const target = STATE_ORDER.indexOf(gate.toState);
    // Only FORWARD gates imply anything: the send-back edge
    // (awaiting_verification -> in_progress) proves nothing about evidence.
    if (target <= STATE_ORDER.indexOf(gate.fromState)) continue;
    if (target >= 0 && reached >= target) {
      for (const kind of gate.requiredKinds) implied.add(kind);
    }
  }
  return implied;
}

/**
 * The kind counts worth showing on a TILE: the full set minus the chips the
 * state already implies.
 *
 * A kind with MORE THAN ONE row is never suppressed, however implied it is:
 * two `review_pass` rows mean the work took two review rounds, and that is
 * one of the most informative things a tile can say (#96). The rule is
 * "drop the restatement", not "drop the history".
 *
 * The DETAIL panel deliberately does NOT use this -- there, completeness is
 * the point and the full evidence record must stay visible.
 */
export function tileKindCounts(
  state: TicketState,
  counts: readonly KindCount[],
  gates: readonly GateLike[] = DEFAULT_GATES,
): KindCount[] {
  const implied = stateImpliedKinds(state, gates);
  return counts.filter((count) => count.count > 1 || !implied.has(count.kind));
}

/**
 * Count evidence rows by kind, sorted by descending count then kind name.
 * Each tag carries a deterministic color from the kind name.
 */
export function evidenceKindCounts(
  evidence: readonly EvidenceRowLike[],
): KindCount[] {
  const counts = new Map<string, number>();
  /*
   * #21: chips sort CHRONOLOGICALLY, by when each kind first appeared.
   *
   * The old order was "most rows first, then alphabetically by kind id",
   * which is an ordering nobody reads for. Chronological tells the ticket's
   * story in the order it actually happened -- signed off, then checked,
   * then accepted, then verified -- so the chip row is a timeline rather
   * than a bag. It is also honest: it shows the order events REALLY
   * occurred rather than an idealised lifecycle, so a ticket that was sent
   * back and re-reviewed reads differently from one that went straight
   * through, which is exactly the difference worth seeing.
   *
   * FIRST occurrence, not last: a kind's place is where it entered the
   * story. Two review rounds keep review_pass at its first position and say
   * "2" on the count segment, rather than jumping to the end.
   */
  const firstAt = new Map<string, number>();
  let sequence = 0;
  const arrival = new Map<string, number>();
  for (const row of evidence) {
    counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
    if (!arrival.has(row.kind)) arrival.set(row.kind, sequence++);
    if (typeof row.at === "number") {
      const seen = firstAt.get(row.kind);
      if (seen === undefined || row.at < seen) firstAt.set(row.kind, row.at);
    }
  }
  const out: KindCount[] = [];
  for (const [kind, count] of counts) {
    out.push({ kind, count, color: kindColor(kind) });
  }
  out.sort((a, b) => {
    /*
     * IMPORTED always leads (#21, user's ask). It is the ticket's ORIGIN --
     * the state a plan document claimed before anything happened here -- so
     * it is the first thing in the story even when its timestamp says
     * otherwise (an import stamps every row at the same instant, and a
     * re-import can stamp it later than real work). Reading order is
     * top-to-bottom, left-to-right: gate, origin, then what happened.
     */
    const aFirst = a.kind === "builtin:imported_state";
    const bFirst = b.kind === "builtin:imported_state";
    if (aFirst !== bFirst) return aFirst ? -1 : 1;
    const at = firstAt.get(a.kind);
    const bt = firstAt.get(b.kind);
    // A row with no timestamp cannot be placed in time. Rather than sorting
    // it to an arbitrary end, fall back to ARRIVAL ORDER in the input, which
    // is the closest thing to chronology available and is stable.
    if (at !== undefined && bt !== undefined && at !== bt) return at - bt;
    const aa = arrival.get(a.kind) ?? 0;
    const ba = arrival.get(b.kind) ?? 0;
    if (aa !== ba) return aa - ba;
    if (a.kind < b.kind) return -1;
    if (a.kind > b.kind) return 1;
    return 0;
  });
  return out;
}

/**
 * The last meaningful segment of a workspace key, for display.
 *
 * `--home-sid-repos-aidos--` -> `aidos`. Two workspaces whose keys end in
 * the same segment collide HERE, and the full reference in the chip's
 * `title`/`aria-label` is what tells them apart -- the label is a hint,
 * never the identity.
 *
 * #21 review F7 corrected an overclaim here: this used to also credit "the
 * id badge's colour hash (C5)". That is false for the chip this function
 * actually feeds, because dependency chips set no per-chip hue and all
 * render in the one fallback colour -- two colliding workspaces produce
 * pixel-identical chips. The hash does distinguish ID badges, and even
 * there only 7 times in 8, since the palette holds 8 hues.
 */
export function workspaceLabel(workspaceKey: string): string {
  const parts = workspaceKey.split("-").filter((part) => part !== "");
  return parts.length === 0 ? workspaceKey : parts[parts.length - 1];
}

/**
 * The display form of one stored dependency reference.
 *
 * #21: a dependency chip should carry INFORMATION, and the information a
 * reader needs is "which ticket, and is it one of ours?". The old form
 * rewrote every `<workspaceKey>:` prefix to the literal string `aidos#`,
 * which ERASED the distinction it looked like it was drawing: a dependency
 * on a genuinely foreign workspace rendered identically to a local one, so
 * the prefix cost space while telling the reader nothing.
 *
 * Now: a LOCAL dependency renders as the bare ticket id, because the
 * workspace is the one you are already looking at. A FOREIGN dependency
 * keeps a workspace label, because that is the case where the prefix is the
 * whole point. Pass ownWorkspaceKey to get the distinction; omit it and
 * every prefixed reference is treated as foreign, which is the safe default
 * (it shows MORE, never less).
 */
export function displayDep(ref: string, ownWorkspaceKey?: string): string {
  const match = /^(--.*--):(.*)$/.exec(ref);
  if (match === null) return ref;
  const [, workspaceKey, tail] = match;
  if (ownWorkspaceKey !== undefined && workspaceKey === ownWorkspaceKey) {
    return tail;
  }
  return workspaceLabel(workspaceKey) + "#" + tail;
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
 * The short chip label of one ticket. The chip shows the NUMBER because a
 * slug is too long for a chip; the title attribute keeps the full id from
 * fullTicketId.
 *
 * #21: this used to render `aidos#<id>` for EVERY ticket, because the old
 * displayDep rewrote any workspace prefix to the literal string "aidos". On
 * a board whose rows all share one workspace -- which is every board today,
 * since the merge is per-workspace -- that prefix was identical on every
 * chip: five characters of furniture repeated down the grid, carrying no
 * information and actively hiding the one case where a prefix MATTERS.
 *
 * Pass ownWorkspaceKey in a LIST (grid, strips) to get the bare id, and a
 * workspace label only when the ticket genuinely comes from elsewhere. Omit
 * it on a single prominent chip (the detail header) where the fully
 * qualified id is worth the space.
 */
export function ticketChipLabel(
  ticket: {
    id: number;
    workspaceKey: string;
  },
  ownWorkspaceKey?: string,
): string {
  return displayDep(ticket.workspaceKey + ":" + ticket.id, ownWorkspaceKey);
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


/** The identity fields the selection resolver needs, beyond the board key. */
export interface SelectionCandidate extends BoardKeyed {
  workspaceKey: string;
  slug: string;
}

/** What the detail panel should render, and whether the selection moved. */
export interface SelectionResolution<T> {
  /** The ticket to render. Null closes the panel. */
  ticket: T | null;
  /** Non-null when the same ticket now lives at a different board key. */
  reanchorKey: BoardKey | null;
  /** Why the panel is showing `ticket`. For tests and for reasoning. */
  reason: "none" | "resolved" | "reanchored" | "held" | "gone";
  /**
   * The held ticket is not on the current board. The panel keeps showing it
   * and says so, rather than ejecting the reader mid-read.
   */
  absent: boolean;
}

/**
 * #100: which ticket the detail panel shows, given a selection and a board.
 *
 * The panel used to be PURELY derived -- one missed lookup and it unmounted,
 * dropping the reader back to the grid mid-read. The merge re-pulls after ANY
 * board write, including someone else's, so it fired on other people's
 * actions and felt random. It also took every modal with it: the evidence
 * viewer, the allowlist editor, the signoff dialog and the mark-done modal
 * all render INSIDE the panel, so a background refresh could vanish a dialog
 * the user was typing into.
 *
 * Three steps:
 *  1. the board key, as before;
 *  2. RE-ANCHOR on the durable identity when the KEY itself changed. A row's
 *     board key flips when it goes foreign -> own, but `workspaceKey:slug`
 *     does not. Deliberately NOT matched on the numeric id: that confusion is
 *     behind eleven separate bugs in this file's history;
 *  3. otherwise HOLD the last resolved ticket while a pull is in flight, and
 *     close only once the board is settled and the ticket is genuinely gone.
 *
 * Pure so it is testable: the caller owns the `previous` ref and the
 * `boardSettling` flag, and this owns every decision made from them.
 */
export function resolveSelection<T extends SelectionCandidate>(
  tickets: readonly T[],
  selectedKey: BoardKey | null,
  previous: T | null,
): SelectionResolution<T> {
  if (selectedKey === null) {
    return { ticket: null, reanchorKey: null, reason: "none", absent: false };
  }
  const resolved = tickets.find((ticket) => boardKeyOf(ticket) === selectedKey) ?? null;
  if (resolved !== null) {
    return { ticket: resolved, reanchorKey: null, reason: "resolved", absent: false };
  }
  if (previous !== null) {
    const reanchored =
      tickets.find((ticket) => fullTicketId(ticket) === fullTicketId(previous)) ?? null;
    if (reanchored !== null) {
      return {
        ticket: reanchored,
        reanchorKey: boardKeyOf(reanchored),
        reason: "reanchored",
        absent: false,
      };
    }
    /*
     * HOLD UNCONDITIONALLY. The first fix held only while a pull was in
     * flight, and the user reported the bug still happening -- correctly.
     * The merge pull clears its own flag BEFORE it triggers the re-render:
     *
     *     setMerge(...)                      // cache updated
     *     setMergePulling(sessionId, false)  // flag cleared FIRST
     *     setMergeState(result)              // THEN the re-render
     *
     * so on precisely the render that lands the new board, "a pull is in
     * flight" is already false. The hold never covered the render that
     * matters. The pure function was right and its INPUT was wrong, which
     * unit tests taking that input as a parameter can never catch.
     *
     * There is no reliable "the board is complete now" signal to wait for,
     * so this stops pretending there is: a selection is ended by the USER,
     * not by a row's momentary absence. When the ticket really is gone the
     * panel says so (`absent`) instead of ejecting the reader mid-read.
     */
    return { ticket: previous, reanchorKey: null, reason: "held", absent: true };
  }
  return { ticket: null, reanchorKey: null, reason: "gone", absent: false };
}
