/**
 * #43: writes to an orphaned ticket.
 *
 * When a ticket's origin session is closed or deleted, `_ownerSession`
 * stops throwing `OwnerUnavailable`: the write routes to a synthetic
 * store-backed session whose `append` lands the event in the workspace
 * store alone, through the kernel's mirrored #40 bracket. A live origin
 * still appends to its own session log — the routing change is scoped to
 * the orphan case and nothing else.
 *
 * Criterion map:
 *   1. signoff on a ticket whose origin session is closed moves the state
 *      — the signoff evidence is attached through the orphan route, the
 *      gate reads it from the store's own state, and the move lands.
 *   2. a move lands after the origin log is deleted from disk — the log
 *      is REMOVED from the fake persistence (list returns nothing, inspect
 *      throws), not merely marked closed, and the move still lands.
 *   3. a ticket with a live origin still writes to that session's log —
 *      the regression guard: the orphan fix must not divert live writes.
 *
 * Without this change (c130aba): criteria 1 and 2 fail with
 * "ticket's owning session ... is not open" — the OwnerUnavailable throw
 * this ticket removes. Criterion 3 passes before and after; it pins the
 * invariant the fix must not break.
 */

import { describe, expect, it } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import { createHarness } from "./b1-harness";

const WS = "/home/sid/repos/aidos";

/**
 * Build one closed session's log with a real service so the events are
 * exactly what a production log holds, then detach the agent so the
 * session is closed. `seed` runs against the live peer BEFORE closing.
 */
function buildClosedLog(
  harness: ReturnType<typeof createHarness>,
  id: string,
  seed: (harness: ReturnType<typeof createHarness>, peer: ReturnType<typeof harness.makeAgent>) => void,
) {
  const peer = harness.makeAgent({ id });
  (peer.session.header as { cwd?: string }).cwd = WS;
  seed(harness, peer);
  const events = [...peer.session.events];
  harness.agents.splice(harness.agents.indexOf(peer), 1);
  return events;
}

describe("#43 criterion 1: signoff moves a closed origin's ticket", () => {
  it("a user_signoff attached through the orphan route lets the gate pass, in the store", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const closedId = "orphan-signoff-1";
    // The closed log holds one OPEN ticket and no signoff: nothing on it
    // is movable yet.
    const events = buildClosedLog(harness, closedId, (h, peer) => {
      h.service.userSetTicket(h.asAgent(peer), { title: "orphan ticket" });
    });
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId(closedId), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== closedId) throw new Error("not found");
        return { meta: { id, cwd: WS }, events };
      },
    });
    const service = harness.service;

    // The first board open backfills the closed log into the store.
    const before = await service.workspaceTickets(harness.asAgent());
    const beforeRow = before.tickets.find((row) => row.title === "orphan ticket");
    expect(beforeRow?.state).toBe("open");
    // #45: the composite address is gone; the orphan route is addressed by
    // the row's plain workspace-unique store id, read off the board.
    const ref = String(beforeRow?.id);
    expect(ref).not.toContain(":");

    // The gate for open -> in_progress requires a user_signoff, and the
    // move refuses while the gate is unsatisfied — the refusal itself now
    // lands through the orphan route.
    expect(() =>
      service.userMoveTicket(harness.asAgent(), { ticketId: ref, to: "in_progress" } as never),
    ).toThrow();

    // The signoff is attached through the SAME routed write path — the
    // store is its only destination — and the gate then passes.
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: ref,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    const moved = await service.userMoveTicket(harness.asAgent(), {
      ticketId: ref,
      to: "in_progress",
    } as never);
    expect(moved.fromState).toBe("open");
    expect(moved.toState).toBe("in_progress");

    // The move is durable in the STORE: a fresh board read answers with it.
    const after = await service.workspaceTickets(harness.asAgent());
    expect(after.tickets.find((row) => row.title === "orphan ticket")?.state).toBe(
      "in_progress",
    );
  });
});

