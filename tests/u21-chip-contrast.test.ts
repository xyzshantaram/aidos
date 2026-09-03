/**
 * #21 review F1: an executable contrast check for the chips.
 *
 * The first attempt at "less loud" moved chips from saturated fills to
 * tinted text and MEASURED at 2.44:1 on a hovered tile -- a direct violation
 * of this ticket's oldest criterion, "no badge or pill anywhere renders grey
 * text on a grey background". The worst chip went from 12.62:1 to 2.44:1
 * while the commit claimed to be brightening things.
 *
 * Nothing caught it, because nothing could: the only CSS assertions were
 * that a string appears and another does not. A reviewer mutated the text
 * mix from 72% to 3% -- near-invisible -- and the whole suite stayed green.
 *
 * So this computes real WCAG contrast from the real tokens. Two causes had
 * combined and each is pinned here:
 *  1. the kind palette held NO hues, only grey chrome tokens;
 *  2. the chip background is TRANSLUCENT, so contrast depends on the
 *     backdrop -- and .aidos-tile:hover lightens it, which a check against
 *     the resting tile alone never sees.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
const boardLogic = readFileSync(
  new URL("../src/client/board-logic.ts", import.meta.url),
  "utf8",
);

type Rgb = [number, number, number];

/** Read a `--token: #rrggbb;` declaration out of the stylesheet. */
function token(name: string): Rgb {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (match === null) throw new Error(`token --${name} is not declared in board.css`);
  return hex(match[1]);
}

