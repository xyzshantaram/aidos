/**
 * #148 round 3: the bundle-freshness rule is enforced BEFORE the bad commit
 * exists, not after.
 *
 * **Why there is a round 3 at all.** Round 2 shipped the digest, the
 * manifest and `tests/u148-bundle-freshness`, and an independent review
 * passed every criterion. The user failed it anyway, and the finding is the
 * reason this file exists: *"the ticket must fix the METHODOLOGY it exposed,
 * not only detect the symptom afterwards. A test that fails after the bad
 * commit exists is the wrong end of the problem."*
 *
 * That is not a preference. The original incident was twelve commits of
 * drift, and each of those commits was green at the moment it was made —
 * nobody ran the suite between the edit and the commit, which is exactly
 * when a suite-based control is blind. Moving the refusal onto `git commit`
 * closes that window: the commit never comes into existence, so there is
 * nothing to discover later, no push to chase and no consumer installing
 * from it.
 *
 * **What this file tests, and what it deliberately does not.** It drives
 * the SHIPPED hook logic — `node build.mjs --precommit`, the same command
 * the installed hook execs — against a scratch `GIT_INDEX_FILE`. Nothing
 * here re-implements the check; that would repeat round 2's mistake, where
 * two tests "proving the check could fire" survived replacing the real
 * digest function with a constant because neither ever executed it.
 *
 * **Why a scratch index rather than a scratch repository.** The check reads
 * the index of the repository it is in, and the fidelity that matters is
 * that it reads the INDEX and not the working tree. `GIT_INDEX_FILE` gives
 * exactly that with the real repo, real blobs and the real command line;
 * a synthesised repository would test a miniature of the situation instead
 * of the situation. Nothing here touches the real index, the working tree,
 * or the installed hook: the index is a copy, mutations are written with
 * `update-index` into that copy, and the hook-installation tests point
 * `core.hooksPath` at a temp directory through git's environment config.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const ROOT = new URL("../", import.meta.url).pathname;

/** Everything `git add -A` must cover for the index to mirror the worktree. */
const WATCHED_ROOTS = [
  "src",
  "build.mjs",
  "tsconfig.json",
  "tsconfig.client.json",
  "package.json",
  "pnpm-lock.yaml",
  "lib",
  "dist",
  "presets",
];

const MANIFEST = "lib/build-manifest.json";
const ARTIFACTS = [
  "presets/aidos/aidos-tools.js",
  "dist/host/aidos-plugin.js",
  "lib/client.js",
];

const scratchFiles: string[] = [];
const scratchDirs: string[] = [];

afterAll(() => {
  for (const file of scratchFiles) rmSync(file, { force: true });
  for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
});

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function git(args: string[], env: NodeJS.ProcessEnv = {}, input?: string): string {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    input,
    env: { ...process.env, ...env },
    maxBuffer: 256 * 1024 * 1024,
  });
}

/**
 * A private index that starts out mirroring the current WORKING TREE.
 *
 * Mirroring the worktree rather than HEAD is what makes the positive case
 * meaningful. If it copied HEAD, a clean checkout would stage nothing, the
 * hook's fast path would return 0 without hashing anything, and a test
 * asserting 0 would prove only that the fast path exists.
 */
function scratchIndex(): string {
  const relative = git(["rev-parse", "--git-path", "index"]).trim();
  const real = isAbsolute(relative) ? relative : join(ROOT, relative);
  const copy = join(tmpdir(), `aidos-u148-${process.pid}-${scratchFiles.length}.index`);
  copyFileSync(real, copy);
  scratchFiles.push(copy);
  git(["add", "-A", "--", ...WATCHED_ROOTS], { GIT_INDEX_FILE: copy });
  return copy;
}

/**
 * A private index holding exactly HEAD.
 *
 * Used where a test needs to know precisely which paths are staged — with
 * HEAD as the baseline, anything `git diff --cached` reports was put there
 * by the test itself.
 */
