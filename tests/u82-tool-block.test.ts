/**
 * #82: reading a tool-call block for the scratch tools' rendered rows.
 *
 * The scratch tools rendered a raw JSON envelope, so a scratch read appeared
 * as `{"ok":true,"path":"/home/...","scratch_root":"/home/...","content":
 * "..."}` beside a builtin read's clean row. That is the gap this closes.
 *
 * The block SHAPES are dictated by the harness and are ported faithfully
 * from tool-render rather than reinvented -- a divergent reader would render
 * subtly wrong rows, which is worse than rendering none. tool-render keeps
 * this logic inline in its components; here it is extracted precisely so it
 * can be tested, which is the lesson this project keeps relearning.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  argsRawOf,
  errorTextOf,
  firstLine,
  firstLineOfError,
  isDone,
  parseArgs,
  pickString,
  relativize,
  resultTextOf,
  rowStateOf,
  unwrapErrorEnvelope,
  unwrapScratchResult,
} from "../src/client/tool-block";
import {
  escapeHtml,
  gutterWidth,
  highlightCode,
  languageFor,
} from "../src/client/highlight";

const ROOT = "/home/sid/.dsh/aidos/scratch/--home-sid-repos-aidos--";

describe("#82 block state", () => {
  it("an in-flight block is running", () => {
    expect(rowStateOf({ argsRaw: "{}" })).toBe("running");
    expect(isDone({ argsRaw: "{}" })).toBe(false);
  });

  it("a settled block is ok", () => {
    expect(rowStateOf({ kind: "tool", isError: false })).toBe("ok");
  });

  it("a failed block is error", () => {
    expect(rowStateOf({ kind: "tool", isError: true })).toBe("error");
  });

  it("an INTERRUPTED block is stopped, not error", () => {
    /*
     * The user stopped it. That is not a failure and must not be tinted like
     * one -- an error tint on a deliberate stop trains the reader to ignore
     * the tint.
     */
    expect(rowStateOf({ kind: "tool", isError: true, error: { code: "interrupted" } })).toBe(
      "stopped",
    );
  });

  it("null and non-objects do not crash the row", () => {
    expect(rowStateOf(null)).toBe("running");
    expect(rowStateOf("nope")).toBe("running");
    expect(argsRawOf(null)).toBe("");
  });
});

describe("#82 arguments", () => {
  it("reads argsRaw from a settled block's call", () => {
    expect(argsRawOf({ kind: "tool", call: { argsRaw: '{"path":"a"}' } })).toBe('{"path":"a"}');
  });

  it("reads argsRaw from an in-flight block directly", () => {
    expect(argsRawOf({ argsRaw: '{"path":"b"}' })).toBe('{"path":"b"}');
  });

  it("returns null for unparseable arguments rather than throwing", () => {
    // A row must render even when the arguments are truncated mid-stream.
    expect(parseArgs("{not json")).toBeNull();
    expect(parseArgs("")).toBeNull();
  });

  it("rejects a non-object payload", () => {
    expect(parseArgs("[1,2]")).toBeNull();
    expect(parseArgs("42")).toBeNull();
  });

  it("picks the first present key, so path and file_path both work", () => {
    // The scratch tools take `path`; the builtins take `file_path`. One row
    // reads both because scratch_edit delegates and may echo either.
    expect(pickString({ file_path: "x" }, ["path", "file_path"])).toBe("x");
    expect(pickString({ path: "y", file_path: "x" }, ["path", "file_path"])).toBe("y");
    expect(pickString({ path: "" }, ["path", "file_path"])).toBeUndefined();
    expect(pickString(null, ["path"])).toBeUndefined();
  });
});

