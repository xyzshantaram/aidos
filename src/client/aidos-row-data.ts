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
  /**
   * #142: this fact starts EXPANDED.
   *
   * The settled rule is "show-more defaults COLLAPSED, except a field this
   * CALL actually changed". Only the producer can tell the two apart -- the
   * label `criteria` is the edit itself on a set_ticket card and untouched
   * context on a read -- so the exception rides the data and is honoured in
   * exactly one place (FactValue), rather than being re-decided per card.
   */
  open?: boolean;
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
 * #142: ANY value as the source text of an expandable fact.
 *
 * `oneLine` alone is not enough for a fact built from an arbitrary argument:
 * it returns the already-flattened line, and `expandableFact` needs the
 * ORIGINAL to decide whether flattening lost anything. A string is its own
 * source; anything else is pretty-printed, so the expander reveals the
 * structure the one-line form destroyed (an allowlist array, a nested
 * payload) instead of the same squashed string again.
 */
export function factText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
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
  options?: { max?: number; markdown?: boolean; open?: boolean },
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
  /*
   * `open` is dropped along with `full`: a fact with nothing more to show
   * has no expanded state to start in, and claiming one would make the
   * "changed field" rule look like it did something on a fact where it
   * cannot.
   */
  if (!cut && !structural) return { label, value };
  return {
    label,
    value,
    full: trimmed,
    ...(options?.markdown === true ? { markdown: true } : {}),
    ...(options?.open === true ? { open: true } : {}),
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
  /*
   * #142: a joined list is a FLATTENED value, so it expands like any other.
   * A twelve-path allowlist is cut at the same 120 characters a description
   * is, and before this the rest was simply gone from the card.
   */
  const allowlist = asArray(ticket.allowlist);
  if (allowlist.length > 0) {
    facts.push(expandableFact("Allowlist", allowlist.map((p) => String(p)).join(" · ")));
  }
  const dependsOn = asArray(ticket.dependsOn);
  if (dependsOn.length > 0) {
    facts.push(expandableFact("Depends on", dependsOn.map((d) => String(d)).join(" · ")));
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

/**
 * The FULL evidence records a get_evidence result carries (#164).
 *
 * Deliberately not `ticketEvidence`: that one reads get_ticket's bounded
 * `excerpt` string (#92), and re-truncating here would discard the only
 * thing this tool exists to deliver. The payload rides through whole so the
 * card can render it with the same view the detail panel uses — a review
 * read in the conversation should look like the review on the board, not
 * like a JSON dump.
 */
export function evidenceRecords(
  result: Record<string, unknown> | null,
): Array<{
  index: number;
  kind: string;
  author: string;
  at?: number;
  payload: Record<string, unknown>;
}> {
  return asArray(result?.evidence)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row, position) => ({
      index: typeof row.index === "number" ? row.index : position,
      kind: asText(row.kind) ?? "",
      author: asText(row.author) ?? "agent",
      at: typeof row.at === "number" ? row.at : undefined,
      payload: asRecord(row.payload) ?? {},
    }))
    .filter((row) => row.kind !== "");
}

