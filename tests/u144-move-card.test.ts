/**
 * #144: a move_ticket card always shows where the ticket WENT.
 *
 * User ask (2026-09-07): the card rendered `#N — Title — state` as one
 * string, and a row clips a string from the right -- so the longer the
 * title, the more certain it was that the destination state fell off the
 * end. The state is the whole reason a move card exists, and it is the
 * shortest part of the line.
 *
 * The fix separates the two: the title is a VALUE that may be cut (the
 * hover and the ticket both still hold it), and the state is a BADGE the
 * row draws whole -- the ticket state chip itself, not a lookalike.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { MOVE_TITLE_MAX, moveTicketSummary } from "../src/client/aidos-row-data";
import { badgeClass, stateLabel } from "../src/client/board-logic";

const rows = readFileSync(new URL("../src/client/aidos-rows.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");

/** One CSS rule's body, by selector. */
function rule(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `${selector} is not in board.css`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

const LONG_TITLE =
  "#144 — move_ticket cards: truncate the ticket title and always show the destination " +
  "state as an aidos badge, which is a title long enough to eat the whole line";

describe("#144 a long title never costs the destination state", () => {
  it("truncates the title with an ellipsis and still reports the state", () => {
    const parts = moveTicketSummary(LONG_TITLE, "awaiting_verification", stateLabel);
    expect(parts.title.length).toBeLessThanOrEqual(MOVE_TITLE_MAX);
    expect(parts.title.endsWith("…")).toBe(true);
    // The id survives the cut: it is the address, and it leads the label.
    expect(parts.title.startsWith("#144 —")).toBe(true);
    // The state is a separate field, so nothing about the title can drop it.
    expect(parts.state).toBe("awaiting_verification");
    expect(parts.text).toContain("Awaiting verification");
  });

  it("reads the same way with a short title: truncation is a no-op there", () => {
    const parts = moveTicketSummary("#7 — Short", "in_progress", stateLabel);
    expect(parts.title).toBe("#7 — Short");
    expect(parts.title.endsWith("…")).toBe(false);
    expect(parts.state).toBe("in_progress");
    expect(parts.text).toBe("#7 — Short → In progress");
  });

  it("flattens a title that carries newlines, since the line is one line", () => {
    expect(moveTicketSummary("#7 —\nwrapped\ntitle", "done", stateLabel).title).toBe(
      "#7 — wrapped title",
    );
  });

  it("falls back to a bare label when the call named no destination", () => {
    // Still running, or an argument that never parsed: there is no state to
    // badge, and inventing one would be worse than showing none.
    const parts = moveTicketSummary("#7 — Short", null, stateLabel);
    expect(parts.state).toBeNull();
    expect(parts.text).toBe("#7 — Short");
    expect(moveTicketSummary(null, null, stateLabel).text).toBe("move");
  });

  it("names the state in words when a labeller is given, and by id when not", () => {
    expect(moveTicketSummary("#7", "in_progress").text).toBe("#7 → in_progress");
    expect(moveTicketSummary("#7", "in_progress", stateLabel).text).toBe("#7 → In progress");
  });
});

describe("#144 the badge is the ticket badge, not a fork of it", () => {
  it("uses badgeClass, the same classes the strips and tiles use", () => {
    expect(rows).toContain("badgeClass(parts.state)");
    expect(rows).toContain('from "./board-logic"');
    expect(badgeClass("awaiting_verification")).toBe(
      "aidos-chip aidos-chip-state-awaiting-verification",
    );
  });

  it("defines NO state-badge look of its own for this card", () => {
    /*
     * The failure this prevents is the one #82 catalogued: a second copy of
     * a look, which drifts from the first the next time either is touched.
     * A move-card selector may set layout; the colours stay where every
     * other state chip reads them from.
     */
    const forked = [...css.matchAll(/([^{}]*aidos-move[^{}]*)\{([^{}]*)\}/g)];
    expect(forked.length).toBeGreaterThan(0);
    for (const block of forked) {
      const body = (block[2] ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const property of [...body.matchAll(/(^|[{;])\s*([A-Za-z-]+)\s*:/g)].map((m) =>
        (m[2] as string).toLowerCase(),
      )) {
        expect(
          ["display", "min-width", "overflow", "text-overflow", "white-space", "flex"].includes(
            property,
          ),
          `#144: "${property}" on ${(block[1] ?? "").trim()} — the move card may set LAYOUT ` +
            `only; the state badge's look is .aidos-chip-state-*.`,
        ).toBe(true);
      }
    }
    // And no new state-badge rule was invented under a move-card name.
    expect(css).not.toMatch(/\.aidos-move-state[^{]*\{/);
  });

  it("the hover restores what the cut removed", () => {
    // Truncating on the line costs the reader nothing only if the whole
    // label is still one hover away.
    expect(rows).toContain('title={label ?? parts.title}');
  });

  it("the state cannot be squeezed off the line: only the title shrinks", () => {
    expect(rule(".aidos-move-title {")).toContain("text-overflow: ellipsis");
    expect(rule(".aidos-move-title {")).toContain("min-width: 0");
    // .aidos-chip is flex: none, so the badge is drawn at its full width
    // whatever the title does beside it.
    expect(rule(".aidos-chip {")).toContain("flex: none");
    const summary = rule(".tool-render-path.aidos-row-summary-rich,");
    expect(summary).toContain("display: flex");
    expect(summary).toContain("overflow: hidden");
  });
});

describe("#144 the rich line does not break the row's other rules", () => {
  it("keeps the flat string as the hover title and the click-through label", () => {
    // selectTitle() reads the summary TEXT, not the markup: a node there
    // would render as "[object Object]", which is the bug #73 already paid
    // for once.
    expect(rows).toContain("summary={parts.text}");
    expect(rows).toContain("title={selectTitle(shown.text)}");
  });

  it("a refusal still shows its REASON, not a cheerful destination badge", () => {
    /*
     * A gate refusal is the most useful thing aidos prints. The rich node
     * is suppressed whenever there is an error summary to show instead --
     * the same rule rowSummary already applies to the text.
     */
    expect(rows).toContain("props.errorSummary === undefined ? props.summaryNode : null");
    expect(rows).toContain("{rich ?? shown.text}");
  });
});
