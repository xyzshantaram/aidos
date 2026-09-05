/**
 * Ticket T5: the scratch workspace tools.
 *
 * Covers: the scratch root resolves under dshHomePath("aidos", "scratch",
 * <workspaceKey>); relative paths land under the root and escape attempts are
 * refused; scratch_write/read round trip through the fake fs; scratch_mkdir
 * creates; the allowlist guard exempts the scratch root while a ticket is
 * in-progress; and a child scoped to src/ can still reach the scratch root.
 */

import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";

import { readFileSync } from "node:fs";

import { childPathScope, writeBoundaryReason } from "../src/tools/allowlist";
import {
  declaredParameters,
  detectLineEndings,
  normalizeLineEndings,
  resolveScratchPath,
  restoreLineEndings,
  scratchRootForAgent,
} from "../src/tools/scratch";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { Store } from "../src/kernel/store";
import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { FIXED_NOW } from "./helpers";
import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness } from "./b1-harness";

/** The workspace key for the harness default cwd (/srv/proj/cli). */
const WORKSPACE_KEY = "--srv-proj-cli--";

/** A harness with the aidos service and the full tool plugin applied. */
function scratchHarness() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

describe("scratchRootForAgent", () => {
  it("resolves under dshHomePath('aidos', 'scratch', <workspaceKey>)", () => {
    const harness = scratchHarness();
    const root = scratchRootForAgent(harness.asAgent());
    expect(root.endsWith(`/aidos/scratch/${WORKSPACE_KEY}`)).toBe(true);
  });

  it("refuses when the session has no cwd", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    (agent.session as { header?: { cwd?: string } }).header = {
      ...(agent.session as { header: object }).header,
    } as never;
    // The harness always sets a cwd; simulate absence by deleting it.
    Object.defineProperty((agent.session as { header: object }).header, "cwd", {
      value: undefined,
    });
    expect(() => scratchRootForAgent(agent)).toThrow(/no cwd/);
  });
});

describe("resolveScratchPath", () => {
  it("joins a relative path under the root", () => {
    expect(resolveScratchPath("/root", "foo.md")).toBe("/root/foo.md");
    expect(resolveScratchPath("/root", "a/b/c.md")).toBe("/root/a/b/c.md");
  });

  it("accepts an absolute path inside the root", () => {
    expect(resolveScratchPath("/root", "/root/notes.md")).toBe("/root/notes.md");
  });

  it("refuses an empty path", () => {
    expect(() => resolveScratchPath("/root", "")).toThrow(/empty/);
  });

  it("refuses `../` escaping the root", () => {
    expect(() => resolveScratchPath("/root", "../etc/passwd")).toThrow(/escape/);
    expect(() => resolveScratchPath("/root", "a/../../b")).toThrow(/escape/);
  });

  it("refuses an absolute path outside the root", () => {
    expect(() => resolveScratchPath("/root", "/etc/passwd")).toThrow(/escape/);
  });
});

