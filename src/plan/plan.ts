/**
 * The plan document format. A verbatim port of prototype/aidos_proto/plan.py.
 * Pure functions. SPEC.md section 12 is the contract.
 * If you change this parser, also update skills/aidos-plan/verify-plan.mjs, which mirrors it (and vice versa): keep the two in sync. */

import type { ContextSection, TicketState } from "../kernel/types";
import { PlanParseError } from "../kernel/types";

/** The mark that each line carries, and the state the mark claims. */
export const MARK_STATES: Record<string, TicketState> = {
  " ": "open",
  "~": "in_progress",
  "?": "awaiting_verification",
  x: "done",
};

/** The reverse map, which the renderer uses. */
export const STATE_MARKS: Record<TicketState, string> = {
  open: " ",
  in_progress: "~",
  awaiting_verification: "?",
  done: "x",
};

// The fence that opens and closes the frontmatter.
const FENCE = "---";

// The prefix of every heading that opens a phase or a context section.
const HEADING_PREFIX = "## ";

// The prefix of a continuation line.
const CONTINUATION_PREFIX = "  ";

// The marker that separates the body of a ticket from its criteria.
const CRITERIA_MARKER = "**Evaluate:**";
// M6 fix: title may contain dots; the split between title and body is the
// last ".\*\*" before body, not the first dot. Capture title greedily up to
// the final ".\*\*" on the line; verify by requiring the trailing ".\*\*".
const TICKET_LINE = /^- \[([ ~?x])\] \*\*Ticket ([^:]+): (.+)\.\*\*\s?(.*)$/;

export interface PlanTicket {
  id: string;
  title: string;
  body: string;
  criteria: string;
  claimedState: TicketState;
  order: number;
}

export interface PlanDocument {
  frontmatter: string;
  preamble: string;
  contextSections: ContextSection[];
  tickets: PlanTicket[];
}

/** The working data of one ticket before its body is complete. */
interface RawTicket {
  id: string;
  title: string;
  lines: string[];
  claimedState: TicketState;
  order: number;
  line: number;
}

/** Read one plan document. Throws PlanParseError on the first bad line. */
export function parsePlan(text: string): PlanDocument {
  const lines = text.split("\n");
  const frontmatter = _takeFrontmatter(lines);
  const preamble = _takePreamble(lines, frontmatter.index);
  const contextSections: ContextSection[] = [];
  const rawTickets: RawTicket[] = [];
  let index = preamble.index;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (_isHeading(line)) {
      const section = _takeContextSection(lines, index, contextSections.length);
      contextSections.push(section.section);
      index = section.index;
      continue;
    }
    if (line.startsWith(CONTINUATION_PREFIX)) {
      if (rawTickets.length === 0) {
        throw new PlanParseError(
          index + 1,
          `line ${index + 1} continues a ticket, but the document holds no ticket yet`,
        );
      }
      rawTickets[rawTickets.length - 1].lines.push(line.trim());
      index += 1;
      continue;
    }
    const ticketMatch = TICKET_LINE.exec(line);
    if (!ticketMatch) {
      throw new PlanParseError(
        index + 1,
        `line ${index + 1} is neither a ticket line nor a continuation line`,
      );
    }
    rawTickets.push(_startTicket(ticketMatch, index + 1, rawTickets.length + 1));
    index += 1;
  }
  return {
    frontmatter: frontmatter.text,
    preamble: preamble.text,
    contextSections,
    tickets: rawTickets.map((raw) => _finishTicket(raw)),
  };
}

/** Write one plan document. Sorts nothing. */
export function renderPlan(doc: PlanDocument): string {
  const blocks: string[] = [];
  const frontmatter = doc.frontmatter.trim();
  if (frontmatter) {
    blocks.push(frontmatter);
  }
  const preamble = doc.preamble.trim();
  if (preamble) {
    blocks.push(preamble);
  }
  for (const section of doc.contextSections) {
    blocks.push(_renderContextSection(section));
  }
  for (const ticket of doc.tickets) {
    blocks.push(_renderTicket(ticket).join("\n"));
  }
  if (blocks.length === 0) {
    return "";
  }
  return blocks.join("\n\n") + "\n";
}

