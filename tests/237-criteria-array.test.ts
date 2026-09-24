/**
 * #237: set_ticket criteria accept string[] as well as a string.
 *
 * Criteria are stored as a newline-delimited string where ONE LINE IS ONE
 * CRITERION (parseCriteria splits on newline, trims, drops empties). The
 * tool took only a string and nothing said newlines are load-bearing, so
 * agents wrote criteria as prose -- and prose is exactly one criterion.
 *
 * The fix is at the tool boundary: the schema accepts string | string[], an
 * array joins with newline before storage, a plain string passes through
 * exactly as today. The storage format is unchanged, so no event change and
 * no migration. The harness's runTool calls execute directly (no registry
 * schema check in between), so the schema half is driven here through the
 * real dsh-tools validator against the registered definition -- that is the
 * layer that refuses arrays today.
 */
import { describe, expect, it } from "vitest";

import { validateJsonSchemaValue } from "@deepseek-ai/dsh-tools";
import type { JsonSchemaNode } from "@deepseek-ai/dsh-tools";

import { createHarness, asContext, successJson } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";
import { parseCriteria } from "../src/client/board-logic";

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

/** The stored criteria string of one ticket, straight from the service. */
function storedCriteria(harness: ReturnType<typeof createHarness>, ticketId: number): string {
  const rows = harness.service.getTickets(harness.asAgent());
  const row = rows.find((ticket) => ticket.id === ticketId);
  expect(row).toBeDefined();
  return row!.criteria;
}

/** The compiled parameter schema of the registered set_ticket tool. */
function setTicketParameters(harness: ReturnType<typeof createHarness>): JsonSchemaNode {
  const definition = harness.tools.get("set_ticket");
  expect(definition).toBeDefined();
  return definition!.parameters as unknown as JsonSchemaNode;
}

describe("#237 the set_ticket criteria schema accepts both forms", () => {
  it("an array of strings validates with no violations", () => {
    const harness = setup();
    const violations = validateJsonSchemaValue(
      setTicketParameters(harness),
      { title: "T", criteria: ["First rule.", "Second rule."] },
    );
    expect(violations).toEqual([]);
  });

  it("a plain string still validates exactly as before", () => {
    const harness = setup();
    const violations = validateJsonSchemaValue(
      setTicketParameters(harness),
      { title: "T", criteria: "First rule.\nSecond rule." },
    );
    expect(violations).toEqual([]);
  });

  it("a non-string element is still refused at the schema layer", () => {
    const harness = setup();
    const violations = validateJsonSchemaValue(
      setTicketParameters(harness),
      { title: "T", criteria: ["Fine.", 42] },
    );
    expect(violations.length).toBeGreaterThan(0);
  });

  it("the description tells agents the array form exists and why", () => {
    const harness = setup();
    const definition = harness.tools.get("set_ticket");
    const parameters = definition!.parameters as unknown as {
      properties: { criteria: { description?: string } };
    };
    const text = parameters.properties.criteria.description ?? "";
    expect(text).toMatch(/array/i);
    expect(text).toMatch(/one element is one criterion/i);
  });
});