function headIndex(): string {
  const copy = join(tmpdir(), `aidos-u148-head-${process.pid}-${scratchFiles.length}.index`);
  scratchFiles.push(copy);
  git(["read-tree", "HEAD"], { GIT_INDEX_FILE: copy });
  return copy;
}

/** Stage `text` at `path` in `index`, without touching the working tree. */
function stageBlob(index: string, path: string, text: string): void {
  const blob = git(["hash-object", "-w", "--stdin"], {}, text).trim();
  git(["update-index", "--add", "--cacheinfo", `100644,${blob},${path}`], {
    GIT_INDEX_FILE: index,
  });
}

function readStaged(index: string, path: string): string {
  return git(["show", `:${path}`], { GIT_INDEX_FILE: index });
}

/** Run the shipped hook command against one index. */
function hook(index: string, env: NodeJS.ProcessEnv = {}, args: string[] = ["--precommit"]) {
  const started = Date.now();
  const result = spawnSync("node", ["build.mjs", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, GIT_INDEX_FILE: index, ...env },
    maxBuffer: 256 * 1024 * 1024,
  });
  return { ...result, ms: Date.now() - started };
}

/** The first source file in the index — the thing we mutate to force drift. */
function someSource(index: string): string {
  const listed = git(["ls-files", "--cached", "--full-name", "--", "src"], {
    GIT_INDEX_FILE: index,
  })
    .split("\n")
    .filter((line) => line.length > 0)
    .sort();
  const first = listed[0];
  expect(first, "the index must contain sources to test against").toBeTruthy();
  return first as string;
}

