#!/usr/bin/env node
// verify-plan.mjs — check that a PLAN.md parses under aidos's parsePlan.
//
// Two modes:
//   1. Repo mode. When the aidos checkout sits above this script and esbuild is
//      installed, the script bundles src/plan/plan.ts and runs the REAL parser.
//      This mode also supports --verbose, which prints the parsed document.
//   2. Mirror mode. Without the checkout the script falls back to a small
//      mirror of the same grammar, so the skill still works when it is copied
//      to ~/.dsh/skills. The mirror reports the same errors. If you change
//      parsePlan, update the mirror to match, and vice versa.
//
// Usage: verify-plan.mjs [--verbose] [path]
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

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
      // Context section: consume until the next heading or ticket. A
      // `## Phase N: <title>` heading counts here too: parsePlan skips a
      // phase marker and its prose, so the validation walk is the same.
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
  console.log("phases:");
  for (const phase of doc.phases) {
    console.log(`  ${phase.number}: ${phase.title}`);
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
