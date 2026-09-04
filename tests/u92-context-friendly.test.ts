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

import { createHarness, asContext, successJson } from "./b1-harness";
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

/**
 * #92: write results return only what the caller COULD NOT HAVE KNOWN.
 *
 * Echoing back the title, description, or evidence payload the agent just
 * sent teaches it nothing and costs the same tokens twice -- and an evidence
 * payload can be an entire reviewer report.
 */
describe("#92 write results are compact", () => {
  it("set_ticket does not echo the fields the caller sent", async () => {
    const harness = setup();
    const res = json(
      await harness.runTool("set_ticket", {
        title: "Echo check",
        description: LONG,
        criteria: "a criterion",
      }),
    );
    expect(res.ticket).toBeUndefined();
    expect(JSON.stringify(res)).not.toContain(LONG.slice(0, 100));
    // ...but every SERVER-DERIVED fact is there.
    expect(typeof res.ticketId).toBe("number");
    expect(res.created).toBe(true);
    expect(res.state).toBe("open");
    expect(typeof res.projectId).toBe("number");
    expect(res).toHaveProperty("gateTotal");
    expect(typeof res.confidenceScore).toBe("number");
  });

  it("editing an existing ticket reports created false", async () => {
    const harness = setup();
    const made = json(await harness.runTool("set_ticket", { title: "First" }));
    const edited = json(
      await harness.runTool("set_ticket", { ticketId: made.ticketId, title: "Second" }),
    );
    expect(edited.created).toBe(false);
    expect(edited.ticketId).toBe(made.ticketId);
  });

  it("attach_evidence does not echo the payload back", async () => {
    const harness = setup();
    const made = json(await harness.runTool("set_ticket", { title: "Evidence" }));
    const res = json(
      await harness.runTool("attach_evidence", {
        ticketId: made.ticketId,
        kind: "builtin:agent_report",
        payload: { note: LONG },
      }),
    );
    expect(res.payload).toBeUndefined();
    expect(JSON.stringify(res).length).toBeLessThan(400);
    expect(res.kind).toBe("builtin:agent_report");
  });

  it("attach_evidence reports whether the row moved the gate", async () => {
    const harness = setup();
    const made = json(await harness.runTool("set_ticket", { title: "Gate" }));
    harness.seedEvidence(harness.agent, made.ticketId, "builtin:user_signoff");
    await harness.runTool("move_ticket", { ticketId: made.ticketId, to: "in_progress" });
    const first = json(
      await harness.runTool("attach_evidence", {
        ticketId: made.ticketId,
        kind: "builtin:automated_check",
        payload: { note: "suite green" },
      }),
    );
    expect(first.gateSatisfied).toBe(false);
    const second = json(
      await harness.runTool("attach_evidence", {
        ticketId: made.ticketId,
        kind: "builtin:review_pass",
        payload: { note: "reviewed" },
      }),
    );
    // The gate closing is the ACTUAL reason to attach evidence, and it is a
    // fact the agent cannot compute for itself.
    expect(second.gateSatisfied).toBe(true);
  });
});

describe("#71 a paginated read says how many more there are", () => {
  /*
   * User ask: "tool calls with limits should show how many more results are
   * available matching the filters."
   *
   * #92 made board reads cheap by returning a PAGE, and the envelope already
   * carried total/returned/hasMore/nextOffset -- but only as numbers a
   * reader had to assemble, so a TRUNCATED read looked exactly like a
   * complete one. That is the failure mode: not missing data, but data whose
   * incompleteness is invisible.
   */
  async function board(n: number) {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    for (let i = 0; i < n; i++) await harness.runTool("set_ticket", { title: "T" + i });
    return harness;
  }

  it("states the page, the total, and how many are hidden", async () => {
    const harness = await board(7);
    const page = successJson(await harness.runTool("get_tickets", { limit: 3 }));
    expect(page.summary).toContain("Showing 3 of 7");
    expect(page.summary).toContain("4 more not shown");
  });

  it("names the EXACT next call, so continuing needs no guesswork", async () => {
    const harness = await board(7);
    const page = successJson(await harness.runTool("get_tickets", { limit: 3 }));
    expect(page.summary).toContain("offset 3");
    // And that offset actually works.
    const next = successJson(await harness.runTool("get_tickets", { limit: 3, offset: 3 }));
    expect(next.returned).toBe(3);
  });

  it("says so plainly when nothing is hidden", async () => {
    // A complete read must not imply there is more, or the reader learns to
    // ignore the line.
    const harness = await board(2);
    const all = successJson(await harness.runTool("get_tickets", {}));
    expect(all.summary).toContain("all shown");
    expect(all.summary).not.toContain("more not shown");
  });

  it("counts MATCHES, not the board", async () => {
    /*
     * Filters apply before the page is cut (#92), so the total must describe
     * the filtered set. Saying "of 7" when a filter matched 2 would be worse
     * than saying nothing.
     */
    const harness = await board(7);
    const filtered = successJson(await harness.runTool("get_tickets", { search: "T3" }));
    expect(filtered.total).toBe(1);
    expect(filtered.summary).toContain("1 ticket matching");
  });

  it("handles an empty result without pluralising nonsense", async () => {
    const harness = await board(3);
    const none = successJson(await harness.runTool("get_tickets", { search: "zzzz-no-match" }));
    expect(none.summary).toBe("No tickets match these filters.");
  });

  it("the result text stays valid JSON", async () => {
    /*
     * The summary is a FIELD, not prose wrapped around the payload. An
     * earlier attempt prepended a sentence to the rendered text and broke
     * every caller that parses the result -- four tests caught it. A payload
     * that must be de-prefixed before parsing is a worse contract than a
     * self-describing one.
     */
    const harness = await board(4);
    const raw = await harness.runTool("get_tickets", { limit: 2 });
    const text = (raw.content?.[0] as { text?: string } | undefined)?.text ?? "";
    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text).summary).toContain("Showing 2 of 4");
  });
});
