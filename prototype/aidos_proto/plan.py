"""The plan document format.

This module turns a plan document into plain data, and plain data back into a
plan document. It knows nothing about the store, the database, or the command
line. Every function here is pure.

Document shape
--------------

parse_plan returns one dictionary with four keys:

    {"frontmatter": str, "preamble": str, "phases": [...],
     "context_sections": [...]}

A phase holds:

    {"number": int, "title": str, "state": str, "tickets": [...]}

A ticket holds:

    {"id": str, "title": str, "body": str, "criteria": str,
     "claimed_state": str, "order": int}

A context section holds:

    {"heading": str, "text": str, "index": int}

The heading keeps the "##" prefix. The text keeps every inner line. The parser
removes only the blank lines at the start and at the end of the text.

The index says how many phases come before the section in the document. The
renderer uses the index to put each section back between the right phases. The
index is optional. The renderer puts a section with no index after the last
phase.

Text rules
----------

* Frontmatter is optional. It starts on line 1 with a line that holds only
  three hyphens. It ends on the next line that holds only three hyphens. The
  parser keeps the frontmatter text, and the two fence lines, without a change.
* The text between the frontmatter and the first "##" heading is the preamble.
  The parser keeps the preamble without a change.
* A phase heading has this form, with an em dash before the state:

      ## Phase 1: Groundwork - `done`

* A ticket line has this form:

      - [ ] **Ticket 1: Read the kernel.** A body. **Evaluate:** A criterion.

  The title carries no period. The renderer adds the period. The marker
  "**Evaluate:**" is required. It may sit on a continuation line.
* A continuation line starts with two spaces. It adds one line to the body of
  the ticket above it.
* Inside a phase, only a blank line, a ticket line, and a continuation line are
  legal. Any other line raises PlanParseError with its line number.
* Any other "##" heading starts a context section.

Round trip
----------

render_plan(parse_plan(text)) gives a document that parses to the same data.
Two renders of the same data give the same bytes. The renderer walks the
phases, the tickets, and the context sections in document order, and it sorts
nothing.
"""

import re

# The mark that each line carries, and the state that the mark claims.
MARK_STATES = {
    " ": "open",
    "~": "in_progress",
    "?": "awaiting_verification",
    "x": "done",
}

# The reverse map, which the renderer uses.
STATE_MARKS = {state: mark for mark, state in MARK_STATES.items()}

# The fence that opens and closes the frontmatter.
FENCE = "---"

# The prefix of every heading that opens a phase or a context section.
HEADING_PREFIX = "## "

# The prefix of a continuation line.
CONTINUATION_PREFIX = "  "

# The marker that separates the body of a ticket from its criteria.
CRITERIA_MARKER = "**Evaluate:**"

PHASE_HEADING = re.compile(
    r"^## Phase (\d+):\s*(.+?)\s*\u2014\s*`([^`]*)`\s*$")

TICKET_LINE = re.compile(
    r"^- \[([ ~?x])\] \*\*Ticket ([^:]+): (.+?)\.\*\*\s?(.*)$")


class PlanParseError(Exception):
    """One line of a plan document that the parser refuses.

    The error carries the 1-based number of the line and a message. The text
    of the error names the line number.
    """

    def __init__(self, line, message):
        super().__init__(message)
        self.line = line
        self.message = message

    def __str__(self):
        return "line %d: %s" % (self.line, self.message)


def parse_plan(text):
    """Read one plan document and return its data.

    The function raises PlanParseError on the first line that breaks a rule.
    """
    lines = text.split("\n")
    frontmatter, index = _take_frontmatter(lines)
    preamble, index = _take_preamble(lines, index)
    phases = []
    context_sections = []
    while index < len(lines):
        match = PHASE_HEADING.match(lines[index])
        if match:
            phase, index = _take_phase(match, lines, index)
            phases.append(phase)
        else:
            section, index = _take_context_section(lines, index, len(phases))
            context_sections.append(section)
    return {
        "frontmatter": frontmatter,
        "preamble": preamble,
        "phases": phases,
        "context_sections": context_sections,
    }


def render_plan(doc):
    """Write one plan document from the data that parse_plan returns."""
    blocks = []
    frontmatter = doc["frontmatter"].strip()
    if frontmatter:
        blocks.append(frontmatter)
    preamble = doc["preamble"].strip()
    if preamble:
        blocks.append(preamble)
    phases = doc["phases"]
    sections = doc["context_sections"]
    for position in range(len(phases) + 1):
        for section in sections:
            if _section_position(section, len(phases)) == position:
                blocks.append(_render_context_section(section))
        if position < len(phases):
            blocks.append(_render_phase(phases[position]))
    if not blocks:
        return ""
    return "\n\n".join(blocks) + "\n"


# ---- reading ----


