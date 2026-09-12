/**
 * #220: the mirror's lockstep check can fuse two unrelated tickets.
 *
 * #218 mirrors a non-create write into the store only in LOCKSTEP — same
 * id, same slug, same revision. #218's reviewer DROVE the reachable recipe
 * instead of accepting the builder's "contrived" framing: a legacy live
 * ticket at exactly revision 2 (a create plus one edit) sharing a numeric
 * id and slug with a backfilled ticket — two same-titled tickets, one
 * closed and imported. The attach MIRRORED (storeDelta=1), and the fusion
 * was STICKY (revisions advancing together afterwards).
 *
 * The fix: lockstep also matches `createdAt`, which the backfill preserves
 * (store.ts create `at`, and the squashing set's `...final` spread).
 *
 * Criterion map:
 *   C1. the reviewer's driven recipe is a test: a write to a legacy
 *       ticket whose id, slug and revision all match an unrelated store
 *       row does NOT mirror. FAILS on 6255f38 (the attach mirrors).
 *   C2. the identity check distinguishes two tickets created at different
 *       times using the backfill-preserved field — and a genuine lockstep
 *       match (same birth) still mirrors, so the fix does not over-refuse.
 *   C3. fusion stickiness is covered: once refused, later writes to EITHER
 *       ticket still land only on their own row — including after the
 *       revisions re-converge, where a revision-only check would re-fuse.
 *       FAILS on 6255f38.
 *   C4. the store-ahead id reuse direction is pinned by a test, not only
 *       by max() in source (the #218 review's coverage gap). Passes both
 *       before and after the fix by design.
 *   C5. the legacy-sweep migration #219 needs can be built on this
 *       identity rule: a sweep pass over a rev-2 twin migrates the genuine
 *       row by touch and fuses nothing. FAILS on 6255f38.
 *   C6. nothing in #218 regresses: tests/test-218-host-claims-store-ids
 *       passes UNMODIFIED (verified, not duplicated here).
 */

import { describe, expect, it } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import type { AidosEvent } from "../src/kernel/events";
import { Store } from "../src/kernel/store";
import type { TicketSnapshot } from "../src/kernel/types";
import { createHarness } from "./b1-harness";
import { makeConfig } from "./helpers";

const WS = "/home/sid/repos/aidos";
const TWIN_TITLE = "Fix the build";
const TWIN_SLUG = "fix-the-build";
/** The live legacy ticket's birth — deliberately far from IMPORTED_AT. */
const LEGACY_AT = 1000.0;
/** The closed ticket's birth: a different time, so a different ticket. */
const IMPORTED_AT = 2000.0;

/** The workspace store entry behind one harness, through service internals. */
function twinEntry(harness: ReturnType<typeof createHarness>): {
  store: Store;
  projectId: number;
} {
  const service = harness.service as unknown as {
    _workspaceStore(agent: unknown): { store: Store; projectId: number } | null;
  };
  const entry = service._workspaceStore(harness.asAgent(harness.agent));
  if (entry === null) {
    throw new Error("the workspace store did not open");
  }
  return entry;
}

/** The latest session-log snapshot of one ticket (its ticket/change payload). */
function sessionSnapshot(
  harness: ReturnType<typeof createHarness>,
  id: number,
): TicketSnapshot {
  const changes = harness
    .aidosEvents(harness.agent)
    .filter(
      (event): event is Extract<AidosEvent, { kind: "ticket/change" }> =>
        event.kind === "ticket/change" && event.ticket.id === id,
    );
  const last = changes[changes.length - 1];
  if (last === undefined) {
    throw new Error(`no session ticket/change for ticket ${id}`);
  }
  return last.ticket;
}

/**
 * The reviewer's driven recipe, built exactly as described: a legacy live
 * ticket at exactly revision 2 (create plus one edit) born at LEGACY_AT,
 * and a closed same-titled ticket born at IMPORTED_AT whose backfill lands
 * on the same numeric id with the same slug at revision 2 (the backfill
 * ALWAYS squashes to rev 2, and with an empty store it neither renumbers
 * past 1 nor suffixes the slug).
 */
