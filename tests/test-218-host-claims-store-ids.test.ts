/**
 * #218: host creates claim their ids from the store port, and live writes
 * mirror into the store under #40's all-or-nothing bracket.
 *
 * Criterion map:
 *   1. a ticket created by the host claims its id from the store port, so
 *      no two tickets in a workspace share a numeric id regardless of
 *      which session created them;
 *   2. the collision #45's reviewer constructed on main (two live
 *      sessions each create a ticket, both get id 1) can no longer be
 *      constructed: the two ids differ and the merged board shows both
 *      rows;
 *   3. a write to a live session's ticket lands in both the session log
 *      and the store — and a store refusal refuses the whole write with
 *      the session log untouched (the mirrored all-or-nothing rule);
 *   4. covered by the flipped pinned test in
 *      tests/merge-closed-fold-cache.test.ts ("a ticket written to a live
 *      session after the backfill is on the board");
 *   5. a plain id addresses a ticket owned by another LIVE session — the
 *      residual #45 documented dies with the unified allocation;
 *   6. existing workspaces keep working: legacy fold-counter tickets are
 *      not renumbered, stay writable session-only, and never fold over
 *      (or under) an unrelated store row.
 *
 * Without this change: criterion-1/2 tests fail with both ids 1 (the
 * repro at the top pins the old shape), criterion-3 tests fail with the
 * store holding nothing, criterion-5 fails with own-wins (the caller's
 * own ticket moves, the peer's does not), and criterion-6's fresh-id
 * assertion fails with a reused id.
 */

import { describe, expect, it } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import { Store } from "../src/kernel/store";
import { MemoryStorage } from "../src/kernel/storage-memory";
import { StoreWriteRefused } from "../src/kernel/types";
import { DuplicateSlug } from "../src/kernel/types";
import { createHarness } from "./b1-harness";
import { makeConfig } from "./helpers";

const WS = "/home/sid/repos/aidos";

/** Two live agents of one workspace sharing one harness (one store). */
function twoAgentHarness() {
  const harness = createHarness(undefined, { cwd: WS });
  harness.installService();
  const peer = harness.makeAgent({ id: "session-218-peer" });
  (peer.session.header as { cwd?: string }).cwd = WS;
  return { harness, peer };
}

/** The workspace store entry behind one agent, through service internals. */
function workspaceEntry(harness: ReturnType<typeof createHarness>, agent?: Parameters<ReturnType<typeof createHarness>["asAgent"]>[0]) {
  const service = harness.service as unknown as {
    _workspaceStore(agent: unknown): { store: Store; projectId: number } | null;
  };
  return service._workspaceStore(harness.asAgent(agent));
}

/** The session-log events of one agent, as kernel events. */
function sessionKinds(harness: ReturnType<typeof createHarness>, agent?: Parameters<ReturnType<typeof createHarness>["asAgent"]>[0]) {
  return harness.aidosEvents(agent ?? harness.agent);
}

describe("#218 criteria 1+2: one id space across live sessions", () => {
  it("two live sessions creating a ticket each get distinct ids", () => {
    const { harness, peer } = twoAgentHarness();
    const own = harness.service.userSetTicket(harness.asAgent(), { title: "own ticket" });
    const foreign = harness.service.userSetTicket(harness.asAgent(peer), { title: "peer ticket" });
    // The old shape was ownId=1 peerId=1 (reproduced on main before the
    // fix); the port hands out 1 then 2.
    expect(own.id).toBe(1);
    expect(foreign.id).toBe(2);
  });

  it("the merged board shows both rows, and the store holds both creates", async () => {
    const { harness, peer } = twoAgentHarness();
    harness.service.userSetTicket(harness.asAgent(), { title: "own ticket" });
    harness.service.userSetTicket(harness.asAgent(peer), { title: "peer ticket" });
    const board = await harness.service.workspaceTickets(harness.asAgent());
    const ids = board.tickets.map((row) => row.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2]);
    expect(board.tickets.map((row) => row.title).sort()).toEqual(["own ticket", "peer ticket"]);
    const entry = workspaceEntry(harness);
    expect(entry !== null).toBe(true);
    const storeIds = [...entry!.store.state.tickets.keys()].sort((a, b) => a - b);
    expect(storeIds).toEqual([1, 2]);
  });

  it("two kernel stores sharing one port allocate distinct ids (the port, not the fold)", () => {
    const storage = new MemoryStorage();
    const first = new Store(makeConfig(), { storage });
    const second = new Store(makeConfig(), { storage });
    // The public allocate is what the host calls: consecutive claims
    // differ even though both folds are stale relative to each other.
    expect(first.allocateTicketId()).toBe(1);
    expect(second.allocateTicketId()).toBe(2);
    expect(first.allocateTicketId()).toBe(3);
    storage.close();
  });

  it("a second create with a taken slug refuses whole, with the session log untouched", () => {
    const { harness, peer } = twoAgentHarness();
    harness.service.userSetTicket(harness.asAgent(), { title: "Same title" });
    let refused: unknown;
    try {
      harness.service.userSetTicket(harness.asAgent(peer), { title: "Same title" });
    } catch (error) {
      refused = error;
    }
    // Slugs are workspace-unique, so the second session's create refuses
    // (pre-fix both sessions held the same slug under colliding ids).
    // The project/phase bootstrap stays (it precedes the create, as on a
    // same-session refusal); what must be absent is the ticket itself.
    expect(refused).toBeInstanceOf(DuplicateSlug);
    expect(
      sessionKinds(harness, peer).filter(
        (event) => event.kind === "ticket/change" && (event as { operation?: string }).operation === "create",
      ).length,
    ).toBe(0);
    // The refusal consumed nothing: the next create takes the very next
    // id, with no gap left by the refused one.
    const next = harness.service.userSetTicket(harness.asAgent(peer), { title: "Other" });
    expect(next.id).toBe(2);
  });
});

