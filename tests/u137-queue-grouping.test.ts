/**
 * #137 (2026-09-07), as SUPERSEDED by #169 (2026-09-08).
 *
 * This ticket grouped the queue's nominations under state headings in
 * workdown order, and that shipped. #169 replaces the grouping ENTIRELY
 * with left-aligned top-bar tabs (icon + label + count per tab) — the
 * section headings this file tested are removed by it rather than refined.
 *
 * What survives, and is pinned here rather than deleted with the groups:
 *
 *  - the WORKDOWN order (sign off, then approve, then verify), which lives
 *    on as the tab order QUEUE_TAB_ORDER;
 *  - the strips keeping the state as the BOARD'S BADGE, not parenthesised
 *    prose (#137's criterion, owner's call on sight): a tab names the ASK,
 *    not the state, so the badge is the only place a row says what it is.
 *
 * The tab partition itself is tested in u169-queue-tabs.test.ts.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { QUEUE_TAB_ORDER } from "../src/client/human-queue";

const panel = readFileSync(
  new URL("../src/client/queue-panel.tsx", import.meta.url),
  "utf8",
);
const strip = readFileSync(
  new URL("../src/client/ticket-strip.tsx", import.meta.url),
  "utf8",
);

describe("#137 as superseded: what survives into the tabs", () => {
  it("the workdown order lives on as the tab order", () => {
    // Sign off unstarted work, then approve the files it needs, then verify
    // what is finished. Read left to right, the tabs are the order you
    // would actually work them in.
    expect([...QUEUE_TAB_ORDER]).toEqual(["signoff", "approvals", "verify"]);
  });

  it("the queue's strips SHOW the state — the tab names the ask, not the state", () => {
    /*
     * The reversal of what this test used to pin. A tab says "sign off",
     * not "open", so suppressing the badge left rows that never said what
     * they were. The queue renders plain TicketStrips with the default.
     */
    expect(panel).not.toContain("showState={false}");
  });

  it("the state it shows is the board's badge, not parenthesised prose", () => {
    // #137's criterion, owner's call on sight: where a state shows, it is
    // the same badge component the board cards use.
    expect(strip).toContain("className={badgeClass(ticket.state)}");
    expect(strip).not.toContain("({stateLabel(ticket.state)})");
  });
});