describe("#82 result and error text", () => {
  it("joins every text block", () => {
    expect(
      resultTextOf({ kind: "t", content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] }),
    ).toBe("a\nb");
  });

  it("renders non-text content as JSON rather than dropping it", () => {
    const out = resultTextOf({ kind: "t", content: [{ type: "image", url: "u" }] });
    expect(out).toContain("image");
  });

  it("falls back to the error message when there is no body", () => {
    expect(errorTextOf({ kind: "t", content: [], error: { message: "boom" } })).toBe("boom");
    expect(errorTextOf({ kind: "t", content: [], error: { code: "E_X" } })).toBe("E_X");
  });

  it("prefers the body over the error fields", () => {
    expect(
      errorTextOf({ kind: "t", content: [{ type: "text", text: "detail" }], error: { message: "boom" } }),
    ).toBe("detail");
  });
});

describe("#82 the error line put on the row", () => {
  it("prefers a NAMED failure over an unhelpful first line", () => {
    /*
     * The scratch tools' own refusals are exactly this family, and they are
     * the ones a reader needs to see: the wrapper line says nothing.
     */
    const text = "Error: edit failed\nFS_NOT_OBSERVED: read the file first";
    expect(firstLineOfError(text)).toContain("FS_NOT_OBSERVED");
  });

  it("recognises the aidos refusal codes too", () => {
    const text = "Error\nAIDOS_EDIT_GRAMMAR_UNSUPPORTED: use old_string";
    expect(firstLineOfError(text)).toContain("AIDOS_EDIT_GRAMMAR_UNSUPPORTED");
  });

  it("recognises sandbox denials and exit codes", () => {
    expect(firstLineOfError("x\n[sandbox: file access denied]")).toContain("sandbox");
    expect(firstLineOfError("x\n[exit code: 2]")).toContain("exit code");
  });

  it("falls back to the first line when nothing is named", () => {
    expect(firstLineOfError("just this\nand more")).toBe("just this");
    expect(firstLine("one\ntwo")).toBe("one");
  });
});

describe("#82 the path summary", () => {
  it("strips the scratch root, which is identical on every row", () => {
    /*
     * Without this the summary is ~60 characters of identical prefix and the
     * part that actually differs falls off the end of the line.
     */
    expect(relativize(ROOT + "/audit/probe.txt", ROOT)).toBe("audit/probe.txt");
  });

  it("tolerates a root with a trailing slash", () => {
    expect(relativize(ROOT + "/a.txt", ROOT + "/")).toBe("a.txt");
  });

  it("leaves a path outside the root alone", () => {
    expect(relativize("/etc/hosts", ROOT)).toBe("/etc/hosts");
  });

  it("is a no-op with no root", () => {
    expect(relativize("/a/b", undefined)).toBe("/a/b");
  });
});

describe("#82 the scratch envelope is unwrapped", () => {
  it("shows the file CONTENT, not the JSON wrapper", () => {
    // path and scratch_root are already on the row; repeating them in the
    // body is what made these calls look like data dumps.
    const envelope = JSON.stringify({ ok: true, path: "/x", scratch_root: ROOT, content: "hello" });
    expect(unwrapScratchResult(envelope)).toBe("hello");
  });

  it("falls back to the message when there is no content", () => {
    expect(unwrapScratchResult(JSON.stringify({ ok: true, message: "edited" }))).toBe("edited");
  });

  it("passes plain text through untouched", () => {
    expect(unwrapScratchResult("not json at all")).toBe("not json at all");
  });

  it("passes an envelope with neither field through, rather than blanking it", () => {
    const other = JSON.stringify({ ok: true, path: "/x" });
    expect(unwrapScratchResult(other)).toBe(other);
  });

  it("handles null and empty without crashing", () => {
    expect(unwrapScratchResult(null)).toBeNull();
    expect(unwrapScratchResult("")).toBe("");
  });
});

