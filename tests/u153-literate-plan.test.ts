/**
 * #153. The plan format becomes literate markdown with fenced YAML blocks,
 * the same family as the checklist (#134) and the review file (#151).
 *
 * The contract:
 * - Each ticket is a `## Ticket <id> — <title>` heading followed by one
 *   ```yaml block carrying `state`, `description`, and `criteria`.
 * - The fenced-YAML-block handling lives in src/plan/yaml-blocks.ts, the
 *   family's shared reader; the plan parser consumes it, it does not
 *   re-implement fence scanning or YAML parsing.
 * - Every #120 behaviour survives: an all-or-nothing import that names the
 *   offending line, tickets landing in open with the claimed state kept as
 *   builtin:imported_state evidence, deletion on success, and the git
 *   refusals (those live in u120 against the shared planImport seam, which
 *   this format change does not touch).
 * - Round trip is exact: renderPlan then parsePlan yields the same tickets,
 *   in the same order, with the same fields.
 * - A pre-#153 document still parses: the legacy format is a stated,
 *   tested migration path, and legacy import -> export -> re-import is the
 *   conversion procedure.
 */

import { describe, expect, it } from "vitest";

import {
  isYamlFence,
  parseYamlBlock,
  takeYamlBlock,
  YamlBlockError,
} from "../src/plan/yaml-blocks";
import {
  parsePlan,
  renderPlan,
  PlanParseError,
  type PlanDocument,
  type PlanTicket,
} from "../src/plan/plan";
import { apply } from "../src/tools/aidos-tools";
import type { EvidenceAttachedEvent } from "../src/kernel/events";
import {
  asContext,
  createHarness,
  failureJson,
  successJson,
  type Harness,
} from "./b1-harness";

/** A literate document with every field shape the format carries. */
const LITERATE_PLAN = `# The plan

## Notes

Prose the parser keeps as a context section.

## Ticket ONE — Read the kernel

\`\`\`yaml
state: done
description: Read the store and note the API.
criteria:
  - The notes name every public method.
\`\`\`

## Ticket TWO — Choose the flags

\`\`\`yaml
state: open
description: |
  Pick one spelling for each flag.
  Keep the spelling the same everywhere.
criteria:
  - Every flag appears once in the docstring.
  - The flags read well in the help text.
\`\`\`
`;

const ticketOf = (doc: PlanDocument, order: number): PlanTicket =>
  doc.tickets.filter((ticket) => ticket.order === order)[0];

