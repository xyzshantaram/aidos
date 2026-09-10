/**
 * User-reported 2026-09-10: a tool-card action timed out after 15s.
 * `checkInlineActionAvailable` calls the workspace merge, and the merge
 * re-inspected AND re-folded every closed session log on every call —
 * measured at 225 persisted sessions in the reporter's workspace, the
 * largest a 62M log. Sequential parse+fold of hundreds of megabytes per
 * click is the timeout.
 *
 * The rule: a closed session's fold is cached by session id. A closed log
 * cannot grow while its session stays dead, so the second merge must not
 * re-inspect; a session that goes live drops its entry, so a reopen-close
 * cycle with new events re-inspects; entries older than the TTL re-inspect.
 */
import { describe, expect, it, vi } from "vitest";
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

describe("closed-session fold cache", () => {
  it("the second merge does not re-inspect a still-closed session", async () => {
    const { harness, inspectCount } = countingHarness();
    const first = await harness.service.workspaceTickets(harness.asAgent());
    expect(first.tickets.map((row) => row.title)).toContain("closed ticket");
    expect(inspectCount()).toBe(1);
    const second = await harness.service.workspaceTickets(harness.asAgent());
    expect(second.tickets.map((row) => row.title)).toContain("closed ticket");
    expect(inspectCount()).toBe(1);
  });

  it("a reopen-close cycle with new events re-inspects and shows them", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    let inspects = 0;
    const seen: unknown[][] = [];
    // One session object throughout: its id counter continues across the
    // reopen, exactly as a real resumed session's log does.
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
        seen.push(events);
        return { meta: { id: CLOSED_ID, cwd: WS }, events };
      },
    });
    await service.workspaceTickets(harness.asAgent());
    expect(inspects).toBe(1);
    // The session comes back to life: the merge folds it live and drops the
    // cached entry, so no inspect happens for it on this call.
    harness.agents.push(peer);
    await service.workspaceTickets(harness.asAgent());
    expect(inspects).toBe(1);
    // It closes again with a second ticket in its log: the merge must see it.
    service.userSetTicket(harness.asAgent(peer), { title: "reopened ticket" });
    harness.agents.splice(harness.agents.indexOf(peer), 1);
    const after = await service.workspaceTickets(harness.asAgent());
    expect(inspects).toBe(2);
    const titles = after.tickets.map((row) => row.title);
    expect(titles).toContain("closed ticket");
    expect(titles).toContain("reopened ticket");
  });

  it("an entry older than the TTL re-inspects", async () => {
    vi.useFakeTimers();
    try {
      const { harness, inspectCount } = countingHarness();
      await harness.service.workspaceTickets(harness.asAgent());
      expect(inspectCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(61000);
      await harness.service.workspaceTickets(harness.asAgent());
      expect(inspectCount()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
