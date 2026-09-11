/**
 * #42: the board reads the store.
 *
 * `workspaceTickets` answers closed sessions from the WORKSPACE STORE — the
 * one-time backfill imports their logs on first open — and never scans a
 * log again. `coldTickets` queries the store too and is no longer limited
 * to live sessions. There is no log fallback: the store is the source of
 * truth for every closed row.
 *
 * Criterion map:
 *   1. the board opens with no cold scan, so a workspace with 119 logs does
 *      not stall — proven by COUNTING the persistence inspect path, not by
 *      timing it: after the first open every board read performs ZERO
 *      inspects (and zero lists), however many logs the workspace holds.
 *   2. a ticket from a closed session appears on the board — the closed
 *      log's ticket renders foreign with its origin session id and its
 *      evidence/comment maps keyed under it.
 *   3. a ticket whose session log was deleted still appears — after the
 *      import the log is removed from persistence entirely and the row is
 *      still on the board, on `workspaceTickets` and on `coldTickets`.
 *
 * Without this change (the 76e6ae5 cold scan): criterion 1 fails, because
 * every board read past the fold TTL re-inspects every closed log; and
 * criterion 3 fails, because a deleted log's rows leave with it — there is
 * no store holding them.
 */

import { describe, expect, it, vi } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import { createHarness } from "./b1-harness";

const WS = "/home/sid/repos/aidos";
const MANY = 119;

/**
 * One closed session's log: a ticket of this workspace, built by the real
 * service so the log holds exactly what a production session log holds,
 * then detached from the live agents so the board sees it as closed.
 */
function buildClosedLog(harness: ReturnType<typeof createHarness>, id: string, title: string) {
  const peer = harness.makeAgent({ id });
  (peer.session.header as { cwd?: string }).cwd = WS;
  harness.service.userSetTicket(harness.asAgent(peer), { title });
  const events = [...peer.session.events];
  harness.agents.splice(harness.agents.indexOf(peer), 1);
  return events;
}

describe("#42 criterion 1: no cold scan on board reads", () => {
  it("after the first open, board reads perform zero inspects — even with 119 logs", async () => {
    vi.useFakeTimers();
    try {
      const harness = createHarness(undefined, { cwd: WS });
      harness.installService();
      // 119 closed logs, one ticket each. The ids genuinely distinct so the
      // backfill renumbers every one.
      const ids = Array.from({ length: MANY }, (_, index) => `store-many-${index}`);
      const logs = new Map<string, unknown[]>();
      for (const id of ids) {
        logs.set(id, buildClosedLog(harness, id, `ticket from ${id}`));
      }
      let lists = 0;
      let inspects = 0;
      harness.ctx.reflect.provide("sessionPersistence", {
        list: async () => {
          lists += 1;
          return ids.map((id) => ({ id: SessionId(id), cwd: WS }));
        },
        inspect: async (id: string) => {
          inspects += 1;
          const events = logs.get(id);
          if (events === undefined) throw new Error("not found");
          return { meta: { id, cwd: WS }, events };
        },
      });

      const service = harness.service;
      // The first open runs the ONE-TIME backfill: every log inspected
      // exactly once, every ticket imported into the store.
      const first = await service.workspaceTickets(harness.asAgent());
      expect(first.tickets.map((row) => row.title)).toContain("ticket from store-many-0");
      expect(first.tickets.map((row) => row.title)).toContain(`ticket from store-many-${MANY - 1}`);
      expect(inspects).toBe(MANY);
      expect(lists).toBe(1);

      // Every later board read is a store query: no list, no inspect.
      const second = await service.workspaceTickets(harness.asAgent());
      expect(second.tickets.map((row) => row.title)).toContain("ticket from store-many-0");
      expect(inspects).toBe(MANY);
      expect(lists).toBe(1);

      // Past the old fold TTL too: there is no TTL-gated re-scan to fire.
      await vi.advanceTimersByTimeAsync(61000);
      const third = await service.workspaceTickets(harness.asAgent());
      expect(third.tickets.map((row) => row.title)).toContain(`ticket from store-many-${MANY - 1}`);
      // The pre-#42 merge fired background refreshes here (#198); await any
      // such refresh before counting, so this fails there and passes here.
      const internals = service as unknown as {
        _closedFoldRefreshes?: Map<string, Promise<void>>;
      };
      if (internals._closedFoldRefreshes !== undefined) {
        await Promise.all([...internals._closedFoldRefreshes.values()]);
      }
      expect(inspects).toBe(MANY);
      expect(lists).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("#42 criterion 2: a closed session's ticket appears on the board", () => {
  it("the imported row renders foreign with its origin session and its maps keyed under it", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const closedId = "store-closed-1";
    const events = buildClosedLog(harness, closedId, "closed ticket");
    let inspects = 0;
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId(closedId), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== closedId) throw new Error("not found");
        inspects += 1;
        return { meta: { id, cwd: WS }, events };
      },
    });
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "own ticket" });

    const result = await service.workspaceTickets(harness.asAgent());
    const titles = result.tickets.map((row) => row.title).sort();
    expect(titles).toEqual(["closed ticket", "own ticket"]);

    const foreign = result.tickets.find((row) => row.title === "closed ticket")!;
    expect(foreign.foreign).toBe(true);
    expect(foreign.sourceSessionId).toBe(closedId);
    // The one-time import is the only inspect: the board read itself scans
    // nothing.
    expect(inspects).toBe(1);

    // The maps ride with the row under the same session:id key the live
    // merge used, so the client reads them back identically.
    const own = result.tickets.find((row) => row.title === "own ticket")!;
    expect(result.evidence[String(own.id)]).toBeDefined();
    expect(result.evidence[closedId + ":" + foreign.id]).toBeDefined();
    expect(result.comments[closedId + ":" + foreign.id]).toBeDefined();
  });
});