describe("#148 the pre-commit hook refuses a stale-bundle commit", () => {
  it("PASSES a commit whose staged sources agree with its staged manifest", () => {
    /*
     * The criterion "the check is not fooled by non-semantic churn: a
     * rebuild with no source change must not fail it", stated as the case
     * it actually protects — every watched file staged, and a manifest that
     * matches them.
     */
    const index = scratchIndex();
    const result = hook(index);
    expect(result.stderr + result.stdout).not.toMatch(/refusing this commit/);
    expect(result.status, `hook refused a consistent tree:\n${result.stderr}`).toBe(0);
  });

  it("REFUSES when a source is staged without its rebuild, and names the fix", () => {
    /*
     * THE headline case, and the one round 2 could only catch after the
     * fact: a source edit staged for commit while the manifest and the
     * bundles still describe the old sources.
     */
    const index = scratchIndex();
    const target = someSource(index);
    stageBlob(index, target, `${readStaged(index, target)}\n// #148 drift probe\n`);

    const result = hook(index);
    expect(result.status).toBe(1);
    const said = result.stderr + result.stdout;
    expect(said).toMatch(/refusing this commit/);
    // The refusal must carry the remedy. A control that says "no" without
    // saying "run this" is one people learn to bypass rather than obey.
    expect(said).toMatch(/node build\.mjs/);
    expect(said).toMatch(/AIDOS_SKIP_BUNDLE_HOOK=1/);
    expect(said).toMatch(/--no-verify/);
  });

  it("REFUSES a hand-edited artifact, the other direction", () => {
    /*
     * Patching the bundle instead of the source "works" until the next
     * build silently discards it. Same guarantee the suite check gives, one
     * step earlier.
     */
    const index = scratchIndex();
    const artifact = ARTIFACTS[2] as string;
    stageBlob(index, artifact, `${readStaged(index, artifact)}\n/* hand patch */\n`);

    const result = hook(index);
    expect(result.status).toBe(1);
    expect(result.stderr + result.stdout).toMatch(/lib\/client\.js/);
    expect(result.stderr + result.stdout).toMatch(/edited by hand/);
  });

  it("PASSES the same mutation once the manifest is regenerated for it", () => {
    /*
     * The proof that the refusal is a real comparison and not a
     * "something changed, panic" heuristic: take the exact index the
     * previous test refused, record what the SHIPPED digest function says
     * about it, stage that manifest, and the hook lets it through.
     *
     * This is also why `--staged-digest` exists rather than the test
     * computing a digest itself. The number comes from the production code
     * path; if that path were replaced by a constant, this test and the
     * refusal test could not both pass.
     */
    const index = scratchIndex();
    const target = someSource(index);
    stageBlob(index, target, `${readStaged(index, target)}\n// #148 drift probe\n`);
    expect(hook(index).status, "precondition: the mutation must be refused").toBe(1);

    const digest = hook(index, {}, ["--staged-digest"]);
    expect(digest.status).toBe(0);
    const artifacts: Record<string, string> = {};
    for (const path of ARTIFACTS) artifacts[path] = sha256(readStaged(index, path));
    stageBlob(
      index,
      MANIFEST,
      `${JSON.stringify({ note: "u148 test", sourceDigest: digest.stdout.trim(), artifacts }, null, 2)}\n`,
    );

    const result = hook(index);
    expect(result.status, `hook refused a self-consistent commit:\n${result.stderr}`).toBe(0);
  });

  it("the staged digest tracks the index, not the working tree", () => {
    /*
     * The single most important property, and the easiest to lose in a
     * refactor: a rebuilt-but-UNSTAGED artifact in the working tree must
     * not talk the hook out of a refusal. Asserted as an identity — the
     * index digest equals the worktree digest only while the two agree, and
     * diverges the moment the index alone is mutated, while the working
     * tree is never touched by this file at all.
     */
    const index = scratchIndex();
    const before = hook(index, {}, ["--staged-digest"]).stdout.trim();
    const worktree = spawnSync("node", ["build.mjs", "--print-digest"], {
      cwd: ROOT,
      encoding: "utf8",
    }).stdout.trim();
    expect(before).toBe(worktree);

    const target = someSource(index);
    stageBlob(index, target, `${readStaged(index, target)}\n// index only\n`);
    const after = hook(index, {}, ["--staged-digest"]).stdout.trim();
    expect(after).not.toBe(before);
    // ...and the working tree is unchanged, so its digest has not moved.
    expect(
      spawnSync("node", ["build.mjs", "--print-digest"], { cwd: ROOT, encoding: "utf8" }).stdout.trim(),
    ).toBe(worktree);
  });

  it("BYPASS: AIDOS_SKIP_BUNDLE_HOOK lets a deliberate source-only commit through", () => {
    /*
     * A control with no documented way out gets disabled wholesale rather
     * than used, and splitting a change into reviewable commits is a real
     * reason to want one. The bypass is asserted here so it cannot be
     * dropped by a later "tighten the hook" change without a red test.
     */
    const index = scratchIndex();
    const target = someSource(index);
    stageBlob(index, target, `${readStaged(index, target)}\n// deliberate\n`);
    expect(hook(index).status, "precondition: this must otherwise be refused").toBe(1);

    const result = hook(index, { AIDOS_SKIP_BUNDLE_HOOK: "1" });
    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/bypassed/);
  });

  it("ignores a commit that touches nothing the bundles are built from", () => {
    /*
     * Built from HEAD rather than from the working tree, so that README is
     * provably the ONLY staged path and the fast path is the one being
     * exercised. Seeded from the worktree it would depend on whether the
     * checkout happened to be dirty, and the test would quietly stop
     * testing what it says it does.
     */
    const index = headIndex();
    stageBlob(index, "README.md", `${readStaged(index, "README.md")}\n<!-- doc only -->\n`);
    expect(
      git(["diff", "--cached", "--name-only"], { GIT_INDEX_FILE: index }).trim(),
    ).toBe("README.md");
    expect(hook(index).status).toBe(0);
  });

  it("COMMITTING STAYS FAST — the criterion, asserted rather than claimed", () => {
    /*
     * "Must not make committing slow" is measurable, so it is measured. The
     * budget is generous against the observed cost (~100ms for the full
     * check, ~50ms for the fast path on this machine) because the number
     * that matters is "a human does not notice", not a benchmark: the point
     * of the threshold is to catch a future change that makes the hook
     * spawn a process per file or import the bundler again, both of which
     * cost seconds, not milliseconds.
     */
    const index = scratchIndex();
    const full = hook(index);
    expect(full.status).toBe(0);
    expect(full.ms, `full check took ${full.ms}ms`).toBeLessThan(2000);

    const docOnly = headIndex();
    stageBlob(docOnly, "README.md", `${readStaged(docOnly, "README.md")}\n<!-- doc -->\n`);
    const fast = hook(docOnly);
    expect(fast.status).toBe(0);
    expect(fast.ms, `fast path took ${fast.ms}ms`).toBeLessThan(1000);
  });
});

