#!/usr/bin/env node
// verify-plan.mjs — check that a PLAN.md parses under aidos's parsePlan.
//
// Two grammars, one sniffer (src/plan/plan.ts is truth):
//   - Literate (#153, the only shape the renderer emits): each ticket is a
//     `## Ticket <id> — <title>` heading (em dash) followed by one ```yaml
//     block carrying `state`, `description`, and `criteria`.
//   - Legacy (pre-#153): `- [MARK] **Ticket ID: Title.**` lines with an
//     `**Evaluate:**` marker. Still imports; the renderer never emits it.
//   parsePlan sniffs the whole document first: any legacy ticket line wins,
//   so an old document is never half-read by the new parser. A document
//   with neither shape falls to the legacy parser, whose refusals name the
//   first bad line.
//
// Two modes:
//   1. Repo mode. When the aidos checkout sits above this script and esbuild is
//      installed, the script bundles src/plan/plan.ts and runs the REAL parser.
//      This mode also supports --verbose, which prints the parsed document.
//   2. Mirror mode. Without the checkout the script falls back to a small
//      mirror of both grammars, so the skill still works when it is copied
//      to ~/.dsh/skills. The mirror names the same offending lines as
//      parsePlan; its wording may differ slightly. The mirror is structural:
//      exotic-but-valid YAML (anchors, flow maps) is the real parser's
//      territory, so in repo mode the real parser runs first and the mirror
//      checks on top of it. If you change parsePlan, update the mirror to
//      match, and vice versa.
//
// Usage: verify-plan.mjs [--verbose] [path]
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

// M6 fix, mirrored: the title may contain dots, so the split between title
// and body is the LAST ".**" on the line, not the first.
const TICKET_LINE = /^- \[([ ~?x])\] \*\*Ticket ([^:]+): (.+)\.\*\*\s?(.*)$/;
// The heading that opens one literate ticket. The dash is an em dash (—).
const LITERATE_TICKET_HEADING = /^## Ticket (.+?) — (.+)$/;
const HEADING_PREFIX = "## ";
const CONTINUATION_PREFIX = "  ";
const CRITERIA_MARKER = "**Evaluate:**";
const OPEN_FENCE = /^```yaml\s*$/;
const CLOSE_FENCE = /^```\s*$/;
// The fields a literate ticket's yaml block may carry. Anything else is a
// refusal that names the field, not a silent ignore.
const TICKET_FIELDS = ["state", "description", "criteria"];
// The states a ticket may claim, and their literate spellings.
const TICKET_STATES = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done",
];

/**
 * Say whether a document reads as literate: it holds a
 * `## Ticket <id> — <title>` heading and no legacy ticket line. A legacy
 * line wins the sniff; a document with neither shape falls to the legacy
 * parser, whose refusals name the first bad line.
 */
function verify(text) {
  const lines = text.split("\n");
  let legacy = false;
  let literate = false;
  for (const line of lines) {
    if (TICKET_LINE.test(line)) {
      legacy = true;
    }
    if (LITERATE_TICKET_HEADING.test(line)) {
      literate = true;
    }
  }
  if (literate && !legacy) {
    return verifyLiterate(lines);
  }
  return verifyLegacy(lines);
}

/** Read one literate plan document, naming the offending line. */
function verifyLiterate(lines) {
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

  // Preamble: text before the first heading. (A legacy ticket line would
  // have flipped the whole document to the legacy grammar above, so the
  // preamble consumes everything up to the first `## ` line.)
  while (index < lines.length && !lines[index].startsWith(HEADING_PREFIX)) {
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
      const heading = LITERATE_TICKET_HEADING.exec(line);
      if (heading) {
        checkLiterateTicket(lines, index, heading, errors);
        tickets.push({ line: index + 1 });
        index = endOfLiterateTicket(lines, index);
        continue;
      }
      // Context section: consume until the next heading or ticket heading.
      // A `## Phase N: ...` heading counts here too: it is prose, not phase
      // state — the plan is flat and every ticket imports as phase 1.
      index += 1;
      while (
        index < lines.length &&
        !lines[index].startsWith(HEADING_PREFIX)
      ) {
        index += 1;
      }
      continue;
    }
    errors.push(
      `line ${index + 1}: neither a ticket heading nor a context section heading`,
    );
    index += 1;
  }

  return { errors, ticketCount: tickets.length };
}