describe("u153 the shared yaml-block reader", () => {
  it("a yaml fence is recognized, and other fences are not", () => {
    expect(isYamlFence("```yaml")).toBe(true);
    expect(isYamlFence("```yaml ")).toBe(true);
    expect(isYamlFence("```")).toBe(false);
    expect(isYamlFence("```ts")).toBe(false);
    expect(isYamlFence("yaml")).toBe(false);
  });

  it("a block is taken whole, and the index lands after the closing fence", () => {
    const lines = ["```yaml", "state: open", "```", "after"];
    const block = takeYamlBlock(lines, 0);
    expect(block.raw).toBe("state: open");
    expect(block.end).toBe(3);
  });

  it("a block that never closes names the opening line", () => {
    let caught: unknown;
    try {
      takeYamlBlock(["```yaml", "state: open"], 0);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(YamlBlockError);
    expect((caught as YamlBlockError).line).toBe(1);
  });

  it("a block that is not a mapping is refused, an empty block is empty", () => {
    expect(() => parseYamlBlock("- just\n- a list\n", 4)).toThrow(YamlBlockError);
    expect(parseYamlBlock("", 4)).toEqual({});
    expect(parseYamlBlock("state: open", 4)).toEqual({ state: "open" });
  });
});

describe("u153 the literate plan format", () => {
  it("the fixture parses to the documented fields, in document order", () => {
    const doc = parsePlan(LITERATE_PLAN);

    expect(doc.tickets.map((ticket) => ticket.id)).toEqual(["ONE", "TWO"]);
    expect(doc.tickets.map((ticket) => ticket.title)).toEqual([
      "Read the kernel",
      "Choose the flags",
    ]);
    expect(doc.tickets.map((ticket) => ticket.claimedState)).toEqual([
      "done",
      "open",
    ]);
    expect(doc.tickets.map((ticket) => ticket.order)).toEqual([1, 2]);
    expect(doc.tickets.map((ticket) => ticket.phase)).toEqual([1, 1]);
    expect(ticketOf(doc, 1).body).toBe("Read the store and note the API.");
    expect(ticketOf(doc, 1).criteria).toBe("The notes name every public method.");
    expect(ticketOf(doc, 2).body).toBe(
      "Pick one spelling for each flag.\nKeep the spelling the same everywhere.",
    );
    expect(ticketOf(doc, 2).criteria).toBe(
      "Every flag appears once in the docstring.\nThe flags read well in the help text.",
    );
  });

  it("the prose around the blocks is frontmatter, preamble, and context", () => {
    const withFrontmatter = `---\ntitle: Demo\n---\n\n${LITERATE_PLAN}`;
    const doc = parsePlan(withFrontmatter);

    expect(doc.frontmatter).toBe("---\ntitle: Demo\n---");
    expect(doc.preamble).toBe("# The plan");
    expect(doc.contextSections.map((section) => section.heading)).toEqual([
      "## Notes",
    ]);
    expect(doc.contextSections[0].text).toContain("Prose the parser keeps");
  });

  it("a ticket heading with no yaml block names the heading line", () => {
    let caught: unknown;
    try {
      parsePlan("## Ticket ONE — A title\n");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PlanParseError);
    expect((caught as PlanParseError).line).toBe(1);
    expect((caught as PlanParseError).message).toContain("```yaml");
  });

  it("a block that is not valid yaml names the block's line", () => {
    const text = [
      "## Ticket ONE — A title",
      "",
      "```yaml",
      "state: open",
      "\tbad indentation",
      "```",
      "",
    ].join("\n");
    let caught: unknown;
    try {
      parsePlan(text);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PlanParseError);
    // The refusal names the block's opening fence line.
    expect((caught as PlanParseError).line).toBe(3);
    expect((caught as PlanParseError).message).toContain("YAML");
  });

  it("an unknown field is refused, naming the field and the line", () => {
    const text = [
      "## Ticket ONE — A title",
      "",
      "```yaml",
      "state: open",
      "criteria:",
      "  - one",
      "secret: no",
      "```",
      "",
    ].join("\n");
    let caught: unknown;
    try {
      parsePlan(text);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PlanParseError);
    expect((caught as PlanParseError).line).toBe(3);
    expect((caught as PlanParseError).message).toContain("`secret`");
  });

  it("a state outside the four states is refused", () => {
    const text = [
      "## Ticket ONE — A title",
      "",
      "```yaml",
      "state: closed",
      "criteria:",
      "  - one",
      "```",
      "",
    ].join("\n");
    expect(() => parsePlan(text)).toThrow(PlanParseError);
    expect(() => parsePlan(text)).toThrow(/state/);
  });

  it("an empty criteria list is refused", () => {
    const text = [
      "## Ticket ONE — A title",
      "",
      "```yaml",
      "state: open",
      "criteria: []",
      "```",
      "",
    ].join("\n");
    expect(() => parsePlan(text)).toThrow(/criteria/);
  });

  it("a block that holds a list instead of a mapping is refused", () => {
    const text = [
      "## Ticket ONE — A title",
      "",
      "```yaml",
      "- state: open",
      "```",
      "",
    ].join("\n");
    expect(() => parsePlan(text)).toThrow(/mapping/);
  });
});

describe("u153 the round trip is exact", () => {
  /** Build one document with every tricky shape in one place. */
  const DOC: PlanDocument = {
    frontmatter: "---\ntitle: Demo plan\nowner: sid\n---",
    frontmatterData: { title: "Demo plan", owner: "sid" },
    preamble: "# Demo\n\nA preamble paragraph.",
    contextSections: [
      {
        heading: "## Notes",
        text: "Kept prose.\n\n- one\n- two",
        index: 0,
      },
    ],
    tickets: [
      {
        id: "ONE",
        title: "Plain prose",
        body: "One line of body.",
        criteria: "The only criterion.",
        claimedState: "open",
        order: 1,
        phase: 1,
      },
      {
        id: "TWO",
        title: "Awkward prose",
        // The format normalizes the description's outer whitespace; the
        // interior quirks (colons, dashes, a blank line, indented text)
        // must still survive byte for byte.
        body: "leading spaces kept\nwith: colons\n- and dashes\n\n  blank line inside",
        criteria: "first\nsecond\nthird",
        claimedState: "awaiting_verification",
        order: 2,
        phase: 1,
      },
      {
        id: "THREE",
        title: "No prose",
        body: "",
        criteria: "The work is done.\nTwice over.",
        claimedState: "done",
        order: 3,
        phase: 1,
      },
    ],
  };

  const sameTickets = (a: PlanTicket[], b: PlanTicket[]): void => {
    expect(b.map((t) => [t.id, t.title, t.body, t.criteria, t.claimedState, t.order, t.phase]))
      .toEqual(a.map((t) => [t.id, t.title, t.body, t.criteria, t.claimedState, t.order, t.phase]));
  };

  it("render then parse yields the same document", () => {
    const rendered = renderPlan(DOC);
    const reparsed = parsePlan(rendered);

    expect(reparsed.frontmatter).toBe(DOC.frontmatter);
    expect(reparsed.frontmatterData).toEqual(DOC.frontmatterData);
    expect(reparsed.preamble).toBe(DOC.preamble);
    expect(reparsed.contextSections).toEqual(DOC.contextSections);
    sameTickets(DOC.tickets, reparsed.tickets);
  });

  it("two renders of one document are byte identical", () => {
    expect(renderPlan(DOC)).toBe(renderPlan(DOC));
  });

  it("a render is stable across a parse-render cycle", () => {
    expect(renderPlan(parsePlan(renderPlan(DOC)))).toBe(renderPlan(DOC));
  });
});

describe("u153 the live import keeps the #120 behaviours", () => {
  let harness: Harness;
  let planFile: string;
  let badPlanFile: string;

  const BAD_LINES = [
    "## Ticket ONE — A title",
    "",
    "```yaml",
    "state: open",
    "criteria:",
    "  - one",
    "```",
    "",
    "This line is neither a ticket heading nor a context section.",
    "",
  ];
  const BAD_PLAN = BAD_LINES.join("\n");
  const BAD_LINE = BAD_LINES.indexOf(
    "This line is neither a ticket heading nor a context section.",
  ) + 1;

  harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  planFile = harness.tempPlanFile(LITERATE_PLAN);
  badPlanFile = harness.tempPlanFile(BAD_PLAN);

  it("a literate document imports with the documented fields", async () => {
    const result = successJson(await harness.runTool("plan_import", { file: planFile }));
    expect(result.ok).toBe(true);
    const ticketIds = (result.tickets as number[]) ?? [];
    expect(ticketIds.length).toBe(2);

    const listed = successJson(await harness.runTool("get_tickets", { detail: "full" }));
    const tickets = (listed.tickets as Record<string, unknown>[]) ?? [];
    expect(tickets.map((t) => t.title)).toEqual([
      "Read the kernel",
      "Choose the flags",
    ]);
    expect(tickets.map((t) => t.state)).toEqual(["open", "open"]);
    expect(tickets.map((t) => t.criteria)).toEqual([
      "The notes name every public method.",
      "Every flag appears once in the docstring.\nThe flags read well in the help text.",
    ]);
    expect(tickets[1].description).toBe(
      "Pick one spelling for each flag.\nKeep the spelling the same everywhere.",
    );
  });

  it("the done claim becomes one imported_state evidence row per ticket", async () => {
    const events = harness
      .aidosEvents(harness.agent)
      .filter((event) => event.kind === "evidence/attached")
      .map((event) => (event as EvidenceAttachedEvent).row)
      .filter((row) => row.kind === "builtin:imported_state");

    // One row per ticket, and the done claim of ticket ONE is kept.
    expect(events.length).toBe(2);
    const byClaim = events.map((row) => row.payload.claimed_state);
    expect(byClaim).toContain("done");
    expect(byClaim).toContain("open");
  });

  it("a bad line refuses all-or-nothing and names the line", async () => {
    const fresh = createHarness();
    fresh.installService();
    apply(asContext(fresh.ctx), {});
    const file = fresh.tempPlanFile(BAD_PLAN);

    const refusal = failureJson(await fresh.runTool("plan_import", { file }));
    expect(refusal.error).toBe("plan_parse_error");
    expect(refusal.line).toBe(BAD_LINE);
    expect(String(refusal.message)).toContain(String(BAD_LINE));

    const listed = successJson(await fresh.runTool("get_tickets", { detail: "full" }));
    expect(((listed.tickets as unknown[]) ?? []).length).toBe(0);
  });
});

describe("u153 the legacy migration path", () => {
  /** A pre-#153 document, in the old checkbox format. */
  const LEGACY_PLAN = `---
plan: Old plan
---

# Old plan

## Notes

Old context.

- [x] **Ticket 1: Read the kernel.** Read the store and note the API.

  **Evaluate:**

  - The notes name every public method.
- [ ] **Ticket 2: Choose the flags.** Pick one spelling.

  **Evaluate:**

  - Every flag appears once.
`;

  it("a pre-#153 document still parses, through the legacy path", () => {
    const doc = parsePlan(LEGACY_PLAN);
    expect(doc.tickets.map((t) => [t.id, t.title, t.claimedState])).toEqual([
      ["1", "Read the kernel", "done"],
      ["2", "Choose the flags", "open"],
    ]);
    expect(doc.tickets[0].criteria).toBe("The notes name every public method.");
  });

  it("a legacy line wins the format sniff over a ticket-like heading", () => {
    // A document that holds BOTH shapes is read as legacy, never half-read
    // by the new parser.
    const mixed = `${LEGACY_PLAN}\n## Ticket 3 — Hybrid.\n`;
    const doc = parsePlan(mixed);
    expect(doc.tickets.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("the conversion procedure holds: legacy import, export, re-import", async () => {
    const first = createHarness();
    first.installService();
    apply(asContext(first.ctx), {});
    const legacyFile = first.tempPlanFile(LEGACY_PLAN);
    successJson(await first.runTool("plan_import", { file: legacyFile }));

    const firstData = (
      successJson(await first.runTool("get_tickets", { detail: "full" }))
        .tickets as Record<string, unknown>[]
    ).map((t) => ({
      title: t.title,
      description: t.description,
      criteria: t.criteria,
      phase: t.phase,
      order: t.order,
    }));

    // The export of the imported legacy plan is now literate markdown.
    const exported = (
      (await first.runTool("plan", {})).content[0] as { type: "text"; text: string }
    ).text;
    expect(exported).toContain("## Ticket 1 — Read the kernel");
    expect(exported).toContain("```yaml");
    expect(exported).not.toContain("**Evaluate:**");

    const second = createHarness();
    second.installService();
    apply(asContext(second.ctx), {});
    const literateFile = second.tempPlanFile(exported);
    successJson(await second.runTool("plan_import", { file: literateFile }));

    const secondData = (
      successJson(await second.runTool("get_tickets", { detail: "full" }))
        .tickets as Record<string, unknown>[]
    ).map((t) => ({
      title: t.title,
      description: t.description,
      criteria: t.criteria,
      phase: t.phase,
      order: t.order,
    }));
    expect(secondData).toEqual(firstData);
  });
});