describe("#148 the hook installs itself, so no clone has to remember", () => {
  function tempHooks(): string {
    const dir = mkdtempSync(join(tmpdir(), "aidos-u148-hooks-"));
    scratchDirs.push(dir);
    return dir;
  }

  /**
   * Point git's `core.hooksPath` at a temp directory for one child process.
   *
   * git reads `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_n`/`GIT_CONFIG_VALUE_n` as
   * config, so this exercises the real `core.hooksPath` branch without
   * writing to the repository's config or its actual hooks directory.
   */
  function withHooksPath(dir: string): NodeJS.ProcessEnv {
    return {
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "core.hooksPath",
      GIT_CONFIG_VALUE_0: dir,
    };
  }

  function install(dir: string) {
    return spawnSync("node", ["build.mjs", "--install-hook"], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, ...withHooksPath(dir) },
    });
  }

  it("writes an executable pre-commit hook that runs the real check", () => {
    const dir = tempHooks();
    expect(install(dir).status).toBe(0);

    const file = join(dir, "pre-commit");
    expect(existsSync(file)).toBe(true);
    const body = readFileSync(file, "utf8");
    // It must invoke the shipped check — not a copy of the logic.
    expect(body).toMatch(/build\.mjs --precommit/);
    // ...and document its own escape hatch where someone stuck at a
    // refusal will actually look.
    expect(body).toMatch(/AIDOS_SKIP_BUNDLE_HOOK=1/);
    expect(body).toMatch(/--no-verify/);
    // git ignores a hook it cannot execute, silently. That failure mode
    // looks exactly like "installed and working".
    expect(statSync(file).mode & 0o111).toBeGreaterThan(0);
  });

  it("HONOURS core.hooksPath — a hook written where git does not look is worse than none", () => {
    /*
     * Not a hypothetical tidiness point: writing to `.git/hooks` while git
     * reads `core.hooksPath` produces a repository that LOOKS protected and
     * is not, which is strictly worse than an obviously missing hook.
     */
    const dir = tempHooks();
    expect(install(dir).status).toBe(0);
    expect(existsSync(join(dir, "pre-commit"))).toBe(true);
  });

  it("is idempotent, so every build and install can re-assert it", () => {
    const dir = tempHooks();
    expect(install(dir).status).toBe(0);
    const first = readFileSync(join(dir, "pre-commit"), "utf8");
    const second = install(dir);
    expect(second.status).toBe(0);
    expect(second.stdout).toMatch(/already current/);
    expect(readFileSync(join(dir, "pre-commit"), "utf8")).toBe(first);
  });

  it("REFUSES to clobber a pre-commit hook that is not ours", () => {
    /*
     * Destroying someone's existing hook in order to install a freshness
     * check would be a worse bug than the one this ticket is about.
     */
    const dir = tempHooks();
    const foreign = "#!/bin/sh\necho someone else's hook\n";
    writeFileSync(join(dir, "pre-commit"), foreign);

    const result = install(dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/foreign pre-commit hook/);
    expect(readFileSync(join(dir, "pre-commit"), "utf8")).toBe(foreign);
  });
});