describe("the scratch tools", () => {
  it("scratch_write then scratch_read round trip", async () => {
    const harness = scratchHarness();
    const write = await harness.runTool("scratch_write", {
      path: "notes.md",
      content: "hello scratch",
    });
    expect(write.isError).toBe(false);
    const written = write.value as { ok: boolean; path: string; scratch_root: string };
    expect(written.ok).toBe(true);
    expect(written.path).toMatch(/notes\.md$/);

    const read = await harness.runTool("scratch_read", { path: "notes.md" });
    expect(read.isError).toBe(false);
    const value = read.value as { ok: boolean; content: string };
    expect(value.content).toBe("hello scratch");
  });

  it("scratch_write returns create then update", async () => {
    const harness = scratchHarness();
    const first = await harness.runTool("scratch_write", { path: "f.txt", content: "one" });
    const second = await harness.runTool("scratch_write", { path: "f.txt", content: "two" });
    expect((first.value as { operation: string }).operation).toBe("create");
    expect((second.value as { operation: string }).operation).toBe("update");
  });

  it("scratch_mkdir creates a directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "aidos-t5-mkdir-"));
    const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
      .process?.env;
    const previous = env?.DSH_HOME;
    if (env) env.DSH_HOME = dir;
    try {
      const harness = scratchHarness();
      const out = await harness.runTool("scratch_mkdir", { path: "deep/nested" });
      expect(out.isError).toBe(false);
      expect((out.value as { ok: boolean }).ok).toBe(true);
      const root = scratchRootForAgent(harness.asAgent());
      expect(existsSync(join(root, "deep", "nested"))).toBe(true);
    } finally {
      if (env) {
        if (previous === undefined) delete env.DSH_HOME;
        else env.DSH_HOME = previous;
      }
    }
  });

  it("refuses a path escaping the root", async () => {
    const harness = scratchHarness();
    const out = await harness.runTool("scratch_read", { path: "../secret" });
    expect(out.isError).toBe(true);
    expect((out.error as { message: string }).message).toMatch(/escape|outside/);
  });

  it("scratch_edit still edits when NO edit tool is in scope", async () => {
    /*
     * This asserted the opposite -- that a missing backend refuses -- which
     * pinned the bug as if it were the contract.
     *
     * User-reported from a brand-new session in a new workspace:
     * "edit_tool_unavailable — the edit tool is not registered in this
     * scope". The tool mask exposes write/edit only while a ticket is
     * in_progress, so in the `open` state (every fresh workspace) there is
     * no backend and scratch_edit could edit nothing at all. That
     * contradicts the scratch contract: the agent writes freely here.
     *
     * scratch_write already had a raw-fs fallback; the edit half never did.
     */
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "doc.md", content: "before" });
    const out = await harness.runTool("scratch_edit", {
      path: "doc.md",
      old_string: "before",
      new_string: "after",
    });
    expect(out.isError, JSON.stringify(out.error)).toBe(false);
    const read = await harness.runTool("scratch_read", { path: "doc.md" });
    expect((read.value as { content: string }).content).toBe("after");
  });

  it("the no-backend fallback keeps the builtin's UNIQUENESS rule", async () => {
    /*
     * A fallback that quietly replaced the first of several matches would be
     * a DIFFERENT tool wearing the same name -- worse than no fallback,
     * because the difference only shows up in the damage.
     */
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "dup.md", content: "a\na\na\n" });
    const ambiguous = await harness.runTool("scratch_edit", {
      path: "dup.md",
      old_string: "a",
      new_string: "b",
    });
    expect(ambiguous.isError).toBe(true);
    expect((ambiguous.error as { message: string }).message).toContain("matched 3 times");
    // The file is untouched by a refused edit.
    const unchanged = await harness.runTool("scratch_read", { path: "dup.md" });
    expect((unchanged.value as { content: string }).content).toBe("a\na\na\n");

    const all = await harness.runTool("scratch_edit", {
      path: "dup.md",
      old_string: "a",
      new_string: "b",
      replace_all: true,
    });
    expect(all.isError, JSON.stringify(all.error)).toBe(false);
    const after = await harness.runTool("scratch_read", { path: "dup.md" });
    expect((after.value as { content: string }).content).toBe("b\nb\nb\n");
  });

  it("writes new_string LITERALLY, never as a replacement pattern", async () => {
    /*
     * SILENT FILE CORRUPTION, found in round 3. The fallback used
     * `before.replace(old, new)` for the single-match case, and
     * String.replace INTERPRETS `$&`, `$$`, `$\`` and `$'` in the
     * REPLACEMENT -- so the file was written with content the caller never
     * asked for. `$$` landed as `$`; `$'` spliced in the whole remainder of
     * the file.
     *
     * Not a corner: `$$` is ordinary in Makefiles and compose files, and
     * `$'`/`$\`` are bash syntax, so a scratch note ABOUT SHELL was the
     * likely victim.
     *
     * The reviewer proved the buggy line could be REPLACED WITH THE CORRECT
     * ONE and no test noticed -- it had zero discriminating coverage. These
     * are that coverage.
     */
    const cases: Array<[string, string, string]> = [
      ["$&", "hello world\n", "hello $&\n"],
      ["$$", "hello world\n", "hello $$\n"],
      ["$`", "hello world\n", "hello $`\n"],
      ["$'", "hello world\n", "hello $'\n"],
    ];
    for (const [replacement, content, expected] of cases) {
      const harness = scratchHarness();
      await harness.runTool("scratch_write", { path: "pat.txt", content });
      const out = await harness.runTool("scratch_edit", {
        path: "pat.txt",
        old_string: "world",
        new_string: replacement,
      });
      expect(out.isError, JSON.stringify(out.error)).toBe(false);
      const read = await harness.runTool("scratch_read", { path: "pat.txt" });
      expect((read.value as { content: string }).content, replacement).toBe(expected);
    }
  });

  it("writes the same bytes whether or not replace_all is set", async () => {
    /*
     * The self-inconsistency the bug produced: replace_all is documented as
     * controlling HOW MANY matches change, never WHAT is written. One match
     * must give one answer.
     */
    const single = scratchHarness();
    await single.runTool("scratch_write", { path: "s.txt", content: "a world b\n" });
    await single.runTool("scratch_edit", {
      path: "s.txt",
      old_string: "world",
      new_string: "[$&]",
    });
    const all = scratchHarness();
    await all.runTool("scratch_write", { path: "s.txt", content: "a world b\n" });
    await all.runTool("scratch_edit", {
      path: "s.txt",
      old_string: "world",
      new_string: "[$&]",
      replace_all: true,
    });
    const one = (await single.runTool("scratch_read", { path: "s.txt" })).value as { content: string };
    const many = (await all.runTool("scratch_read", { path: "s.txt" })).value as { content: string };
    expect(one.content).toBe("a [$&] b\n");
    expect(many.content).toBe(one.content);
  });

  it("refuses an empty old_string rather than mangling every character", async () => {
    // "abc".split("") counts matches between every character, so without the
    // guard replace_all would rewrite the whole file.
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "e.txt", content: "abc" });
    const out = await harness.runTool("scratch_edit", {
      path: "e.txt",
      old_string: "",
      new_string: "X",
      replace_all: true,
    });
    expect(out.isError).toBe(true);
    expect((out.error as { message: string }).message).toContain("non-empty");
    const read = await harness.runTool("scratch_read", { path: "e.txt" });
    expect((read.value as { content: string }).content).toBe("abc");
  });

  it("refuses a no-op edit, as the builtin does", async () => {
    // The builtin refuses when old and new are equal. Reporting
    // "replaced 1 occurrence(s)" for a guaranteed no-op is a false success.
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "noop.txt", content: "alpha\n" });
    const out = await harness.runTool("scratch_edit", {
      path: "noop.txt",
      old_string: "alpha",
      new_string: "alpha",
    });
    expect(out.isError).toBe(true);
    expect((out.error as { message: string }).message).toContain("must differ");
  });

  it("keeps CRLF endings consistent instead of mixing them", async () => {
    /*
     * The builtin normalises to LF for matching and restores the file's own
     * ending. Matching raw meant an old_string spanning lines never matched
     * in a CRLF file, and an inserted line arrived with a bare LF -- leaving
     * mixed endings in a file that had been consistent.
     */
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "crlf.txt", content: "alpha\r\nbeta\r\n" });
    const out = await harness.runTool("scratch_edit", {
      path: "crlf.txt",
      // Spans a line boundary: this did not match at all before.
      old_string: "alpha\nbeta",
      new_string: "alpha\nbeta2\ngamma",
    });
    expect(out.isError, JSON.stringify(out.error)).toBe(false);
    const read = await harness.runTool("scratch_read", { path: "crlf.txt" });
    const content = (read.value as { content: string }).content;
    expect(content).toBe("alpha\r\nbeta2\r\ngamma\r\n");
    /*
     * NOT `/[^\r]\n/`. That guard was here, and it CANNOT SEE the defect it
     * was written to catch: inside a doubled `\r\r\n` the `\n` is still
     * preceded by a `\r`, so it passed on genuinely corrupted output. A
     * review proved it by handing it the corrupt bytes.
     */
    expect(content).not.toContain("\r\r");
  });

  /*
   * The three line-ending helpers, driven DIRECTLY.
   *
   * A mutation run showed why this is needed: deleting the re-normalisation
   * inside `restoreLineEndings` killed no test, because the only caller hands
   * it text that is already LF-normalised. The deletion was an EQUIVALENT
   * MUTANT through that path -- the guarantee read as tested and was not.
   * These cases reach each helper's own contract, so the guarantee survives a
   * refactor of the caller.
   */
  it("restoreLineEndings does not double an ending that is already CRLF", () => {
    // The mutation the end-to-end tests could not see: without the internal
    // re-normalisation this returns "a\r\r\nb\r\r\n".
    expect(restoreLineEndings("a\r\nb\r\n", "CRLF")).toBe("a\r\nb\r\n");
    expect(restoreLineEndings("a\nb\n", "CRLF")).toBe("a\r\nb\r\n");
    // Mixed input still lands on one ending.
    expect(restoreLineEndings("a\r\nb\n", "CRLF")).toBe("a\r\nb\r\n");
    // LF is the identity, never a rewrite.
    expect(restoreLineEndings("a\r\nb\n", "LF")).toBe("a\r\nb\n");
  });

  it("detectLineEndings takes a majority vote, not any-CRLF", () => {
    expect(detectLineEndings("a\r\nb\nc\n")).toBe("LF"); // 1 of 3
    expect(detectLineEndings("a\r\nb\r\nc\n")).toBe("CRLF"); // 2 of 3
    expect(detectLineEndings("no endings at all")).toBe("LF");
    // Only the first 4096 bytes vote: a long LF head outweighs a CRLF tail.
    expect(detectLineEndings(`${"x\n".repeat(4096)}${"y\r\n".repeat(100)}`)).toBe("LF");
  });

  it("normalizeLineEndings collapses CRLF and leaves a lone CR alone", () => {
    expect(normalizeLineEndings("a\r\nb")).toBe("a\nb");
    // A bare CR is not a line ending this code claims to handle; a helper
    // that ate it would corrupt files holding literal CR bytes.
    expect(normalizeLineEndings("a\rb")).toBe("a\rb");
    expect(normalizeLineEndings("a\r\r\nb")).toBe("a\r\nb");
  });

  /*
   * The three cases below come from a review that measured this fallback
   * against the BUILTIN and found it diverging in three separate ways, each
   * writing bytes the caller never asked for. The first CRLF attempt
   * reproduced the builtin's SHAPE and got every detail wrong, so these
   * assert against the builtin's actual behaviour rather than the intent.
   */

  it("a new_string containing CRLF is not doubled to CR CR LF", async () => {
    // The builtin re-normalises before restoring, and its own source comment
    // says that is exactly what the re-normalisation is for. Restoring with a
    // bare `.replace(/\n/g, "\r\n")` doubles anything already CRLF.
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "d.txt", content: "alpha\r\nbeta\r\n" });
    const out = await harness.runTool("scratch_edit", {
      path: "d.txt",
      old_string: "beta",
      // The caller passes CRLF back, as it would after reading the file.
      new_string: "b1\r\nb2",
    });
    expect(out.isError, JSON.stringify(out.error)).toBe(false);
    const read = await harness.runTool("scratch_read", { path: "d.txt" });
    const content = (read.value as { content: string }).content;
    expect(content).not.toContain("\r\r");
    expect(content).toBe("alpha\r\nb1\r\nb2\r\n");
  });

  it("an old_string containing CRLF still matches", async () => {
    // The bug the CRLF work claimed to fix, left in place for the caller most
    // likely to hit it: one passing back bytes it had just read.
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "m.txt", content: "alpha\r\nbeta\r\n" });
    const out = await harness.runTool("scratch_edit", {
      path: "m.txt",
      old_string: "alpha\r\nbeta",
      new_string: "one\r\ntwo",
    });
    expect(out.isError, JSON.stringify(out.error)).toBe(false);
    const read = await harness.runTool("scratch_read", { path: "m.txt" });
    expect((read.value as { content: string }).content).toBe("one\r\ntwo\r\n");
  });

  it("a MIXED file settles on the MAJORITY ending, not on any-CRLF", async () => {
    /*
     * Detection by `raw.includes("\r\n")` made ONE CRLF line rewrite every
     * other line in a mostly-LF file: this input became
     * "crlf\r\nlf\r\nMORE\r\n". The builtin takes a majority vote over the
     * first 4096 bytes instead, and this file is majority LF.
     *
     * NOTE what the correct answer is, because I first asserted the wrong
     * one here and the code was right: the builtin normalises the WHOLE file
     * to its majority style, so the lone CRLF is converted too. It does not
     * preserve the odd line. A mixed file is made consistent either way --
     * the fix is about WHICH way, and picking the majority changes one line
     * rather than all the others.
     */
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "mixed.txt", content: "crlf\r\nlf\nmore\n" });
    const out = await harness.runTool("scratch_edit", {
      path: "mixed.txt",
      old_string: "more",
      new_string: "MORE",
    });
    expect(out.isError, JSON.stringify(out.error)).toBe(false);
    const read = await harness.runTool("scratch_read", { path: "mixed.txt" });
    const content = (read.value as { content: string }).content;
    expect(content).toBe("crlf\nlf\nMORE\n");
    // The specific regression: any-CRLF detection produced all-CRLF here.
    expect(content).not.toContain("\r");
  });

  it("the no-backend fallback refuses a no-match instead of writing nothing", async () => {
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "nm.md", content: "alpha\n" });
    const out = await harness.runTool("scratch_edit", {
      path: "nm.md",
      old_string: "not present",
      new_string: "x",
    });
    expect(out.isError).toBe(true);
    expect((out.error as { message: string }).message).toContain("did not match");
  });

  it("the no-backend fallback refuses ANCHORS rather than guessing at them", async () => {
    // The hashline algorithm lives in the backend; guessing would corrupt
    // the file.
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "an.md", content: "alpha\n" });
    const out = await harness.runTool("scratch_edit", {
      path: "an.md",
      edits: [["aaa", "bbb", "c"]],
    });
    expect(out.isError).toBe(true);
    expect((out.error as { message: string }).message).toContain("cannot be applied without one");
  });
});

