/**
 * P12. The plan import fields: phase headings, the description field, and
 * the multi line criteria round trip, through the live plan_import and plan
 * tools.
 *
 * The contract:
 * - A `## Phase <N>: <title>` heading sets the phase number and title of
 *   every ticket after it, until the next phase heading. An em-dash state
 *   suffix is not part of the title. Tickets before any phase heading and
 *   tickets under headings that do not match get phase 1.
 * - The parsed ticket body lands in the description field, and the body
 *   field holds "".
 * - The export prefixes the marker and every criteria line with two spaces, so
 *   the document re-imports to identical criteria.
 * - The export emits one `## Phase N: <title>` heading per phase, so a
 *   phased document round trips, while a flat document stays flat.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import type { PhaseSetEvent } from "../src/kernel/events";
import {
  asContext,
  createHarness,
  failureJson,
  successJson,
  type Harness,
} from "./b1-harness";

/** A phased plan document. The phase 2 heading carries the em-dash state suffix. */
const PHASED_PLAN = `# Phased plan

## Phase 2: aidos core — \`in_progress\`

- [ ] **Ticket 1: Read the kernel.** Note the store API.

  **Evaluate:**

  - The notes name every public method.
- [ ] **Ticket 2: Choose the flags.** Pick one spelling for each flag.

  **Evaluate:**

  - Every flag appears once in the docstring.

## Phase 5: launch

- [ ] **Ticket 3: Write the suite.** One module per subject.

  **Evaluate:**

  - The suite fails on the missing module.
`;

/** A phase heading, then a non-phase heading, then a ticket. The ticket keeps phase 3. */
const NON_PHASE_HEADING_PLAN = `## Phase 3: groundwork

- [ ] **Ticket 1: First.** Do the work.

  **Evaluate:**

  - The work is done.

## Critical context

The parser keeps this text.

- [ ] **Ticket 2: Second.** Do more work.

  **Evaluate:**

  - The work is done.
`;

/** A ticket before any phase heading, then a phase heading, then a ticket. */
const EARLY_TICKET_PLAN = `
- [ ] **Ticket 1: Early.** Do the work.

  **Evaluate:**

  - The work is done.

## Phase 4: later

- [ ] **Ticket 2: Late.** Do the work.

  **Evaluate:**

  - The work is done.
`;

/** A two line body. The prose must land in the description. */
const BODY_PLAN = `- [ ] **Ticket 1: Choose the flags.** Pick one spelling for each flag.
  Keep the spelling the same in every subcommand.

  **Evaluate:**

  - Every flag appears once in the docstring.
`;

/** A flat document whose criteria spans two lines. */
const MULTI_CRITERIA_PLAN = `
- [ ] **Ticket 1: Write the suite.** One module for each subject.

  **Evaluate:**

  - The suite fails on the missing module.
  - The suite covers every subcommand.
`;

/** A phased document with a two line body and a two line criteria field. */
const PHASED_MULTI_CRITERIA_PLAN = `# Phased plan

## Phase 2: aidos core — \`in_progress\`

- [ ] **Ticket 1: Read the kernel.** Note the store API.
  The notes name every public method.

  **Evaluate:**

  - Every public method appears in the notes.
- [ ] **Ticket 2: Choose the flags.** Pick one spelling.

  **Evaluate:**

  - Every flag appears once in the docstring.
  - The spelling holds in every subcommand.

## Phase 5: launch

- [ ] **Ticket 3: Write the suite.** One module per subject.

  **Evaluate:**

  - The suite fails on the missing module.
`;

/** A flat document with two tickets and a two line criteria field. */
const FLAT_PLAN = `
- [ ] **Ticket 1: Read the kernel.** Note the store API.

  **Evaluate:**

  - The notes name every public method.
- [ ] **Ticket 2: Choose the flags.** Pick one spelling.

  **Evaluate:**

  - Every flag appears once in the docstring.
  - The spelling holds in every subcommand.
`;

