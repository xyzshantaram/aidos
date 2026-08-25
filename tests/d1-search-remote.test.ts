/**
 * Ticket D1: the cross-session dependency search Remote.
 *
 * `searchTickets` matches one query against the title of every live
 * session's tickets, through `ctx.sessions.list()` and the aidos.tickets
 * projection snapshot, and returns the stored reference fields the board
 * needs to render a dependency badge and to add a dependency. Only live
 * sessions are reachable; a blank query returns no hits; the result list is
 * capped at 50.
 */

import { describe, expect, it } from "vitest";

import { createHarness } from "./b1-harness";

/** The workspace key the harness sessions bind (DEFAULT_CWD). */
const WS_KEY = "--srv-proj-cli--";

describe("d1: the searchTickets Remote surface", () => {
  it("a ticket whose title contains the query appears in the results", () => {
    const harness = createHarness();
    const service = harness.installService();
    service.setTicket(harness.asAgent(), { title: "Fix the payment gateway" });
    service.setTicket(harness.asAgent(), { title: "Add request logging" });

    const results = service.searchTickets(harness.asAgent(), { query: "payment" });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Fix the payment gateway");
    expect(results[0].ticketId).toBe(1);
    expect(results[0].sessionId).toBe(harness.agent.id);
    expect(results[0].workspaceKey).toBe(WS_KEY);
    expect(results[0].state).toBe("open");
    expect(results[0].dependsOn).toEqual([]);
  });

  it("a ticket whose title does not contain the query does not appear", () => {
    const harness = createHarness();
    const service = harness.installService();
    service.setTicket(harness.asAgent(), { title: "Add request logging" });

    const results = service.searchTickets(harness.asAgent(), { query: "payment" });

    expect(results).toEqual([]);
  });

  it("a blank query returns no results", () => {
    const harness = createHarness();
    const service = harness.installService();
    service.setTicket(harness.asAgent(), { title: "Fix the payment gateway" });

    expect(service.searchTickets(harness.asAgent(), { query: "" })).toEqual([]);
    expect(service.searchTickets(harness.asAgent(), { query: "   " })).toEqual([]);
  });

  it("matching is case-insensitive", () => {
    const harness = createHarness();
    const service = harness.installService();
    service.setTicket(harness.asAgent(), { title: "Fix the PAYMENT gateway" });
    service.setTicket(harness.asAgent(), { title: "Add request logging" });

    const results = service.searchTickets(harness.asAgent(), { query: "PaYmEnT" });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Fix the PAYMENT gateway");
  });

  it("a ticket with dependencies reports its stored references", () => {
    const harness = createHarness();
    const service = harness.installService();
    service.setTicket(harness.asAgent(), {
      title: "Wire the dashboard",
      dependsOn: [WS_KEY + ":9", "--other-ws--:7"],
    });

    const results = service.searchTickets(harness.asAgent(), { query: "dashboard" });

    expect(results).toHaveLength(1);
    expect(results[0].dependsOn).toEqual([WS_KEY + ":9", "--other-ws--:7"]);
  });

  it("searches across every live session", () => {
    const harness = createHarness();
    const service = harness.installService();
    const other = harness.makeAgent({ id: "session-other" });
    service.setTicket(harness.asAgent(), { title: "Alpha ticket" });
    service.setTicket(harness.asAgent(other), { title: "Beta ticket" });

    const results = service.searchTickets(harness.asAgent(), { query: "beta" });

    expect(results).toHaveLength(1);
    expect(results[0].sessionId).toBe(other.id);
    expect(results[0].title).toBe("Beta ticket");
  });

  it("results are capped at 50", () => {
    const harness = createHarness();
    const service = harness.installService();
    for (let index = 1; index <= 60; index += 1) {
      service.setTicket(harness.asAgent(), { title: "match item " + index });
    }

    const results = service.searchTickets(harness.asAgent(), { query: "match item" });

    expect(results).toHaveLength(50);
  });
});

describe("the searchTickets Remote marker", () => {
  it("the method carries the searchTickets marker", async () => {
    const harness = createHarness();
    const service = harness.installService();

    const markers = (await import("@deepseek-ai/dsh-typert-protocol")).remoteMethods(service);
    const marker = markers.find((candidate) => candidate.method === "searchTickets");
    expect(marker?.method).toBe("searchTickets");
    expect(marker?.invocation).toEqual({ kind: "direct" });
  });
});
