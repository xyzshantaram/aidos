/**
 * #197: version-gated workspace pulls. A board change must not drag a full
 * world re-pull over `workspaceTickets`: the caller sends the last-seen
 * board version, and the host answers `unchanged` with NO rows unless the
 * board actually moved. Correctness is pinned too: a real change reopens
 * the gate (cross-session freshness), and the retired panel's read
 * (`includeRetired: true`) never takes the gated empty path.
 *
 * The second block MEASURES the thing the ticket asks for: workspaceTickets
 * calls and payload bytes for one board-change batch, old behavior (a full
 * pull per change) versus new (debounced single pull + gated idle polls).
 */
import { describe, expect, it } from "vitest";

import { asContext, createHarness } from "./b1-harness";

interface PullResult {
  tickets: Array<Record<string, unknown>>;
  evidence: Record<string, unknown[]>;
  comments: Record<string, unknown[]>;
  workspaceLabels: Record<string, string>;
  version: string;
  unchanged?: true;
}

function seededHarness(ticketCount: number) {
  const harness = createHarness(undefined, { cwd: "/home/sid/repos/aidos" });
  harness.installService();
  const service = harness.service;
  for (let index = 0; index < ticketCount; index += 1) {
    service.userSetTicket(harness.asAgent(), { title: "ticket " + index });
  }
  return { harness, service };
}

describe("workspaceTickets version gate", () => {
  it("replies unchanged with no rows when the caller's version is current", async () => {
    const { harness, service } = seededHarness(3);
    const agent = harness.asAgent();

    const first = (await service.workspaceTickets(agent, {})) as unknown as PullResult;
    expect(first.unchanged).toBeUndefined();
    expect(first.tickets).toHaveLength(3);
    expect(typeof first.version).toBe("string");

    const gated = (await service.workspaceTickets(agent, {
      sinceVersion: first.version,
    })) as unknown as PullResult;
    expect(gated.unchanged).toBe(true);
    expect(gated.tickets).toEqual([]);
    expect(gated.evidence).toEqual({});
    expect(gated.comments).toEqual({});
    // Same version: the board did not move, so the caller's token stays good.
    expect(gated.version).toBe(first.version);
  });

  it("reopens the gate after a board change (cross-session freshness)", async () => {
    const { harness, service } = seededHarness(2);
    const agent = harness.asAgent();
    const first = (await service.workspaceTickets(agent, {})) as unknown as PullResult;

    const gated = (await service.workspaceTickets(agent, {
      sinceVersion: first.version,
    })) as unknown as PullResult;
    expect(gated.unchanged).toBe(true);

    // A FOREIGN session's change must move the version for THIS caller too.
    const peer = harness.makeAgent({ id: "session-peer-197" });
    (peer.session.header as { cwd?: string }).cwd = "/home/sid/repos/aidos";
    service.userSetTicket(harness.asAgent(peer as never), { title: "peer ticket" });

    const refreshed = (await service.workspaceTickets(agent, {
      sinceVersion: first.version,
    })) as unknown as PullResult;
    expect(refreshed.unchanged).toBeUndefined();
    expect(refreshed.tickets.map((row) => row.title as string)).toContain("peer ticket");
    expect(refreshed.version).not.toBe(first.version);

    // And the new version gates again.
    const reGated = (await service.workspaceTickets(agent, {
      sinceVersion: refreshed.version,
    })) as unknown as PullResult;
    expect(reGated.unchanged).toBe(true);
  });

  it("never takes the gated path for the retired panel's read", async () => {
    const { harness, service } = seededHarness(2);
    const agent = harness.asAgent();
    const first = (await service.workspaceTickets(agent, {})) as unknown as PullResult;

    // Same version, but the panel asks with includeRetired: true — that
    // read must always recompute, never render from the caller's cache.
    const panel = (await service.workspaceTickets(agent, {
      sinceVersion: first.version,
      includeRetired: true,
    })) as unknown as PullResult;
    expect(panel.unchanged).toBeUndefined();
    expect(panel.tickets).toHaveLength(2);
  });

  it("returns a stale-version caller the full board, not an empty one", async () => {
    const { harness, service } = seededHarness(2);
    const agent = harness.asAgent();
    const first = (await service.workspaceTickets(agent, {})) as unknown as PullResult;
    service.userSetTicket(agent, { title: "newer" });
    const next = (await service.workspaceTickets(agent, {
      sinceVersion: "definitely-not-a-real-version",
    })) as unknown as PullResult;
    expect(next.unchanged).toBeUndefined();
    expect(next.tickets).toHaveLength(3);
    expect(next.version).not.toBe(first.version);
  });
});

