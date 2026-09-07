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
  queuePollMs,
} from "../src/client/human-queue";
import type { Nomination, PendingApprovalLike } from "../src/client/human-queue";
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

describe("#131 the button state is a function of the nominated count alone", () => {
  it("no nominations: no number, no attention state", () => {
    const state = queueButtonState(0);
    expect(state.count).toBeNull();
    expect(state.indicator).toBe(false);
  });

  it("one or more: the count shows and the button wears the attention state", () => {
    expect(queueButtonState(1)).toEqual({ count: 1, indicator: true });
    expect(queueButtonState(7)).toEqual({ count: 7, indicator: true });
  });

  it("the two halves never disagree: a shown count always means the blue state", () => {
    // The failure this forbids is a number with no colour (or a colour with
    // no number), which reads as two different signals rather than one.
    for (const n of [0, 1, 2, 12, 108]) {
      const state = queueButtonState(n);
      expect(state.indicator).toBe(state.count !== null);
    }
  });

  it("a nonsense count is treated as nothing pending, never as a lit button", () => {
    // Fails SAFE: the button that cries wolf is worse than the quiet one.
    expect(queueButtonState(-1).indicator).toBe(false);
    expect(queueButtonState(Number.NaN).indicator).toBe(false);
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
    expect(queueButtonState(agentAskCount(entries)).indicator).toBe(false);
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
    expect(queueButtonState(agentAskCount(entries)).count).toBeNull();
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
    expect(queueButtonState(agentAskCount(entries)).indicator).toBe(true);
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

  it("the effect asks queuePollMs and has NO open-only early return", () => {
    expect(board).toContain("setInterval(refreshNominations, queuePollMs(queueOpen))");
    const effect = board.slice(board.indexOf("react.useEffect(\n    function () {\n      refreshNominations();"));
    const body = effect.slice(0, effect.indexOf("[queueOpen, refreshNominations]"));
    expect(body).not.toContain("if (!queueOpen) return");
  });
});

describe("#131 the button renders the decision it was given", () => {
  it("the toolbar button asks queueButtonState rather than testing the number itself", () => {
    expect(view).toContain("queueButtonState(");
    // One evaluation feeds class, title and number: three reads of one
    // decision cannot disagree, three copies of a ternary can.
    expect(view).toContain("const queueButton = queueButtonState(");
  });

  it("renders the count as BOLD TEXT, not as a pill", () => {
    expect(view).toContain('<b className="aidos-queue-count">');
    // The pill it replaced is gone from the markup entirely.
    expect(view).not.toContain("aidos-queue-badge");
  });

  it("puts the attention state on the BUTTON, not on the number", () => {
    expect(view).toContain("aidos-btn-attention");
    expect(view).toContain("queueButton.indicator");
  });

  it("the count style carries no background and no pill radius", () => {
    const rule = css.slice(css.indexOf(".aidos-queue-count"));
    const block = rule.slice(0, rule.indexOf("}"));
    expect(block).toContain("font-weight");
    expect(block).not.toContain("background");
    expect(block).not.toContain("border-radius");
  });

  it("the attention state paints the button blue with white text", () => {
    const rule = css.slice(css.indexOf(".aidos-btn.aidos-btn-attention"));
    const block = rule.slice(0, rule.indexOf("}"));
    expect(block).toContain("var(--accent-blue)");
    expect(block).toContain("#fff");
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
