/**
 * The plan document format. A verbatim port of prototype/aidos_proto/plan.py.
 * Pure functions. PLAN.md / SPEC.md section 12 is the contract.
 * If you change this parser, also update skills/aidos-plan/verify-plan.mjs, which mirrors it (and vice versa): keep the two in sync. */

import matter from "gray-matter";
import YAML from "yaml";

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

// A heading that opens a phase. Every other `## ` heading opens a context
// section.
const PHASE_HEADING = /^## Phase (\d+): (.+)$/;

// The state suffix of a phase title: an em dash and one backticked state
// word. The suffix is display text, not part of the title.
const PHASE_STATE_SUFFIX = / — `[^`]+`$/;

// The prefix of a continuation line.
const CONTINUATION_PREFIX = "  ";

// The marker that separates the body of a ticket from its criteria.
const CRITERIA_MARKER = "**Evaluate:**";
// M6 fix: title may contain dots; the split between title and body is the
// last ".\*\*" before body, not the first dot. Capture title greedily up to
// the final ".\*\*" on the line; verify by requiring the trailing ".\*\*".
const TICKET_LINE = /^- \[([ ~?x])\] \*\*Ticket ([^:]+): (.+)\.\*\*\s?(.*)$/;

/**
 * One phase heading of the document, deduped, in document order. The raw
 * text holds the heading after the `## ` prefix, so the renderer re-emits
 * the heading with one prefix.
 */
export interface PlanPhase {
  number: number;
  title: string;
  raw: string;
}

export interface PlanTicket {
  id: string;
  title: string;
  body: string;
  criteria: string;
  claimedState: TicketState;
  order: number;
  phase: number;
}

export interface PlanDocument {
  frontmatter: string;
  frontmatterData: Record<string, unknown>;
  preamble: string;
  contextSections: ContextSection[];
  tickets: PlanTicket[];
  phases: PlanPhase[];
}

/** The working data of one ticket before its body is complete. */
interface RawTicket {
  id: string;
  title: string;
  lines: string[];
  claimedState: TicketState;
  order: number;
  line: number;
  phase: number;
}

/** Read one plan document. Throws PlanParseError on the first bad line. */
export function parsePlan(text: string): PlanDocument {
  const lines = text.split("\n");
  const frontmatter = _takeFrontmatter(lines);
  const preamble = _takePreamble(lines, frontmatter.index);
  const contextSections: ContextSection[] = [];
  const rawTickets: RawTicket[] = [];
  // Tickets before the first phase heading take phase 1. A heading that is
  // not a phase marker never resets the phase.
  let currentPhase = 1;
  const phases: PlanPhase[] = [];
  const phaseNumbers = new Set<number>();
  let index = preamble.index;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (_isHeading(line)) {
      const phase = _phaseOfHeading(line);
      if (phase) {
        // A phase marker sets the phase of every ticket after it. The first
        // heading of one number is the record the renderer re-emits. The
        // prose between the marker and the next heading or ticket is
        // consumed and dropped, like context-section prose.
        currentPhase = phase.number;
        if (!phaseNumbers.has(phase.number)) {
          phaseNumbers.add(phase.number);
          phases.push(phase);
        }
        index += 1;
        while (
          index < lines.length &&
          !_isHeading(lines[index]) &&
          !TICKET_LINE.test(lines[index])
        ) {
          index += 1;
        }
        continue;
      }
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
    rawTickets.push(
      _startTicket(ticketMatch, index + 1, rawTickets.length + 1, currentPhase),
    );
    index += 1;
  }
  return {
    frontmatter: frontmatter.text,
    frontmatterData: _parseFrontmatterData(frontmatter.text),
    preamble: preamble.text,
    contextSections,
    phases,
    tickets: rawTickets.map((raw) => _finishTicket(raw)),
  };
}

/**
 * Write one plan document. The tickets keep their given order. The phase
 * headings emit in phase-number order, and the tickets of a phase with no
 * record emit before every phase heading.
 */
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
  for (const group of _ticketGroupsOf(doc)) {
    if (group.phase) {
      blocks.push(HEADING_PREFIX + group.phase.raw);
    }
    for (const ticket of group.tickets) {
      blocks.push(_renderTicket(ticket).join("\n"));
    }
  }
  if (blocks.length === 0) {
    return "";
  }
  return blocks.join("\n\n") + "\n";
}

/**
 * Group the tickets for rendering: first the tickets of a phase with no
 * phase record, then one group per recorded phase, ascending by number.
 */
