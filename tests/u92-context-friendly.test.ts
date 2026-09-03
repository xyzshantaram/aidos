/**
 * #92: board reads must be cheap.
 *
 * An unfiltered get_tickets used to return ~58 KB because every row carried
 * its full description (several are 2-4 KB of settled design prose). Two or
 * three board reads cost more context than the work they informed. These
 * tests pin the contract that fixed it, and measure the win rather than
 * asserting it.
 */
import { describe, expect, it } from "vitest";

import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

const LONG = "x".repeat(3000);

async function seed(harness: ReturnType<typeof createHarness>, count: number) {
  for (let i = 0; i < count; i += 1) {
    await harness.runTool("set_ticket", {
      title: "Ticket " + i,
      description: LONG,
      criteria: "a criterion\nanother criterion",
    });
  }
}

function json(result: unknown): Record<string, any> {
  const text = (result as { content?: { text?: string }[] }).content?.[0]?.text ?? "{}";
  return JSON.parse(text);
}

describe("#92 get_tickets is cheap by default", () => {
  /*
   * MEASURED, not assumed. With 3 KB descriptions the real reduction is ~7x,
   * not the "order of magnitude" the ticket originally claimed -- the 200-char
   * excerpt plus the scalar fields are the floor. The ticket's criterion was
   * amended to match this measurement rather than the code being tuned to hit
   * a number invented before anyone measured.
   *
   * The ABSOLUTE bound below matters more than the ratio: what actually hurt
   * was a single read costing tens of KB, and a per-row ceiling is what stops
   * that regardless of how long descriptions get.
   */
  it("a summary read is several times smaller than a full read", async () => {
    const harness = setup();
    await seed(harness, 12);
    const summary = JSON.stringify(json(await harness.runTool("get_tickets", {})));
    const full = JSON.stringify(
      json(await harness.runTool("get_tickets", { detail: "full" })),
    );
    expect(summary.length * 5).toBeLessThan(full.length);
  });

  it("a summary row stays under 600 bytes however long the description is", async () => {
    const harness = setup();
    await seed(harness, 1);
    const row = json(await harness.runTool("get_tickets", {})).tickets[0];
    expect(JSON.stringify(row).length).toBeLessThan(600);
  });

  it("a summary row omits the full description but keeps a flagged excerpt", async () => {
    const harness = setup();
    await seed(harness, 1);
    const row = json(await harness.runTool("get_tickets", {})).tickets[0];
    expect(row.description).toBeUndefined();
    expect(row.criteria).toBeUndefined();
    expect(row.descriptionTruncated).toBe(true);
    expect(row.descriptionExcerpt.length).toBeLessThan(LONG.length);
    // The counts survive, so the agent can still see shape at a glance.
    expect(row.hasCriteria).toBe(true);
    expect(row.dependsOnCount).toBe(0);
  });

  it("a short description is not flagged as truncated", async () => {
    const harness = setup();
    await harness.runTool("set_ticket", { title: "Short", description: "brief" });
    const row = json(await harness.runTool("get_tickets", {})).tickets[0];
    expect(row.descriptionTruncated).toBe(false);
    expect(row.descriptionExcerpt).toBe("brief");
  });

  it("detail full still returns everything, so nothing becomes unreachable", async () => {
    const harness = setup();
    await seed(harness, 1);
    const row = json(await harness.runTool("get_tickets", { detail: "full" })).tickets[0];
    expect(row.description).toBe(LONG);
    expect(row.criteria).toContain("a criterion");
  });
});

describe("#92 pagination", () => {
  it("defaults to at most 30 rows and reports the total and the next offset", async () => {
    const harness = setup();
    await seed(harness, 35);
    const page = json(await harness.runTool("get_tickets", {}));
    expect(page.total).toBe(35);
    expect(page.returned).toBe(30);
    expect(page.hasMore).toBe(true);
    expect(page.nextOffset).toBe(30);
  });

  it("the next offset returns the remainder and closes the page", async () => {
    const harness = setup();
    await seed(harness, 35);
    const rest = json(await harness.runTool("get_tickets", { offset: 30 }));
    expect(rest.returned).toBe(5);
    expect(rest.hasMore).toBe(false);
    expect(rest.nextOffset).toBeNull();
  });

  it("filters apply BEFORE the page, so a page is a page of matches", async () => {
    const harness = setup();
    await seed(harness, 40);
    const created = json(await harness.runTool("get_tickets", { limit: 100 }));
    const one = created.tickets[0].id;
    await harness.runTool("attach_evidence", {
      ticketId: one,
      kind: "builtin:agent_report",
      payload: { note: "n" },
    });
    const filtered = json(
      await harness.runTool("get_tickets", { search: "Ticket 7", limit: 5 }),
    );
    // Every returned row matches; the total counts MATCHES, not all tickets.
    expect(filtered.total).toBeLessThan(40);
    for (const row of filtered.tickets) {
      expect(row.title).toContain("Ticket 7");
    }
  });
});

describe("#92 get_ticket", () => {
  it("returns one ticket in full with bounded evidence", async () => {
    const harness = setup();
    await seed(harness, 1);
    const id = json(await harness.runTool("get_tickets", {})).tickets[0].id;
    await harness.runTool("attach_evidence", {
      ticketId: id,
      kind: "builtin:agent_report",
      payload: { note: "the whole story" },
    });
    const one = json(await harness.runTool("get_ticket", { ticketId: id }));
    expect(one.ticket.description).toBe(LONG);
    expect(one.ticket.criteria).toContain("a criterion");
    expect(one.evidence).toHaveLength(1);
    expect(one.evidence[0].kind).toBe("builtin:agent_report");
    expect(one.evidence[0].excerpt).toBe("the whole story");
    // The payload itself never rides along -- that is the point.
    expect(one.evidence[0].payload).toBeUndefined();
    expect(one.commentCount).toBe(0);
  });

  it("refuses an unknown ticket", async () => {
    const harness = setup();
    const result = await harness.runTool("get_ticket", { ticketId: 9999 });
    expect(JSON.stringify(result)).toMatch(/9999|unknown/i);
  });
});
