/**
 * The filter panel applies itself (user, 2026-09-08): "filter panel apply on
 * click should debounce, but not that much, maybe a second or two, and it
 * should show a loading spinner so they know we're not stuck, and drop the
 * apply button".
 *
 * Three rules, and they are one design rather than three tweaks:
 *
 *   - NO APPLY BUTTON. A filter that needs confirming is a filter you have
 *     to press twice.
 *   - A SETTLE, not immediacy. Applying on every keystroke and every
 *     checkbox re-filters the whole board mid-gesture, which is worse than
 *     the button for anyone ticking three states in a row.
 *   - A SPINNER, because the settle creates the one hazard of auto-apply:
 *     with no button to press, a board that has not updated yet looks
 *     exactly like a board that is stuck.
 *
 * Reset is the deliberate exception: an explicit "put it back" lands at
 * once rather than making the user watch a spinner for it.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { FILTER_APPLY_DELAY_MS } from "../src/client/filter-panel";

const panel = readFileSync(
  new URL("../src/client/filter-panel.tsx", import.meta.url).pathname,
  "utf8",
);
const css = readFileSync(
  new URL("../src/client/board.css", import.meta.url).pathname,
  "utf8",
);

describe("the filter panel settles instead of asking", () => {
  it("waits a second or two — not zero, and not long enough to feel broken", () => {
    // The brief, as a range rather than a magic number: fast enough that
    // nobody reaches for the missing button, slow enough to absorb a burst.
    expect(FILTER_APPLY_DELAY_MS).toBeGreaterThanOrEqual(800);
    expect(FILTER_APPLY_DELAY_MS).toBeLessThanOrEqual(2500);
  });

  it("has no Apply button left anywhere in the panel", () => {
    expect(panel).not.toContain(">\n        Apply\n      </button>");
    expect(panel).not.toMatch(/>\s*Apply\s*<\/button>/);
  });

  it("replaces it with a status that reports PENDING, not just dirtiness", () => {
    /*
     * The distinction the spinner exists for. "Dirty" was already knowable
     * and was rendered as a dot on a button; what the user could not know
     * is whether anything was ABOUT TO HAPPEN.
     */
    expect(panel).toContain("function FilterApplyStatus");
    expect(panel).toContain("props.pending");
    expect(panel).toContain("aidos-merge-spinner");
    expect(panel).toContain('aria-live="polite"');
  });

  it("reuses the existing spinner rather than growing a second one", () => {
    // #82's lesson: a look re-implemented is a look that drifts.
    expect(css).toContain(".aidos-merge-spinner");
    expect(css).not.toContain(".aidos-filter-spinner");
  });

  it("keeps the status row's height so Reset cannot jump under the cursor", () => {
    const block = css.slice(css.indexOf(".aidos-filter-status"));
    expect(block.slice(0, 240)).toContain("min-height");
  });

  it("schedules on every staged change, and lands Reset at once", () => {
    /*
     * updateStaged is the single funnel every control goes through -- one
     * scheduling site rather than one per checkbox, which is the same
     * one-implementation rule #170 audits.
     */
    const staged = panel.slice(panel.indexOf("function updateStaged"));
    expect(staged.slice(0, 320)).toContain("scheduleApply(next)");
    const reset = panel.slice(panel.indexOf("function reset()"));
    expect(reset.slice(0, 800)).toContain("applyNow(cleared)");
  });

  it("drops a pending settle on unmount instead of firing it", () => {
    // Firing from a cleanup would push a filter change into a parent that
    // is unmounting; the staged state is durable, so nothing is lost.
    const cleanup = panel.slice(panel.indexOf("return function () {"));
    expect(cleanup.slice(0, 700)).toContain("clearTimeout(applyRef.current)");
  });
});
