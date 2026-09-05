/**
 * #73 BLOCKING review finding, 2026-09-05: agent-authored markdown was
 * rendered into the harness page through `dangerouslySetInnerHTML` with no
 * sanitizer, and `marked` v18 passes raw HTML and `javascript:` hrefs
 * through by design.
 *
 * The escalation is what makes these tests load-bearing rather than
 * hygiene: the harness origin can call `resolveApproval` and
 * `userAttachEvidence`, and the latter attaches AS ACTOR "user". Script in
 * that origin can approve its own allowlist card and forge a
 * `user_signoff` -- the two proofs the whole gate model treats as
 * human-only. Every payload below is one the reviewer actually drove
 * through this repo's own installed `marked`.
 */

import { describe, expect, it } from "vitest";

import { escapeHtml, isSafeUrl, renderMarkdownSafe } from "../src/client/safe-markdown";
import { expandableFact } from "../src/client/aidos-row-data";

describe("#73 raw HTML in agent-authored text never reaches the DOM", () => {
  it("defuses the reviewer's exact <img onerror> payload", () => {
    const html = renderMarkdownSafe('<img src=x onerror="alert(document.cookie)">');
    /*
     * The property is that no ELEMENT exists to carry the handler -- not
     * that the string "onerror" is absent. The rendered output is
     *
     *   <p>&lt;img src=x onerror=&quot;alert(document.cookie)&quot;&gt;</p>
     *
     * where every one of those characters is text content inside a <p>.
     * Asserting the substring is gone would forbid the CORRECT behaviour:
     * a ticket description that talks about an onerror attribute should
     * still be readable, and nothing should be silently dropped.
     */
    expect(html).not.toMatch(/<img/i);
    // No unescaped tag opener survives anywhere except marked's own <p>.
    expect(html.replace(/<\/?p>/g, "")).not.toContain("<");
    expect(html).toContain("&lt;img");
  });

  it("defuses a script tag", () => {
    const html = renderMarkdownSafe("<script>fetch('/steal')</script>");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script");
  });

  it("still renders ordinary markdown, so the fix is not a lobotomy", () => {
    const html = renderMarkdownSafe("**bold** and `code`\n\n- one\n- two");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<li>one</li>");
  });
});

describe("#73 unsafe URL schemes are defused", () => {
  it("neutralizes the reviewer's exact javascript: link", () => {
    const html = renderMarkdownSafe("[click](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="#"');
  });

  it("neutralizes a data: URL", () => {
    const html = renderMarkdownSafe("[x](data:text/html;base64,PHNjcmlwdD4=)");
    expect(html).not.toContain("data:text/html");
  });

  it("keeps http, https and mailto working", () => {
    expect(renderMarkdownSafe("[a](https://example.com)")).toContain('href="https://example.com"');
    expect(renderMarkdownSafe("[a](http://example.com)")).toContain('href="http://example.com"');
    expect(renderMarkdownSafe("[a](mailto:me@example.com)")).toContain("mailto:me@example.com");
  });

  it("keeps schemeless URLs working: relative, fragment, absolute path", () => {
    expect(isSafeUrl("#section")).toBe(true);
    expect(isSafeUrl("/board/39")).toBe(true);
    expect(isSafeUrl("./thing.png")).toBe(true);
  });

  /*
   * An ALLOW-LIST, not a block-list, and these are why. A block-list of
   * "javascript:, data:, vbscript:" loses to the next scheme someone thinks
   * of, and to the encoding tricks below -- both of which browsers have
   * historically honoured.
   */
  it("is not fooled by control characters inside the scheme", () => {
    expect(isSafeUrl("java\tscript:alert(1)")).toBe(false);
    expect(isSafeUrl("java\nscript:alert(1)")).toBe(false);
    expect(isSafeUrl(" javascript:alert(1)")).toBe(false);
  });

  it("is not fooled by numeric entities inside the scheme", () => {
    // &#106; is "j"
    expect(isSafeUrl("&#106;avascript:alert(1)")).toBe(false);
    // &#x6a; is also "j"
    expect(isSafeUrl("&#x6a;avascript:alert(1)")).toBe(false);
  });

  it("is not fooled by case", () => {
    expect(isSafeUrl("JaVaScRiPt:alert(1)")).toBe(false);
  });

  it("refuses an unknown scheme rather than allowing it", () => {
    // The whole point of failing closed.
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeUrl("somefuturescheme:whatever")).toBe(false);
  });
});

describe("#73 escapeHtml covers every metacharacter", () => {
  it("escapes all five", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("escapes the ampersand FIRST, so entities are not double-decoded", () => {
    // If & were escaped last, "&lt;" produced from "<" would become
    // "&amp;lt;" and the output would show literal "&lt;" to the reader.
    expect(escapeHtml("<")).toBe("&lt;");
  });
});

describe("#73 an expander is never offered when it would reveal nothing", () => {
  /*
   * BLOCKING finding 2. `expandableFact` used to test the OUTPUT for a
   * trailing ellipsis, so an author's OWN ellipsis fabricated an expander
   * that revealed a byte-identical string -- the exact failure the
   * function's docstring says it exists to prevent.
   */
  it("does not offer one for an author's own trailing ellipsis", () => {
    const fact = expandableFact("Description", "Wait for it…");
    expect(fact.value).toBe("Wait for it…");
    expect(fact.full).toBeUndefined();
  });

  it("does not offer one for the reviewer's TODO payload", () => {
    expect(expandableFact("Description", "TODO: finish this…").full).toBeUndefined();
  });

  it("still offers one when the text was genuinely cut", () => {
    const fact = expandableFact("Description", "x".repeat(400));
    expect(fact.full).toBe("x".repeat(400));
    expect(fact.value).not.toBe(fact.full);
  });

  it("still offers one when flattening destroyed structure", () => {
    const fact = expandableFact("Criteria", "one\ntwo\nthree");
    expect(fact.full).toBe("one\ntwo\nthree");
  });

  it("never offers one whose full text equals what is already shown", () => {
    // The invariant, stated directly: the button reveals `full`, so
    // offering it when full === value is always a lie.
    for (const text of ["short", "Wait for it…", "a b c", "", "…"]) {
      const fact = expandableFact("Label", text);
      if (fact.full !== undefined) expect(fact.full).not.toBe(fact.value);
    }
  });
});
