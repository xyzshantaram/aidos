/**
 * #73: the data an aidos tool card shows, as pure functions.
 *
 * Every one of these takes a call's parsed arguments and/or its parsed JSON
 * result and returns plain data. Nothing here touches React.
 *
 * Kept out of the components deliberately: logic inside a component is logic
 * no test can reach, which is how the allowlist union and the backward-gate
 * guard both shipped unverified. The components decide layout; these decide
 * what the reader is told.
 *
 * All of them are defensive about shape. A tool result arrives as text off
 * the wire and may be absent (still running), truncated, or from an older
 * build whose schema differed -- so every reader tolerates missing fields and
 * returns an empty list rather than throwing inside a render.
 */

import { STATE_ORDER } from "../kernel/types";
import type { TicketState } from "../kernel/types";

/**
 * One `label: value` line in a card body.
 *
 * `value` is always the short, one-line form the row shows by default.
 * `full` is the untruncated text a "show more" toggle reveals in place --
 * present only when there IS more than `value` already shows, so a row that
 * checks `full !== undefined` never offers to expand a fact that has
 * nothing more to give. `markdown` marks prose worth rendering as markdown
 * once expanded (a ticket's description or body); a plain fact (a count, a
 * state name, a path list) is never markdown, expanded or not.
 */
export interface Fact {
  label: string;
  value: string;
  full?: string;
  markdown?: boolean;
}

/** One ticket line in a board-read body. */
export interface TicketLine {
  id: string;
  state: string;
  title: string;
}

/**
 * One ticket rendered as its OWN facts table in a board-read body.
 *
 * User direction (2026-09-05): "if it's a single ticket, it should be one
 * table. if it's many, it should be a stack of tables, like batch_edit
 * stacks single edit diffs in tool-render."
 *
 * So a board read is not a list of lines any more -- it is N of the SAME
 * table a single-ticket read renders, stacked. The heading fields
 * (`id`/`state`/`title`) are hoisted OUT of `facts` deliberately: they are
 * the table's caption, not rows in it, and repeating "State" inside every
 * table while the caption already carries it would be the wall of noise the
 * one-line rule exists to prevent.
 */
export interface TicketTable {
  id: string;
  state: string;
  title: string;
  facts: Fact[];
}

/** One proposed path, and whether the approval will CREATE it (#104). */
export interface AllowlistPath {
  path: string;
  created: boolean;
}

