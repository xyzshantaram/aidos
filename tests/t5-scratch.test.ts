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
import { declaredParameters, resolveScratchPath, scratchRootForAgent } from "../src/tools/scratch";
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

  it("scratch_edit delegates to the resolved edit tool", async () => {
    const harness = scratchHarness();
    await harness.runTool("scratch_write", { path: "doc.md", content: "before" });
    // No edit tool is registered in the plain harness, so delegation refuses.
    const out = await harness.runTool("scratch_edit", {
      path: "doc.md",
      old_string: "before",
      new_string: "after",
    });
    expect(out.isError).toBe(true);
    expect((out.error as { message: string }).message).toMatch(/edit/);
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
    const { harness, seen } = harnessWithEdit(LITERAL_GRAMMAR);
    await harness.runTool("scratch_write", { path: "r.txt", content: "a\n" });
    await harness.runTool("scratch_edit", {
      path: "r.txt",
      old_string: "a",
      new_string: "b",
      replace_all: true,
    });
    expect(seen[0].replace_all).toBe(true);

    const anchor = harnessWithEdit(ANCHOR_GRAMMAR);
    await anchor.harness.runTool("scratch_write", { path: "r.txt", content: "a\n" });
    await anchor.harness.runTool("scratch_edit", {
      path: "r.txt",
      edits: [["aaa", "bbb", "c"]],
    });
    expect(anchor.seen[0].replace_all).toBeUndefined();
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
