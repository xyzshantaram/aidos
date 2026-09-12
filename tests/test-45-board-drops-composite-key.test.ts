/**
 * #45: the board drops the composite key.
 *
 * A plain id is now unique per workspace (the store's port counter from
 * #39, with every imported log renumbered into that space by #41), so the
 * client stops addressing rows as `<sourceSessionId>:<id>` and the host
 * stops routing composite refs: `_routedAgent` sends a plain id the
 * caller's fold does not hold to the owning session, and `_resolveTicketId`
 * resolves it there — including the store-backed orphan session #43 built
 * for dead origins.
 *
 * Criterion map:
 *   1. every detail-panel write works on a ticket from another session —
 *      an attach and a move addressed with a plain string land in the
 *      owner's log / the store, for a LIVE origin and a CLOSED one;
 *   2. a deep link opens the right ticket — `resolveDeepLinkRow` answers a
 *      plain ref, and an old composite link still finds its ticket through
 *      its numeric tail exactly when the tail is unambiguous;
 *   3. covered in `tests/u2c-board-string-ticket-id.test.ts`, which this
 *      ticket UPDATES (keeps) rather than removes.
 *
 * Without this change: criterion-1 tests fail with UnknownTicket (a plain
 * id the caller's fold does not hold used to refuse, and the composite
 * it used to need no longer exists), the merge-shape test fails on the
 * `foreign: true` stamps, and the composite deep-link test fails because
 * the resolver returns null for any ref containing a colon.
 */

import { describe, expect, it } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import { UnknownTicket } from "../src/kernel/types";
import { resolveDeepLinkRow } from "../src/client/board-logic";
import { createHarness } from "./b1-harness";

const WS = "/home/sid/repos/aidos";

/** Two live agents of one workspace; both logs write through this harness. */
function twoAgentHarness() {
  const harness = createHarness(undefined, { cwd: WS });
  harness.installService();
  const peer = harness.makeAgent({ id: "session-45-peer" });
  (peer.session.header as { cwd?: string }).cwd = WS;
  return { harness, peer };
}

/** One closed session's log holding a single OPEN ticket, then detached. */
function buildClosedLog(
  harness: ReturnType<typeof createHarness>,
  id: string,
): readonly unknown[] {
  const peer = harness.makeAgent({ id });
  (peer.session.header as { cwd?: string }).cwd = WS;
  harness.service.userSetTicket(harness.asAgent(peer), { title: "45 orphan ticket" });
  const events = [...peer.session.events];
  harness.agents.splice(harness.agents.indexOf(peer), 1);
  return events;
}