function _ticketGroupsOf(
  doc: PlanDocument,
): Array<{ phase?: PlanPhase; tickets: PlanTicket[] }> {
  const recorded = [...doc.phases].sort((a, b) => a.number - b.number);
  const groups: Array<{ phase?: PlanPhase; tickets: PlanTicket[] }> = [];
  const unrecorded = doc.tickets.filter(
    (ticket) => !recorded.some((phase) => phase.number === ticket.phase),
  );
  if (unrecorded.length > 0) {
    groups.push({ tickets: unrecorded });
  }
  for (const phase of recorded) {
    groups.push({
      phase,
      tickets: doc.tickets.filter((ticket) => ticket.phase === phase.number),
    });
  }
  return groups;
}

// ---- reading ----

/** Take the frontmatter text and the index of the line after it. */
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

/** Parse the raw frontmatter block with gray-matter and the yaml engine. */
function _parseFrontmatterData(raw: string): Record<string, unknown> {
  if (raw === "") {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = matter(raw, {
      engines: {
        yaml: {
          parse: (s) => YAML.parse(s),
          stringify: (o) => YAML.stringify(o),
        },
      },
    }).data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PlanParseError(1, "the frontmatter is not valid YAML: " + message);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  return parsed as Record<string, unknown>;
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
  phase: number,
): RawTicket {
  const first = match[4].trim();
  return {
    id: match[2],
    title: match[3],
    lines: first ? [first] : [],
    claimedState: MARK_STATES[match[1]],
    order,
    line: lineNumber,
    phase,
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
  // The marker sits alone on its own continuation line. A marker line with
  // text after the marker is the old format, and the old format is refused.
  const markerLineAt = raw.lines.findIndex((line) =>
    line.includes(CRITERIA_MARKER),
  );
  const markerLine = raw.lines[markerLineAt];
  if (markerLine !== CRITERIA_MARKER) {
    throw new PlanParseError(
      raw.line,
      `line ${raw.line} holds a ${CRITERIA_MARKER} marker with text on the same line. Put the marker alone on its own line, and put "- criterion" lines after it.`,
    );
  }
  // Blank lines are dropped at read time, so every line after the marker is
  // one list item, or one wrap of the list item before it.
  const criteriaLines = raw.lines.slice(markerLineAt + 1).filter(
    (line) => line !== "",
  );
  if (criteriaLines.length === 0 || !criteriaLines[0].startsWith("- ")) {
    throw new PlanParseError(
      raw.line,
      `line ${raw.line} holds a ${CRITERIA_MARKER} marker with no list. Put one "- criterion" line after the marker for each criterion.`,
    );
  }
  const criteria: string[] = [];
  for (const line of criteriaLines) {
    if (line.startsWith("- ")) {
      criteria.push(line.slice(2).trim());
    } else {
      // A line with no "- " mark wraps the criterion before it. Join the
      // wrap with one space.
      criteria[criteria.length - 1] += " " + line.trim();
    }
  }
  return {
    id: raw.id,
    title: raw.title,
    body: raw.lines.slice(0, markerLineAt).join("\n").trim(),
    criteria: criteria.join("\n"),
    claimedState: raw.claimedState,
    order: raw.order,
    phase: raw.phase,
  };
}

/** Say whether one line opens a phase or a context section. */
function _isHeading(line: string): boolean {
  return line.startsWith(HEADING_PREFIX);
}

/** The phase one heading opens, or undefined when the heading is not one. */
function _phaseOfHeading(line: string): PlanPhase | undefined {
  const match = PHASE_HEADING.exec(line);
  if (!match) {
    return undefined;
  }
  return {
    number: Number(match[1]),
    title: _stripStateSuffix(match[2]),
    raw: line.slice(HEADING_PREFIX.length).replace(/\s+$/, ""),
  };
}

/** Drop the em-dash state suffix of a phase title, when present. */
function _stripStateSuffix(title: string): string {
  return title.replace(PHASE_STATE_SUFFIX, "").trim();
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


/**
 * The lines of one ticket. The body lines after the first carry two spaces.
 * The marker and every criteria line carry two spaces, and a blank line sits
 * between the body, the marker, and the criteria list. The document then
 * re-imports to the same fields.
 */
function _renderTicket(ticket: PlanTicket): string[] {
  const head = `- [${STATE_MARKS[ticket.claimedState]}] **Ticket ${ticket.id}: ${ticket.title}.**`;
  const body = ticket.body.trim();
  const bodyLines = body ? body.split("\n") : [];
  const lines = [`${head} ${bodyLines[0] ?? ""}`.trimEnd()];
  for (const part of bodyLines.slice(1)) {
    lines.push(CONTINUATION_PREFIX + part.trim());
  }
  lines.push("");
  lines.push(CONTINUATION_PREFIX + CRITERIA_MARKER);
  lines.push("");
  for (const criterion of ticket.criteria.trim().split("\n")) {
    lines.push(`${CONTINUATION_PREFIX}- ${criterion.trim()}`);
  }
  return lines;
}

export { PlanParseError };
