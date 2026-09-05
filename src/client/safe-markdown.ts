/**
 * Markdown rendering that cannot smuggle script into the harness page.
 *
 * WHY THIS EXISTS (independent review of #73, 2026-09-05, BLOCKING).
 *
 * `marked.parse()` output was being handed straight to
 * `dangerouslySetInnerHTML`. No sanitizer existed anywhere in this
 * repository, and `marked` v18 removed its own `sanitize` option: it passes
 * raw HTML and `javascript:` hrefs through by design. The reviewer proved
 * the payload survives end to end using this repo's own installed marked:
 *
 *   <img src=x onerror="alert(document.cookie)">   -> emitted verbatim
 *   [click](javascript:alert(1))                   -> live javascript: href
 *
 * THIS IS NOT "JUST XSS". The text is AGENT-AUTHORED: a ticket description
 * is written by the agent from whatever it read -- a README, a web page, a
 * subagent's report -- which is the standard prompt-injection path for this
 * product. And the harness origin is privileged: the client's own RPC
 * surface includes `resolveApproval` and `userAttachEvidence`, and the
 * latter attaches AS ACTOR "user". So injected script in this origin can
 * approve its own allowlist card and forge a `user_signoff` -- the two
 * proofs the entire gate model treats as human-only, and the reason the
 * board can be trusted at all. A rendering convenience was one payload away
 * from defeating the product's core safety property.
 *
 * TWO DEFENCES, because either alone leaves a hole:
 *
 * 1. ESCAPE THE INPUT before parsing, so NO author-supplied HTML tag can
 *    reach the DOM. Markdown syntax still works -- escaping touches only
 *    & < > " ' -- and raw HTML degrades to visible text, which is the
 *    correct outcome for a ticket description. This alone kills the <img
 *    onerror> class completely.
 *
 * 2. FILTER URL SCHEMES in the output, because escaping does not help
 *    there: `[click](javascript:alert(1))` contains no HTML metacharacters,
 *    so it survives step 1 and marked renders a live href from it.
 *
 * The regex in step 2 is reliable ONLY because step 1 already ran: after
 * escaping, the only tags in the string are ones marked emitted itself, so
 * there is no attacker-controlled quoting to confuse it. Parsing HTML with
 * a regex is otherwise a mistake, and this comment exists so nobody
 * reorders the two steps and quietly breaks that guarantee.
 *
 * A dedicated sanitizer (DOMPurify) would be more robust against future
 * marked changes, and is the right move if this surface grows. It is a new
 * runtime dependency for the client bundle, so it is deliberately proposed
 * rather than assumed here.
 */

import { marked } from "marked";

/** The five characters that can open an HTML construct. */
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Render every HTML metacharacter inert. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

/**
 * Whether a URL may appear in an `href` or `src`.
 *
 * ALLOW-LIST, not a block-list. A block-list of "javascript:, data:, vbscript:"
 * loses to the next scheme someone thinks of, and to encoding tricks; an
 * allow-list fails closed. A relative URL, a fragment, and a protocol-relative
 * path are all schemeless and therefore safe by this test.
 */
export function isSafeUrl(url: string): boolean {
  /*
   * Normalize the way a BROWSER would before deciding. `java\tscript:x` and
   * `java&#09;script:x` are both live in some parsers, so strip whitespace,
   * control characters and numeric entities before looking for a scheme.
   */
  const normalized = url
    .replace(/&#(x?)([0-9a-f]+);?/gi, (_match, hex: string, code: string) =>
      String.fromCharCode(parseInt(code, hex === "" ? 10 : 16)),
    )
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0020]/g, "")
    .toLowerCase();
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(normalized);
  // No scheme at all: relative, fragment, or protocol-relative. Safe.
  if (scheme === null) return true;
  return scheme[1] === "http" || scheme[1] === "https" || scheme[1] === "mailto";
}

/** Replace every unsafe href/src in marked's own output with "#". */
function neutralizeUrls(html: string): string {
  return html.replace(
    /(\s(?:href|src)=")([^"]*)(")/gi,
    (match, prefix: string, url: string, suffix: string) =>
      isSafeUrl(url) ? match : prefix + "#" + suffix,
  );
}

/**
 * Markdown to HTML, safe to hand to `dangerouslySetInnerHTML`.
 *
 * Author-supplied HTML becomes visible text rather than live markup, and a
 * link to anything but http/https/mailto is defused to "#".
 */
export function renderMarkdownSafe(text: string): string {
  if (text === "") return "";
  const parsed = marked.parse(escapeHtml(text), { async: false });
  return neutralizeUrls(String(parsed));
}