def _take_frontmatter(lines):
    """Return the frontmatter text and the index of the line after it."""
    if not lines or lines[0].strip() != FENCE:
        return "", 0
    for index in range(1, len(lines)):
        if lines[index].strip() == FENCE:
            return "\n".join(lines[:index + 1]), index + 1
    raise PlanParseError(1, "the frontmatter never closes")


def _take_preamble(lines, start):
    """Return the preamble text and the index of the first heading."""
    index = start
    while index < len(lines) and not _is_heading(lines[index]):
        index += 1
    return _trim_blank_lines(lines[start:index]), index


def _take_phase(match, lines, start):
    """Return one phase and the index of the line that ends it."""
    raw_tickets = []
    index = start + 1
    while index < len(lines) and not _is_heading(lines[index]):
        line = lines[index]
        number = index + 1
        if line.startswith(CONTINUATION_PREFIX) and line.strip():
            if not raw_tickets:
                raise PlanParseError(
                    number, "line %d continues a ticket, but the phase holds "
                    "no ticket yet" % number)
            raw_tickets[-1]["lines"].append(line.strip())
        elif line.strip():
            ticket_match = TICKET_LINE.match(line)
            if not ticket_match:
                raise PlanParseError(
                    number, "line %d is neither a ticket line nor a "
                    "continuation line" % number)
            raw_tickets.append(
                _start_ticket(ticket_match, number, len(raw_tickets) + 1))
        index += 1
    phase = {
        "number": int(match.group(1)),
        "title": match.group(2),
        "state": match.group(3),
        "tickets": [_finish_ticket(raw) for raw in raw_tickets],
    }
    return phase, index


def _take_context_section(lines, start, phase_count):
    """Return one context section and the index of the line that ends it."""
    index = start + 1
    while index < len(lines) and not _is_heading(lines[index]):
        index += 1
    section = {
        "heading": lines[start].rstrip(),
        "text": _trim_blank_lines(lines[start + 1:index]),
        "index": phase_count,
    }
    return section, index


def _start_ticket(match, line_number, order):
    """Return the working data of one ticket, before its body is complete."""
    first = match.group(4).strip()
    return {
        "id": match.group(2),
        "title": match.group(3),
        "lines": [first] if first else [],
        "claimed_state": MARK_STATES[match.group(1)],
        "order": order,
        "line": line_number,
    }


def _finish_ticket(raw):
    """Split the body of one ticket from its criteria and return the ticket."""
    text = "\n".join(raw["lines"])
    if CRITERIA_MARKER not in text:
        raise PlanParseError(
            raw["line"], "line %d starts a ticket that holds no %s marker"
            % (raw["line"], CRITERIA_MARKER))
    body, _, criteria = text.partition(CRITERIA_MARKER)
    return {
        "id": raw["id"],
        "title": raw["title"],
        "body": body.strip(),
        "criteria": criteria.strip(),
        "claimed_state": raw["claimed_state"],
        "order": raw["order"],
    }


def _is_heading(line):
    """Say whether one line opens a phase or a context section."""
    return line.startswith(HEADING_PREFIX)


def _trim_blank_lines(block):
    """Join lines, and drop the blank lines at the start and at the end."""
    start = 0
    end = len(block)
    while start < end and not block[start].strip():
        start += 1
    while end > start and not block[end - 1].strip():
        end -= 1
    return "\n".join(block[start:end])


# ---- writing ----


def _section_position(section, phase_count):
    """Return the number of phases that come before one context section."""
    position = section.get("index", phase_count)
    return max(0, min(position, phase_count))


def _render_context_section(section):
    """Return the text of one context section, heading first."""
    text = section["text"].strip()
    if not text:
        return section["heading"]
    return "%s\n\n%s" % (section["heading"], text)


def _render_phase(phase):
    """Return the text of one phase, heading first, then every ticket."""
    lines = ["## Phase %d: %s \u2014 `%s`"
             % (phase["number"], phase["title"], phase["state"])]
    if phase["tickets"]:
        lines.append("")
        for ticket in phase["tickets"]:
            lines.extend(_render_ticket(ticket))
    return "\n".join(lines)


def _render_ticket(ticket):
    """Return the lines of one ticket. Line two onward carry two spaces."""
    head = "- [%s] **Ticket %s: %s.**" % (
        STATE_MARKS[ticket["claimed_state"]], ticket["id"], ticket["title"])
    tail = ("%s %s" % (CRITERIA_MARKER, ticket["criteria"])).rstrip()
    body = ticket["body"].strip()
    parts = body.split("\n") if body else [""]
    parts[-1] = ("%s %s" % (parts[-1], tail)).strip()
    lines = [("%s %s" % (head, parts[0])).rstrip()]
    for part in parts[1:]:
        lines.append(CONTINUATION_PREFIX + part.strip())
    return lines