/** One nomination in a suggest_actions body. */
export interface SuggestionLine {
  ticketId: string;
  actionId: string;
  reason: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

/**
 * A one-line form of any value, for a facts table.
 *
 * Long text is cut and newlines collapsed, because a fact is a LINE: a
 * description pasted whole turns the table into a wall and buries the facts
 * beside it. The full value is always reachable in the ticket itself.
 */
export function oneLine(value: unknown, max = 120): string {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat;
}

/**
 * One fact that can expand IN PLACE to its untruncated text.
 *
 * User direction (2026-09-05): "every ellipsized strip should have a show
 * more that expands its own cell". The row cannot decide that for itself --
 * it sees only `value`, which is already flattened, so it cannot tell an
 * ellipsis that was ADDED from one the author typed. The decision belongs
 * here, where the original text is still in hand.
 *
 * `full` is set only when there is genuinely MORE to show: either the flat
 * form was cut, or flattening destroyed structure the reader wants back
 * (newlines in a criteria block, a markdown list in a description). A fact
 * whose value is already the whole story gets no `full`, so no row ever
 * offers a "show more" that reveals nothing -- the failure mode that makes
 * an expander untrustworthy everywhere else in a UI.
 */
export function expandableFact(
  label: string,
  text: string,
  options?: { max?: number; markdown?: boolean },
): Fact {
  const value = oneLine(text, options?.max);
  const trimmed = text.trim();
  /*
   * Two independent reasons the flat line is not the whole story. Compared
   * against the TRIMMED source, not the raw one: trailing whitespace is not
   * content worth a button.
   *
   * `cut` USED TO TEST `value.endsWith("…")`, which is the one thing this
   * function's own docstring says it exists to avoid: it cannot tell an
   * ellipsis that oneLine ADDED from one the author typed. An independent
   * review proved it with "Wait for it…" -- value and full byte-identical,
   * an expander offered, and the reader shown the same string back. The
   * original text is right here, so compare against it instead of trying to
   * read the tea leaves in the output.
   *
   * `full !== value` rather than a length test against `max`: it is the
   * property that actually matters ("is there more than the reader can
   * already see"), and it stays correct if oneLine's flattening changes.
   */
  const cut = trimmed !== value;
  const structural = /\n/.test(trimmed);
  if (!cut && !structural) return { label, value };
  return {
    label,
    value,
    full: trimmed,
    ...(options?.markdown === true ? { markdown: true } : {}),
  };
}

/**
 * The facts of a single ticket read: what the reader wants without opening
 * the board, in the order they would ask for them.
 *
 * State and gate lead because they are the two questions a ticket is read to
 * answer. Counts are shown only when non-zero -- "0 comments" is noise.
 *
 * Description, criteria and body carry their full text for the in-cell
 * expander (#73, 2026-09-05). Description and body are marked markdown
 * because they ARE markdown -- every ticket in this project writes them
 * that way, and a card that shows `**User ask**` as literal asterisks is
 * the same defect the digest was fixed for.
 */
export function ticketFacts(result: Record<string, unknown> | null): Fact[] {
  const ticket = asRecord(result?.ticket);
  if (ticket === null) return [];
  const facts: Fact[] = [];
  const state = asText(ticket.state);
  if (state !== null) facts.push({ label: "State", value: state });
  const present = ticket.gatePresent;
  const total = ticket.gateTotal;
  if (typeof present === "number" && typeof total === "number") {
    facts.push({ label: "Gate", value: `${present}/${total}` });
  }
  const description = asText(ticket.description);
  if (description !== null && description.trim() !== "") {
    facts.push(expandableFact("Description", description, { markdown: true }));
  }
  const criteria = asText(ticket.criteria);
  if (criteria !== null && criteria.trim() !== "") {
    // NOT markdown: criteria are one plain assertion per line, and running
    // them through a markdown parser silently swallows a line that happens
    // to start with `#` or `-`.
    facts.push(expandableFact("Criteria", criteria));
  }
  const body = asText(ticket.body);
  if (body !== null && body.trim() !== "") {
    facts.push(expandableFact("Body", body, { markdown: true }));
  }
  const allowlist = asArray(ticket.allowlist);
  if (allowlist.length > 0) {
    facts.push({ label: "Allowlist", value: allowlist.map((p) => String(p)).join(" · ") });
  }
  const dependsOn = asArray(ticket.dependsOn);
  if (dependsOn.length > 0) {
    facts.push({ label: "Depends on", value: dependsOn.map((d) => String(d)).join(" · ") });
  }
  const comments = result?.commentCount;
  if (typeof comments === "number" && comments > 0) {
    facts.push({ label: "Comments", value: String(comments) });
  }
  return facts;
}

/**
 * The heading of ONE ticket table: `#id`, its state, its title. Shared by
 * the board-read stack and the single-ticket read so the two render the
 * same caption rather than two near-identical ones.
 */
export function ticketTableOf(row: Record<string, unknown>): TicketTable {
  const facts: Fact[] = [];
  const present = row.gatePresent;
  const total = row.gateTotal;
  if (typeof present === "number" && typeof total === "number") {
    facts.push({ label: "Gate", value: `${present}/${total}` });
  }
  const score = row.confidenceScore;
  if (typeof score === "number") facts.push({ label: "Score", value: String(score) });
  const phase = row.phase;
  if (typeof phase === "number") facts.push({ label: "Phase", value: String(phase) });
  const dependsOn = row.dependsOnCount;
  if (typeof dependsOn === "number" && dependsOn > 0) {
    facts.push({ label: "Depends on", value: String(dependsOn) });
  }
  const allowlist = row.allowlistCount;
  if (typeof allowlist === "number" && allowlist > 0) {
    facts.push({ label: "Allowlist", value: `${allowlist} path${allowlist === 1 ? "" : "s"}` });
  }
  const excerpt = asText(row.descriptionExcerpt);
  if (excerpt !== null && excerpt.trim() !== "") {
    /*
     * A board read ships an EXCERPT, not the description -- #92 caps what
     * crosses the wire on purpose. So the expander here can only ever
     * reveal what the excerpt itself already holds (its newlines, its
     * markdown), never text the row does not have.
     *
     * `descriptionTruncated` is therefore rendered as a suffix on the
     * expanded text rather than as a promise the button cannot keep: a
     * reader who expands and finds it still cut needs to know the rest is
     * in the ticket, not that the button failed.
     */
    const truncated = row.descriptionTruncated === true;
    const text = truncated ? excerpt.trimEnd() + "\n\n_(excerpt — read the ticket for the rest)_" : excerpt;
    facts.push(expandableFact("Description", text, { markdown: true }));
  }
  return {
    id: asText(row.id) ?? "?",
    state: asText(row.state) ?? "",
    title: asText(row.title) ?? "",
    facts,
  };
}

/**
 * The caption of a SINGLE-ticket read: the same `#id · state · title` a
 * stacked table carries, read from `result.ticket`.
 *
 * Separate from `ticketTableOf` because the two results are different
 * shapes: a board row ships counts and an excerpt, a single read ships the
 * ticket itself. Only the caption is common, so only the caption is shared.
 * Returns null when there is no ticket or no title to show.
 */
export function ticketCaptionOf(
  result: Record<string, unknown> | null,
): { id: string; state: string; title: string } | null {
  const ticket = asRecord(result?.ticket);
  if (ticket === null) return null;
  const title = asText(ticket.title) ?? "";
  if (title.trim() === "") return null;
  return {
    id: asText(ticket.id) ?? "?",
    state: asText(ticket.state) ?? "",
    title,
  };
}

/**
 * A board read as a STACK OF TABLES, one per ticket (user direction
 * 2026-09-05). Returns [] for a result with no rows, so the caller keeps
 * its existing empty/unparseable distinction.
 */
export function ticketTables(result: Record<string, unknown> | null): TicketTable[] {
  return asArray(result?.tickets)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => ticketTableOf(row));
}

