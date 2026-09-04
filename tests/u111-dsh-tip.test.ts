/**
 * The dsh tooltips plugin replaces the browser's native tooltip with a styled
 * one, and opting in is one attribute: any DOM element that carries `title`
 * also carries `data-dsh-tip=""`.
 *
 * The text always comes from `title`. `data-dsh-tip` is EMPTY, so there is
 * exactly one copy of the string and the two cannot drift apart.
 *
 * WHY A SOURCE-PARSING TEST IS THE RIGHT SHAPE HERE, given that this repo has
 * been burned three times by tests that assert source text instead of
 * behaviour. The usual objection is that a source assertion passes whatever
 * the code DOES. It does not apply when the subject IS the source: the rule
 * governs which JSX attributes exist on which elements, and a JSX attribute
 * has no runtime behaviour of its own to observe -- the behaviour belongs to
 * a browser plugin that is not installed in this suite. Parsing the markup is
 * the most direct available observation, not a proxy for one.
 *
 * The rule is also exactly the kind that rots silently: a new element with a
 * `title` simply gets no styled tooltip, and nothing anywhere complains.
 *
 * THE `<option>` EXCLUSION (user, 2026-09-05). A native `<select>` popup is
 * drawn by the OS, so a page-rendered tooltip cannot paint over it. Opting in
 * there would REMOVE the native tooltip that already works and replace it with
 * one that cannot be seen. So `<option>` keeps its plain `title`, and this
 * file enforces that in BOTH directions -- an option must not be given a tip,
 * and must not be reported as missing one.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CLIENT_DIR = new URL("../src/client/", import.meta.url).pathname;

/** Elements whose tooltip must stay native. See the `<option>` note above. */
const NATIVE_TOOLTIP_ONLY = new Set(["option"]);

interface Tag {
  file: string;
  line: number;
  name: string;
  /**
   * The tag's OWN attribute list: the characters at brace depth 0 only.
   * Anything nested inside a JSX expression container belongs to a different
   * element and is deliberately excluded. See `openingTags`.
   */
  text: string;
}

/**
 * Every JSX opening tag in one file, each with its OWN attributes.
 *
 * Two traps, both of which produced a wrong answer before this shape:
 *
 * 1. A naive "walk back to the previous `<`" scan misreads an arrow
 *    function's `=>` as a tag close, so `title={refOf(hit)}` on a <button>
 *    with an onClick was attributed to the enclosing component. This walks
 *    FORWARD and ends the tag at the first `>` that is not inside braces,
 *    a string, or a template.
 *
 * 2. Attributes NEST. `<TicketStrip actions={<button title="x" .../>}>`
 *    would otherwise report the button's attributes as the TicketStrip's,
 *    and flag a component as wrongly tipped when nothing is wrong. So the
 *    tag's text collects only the characters at brace depth 0.
 */
function openingTags(file: string, source: string): Tag[] {
  const tags: Tag[] = [];
  for (const match of source.matchAll(/<([A-Za-z][A-Za-z0-9_.]*)/g)) {
    const start = match.index;
    let i = start + match[0].length;
    let depth = 0;
    let quote: string | undefined;
    let own = match[0];
    for (; i < source.length; i += 1) {
      const c = source[i];
      if (quote !== undefined) {
        if (depth === 0) own += c;
        if (c === "\\") {
          if (depth === 0) own += source[i + 1] ?? "";
          i += 1;
        } else if (c === quote) quote = undefined;
        continue;
      }
      /*
       * A JSX comment is prose, and this codebase's comments are long. An
       * apostrophe in one ("the agent's") would otherwise open a string that
       * swallows the rest of the tag, including the `}` that closes the
       * expression -- corrupting the depth count and, through it, which
       * element owns which attribute. Skip comments wholesale.
       */
      if (c === "/" && source[i + 1] === "*") {
        const close = source.indexOf("*/", i + 2);
        i = close === -1 ? source.length : close + 1;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        quote = c;
        if (depth === 0) own += c;
      } else if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      else if (c === ">" && depth === 0) break;
      else if (depth === 0) own += c;
    }
    tags.push({
      file,
      line: source.slice(0, start).split("\n").length,
      name: match[1],
      text: own,
    });
  }
  return tags;
}

function allTags(): Tag[] {
  const files = readdirSync(CLIENT_DIR).filter((f) => f.endsWith(".tsx"));
  // Guard the degenerate pass: an empty directory would satisfy every
  // assertion below while proving nothing whatsoever.
  expect(files.length).toBeGreaterThan(10);
  return files.flatMap((f) => openingTags(f, readFileSync(join(CLIENT_DIR, f), "utf8")));
}

const tags = allTags();
const isDom = (t: Tag) => /^[a-z]/.test(t.name);
const hasTitle = (t: Tag) => /\btitle=/.test(t.text);
const hasTip = (t: Tag) => /\bdata-dsh-tip=/.test(t.text);
const at = (t: Tag) => `${t.file}:${t.line} <${t.name}>`;

