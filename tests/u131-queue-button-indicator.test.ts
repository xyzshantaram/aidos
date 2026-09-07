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
  humanQueue,
  nominatedCount,
  queueButtonState,
} from "../src/client/human-queue";
import type { Nomination } from "../src/client/human-queue";
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
    expect(nominatedCount(entries)).toBe(1);
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
    expect(nominatedCount(entries)).toBe(0);
    expect(queueButtonState(nominatedCount(entries)).indicator).toBe(false);
  });

  it("does NOT count a nomination naming a ticket that is not on this board", () => {
    const entries = humanQueue([openTicket], noEvidence, [nominate({ ticketId: 999 })]);
    expect(nominatedCount(entries)).toBe(0);
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
    expect(nominatedCount(entries)).toBe(0);
    expect(queueButtonState(nominatedCount(entries)).count).toBeNull();
  });

  it("counts each nominated entry once, across several tickets", () => {
    const entries = humanQueue(
      [openTicket, makeTicket({ id: 2, state: "open" })],
      noEvidence,
      [nominate(), nominate({ id: "nom-2", ticketId: 2 })],
    );
    expect(nominatedCount(entries)).toBe(2);
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
      "nominatedCount(queueEntriesFor(rawTickets, rawEvidence, nominations))",
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
    expect(board).not.toContain("if (!queueOpen) return;\n      const timer");
    expect(board).toContain("queueOpen ? QUEUE_POLL_OPEN_MS : QUEUE_POLL_CLOSED_MS");
  });
});