async function twinHarness(): Promise<{
  harness: ReturnType<typeof createHarness>;
  entry: { store: Store; projectId: number };
}> {
  const legacySeed = new Store(makeConfig(), { now: () => LEGACY_AT });
  const legacyProject = legacySeed.createProject(WS, "aidos");
  legacySeed.createTicket(legacyProject, TWIN_TITLE, "legacy description");
  legacySeed.setTicket(1, { description: "legacy description, edited once" });

  const harness = createHarness(undefined, { cwd: WS });
  harness.installService();
  for (const event of legacySeed.events()) {
    harness.appendAidosEvent(harness.agent, event);
  }

  const closedId = "session-220-closed-twin";
  const closedSeed = new Store(makeConfig(), { now: () => IMPORTED_AT });
  const closedProject = closedSeed.createProject(WS, "aidos");
  closedSeed.createTicket(closedProject, TWIN_TITLE, "closed description");
  closedSeed.setTicket(1, { description: "closed description, edited once" });
  const importEvents = [...closedSeed.events()].map((data, seq) => ({
    seq,
    type: data.kind,
    data,
  }));
  harness.ctx.reflect.provide("sessionPersistence", {
    list: async () => [{ id: SessionId(closedId), cwd: WS }],
    inspect: async (id: string) => {
      if (id !== closedId) throw new Error("not found");
      return { meta: { id, cwd: WS }, events: importEvents };
    },
  });
  await harness.service.workspaceTickets(harness.asAgent());
  return { harness, entry: twinEntry(harness) };
}

describe("#220 C1: the reviewer's driven recipe does not mirror", () => {
  it("a write to a rev-2 legacy twin stays session-only", async () => {
    const { harness, entry } = await twinHarness();
    // The triple the old check treated as identity really does match...
    const session = sessionSnapshot(harness, 1);
    const stored = entry.store.state.tickets.get(1);
    expect(session.slug).toBe(TWIN_SLUG);
    expect(stored?.slug).toBe(TWIN_SLUG);
    expect(session.revision).toBe(2);
    expect(stored?.revision).toBe(2);
    // ...but the birth instants differ: two tickets, not one.
    expect(session.createdAt).toBe(LEGACY_AT);
    expect(stored?.createdAt).toBe(IMPORTED_AT);
    // So the attach the reviewer drove must NOT mirror. Pre-fix this lands
    // in the store (storeDelta=1), writing onto the unrelated row.
    const storeBefore = entry.store.events().length;
    harness.service.userAttachEvidence(harness.asAgent(), {
      ticketId: 1,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    expect(entry.store.events().length).toBe(storeBefore);
    expect(entry.store.state.tickets.get(1)?.state).toBe("open");
    expect(entry.store.state.evidence.get(1)?.length ?? 0).toBe(0);
    // The session's own ticket took the write: not refused, just unmirrored.
    expect(
      harness
        .aidosEvents(harness.agent)
        .filter((event) => event.kind === "evidence/attached").length,
    ).toBe(1);
  });
});

describe("#220 C2: createdAt distinguishes, because the backfill preserves it", () => {
  it("the imported row's birth is the closed ticket's birth, not the import time", async () => {
    const { entry } = await twinHarness();
    expect(entry.store.state.tickets.get(1)?.createdAt).toBe(IMPORTED_AT);
  });

  it("a genuine lockstep match — one ticket, one birth — still mirrors", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const service = harness.service;
    const created = service.userSetTicket(harness.asAgent(), { title: "genuine" });
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: created.id,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    await service.userMoveTicket(harness.asAgent(), {
      ticketId: created.id,
      to: "in_progress",
    } as never);
    const entry = twinEntry(harness);
    expect(entry.store.state.tickets.get(created.id)?.state).toBe("in_progress");
    // Same event landed in both homes, so the births agree: the fix refuses
    // twins without refusing this.
    expect(sessionSnapshot(harness, created.id).createdAt).toBe(
      entry.store.state.tickets.get(created.id)?.createdAt,
    );
  });
});

describe("#220 C3: the refused fusion does not stick later writes together", () => {
  it("once refused, later writes to EITHER ticket land only on their own row", async () => {
    const { harness, entry } = await twinHarness();
    const service = harness.service;
    // 1. The first touch refuses (the C1 shape).
    const storeBefore = entry.store.events().length;
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: 1,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    expect(entry.store.events().length).toBe(storeBefore);
    // 2. A write to the STORE twin lands only there: the session ticket is
    // still open at revision 2, and the board still shows it open.
    // (The gate needs evidence before the move, on the store row itself.)
    entry.store.attachEvidence(1, "builtin:user_signoff", {}, "user");
    entry.store.moveTicket(1, "in_progress", "user");
    expect(entry.store.state.tickets.get(1)?.state).toBe("in_progress");
    expect(entry.store.state.tickets.get(1)?.revision).toBe(3);
    expect(sessionSnapshot(harness, 1).revision).toBe(2);
    // The session row itself is untouched by the store-side write. (The
    // merged board shows one row for the shared slug — read-side dedupe,
    // #219 territory — so the row-level folds are the assertion here.)
    expect(sessionSnapshot(harness, 1).state).toBe("open");
    // 3. A later session-side move still refuses — nothing folds over the
    // store row's own write.
    const storeMid = entry.store.events().length;
    await service.userMoveTicket(harness.asAgent(), { ticketId: 1, to: "in_progress" } as never);
    expect(entry.store.events().length).toBe(storeMid);
    expect(entry.store.state.tickets.get(1)?.state).toBe("in_progress");
    expect(entry.store.state.tickets.get(1)?.revision).toBe(3);
    expect(sessionSnapshot(harness, 1).revision).toBe(3);
    // 4. The revisions have now RE-CONVERGED (3 vs 3) with the slug still
    // equal — exactly where a revision-only check re-fuses. The birth
    // instant still refuses: the session edit lands only in the session.
    service.userSetTicket(harness.asAgent(), {
      ticketId: 1,
      description: "session edit after the moves",
    });
    expect(entry.store.events().length).toBe(storeMid);
    expect(entry.store.state.tickets.get(1)?.revision).toBe(3);
    expect(entry.store.state.tickets.get(1)?.description).not.toBe(
      "session edit after the moves",
    );
    expect(sessionSnapshot(harness, 1).revision).toBe(4);
    // Both rows stay readable, each with its own content.
    const board = await service.workspaceTickets(harness.asAgent());
    expect(board.tickets.find((row) => row.id === 1)?.state).toBe("in_progress");
    expect(sessionSnapshot(harness, 1).description).toBe("session edit after the moves");
  });
});

describe("#220 C4: the store-ahead id reuse direction is pinned", () => {
  it("a create after a store-ahead backfill takes a fresh id, never a reused one", async () => {
    // The live session holds ONE legacy ticket (its fold counter says 2
    // next); the closed log holds THREE. A blind fold-counter create would
    // reuse 2 — colliding with imported 2.
    const legacySeed = new Store(makeConfig(), { now: () => LEGACY_AT });
    const legacyProject = legacySeed.createProject(WS, "aidos");
    legacySeed.createTicket(legacyProject, "legacy lone", "d");
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    for (const event of legacySeed.events()) {
      harness.appendAidosEvent(harness.agent, event);
    }
    const closedId = "session-220-store-ahead";
    const importSeed = new Store(makeConfig(), { now: () => IMPORTED_AT });
    const importProject = importSeed.createProject(WS, "aidos");
    importSeed.createTicket(importProject, "imported a", "d");
    importSeed.createTicket(importProject, "imported b", "d");
    importSeed.createTicket(importProject, "imported c", "d");
    const importEvents = [...importSeed.events()].map((data, seq) => ({
      seq,
      type: data.kind,
      data,
    }));
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId(closedId), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== closedId) throw new Error("not found");
        return { meta: { id, cwd: WS }, events: importEvents };
      },
    });
    await harness.service.workspaceTickets(harness.asAgent());
    const entry = twinEntry(harness);
    expect([...entry.store.state.tickets.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    // max(port next=4, session next=2): the fresh id is 4 in both spaces.
    const created = harness.service.userSetTicket(harness.asAgent(), { title: "brand new" });
    expect(created.id).toBe(4);
    expect(entry.store.state.tickets.get(4)?.slug).toBe("brand-new");
  });
});