describe("#82 the rows USE tool-render, rather than approximating it", () => {
  /*
   * Three hand-written approximations failed in a row: "not close enough",
   * then "the card looks different". Approximating a design from memory does
   * not converge, so the stylesheet is now VENDORED verbatim and the
   * components use its actual class names.
   *
   * These tests pin that arrangement. The visual fidelity itself is
   * guaranteed by using the same CSS, not by assertions about pixel values --
   * which is the point: there is no longer a parallel set of rules here that
   * could drift.
   */
  const rows = readFileSync(
    new URL("../src/client/scratch-rows.tsx", import.meta.url),
    "utf8",
  );
  const board = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
  const index = readFileSync(new URL("../src/client/index.ts", import.meta.url), "utf8");
  const vendored = readFileSync(
    new URL("../src/client/vendor/tool-render/tool-render.css", import.meta.url),
    "utf8",
  );

  it("uses tool-render's own class names", () => {
    for (const cls of [
      "tool-render-card",
      "tool-render-row",
      "tool-render-leading",
      "tool-render-title",
      "tool-render-sep",
      "tool-render-summary",
      "tool-render-body",
    ]) {
      expect(rows, cls).toContain(cls);
    }
  });

  it("keeps NO parallel stylesheet of its own", () => {
    /*
     * The failure mode being removed. A second set of rules describing the
     * same design drifts from it, and every drift is invisible until someone
     * looks at both side by side -- which is exactly how three attempts
     * shipped looking wrong.
     */
    expect(board).not.toContain(".aidos-toolrow");
  });

  it("injects the vendored stylesheet", () => {
    expect(index).toContain("vendor/tool-render/tool-render.css");
    expect(index).toContain("aidos/tool-render.css");
  });

  it("the vendored sheet actually defines the classes the rows use", () => {
    // Guards the arrangement end to end: importing a sheet that does not
    // style these rows would leave them unstyled and still pass the checks
    // above.
    for (const cls of [".tool-render-card", ".tool-render-row", ".tool-render-gutter"]) {
      expect(vendored, cls).toContain(cls);
    }
  });

  it("renders a read as numbered, highlighted lines", () => {
    // The user's remaining complaint: "it should do syntax highlighting".
    expect(rows).toContain("tool-render-code-row");
    expect(rows).toContain("tool-render-gutter");
    expect(rows).toContain("tool-render-line-cell hljs");
    expect(rows).toContain("highlightCode");
  });

  it("takes the line numbering from the VENDORED helpers", () => {
    // Not a reimplementation: numbering and envelope-stripping are subtle
    // and are exactly where a copy diverges.
    expect(rows).toContain("numberedReadRows");
    expect(rows).toContain("readStartLine");
    expect(rows).toContain("vendor/tool-render/text");
  });
});

describe("#82 syntax highlighting", () => {
  it("maps extensions to languages exactly as tool-render does", () => {
    expect(languageFor("a.ts")).toBe("typescript");
    expect(languageFor("a.tsx")).toBe("typescript");
    expect(languageFor("a.mjs")).toBe("javascript");
    expect(languageFor("a.json")).toBe("json");
    expect(languageFor("a.py")).toBe("python");
    expect(languageFor("a.sh")).toBe("bash");
    expect(languageFor("a.yml")).toBe("yaml");
  });

  it("returns null for an unknown or absent extension", () => {
    expect(languageFor("a.unknownext")).toBeNull();
    expect(languageFor("Makefile")).toBeNull();
    expect(languageFor("")).toBeNull();
  });

  it("is case-insensitive on the extension", () => {
    expect(languageFor("A.TS")).toBe("typescript");
  });

  it("actually highlights a known language", () => {
    const html = highlightCode("const x = 1;", "typescript");
    expect(html).toContain("hljs-");
    expect(html).not.toBe("const x = 1;");
  });

  it("ESCAPES rather than passing raw text through when it cannot highlight", () => {
    /*
     * The security boundary, not a convenience. The result is injected with
     * dangerouslySetInnerHTML, so returning raw input on failure would put
     * file contents into the DOM unescaped -- and a scratch file can contain
     * anything.
     */
    const nasty = '<img src=x onerror="alert(1)">';
    const out = highlightCode(nasty, null);
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });

  it("escapes when the language is unknown to highlight.js too", () => {
    const out = highlightCode("<b>hi</b>", "not-a-language");
    expect(out).toContain("&lt;b&gt;");
  });

  it("escapes every dangerous character", () => {
    expect(escapeHtml('<>&"')).toBe("&lt;&gt;&amp;&quot;");
  });

  it("sizes the gutter to the widest line number", () => {
    // Narrow files must not pay for a four-digit gutter, and a 1000-line
    // file must not have its numbers clipped.
    expect(gutterWidth([1, 2, 9])).toBe("3ch");
    expect(gutterWidth([1, 250])).toBe("5ch");
    expect(gutterWidth([null, null])).toBe("3ch");
  });
});

