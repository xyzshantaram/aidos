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
  unwrapScratchResult,
} from "../src/client/tool-block";

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