describe("the allowlist exemption", () => {
  function inProgressHarness() {
    const harness = createHarness();
    const store = new Store(DEFAULT_CONFIG, { now: () => FIXED_NOW });
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "Scoped", "d", { actor: "agent" });
    store.attachEvidence(ticket, "builtin:user_signoff", {}, "user");
    store.moveTicket(ticket, "in_progress", "user");
    harness.seedFromStore(store);
    harness.installService();
    return harness;
  }

  it("a scratch-root write passes while the in-progress allowlist is empty", () => {
    const harness = inProgressHarness();
    const root = scratchRootForAgent(harness.asAgent());
    const reason = writeBoundaryReason(asContext(harness.ctx), harness.asAgent(), `${root}/notes.md`);
    expect(reason).toBeUndefined();
  });

  it("a project write still refuses outside the union", () => {
    const harness = inProgressHarness();
    const reason = writeBoundaryReason(asContext(harness.ctx), harness.asAgent(), "docs/b.md");
    expect(reason).toMatch(/allowlist/);
  });

  it("childPathScope always includes the scratch root", () => {
    const harness = inProgressHarness();
    const guard = childPathScope(["src/"]);
    const root = scratchRootForAgent(harness.asAgent());
    const execution = {
      name: "read",
      arguments: { file_path: `${root}/shared.md` },
      agent: harness.asAgent(),
      signal: undefined,
    };
    const refusal = guard(execution as never);
    expect(refusal).toBeUndefined();
  });
});