describe("#218 criterion 3: live writes land in both homes, or neither", () => {
  it("a create and its later writes land one session event and one store row each", async () => {
    const { harness } = twoAgentHarness();
    const service = harness.service;
    const created = service.userSetTicket(harness.asAgent(), { title: "mirrored" });
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: created.id,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    await service.userMoveTicket(harness.asAgent(), { ticketId: created.id, to: "in_progress" } as never);

    const entry = workspaceEntry(harness);
    expect(entry !== null).toBe(true);
    // The session log holds project + phase + create + evidence + move;
    // the store holds the project row plus every ticket-scoped write.
    const sessionEvents = sessionKinds(harness);
    expect(sessionEvents.filter((event) => event.kind === "ticket/change").length).toBe(2);
    const storeTickets = entry!.store.state.tickets.get(created.id);
    expect(storeTickets?.title).toBe("mirrored");
    expect(storeTickets?.state).toBe("in_progress");
    expect(entry!.store.state.evidence.get(created.id)?.length).toBe(1);
    // The store copy is stamped with the creating session, so the merge
    // never elects a reader as owner.
    expect(entry!.store.originSessionOf(created.id)).toBe(harness.agent.session.id);
  });

  it("a store refusal refuses the whole write and the session log gains no event", async () => {
    const { harness } = twoAgentHarness();
    const service = harness.service;
    const created = service.userSetTicket(harness.asAgent(), { title: "doomed" });
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: created.id,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    const entry = workspaceEntry(harness);
    expect(entry !== null).toBe(true);
    // Make THIS connection refuse every write — the SQLITE_READONLY
    // condition #40's tests use, now at host level.
    const raw = (entry!.store as unknown as { _storage: { _db: { exec: (sql: string) => void } } })._storage;
    raw._db.exec(`PRAGMA query_only = 1`);
    try {
      const sessionBefore = sessionKinds(harness).length;
      const storeBefore = entry!.store.events().length;
      let refused: unknown;
      try {
        await service.userMoveTicket(harness.asAgent(), { ticketId: created.id, to: "in_progress" } as never);
      } catch (error) {
        refused = error;
      }
      expect(refused).toBeInstanceOf(StoreWriteRefused);
      expect((refused as Error).message).toMatch(/store refused the write/);
      expect((refused as Error).message).toMatch(/readonly/);
      expect(sessionKinds(harness).length).toBe(sessionBefore);
      expect(entry!.store.events().length).toBe(storeBefore);
    } finally {
      raw._db.exec(`PRAGMA query_only = 0`);
    }
  });
});

describe("#218 criterion 5: a plain id addresses the foreign live ticket", () => {
  it("a move addressed with the peer's plain id lands in the peer's log and the store", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    const own = service.userSetTicket(harness.asAgent(), { title: "own" });
    const peerTicket = service.userSetTicket(harness.asAgent(peer), { title: "peer detail" });
    // Distinct ids: the peer's ticket is NOT the caller's number.
    expect(peerTicket.id).not.toBe(own.id);
    const plainRef = String(peerTicket.id);
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: plainRef,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);

    await service.userMoveTicket(harness.asAgent(), { ticketId: plainRef, to: "in_progress" } as never);

    // The write landed in the OWNER's log — pre-fix own-wins moved the
    // caller's same-numbered ticket instead and the peer's log stayed put.
    const peerMoves = harness
      .aidosEvents(peer)
      .filter((event) => event.kind === "ticket/change").length;
    expect(peerMoves).toBe(2); // create + move
    const ownMoves = harness
      .aidosEvents(harness.agent)
      .filter((event) => event.kind === "ticket/change").length;
    expect(ownMoves).toBe(1); // create only
    // And in the store: the same ticket reads in_progress workspace-wide.
    const entry = workspaceEntry(harness);
    expect(entry!.store.state.tickets.get(peerTicket.id)?.state).toBe("in_progress");
    expect(service.getTickets(harness.asAgent()).find((row) => row.id === peerTicket.id)?.state).toBe(
      "in_progress",
    );
  });
});

