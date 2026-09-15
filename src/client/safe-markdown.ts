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
 * WHERE THE BOUNDARY IS (#212, 2026-09-15).
 *
 * It used to sit on the INPUT side: the source markdown was HTML-escaped
 * before `marked` ever saw it. That double-escaped everything -- `"` became
 * `&quot;` up front, then marked escaped code-span content a second time
 * into `&amp;quot;`, so every `"`, `<`, `>` and `&` in a code span (and in
 * prose marked escapes again) rendered as mangled entity text. The fix
 * MOVES the boundary to the OUTPUT side: marked parses the raw
 * (chrome-stripped) markdown, and the resulting HTML is sanitized once,
 * against an allowlist, before it reaches `dangerouslySetInnerHTML`.
 *
 * THE SANITIZER IS DOMPurify, A MAINTAINED LIBRARY -- NOT HAND-ROLLED.
 * A hand-rolled HTML sanitizer is a classic source of bypasses (regexes
 * cannot parse HTML, and every parser-differential is an injection), and
 * #30 on this board already argues for preferring maintained libraries
 * over hand-rolled parsing in this area. DOMPurify parses with the REAL
 * DOM, so there is no tokenizer of ours to drift out of agreement with
 * the browser, and its allowlists are audited by people who do only this.
 * It is a runtime dependency of the client bundle (browser code built by
 * build.mjs): pure JS, no Node builtins, minifies cleanly.
 *
 * TWO LAYERS, because either alone leaves a hole:
 *
 * 1. DOMPurify WITH A NARROWED URI RULE. Stock DOMPurify allows more URI
 *    schemes than this surface ever needs (tel:, sms:, cid:, ...), so the
 *    config below keeps stock tag/attribute allowlists but restricts the
 *    scheme test to http/https/mailto, schemeless URLs passing as before.
 *    Stock DOMPurify ALSO keeps `data:` alive on media tags by design
 *    (its DATA_URI_TAGS exception covers img/audio/video src), which is
 *    why layer 2 is load-bearing rather than decorative.
 *
 * 2. `neutralizeUrls` AFTER the sanitizer, applying the same allow-list
 *    rule (`isSafeUrl`) to the sanitized HTML. DOMPurify normalizes
 *    attributes to double-quoted form, which is exactly what that regex
 *    matches, so it now runs on normalized output instead of on
 *    attacker-influenced quoting. It defuses anything layer 1 lets
 *    through by exception (a `data:` image source) to "#", and it stays
 *    correct if a future DOMPurify or marked change alters what layer 1
 *    emits.
 *
 * DOMPurify NEEDS A WINDOW. The client bundle runs in a browser, where the
 * default export arrives already bound. Under vitest there is no window,
 * and the same default export is a FACTORY awaiting one -- so the binding
 * is resolved lazily at first use (see `sanitizer()`), and tests for this
 * module run under the jsdom environment, which supplies it. `jsdom` is a
 * dev-only test concern: nothing in `src/client` may import it, or the
 * client bundle would drag in Node-only code.
 *
 * #182 runs FIRST: harness ref-chip chrome is stripped before parsing, so
 * it never renders as visible escaped markup. That ordering is untouched
 * by #212 -- the strip still runs before everything else, for the same
 * reason: the renderer never has to choose between mangling chrome and
 * passing HTML through.
 */

import DOMPurifyFactory from "dompurify";
import type { Config as DOMPurifyConfig, DOMPurify } from "dompurify";
import { marked } from "marked";
import { stripHarnessChrome } from "./strip-harness-chrome";

/**
 * DOMPurify configuration: stock tag and attribute allowlists, with the
 * URI-scheme rule narrowed to this surface's needs.
 *
 * The tail of the expression is DOMPurify's own stock tail, kept verbatim:
 * schemeless URLs (relative paths, fragments, protocol-relative paths)
 * carry no scheme and stay allowed. Only the scheme alternatives changed:
 * stock allows ftp/ftps/tel/callto/sms/cid/xmpp/matrix in addition to
 * http/https/mailto; here anything but http/https/mailto fails the test
 * and DOMPurify drops the attribute. `neutralizeUrls` below then enforces
 * the identical rule a second time (see the header: the DATA_URI_TAGS
 * exception is why the second pass is load-bearing).
 */
const SANITIZE_CONFIG: DOMPurifyConfig = {
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

/**
 * The sanitizer instance, resolved lazily.
 *
 * In the browser bundle the default export is already bound to the page's
 * window and exposes `sanitize` directly. In Node (vitest) the same
 * default export is a factory: `sanitize` is absent until it is called
 * with a window, which the jsdom test environment provides as
 * `globalThis.window`. Resolving here -- at first render, not at import --
 * keeps module evaluation side-effect free in both runtimes, and the
 * per-window cache keeps repeated renders from rebinding.
 */
let cachedWindow: unknown = null;
let cachedSanitizer: DOMPurify | null = null;

function sanitizer(): DOMPurify {
  const candidate = DOMPurifyFactory as unknown as DOMPurify & ((win: Window) => DOMPurify);
  if (typeof candidate.sanitize === "function") return candidate;
  const win = (globalThis as unknown as { window?: Window }).window;
  if (win === undefined || win === null) {
    throw new Error(
      "#212: renderMarkdownSafe needs a Window for DOMPurify and none exists. " +
        "The client bundle always runs in a browser; tests for this module must " +
        "run under the jsdom environment (// @vitest-environment jsdom).",
    );
  }
  if (cachedSanitizer === null || cachedWindow !== win) {
    cachedSanitizer = candidate(win);
    cachedWindow = win;
  }
  return cachedSanitizer;
}

/** Sanitize marked's output HTML against the allowlist, exactly once. */
function sanitizeHtml(html: string): string {
  return sanitizer().sanitize(html, SANITIZE_CONFIG);
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

/**
 * Replace every unsafe href/src in sanitized output with "#".
 *
 * This runs AFTER DOMPurify (see the header): DOMPurify normalizes
 * attributes to double-quoted form, so the only quoting this regex ever
 * meets is the sanitizer's own -- there is no attacker-controlled quoting
 * left to confuse it. It is load-bearing for the cases DOMPurify keeps by
 * exception, notably `data:` sources on media tags.
 */
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
 * Marked parses the raw (chrome-stripped) markdown, so code spans and prose
 * carry each entity exactly once; DOMPurify then keeps the allow-listed
 * subset as live markup and drops the rest, and `neutralizeUrls` defuses
 * any surviving non-http/https/mailto link to "#".
 *
 * #182 runs FIRST: harness ref-chip chrome is stripped before parsing, so
 * it never renders as visible escaped markup.
 */
export function renderMarkdownSafe(text: string): string {
  if (text === "") return "";
  const parsed = marked.parse(stripHarnessChrome(text), { async: false });
  return neutralizeUrls(sanitizeHtml(String(parsed)));
}