/** The bounded evidence rows a get_ticket result carries (#92 keeps them short). */
export function ticketEvidence(
  result: Record<string, unknown> | null,
): Array<{ kind: string; author: string; at?: number; excerpt: string }> {
  return asArray(result?.evidence)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => ({
      kind: asText(row.kind) ?? "",
      author: asText(row.author) ?? "agent",
      at: typeof row.at === "number" ? row.at : undefined,
      excerpt: asText(row.excerpt) ?? "",
    }))
    .filter((row) => row.kind !== "");
}

/** The rows a board read returned, as `#id · state · title` lines. */
export function ticketLines(result: Record<string, unknown> | null): TicketLine[] {
  return asArray(result?.tickets)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => ({
      id: asText(row.id) ?? "?",
      state: asText(row.state) ?? "",
      title: asText(row.title) ?? "",
    }));
}

/**
 * The one-line description of WHAT A BOARD READ ASKED FOR.
 *
 * User direction (2026-09-05): the collapsed summary should describe the
 * ARGUMENTS, not the results, and the result count belongs after the body.
 *
 * The reasoning holds up under the row's own anatomy: collapsed, a row is a
 * record of what the agent DID, and "Showing 30 of 42 matching tickets"
 * describes what came back -- which the reader cannot check without opening
 * the card anyway. Two reads with completely different filters rendered
 * identically whenever they happened to return the same count, so the
 * summary hid exactly the thing worth scanning a transcript for.
 *
 * An unfiltered read says so ("all tickets") rather than rendering blank.
 */
