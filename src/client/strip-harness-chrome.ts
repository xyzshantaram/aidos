/**
 * #182: harness ref-chip chrome must never reach an aidos renderer.
 *
 * WHAT ARRIVED. The harness composer represents a `@`-reference as a live
 * chip -- a `<span>` carrying a styled-components class (`gdEzaW_refChip`)
 * and a `data-ref-chip` attribute -- and that markup was arriving as TEXT
 * inside strings aidos renders (ticket descriptions, tool fact bodies).
 * `renderMarkdownSafe` then did exactly what #73 tells it to: it escaped
 * the `<`/`>`/`"` into visible `&lt;`/`&gt;`/`&quot;`, so the reader saw
 * mangled markup where a reference chip should have been.
 *
 * WHERE THE FIX LIVES. Here, UPSTREAM of the renderer -- never in
 * `safe-markdown.ts`'s escaper. The escaper is a security boundary
 * (agent-authored text in a privileged origin; see that file's header), and
 * teaching it to pass ANY raw HTML through to fix a cosmetic bug would
 * reopen the exact injection it exists to close. So this helper strips the
 * chrome from the text first, and `renderMarkdownSafe` calls it before
 * escaping. Every aidos markdown surface funnels through
 * `renderMarkdownSafe` (detail description, peek description, expanded
 * facts), so one call site covers all of them, including future ones.
 *
 * WHAT "STRIP" MEANS. The chip's visible label (its inner text, e.g.
 * `/home`) is kept as plain text; only the harness markup goes. A
 * description that said "see <chip>/home</chip>" reads "see /home" --
 * the information survives, the chrome does not, and surrounding markdown
 * (`**bold**`, links, lists) renders exactly as before.
 *
 * WHAT IS RECOGNISED. A `<span>` whose opener carries one of the ref-chip
 * markers: the styled-components `refChip` class fragment, the `ref-chip`
 * name, or the `data-ref-chip` attribute. All three name the same
 * composer feature, so all three are chrome, not content.
 *
 * WHAT IS DELIBERATELY NOT STRIPPED. Text that is ALREADY escaped --
 * `&lt;span ... refChip ...&gt;` with no raw `<` anywhere -- is left
 * alone. That form is author-typed text: someone (including ticket #182
 * itself) quoting what the broken render looked like. Per #73 such text
 * must degrade to visible text, not be eaten, and stripping it would
 * destroy quoted evidence of the very bug this file fixes.
 *
 * WHY IT THROWS. A strip rule that silently passes what it does not
 * recognise re-creates this bug once per harness variant: the next
 * composer change (a `<div>` chip, a renamed attribute, an unclosed tag)
 * would sail through and render as mangled text again, and nobody would
 * know the rule was stale. So after stripping, any RAW tag opener still
 * carrying a ref-chip-like marker throws. "Raw" is the operative word:
 * prose that merely MENTIONS ref-chip ("a harness ref-chip span") has no
 * angle brackets and never matches, and already-escaped quotations have
 * no raw `<` and never match either -- only something that would reach
 * the DOM as live markup if the escaper ever let it through fails loud.
 * The match is case-insensitive on purpose: the strip above is exact
 * (known variants only), so a differently-cased marker is by definition
 * an unrecognised variant and must not pass quietly.
 */

const REF_CHIP_OPEN_ATTRS = "[^>]*?(?:refChip|ref-chip|data-ref-chip)[^>]*?";

/** A recognised ref-chip span; group 1 is the chip's visible label. */
const REF_CHIP_SPAN = new RegExp(
  "<span\\b" + REF_CHIP_OPEN_ATTRS + ">([\\s\\S]*?)</span>",
  "g",
);

/** A recognised ref-chip span with no label (self-closing). */
const REF_CHIP_SPAN_EMPTY = new RegExp(
  "<span\\b" + REF_CHIP_OPEN_ATTRS + "/>",
  "g",
);

/**
 * A RAW tag opener still carrying a ref-chip-like marker AFTER the strip
 * above ran. Any match here is an unrecognised harness variant -- a new
 * tag, a renamed marker, a tag the strip pattern could not parse -- and
 * passing it through would re-create #182 silently for that variant.
 */
const RESIDUAL_CHROME = /<[A-Za-z][^<>]*ref[_-]?chip/i;

/** Remove harness ref-chip chrome from text headed for an aidos renderer. */
export function stripHarnessChrome(text: string): string {
  const stripped = text
    .replace(REF_CHIP_SPAN, (_match, label: string) => label)
    .replace(REF_CHIP_SPAN_EMPTY, "");
  const residual = RESIDUAL_CHROME.exec(stripped);
  if (residual !== null) {
    const at = Math.max(0, residual.index - 40);
    throw new Error(
      "#182: unrecognised harness ref-chip variant in text headed for an " +
        "aidos renderer -- refusing to pass it through (a silent pass " +
        "re-creates the escaped-markup bug per variant). " +
        "Teach stripHarnessChrome the new shape. Near: " +
        JSON.stringify(stripped.slice(at, residual.index + 120)),
    );
  }
  return stripped;
}