/** The full comment bodies a get_evidence result carries when asked. */
export function evidenceComments(
  result: Record<string, unknown> | null,
): Array<{ author: string; at?: number; body: string }> {
  return asArray(result?.comments)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map((row) => ({
      author: asText(row.author) ?? "user",
      at: typeof row.at === "number" ? row.at : undefined,
      body: asText(row.body) ?? "",
    }))
    .filter((row) => row.body !== "");
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

/**
 * #142: the edit card's fields go through `expandableFact`, like every
 * other card's do.
 *
 * This function was the ONE outlier in the consistency pass: it called
 * `oneLine` directly, so a written description was cut at 120 characters
 * with no way to see the rest -- on the card whose entire job is to show
 * what an otherwise invisible edit wrote. Its siblings (ticketFacts,
 * ticketTableOf) had used the expander since #73.
 *
 * `open: true` is the one place the collapsed default is waived, per the
 * settled rule: these fields are what this CALL changed, not context it
 * happened to read, and the user asked to see them without a second click.
 * `markdown` for the prose fields for the same reason ticketFacts marks
 * them: a description rendered as literal asterisks is the defect the
 * digest was fixed for.
 */
const MARKDOWN_FIELDS = new Set(["description", "body"]);

export function writtenFields(args: Record<string, unknown> | null): Fact[] {
  if (args === null) return [];
  const facts: Fact[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (SET_TICKET_ADDRESSING.has(key)) continue;
    if (value === undefined) continue;
    facts.push(
      expandableFact(key, factText(value), {
        open: true,
        ...(MARKDOWN_FIELDS.has(key) ? { markdown: true } : {}),
      }),
    );
  }
  return facts;
}

/**
 * #144: what a move_ticket ROW SHOWS on its always-visible line.
 *
 * User ask (2026-09-07): the card rendered `#N — Title — state` as one
 * string, so a long title pushed the DESTINATION off the end -- losing the
 * one fact the card exists to report. The reader can always recover the
 * title (it is on the ticket, and on the hover); nothing recovers a state
 * that was never drawn.
 *
 * So the two are separated here: the title is a value that may be cut, and
 * the state is a BADGE the row draws whole. The cut is done in code, not
 * only in CSS, for two reasons: it is testable without a browser, and it
 * holds even in a narrow column where the ellipsis alone would still be
 * competing with the badge for the same line.
 *
 * `text` is the flat form the row still needs -- the hover title, and the
 * summary a refusal or a title-less call falls back to.
 */
export interface MoveSummary {
  title: string;
  /** The destination state id, or null when the call named none. */
  state: string | null;
  text: string;
}

/**
 * The title is capped WELL SHORT of a card's width so the badge beside it
 * is never the thing that overflows. It is a backstop, not the layout: the
 * one-line clamp in CSS does the ordinary work.
 */
export const MOVE_TITLE_MAX = 72;

export function moveTicketSummary(
  label: string | null,
  to: string | null,
  stateText?: (state: string) => string,
): MoveSummary {
  const title = oneLine(label ?? "move", MOVE_TITLE_MAX);
  if (to === null || to === "") return { title, state: null, text: title };
  const shown = stateText === undefined ? to : stateText(to);
  return { title, state: to, text: `${title} → ${shown}` };
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

/**
 * #142: THE PENDING LIST, AS A TABLE.
 *
 * The pending allowlist request was the one card that answered "label:
 * value about a ticket" with a bespoke `<ul>` -- its own list chrome, its
 * own tag span, and no expander, so a path longer than the card was cut by
 * CSS with nothing to click. The user's ruling was "make the pending list a
 * table", and this is that table: the same `Facts` grid every other card
 * body uses.
 *
 * The STATUS is the label and the PATH is the value, not the other way
 * round. A `dt` is nowrap and sized to its content, so a long path in the
 * label column would blow the grid out and could never expand; as the value
 * it clips to one line and offers its full form like any other fact. The
 * "will be created" wording is kept verbatim from the list it replaces --
 * it is #104's informed half of informed consent, not decoration.
 */
export function allowlistFacts(
  args: Record<string, unknown> | null,
  result: Record<string, unknown> | null,
): Fact[] {
  return allowlistPaths(args, result).map((entry) =>
    expandableFact(entry.created ? "will be created" : "exists", entry.path),
  );
}

/**
 * #142: what a MOVE did, as facts.
 *
 * move_ticket is one of the cards that renders a facts table, but its table
 * was only ever populated from `result.ticket` -- a field the tool does not
 * return -- so a SUCCESSFUL move had an empty body and no chevron at all,
 * while a refused one expanded into its reason. The result carries
 * `fromState`/`toState`; the transition is the whole record of the call, so
 * the card shows it rather than being a dumb summary.
 */
export function moveFacts(result: Record<string, unknown> | null): Fact[] {
  const from = asText(result?.fromState);
  const to = asText(result?.toState);
  if (from === null || to === null) return [];
  return [
    { label: "From", value: from },
    { label: "To", value: to },
  ];
}

/**
 * #142: the plan blocks a `plan_meta` read returned.
 *
 * Lifted out of the component with the rest of the readers, and put through
 * the expander: a frontmatter block is a multi-line YAML document, and the
 * card used to drop it into the cell RAW -- neither one-lined nor
 * expandable, the only value on any aidos card that was not.
 */
export function planMetaFacts(result: Record<string, unknown> | null): Fact[] {
  const facts: Fact[] = [];
  for (const block of ["frontmatter", "preamble"]) {
    const value = result?.[block];
    if (typeof value === "string") {
      facts.push(value === "" ? { label: block, value: "(empty)" } : expandableFact(block, value));
    }
  }
  const sections = result?.contextSections;
  if (Array.isArray(sections)) {
    facts.push({ label: "contextSections", value: String(sections.length) });
  }
  return facts;
}

/**
 * #142: what an import did, as facts.
 *
 * #120's deletion outcome and its error message keep their meaning; the
 * error is the one long value here, so it expands like every other.
 */
export function planImportFacts(result: Record<string, unknown> | null): Fact[] {
  const facts: Fact[] = [];
  const imported = result?.imported ?? result?.count;
  if (typeof imported === "number") facts.push({ label: "Imported", value: String(imported) });
  if (typeof result?.projectId === "number") {
    facts.push({ label: "Project", value: String(result.projectId) });
  }
  const deleted = result?.deleted;
  if (typeof deleted === "boolean") {
    facts.push({ label: "Plan file", value: deleted ? "deleted" : "KEPT" });
  }
  const deletionError = result?.deletionError;
  if (typeof deletionError === "string" && deletionError !== "") {
    facts.push(expandableFact("Deletion error", deletionError));
  }
  return facts;
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
  /**
   * #135: the whole description, for the peek modal's markdown body. The
   * excerpt stays for one-line contexts; the modal renders this instead.
   */
  descriptionFull?: string;
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
  /*
   * #135: the peek needs the WHOLE description, rendered as markdown like
   * the detail panel renders it. The excerpt above stays for the strip's
   * one-line contexts; the full text rides the same row for the modal.
   */
  if (excerpt !== null && excerpt.trim() !== "") out.descriptionFull = excerpt;
  return out;
}

/**
 * #135: activate the Tickets tab from outside the tab strip.
 *
 * WHY DOM. The tab strip switches views by calling an action (`setView`)
 * on the chat store, and that store reaches a component only as
 * `PropsStore<ChatStore>`. The chat view gets it because ui-conversation
 * registers that entry itself; a THIRD-PARTY view entry's props type is
 * `ConvViewProps = PropsRuntime<'conversation.view'>` -- no store, no
 * actions. `chatStore` is module-private inside ui-conversation's apply().
 * There is no plugin-reachable activation API (verified against the
 * installed dsh client runtime, 2026-09-07; the full tracing is recorded
 * on ticket #135).
 *
 * So the honest mechanism is the same one a human click uses: the rendered
 * tab button, `<button role="tab">` inside the `role="tablist"` strip.
 * Pure over a minimal DOM interface so it is unit-testable without a
 * browser -- the same rule selectTitle follows after its "[object Object]"
 * bug. Returns the button it activated, or null with a reason the caller
 * can show, never a false success.
 */
export function findTicketsTabButton(
  root: {
    querySelectorAll(selector: string): ArrayLike<{
      getAttribute(name: string): string | null;
      textContent: string | null;
      click(): void;
    }>;
  } | null
  | undefined,
): { button: { click(): void } | null; reason: string | null } {
  if (root === null || root === undefined) {
    return { button: null, reason: "no document" };
  }
  const tabs = root.querySelectorAll('[role="tab"]');
  for (const tab of Array.from(tabs)) {
    const label = (tab.textContent ?? "").trim();
    // The tab's label is badgeLabel(): "Tickets" or "Tickets (N)". Match on
    // the word, not the count, so a badge change cannot break activation.
    if (label === "Tickets" || label.startsWith("Tickets (")) {
      return { button: tab, reason: null };
    }
  }
  // The strip renders only when more than one view exists: a session with
  // the Tickets tab as its ONLY view has no button to click. The selection
  // is still written, so opening the view by hand lands on the ticket.
  return { button: null, reason: "the Tickets tab is not shown on this screen" };
}

/**
 * The summary line of a plan_import call: the file plus the count it
 * created (user, 2026-09-05: "import plan tool call summary should show the
 * count of imported tickets").
 *
 * The count is the fact that matters in the transcript -- an import is
 * all-or-nothing and lands every ticket in open, so "which file" says what
 * was read and "N tickets" says what happened. The count is omitted while
 * the call is still running, because `undefined` is honest and "0 tickets"
 * would be a lie that reads like a failure.
 *
 * #120: the import owns the file's lifecycle, so the summary also says
 * what happened to the FILE -- deleted rides the line (it is the expected
 * end state), and a deletion failure rides it too, because a file that
 * survived an import is a surprise the user must not have to expand the
 * row to discover.
 */
export function planImportSummary(
  file: string,
  imported: number | undefined,
  deleted?: boolean | null,
): string {
  let out = file;
  if (imported !== undefined) {
    out += " · " + imported + (imported === 1 ? " ticket" : " tickets");
  }
  if (deleted === false) out += " · file kept";
  else if (deleted === true) out += " · file deleted";
  return out;
}
