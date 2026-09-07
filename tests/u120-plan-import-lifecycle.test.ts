/**
 * #120: plan_import owns the plan file's lifecycle.
 *
 * A successful import DELETES the plan file — the imported plan is
 * disposable, and its fate must not be a manual decision (the d86f69b
 * "drop PLAN-AIDOS" commit, and the earlier rm-without-asking incident,
 * were both this gap).
 *
 * The git gate: inside a repo, import refuses while the working tree is
 * dirty (paths named) or the plan file itself is uncommitted (untracked
 * or modified) — deletion must never destroy uncommitted work or ride
 * alongside unrelated changes. Outside a repo it imports and deletes
 * without the checks. A refusal imports nothing and deletes nothing. A
 * deletion failure after a successful import is reported without rolling
 * back tickets.
 *
 * The repos here are REAL: mkdtempSync + git init + git commit through
 * execFileSync, because the gate under test is itself git plumbing.
 */

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createHarness, asContext } from "./b1-harness";
import { apply as applyTools } from "../src/tools/aidos-tools";
import {
  PlanImportDirtyTreeError,
  PlanImportFileUncommittedError,
} from "../src/host/aidos-core";

/** One ticket is enough to exercise the lifecycle. */
const ONE_TICKET_PLAN = `- [x] **Ticket 1: The claim.** A body.

  **Evaluate:**

  - A test passes.
`;

/** Run git in `cwd`, init-style: any failure is a broken fixture. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

/** Configure a committer so commit works in a bare environment. */
function configIdentity(cwd: string): void {
  git(cwd, "config", "user.email", "test@aidos");
  git(cwd, "config", "user.name", "aidos test");
}

/** A fresh empty git repo with an identity. */
function newRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "aidos-u120-repo-"));
  git(dir, "init");
  configIdentity(dir);
  return dir;
}

/** A fresh directory that is NOT inside any git repo. */
function newPlainDir(): string {
  return mkdtempSync(join(tmpdir(), "aidos-u120-plain-"));
}

/** Write the plan into `dir` and commit it (tracked + clean). */
function committedPlan(dir: string, contents = ONE_TICKET_PLAN): string {
  const file = join(dir, "PLAN.md");
  writeFileSync(file, contents);
  git(dir, "add", "PLAN.md");
  git(dir, "commit", "-m", "plan");
  return file;
}

/** Write the plan into `dir` without committing it (untracked). */
function untrackedPlan(dir: string, contents = ONE_TICKET_PLAN): string {
  const file = join(dir, "PLAN.md");
  writeFileSync(file, contents);
  return file;
}

/** An import through the harness with a nonexistent default cwd. */
async function importPlan(file: string): Promise<{ tickets: number[]; deleted: boolean; deletionError: string | null }> {
  const harness = createHarness();
  harness.installService();
  const agent = harness.asAgent();
  return harness.service.planImport(agent, { file });
}