// ---- reading ----

/** The frontmatter text and the index of the line after it. */
function _takeFrontmatter(
  lines: readonly string[],
): { text: string; index: number } {
  if (lines.length === 0 || lines[0].trim() !== FENCE) {
    return { text: "", index: 0 };
  }
  for (let index = 1; index < lines.length; index++) {
    if (lines[index].trim() === FENCE) {
      return { text: lines.slice(0, index + 1).join("\n"), index: index + 1 };
    }
  }
  throw new PlanParseError(1, "the frontmatter never closes");
}

/** The preamble text and the index of the first heading or ticket. */
function _takePreamble(
  lines: readonly string[],
  start: number,
): { text: string; index: number } {
  let index = start;
  while (
    index < lines.length &&
    !_isHeading(lines[index]) &&
    !TICKET_LINE.test(lines[index])
  ) {
    index += 1;
  }
  return { text: _trimBlankLines(lines.slice(start, index)), index };
}


/** One context section and the index of the line that ends it. */
function _takeContextSection(
  lines: readonly string[],
  start: number,
  sectionNumber: number,
): { section: ContextSection; index: number } {
  let index = start + 1;
  while (
    index < lines.length &&
    !_isHeading(lines[index]) &&
    !TICKET_LINE.test(lines[index])
  ) {
    index += 1;
  }
  return {
    section: {
      heading: lines[start].replace(/\s+$/, ""),
      text: _trimBlankLines(lines.slice(start + 1, index)),
      index: sectionNumber,
    },
    index,
  };
}

/** The working data of one ticket, before its body is complete. */
function _startTicket(
  match: RegExpExecArray,
  lineNumber: number,
  order: number,
): RawTicket {
  const first = match[4].trim();
  return {
    id: match[2],
    title: match[3],
    lines: first ? [first] : [],
    claimedState: MARK_STATES[match[1]],
    order,
    line: lineNumber,
  };
}

/** Split the body of one ticket from its criteria. */
function _finishTicket(raw: RawTicket): PlanTicket {
  const text = raw.lines.join("\n");
  if (!text.includes(CRITERIA_MARKER)) {
    throw new PlanParseError(
      raw.line,
      `line ${raw.line} starts a ticket that holds no ${CRITERIA_MARKER} marker`,
    );
  }
  const markerAt = text.indexOf(CRITERIA_MARKER);
  return {
    id: raw.id,
    title: raw.title,
    body: text.slice(0, markerAt).trim(),
    criteria: text.slice(markerAt + CRITERIA_MARKER.length).trim(),
    claimedState: raw.claimedState,
    order: raw.order,
  };
}

/** Say whether one line opens a phase or a context section. */
function _isHeading(line: string): boolean {
  return line.startsWith(HEADING_PREFIX);
}

/** Join lines, and drop the blank lines at the start and at the end. */
function _trimBlankLines(block: readonly string[]): string {
  let start = 0;
  let end = block.length;
  while (start < end && block[start].trim() === "") {
    start += 1;
  }
  while (end > start && block[end - 1].trim() === "") {
    end -= 1;
  }
  return block.slice(start, end).join("\n");
}

// ---- writing ----

/** The text of one context section, heading first. */
function _renderContextSection(section: ContextSection): string {
  const text = section.text.trim();
  if (!text) {
    return section.heading;
  }
  return `${section.heading}\n\n${text}`;
}


/** The lines of one ticket. Line two onward carry two spaces. */
function _renderTicket(ticket: PlanTicket): string[] {
  const head = `- [${STATE_MARKS[ticket.claimedState]}] **Ticket ${ticket.id}: ${ticket.title}.**`;
  const tail = `${CRITERIA_MARKER} ${ticket.criteria}`.trimEnd();
  const body = ticket.body.trim();
  const parts = body ? body.split("\n") : [""];
  parts[parts.length - 1] = `${parts[parts.length - 1]} ${tail}`.trim();
  const lines = [`${head} ${parts[0]}`.trimEnd()];
  for (const part of parts.slice(1)) {
    lines.push(CONTINUATION_PREFIX + part.trim());
  }
  return lines;
}

export { PlanParseError };
