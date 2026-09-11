/**
 * #198: de-storm the closed-session merge.
 *
 * The pre-#198 merge had two remaining serial stalls:
 *  - a COLD cache awaited each closed log's inspect IN SEQUENCE, so a cold
 *    board load paid the sum of every log's parse time;
 *  - an EXPIRED cache entry blocked the merge on its re-inspect, so every
 *    TTL window re-paid the slowest log's latency on the request path.
 *
 * The rule now: cold misses go through a bounded-concurrency pool (the merge
 * still returns every row this call — merge correctness), and expired
 * entries are served stale AT ONCE while a background refresh re-inspects
 * (stale-while-revalidate, deduplicated per id).
 */
import { describe, expect, it } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import { createHarness } from "./b1-harness";

const WS = "/home/sid/repos/aidos";

type ServiceInternals = {
  _closedFolds: Map<string, { at: number }>;
  _closedFoldRefreshes: Map<string, Promise<void>>;
};

/** Rewind every cached fold's timestamp past the TTL, in place. */
function ageAllFolds(service: unknown): void {
  const folds = (service as unknown as ServiceInternals)._closedFolds;
  for (const entry of folds.values()) entry.at = Date.now() - 61000;
}

describe("#198 closed-session merge: bounded pool + stale-while-revalidate", () => {
  it("an expired cache does not block the merge: the stale frame returns while the refresh is still in flight", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    let inspects = 0;
    let releaseInspect: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseInspect = resolve;
    });
    const peer = harness.makeAgent({ id: "swr-closed-1" });
    (peer.session.header as { cwd?: string }).cwd = WS;
    harness.service.userSetTicket(harness.asAgent(peer), { title: "stale title" });
    const events = [...peer.session.events];
    harness.agents.splice(harness.agents.indexOf(peer), 1);
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId("swr-closed-1"), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== "swr-closed-1") throw new Error("not found");
        inspects += 1;
        if (inspects > 1) await gate; // the REFRESH is slow; only it waits
        return { meta: { id, cwd: WS }, events };
      },
    });
    const service = harness.service;
    // Cold: populates the cache.
    const first = await service.workspaceTickets(harness.asAgent());
    expect(first.tickets.map((r) => r.title)).toContain("stale title");
    expect(inspects).toBe(1);
    // Expire the entry, then merge while the re-inspect is gated shut.
    ageAllFolds(service);
    const t0 = performance.now();
    const second = await service.workspaceTickets(harness.asAgent());
    const elapsed = performance.now() - t0;
    // The merge returned WITHOUT waiting on the gated (still-pending) refresh.
    expect(second.tickets.map((r) => r.title)).toContain("stale title");
    expect(inspects).toBe(2);
    expect((service as unknown as ServiceInternals)._closedFoldRefreshes.has("swr-closed-1")).toBe(true);
    expect(elapsed).toBeLessThan(1000);
    // The background refresh completes and the NEXT merge is fresh again.
    releaseInspect!();
    await Promise.all([...(service as unknown as ServiceInternals)._closedFoldRefreshes.values()]);
    expect(inspects).toBe(2);
  });

  it("two merges hitting the same stale entry schedule ONE refresh, not two", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    let inspects = 0;
    const peer = harness.makeAgent({ id: "swr-dedupe-1" });
    (peer.session.header as { cwd?: string }).cwd = WS;
    harness.service.userSetTicket(harness.asAgent(peer), { title: "dedupe me" });
    const events = [...peer.session.events];
    harness.agents.splice(harness.agents.indexOf(peer), 1);
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId("swr-dedupe-1"), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== "swr-dedupe-1") throw new Error("not found");
        inspects += 1;
        return { meta: { id, cwd: WS }, events };
      },
    });
    const service = harness.service;
    await service.workspaceTickets(harness.asAgent());
    expect(inspects).toBe(1);
    ageAllFolds(service);
    await Promise.all([
      service.workspaceTickets(harness.asAgent()),
      service.workspaceTickets(harness.asAgent()),
    ]);
    await Promise.all([...(service as unknown as ServiceInternals)._closedFoldRefreshes.values()]);
    expect(inspects).toBe(2);
  });

  it("a cold merge with many closed sessions inspects with bounded concurrency, not serially", async () => {
    const N = 8;
    const LIMIT = 4; // CLOSED_INSPECT_CONCURRENCY
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const closedIds: string[] = [];
    const logs: Record<string, unknown[]> = {};
    for (let i = 0; i < N; i++) {
      const id = `pool-closed-${i}`;
      closedIds.push(id);
      const peer = harness.makeAgent({ id });
      (peer.session.header as { cwd?: string }).cwd = WS;
      harness.service.userSetTicket(harness.asAgent(peer), { title: `pool ticket ${i}` });
      logs[id] = [...peer.session.events];
      harness.agents.splice(harness.agents.indexOf(peer), 1);
    }
    let active = 0;
    let maxActive = 0;
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => closedIds.map((id) => ({ id: SessionId(id), cwd: WS })),
      inspect: async (id: string) => {
        if (!closedIds.includes(id)) throw new Error("not found");
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
        return { meta: { id, cwd: WS }, events: logs[id] };
      },
    });
    const merged = await harness.service.workspaceTickets(harness.asAgent());
    const titles = merged.tickets.map((r) => r.title);
    // Merge correctness: every closed session's rows are on THIS board.
    for (let i = 0; i < N; i++) expect(titles).toContain(`pool ticket ${i}`);
    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(LIMIT);
  });

  it("a refresh whose inspect fails drops the expired entry instead of serving it forever", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    let logReadable = true;
    const peer = harness.makeAgent({ id: "swr-vanish-1" });
    (peer.session.header as { cwd?: string }).cwd = WS;
    harness.service.userSetTicket(harness.asAgent(peer), { title: "vanishing" });
    const events = [...peer.session.events];
    harness.agents.splice(harness.agents.indexOf(peer), 1);
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId("swr-vanish-1"), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== "swr-vanish-1") throw new Error("not found");
        if (!logReadable) throw new Error("log unreadable");
        return { meta: { id, cwd: WS }, events };
      },
    });
    const service = harness.service;
    const first = await service.workspaceTickets(harness.asAgent());
    expect(first.tickets.map((r) => r.title)).toContain("vanishing");
    // The log becomes unreadable; the entry expires; the merge serves the
    // stale frame one last time while the background refresh discovers the
    // loss.
    logReadable = false;
    ageAllFolds(service);
    const second = await service.workspaceTickets(harness.asAgent());
    expect(second.tickets.map((r) => r.title)).toContain("vanishing");
    await Promise.all([...(service as unknown as ServiceInternals)._closedFoldRefreshes.values()]);
    const folds = (service as unknown as ServiceInternals)._closedFolds;
    expect(folds.has("swr-vanish-1")).toBe(false);
    // The NEXT merge no longer shows the vanished session's rows.
    const third = await service.workspaceTickets(harness.asAgent());
    expect(third.tickets.map((r) => r.title)).not.toContain("vanishing");
  });
});