describe("plan import lifecycle (#120)", () => {
  it("a successful import in a clean repo removes the plan file and says so", async () => {
    const repo = newRepo();
    const file = committedPlan(repo);

    const result = await importPlan(file);

    expect(result.tickets).toEqual([1]);
    expect(result.deleted).toBe(true);
    expect(result.deletionError).toBeNull();
    expect(existsSync(file)).toBe(false);
  });

  it("a successful import outside a git repo deletes the file without the git checks", async () => {
    const dir = newPlainDir();
    const file = untrackedPlan(dir);

    const result = await importPlan(file);

    expect(result.tickets).toEqual([1]);
    expect(result.deleted).toBe(true);
    expect(existsSync(file)).toBe(false);
  });

  it("a dirty working tree refuses, naming the offending path, and imports nothing", async () => {
    const repo = newRepo();
    const file = committedPlan(repo);
    writeFileSync(join(repo, "other.txt"), "uncommitted work");

    const error = await importPlan(file).then(
      () => undefined,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PlanImportDirtyTreeError);
    const refusal = error as PlanImportDirtyTreeError;
    expect(refusal.paths).toEqual(["other.txt"]);
    expect(refusal.message).toContain("other.txt");
    // A refusal imports nothing and deletes nothing.
    expect(existsSync(file)).toBe(true);
    const harness = createHarness();
    harness.installService();
    expect(harness.service.getTickets(harness.asAgent()).length).toBe(0);
  });

  it("an untracked plan file refuses as uncommitted, not as tree dirt", async () => {
    const repo = newRepo();
    // Something ELSE is committed first so the repo exists with history.
    writeFileSync(join(repo, "seed.txt"), "seed");
    git(repo, "add", "seed.txt");
    git(repo, "commit", "-m", "seed");
    const file = untrackedPlan(repo);

    const error = await importPlan(file).then(
      () => undefined,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PlanImportFileUncommittedError);
    const refusal = error as PlanImportFileUncommittedError;
    expect(refusal.status).toBe("untracked");
    expect(refusal.file).toContain("PLAN.md");
    expect(refusal.message).toContain("untracked");
    expect(existsSync(file)).toBe(true);
  });

  it("a modified (tracked but changed) plan file refuses as modified", async () => {
    const repo = newRepo();
    const file = committedPlan(repo);
    // Change the BODY text, in structure, so the document still parses:
    // the gate must fire before any parsing concern, on git state alone.
    writeFileSync(file, ONE_TICKET_PLAN.replace("A body.", "A changed body."));

    const error = await importPlan(file).then(
      () => undefined,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(PlanImportFileUncommittedError);
    const refusal = error as PlanImportFileUncommittedError;
    expect(refusal.status).toBe("modified");
    expect(refusal.message).toContain("uncommitted changes");
    expect(existsSync(file)).toBe(true);
  });

  it("a deletion failure after a successful import is reported and tickets stand", async () => {
    const dir = newPlainDir();
    const file = untrackedPlan(dir);
    // The import needs to read the file, so make it read-only AFTER a
    // mirrored copy exists in a writable staging dir: instead, make the
    // containing DIRECTORY read-only after the import has started reading
    // is racy -- so use the deterministic route: the file's directory is
    // made non-writable before the call, and the read (unaffected by the
    // directory mode) still succeeds while unlink fails with EACCES.
    chmodSync(dir, 0o555);

    let result: { tickets: number[]; deleted: boolean; deletionError: string | null };
    try {
      result = await importPlan(file);
    } finally {
      chmodSync(dir, 0o755);
    }

    expect(result.tickets).toEqual([1]);
    expect(result.deleted).toBe(false);
    expect(result.deletionError).not.toBeNull();
    expect(existsSync(file)).toBe(true);
    // The tickets stand: re-import into a fresh harness still sees a
    // seeded project is impossible, but the RESULT already carries the
    // landed ids -- and a deletion failure must not roll them back.
    expect(result.tickets.length).toBe(1);
  });

  it("the plan file's repo governs, not the session workspace", async () => {
    // A repo workspace (cwd) that is DIRTY, with the plan file committed
    // in a DIFFERENT clean repo: the import must succeed, because the
    // gate follows the file.
    const workspaceRepo = newRepo();
    writeFileSync(join(workspaceRepo, "dirt.txt"), "workspace dirt, irrelevant");

    const fileRepo = newRepo();
    const file = committedPlan(fileRepo);

    const harness = createHarness(undefined, { cwd: workspaceRepo });
    harness.installService();
    const agent = harness.asAgent();
    const result = await harness.service.planImport(agent, { file });

    expect(result.tickets).toEqual([1]);
    expect(result.deleted).toBe(true);
    expect(existsSync(file)).toBe(false);
  });

  it("the tool layer renders the refusals as structured codes", async () => {
    const repo = newRepo();
    const file = committedPlan(repo);
    writeFileSync(join(repo, "dirty.txt"), "x");

    const harness = createHarness();
    harness.installService();
    applyTools(asContext(harness.ctx), {});
    const outcome = await harness.runTool("plan_import", { file });

    expect(outcome.isError).toBe(true);
    expect(outcome.error?.info?.code).toBe("plan_import_dirty_tree");
    const parsed = JSON.parse(outcome.error?.message ?? "{}") as Record<string, unknown>;
    expect(parsed.error).toBe("plan_import_dirty_tree");
    expect(parsed.paths).toEqual(["dirty.txt"]);
  });

  it("a successful tool call reports the deletion in its result", async () => {
    const dir = newPlainDir();
    const file = untrackedPlan(dir);

    const harness = createHarness();
    harness.installService();
    applyTools(asContext(harness.ctx), {});
    const outcome = await harness.runTool("plan_import", { file });

    expect(outcome.isError).toBe(false);
    const parsed = JSON.parse(
      (outcome.content[0] as { type: "text"; text: string }).text,
    ) as Record<string, unknown>;
    expect(parsed.deleted).toBe(true);
    expect(parsed.deletionError).toBeNull();
    expect(existsSync(file)).toBe(false);
  });

  it("a parse error still imports and deletes nothing, in a repo and out", async () => {
    // The line the parser rejects: neither a ticket nor a continuation
    // (the same shape test-25 pins as plan_parse_error).
    const bad = [
      "## Notes",
      "",
      "- [ ] **Ticket 1: Read it.** A body.",
      "",
      "  **Evaluate:**",
      "",
      "  - The work is done.",
      "",
      "This line is neither a ticket nor a continuation.",
      "",
    ].join("\n");
    for (const dir of [newRepo(), newPlainDir()]) {
      const file = untrackedPlan(dir, bad);

      const error = await importPlan(file).then(
        () => undefined,
        (caught: unknown) => caught,
      );
      expect(error).toBeDefined();
      expect(String((error as Error).message)).toContain("neither");
      expect(existsSync(file)).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