describe("#220 C5: the sweep #219 needs can be built on this rule", () => {
  it("a sweep pass over a rev-2 twin migrates the genuine row and fuses nothing", async () => {
    const { harness, entry } = await twinHarness();
    const service = harness.service;
    // A live ticket created after the backfill: the genuine row a sweep
    // migrates by touch. (The gate needs evidence before the move; the
    // genuine attach mirrors, like the create did.)
    const live = service.userSetTicket(harness.asAgent(), { title: "live work" });
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: live.id,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    const storeBefore = entry.store.events().length;
    // The sweep's touch step, over every session ticket: the twin refuses...
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: 1,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    // ...while the genuine row migrates in place.
    await service.userMoveTicket(harness.asAgent(), {
      ticketId: live.id,
      to: "in_progress",
    } as never);
    // Exactly one store event: the genuine move. The twin added nothing.
    expect(entry.store.events().length).toBe(storeBefore + 1);
    // The twin's store row is the import untouched.
    expect(entry.store.state.tickets.get(1)?.createdAt).toBe(IMPORTED_AT);
    expect(entry.store.state.tickets.get(1)?.state).toBe("open");
    expect(entry.store.state.evidence.get(1)?.length ?? 0).toBe(0);
    // The genuine row followed its session ticket.
    expect(entry.store.state.tickets.get(live.id)?.state).toBe("in_progress");
    // And the session twin is intact and still distinguishable, so the
    // sweep's import-as-new step can rescue it without guessing.
    expect(sessionSnapshot(harness, 1).revision).toBe(2);
    expect(sessionSnapshot(harness, 1).createdAt).not.toBe(
      entry.store.state.tickets.get(1)?.createdAt,
    );
  });
});
