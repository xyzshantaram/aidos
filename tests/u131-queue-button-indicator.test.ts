/**
 * #131 (2026-09-07): the "Waiting on you" button must say, from any screen
 * the toolbar is visible on, that the agent has asked for something.
 *
 * **The user's ask, and the exact spec they gave:** the label followed by a
 * BOLD number (no pill, no background of its own), and the button itself
 * turns blue with white text while nominations pend. Nothing pending: no
 * number, ordinary button.
 *
 * The interesting rule is not the colour, it is WHICH count feeds it. A
 * nomination the gate no longer allows is dropped by `humanQueue` on
 * purpose (the agent must not be able to conjure a button the gate would
 * refuse), so counting raw nomination rows would light the indicator for an
 * ask that opens to an empty queue. An indicator that lies once is an
 * indicator nobody trusts again, so the count is taken over MERGED ENTRIES.
 *
 * The rendering decision lives in `queueButtonState` rather than in the
 * component, because logic inside a component is logic no test can reach --
 * this codebase shipped the allowlist union and the backward-gate guard
 * unverified for exactly that reason. The JSX wiring is pinned by
 * source-text assertions in the same style u73 uses for the click-through
 * seam, so a future restyle cannot silently drop the anatomy.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  agentAskCount,
  humanQueue,
  queueButtonState,
  queueButtonTitle,
  queuePollMs,
} from "../src/client/human-queue";
import type { Nomination, PendingApprovalLike } from "../src/client/human-queue";
// The wrapper the VIEW calls. The approval tests above exercise humanQueue
// directly; these exercise the seam the toolbar's count actually rides on.
import { queueEntriesFor } from "../src/client/queue-panel";
import { makeTicket } from "./u2c-helpers";

const noEvidence = () => [] as string[];

const view = readFileSync(
  new URL("../src/client/ticket-view.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
const board = readFileSync(
  new URL("../src/client/local-ticket-view.tsx", import.meta.url),
  "utf8",
);

describe("#131 the badge shows the TOTAL, and only its colour tracks asks", () => {
  /*
   * ROUND 2. The tests this replaces encoded a misread of the ask: they
   * asserted the number WAS the ask count and vanished at zero, and that
   * the whole button carried the colour. The user reported both on sight.
   *
   * The corrected rule is three separate things, and each is pinned
   * separately so they cannot be conflated again:
   *   1. the number is the TOTAL queue size, always visible;
   *   2. the colour is binary on whether the agent is asking, and it
   *      belongs to the badge;
   *   3. the ask count is tooltip detail, never the number.
   */
  it("shows the total even when nothing is being asked for", () => {
    const state = queueButtonState(7, 0);
    expect(state.count).toBe(7);
    expect(state.indicator).toBe(false);
  });

  it("shows ZERO rather than hiding the badge on an empty queue", () => {
    // Round 1 hid the number here, so the toolbar said nothing at all in
    // the most common case.
    expect(queueButtonState(0, 0).count).toBe(0);
  });

  it("lights the badge when the agent is asking, without changing the number", () => {
    const state = queueButtonState(7, 2);
    expect(state.count).toBe(7);
    expect(state.indicator).toBe(true);
    expect(state.asks).toBe(2);
  });

  it("never lights an EMPTY queue, whatever the ask count claims", () => {
    // Fails safe: a badge inviting a click on nothing teaches the reader
    // that the signal lies.
    expect(queueButtonState(0, 3).indicator).toBe(false);
  });

  it("treats nonsense numbers as nothing, never as a lit badge", () => {
    expect(queueButtonState(-1, -1).count).toBe(0);
    expect(queueButtonState(Number.NaN, Number.NaN).indicator).toBe(false);
  });

  it("names the ask count in the TOOLTIP, and only when there is one", () => {
    const withAsks = queueButtonTitle(queueButtonState(7, 2), false);
    expect(withAsks).toContain("7 waiting on you");
    expect(withAsks).toContain("2 the agent is asking for");

    const withoutAsks = queueButtonTitle(queueButtonState(7, 0), false);
    expect(withoutAsks).toContain("7 waiting on you");
    // "0 the agent is asking for" would be noise on every ordinary hover.
    expect(withoutAsks).not.toContain("asking for");
  });

  it("says so plainly when nothing is waiting", () => {
    expect(queueButtonTitle(queueButtonState(0, 0), false)).toContain("Nothing is waiting");
  });

  it("discloses staleness in the tooltip rather than in the number", () => {
    expect(queueButtonTitle(queueButtonState(7, 2), true)).toContain("last refresh failed");
  });
});