describe("#43 criterion 2: a move lands after the origin log is deleted", () => {
  it("the deleted log takes nothing with it; the store takes the move", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const closedId = "orphan-deleted-1";
    // The closed log holds a ticket parked at awaiting_verification, with
    // every kind the in_progress -> awaiting_verification gate asks for.
    const events = buildClosedLog(harness, closedId, (h, peer) => {
      const service = h.service;
      const row = service.userSetTicket(h.asAgent(peer), { title: "deleted log ticket" });
      // Each seeded `at` strictly rises above everything already on the
      // ticket, so no clock tie at a second boundary can trip the fold's
      // monotonic-at invariant.
      let at = harness.ticketAt(peer, row.id) + 1;
      const nextAt = () => (at += 1);
      // open -> in_progress needs a signoff...
      h.appendAidosEvent(peer, {
        kind: "evidence/attached",
        version: 1,
        ticketId: row.id,
        row: { kind: "builtin:user_signoff", author: "user", at: nextAt(), payload: {} },
      });
      service.userMoveTicket(h.asAgent(peer), { ticketId: row.id, to: "in_progress" } as never);
      // ...and in_progress -> awaiting_verification needs all three of
      // these kinds; seeded raw so no git resolution is involved.
      for (const kind of [
        "builtin:automated_check",
        "builtin:review_pass",
        "builtin:user_commit",
      ]) {
        h.appendAidosEvent(peer, {
          kind: "evidence/attached",
          version: 1,
          ticketId: row.id,
          row: { kind, author: "user", at: nextAt(), payload: {} },
        });
      }
      service.userMoveTicket(h.asAgent(peer), {
        ticketId: row.id,
        to: "awaiting_verification",
      } as never);
    });
    let logDeleted = false;
    let inspectAttempts = 0;
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => (logDeleted ? [] : [{ id: SessionId(closedId), cwd: WS }]),
      inspect: async (id: string) => {
        inspectAttempts += 1;
        if (logDeleted) throw new Error("log deleted from disk");
        if (id !== closedId) throw new Error("not found");
        return { meta: { id, cwd: WS }, events };
      },
    });
    const service = harness.service;

    // First open: the backfill imports the closed log.
    const before = await service.workspaceTickets(harness.asAgent());
    expect(before.tickets.find((row) => row.title === "deleted log ticket")?.state).toBe(
      "awaiting_verification",
    );
    // #45: the composite address is gone; the write addresses the row by
    // its renumbered store id, exactly as the board shows it.
    const deletedRef = String(
      before.tickets.find((row) => row.title === "deleted log ticket")?.id,
    );

    // THE LOG IS DELETED FROM DISK: persistence no longer lists the
    // session and its log cannot be inspected at all.
    logDeleted = true;

    // awaiting_verification -> in_progress is user-only, kind-free: the
    // whole write must land in the store with no log behind it.
    const moved = await service.userMoveTicket(harness.asAgent(), {
      ticketId: deletedRef,
      to: "in_progress",
    } as never);
    expect(moved.fromState).toBe("awaiting_verification");
    expect(moved.toState).toBe("in_progress");

    // The board answers from the store, and nothing reached for the
    // deleted log to get there.
    const after = await service.workspaceTickets(harness.asAgent());
    expect(after.tickets.find((row) => row.title === "deleted log ticket")?.state).toBe(
      "in_progress",
    );
    const attemptsAfter = inspectAttempts;
    await service.workspaceTickets(harness.asAgent());
    expect(inspectAttempts).toBe(attemptsAfter);
  });
});

describe("#43 criterion 3: a live origin still writes to its own log", () => {
  it("a routed move appends to the live owner's session log", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const peer = harness.makeAgent({ id: "orphan-live-1" });
    (peer.session.header as { cwd?: string }).cwd = WS;
    const service = harness.service;
    const row = service.userSetTicket(harness.asAgent(peer), { title: "live ticket" });
    // A signoff in the LIVE log, so the gate is satisfiable at all.
    harness.seedEvidence(peer, row.id, "builtin:user_signoff");

    const logBefore = peer.session.events.length;
    // #45: plain id. The caller's own fold is empty, so the workspace
    // fallback routes the write to the live owner's log.
    const moved = await service.userMoveTicket(harness.asAgent(), {
      ticketId: String(row.id),
      to: "in_progress",
    } as never);
    expect(moved.toState).toBe("in_progress");

    // The LIVE owner's log gained the move — the orphan fix did not
    // divert live writes into the store.
    const logEvents = [...peer.session.events];
    expect(logEvents.length).toBeGreaterThan(logBefore);
    const last = logEvents.at(-1) as { type: string; data: { kind: string; operation?: string } };
    expect(last.data.kind).toBe("ticket/change");
    expect(last.data.operation).toBe("move");
    // The caller's own log gained nothing.
    expect(harness.aidosEvents(harness.agent).some((event) => event.kind === "ticket/change" && (event as { operation?: string }).operation === "move")).toBe(false);
    // And the owner session still folds the move: its own reads agree.
    const ownerRow = service.getTickets(harness.asAgent(peer)).find((r) => r.id === row.id);
    expect(ownerRow?.state).toBe("in_progress");
  });
});
