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
 *  - the strips dropping what the heading already says: under a tab the
 *    strip suppresses the state (showState={false}), while every surface
 *    WITHOUT a heading above it keeps it — the prop is opt-out, not opt-in.
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

  it("the queue's strips suppress the state the tab already carries", () => {
    expect(panel).toContain("showState={false}");
  });

  it("every OTHER surface keeps the state — the prop is opt-out, not opt-in", () => {
    /*
     * The detail panel, the approval runner and the peek all render strips
     * without a tab above them, so the state must still show there. A
     * default of false would have silently stripped it from three surfaces
     * nobody asked to change.
     */
    expect(strip).toContain("props.showState === false ? null : (");
  });
});
