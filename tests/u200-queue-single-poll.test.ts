/**
 * #200: the queue double-poll is merged — one queueState refresh, read by many.
 *
 * BEFORE: the board's queue effect fetched `actionNominations` +
 * `pendingApprovals` on its cadence AND every mounted AllowlistRequestCard
 * fetched per-ticket `pendingApproval` every 2s — ~36 remotes/minute with one
 * card and a shut queue, ~60 with an open one, +30 per extra card.
 *
 * AFTER: the board's effect is the ONLY poll. It publishes every refresh to
 * the shared snapshot (human-queue.ts); the card selects its row out of the
 * published approvals and costs zero remotes. One refresh costs the two
 * remotes the effect already made (6/minute shut, 30/minute open) until the
 * host ships a single `queueState` remote — when only refreshNominations
 * changes, because every consumer already reads the snapshot.
 *
 * These tests pin the three things the ticket demands:
 *   1. single-poll structure — the card holds no interval, the board holds
 *      the one, and the two are joined by publish/subscribe;
 *   2. the #51 no-clobber rule survives the move (a refresh never overwrites
 *      typed text), now as a behavior-tested pure function;
 *   3. the card's row selection keeps the host `pendingApproval` semantics
 *      (oldest approval for the ticket, Number-coerced id).
 *
 * The queue-shut freshness rule itself (poll keeps running while shut,
 * open faster than shut, glance-level bounds) stays pinned by u131's suite;
 * this file only anchors that the merged effect is still that effect.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  cardPathsAfterPoll,
  getQueueSnapshot,
  publishQueueSnapshot,
  selectCardApproval,
  subscribeQueueSnapshot,
} from "../src/client/human-queue";
import type { QueueSnapshot } from "../src/client/human-queue";

const card = readFileSync(
  new URL("../src/client/allowlist-request-card.tsx", import.meta.url),
  "utf8",
);
const board = readFileSync(
  new URL("../src/client/local-ticket-view.tsx", import.meta.url),
  "utf8",
);

function snapshotWithApprovals(
  approvals: QueueSnapshot["approvals"],
): QueueSnapshot {
  return { nominations: [], approvals, at: 1 };
}

describe("#200 the card holds no poll — it reads the shared snapshot", () => {
  it("the 2s self-poll is gone from the card", () => {
    expect(card).not.toContain("setInterval");
    /*
     * The per-ticket `pendingApproval` remote survives in exactly ONE place:
     * the one-shot fallback for a mount with no board publisher (no board
     * yet, or a future surface outside it). A second call site — a second
     * interval, or a per-tick fetch beside the subscription — fails here.
     */
    expect(card.match(/"pendingApproval"/g) ?? []).toHaveLength(1);
  });

  it("the card joins the snapshot instead: subscribes, selects, guards", () => {
    expect(card).toContain("subscribeQueueSnapshot");
    expect(card).toContain("selectCardApproval");
    expect(card).toContain("cardPathsAfterPoll");
  });

  it("the #51 dirty-flag mechanism is still the card's guard", () => {
    // Latches on the first keystroke ...
    expect(card).toContain("dirtyRef.current = true");
    // ... and the adoption still consults it.
    expect(card).toContain("dirtyRef.current");
    expect(card).toContain("cardPathsAfterPoll(prev,");
  });
});

describe("#200 the board holds the ONE queue poll", () => {
  it("the merged effect is still the queuePollMs effect #131 pinned", () => {
    expect(board).toContain("setInterval(refreshNominations, queuePollMs(queueOpen))");
  });

  it("every refresh is published to the shared snapshot, per half", () => {
    expect(board).toContain("publishQueueSnapshot");
    // Each half publishes carrying the latest of the other, so neither
    // fetch can erase the other's result.
    expect(board).toContain("previous?.approvals ?? []");
    expect(board).toContain("previous?.nominations ?? []");
  });
});

