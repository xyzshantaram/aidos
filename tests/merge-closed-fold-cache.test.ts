/**
 * #42 replaces the closed-session fold cache with the workspace store.
 *
 * The pre-#42 merge cached each closed session's fold (and, after #198,
 * served stale frames while background-refreshing them) because every board
 * read re-inspected every closed log. That whole layer is gone: the first
 * board open backfills closed logs into the workspace store once, and every
 * later read is a store query that performs ZERO inspects.
 *
 * The tests below pin the NEW shape:
 *  - the second merge does not re-inspect a still-closed session (kept from
 *    the original suite — the store serves the row, not a cache);
 *  - the cache and refresh maps no longer exist on the service;
 *  - the reopen-close gap is stated, not hidden: a ticket written to a
 *    closed log AFTER the one-time backfill is not on the board, because
 *    the write path still targets session logs (host write mirroring is
 *    #43/#45's work). The backfill marker is once-and-done by #41's design,
 *    so no re-scan picks the late row up.
 */
import { describe, expect, it } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import { createHarness } from "./b1-harness";

const WS = "/home/sid/repos/aidos";
const CLOSED_ID = "session-closed-cache-1";

/** Harness with a counting persistence backend holding one closed log. */
function countingHarness() {
  const harness = createHarness(undefined, { cwd: WS });
  harness.installService();
  let inspects = 0;
  // Build the closed log once: one ticket of this workspace.
  const peer = harness.makeAgent({ id: CLOSED_ID });
  (peer.session.header as { cwd?: string }).cwd = WS;
  const service = harness.service;
  service.userSetTicket(harness.asAgent(peer), { title: "closed ticket" });
  const baseEvents = [...peer.session.events];
  harness.agents.splice(harness.agents.indexOf(peer), 1);
  harness.ctx.reflect.provide("sessionPersistence", {
    list: async () => [{ id: SessionId(CLOSED_ID), cwd: WS }],
    inspect: async (id: string) => {
      if (id !== CLOSED_ID) throw new Error("not found");
      inspects += 1;
      return {
        meta: { id: CLOSED_ID, cwd: WS },
        events: [...baseEvents],
      };
    },
  });
  return { harness, inspectCount: () => inspects };
}

describe("closed sessions are answered by the store, not a fold cache", () => {
  it("the second merge does not re-inspect a still-closed session", async () => {
    const { harness, inspectCount } = countingHarness();
    const first = await harness.service.workspaceTickets(harness.asAgent());
    expect(first.tickets.map((row) => row.title)).toContain("closed ticket");
    // The single inspect is the one-time backfill, not a per-read scan.
    expect(inspectCount()).toBe(1);
    const second = await harness.service.workspaceTickets(harness.asAgent());
    expect(second.tickets.map((row) => row.title)).toContain("closed ticket");
    expect(inspectCount()).toBe(1);
  });

  it("the fold cache and refresh maps are gone from the service", () => {
    const { harness } = countingHarness();
    const internals = harness.service as unknown as Record<string, unknown>;
    expect(internals._closedFolds).toBeUndefined();
    expect(internals._closedFoldRefreshes).toBeUndefined();
  });

  it("a ticket written to a closed log after the backfill is not on the board", async () => {
    // #42's known gap, stated so no later test can silently assume it away:
    // the backfill marker is once-and-done (#41), the write path still
    // targets session logs, and nothing re-scans — so a session that closes
    // again with NEW events leaves those rows out of the store until the
    // host write path moves to the store (#43/#45).
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    let inspects = 0;
    const peer = harness.makeAgent({ id: CLOSED_ID });
    (peer.session.header as { cwd?: string }).cwd = WS;
    const service = harness.service;
    service.userSetTicket(harness.asAgent(peer), { title: "closed ticket" });
    harness.agents.splice(harness.agents.indexOf(peer), 1);
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId(CLOSED_ID), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== CLOSED_ID) throw new Error("not found");
        inspects += 1;
        const events = [...peer.session.events];
        return { meta: { id: CLOSED_ID, cwd: WS }, events };
      },
    });
    await service.workspaceTickets(harness.asAgent());
    expect(inspects).toBe(1);
    // The session comes back to life and writes again, then closes.
    harness.agents.push(peer);
    service.userSetTicket(harness.asAgent(peer), { title: "reopened ticket" });
    harness.agents.splice(harness.agents.indexOf(peer), 1);
    const after = await service.workspaceTickets(harness.asAgent());
    expect(inspects).toBe(1);
    const titles = after.tickets.map((row) => row.title);
    expect(titles).toContain("closed ticket");
    expect(titles).not.toContain("reopened ticket");
  });
});