describe("#131 the count is nominations the gate ALLOWS, not raw rows", () => {
  const openTicket = makeTicket({ id: 1, state: "open" });

  function nominate(over: Partial<Nomination> = {}): Nomination {
    return {
      id: "nom-1",
      ticketId: 1,
      actionId: "signoff",
      reason: "unblocks the next front",
      ...over,
    } as Nomination;
  }

  it("counts a nomination that matched a real ask", () => {
    const entries = humanQueue([openTicket], noEvidence, [nominate()]);
    expect(agentAskCount(entries)).toBe(1);
  });

  it("does NOT count a nomination the gate refuses, so the button cannot lie", () => {
    /*
     * "verify" applies to awaiting_verification; this ticket is open, so
     * humanQueue drops the nomination and the queue would show the human
     * nothing. Lighting the button here is the exact failure mode: the user
     * looks, opens the queue, finds no such ask, and stops believing it.
     */
    const entries = humanQueue([openTicket], noEvidence, [
      nominate({ actionId: "verify" }),
    ]);
    expect(agentAskCount(entries)).toBe(0);
    expect(queueButtonState(entries.length, agentAskCount(entries)).indicator).toBe(false);
  });

  it("does NOT count a nomination naming a ticket that is not on this board", () => {
    const entries = humanQueue([openTicket], noEvidence, [nominate({ ticketId: 999 })]);
    expect(agentAskCount(entries)).toBe(0);
  });

  it("counts entries, not rows: an un-nominated ask never lights the button", () => {
    // A backlog of ordinary gate asks is not news, and it is present nearly
    // always -- colouring it would make the state permanent and therefore
    // meaningless. THIS is the change from #93's total-entry badge.
    const entries = humanQueue(
      [openTicket, makeTicket({ id: 2, state: "open" })],
      noEvidence,
      [],
    );
    expect(entries.length).toBeGreaterThan(0);
    expect(agentAskCount(entries)).toBe(0);
    // The badge shows the TOTAL; an un-nominated backlog is a number
    // with no colour, not a hidden badge.
    expect(queueButtonState(entries.length, agentAskCount(entries)).count).toBe(entries.length);
    expect(queueButtonState(entries.length, agentAskCount(entries)).indicator).toBe(false);
  });

  it("counts each nominated entry once, across several tickets", () => {
    const entries = humanQueue(
      [openTicket, makeTicket({ id: 2, state: "open" })],
      noEvidence,
      [nominate(), nominate({ id: "nom-2", ticketId: 2 })],
    );
    expect(agentAskCount(entries)).toBe(2);
  });

  /*
   * ROUND 2, from the independent review: a PENDING APPROVAL is an agent
   * ask too, and it was leaving the button completely idle.
   *
   * That is the state where the agent is hard-blocked — it cannot write a
   * file until the card is answered — and `sortQueue` already ranks those
   * entries above everything else for exactly that reason. An indicator
   * that stays dark for the most urgent ask on the board is not cautious,
   * it is broken.
   */
  function approvalCard(over: Partial<PendingApprovalLike> = {}): PendingApprovalLike {
    return {
      id: "req-1",
      ticketId: 1,
      kind: "allowlist",
      prompt: "may I write these paths",
      payload: { paths: ["src/client"] },
      at: 0,
      ...over,
    };
  }

  it("counts a pending approval card: the agent is BLOCKED on it", () => {
    const approval = approvalCard();
    const entries = humanQueue([openTicket], noEvidence, [], "suggested", [approval]);
    expect(agentAskCount(entries)).toBe(1);
    expect(queueButtonState(entries.length, agentAskCount(entries)).indicator).toBe(true);
  });

  it("counts approvals and nominations together, without double-counting", () => {
    const approval = approvalCard();
    const entries = humanQueue([openTicket], noEvidence, [nominate()], "suggested", [approval]);
    // One nominated gate ask + one approval card = two asks, and the
    // approval must not be folded onto the nomination's entry.
    expect(agentAskCount(entries)).toBe(2);
  });

  it("still ignores a plain gate ask when an approval is present", () => {
    // The discrimination that keeps the indicator meaningful: adding an
    // approval must not suddenly make the whole backlog count.
    const approval = approvalCard();
    const entries = humanQueue(
      [openTicket, makeTicket({ id: 2, state: "open" }), makeTicket({ id: 3, state: "open" })],
      noEvidence,
      [],
      "suggested",
      [approval],
    );
    expect(entries.length).toBeGreaterThan(1);
    expect(agentAskCount(entries)).toBe(1);
  });
});

