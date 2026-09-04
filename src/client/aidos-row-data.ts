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

/** One `label: value` line in a card body. */
export interface Fact {
  label: string;
  value: string;
}

/** One ticket line in a board-read body. */
export interface TicketLine {
  id: string;
  state: string;
  title: string;
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
 * The facts of a single ticket read: what the reader wants without opening
 * the board, in the order they would ask for them.
 *
 * State and gate lead because they are the two questions a ticket is read to
 * answer. Counts are shown only when non-zero -- "0 comments" is noise.
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
  const criteria = asText(ticket.criteria);
  if (criteria !== null && criteria.trim() !== "") {
    facts.push({ label: "Criteria", value: oneLine(criteria) });
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
  const excerpt = asText(hit.description);
  if (excerpt !== null && excerpt.trim() !== "") out.descriptionExcerpt = oneLine(excerpt, 220);
  return out;
}