describe("#200 selectCardApproval keeps the pendingApproval semantics", () => {
  it("null snapshot selects nothing", () => {
    expect(selectCardApproval(null, 12)).toBeNull();
  });

  it("a string board key matches the numeric ticket id", () => {
    const snapshot = snapshotWithApprovals([
      { id: "a", ticketId: 12, kind: "allowlist", prompt: "p", payload: {}, at: 5 },
    ]);
    expect(selectCardApproval(snapshot, "12")?.id).toBe("a");
    expect(selectCardApproval(snapshot, 12)?.id).toBe("a");
  });

  it("the OLDEST approval for the ticket wins, as the host answers", () => {
    const snapshot = snapshotWithApprovals([
      { id: "new", ticketId: 12, kind: "allowlist", prompt: "p", payload: {}, at: 9 },
      { id: "old", ticketId: 12, kind: "allowlist", prompt: "p", payload: {}, at: 3 },
    ]);
    expect(selectCardApproval(snapshot, 12)?.id).toBe("old");
  });

  it("other tickets' approvals are not selected", () => {
    const snapshot = snapshotWithApprovals([
      { id: "a", ticketId: 13, kind: "allowlist", prompt: "p", payload: {}, at: 5 },
    ]);
    expect(selectCardApproval(snapshot, 12)).toBeNull();
  });

  it("a foreign-shaped key matches nothing, as the host's Number() does", () => {
    const snapshot = snapshotWithApprovals([
      { id: "a", ticketId: 12, kind: "allowlist", prompt: "p", payload: {}, at: 5 },
    ]);
    // Number("sess:12") is NaN on both sides of the comparison, exactly as
    // the host's pendingApproval answers null for it.
    expect(selectCardApproval(snapshot, "sess:12")).toBeNull();
    expect(selectCardApproval(snapshot, "not-a-number")).toBeNull();
  });
});

describe("#200 cardPathsAfterPoll preserves the #51 no-clobber rule", () => {
  it("a clean card adopts the refresh", () => {
    expect(cardPathsAfterPoll(["old"], ["a", "b"], false)).toEqual(["a", "b"]);
  });

  it("a dirty card keeps the typed text, whatever the refresh carried", () => {
    // The exact bug #51 fixed: text typed between polls survived the poll.
    expect(cardPathsAfterPoll(["typed", "by-hand"], ["a", "b"], true)).toEqual([
      "typed",
      "by-hand",
    ]);
    // Even a resolution elsewhere (no incoming paths) must not blank it.
    expect(cardPathsAfterPoll(["typed"], undefined, true)).toEqual(["typed"]);
  });

  it("a clean card with no row (resolved elsewhere) keeps what is shown", () => {
    expect(cardPathsAfterPoll(["a"], undefined, false)).toEqual(["a"]);
  });

  it("a malformed payload never reaches the textarea", () => {
    expect(cardPathsAfterPoll(["a"], "oops", false)).toEqual(["a"]);
    expect(cardPathsAfterPoll(["a"], 42, false)).toEqual(["a"]);
  });
});

describe("#200 the snapshot store publishes to every subscriber", () => {
  it("get returns the last published snapshot", () => {
    const snapshot = snapshotWithApprovals([]);
    publishQueueSnapshot(snapshot);
    expect(getQueueSnapshot()).toBe(snapshot);
  });

  it("subscribers hear each publish; unsubscribing stops them", () => {
    const heard: Array<QueueSnapshot | null> = [];
    const unsubscribe = subscribeQueueSnapshot((snapshot) => {
      heard.push(snapshot);
    });
    const first = snapshotWithApprovals([]);
    const second = snapshotWithApprovals([
      { id: "a", ticketId: 1, kind: "allowlist", prompt: "p", payload: {}, at: 2 },
    ]);
    publishQueueSnapshot(first);
    publishQueueSnapshot(second);
    unsubscribe();
    publishQueueSnapshot(snapshotWithApprovals([]));
    expect(heard).toEqual([first, second]);
  });

  it("a listener can drive selectCardApproval straight off the publish", () => {
    const seen: Array<string | null> = [];
    const stop = subscribeQueueSnapshot((snapshot) => {
      seen.push(selectCardApproval(snapshot, 7)?.id ?? null);
    });
    publishQueueSnapshot(
      snapshotWithApprovals([
        { id: "req-1", ticketId: 7, kind: "allowlist", prompt: "p", payload: {}, at: 4 },
      ]),
    );
    publishQueueSnapshot(snapshotWithApprovals([]));
    stop();
    // The card appears on the publish and vanishes on the next — the board
    // cadence, with no card-local fetch involved.
    expect(seen).toEqual(["req-1", null]);
  });
});