describe("#131 the poll keeps running while the queue is SHUT", () => {
  /*
   * The mutation that survived round 1 (M8): reinstating `if (!queueOpen)
   * return` in the effect destroys the feature — the indicator would light
   * only after the human opened the queue, which is the exact thing they
   * asked to be spared — and the entire 1110-test suite stayed green,
   * because the test was a byte-match against one historical line layout.
   *
   * The cadence is now a function, so the RULE is testable, and the effect
   * is pinned to use it.
   */
  it("polls when the queue is CLOSED — the whole point of the indicator", () => {
    expect(queuePollMs(false)).toBeGreaterThan(0);
  });

  it("polls faster while the queue is open than while it is closed", () => {
    expect(queuePollMs(true)).toBeLessThan(queuePollMs(false));
  });

  it("closed-queue polling is a glance-level cadence, not a busy loop", () => {
    // Bounds rather than an exact number: the value is a judgement call,
    // but "seconds" and "minutes" are both wrong for a background signal.
    expect(queuePollMs(false)).toBeGreaterThanOrEqual(10000);
    expect(queuePollMs(false)).toBeLessThanOrEqual(60000);
  });

  it("bounds the OPEN cadence too, so it cannot become a busy loop", () => {
    // The review's N2b: with only "greater than zero" on the open side, a
    // 1ms cadence -- 240x the traffic while the panel is up -- passed
    // every test in this file.
    expect(queuePollMs(true)).toBeGreaterThanOrEqual(1000);
    expect(queuePollMs(true)).toBeLessThanOrEqual(10000);
  });

  it("the effect asks queuePollMs and has NO open-only early return", () => {
    expect(board).toContain("setInterval(refreshNominations, queuePollMs(queueOpen))");
    /*
     * FILE-WIDE, not a slice.
     *
     * Round 2 sliced from `react.useEffect(\n function () {\n
     * refreshNominations();`, so a guard placed BEFORE that line -- the
     * canonical position, and the literal round-1 mutation -- fell outside
     * the window and passed. The same byte-anchored disease twice over:
     * blind exactly where it matters, and guaranteed to false-fail on a
     * reformat of those bytes.
     *
     * Nothing in this view legitimately needs an open-only early return
     * now, so its absence is asserted over the whole source. If some future
     * effect genuinely needs one, this failure is the conversation that
     * should happen before it lands.
     */
    expect(
      board,
      "an open-only early return anywhere in the board view re-creates the bug #131 fixed: " +
        "the indicator would light only after the human had already opened the queue",
    ).not.toContain("if (!queueOpen) return");
    /*
     * TWO HONEST LIMITS, recorded here rather than discovered later.
     *
     * 1. This pins a SPELLING, not the property. The re-review confirmed it
     *    kills the natural forms -- the guard in either position, one
     *    inside refreshNominations, `return undefined;` -- but not
     *    `if (queueOpen === false) return;`, and not arming the interval
     *    only inside `if (queueOpen)`, which has no early return at all and
     *    is the same closed-queue blackout. The durable fix is behavioural
     *    (fake timers: mount with queueOpen false, advance the closed
     *    cadence, assert a fetch fired) and is ticketed; this stays as a
     *    cheap tripwire for the spellings someone would actually write.
     *
     * 2. It is FILE-WIDE, so it governs future effects too. If it ever
     *    fails for an effect that legitimately needs an open-only return,
     *    the fix is to scope the ban to this effect's span -- extract it to
     *    a named function and assert within that -- NOT to delete the
     *    assertion.
     */
  });

  it("the button is told when its count is STALE, and says so", () => {
    /*
     * The re-review's NOTE 1, closed in the same round it was raised.
     *
     * Hardcoding the prop false, inverting its polarity, and deleting the
     * tooltip text all passed the full suite: the staleness disclosure was
     * the one piece of #131 with no failing-capable test. That is the third
     * round running in which newly-added UI wiring shipped untested, in the
     * very commit that was editing this file -- so it gets closed here
     * rather than noted.
     *
     * The disclosure is what makes keep-last-good honest: without it the
     * button presents a possibly-old number as current.
     */
    expect(view).toContain("agentAskCountStale");
    // The wording lives in queueButtonTitle now, so the assertion follows
    // it there rather than pinning a string the view no longer holds.
    expect(queueButtonTitle(queueButtonState(3, 1), true)).toContain(
      "the last refresh failed; showing the last known count",
    );
    // ...and it must be DERIVED from the fetch state, not passed as a
    // constant: `agentAskCountStale={false}` was a surviving mutation.
    expect(board).toContain("agentAskCountStale={queueError !== null}");
  });
});