describe("#218 criterion 6: existing workspaces keep working, nothing renumbered", () => {
  /**
   * A legacy session log: two tickets minted from a per-session fold
   * counter (ids 1, 2) that the workspace store never saw — seeded
   * straight into the session the way a pre-#218 workspace holds them.
   */
  function legacySeed(): { projectId: number; events: ReturnType<Store["events"]> } {
    const seed = new Store(makeConfig());
    const projectId = seed.createProject(WS, "aidos");
    seed.createTicket(projectId, "legacy one", "d1", { slug: "legacy-one" });
    seed.createTicket(projectId, "legacy two", "d2", { slug: "legacy-two" });
    return { projectId, events: seed.events() };
  }

  function legacyHarness() {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    for (const event of legacySeed().events) {
      harness.appendAidosEvent(harness.agent, event);
    }
    return harness;
  }

  it("a new create takes a fresh id in both spaces, and legacy rows keep their numbers", async () => {
    const harness = legacyHarness();
    const service = harness.service;
    // An unrelated closed log imports ticket 1 into the store: the exact
    // shape that made a blind mirror corrupt (legacy 1 vs imported 1).
    const closedId = "session-218-imported";
    const importSeed = new Store(makeConfig());
    const importProject = importSeed.createProject(WS, "aidos");
    importSeed.createTicket(importProject, "imported", "d", { slug: "imported" });
    const importEvents = [...importSeed.events()].map((data, seq) => ({ seq, type: data.kind, data }));
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId(closedId), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== closedId) throw new Error("not found");
        return { meta: { id, cwd: WS }, events: importEvents };
      },
    });
    await service.workspaceTickets(harness.asAgent());

    const created = service.userSetTicket(harness.asAgent(), { title: "brand new" });
    // Legacy holds 1..2, the store holds imported 1: the fresh id is 3 —
    // neither a reuse of the session counter's next (which the store
    // would also collide on) nor a renumbering of anything existing.
    expect(created.id).toBe(3);
    const board = await service.workspaceTickets(harness.asAgent());
    const legacyRows = board.tickets.filter((row) => row.slug === "legacy-one" || row.slug === "legacy-two");
    expect(legacyRows.map((row) => row.id).sort((a, b) => a - b)).toEqual([1, 2]);
    expect(board.tickets.some((row) => row.slug === "imported")).toBe(true);
    expect(board.tickets.some((row) => row.slug === "brand-new")).toBe(true);
  });

  it("a legacy ticket stays writable session-only and never folds over the store row", async () => {
    const harness = legacyHarness();
    const service = harness.service;
    const closedId = "session-218-imported";
    const importSeed = new Store(makeConfig());
    const importProject = importSeed.createProject(WS, "aidos");
    importSeed.createTicket(importProject, "imported", "d", { slug: "imported" });
    const importEvents = [...importSeed.events()].map((data, seq) => ({ seq, type: data.kind, data }));
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId(closedId), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== closedId) throw new Error("not found");
        return { meta: { id, cwd: WS }, events: importEvents };
      },
    });
    await service.workspaceTickets(harness.asAgent());

    const entry = workspaceEntry(harness);
    const storeBefore = entry!.store.events().length;
    // Legacy ticket 1 shares its number with the unrelated imported
    // ticket 1: the move must succeed (not refused) and must NOT mirror
    // (mirroring would fold one ticket over the other).
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: 1,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    await service.userMoveTicket(harness.asAgent(), { ticketId: 1, to: "in_progress" } as never);
    expect(entry!.store.events().length).toBe(storeBefore);
    expect(entry!.store.state.tickets.get(1)?.slug).toBe("imported");
    expect(entry!.store.state.tickets.get(1)?.state).toBe("open");
    // The session's own ticket moved, under its own number.
    const board = await service.workspaceTickets(harness.asAgent());
    expect(board.tickets.find((row) => row.slug === "legacy-one")?.state).toBe("in_progress");
  });
});