/** Build one harness with the service installed and the tools applied. */
function makeHarness(): Harness {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

/** The ticket rows of one project, sorted by phase and order. */
async function ticketRows(harness: Harness): Promise<Record<string, unknown>[]> {
  const listed = successJson(await harness.runTool("get_tickets", {}));
  return (listed.tickets as Record<string, unknown>[]) ?? [];
}

/** The five plan fields of one row set, in row order. */
function planFieldsOf(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    title: row.title,
    phase: row.phase,
    order: row.order,
    criteria: row.criteria,
    description: row.description,
  }));
}

/** The text of one plan export. */
async function exportPlanText(harness: Harness): Promise<string> {
  const outcome = await harness.runTool("plan", {});
  expect(outcome.isError).toBe(false);
  return (outcome.content[0] as { type: "text"; text: string }).text;
}

describe("plan import fields", () => {
  let harness: Harness;

  /** Import one plan document into a fresh harness. */
  const importPlan = async (text: string): Promise<Record<string, unknown>> => {
    harness = makeHarness();
    const planFile = harness.tempPlanFile(text);
    return successJson(await harness.runTool("plan_import", { file: planFile }));
  };

  it("a phased plan imports the heading numbers and titles", async () => {
    await importPlan(PHASED_PLAN);

    const rows = await ticketRows(harness);
    expect(rows.map((row) => row.phase)).toEqual([2, 2, 5]);
    expect(rows.map((row) => row.order)).toEqual([1, 2, 3]);
    expect(rows.map((row) => row.title)).toEqual([
      "Read the kernel",
      "Choose the flags",
      "Write the suite",
    ]);

    const phaseEvents = harness
      .aidosEvents(harness.agent)
      .filter((event) => event.kind === "phase/set") as PhaseSetEvent[];
    expect(phaseEvents.map((event) => event.number)).toEqual([2, 5]);
    expect(phaseEvents.map((event) => event.title)).toEqual([
      "aidos core",
      "launch",
    ]);
  });

  it("a ticket under a non-phase heading keeps the last phase number", async () => {
    await importPlan(NON_PHASE_HEADING_PLAN);

    const rows = await ticketRows(harness);
    expect(rows.map((row) => row.title)).toEqual(["First", "Second"]);
    expect(rows.map((row) => row.phase)).toEqual([3, 3]);
  });

  it("tickets before any phase heading get phase 1", async () => {
    await importPlan(EARLY_TICKET_PLAN);

    const rows = await ticketRows(harness);
    expect(rows.map((row) => row.title)).toEqual(["Early", "Late"]);
    expect(rows.map((row) => row.phase)).toEqual([1, 4]);
  });

  it("the body prose lands in the description and the body holds empty text", async () => {
    await importPlan(BODY_PLAN);

    const rows = await ticketRows(harness);
    expect(rows[0].description).toBe(
      "Pick one spelling for each flag.\nKeep the spelling the same in every subcommand.",
    );
    expect(rows[0].body).toBe("");
  });

  it("a multi criteria document round trips its criteria", async () => {
    await importPlan(MULTI_CRITERIA_PLAN);

    const firstCriteria =
      "The suite fails on the missing module.\nThe suite covers every subcommand.";
    const rows = await ticketRows(harness);
    expect(rows[0].criteria).toBe(firstCriteria);

    const exportedText = await exportPlanText(harness);
    expect(exportedText).toContain(
      "  - The suite fails on the missing module.",
    );
    expect(exportedText).toContain("\n  - The suite covers every subcommand.");

    const importer = makeHarness();
    const secondFile = importer.tempPlanFile(exportedText);
    successJson(await importer.runTool("plan_import", { file: secondFile }));
    const secondRows = await ticketRows(importer);
    expect(secondRows[0].criteria).toBe(firstCriteria);
  });

  it("a phased document with multi line criteria round trips", async () => {
    await importPlan(PHASED_MULTI_CRITERIA_PLAN);

    const firstData = planFieldsOf(await ticketRows(harness));
    expect(firstData.map((row) => row.phase)).toEqual([2, 2, 5]);

    const exportedText = await exportPlanText(harness);
    const headingCount = exportedText.split("## Phase 2: aidos core").length - 1;
    expect(headingCount).toBe(1);

    const importer = makeHarness();
    const secondFile = importer.tempPlanFile(exportedText);
    successJson(await importer.runTool("plan_import", { file: secondFile }));
    const secondData = planFieldsOf(await ticketRows(importer));
    expect(secondData).toEqual(firstData);
  });

  it("a flat document imports to phase 1 and exports no phase headings", async () => {
    await importPlan(FLAT_PLAN);

    const firstData = planFieldsOf(await ticketRows(harness));
    expect(firstData.map((row) => row.phase)).toEqual([1, 1]);

    const exportedText = await exportPlanText(harness);
    expect(exportedText).not.toMatch(/## Phase /);

    const importer = makeHarness();
    const secondFile = importer.tempPlanFile(exportedText);
    successJson(await importer.runTool("plan_import", { file: secondFile }));
    const secondData = planFieldsOf(await ticketRows(importer));
    expect(secondData).toEqual(firstData);
  });
/** A document whose one criterion wraps onto a second line. */
const WRAPPED_CRITERION_PLAN = `- [ ] **Ticket 1: Write the suite.** One module for each subject.

  **Evaluate:**

  - the suite covers every subcommand and
  every helper module
`;

/** A document whose ticket holds three criteria. */
const THREE_CRITERIA_PLAN = `- [ ] **Ticket 1: Write the suite.** One module for each subject.

  **Evaluate:**

  - first.
  - second.
  - third.
`;

  it("a document in the old format is refused, and the error names the line", async () => {
    const oldFormatPlan = `- [ ] **Ticket 1: Do the work.** A body. **Evaluate:** The work is done.\n`;
    harness = makeHarness();
    const planFile = harness.tempPlanFile(oldFormatPlan);
    const refusal = failureJson(
      await harness.runTool("plan_import", { file: planFile }),
    );
    expect(refusal.error).toBe("plan_parse_error");
    expect(refusal.line).toBe(1);
    expect(String(refusal.message)).toContain("text on the same line");
  });

  it("a wrapped list item parses as one criterion, not two", async () => {
    await importPlan(WRAPPED_CRITERION_PLAN);

    const rows = await ticketRows(harness);
    expect(rows[0].criteria).toBe(
      "the suite covers every subcommand and every helper module",
    );
  });

  it("a marker with no list item is refused", async () => {
    const noListPlan = `- [ ] **Ticket 1: Do the work.** A body.\n\n  **Evaluate:**\n`;
    harness = makeHarness();
    const planFile = harness.tempPlanFile(noListPlan);
    const refusal = failureJson(
      await harness.runTool("plan_import", { file: planFile }),
    );
    expect(refusal.error).toBe("plan_parse_error");
    expect(String(refusal.message)).toContain("no list");
  });

  it("a render and parse round trip keeps several criteria in order", async () => {
    await importPlan(THREE_CRITERIA_PLAN);

    const firstCriteria = "first.\nsecond.\nthird.";
    const rows = await ticketRows(harness);
    expect(rows[0].criteria).toBe(firstCriteria);

    const exportedText = await exportPlanText(harness);
    expect(exportedText).toContain("  - first.\n  - second.\n  - third.");

    const importer = makeHarness();
    const secondFile = importer.tempPlanFile(exportedText);
    successJson(await importer.runTool("plan_import", { file: secondFile }));
    const secondRows = await ticketRows(importer);
    expect(secondRows[0].criteria).toBe(firstCriteria);
  });
});
