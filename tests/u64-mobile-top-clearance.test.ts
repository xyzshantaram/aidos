/**
 * Ticket #64 regression guard.
 *
 * The mobile top bar (dsh-plugin-better-mobile-ui) floats over the board, so
 * the view MEASURES the overlap and publishes it as --aidos-top-clearance,
 * which .aidos-root consumes through `padding-top: calc(...)`.
 *
 * That clearance was silently defeated for weeks by a later responsive block
 * using the `padding` SHORTHAND on the same selector: equal specificity, later
 * in the sheet, so it reset padding-top to a fixed value and the toolbar slid
 * back under the bar — on mobile only, since the block was inside a
 * max-width media query. The bug looked like a bad measurement and was not.
 *
 * These tests fail if any rule after the clearance declaration can reset the
 * top padding of .aidos-root again.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "..", "src", "client", "board.css"), "utf8");

/** Every `.aidos-root` rule block, in source order, with its body text. */
function rootBlocks(): Array<{ index: number; body: string }> {
  const out: Array<{ index: number; body: string }> = [];
  // The offending rule lives INSIDE a media query, so `{` must be an allowed
  // preceding delimiter: without it this scan silently matches nothing and the
  // guard passes vacuously (which it did on the first attempt).
  const selector = /(^|[},{])\s*([^{}]*\.aidos-root[^{}]*)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = selector.exec(css)) !== null) {
    // Skip the token block (`:root, .aidos-root { --bg: ... }`) and any rule
    // whose selector targets a descendant rather than the root box itself.
    const body = match[3];
    out.push({ index: match.index, body });
  }
  return out;
}

describe("#64 the measured top clearance survives every later rule", () => {
  it("the clearance declaration exists and reads the measured property", () => {
    expect(css).toMatch(/padding-top:\s*calc\([^;]*--aidos-top-clearance/);
  });

  it("no .aidos-root rule after the clearance uses the padding shorthand", () => {
    const clearance = css.search(/padding-top:\s*calc\([^;]*--aidos-top-clearance/);
    expect(clearance).toBeGreaterThan(-1);
    const offenders = rootBlocks()
      .filter((block) => block.index > clearance)
      // A shorthand `padding:` (not padding-top/-inline/-bottom/-block/-left/-right).
      .filter((block) => /(?:^|[;{\s])padding\s*:/.test(block.body));
    expect(offenders.map((block) => block.body.trim())).toEqual([]);
  });

  it("no .aidos-root rule after the clearance re-declares padding-top", () => {
    const clearance = css.search(/padding-top:\s*calc\([^;]*--aidos-top-clearance/);
    const offenders = rootBlocks()
      .filter((block) => block.index > clearance)
      .filter((block) => /padding-top\s*:/.test(block.body));
    expect(offenders.map((block) => block.body.trim())).toEqual([]);
  });

  it("the mobile responsive block still sets its inline and bottom padding", () => {
    const block = css.match(/@media \(max-width: 700px\)[\s\S]*?\.aidos-root\s*\{([\s\S]*?)\}/);
    expect(block).not.toBeNull();
    expect(block?.[1]).toMatch(/padding-inline:/);
    expect(block?.[1]).toMatch(/padding-bottom:/);
  });
});
