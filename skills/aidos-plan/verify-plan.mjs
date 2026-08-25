#!/usr/bin/env node
// verify-plan.mjs — check that a PLAN.md parses under aidos's parsePlan.
//
// This script MIRRORS src/plan/plan.ts so it reports the same errors without
// needing the aidos build or a TypeScript loader. If you change parsePlan,
// update this script to match, and vice versa: keep the two in sync. The
// skill that owns this file is skills/aidos-plan (see its SKILL.md).
import { readFileSync } from "node:fs";

const TICKET_LINE = /^- \[([ ~?x])\] \*\*Ticket ([^:]+): (.+?)\.\*\*\s?(.*)$/;
const HEADING_PREFIX = "## ";
const CONTINUATION_PREFIX = "  ";
const CRITERIA_MARKER = "**Evaluate:**";

function verify(text) {
  const lines = text.split("\n");
  const errors = [];
  let index = 0;

  // Frontmatter: optional, fenced with --- at the very top.
  if (lines[0]?.trim() === "---") {
    let i = 1;
    for (; i < lines.length; i++) {
      if (lines[i].trim() === "---") break;
    }
    if (i >= lines.length) {
      errors.push("line 1: the frontmatter never closes");
      return { errors, ticketCount: 0 };
    }
    index = i + 1;
  }

  // Preamble: text before the first heading or ticket.
  while (
    index < lines.length &&
    !lines[index].startsWith(HEADING_PREFIX) &&
    !TICKET_LINE.test(lines[index])
  ) {
    index += 1;
  }

  const tickets = [];
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (line.startsWith(HEADING_PREFIX)) {
      // Context section: consume until the next heading or ticket.
      index += 1;
      while (
        index < lines.length &&
        !lines[index].startsWith(HEADING_PREFIX) &&
        !TICKET_LINE.test(lines[index])
      ) {
        index += 1;
      }
      continue;
    }
    if (line.startsWith(CONTINUATION_PREFIX)) {
      if (tickets.length === 0) {
        errors.push(
          `line ${index + 1}: continues a ticket, but the document holds no ticket yet`,
        );
      } else {
        tickets[tickets.length - 1].body.push(line.trim());
      }
      index += 1;
      continue;
    }
    const m = TICKET_LINE.exec(line);
    if (!m) {
      errors.push(
        `line ${index + 1}: neither a ticket line nor a continuation line`,
      );
      index += 1;
      continue;
    }
    tickets.push({ line: index + 1, body: m[4].trim() ? [m[4].trim()] : [] });
    index += 1;
  }

  for (const t of tickets) {
    if (!t.body.join("\n").includes(CRITERIA_MARKER)) {
      errors.push(`line ${t.line}: ticket has no ${CRITERIA_MARKER} marker`);
    }
  }

  return { errors, ticketCount: tickets.length };
}

const path = process.argv[2] || "PLAN.md";
let text;
try {
  text = readFileSync(path, "utf8");
} catch (e) {
  console.error(`cannot read ${path}: ${e.message}`);
  process.exit(2);
}
const { errors, ticketCount } = verify(text);
if (errors.length === 0) {
  console.log(`OK: ${path} parses (${ticketCount} tickets)`);
  process.exit(0);
} else {
  console.log(`PARSE ERRORS in ${path} (${ticketCount} tickets):`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