describe("data-dsh-tip opts DOM elements into the styled tooltip", () => {
  it("the scan finds the elements it is meant to check", () => {
    // Without this, a parser that silently matched NOTHING would pass every
    // test in this file. The numbers are lower bounds, not exact counts, so
    // ordinary edits do not churn the test.
    expect(tags.length).toBeGreaterThan(200);
    expect(tags.filter((t) => isDom(t) && hasTitle(t)).length).toBeGreaterThan(30);
    expect(tags.filter((t) => !isDom(t)).length).toBeGreaterThan(20);
  });

  it("every DOM element with a title also has data-dsh-tip", () => {
    const missing = tags
      .filter((t) => isDom(t) && hasTitle(t) && !hasTip(t) && !NATIVE_TOOLTIP_ONLY.has(t.name))
      .map(at);
    expect(missing).toEqual([]);
  });

  it("data-dsh-tip is always EMPTY, so the text cannot drift from title", () => {
    const wrong = tags
      .filter((t) => hasTip(t) && !/\bdata-dsh-tip=""/.test(t.text))
      .map(at);
    expect(wrong).toEqual([]);
  });

  it("never appears without a title to take its text from", () => {
    const orphan = tags.filter((t) => hasTip(t) && !hasTitle(t)).map(at);
    expect(orphan).toEqual([]);
  });

  it("never appears on a React component, where title is a prop not an attribute", () => {
    // <ModalShell title="Sign off" /> renders its title as heading TEXT. The
    // attribute there would land on nothing, or on the wrong element.
    const onComponent = tags.filter((t) => !isDom(t) && hasTip(t)).map(at);
    expect(onComponent).toEqual([]);
  });

  it("never appears on an <option>, whose popup the OS draws", () => {
    // Adding it there is worse than doing nothing: it removes the native
    // tooltip and replaces it with one that cannot paint over the popup.
    const opted = tags.filter((t) => NATIVE_TOOLTIP_ONLY.has(t.name) && hasTip(t)).map(at);
    expect(opted).toEqual([]);
  });

  it("parses a tag whose attribute value contains an arrow function", () => {
    /*
     * The exact case that defeated the first scan, pinned so the parser
     * cannot regress into the naive version. `=>` inside braces must not end
     * the tag, or a <button> gets misread and the rule is enforced against
     * the wrong element -- which is how a real element was nearly missed.
     */
    const [tag] = openingTags(
      "probe.tsx",
      '<button onClick={() => { if (a > b) go(); }} title={x}\ndata-dsh-tip="">\n',
    );
    expect(tag.name).toBe("button");
    expect(hasTitle(tag)).toBe(true);
    expect(hasTip(tag)).toBe(true);
  });

  it("attributes NEST: a child's title does not count as the parent's", () => {
    /*
     * The second parser trap, and it produced a false accusation before it
     * was fixed: <TicketStrip actions={<button title=... data-dsh-tip=""/>}>
     * was reported as a COMPONENT wrongly carrying a tip. The button is the
     * one with the attributes; the component has neither.
     */
    const parsed = openingTags(
      "probe.tsx",
      '<TicketStrip ticket={t} actions={<button title="Go" data-dsh-tip="">Go</button>} />',
    );
    const parent = parsed.find((t) => t.name === "TicketStrip");
    const child = parsed.find((t) => t.name === "button");
    expect(hasTitle(parent!)).toBe(false);
    expect(hasTip(parent!)).toBe(false);
    expect(hasTitle(child!)).toBe(true);
    expect(hasTip(child!)).toBe(true);
  });

  it("an apostrophe in a JSX comment does not swallow the rest of the tag", () => {
    /*
     * The third trap, and the one that actually produced the false
     * accusation above. A lone `'` inside a comment opened a string that ran
     * to the next quote, skipping the `}` that closes the expression. Depth
     * then never returned to 0, so the parent kept collecting the CHILD's
     * attributes. This codebase's JSX comments are long prose, so the case
     * is ordinary rather than exotic.
     */
    const parsed = openingTags(
      "probe.tsx",
      '<Wrapper actions={/* the agent\'s row: "Sign off" */ <button title="Go" data-dsh-tip="">Go</button>} />',
    );
    const parent = parsed.find((t) => t.name === "Wrapper");
    expect(hasTip(parent!)).toBe(false);
    expect(hasTitle(parent!)).toBe(false);
    expect(hasTip(parsed.find((t) => t.name === "button")!)).toBe(true);
  });

  it("the guard FAILS when an element is missing the attribute", () => {
    // The check that makes every assertion above worth writing. Without it,
    // a scanner that quietly matched nothing would report a clean board.
    const [bare] = openingTags("probe.tsx", '<span title="Untipped">x</span>');
    expect(isDom(bare) && hasTitle(bare) && !hasTip(bare)).toBe(true);
  });

  it("the guard FAILS when an <option> is wrongly opted in", () => {
    const [opt] = openingTags("probe.tsx", '<option title="OS draws this" data-dsh-tip="">x</option>');
    expect(NATIVE_TOOLTIP_ONLY.has(opt.name) && hasTip(opt)).toBe(true);
  });
});