describe("#45 criterion 1: detail-panel writes work on another session's ticket", () => {
  it("an attach and a move addressed with a plain string land in the live owner's log", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    // #218: ids are workspace-unique now (one store port), so the
    // caller's ticket is 1, the peer's first is 2, and the peer's second
    // — the unambiguous foreign id — is 3. The detail panel sends
    // exactly this plain form.
    service.userSetTicket(harness.asAgent(), { title: "own" });
    service.userSetTicket(harness.asAgent(peer), { title: "peer first" });
    const peerTicket = service.userSetTicket(harness.asAgent(peer), { title: "peer detail" });
    const plainRef = String(peerTicket.id);
    expect(plainRef).toBe("3");

    service.userAttachEvidence(harness.asAgent(), {
      ticketId: plainRef,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    const moved = await service.userMoveTicket(harness.asAgent(), {
      ticketId: plainRef,
      to: "in_progress",
    } as never);
    expect(moved.fromState).toBe("open");
    expect(moved.toState).toBe("in_progress");

    // The writes landed in the OWNER's log — the routing assertion lives
    // in the logs, where ownership actually is (#207's convention).
    const peerMoves = harness
      .aidosEvents(peer)
      .filter(
        (event) =>
          event.kind === "ticket/change" &&
          (event as { operation?: string }).operation === "move",
      );
    expect(peerMoves.length).toBe(1);
    expect(
      harness
        .aidosEvents(harness.agent)
        .some(
          (event) =>
            event.kind === "ticket/change" &&
            (event as { operation?: string }).operation === "move",
        ),
    ).toBe(false);
    // And the caller reads the foreign state through the workspace read.
    expect(service.getTickets(harness.asAgent()).find((row) => row.id === peerTicket.id)?.state).toBe(
      "in_progress",
    );
  });

  it("a move addressed with the renumbered store id moves a closed session's ticket", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const closedId = "session-45-closed";
    const events = buildClosedLog(harness, closedId);
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId(closedId), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== closedId) throw new Error("not found");
        return { meta: { id, cwd: WS }, events };
      },
    });
    const service = harness.service;

    // First open: the backfill renumbers the closed ticket into the
    // workspace id space, and the caller's own fold stays empty.
    const before = await service.workspaceTickets(harness.asAgent());
    const row = before.tickets.find((candidate) => candidate.title === "45 orphan ticket");
    expect(row?.state).toBe("open");
    const plainRef = String(row?.id);
    expect(plainRef).not.toContain(":");

    // The detail-panel write forms — evidence attach, then the gate move.
    service.userAttachEvidence(harness.asAgent(), {
      ticketId: plainRef,
      kind: "builtin:user_signoff",
      payload: {},
    } as never);
    const moved = await service.userMoveTicket(harness.asAgent(), {
      ticketId: plainRef,
      to: "in_progress",
    } as never);
    expect(moved.toState).toBe("in_progress");

    const after = await service.workspaceTickets(harness.asAgent());
    expect(after.tickets.find((candidate) => candidate.title === "45 orphan ticket")?.state).toBe(
      "in_progress",
    );
  });

  it("a composite session-headed ref is no longer an address", () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    const peerTicket = service.userSetTicket(harness.asAgent(peer), { title: "peer" });
    // The form the board used to send; the new contract refuses it, even
    // while the owner session is live.
    expect(() =>
      service.userMoveTicket(harness.asAgent(), {
        ticketId: peer.id + ":" + peerTicket.id,
        to: "in_progress",
      } as never),
    ).toThrow(UnknownTicket);
  });
});

describe("#45 merge: no row is foreign-addressed any more", () => {
  it("every merge row is plain-keyed and evidence follows the plain id", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "own" });
    const peerTicket = service.userSetTicket(harness.asAgent(peer), { title: "foreign" });
    service.userAddComment(harness.asAgent(peer), { ticketId: peerTicket.id, text: "hello" });

    const result = await service.workspaceTickets(harness.asAgent());
    for (const row of result.tickets) {
      expect(row.foreign).not.toBe(true);
      expect(typeof row.sourceSessionId).toBe("string");
    }
    // No composite key exists anywhere in the evidence or comment maps.
    for (const key of [...Object.keys(result.evidence), ...Object.keys(result.comments)]) {
      expect(key).not.toContain(":");
    }
    expect(result.comments[String(peerTicket.id)]?.[0]?.text).toBe("hello");
  });
});

describe("#45 criterion 2: deep links open the right ticket", () => {
  // Provenance rides on the rows (the merge stamps every row's owner), so
  // an old composite link can still name its ticket exactly.
  const rows = [{ id: 7 }, { id: 12, sourceSessionId: "sess-old-build" }];

  it("a plain ref opens its row", () => {
    expect(resolveDeepLinkRow("12", rows)?.id).toBe(12);
  });

  it("an old composite link finds its ticket through owner and tail", () => {
    expect(resolveDeepLinkRow("sess-old-build:12", rows)?.sourceSessionId).toBe(
      "sess-old-build",
    );
  });

  it("a composite link from another board resolves to nothing", () => {
    // #100 round 4's standing property: the owner matches no loaded row,
    // so a carried-along param opens the same-numbered local ticket never.
    expect(resolveDeepLinkRow("sess-elsewhere:12", rows)).toBeNull();
  });

  it("an ambiguous composite match refuses rather than guessing", () => {
    const copies = [
      { id: 12, sourceSessionId: "sess-dup" },
      { id: 12, sourceSessionId: "sess-dup" },
    ];
    expect(resolveDeepLinkRow("sess-dup:12", copies)).toBeNull();
  });

  it("an unknown composite ref resolves to nothing", () => {
    expect(resolveDeepLinkRow("sess-old-build:404", rows)).toBeNull();
    expect(resolveDeepLinkRow("--home-sid-repos-aidos--:some-slug", rows)).toBeNull();
  });
});