describe("#42 criterion 3: a deleted log's ticket still appears", () => {
  it("once imported, removing the log from persistence changes nothing", async () => {
    vi.useFakeTimers();
    try {
      const harness = createHarness(undefined, { cwd: WS });
      harness.installService();
      const closedId = "store-deleted-1";
      const events = buildClosedLog(harness, closedId, "surviving ticket");
      let logDeleted = false;
      let inspects = 0;
      harness.ctx.reflect.provide("sessionPersistence", {
        list: async () => (logDeleted ? [] : [{ id: SessionId(closedId), cwd: WS }]),
        inspect: async (id: string) => {
          if (logDeleted) throw new Error("log deleted");
          if (id !== closedId) throw new Error("not found");
          inspects += 1;
          return { meta: { id, cwd: WS }, events };
        },
      });
      const service = harness.service;

      const first = await service.workspaceTickets(harness.asAgent());
      expect(first.tickets.map((row) => row.title)).toContain("surviving ticket");
      expect(inspects).toBe(1);

      // The session log is deleted — and time passes, so no inspect cache
      // (the pre-#42 merge's fold TTL) could serve the row. The board does
      // not notice: the store answers.
      logDeleted = true;
      await vi.advanceTimersByTimeAsync(120000);
      const second = await service.workspaceTickets(harness.asAgent());
      expect(second.tickets.map((row) => row.title)).toContain("surviving ticket");
      // And nothing reached for the logs to prove it: the deleted log was
      // never re-listed into the board and never re-inspected.
      expect(inspects).toBe(1);

      // coldTickets is a query too: the closed row answers there as well,
      // states filter included.
      const cold = service.coldTickets(harness.asAgent(), { sessionId: closedId });
      expect(cold.map((row) => row.title)).toContain("surviving ticket");
      const narrow = service.coldTickets(harness.asAgent(), {
        sessionId: closedId,
        states: ["in_progress"],
      });
      expect(narrow.map((row) => row.title)).not.toContain("surviving ticket");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("#42: a failed backfill refuses nothing and retries on the next open", () => {
  it("a failed list leaves the marker absent; the board still opens; the next open imports", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const goodId = "store-retry-good";
    const badId = "store-retry-bad";
    const goodEvents = buildClosedLog(harness, goodId, "good ticket");
    const badEvents = buildClosedLog(harness, badId, "bad ticket");
    const logs = new Map([
      [goodId, goodEvents],
      [badId, badEvents],
    ]);
    let listDown = true;
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "own ticket" });
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => {
        if (listDown) throw new Error("persistence down");
        return [goodId, badId].map((id) => ({ id: SessionId(id), cwd: WS }));
      },
      inspect: async (id: string) => {
        const events = logs.get(id);
        if (events === undefined) throw new Error("not found");
        return { meta: { id, cwd: WS }, events };
      },
    });

    // The list is down: no backfill runs, no marker lands, and the board
    // still opens over the live folds.
    const first = await service.workspaceTickets(harness.asAgent());
    expect(first.tickets.map((row) => row.title)).toEqual(["own ticket"]);

    // Persistence recovers: the next open retries the whole import — an
    // empty backfill here would have landed the marker and lost both logs.
    listDown = false;
    const second = await service.workspaceTickets(harness.asAgent());
    const titles = second.tickets.map((row) => row.title).sort();
    expect(titles).toEqual(["bad ticket", "good ticket", "own ticket"]);
  });

  it("one unreadable log is skipped while the rest still import", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const goodId = "store-skip-good";
    const badId = "store-skip-bad";
    const goodEvents = buildClosedLog(harness, goodId, "good ticket");
    buildClosedLog(harness, badId, "bad ticket");
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [
        { id: SessionId(goodId), cwd: WS },
        { id: SessionId(badId), cwd: WS },
      ],
      inspect: async (id: string) => {
        if (id === goodId) return { meta: { id, cwd: WS }, events: goodEvents };
        throw new Error("log unreadable");
      },
    });
    const service = harness.service;

    // The unreadable log does not fail the board: the good row lands.
    const result = await service.workspaceTickets(harness.asAgent());
    const titles = result.tickets.map((row) => row.title);
    expect(titles).toContain("good ticket");
    expect(titles).not.toContain("bad ticket");
  });
});