export function boardQuerySummary(args: Record<string, unknown> | null): string {
  if (args === null) return "all tickets";
  const parts: string[] = [];
  /*
   * A malformed argument is SHOWN, not swallowed.
   *
   * Arguments arrive as whatever the model emitted, and the tempting
   * defensive move -- drop anything that is not the declared shape -- makes
   * the row LIE: a call that passed `stateIds: "open"` would render "all
   * tickets", which is the one thing it certainly did not ask for. A row
   * that hides a filter is worse than a row that shows an odd-looking one,
   * because only the odd-looking one prompts anybody to look.
   *
   * So a bare string is read as a single state, and every scalar is read as
   * its text. The rule is: render what can be read, never throw, and never
   * silently make a filtered read look unfiltered.
   */
  const rawStates = Array.isArray(args.stateIds) ? args.stateIds : [args.stateIds];
  const states = rawStates
    .map((value) => asText(value))
    .filter((value): value is string => value !== null && value !== "");
  if (states.length > 0) parts.push(states.join("|"));
  const search = asText(args.search);
  if (search !== null && search !== "") parts.push(`"${search}"`);
  const projectIds = asArray(args.projectIds)
    .map((value) => asText(value))
    .filter((value): value is string => value !== null && value !== "");
  const projectId = asText(args.projectId);
  if (projectIds.length > 0) parts.push(`projects ${projectIds.join(",")}`);
  else if (projectId !== null && projectId !== "") parts.push(`project ${projectId}`);
  const sortKey = asText(args.sortKey);
  if (sortKey !== null && sortKey !== "") {
    /*
     * The DIRECTION rides the sort key rather than standing alone: a bare
     * "descending" says nothing without the key it applies to, and the pair
     * is what the reader is checking ("newest first?").
     */
    parts.push(`${sortKey} ${args.descending === false ? "↑" : "↓"}`);
  }
  if (args.detail === "full") parts.push("full");
  const limit = asText(args.limit);
  if (limit !== null && limit !== "") parts.push(`limit ${limit}`);
  const offset = asText(args.offset);
  // Offset 0 is the default and says nothing; only a real page is worth a chip.
  if (offset !== null && offset !== "" && offset !== "0") parts.push(`offset ${offset}`);
  return parts.length === 0 ? "all tickets" : parts.join(" · ");
}

/**
 * The fields a set_ticket call actually WROTE.
 *
 * `ticketId` and `projectId` are excluded: they name which ticket was
 * written, not what changed, and they are already on the row's summary. A
 * card that lists them reads as though the id were edited.
 */
const SET_TICKET_ADDRESSING = new Set(["ticketId", "projectId"]);

export function writtenFields(args: Record<string, unknown> | null): Fact[] {
  if (args === null) return [];
  const facts: Fact[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (SET_TICKET_ADDRESSING.has(key)) continue;
    if (value === undefined) continue;
    facts.push({ label: key, value: oneLine(value) });
  }
  return facts;
}

/**
 * The proposed paths, each marked with whether approving CREATES it.
 *
 * The `created` list comes from the result, so it is only known once the
 * call settles; before then every path reads as existing, which is the safe
 * direction -- claiming a path is new when it is not would misrepresent what
 * the user is about to approve.
 */
export function allowlistPaths(
  args: Record<string, unknown> | null,
  result: Record<string, unknown> | null,
): AllowlistPath[] {
  const created = new Set(asArray(result?.created).map((p) => String(p)));
  return asArray(args?.paths).map((p) => {
    const path = String(p);
    return { path, created: created.has(path) };
  });
}