describe("#82 parity with the default dsh edit/write tools", () => {
  /*
   * dsh-better-edit was dropped, so the scratch tools' target is now the
   * DEFAULT edit/str-replace tool. The audit ran the two families in
   * sequence and found the pair behaved differently, which is the worst
   * outcome available: tools that look alike and act differently are more
   * confusing than tools that look different.
   */

  /*
   * These tests CALL the tools. The previous set read scratch.ts and asserted
   * substrings of it, which is why a total failure stayed invisible: the
   * grammar detection read the wrong level of the parameter object, decided
   * every grammar was unsupported, and refused EVERY edit -- with the suite
   * green, because the strings it asserted were all still present.
   *
   * A source-text assertion proves a line exists. Only a call proves it
   * works.
   */

  /**
   * A harness carrying a real `defineTool`-registered edit backend with a
   * chosen grammar, and a record of the arguments it was actually handed.
   *
   * defineTool is used deliberately rather than a hand-built object: the
   * COMPILATION it performs -- parameters becoming `{type, properties,
   * required}` -- is precisely what the detection misread, so a fake that
   * skips it would reproduce the bug's blind spot.
   */
  function harnessWithEdit(parameters: Record<string, never>) {
    const harness = scratchHarness();
    const seen: Record<string, unknown>[] = [];
    harness.ctx.tools.register(
      defineTool({
        name: "edit",
        description: "a test edit backend",
        parameters,
        output: { schema: { type: "object", additionalProperties: true }, render: () => [] },
        execute: async (args: Record<string, unknown>) => {
          seen.push(args);
          return { ok: true, message: "edited" };
        },
      }) as never,
    );
    return { harness, seen };
  }

  /** The builtin str-replace grammar. */
  const LITERAL_GRAMMAR = {
    file_path: { type: "string", required: true },
    old_string: { type: "string", required: true },
    new_string: { type: "string", required: true },
    replace_all: { type: "boolean" },
  } as unknown as Record<string, never>;

  /** dsh-better-edit's anchor grammar, on the other path key. */
  const ANCHOR_GRAMMAR = {
    path: { type: "string", required: true },
    edits: { type: "array", items: { type: "array" } },
  } as unknown as Record<string, never>;

  it("reads the parameter names a REAL defineTool registration declares", () => {
    /*
     * The blocker, at its root. defineTool compiles the spec, so a registered
     * tool's `parameters` is `{type, properties, required}` and the argument
     * names live under `properties`. Reading the top level returned exactly
     * those three words -- matching no argument name at all.
     */
    const { harness } = harnessWithEdit(LITERAL_GRAMMAR);
    const definition = harness.ctx.tools.get("edit");
    expect(Object.keys(declaredParameters(definition))).toEqual(
      expect.arrayContaining(["file_path", "old_string", "new_string", "replace_all"]),
    );
    // The exact wrong answer, named so a regression is unmistakable.
    expect(Object.keys(declaredParameters(definition))).not.toEqual([
      "type",
      "properties",
      "required",
    ]);
  });

  it("performs a literal edit against the default grammar", async () => {
    // The end-to-end property: an edit SUCCEEDS. This refused every call.
    const { harness, seen } = harnessWithEdit(LITERAL_GRAMMAR);
    await harness.runTool("scratch_write", { path: "e.txt", content: "alpha\nbeta\n" });
    const outcome = await harness.runTool("scratch_edit", {
      path: "e.txt",
      old_string: "beta",
      new_string: "BETA",
    });
    expect(outcome.isError, JSON.stringify(outcome.error)).toBe(false);
    expect(seen.length).toBe(1);
    expect(seen[0].old_string).toBe("beta");
    expect(seen[0].new_string).toBe("BETA");
    // The path key is CHOSEN from the backend's declaration, not hardcoded.
    expect(typeof seen[0].file_path).toBe("string");
    expect(seen[0].path).toBeUndefined();
  });

  it("performs an anchor edit against a better-edit-shaped grammar", async () => {
    /*
     * Criterion 5 in practice, not in shape: remounting dsh-better-edit must
     * be a config change. This is that claim executed -- same scratch code,
     * a backend declaring the OTHER grammar and the other path key.
     */
    const { harness, seen } = harnessWithEdit(ANCHOR_GRAMMAR);
    await harness.runTool("scratch_write", { path: "a.txt", content: "alpha\n" });
    const outcome = await harness.runTool("scratch_edit", {
      path: "a.txt",
      edits: [["aaa", "bbb", "replacement"]],
    });
    expect(outcome.isError, JSON.stringify(outcome.error)).toBe(false);
    expect(seen.length).toBe(1);
    expect(seen[0].edits).toEqual([["aaa", "bbb", "replacement"]]);
    expect(typeof seen[0].path).toBe("string");
    expect(seen[0].file_path).toBeUndefined();
  });

  it("refuses a grammar the resolved backend does not declare, without calling it", async () => {
    // A clear refusal beats forwarding arguments the backend cannot parse.
    const { harness, seen } = harnessWithEdit(LITERAL_GRAMMAR);
    await harness.runTool("scratch_write", { path: "x.txt", content: "alpha\n" });
    const outcome = await harness.runTool("scratch_edit", {
      path: "x.txt",
      edits: [["aaa", "bbb", "c"]],
    });
    expect(outcome.isError).toBe(true);
    expect(outcome.error?.message).toContain("anchor grammar");
    expect(seen.length, "the backend must not be called with a shape it cannot parse").toBe(0);
  });

  it("only forwards replace_all when the backend declares it", async () => {
    /*
     * The negative half used to call the ANCHOR backend, which never passes
     * replace_all and whose branch structurally cannot forward it -- so that
     * assertion could not fail whatever the gate did. Deleting the very gate
     * this test is named after left the suite green.
     *
     * The discriminating case is a backend with the literal grammar and NO
     * replace_all, called WITH replace_all: true. That is the only shape
     * where the gate is the thing deciding.
     */
    const { harness, seen } = harnessWithEdit(LITERAL_GRAMMAR);
    await harness.runTool("scratch_write", { path: "r.txt", content: "a\n" });
    await harness.runTool("scratch_edit", {
      path: "r.txt",
      old_string: "a",
      new_string: "b",
      replace_all: true,
    });
    expect(seen[0].replace_all).toBe(true);

    const without = harnessWithEdit({
      file_path: { type: "string", required: true },
      old_string: { type: "string", required: true },
      new_string: { type: "string", required: true },
    } as unknown as Record<string, never>);
    await without.harness.runTool("scratch_write", { path: "r.txt", content: "a\n" });
    await without.harness.runTool("scratch_edit", {
      path: "r.txt",
      old_string: "a",
      new_string: "b",
      replace_all: true,
    });
    expect(without.seen.length, "the edit must still be performed").toBe(1);
    expect(
      without.seen[0].replace_all,
      "a backend that does not declare replace_all must not receive it",
    ).toBeUndefined();
  });

  it("refuses the LITERAL grammar when the backend declares only anchors", async () => {
    /*
     * The mirror of the anchor refusal, and it had ZERO coverage: deleting
     * the whole literal-grammar guard changed nothing. Its mirror image was
     * covered, which is exactly the asymmetry that hides a branch.
     */
    const { harness, seen } = harnessWithEdit(ANCHOR_GRAMMAR);
    await harness.runTool("scratch_write", { path: "l.txt", content: "a\n" });
    const outcome = await harness.runTool("scratch_edit", {
      path: "l.txt",
      old_string: "a",
      new_string: "b",
    });
    expect(outcome.isError).toBe(true);
    expect(outcome.error?.message).toContain("literal grammar");
    expect(seen.length, "the backend must not be called with a shape it cannot parse").toBe(0);
  });

  it("refuses a literal edit with no old_string, rather than forwarding undefined", async () => {
    /*
     * scratch_edit declares old_string/new_string as OPTIONAL, because the
     * anchor grammar does not use them -- so a caller can reach the literal
     * branch with neither. It forwarded them unconditionally, and the real
     * backend does `args.old_string.length`, which is a TypeError rather
     * than a refusal. A confusing downstream crash is exactly what the
     * grammar guard exists to prevent.
     */
    const { harness, seen } = harnessWithEdit(LITERAL_GRAMMAR);
    await harness.runTool("scratch_write", { path: "n.txt", content: "a\n" });
    const outcome = await harness.runTool("scratch_edit", { path: "n.txt" });
    expect(outcome.isError).toBe(true);
    /*
     * Asserting the CODE, not the substring "old_string". The backend's own
     * schema validation rejects this call too, and its message also names
     * the field -- so a substring assertion stayed green with the guard
     * deleted and proved nothing about the guard. Only this code is ours.
     */
    expect(outcome.error?.message).toContain("edit_arguments_incomplete");
    expect(seen.length).toBe(0);
  });

  it("scratch_write OBSERVES an existing file before overwriting it", async () => {
    /*
     * The other blocker. The observation fix worked for a CREATE and failed
     * for an overwrite: the raw fs.readText probe records no observation, so
     * the write's intent stayed `createIfAbsent`, which the fs layer refuses
     * on a file that already exists.
     *
     * Reachable in the ordinary case, not a corner -- the scratch root
     * PERSISTS, so any file from an earlier session takes this path. The
     * manual test missed it because it tested a create.
     */
    const harness = scratchHarness();
    const calls: string[] = [];
    for (const name of ["read", "write"]) {
      harness.ctx.tools.register(
        defineTool({
          name,
          description: "a test fs backend",
          parameters: { file_path: { type: "string", required: true } } as never,
          output: { schema: { type: "object", additionalProperties: true }, render: () => [] },
          execute: async () => {
            calls.push(name);
            return { ok: true, operation: "update" };
          },
        }) as never,
      );
    }
    await harness.runTool("scratch_write", { path: "obs.txt", content: "one" });
    expect(calls, "the read must come FIRST: it is what records the observation").toEqual([
      "read",
      "write",
    ]);
  });

  it("takes create-vs-update from the write's own result, not from a probe", async () => {
    /*
     * The write backend reports its own operation, which is authoritative
     * and free. The old probe read the WHOLE FILE to compute a label, and
     * its bare catch reported "create" for an existing file that merely
     * failed to read.
     */
    const harness = scratchHarness();
    harness.ctx.tools.register(
      defineTool({
        name: "write",
        description: "a test write backend",
        parameters: { file_path: { type: "string", required: true } } as never,
        output: { schema: { type: "object", additionalProperties: true }, render: () => [] },
        execute: async () => ({ ok: true, operation: "update" }),
      }) as never,
    );
    const outcome = await harness.runTool("scratch_write", { path: "new.txt", content: "one" });
    // No read tool is registered, so the probe would have said "create".
    expect((outcome.value as { operation?: string }).operation).toBe("update");
  });

  it("reports observation IN BAND, because the agent never sees a log line", async () => {
    /*
     * The fallback warning goes to ctx.logger, which the MODEL never reads,
     * while the result said `{ok: true}` with no hint the file was
     * unobserved -- so the agent about to hit FS_NOT_OBSERVED had no way to
     * know. The flag says which path the write took.
     */
    const fallback = scratchHarness();
    const raw = await fallback.runTool("scratch_write", { path: "u.txt", content: "one" });
    expect((raw.value as { observed?: boolean }).observed).toBe(false);

    const delegating = scratchHarness();
    delegating.ctx.tools.register(
      defineTool({
        name: "write",
        description: "a test write backend",
        parameters: { file_path: { type: "string", required: true } } as never,
        output: { schema: { type: "object", additionalProperties: true }, render: () => [] },
        execute: async () => ({ ok: true, operation: "create" }),
      }) as never,
    );
    const viaTool = await delegating.runTool("scratch_write", { path: "o.txt", content: "one" });
    expect((viaTool.value as { observed?: boolean }).observed).toBe(true);
  });

  it("keeps a raw-fs fallback, and SAYS it is unobserved", async () => {
    /*
     * The fallback is reachable in the DEFAULT state: the mask exposes
     * write/edit only while a ticket is in progress, and the scratch tools
     * sit outside that universe. A silent degrade there reintroduces the very
     * bug this ticket fixed, in the state the scratch workspace exists for.
     */
    const harness = scratchHarness();
    const warnings: string[] = [];
    (harness.ctx as { logger?: { warn?: (m: string) => void } }).logger = {
      ...(harness.ctx as { logger?: object }).logger,
      warn: (message: string) => warnings.push(message),
    } as never;
    const outcome = await harness.runTool("scratch_write", { path: "raw.txt", content: "one" });
    expect(outcome.isError).toBe(false);
    expect(warnings.join("\n")).toContain("NOT be registered as observed");
  });
});
