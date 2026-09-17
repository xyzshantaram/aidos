/**
 * #213: the detail panel fills the modal; the board sidebar is untouched.
 *
 * WHAT THIS PINS (all stylesheet structure -- no renderer).
 *
 * 1. NO INTRINSIC WIDTH. The base `.aidos-detail` rule declares neither a
 *    width nor a flex mode: the 300px sidebar width no longer rides the
 *    component into every context it is mounted in.
 * 2. WIDTH BY CONTEXT. The board sidebar keeps its sizing from the layout
 *    rule (`.aidos-layout > .aidos-detail`: fixed, non-flexing), and the
 *    modal supplies its own fill rule (`.aidos-modal .aidos-detail`:
 *    full width). The board's computed width does not change: its layout
 *    rule already overrode the base 300px to auto, and now carries the
 *    flex mode too.
 * 3. #93 STILL HOLDS. The dialog stays clamped to the mask's safe box
 *    (max-width / max-height) and the modal body keeps scrolling instead
 *    of overflowing the viewport.
 * 4. NARROW VIEWPORT, STATICALLY. The <=700px media block still forces
 *    the panel to full width, and the wide dialog is max-width clamped,
 *    so a narrow screen cannot overflow horizontally by these rules.
 *
 * What this does NOT prove (owner's eye in the browser, wide AND narrow
 * viewports): that the panel actually FILLS the 720px dialog with no
 * empty gutter, that the actions sit as one coherent row instead of four
 * ragged wrapped rows, that inline code and the facts table breathe --
 * and that the board sidebar looks byte-identical. Structure is pinned
 * here; appearance is not.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");

/** One rule's body, for a selector that opens its rule on its own line. */
function rule(selector: string): string {
  const start = css.indexOf("\n" + selector + " {");
  expect(start, `${selector} is not in board.css`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

describe("#213 the panel carries no intrinsic width", () => {
  it("the base .aidos-detail rule declares no width and no flex mode", () => {
    const body = rule(".aidos-detail");
    expect(body).not.toMatch(/width\s*:/);
    expect(body).not.toMatch(/flex\s*:/);
    // It stays a plain column: sizing comes from the mounting context.
    expect(body).toContain("flex-direction: column");
  });
});

describe("#213 each mounting context sizes the panel", () => {
  it("the board sidebar keeps its fixed, non-flexing sizing from the layout rule", () => {
    const body = rule(".aidos-layout > .aidos-detail");
    expect(body).toContain("flex: none");
    expect(body).toContain("width: auto");
  });

  it("the board's two-pane grid is unchanged", () => {
    expect(rule(".aidos-layout:has(> .aidos-detail)")).toContain("1fr 1fr");
  });

  it("the modal context stretches the panel across the dialog", () => {
    const body = rule(".aidos-modal .aidos-detail");
    expect(body).toContain("width: 100%");
    expect(body).toContain("min-width: 0");
  });
});

describe("#213 the #93 safe box still holds", () => {
  it("the dialog is clamped and the body scrolls instead of overflowing", () => {
    expect(rule(".aidos-modal")).toContain("max-width: 100%");
    expect(rule(".aidos-modal")).toContain("max-height: 100%");
    expect(rule(".aidos-modal-wide")).toContain("width: 720px");
    expect(rule(".aidos-modal-form")).toContain("overflow-y: auto");
  });

  it("a narrow viewport still forces full width inside a clamped dialog", () => {
    // Static half of the narrow-viewport check: the <=700px block keeps
    // its full-width panel rule, and the dialog's own max-width clamps
    // the 720px wide variant. The live resize is owner's-eye.
    const mediaAt = css.indexOf("@media (max-width: 700px)");
    expect(mediaAt).toBeGreaterThan(-1);
    const tail = css.slice(mediaAt, mediaAt + 800);
    expect(tail).toContain(".aidos-detail");
    expect(tail).toContain("width: 100%");
  });
});