describe("#131 the seam the toolbar actually uses carries the approvals", () => {
  /*
   * The review's N6, and the sharpest of its findings: every approval test
   * called `humanQueue` directly, while the VIEW calls `queueEntriesFor`.
   * Dropping the approvals argument inside that wrapper -- the seam the
   * whole round-2 fix rides on -- left the button dark for a blocked agent
   * with the entire suite green.
   *
   * These call the wrapper the view calls.
   */
  it("queueEntriesFor forwards approvals, so the count sees them", () => {
    const approval = {
      id: "req-1",
      ticketId: 1,
      kind: "allowlist",
      prompt: "may I write these paths",
      payload: { paths: ["src/client"] },
      at: 0,
    } as PendingApprovalLike;
    const tickets = [makeTicket({ id: 1, state: "open" })];
    const entries = queueEntriesFor(tickets, {}, [], [approval]);
    expect(entries.some((entry) => entry.approvalId === "req-1")).toBe(true);
    expect(agentAskCount(entries)).toBe(1);
    expect(queueButtonState(entries.length, agentAskCount(entries)).indicator).toBe(true);
  });

  it("queueEntriesFor without approvals leaves the button dark", () => {
    // The discriminating half: if the wrapper invented entries, the test
    // above would pass for the wrong reason.
    const tickets = [makeTicket({ id: 1, state: "open" })];
    const entries = queueEntriesFor(tickets, {}, [], []);
    expect(entries.length).toBeGreaterThan(0); // the gate ask still exists
    expect(agentAskCount(entries)).toBe(0);
  });

  it("queueEntriesFor forwards nominations too, on the same call shape", () => {
    const tickets = [makeTicket({ id: 1, state: "open" })];
    const entries = queueEntriesFor(
      tickets,
      {},
      [{ id: "nom-1", ticketId: 1, actionId: "signoff", reason: "why", at: 0 } as Nomination],
      [],
    );
    expect(agentAskCount(entries)).toBe(1);
  });
});

