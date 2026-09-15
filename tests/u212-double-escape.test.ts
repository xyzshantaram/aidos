// @vitest-environment jsdom
/**
 * #212: markdown was double-escaped -- quotes rendered as &quot; in code.
 *
 * `renderMarkdownSafe` used to HTML-escape the SOURCE markdown and hand the
 * result to `marked`, which escaped code-span content a second time:
 * `"` -> `&quot;` up front -> `&amp;quot;` in the output HTML, which the
 * browser shows as the literal text `&quot;`. The fix moves the boundary
 * to the OUTPUT side (parse raw, sanitize once with DOMPurify), so this
 * file pins BOTH halves: entities appear exactly once, AND the sanitizer
 * the old pre-escape used to be still holds -- proven by tests that fail
 * if it is removed, not by argument.
 *
 * Criterion map (see ticket #212):
 *   1. inline code-span quotes render literally;
 *   2. <, > and & survive singly in code spans, fenced blocks, prose;
 *   3. script tag / onerror attribute / javascript: link are inert, via
 *      tests that fail without the sanitiser;
 *   4. #182 chrome still strips (with quotes surviving alongside);
 *   5. one shared renderer (no code: the fix lives only in
 *      renderMarkdownSafe; the modal/row/panel call sites are pinned by
 *      tests/u73-aidos-rows.test.ts);
 *   6. escaping happens exactly once (round-trip battery).
 */

import { describe, expect, it } from "vitest";
import { marked } from "marked";

import { renderMarkdownSafe } from "../src/client/safe-markdown";
import { stripHarnessChrome } from "../src/client/strip-harness-chrome";

/** What the browser SHOWS for a chunk of rendered HTML. */
function textOf(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
}

/**
 * Marked with NO sanitizer: what an attacker-supplied string looks like
 * before the boundary. Asserting the payload is live HERE proves the
 * companion assertion on the sanitized output is not vacuously passing --
 * and it is also the shape the output takes if the sanitiser is ever
 * removed, which is why these tests die on that revert (criterion 3).
 */
function rawMarked(source: string): string {
  return String(marked.parse(stripHarnessChrome(source), { async: false }));
}

describe("#212 double quotes in an inline code span render literally (1)", () => {
  it("the reported payload: ctx.get(\"sessionPersistence\").inspect", () => {
    const html = renderMarkdownSafe('`ctx.get("sessionPersistence").inspect`');
    expect(html).toContain("<code>");
    expect(textOf(html)).toContain('ctx.get("sessionPersistence").inspect');
    // The defect, stated as bytes: the & of the first encoding encoded again.
    expect(html).not.toContain("&amp;quot;");
  });
});

describe("#212 <, > and & survive singly in code and prose (2)", () => {
  it("inline code span", () => {
    expect(textOf(renderMarkdownSafe("`a < b && c > d`"))).toContain("a < b && c > d");
  });

  it("fenced block", () => {
    const html = renderMarkdownSafe('```js\nif (a < b && c > d) { x = "y"; }\n```');
    expect(html).toContain("<pre>");
    expect(textOf(html)).toContain('if (a < b && c > d) { x = "y"; }');
  });

  it("ordinary prose", () => {
    expect(textOf(renderMarkdownSafe('He said "hi" & left'))).toContain('He said "hi" & left');
  });
});

describe("#212 the XSS trio is inert, proven by tests that fail without the sanitiser (3)", () => {
  it("a script tag is dropped element and all", () => {
    const payload = "<script>fetch('/steal')</script>";
    // Not vacuous: raw, the payload is live.
    expect(rawMarked(payload)).toContain("<script");
    const html = renderMarkdownSafe(payload);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("steal");
  });

  it("an onerror attribute is stripped, with its value", () => {
    const payload = '<img src=x onerror="alert(document.cookie)">';
    expect(rawMarked(payload)).toContain("onerror");
    const html = renderMarkdownSafe(payload);
    // No event-handler attribute of ANY name survives -- not just onerror.
    expect(html).not.toMatch(/\son\w[\w-]*\s*=/i);
    expect(html).not.toContain("alert(");
    // The innocent half is kept: sanitizing drops the attack, not the tag.
    expect(html).toContain('src="x"');
  });

  it("a javascript: link survives only as inert link text", () => {
    const payload = "[click](javascript:alert(1))";
    expect(rawMarked(payload)).toContain("javascript:");
    const html = renderMarkdownSafe(payload);
    expect(html).not.toContain("javascript:");
    expect(html).toContain(">click</a>");
    expect(textOf(html)).toContain("click");
  });

  it("a data: image source is defused to # by the neutralizeUrls second pass", () => {
    /*
     * DOMPurify keeps data: alive on MEDIA tags by deliberate exception
     * (its DATA_URI_TAGS set covers img src), so the stock config alone
     * passes this through -- the second pass is what defuses it. If either
     * layer is removed, one of the two assertions below dies: without the
     * sanitiser the raw data: URI survives; without neutralizeUrls the
     * sanitiser-kept data: URI survives.
     */
    const payload = "![x](data:image/svg+xml;base64,PHNjcmlwdD4=)";
    expect(rawMarked(payload)).toContain("data:image");
    const html = renderMarkdownSafe(payload);
    expect(html).not.toContain("data:image");
    expect(html).toContain('src="#"');
  });

  it("http, https and mailto links still work", () => {
    expect(renderMarkdownSafe("[a](https://example.com)")).toContain('href="https://example.com"');
    expect(renderMarkdownSafe("[a](http://example.com)")).toContain('href="http://example.com"');
    expect(renderMarkdownSafe("[a](mailto:me@example.com)")).toContain("mailto:me@example.com");
  });
});

describe("#212 harness chrome still strips, with quotes surviving alongside (4)", () => {
  it("chip label kept, chrome gone, code quotes literal", () => {
    const chip =
      '<span class="gdEzaW_refChip" data-ref-chip="skill" data-path="/home">/home</span>';
    const html = renderMarkdownSafe(`See ${chip} and \`ctx.get("x")\``);
    expect(html).not.toContain("refChip");
    expect(html).not.toContain("data-ref-chip");
    expect(html).not.toContain("&lt;span");
    expect(html).toContain("/home");
    expect(textOf(html)).toContain('ctx.get("x")');
  });
});

describe("#212 escaping happens exactly once, end to end (6)", () => {
  /** The defect's fingerprint: the & of a correct encoding encoded again. */
  const DOUBLE_ENCODED = /&amp;(quot|lt|gt|amp|#39);/;

  it("no entity is encoded twice across code, fences, prose and links", () => {
    const sources = [
      '`ctx.get("sessionPersistence").inspect`',
      "`a < b && c > d`",
      '```js\nif (a < b && c > d) { x = "y"; }\n```',
      'He said "hi" & left <soon>',
      'A "quoted" & <bracketed> paragraph.',
      // Author-typed entities must not gain a second layer either.
      "Fish &amp; chips, 5 &gt; 3, &quot;quoted&quot;.",
      '[a "quoted" link](https://example.com/?a=1&b=2)',
      "**bold** and `code` with \"quotes\" & ampersands",
    ];
    for (const source of sources) {
      expect(renderMarkdownSafe(source), JSON.stringify(source)).not.toMatch(DOUBLE_ENCODED);
    }
  });

  it("an author-typed &amp; stays singly encoded and reads as &", () => {
    const html = renderMarkdownSafe("Fish &amp; chips");
    expect(html).not.toMatch(DOUBLE_ENCODED);
    expect(textOf(html)).toContain("Fish & chips");
  });

  it("empty in, empty out", () => {
    expect(renderMarkdownSafe("")).toBe("");
  });
});