describe("#82 fixes from the rendered screenshots", () => {
  const rows = readFileSync(
    new URL("../src/client/scratch-rows.tsx", import.meta.url),
    "utf8",
  );

  it("the row is a DIV with role=button, not a <button> element", () => {
    /*
     * User-reported: "odd highlight shadow artifact". A real <button>
     * carries the browser's default chrome -- a grey rounded background --
     * which rendered as a PILL behind every row header, and fought the
     * vendored stylesheet's sizing so long error text overflowed the card.
     *
     * tool-render uses a div with role/tabIndex, and its CSS is written for
     * that element. Matching the element is part of matching the design.
     */
    expect(rows).toContain('className="tool-render-row"');
    expect(rows).toContain('role={expandable ? "button" : undefined}');
    expect(rows).not.toContain('<button\n        type="button"\n        className="tool-render-row"');
  });

  it("keeps the row keyboard-operable without the button element", () => {
    // Dropping <button> removes Enter/Space for free, so they are restored
    // explicitly. An expandable row nobody can open from the keyboard is a
    // regression, not a style fix.
    expect(rows).toContain("tabIndex={expandable ? 0 : undefined}");
    expect(rows).toContain('event.key === "Enter"');
  });

  it("names the SCRATCH family in every title", () => {
    // "Write" beside a builtin write is ambiguous: these operate on the
    // scratch root, not the workspace.
    for (const title of ["Scratch read", "Scratch write", "Scratch edit", "Scratch mkdir"]) {
      expect(rows, title).toContain(`title="${title}"`);
    }
  });
});

describe("#82 an error envelope never renders as raw JSON", () => {
  /*
   * User-reported from a screenshot: the row read
   *
   *   Error: {"ok":false,"error":"edit_delegation_failed",
   *            "code":"FS_AMBIGUOUS_EDIT","message":"old_string matched 5..."}
   *
   * The scratch tools throw a JSON envelope, so the whole error is ONE line
   * and the token scan returned the entire blob -- raw JSON as the card
   * body, which is exactly what #71 forbids.
   */
  it("unwraps code and message from a thrown envelope", () => {
    const text =
      'Error: {"ok":false,"error":"edit_delegation_failed","code":"FS_AMBIGUOUS_EDIT",' +
      '"message":"old_string matched 5 times"}';
    const line = firstLineOfError(text);
    expect(line).toBe("FS_AMBIGUOUS_EDIT — old_string matched 5 times");
    expect(line).not.toContain("{");
  });

  it("falls back to the error field when there is no code", () => {
    expect(unwrapErrorEnvelope('{"error":"path_escape","message":"must stay under root"}')).toBe(
      "path_escape — must stay under root",
    );
  });

  it("returns whichever half is present", () => {
    expect(unwrapErrorEnvelope('{"message":"just a message"}')).toBe("just a message");
    expect(unwrapErrorEnvelope('{"code":"E_ONLY"}')).toBe("E_ONLY");
  });

  it("leaves NON-envelope errors to the existing token scan", () => {
    // Plain text errors must keep their old behaviour: this unwrap is an
    // addition, not a replacement.
    expect(unwrapErrorEnvelope("cannot read /x: not found")).toBeNull();
    expect(firstLineOfError("Error: wrapper\nFS_NOT_OBSERVED: read it first")).toContain(
      "FS_NOT_OBSERVED",
    );
  });

  it("survives malformed JSON without crashing the row", () => {
    expect(unwrapErrorEnvelope("{not json")).toBeNull();
    expect(unwrapErrorEnvelope('{"a":1}')).toBeNull();
    expect(unwrapErrorEnvelope("[1,2]")).toBeNull();
  });
});