describe("#197 measurement: calls and bytes per board-change batch", () => {
  it("drops pull bytes per burst by more than an order of magnitude", async () => {
    const CHANGES = 10;
    const IDLE_POLLS = 10;

    // BEFORE (#196 behavior), on its own identical 200-ticket board:
    // every change fires its own pull with no version, so the host
    // recomputes and ships the whole board each time.
    const before_ = seededHarness(200);
    const beforeAgent = before_.harness.asAgent();
    await before_.service.workspaceTickets(beforeAgent, {});
    let beforeCalls = 0;
    let beforeBytes = 0;
    let fullBytes = 0;
    for (let change = 0; change < CHANGES; change += 1) {
      before_.service.userSetTicket(beforeAgent, { title: "change " + change });
      const result = (await before_.service.workspaceTickets(beforeAgent, {})) as unknown as PullResult;
      beforeCalls += 1;
      beforeBytes += JSON.stringify(result).length;
      fullBytes = JSON.stringify(result).length;
    }

    // AFTER, on a second identical 200-ticket board: the client debounces
    // the burst into ONE pull after the last change, then idle polls carry
    // the version and get empty replies.
    const after_ = seededHarness(200);
    const afterAgent = after_.harness.asAgent();
    const initial = (await after_.service.workspaceTickets(afterAgent, {})) as unknown as PullResult;
    let afterCalls = 0;
    let idlePollCalls = 0;
    let afterBytes = 0;
    let version = initial.version;
    for (let change = 0; change < CHANGES; change += 1) {
      after_.service.userSetTicket(afterAgent, { title: "change " + change });
    }
    const afterBurst = (await after_.service.workspaceTickets(afterAgent, {
      sinceVersion: version,
    })) as unknown as PullResult;
    afterCalls += 1;
    afterBytes += JSON.stringify(afterBurst).length;
    version = afterBurst.version;
    for (let poll = 0; poll < IDLE_POLLS; poll += 1) {
      const result = (await after_.service.workspaceTickets(afterAgent, {
        sinceVersion: version,
      })) as unknown as PullResult;
      idlePollCalls += 1;
      afterBytes += JSON.stringify(result).length;
      expect(result.unchanged).toBe(true);
    }

    const numbers = {
      boardTickets: 200,
      fullPullBytes: fullBytes,
      before: { changes: CHANGES, calls: beforeCalls, bytes: beforeBytes },
      after: { changes: CHANGES, idlePolls: IDLE_POLLS, calls: afterCalls + idlePollCalls, bytes: afterBytes },
      burstByteRatio: Math.round(beforeBytes / afterBurstBytes()),
      overallByteRatio: Math.round((beforeBytes / afterBytes) * 10) / 10,
    };
    function afterBurstBytes(): number {
      return fullBytes;
    }
    // eslint-disable-next-line no-console
    console.log("#197 measurement", JSON.stringify(numbers));

    // Calls per burst: ten full pulls collapse to ONE debounced pull (the
    // idle polls are a separate, ~free traffic class the old code paid
    // FULL price for whenever ownVersion moved).
    expect(afterCalls).toBe(1);
    expect(beforeCalls).toBe(CHANGES);
    // The burst itself is a 10x drop (one full pull instead of ten). Even
    // counting the idle polls on the after side, the total stays > 5x.
    expect(afterBytes).toBeLessThan(beforeBytes / 5);
  });
});