/**
 * Check one literate ticket: the heading, then, after blank lines, one
 * fenced yaml block carrying `state` and `criteria`. Every refusal names
 * the offending line.
 */
function checkLiterateTicket(lines, headingIndex, heading, errors) {
  const id = heading[1].trim();
  let index = headingIndex + 1;
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }
  if (index >= lines.length || !OPEN_FENCE.test(lines[index])) {
    errors.push(
      `line ${headingIndex + 1}: opens ticket ${id} but no \`\`\`yaml block follows it`,
    );
    return;
  }
  const fenceLine = index + 1;
  let close = -1;
  for (let i = index + 1; i < lines.length; i++) {
    if (CLOSE_FENCE.test(lines[i])) {
      close = i;
      break;
    }
  }
  if (close === -1) {
    errors.push(`line ${fenceLine}: the yaml block never closes`);
    return;
  }
  checkTicketBlock(lines.slice(index + 1, close), fenceLine, id, errors);
}

/** The index of the first line after one literate ticket's yaml block. Never throws. */
function endOfLiterateTicket(lines, headingIndex) {
  let index = headingIndex + 1;
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }
  if (index >= lines.length || !OPEN_FENCE.test(lines[index])) {
    // The missing block is already recorded; continue after the blanks so
    // one bad ticket does not cascade into its neighbours.
    return index;
  }
  for (let i = index + 1; i < lines.length; i++) {
    if (CLOSE_FENCE.test(lines[i])) {
      return i + 1;
    }
  }
  // Unclosed: already recorded. Consume the rest, for the same reason.
  return lines.length;
}

