/**
 * #182: harness ref-chip markup rendered as escaped text in aidos surfaces.
 *
 * The harness composer serialises a reference chip as a live span --
 * `<span class="..._refChip" data-ref-chip="skill" ...>/home</span>` --
 * and that chrome was arriving as TEXT inside ticket descriptions. The
 * #73 escaper then did its job (escaped it), so readers saw mangled
 * `&lt;span ...&gt;` where a chip should have been. The fix strips the
 * chrome upstream of the renderer; the escaper itself is untouched, and
 * these tests pin BOTH halves: chrome gone, boundary intact.
 */

import { describe, expect, it } from "vitest";

import { escapeHtml, renderMarkdownSafe } from "../src/client/safe-markdown";
import { stripHarnessChrome } from "../src/client/strip-harness-chrome";

/** The reported sample's shape: styled-components refChip class + data attr. */
const CHIP =
  '<span class="gdEzaW_refChip" data-ref-chip="skill" data-path="/home">/home</span>';

describe("#182 the reported sample no longer renders as escaped markup", () => {
  it("strips the ref-chip span but keeps its label", () => {
    const html = renderMarkdownSafe("See " + CHIP + " for details.");
    expect(html).not.toContain("refChip");
    expect(html).not.toContain("data-ref-chip");
    expect(html).not.toContain("&lt;span");
    expect(html).toContain("/home");
  });

  it("strips every chip when several arrive in one text", () => {
    const html = renderMarkdownSafe(
      "From " + CHIP + " to " + CHIP.replace(">/home<", ">/srv<"),
    );
    expect(html).not.toContain("refChip");
    expect(html).toContain("/home");
    expect(html).toContain("/srv");
  });

  it("a chip recognised by class alone is chrome too", () => {
    const html = renderMarkdownSafe(
      'See <span class="gdEzaW_refChip">/home</span> now.',
    );
    expect(html).not.toContain("refChip");
    expect(html).toContain("/home");
  });

  it("legitimate formatting still renders around stripped chrome", () => {
    const html = renderMarkdownSafe("**bold** see " + CHIP + " and `code`");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
    expect(html).not.toContain("refChip");
  });

  it("ordinary text passes through the strip byte-identical", () => {
    expect(stripHarnessChrome("**bold** and `code`\n\n- one\n- two")).toBe(
      "**bold** and `code`\n\n- one\n- two",
    );
    expect(stripHarnessChrome("")).toBe("");
  });

  it("a self-closing chip leaves no chrome and throws nothing", () => {
    // Mutation run mut182-*: deleting the REF_CHIP_SPAN_EMPTY branch keeps
    // the suite green — every fixture chip carries a label. A labelless
    // self-closing chip strips to nothing; without the branch the residual
    // rule throws instead.
    const html = renderMarkdownSafe(
      'See <span class="gdEzaW_refChip" data-ref-chip="skill"/> for details.',
    );
    expect(html).not.toContain("refChip");
    expect(html).not.toContain("data-ref-chip");
    expect(html).not.toContain("&lt;span");
    expect(html).toContain("See");
  });
});

describe("#182 the strip never eats author text or quoted evidence", () => {
  it("prose that merely MENTIONS ref-chip still renders", () => {
    const html = renderMarkdownSafe(
      "a harness ref-chip span with gdEzaW_refChip class",
    );
    expect(html).toContain("ref-chip");
    expect(html).toContain("gdEzaW_refChip");
  });

  it("already-escaped chrome is a quotation, not chrome: escaped, not eaten", () => {
    // This is what ticket #182 itself quotes. No raw `<` is present, so
    // there is no chrome to strip -- and per #73 it must degrade to
    // visible text rather than vanish.
    const quoted =
      "&lt;span class=&quot;gdEzaW_refChip&quot;&gt;/home&lt;/span&gt;";
    const html = renderMarkdownSafe(quoted);
    expect(html).toContain("/home");
    expect(html.replace(/<\/?p>/g, "")).not.toContain("<");
  });
});

describe("#182 unrecognised variants fail loudly, never pass through", () => {
  it("a chip on a new tag throws instead of rendering mangled", () => {
    expect(() =>
      renderMarkdownSafe('<div class="xyz_refChip">/home</div>'),
    ).toThrow(/ref-chip/i);
  });

  it("a renamed marker on the same tag throws", () => {
    expect(() =>
      renderMarkdownSafe('<span class="xyz_RefChip">/home</span>'),
    ).toThrow(/ref-chip/i);
  });

  it("an unclosed chip throws rather than leaking half its markup", () => {
    expect(() =>
      renderMarkdownSafe('<span class="gdEzaW_refChip">/home'),
    ).toThrow(/ref-chip/i);
  });
});

describe("#182 the #73 security boundary still holds after the fix", () => {
  it("the reviewer's exact <img onerror> payload still degrades to text", () => {
    const html = renderMarkdownSafe('<img src=x onerror="alert(document.cookie)">');
    expect(html).not.toMatch(/<img/i);
    // No unescaped tag opener survives anywhere except marked's own <p>.
    expect(html.replace(/<\/?p>/g, "")).not.toContain("<");
    expect(html).toContain("&lt;img");
  });

  it("a script tag smuggled beside chrome still degrades", () => {
    const html = renderMarkdownSafe(CHIP + "<script>fetch('/steal')</script>");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script");
    expect(html).toContain("/home");
  });

  it("escapeHtml still covers every metacharacter", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("unsafe URL schemes are still defused after the strip", () => {
    const html = renderMarkdownSafe("[click](javascript:alert(1)) " + CHIP);
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="#"');
  });
});
