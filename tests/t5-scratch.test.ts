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

import { childPathScope, writeBoundaryReason } from "../src/tools/allowlist";
import { resolveScratchPath, scratchRootForAgent } from "../src/tools/scratch";
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
