/**
 * #93: the human work queue.
 *
 * The derived half is pure logic over board state — it must produce the
 * right asks with no agent running, and it must NOT invent asks the gate
 * would refuse. The nominated half is a reason merged onto an ask that
 * already exists, never a new button.
 */

import { describe, expect, it } from "vitest";

import { derivedQueue, humanQueue, queueCount, sortQueue } from "../src/client/human-queue";
import type { Nomination } from "../src/client/human-queue";
import { makeTicket } from "./u2c-helpers";
import { boardKeyOf } from "../src/client/board-logic";

const noEvidence = () => [] as string[];

describe("u93 human-queue: the derived half", () => {
  it("an open ticket asks for signoff", () => {
    const entries = derivedQueue([makeTicket({ id: 1, state: "open" })], noEvidence);
    expect(entries.map((e) => e.actionId)).toEqual(["signoff"]);
    expect(entries[0].prompt).toContain("Sign off");
  });

  it("an in_progress ticket asks for nothing — the agent owns it", () => {
    const entries = derivedQueue(
      [makeTicket({ id: 1, state: "in_progress" })],
      noEvidence,
    );
    expect(entries).toEqual([]);
  });

  it("an awaiting ticket asks to be verified, and not yet to be marked done", () => {
    const entries = derivedQueue(
      [makeTicket({ id: 1, state: "awaiting_verification" })],
      noEvidence,
    );
    expect(entries.map((e) => e.actionId)).toEqual(["verify"]);
  });

  it("once user_verified is attached, the ask becomes mark-done as well", () => {
    const entries = derivedQueue(
      [makeTicket({ id: 1, state: "awaiting_verification" })],
      () => ["builtin:user_verified"],
    );
    expect(entries.map((e) => e.actionId)).toEqual(["verify", "mark-done"]);
  });

  it("a done ticket never appears", () => {
    const entries = derivedQueue([makeTicket({ id: 1, state: "done" })], noEvidence);
    expect(entries).toEqual([]);
  });

  it("submit-for-review is the agent's move and never enters the human queue", () => {
    const entries = derivedQueue(
      [makeTicket({ id: 1, state: "in_progress" })],
      () => ["builtin:automated_check", "builtin:review_pass"],
    );
    expect(entries.map((e) => e.actionId)).toEqual([]);
  });

  it("counts what it lists", () => {
    const entries = derivedQueue(
      [
        makeTicket({ id: 1, state: "open" }),
        makeTicket({ id: 2, state: "open" }),
        makeTicket({ id: 3, state: "in_progress" }),
      ],
      noEvidence,
    );
    expect(queueCount(entries)).toBe(2);
  });
});

describe("u93 human-queue: the nominated half", () => {
  const nomination = (over: Partial<Nomination> = {}): Nomination => ({
    id: "n1",
    ticketId: 1,
    actionId: "signoff",
    reason: "so I can start the store phase",
    at: 0,
    ...over,
  });

  it("a nomination attaches its reason to the matching ask", () => {
    const entries = humanQueue(
      [makeTicket({ id: 1, state: "open" })],
      noEvidence,
      [nomination()],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].nominationReason).toBe("so I can start the store phase");
    expect(entries[0].nominationId).toBe("n1");
  });

  it("a nomination for an action the gate refuses is DROPPED, not shown", () => {
    // #1 is open, so mark-done is unavailable. The agent cannot conjure it.
    const entries = humanQueue(
      [makeTicket({ id: 1, state: "open" })],
      noEvidence,
      [nomination({ actionId: "mark-done" })],
    );
    expect(entries.map((e) => e.actionId)).toEqual(["signoff"]);
    expect(entries[0].nominationReason).toBeUndefined();
  });

  it("a nomination naming a ticket that is not on the board is dropped", () => {
    const entries = humanQueue(
      [makeTicket({ id: 1, state: "open" })],
      noEvidence,
      [nomination({ ticketId: 999 })],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].nominationReason).toBeUndefined();
  });

  it("nominated entries sort ahead of merely derived ones", () => {
    const entries = humanQueue(
      [
        makeTicket({ id: 1, state: "open", phase: 1, order: 1 }),
        makeTicket({ id: 2, state: "open", phase: 1, order: 2 }),
      ],
      noEvidence,
      [nomination({ ticketId: 2 })],
    );
    expect(entries.map((e) => e.ticket.id)).toEqual([2, 1]);
  });

  it("with no nominations the queue is exactly the derived queue", () => {
    const tickets = [
      makeTicket({ id: 1, state: "open" }),
      makeTicket({ id: 2, state: "awaiting_verification" }),
    ];
    expect(humanQueue(tickets, noEvidence)).toEqual(derivedQueue(tickets, noEvidence));
  });
});