describe("#237 an array creates a ticket whose lines are the elements", () => {
  it("stored criteria join with newline and parse back to the array", async () => {
    const harness = setup();
    const elements = ["First rule.", "Second rule.", "Third rule."];
    const result = successJson(
      await harness.runTool("set_ticket", { title: "Array", criteria: elements }),
    );
    expect(storedCriteria(harness, result.ticketId as number)).toBe(elements.join("\n"));
    expect(parseCriteria(storedCriteria(harness, result.ticketId as number))).toEqual(elements);
    // The split is never silent: passed versus landed rides the result.
    expect(result.criteriaPassed).toBe(3);
    expect(result.criteriaStored).toBe(3);
  });

  it("array and string forms produce identical stored criteria", async () => {
    const harness = setup();
    const fromArray = successJson(
      await harness.runTool("set_ticket", { title: "A", criteria: ["Alpha.", "Beta."] }),
    );
    const fromString = successJson(
      await harness.runTool("set_ticket", { title: "B", criteria: "Alpha.\nBeta." }),
    );
    expect(storedCriteria(harness, fromArray.ticketId as number)).toBe(
      storedCriteria(harness, fromString.ticketId as number),
    );
  });

  it("an 8-clause prose string is 1 criterion; the 8-element array is 8", async () => {
    const harness = setup();
    const clauses = [
      "The ticket lists every requirement.",
      "Each requirement is separately checkable.",
      "Evidence links to one criterion at a time.",
      "The panel renders one row per line.",
      "Empty lines never render.",
      "Whitespace never leaks into a label.",
      "Prose without newlines stays fused.",
      "The array form keeps authors honest.",
    ];
    const prose = successJson(
      await harness.runTool("set_ticket", { title: "Prose", criteria: clauses.join(" ") }),
    );
    const listed = successJson(
      await harness.runTool("set_ticket", { title: "Listed", criteria: clauses }),
    );
    expect(
      parseCriteria(storedCriteria(harness, prose.ticketId as number)),
    ).toHaveLength(1);
    expect(
      parseCriteria(storedCriteria(harness, listed.ticketId as number)),
    ).toEqual(clauses);
  });

  it("an edit with an array replaces the criteria wholesale", async () => {
    const harness = setup();
    const created = successJson(
      await harness.runTool("set_ticket", { title: "Edit me", criteria: "Old rule." }),
    );
    const ticketId = created.ticketId as number;
    const edited = successJson(
      await harness.runTool("set_ticket", {
        ticketId,
        criteria: ["New first.", "New second."],
      }),
    );
    expect(storedCriteria(harness, ticketId)).toBe("New first.\nNew second.");
    expect(edited.criteriaPassed).toBe(2);
    expect(edited.criteriaStored).toBe(2);
  });
});

describe("#237 a plain string behaves exactly as before", () => {
  it("a multi-line string is stored verbatim with no counts in the result", async () => {
    const harness = setup();
    const criteria = "a criterion\nanother criterion";
    const result = successJson(
      await harness.runTool("set_ticket", { title: "String", criteria }),
    );
    expect(storedCriteria(harness, result.ticketId as number)).toBe(criteria);
    expect(result.criteriaPassed).toBeUndefined();
    expect(result.criteriaStored).toBeUndefined();
  });

  it("omitting criteria still stores empty criteria", async () => {
    const harness = setup();
    const result = successJson(await harness.runTool("set_ticket", { title: "Bare" }));
    expect(storedCriteria(harness, result.ticketId as number)).toBe("");
  });
});

describe("#237 mixed and edge inputs", () => {
  it("an empty array stores empty criteria", async () => {
    const harness = setup();
    const result = successJson(
      await harness.runTool("set_ticket", { title: "Empty", criteria: [] }),
    );
    expect(storedCriteria(harness, result.ticketId as number)).toBe("");
    expect(result.criteriaPassed).toBe(0);
    expect(result.criteriaStored).toBe(0);
  });

  it("empty elements join through and the existing parse rules drop them", async () => {
    const harness = setup();
    const result = successJson(
      await harness.runTool("set_ticket", {
        title: "Gappy",
        criteria: ["Kept.", "", "   ", "Also kept."],
      }),
    );
    const stored = storedCriteria(harness, result.ticketId as number);
    expect(stored).toBe("Kept.\n\n   \nAlso kept.");
    expect(parseCriteria(stored)).toEqual(["Kept.", "Also kept."]);
    expect(result.criteriaPassed).toBe(4);
    expect(result.criteriaStored).toBe(2);
  });

  it("an element containing a newline splits, and the result shows it", async () => {
    const harness = setup();
    const result = successJson(
      await harness.runTool("set_ticket", {
        title: "Split",
        criteria: ["Fused\npair.", "Single."],
      }),
    );
    expect(storedCriteria(harness, result.ticketId as number)).toBe("Fused\npair.\nSingle.");
    expect(result.criteriaPassed).toBe(2);
    expect(result.criteriaStored).toBe(3);
  });

  it("a non-string element is refused, not stringified into storage", async () => {
    const harness = setup();
    const outcome = await harness.runTool("set_ticket", {
      title: "Bad element",
      criteria: ["Fine.", 42],
    });
    expect(outcome.isError).toBe(true);
    // The defineTool wrapper validates args before the body runs, so the
    // refusal names the oneOf miss rather than an element index.
    expect(outcome.error?.message ?? "").toMatch(/must match exactly one oneOf branch/);
  });
});