/*
 * ACCEPTED AS UNTESTED, recorded here rather than nowhere (review N7).
 *
 * The keep-last-good policy on a failed nominations fetch has no
 * behavioural test: it lives inside a promise `.catch` in a React effect,
 * and this suite has no component harness to mount it. It is asserted only
 * by the absence of `setNominations([])` in that handler, which the source
 * carries with a comment explaining why.
 *
 * The reasoning, so a later reader can weigh it rather than rediscover it:
 * confidently-dark turns an outage into a silent deadlock -- the human
 * never looks and the agent waits forever -- while stale-but-lit costs one
 * wasted glance and self-corrects on the next successful poll. The honest
 * costs: a long outage keeps a stale number on screen, and a FRESH mount
 * against a failing remote still starts dark, because there is no last-good
 * to keep.
 */

describe("#131 the button renders the decision it was given", () => {
  it("the toolbar button asks queueButtonState rather than testing the number itself", () => {
    expect(view).toContain("queueButtonState(");
    // One evaluation feeds class, title and number: three reads of one
    // decision cannot disagree, three copies of a ternary can.
    expect(view).toContain("const queueButton = queueButtonState(");
  });

  it("renders the count as BOLD TEXT, not as a pill", () => {
    // The className is now composed (base + optional asks modifier), so the
    // assertion pins the ELEMENT and the base class rather than one exact
    // spelling of the attribute.
    // The className is now composed (base + optional asks modifier), so
    // pin the ELEMENT and the base class, not one spelling of the
    // attribute: this must survive a prettier pass.
    expect(view).toContain("<b");
    expect(view).toContain('"aidos-queue-count" + (queueButton.indicator');
    // The pill it replaced is gone from the markup entirely.
    expect(view).not.toContain("aidos-queue-badge");
  });

  it("puts the attention state on the BADGE, not on the button", () => {
    /*
     * ROUND 2, and the user reported this one on sight: the whole button
     * turned blue. A control changing colour is a far louder statement
     * than a coloured count, and it fought every other toolbar button.
     */
    expect(view).toContain("aidos-queue-count-asks");
    expect(view).toContain("queueButton.indicator");
    // The button's own class list must be unconditional now.
    expect(view).toContain('className="aidos-btn"');
    expect(view).not.toContain("aidos-btn-attention");
  });

  it("the count style carries no background and no pill radius", () => {
    // The BASE rule only: the lit state is deliberately a chip (see the
    // asks test below), so slicing from the first occurrence would assert
    // the opposite of the design.
    const rule = css.slice(css.indexOf(".aidos-queue-count {"));
    const block = rule.slice(0, rule.indexOf("}"));
    expect(block).toContain("font-weight");
    expect(block).not.toContain("background");
    expect(block).not.toContain("border-radius");
  });

  it("the lit badge is blue with white text, and the button is left alone", () => {
    const rule = css.slice(css.indexOf(".aidos-queue-count.aidos-queue-count-asks"));
    const block = rule.slice(0, rule.indexOf("}"));
    expect(block).toContain("var(--accent-blue)");
    expect(block).toContain("#fff");
    // The retired button rule must be gone from the stylesheet too, not
    // just from the markup -- dead CSS gets copied into the next surface.
    expect(css).not.toContain(".aidos-btn.aidos-btn-attention");
  });

  it("the old pill rule is gone from the stylesheet too, not just the markup", () => {
    // Dead CSS outlives the markup that used it and gets copied into the
    // next component by whoever greps for "queue badge".
    expect(css).not.toContain(".aidos-queue-badge");
  });
});

describe("#131 the indicator is fed while the queue is SHUT", () => {
  it("the board passes the nominations into the count's composition", () => {
    // Without the nominations argument the merge has nothing to match and
    // the count is structurally always zero -- the button would never light
    // and every test above would still pass.
    expect(board).toContain(
      "agentAskCount(",
    );
  });

  it("nominations are fetched on mount and polled while the queue is closed", () => {
    /*
     * The retired rule was "fetched when the queue OPENS, not polled",
     * justified by nominations not being able to change the badge count.
     * #131 made them change it, so an open-only fetch would light the
     * indicator only after the human had already looked -- the very thing
     * they asked to be spared.
     */
    expect(board).toContain("queueEntriesFor(rawTickets, rawEvidence, nominations, approvals)");
  });
});