/** Strip one pair of surrounding single or double quotes. */
function unquote(value) {
  if (value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

/** Split a flow sequence or mapping body on depth-0 commas. */
function splitFlow(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "[" || ch === "{") {
      depth += 1;
    } else if (ch === "]" || ch === "}") {
      depth -= 1;
    } else if (ch === "," && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

/**
 * Check one ticket block's fields against the ticket schema: `state` is
 * required and spelled out, `description` is optional prose, `criteria` is
 * a required non-empty list, and anything else is refused by name. The
 * reader is structural — the real parser owns exotic YAML — so anything it
 * cannot classify stays silent for the real parser to judge.
 */
function checkTicketBlock(blockLines, fenceLine, id, errors) {
  const fail = (detail) => errors.push(`line ${fenceLine}: ${detail}`);
  const fields = new Map();
  const order = [];
  let sawListItem = false;

  const meaningful = blockLines.filter((line) => {
    const t = line.trim();
    return t !== "" && !t.startsWith("#") && t !== "..." && !/^---(\s|$)/.test(t);
  });
  if (meaningful.length === 0) {
    fail(
      `holds ticket ${id} with a \`state\` that is not one of ${TICKET_STATES.join(", ")}`,
    );
    return;
  }
  // Exotic mapping syntax (explicit `?` keys, directives) is valid YAML the
  // structural reader cannot classify. Stay silent and let the real parser
  // judge it, rather than misreading the fields.
  if (meaningful.some((line) => /^\?(\s|$)/.test(line) || /^%(\s|$)/.test(line))) {
    return;
  }
  if (/^\{/.test(meaningful[0].trim())) {
    parseFlowMapping(blockLines, fields, order);
  } else {
    // A tab in the first column is never valid YAML outside flow
    // collections (comments already filtered above; a tab after spaces is
    // legal content, so only a leading tab fails).
    const tabbed = meaningful.find((line) => /^\t/.test(line));
    if (tabbed !== undefined) {
      fail("the yaml block is not valid YAML: tabs are not allowed as indentation");
      return;
    }
    if (/^-\s/.test(meaningful[0]) || meaningful[0].trim() === "-") {
      sawListItem = true;
    } else {
      parseBlockFields(blockLines, fields, order);
    }
  }
  if (sawListItem || (order.length === 0 && fields.size === 0)) {
    fail("the yaml block must hold a mapping of named fields");
    return;
  }

  const unknown = order.filter((key) => !TICKET_FIELDS.includes(key));
  if (unknown.length > 0) {
    fail(
      `holds ticket ${id} with unknown field(s) ${unknown.map((key) => `\`${key}\``).join(", ")}`,
    );
    return;
  }

  // state: required, one of the four words, spelled out.
  const state = fields.get("state");
  if (state === undefined || !TICKET_STATES.includes(stateValue(state))) {
    fail(
      `holds ticket ${id} with a \`state\` that is not one of ${TICKET_STATES.join(", ")}`,
    );
    return;
  }

  // description: optional prose. A flow collection is never prose.
  const description = fields.get("description");
  if (description !== undefined && description.kind === "collection") {
    fail(`holds ticket ${id} with a \`description\` that is not text`);
    return;
  }

  // criteria: required, a non-empty list of non-empty lines.
  const criteria = fields.get("criteria");
  if (criteria === undefined || !criteriaNonEmpty(criteria)) {
    fail(
      `holds ticket ${id} with \`criteria\` that is not a non-empty list of criteria text`,
    );
  }
}

/** One field's parsed shape: scalar text, a list of items, or a collection. */
function parseBlockFields(blockLines, fields, order) {
  let current = null;
  for (const line of blockLines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      // A column-0 line opens a field: `key: value`. Anything else at
      // column 0 is exotic YAML the real parser judges; stay silent.
      const m = /^([^:\s#][^:]*):(\s|$)/.exec(line);
      if (!m) {
        current = null;
        continue;
      }
      const key = unquote(m[1].trim());
      const rest = line.slice(m[0].length);
      current = { inline: rest.trim(), items: [] };
      if (!fields.has(key)) {
        order.push(key);
      }
      fields.set(key, current);
      continue;
    }
    if (current) current.items.push(line);
  }
  for (const [key, field] of fields) {
    fields.set(key, classifyField(field));
  }
}

/** One flow-mapping block (`{state: open, ...}`), parsed at depth 0. */
function parseFlowMapping(blockLines, fields, order) {
  const raw = blockLines.join("\n").trim();
  if (!raw.endsWith("}")) {
    return;
  }
  // Quoted escapes the splitter cannot track: stay silent and let the real
  // parser judge, rather than mis-splitting the fields.
  if (/\\/.test(raw) || /''/.test(raw)) {
    return;
  }
  for (const part of splitFlow(raw.slice(1, -1))) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const key = unquote(part.slice(0, colon).trim());
    const value = part.slice(colon + 1).trim();
    if (!fields.has(key)) order.push(key);
    if (value.startsWith("[")) {
      fields.set(key, {
        kind: "list",
        items: value.endsWith("]")
          ? splitFlow(value.slice(1, -1)).map((item) => unquote(item.trim()))
          : [],
      });
    } else if (value.startsWith("{") || value === "") {
      fields.set(key, { kind: "collection" });
    } else {
      fields.set(key, { kind: "scalar", value: unquote(value) });
    }
  }
}

/** Classify one block-style field into scalar, list, or collection. */
function classifyField(field) {
  const inline = field.inline;
  if (inline !== "") {
    // A block scalar (`|`/`>`) or quoted/plain scalar is prose-or-word;
    // the schema checks below judge the value. A flow collection is never
    // prose, and a scalar word is never a list.
    if (inline.startsWith("[")) {
      return {
        kind: "list",
        items: inline.endsWith("]")
          ? splitFlow(inline.slice(1, -1)).map((item) => unquote(item.trim()))
          : [],
      };
    }
    if (inline.startsWith("{")) {
      return { kind: "collection" };
    }
    if (/^[|>][+-]?$/.test(inline)) {
      // A block scalar header: the attached lines are the text. The state
      // check below refuses it (a scalar header never spells a bare word),
      // which agrees with the real parser.
      return { kind: "scalar", value: "\n" };
    }
    return { kind: "scalar", value: unquote(inline) };
  }
  const items = field.items.filter((line) => {
    const t = line.trim();
    return t !== "" && !t.startsWith("#");
  });
  if (items.length === 0) {
    return { kind: "empty" };
  }
  if (items.every((line) => /^\s*-\s/.test(line) || line.trim() === "-")) {
    return {
      kind: "list",
      items: items.map((line) => {
        const t = line.trim();
        return t === "-" ? "" : t.replace(/^-\s+/, "");
      }),
    };
  }
  if (items.some((line) => /^\s*-\s/.test(line))) {
    // Mixed list and prose: keep the list lines and let the schema check
    // run on them; the real parser judges the YAML itself.
    return {
      kind: "list",
      items: items
        .filter((line) => /^\s*-\s/.test(line))
        .map((line) => line.trim().replace(/^-\s+/, "")),
    };
  }
  if (items.some((line) => /^\s+[^:\s#][^:]*:\s/.test(line))) {
    return { kind: "collection" };
  }
  return { kind: "scalar", value: items.map((line) => line.trim()).join(" ") };
}

/** The effective word of a `state` field, or null when it has none. */
function stateValue(field) {
  if (field.kind === "scalar") return field.value;
  return null;
}

/** Say whether a `criteria` field is a non-empty list of non-empty lines. */
function criteriaNonEmpty(field) {
  if (field.kind !== "list") return false;
  return field.items.some((item) => item.trim() !== "");
}

/**
 * The legacy parser: the pre-literacy flat format, kept as the migration
 * path so a plan written before #153 still imports. It parses exactly what
 * it parsed before; the renderer never emits this shape again.
 */
function verifyLegacy(text) {
  const lines = Array.isArray(text) ? text : text.split("\n");
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
      // Context section: consume until the next heading or ticket. A
      // legacy `## Phase N: <title>` heading counts here too: it is prose,
      // not phase state — the plan is flat and every ticket imports as
      // phase 1.
      index += 1;
      while (
        index < lines.length &&
        !lines[index].startsWith(HEADING_PREFIX) &&
        !TICKET_LINE.test(lines[index]) &&
        !LITERATE_TICKET_HEADING.test(lines[index])
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
    tickets.push({
      line: index + 1,
      body: m[4].trim() ? [m[4].trim()] : [],
    });
    index += 1;
  }

  for (const t of tickets) {
    checkCriteria(t, errors);
  }

  return { errors, ticketCount: tickets.length };
}

/** Check the criteria list of one legacy ticket against the list format. */
function checkCriteria(t, errors) {
  const markerIdx = t.body.findIndex((l) => l.includes(CRITERIA_MARKER));
  if (markerIdx === -1) {
    errors.push(
      `line ${t.line} starts a ticket that holds no ${CRITERIA_MARKER} marker`,
    );
    return;
  }
  const marker = t.body[markerIdx];
  if (marker !== CRITERIA_MARKER) {
    errors.push(
      `line ${t.line} holds a ${CRITERIA_MARKER} marker with text on the same line. Put the marker alone on its own line, and put "- criterion" lines after it.`,
    );
    return;
  }
  const criteria = t.body.slice(markerIdx + 1).filter((l) => l !== "");
  if (criteria.length === 0 || !criteria[0].startsWith("- ")) {
    errors.push(
      `line ${t.line} holds a ${CRITERIA_MARKER} marker with no list. Put one "- criterion" line after the marker for each criterion.`,
    );
  }
}

/** The aidos checkout above this script, or null when it is not there. */
function repoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let step = 0; step < 5; step++) {
    try {
      readFileSync(join(dir, "src", "plan", "plan.ts"), "utf8");
      return dir;
    } catch {
      dir = dirname(dir);
    }
  }
  return null;
}

/** The real parsePlan, bundled on the fly, or null when that is not possible. */
async function loadRealParser(root) {
  if (root === null) return null;
  let esbuild;
  try {
    esbuild = await import(join(root, "node_modules", "esbuild", "lib", "main.js"));
  } catch (e) {
    if (process.env.VERIFY_PLAN_DEBUG) console.error("esbuild import failed: " + e.message);
    return null;
  }
  try {
    const built = await esbuild.build({
      entryPoints: [join(root, "src", "plan", "plan.ts")],
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      target: "node20",
      // gray-matter calls require at runtime, so the ESM bundle needs a shim.
      banner: {
        js: "import { createRequire as _cr } from 'node:module'; const require = _cr(import.meta.url);",
      },
    });
    const dir = mkdtempSync(join(tmpdir(), "aidos-plan-"));
    const file = join(dir, "plan.mjs");
    writeFileSync(file, built.outputFiles[0].text, "utf8");
    const module = await import(file);
    return module.parsePlan ?? null;
  } catch (e) {
    if (process.env.VERIFY_PLAN_DEBUG) console.error("bundle failed: " + e.message);
    return null;
  }
}

/** Print the parsed document, so a human can check what the import will store. */
function printDocument(doc) {
  console.log(`frontmatter: ${doc.frontmatter === "" ? "(none)" : "present"}`);
  const data = doc.frontmatterData ?? {};
  const keys = Object.keys(data);
  if (keys.length > 0) {
    console.log(`frontmatter fields: ${keys.join(", ")}`);
  }
  console.log(`preamble: ${doc.preamble.split("\n").length} lines`);
  console.log("context sections:");
  for (const section of doc.contextSections) {
    console.log(`  ${section.heading} (${section.text.split("\n").length} lines)`);
  }
  console.log("tickets:");
  for (const ticket of doc.tickets) {
    const criteria = ticket.criteria === "" ? [] : ticket.criteria.split("\n");
    console.log("");
    console.log(`  [${ticket.id}] phase ${ticket.phase} order ${ticket.order} state ${ticket.claimedState}`);
    console.log(`    title: ${ticket.title}`);
    console.log(`    body (${ticket.body.length} chars): ${ticket.body}`);
    console.log(`    criteria (${criteria.length}):`);
    for (const line of criteria) {
      console.log(`      - ${line}`);
    }
  }
}

const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const path = args.find((a) => !a.startsWith("-")) ?? "PLAN.md";
let text;
try {
  text = readFileSync(path, "utf8");
} catch (e) {
  console.error(`cannot read ${path}: ${e.message}`);
  process.exit(2);
}

const root = repoRoot();
const parsePlan = await loadRealParser(root);

if (parsePlan !== null) {
  let doc;
  try {
    doc = parsePlan(text);
  } catch (e) {
    console.log(`PARSE ERROR in ${resolve(path)}: ${e.message}`);
    process.exit(1);
  }
  // The mirror checks the document shape on top of the real parser, so the
  // two can never drift apart silently: a mirror refusal after a real-parser
  // pass is a mirror bug, and a real-parser refusal the mirror misses is
  // still reported above.
  const mirror = verify(text);
  if (mirror.errors.length > 0) {
    console.log(`PARSE ERRORS in ${path} (${mirror.ticketCount} tickets):`);
    for (const e of mirror.errors) console.log(`  ${e}`);
    process.exit(1);
  }
  console.log(`OK: ${path} parses (${doc.tickets.length} tickets, real parser)`);
  if (verbose) printDocument(doc);
  process.exit(0);
}

if (verbose) {
  console.log(
    "note: --verbose needs the aidos checkout and esbuild. Falling back to the mirror, which only validates.",
  );
}
const { errors, ticketCount } = verify(text);
if (errors.length === 0) {
  console.log(`OK: ${path} parses (${ticketCount} tickets, mirror)`);
  process.exit(0);
} else {
  console.log(`PARSE ERRORS in ${path} (${ticketCount} tickets):`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