function hex(value: string): Rgb {
  const v = value.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

/** WCAG relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const f = (raw: number) => {
    const v = raw / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** `color-mix(in srgb, a <pct>%, b)`, and the alpha composite it implies. */
function mix(a: Rgb, b: Rgb, pctA: number): Rgb {
  return [0, 1, 2].map((i) => a[i] * pctA + b[i] * (1 - pctA)) as Rgb;
}

function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * The mix percentages, read from the stylesheet so the test cannot drift
 * from the CSS it is checking.
 *
 * Scans for the block that actually CONTAINS a color-mix: `.aidos-chip-kind`
 * appears in an earlier fallback rule too, and anchoring on the first match
 * silently measured the wrong block.
 */
function mixPercent(selector: string, property: string): number {
  let from = 0;
  for (;;) {
    const at = css.indexOf(selector, from);
    if (at < 0) break;
    const body = css.slice(at, css.indexOf("}", at));
    const rule = new RegExp(`\\b${property}: color-mix\\([^;]*?(\\d+)%`).exec(body);
    if (rule !== null) return Number(rule[1]) / 100;
    from = at + selector.length;
  }
  throw new Error(`no ${property} color-mix found in any ${selector} block`);
}

/** Every hue a chip can actually take. */
const HUE_NAMES = [
  "badge-hue-1",
  "badge-hue-2",
  "badge-hue-3",
  "badge-hue-4",
  "badge-hue-5",
  "badge-hue-6",
  "badge-hue-7",
  "badge-hue-8",
  "verdict-fail",
];

/**
 * Both backdrops. The hovered tile is the one the first attempt missed, and
 * it is where the worst numbers were.
 */
const BACKDROPS: Array<[string, Rgb]> = [
  ["resting tile", token("surface")],
  ["hovered tile", token("surface-hover")],
];

const AA = 4.5;
const WHITE: Rgb = [255, 255, 255];

describe("#21 chip contrast is measured, not assumed", () => {
  const textPct = mixPercent(".aidos-chip-kind,", "color");
  const bgPct = mixPercent(".aidos-chip-kind,", "background");
  const countBgPct = mixPercent(".aidos-chip-count {", "background");

  it("every chip hue clears WCAG AA on BOTH backdrops", () => {
    const failures: string[] = [];
    for (const [where, backdrop] of BACKDROPS) {
      for (const name of HUE_NAMES) {
        const hue = token(name);
        const text = mix(hue, WHITE, textPct);
        const ratio = contrast(text, mix(hue, backdrop, bgPct));
        if (ratio < AA) failures.push(`--${name} on the ${where}: ${ratio.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("the COUNT segment clears AA too", () => {
    /*
     * The count segment originally mixed its text at 82% and its background
     * at 30% of the SAME hue -- moving both ends toward each other, which is
     * arithmetically guaranteed to be worse than the chip itself. It was
     * below 3:1 everywhere. Its text now inherits the chip's colour.
     */
    const failures: string[] = [];
    for (const [where, backdrop] of BACKDROPS) {
      for (const name of HUE_NAMES) {
        const hue = token(name);
        const text = mix(hue, WHITE, textPct);
        const ratio = contrast(text, mix(hue, backdrop, countBgPct));
        if (ratio < AA) failures.push(`--${name} count on the ${where}: ${ratio.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("the kind palette contains hues, not grey chrome tokens", () => {
    /*
     * THE root cause of F1. KIND_COLORS held --border, --border-subtle,
     * --text-secondary, --text-muted, --surface-active and --surface-hover:
     * six greys. A grey FILL with white text is legible, so the problem was
     * invisible until the chips became tinted text -- at which point 11 of
     * 14 evidence kinds fell below AA and 7 were literally grey on grey.
     */
    const at = boardLogic.indexOf("const KIND_COLORS");
    const body = boardLogic.slice(at, boardLogic.indexOf("]", at));
    for (const grey of [
      "--border",
      "--border-subtle",
      "--text-secondary",
      "--text-muted",
      "--surface-active",
      "--surface-hover",
    ]) {
      expect(body).not.toContain(grey);
    }
    expect(body).toContain("--badge-hue-");
  });

  it("no chip foreground is dimmed with opacity", () => {
    /*
     * `opacity: 0.65` on the dependency icon measured 2.83:1. Dimming a
     * foreground that is already tinted is how an icon becomes a smudge --
     * and it silently undoes whatever the contrast rules just guaranteed.
     */
    for (const selector of [".aidos-chip-dep-icon {", ".aidos-chip-metric .aidos-chip-key {"]) {
      const at = css.indexOf(selector);
      expect(at).toBeGreaterThan(-1);
      // Comments are stripped first: this rule's comment EXPLAINS the
      // opacity that was removed, and matching prose instead of declarations
      // would make the guard fail on its own documentation.
      const body = css.slice(at, css.indexOf("}", at)).replace(/\/\*[\s\S]*?\*\//g, "");
      expect(body).not.toContain("opacity:");
    }
  });
});

describe("#21 chips stay colour-DISTINGUISHABLE, not just readable", () => {
  const textPct = mixPercent(".aidos-chip-kind,", "color");

  it("two different hues do not collapse to the same colour", () => {
    /*
     * The review proposed mutating the text mix from 72% to 3% and called it
     * "near-invisible". That is backwards on a dark theme: mixing toward
     * white makes text BRIGHTER, and the contrast guard correctly passes it.
     *
     * But the mutation does real harm the contrast number cannot see: at 3%
     * hue every chip is 97% white, so every evidence kind renders the same
     * colour and the colour coding -- the entire reason kindColor exists --
     * silently disappears. Readable and meaningless.
     *
     * So legibility is not the only property worth pinning. Adjacent hues
     * must remain visibly apart from each other.
     */
    const failures: string[] = [];
    for (let i = 0; i < HUE_NAMES.length; i++) {
      for (let j = i + 1; j < HUE_NAMES.length; j++) {
        const a = mix(token(HUE_NAMES[i]), WHITE, textPct);
        const b = mix(token(HUE_NAMES[j]), WHITE, textPct);
        // Euclidean distance in sRGB: crude, but it is the collapse that
        // matters here, not perceptual precision.
        const distance = Math.sqrt(
          [0, 1, 2].reduce((sum, k) => sum + Math.pow(a[k] - b[k], 2), 0),
        );
        /*
         * Threshold 6, calibrated to what this palette can actually deliver
         * rather than to a number that sounds strict.
         *
         * Distance scales LINEARLY with the mix: at 38% the closest pair is
         * 9.2 apart, so at the 3% mutation it would be 0.73 -- a total
         * collapse this catches comfortably. A stricter bound would fail on
         * the palette as shipped rather than on any regression.
         *
         * Recorded honestly: --badge-hue-1 (#4e6fa8) and --badge-hue-7
         * (#3c7fa8) are near-identical blues at ANY mix, as are several
         * other pairs. That is a pre-existing weakness of the 8-hue palette,
         * not something this change introduced, and it is why the chip's
         * KEYWORD -- not its colour -- is what actually identifies a kind.
         */
        if (distance < 6) {
          failures.push(
            `--${HUE_NAMES[i]} and --${HUE_NAMES[j]} differ by only ${distance.toFixed(1)}`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