describe("u93 human-queue: sorting", () => {
  const tickets = [
    makeTicket({ id: 3, state: "open", phase: 1, order: 1, title: "Zebra", updatedAt: 10 }),
    makeTicket({ id: 1, state: "open", phase: 1, order: 2, title: "Apple", updatedAt: 30 }),
    makeTicket({ id: 2, state: "open", phase: 1, order: 3, title: "Mango", updatedAt: 20 }),
  ];

  it("by id sorts 1..N", () => {
    const rows = humanQueue(tickets, noEvidence, [], "id");
    expect(rows.map((r) => r.ticket.id)).toEqual([1, 2, 3]);
  });

  it("by recent puts the freshest update first", () => {
    const rows = humanQueue(tickets, noEvidence, [], "recent");
    expect(rows.map((r) => r.ticket.id)).toEqual([1, 2, 3].map((n) => n));
    expect(rows.map((r) => r.ticket.updatedAt)).toEqual([30, 20, 10]);
  });

  it("by alpha sorts titles A-Z", () => {
    const rows = humanQueue(tickets, noEvidence, [], "alpha");
    expect(rows.map((r) => r.ticket.title)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("suggested keeps nominations first; an explicit key does NOT", () => {
    const nomination = {
      id: "n1",
      ticketId: 3,
      actionId: "signoff" as const,
      reason: "look here",
      at: 0,
    };
    const suggested = humanQueue(tickets, noEvidence, [nomination], "suggested");
    expect(suggested[0].ticket.id).toBe(3);
    // "by id" means by id: picking a key does what it says.
    const byId = humanQueue(tickets, noEvidence, [nomination], "id");
    expect(byId.map((r) => r.ticket.id)).toEqual([1, 2, 3]);
  });

  it("sorting returns a new array and never mutates the input", () => {
    const rows = humanQueue(tickets, noEvidence, [], "suggested");
    const before = rows.map((r) => r.ticket.id);
    sortQueue(rows, "alpha");
    expect(rows.map((r) => r.ticket.id)).toEqual(before);
  });
});

/**
 * #93 review, finding 1 (CRITICAL): the queue keyed evidence lookups and its
 * write target with a bare String(ticket.id). On a MERGED board a foreign
 * ticket is addressed `sourceSessionId:id`, so a foreign row read the wrong
 * evidence — and an action on it wrote to the own ticket with that number.
 */
describe("u93 human-queue: foreign rows on a merged board", () => {
  const foreign = {
    ...makeTicket({ id: 12, state: "awaiting_verification", title: "Foreign twelve" }),
    foreign: true,
    sourceSessionId: "session-abc",
  };
  const own = makeTicket({ id: 12, state: "open", title: "Own twelve" });

  it("a foreign entry carries the COMPOSITE board key, not the bare id", () => {
    const rows = derivedQueue([foreign], () => []);
    expect(rows[0].boardKey).toBe("session-abc:12");
  });

  it("an own entry keeps the plain id as its board key", () => {
    const rows = derivedQueue([own], () => []);
    expect(rows[0].boardKey).toBe("12");
  });

  it("evidence is resolved per row by board key, so a foreign row cannot read the own row's", () => {
    const evidence: Record<string, string[]> = {
      // The OWN #12 has been verified; the foreign #12 has not.
      "12": ["builtin:user_verified"],
      "session-abc:12": [],
    };
    const rows = derivedQueue([foreign], (t) => evidence[boardKeyOf(t)] ?? []);
    // Without the fix this read the own row's user_verified and offered
    // mark-done on a ticket that has no such row.
    expect(rows.map((r) => r.actionId)).toEqual(["verify"]);
  });

  it("own and foreign rows with the same number are two distinct entries", () => {
    const rows = derivedQueue([own, foreign], () => []);
    expect(new Set(rows.map((r) => r.boardKey)).size).toBe(rows.length);
  });
});