/** The nominations a suggest_actions call made. */
export function suggestionLines(args: Record<string, unknown> | null): SuggestionLine[] {
  return asArray(args?.suggestions)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => ({
      ticketId: asText(row.ticketId) ?? "?",
      actionId: asText(row.actionId) ?? "",
      reason: asText(row.reason) ?? "",
    }));
}

/**
 * Which plan blocks a plan_meta_set call replaced.
 *
 * The tool's contract is that a PRESENT field replaces its stored value and
 * an absent one keeps it, so the block names present in the arguments are
 * exactly the edit. Naming them is the whole point of the card: "edited the
 * plan" does not say whether the frontmatter or every context section moved.
 */
const PLAN_BLOCKS = ["frontmatter", "preamble", "contextSections"] as const;

export function planBlocksWritten(args: Record<string, unknown> | null): string[] {
  if (args === null) return [];
  return PLAN_BLOCKS.filter((block) => typeof args[block] === "string");
}

/** The minimum shape `TicketStrip` needs, checked structurally. */
export interface ProjectedTicket {
  id: number;
  title: string;
  state: TicketState;
  slug: string;
  workspaceKey: string;
  gatePresent?: number;
  gateTotal?: number;
  descriptionExcerpt?: string;
  /*
   * Carried through because TicketStrip's gate chip needs it: a ticket with
   * criteria can FAIL its gate; one without cannot. This field was dropped
   * by the copy step and the peek crashed on `criteria.trim()` -- it existed
   * in the projection payload the whole time.
   */
  criteria?: string;
}

function isTicketState(value: unknown): value is TicketState {
  return typeof value === "string" && (STATE_ORDER as readonly string[]).includes(value);
}

/**
 * A ticket by id out of the LIVE `aidos.tickets` projection, for the
 * click-through peek (#73 round 3).
 *
 * The projection is `useProjection("aidos.tickets")`: a session-scoped
 * client Standard Prop the harness supplies to every atomic tool view for
 * free (confirmed against the live Slot contract, not inferred from a
 * bundle) -- `Record<string, TicketView>`, keyed by the SAME string id the
 * board itself uses. A row already resolves `useProjection`; this is the
 * pure lookup, kept out of the component for the same reason every other
 * reader here is pure: a click handler that inlines its own shape-checking
 * is a click handler no test can reach without a browser.
 *
 * Returns null for every unready or malformed case rather than throwing:
 * the projection has not loaded yet, the id belongs to a ticket outside
 * THIS session's own board (a foreign reference the projection never
 * carries), or a future host build changed the shape. A missing ticket is
 * an ordinary outcome here, not a defect to surface as an error card.
 */
export function ticketFromProjection(
  projectionValue: unknown,
  ticketId: string | null | undefined,
): ProjectedTicket | null {
  if (ticketId === null || ticketId === undefined || ticketId === "") return null;
  const record = asRecord(projectionValue);
  if (record === null) return null;
  const hit = asRecord(record[ticketId]);
  if (hit === null) return null;
  if (
    typeof hit.id !== "number" ||
    typeof hit.title !== "string" ||
    !isTicketState(hit.state) ||
    typeof hit.slug !== "string" ||
    typeof hit.workspaceKey !== "string"
  ) {
    return null;
  }
  const out: ProjectedTicket = {
    id: hit.id,
    title: hit.title,
    state: hit.state,
    slug: hit.slug,
    workspaceKey: hit.workspaceKey,
  };
  if (typeof hit.gatePresent === "number") out.gatePresent = hit.gatePresent;
  if (typeof hit.gateTotal === "number") out.gateTotal = hit.gateTotal;
  if (typeof hit.criteria === "string") out.criteria = hit.criteria;
  const excerpt = asText(hit.description);
  if (excerpt !== null && excerpt.trim() !== "") out.descriptionExcerpt = oneLine(excerpt, 220);
  return out;
}
