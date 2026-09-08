/**
 * #158: a per-ticket worktree must arrive BUILDABLE, not merely created.
 *
 * **Found by hitting it (2026-09-08).** A dispatched subagent landed in
 * `/tmp/dsh/aidos/--home-sid-repos-thursday--/86`, found no built
 * `packages/tokens/dist`, repaired the tree itself and carried on. That is a
 * defect and not a chore: each dispatched agent would solve it differently,
 * each spends its opening minutes on setup instead of the ticket, and the
 * ones that do not think of it simply fail — reporting a build error that
 * has nothing to do with their ticket. The repair is invisible to the
 * orchestrator too, so two fronts can leave the same tree in two states.
 *
 * **The first investigation of this ticket is why these tests are shaped
 * the way they are.** It found that the node_modules symlink the report
 * asked for ALREADY EXISTED and had since #101, and that the real defect is
 * narrower: the link is single-package shaped, no amount of linking produces
 * an internal package's BUILD OUTPUT, and an existing worktree is never
 * refreshed. So the tests below are about those three things, and not about
 * "does it symlink node_modules" — which was never the bug.
 *
 * **Why the rules are pure functions with injected I/O.** A rule that can
 * only be exercised by creating real git worktrees and monorepos on disk is
 * a rule nobody tests, and this whole ticket exists because the preparation
 * step was un-inspectable. `discoverNodeModulesDirs` takes its filesystem
 * questions as callbacks, `stalenessVerdict` takes three values, and
 * `parseWorktreePrepare` takes text — so the decisions are checked directly
 * and the host is left with nothing but the wiring.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  NODE_MODULES_SCAN_DEPTH,
  PREPARE_TIMEOUT_MS,
  type ScanIO,
  discoverNodeModulesDirs,
  nodeModulesLinkPlan,
  parseWorktreePrepare,
  stalenessVerdict,
  worktreeRefreshArgs,
} from "../src/kernel/worktree";

const core = readFileSync(new URL("../src/host/aidos-core.ts", import.meta.url).pathname, "utf8");

/** A fake tree: the set of directories that have a node_modules, plus the layout. */
function fakeIO(layout: Record<string, string[]>, withNodeModules: string[]): ScanIO {
  return {
    hasNodeModules: (prefix) => withNodeModules.includes(prefix),
    childDirectories: (prefix) => layout[prefix] ?? [],
  };
}

describe("#158 node_modules is found for every package, not only the root", () => {
  it("a single-package repo yields exactly the root link #101 already made", () => {
    // The no-op case matters: this must not become a change in behaviour for
    // repositories that were fine, aidos itself included.
    const io = fakeIO({ "": ["src", "tests"] }, [""]);
    expect(discoverNodeModulesDirs(io)).toEqual([""]);
  });

  it("A PNPM WORKSPACE YIELDS ONE PER PACKAGE — the actual defect", () => {
    /*
     * thursday's shape. The root-only link left packages/* unresolvable, so
     * the tree "had node_modules" and still could not build — which is
     * exactly the confusing half of the original report.
     */
    const io = fakeIO(
      { "": ["packages", "apps"], packages: ["tokens", "ui"], apps: ["web"] },
      ["", "packages/tokens", "packages/ui", "apps/web"],
    );
    expect(discoverNodeModulesDirs(io).sort()).toEqual([
      "",
      "apps/web",
      "packages/tokens",
      "packages/ui",
    ]);
  });

  it("never descends into node_modules or a dotted directory", () => {
    /*
     * The interior of node_modules is full of node_modules; mirroring those
     * would be enormous and pointless. `.git` is the other one that must
     * never be walked — and in a worktree it is a FILE, but the rule is the
     * same either way.
     */
    const io = fakeIO(
      { "": [".git", "node_modules", "packages"], packages: ["a"] },
      ["", "node_modules/x", ".git/y", "packages/a"],
    );
    expect(discoverNodeModulesDirs(io)).toEqual(["", "packages/a"]);
  });

  it("FINDS THURSDAY'S REAL SHAPE, including the depth-3 plugin packages", () => {
    /*
     * The layout below is not invented: it is what this scan returns when
     * run over the actual /home/sid/repos/thursday checkout — the repository
     * whose unbuildable worktree filed this ticket. Ten directories, of
     * which FIVE would be missed by a hardcoded `packages/*`: `website` and
     * the four plugins nested one level further down.
     *
     * That makes NODE_MODULES_SCAN_DEPTH load-bearing rather than generous.
     * A limit of 2 leaves four real packages unresolvable, which is exactly
     * the failure this ticket exists to end, so the depth is asserted here
     * against the shape that actually needs it.
     */
    const io = fakeIO(
      {
        "": ["packages", "website", "docs", "config"],
        packages: ["aidos", "blocks", "build", "cli", "install", "plugins", "session", "tokens"],
        "packages/plugins": [
          "meridian-breaker",
          "thursday-fonts",
          "thursday-skin",
          "thursday-thinking",
        ],
      },
      [
        "",
        "packages/build",
        "packages/cli",
        "packages/install",
        "packages/tokens",
        "website",
        "packages/plugins/meridian-breaker",
        "packages/plugins/thursday-fonts",
        "packages/plugins/thursday-skin",
        "packages/plugins/thursday-thinking",
      ],
    );
    const found = discoverNodeModulesDirs(io);
    expect(found.length).toBe(10);
    expect(found).toContain("packages/plugins/thursday-skin");
    expect(found).toContain("website");
    // Packages with no node_modules are not invented into the plan.
    expect(found).not.toContain("packages/aidos");
    expect(found).not.toContain("packages/session");
    // What the reasonable-looking hardcode would have cost: five of ten.
    const missedByPackagesGlob = found.filter(
      (dir) => !/^packages\/[^/]+$/.test(dir),
    );
    expect(missedByPackagesGlob.length).toBe(6);
    expect(missedByPackagesGlob).toContain("");
  });

  it("is bounded, so a deep monorepo does not cost the whole preparation", () => {
    const layout: Record<string, string[]> = { "": ["a"] };
    const deep: string[] = [];
    let path = "a";
    for (let i = 0; i < 8; i += 1) {
      layout[path] = ["a"];
      deep.push(path);
      path = `${path}/a`;
    }
    const found = discoverNodeModulesDirs(fakeIO(layout, deep));
    expect(found.length).toBe(NODE_MODULES_SCAN_DEPTH);
    expect(found).not.toContain("a/a/a/a");
  });

  it("turns discovered directories into links at the SAME relative path", () => {
    const plan = nodeModulesLinkPlan("/main", "/tmp/dsh/aidos/--w--/7", ["", "packages/tokens"]);
    expect(plan).toEqual([
      { from: "/main/node_modules", to: "/tmp/dsh/aidos/--w--/7/node_modules" },
      {
        from: "/main/packages/tokens/node_modules",
        to: "/tmp/dsh/aidos/--w--/7/packages/tokens/node_modules",
      },
    ]);
  });

  it("normalises and de-duplicates, so a sloppy prefix cannot double-link", () => {
    const plan = nodeModulesLinkPlan("/main", "/wt", ["packages/a/", "./packages/a", "packages/a"]);
    expect(plan).toEqual([
      { from: "/main/packages/a/node_modules", to: "/wt/packages/a/node_modules" },
    ]);
  });
});

describe("#158 the build step is workspace-DECLARED, never hardcoded", () => {
  it("a workspace that declares nothing is a clean no-op, not an error", () => {
    /*
     * The criterion by name: "a repo with nothing to pre-build is a clean
     * no-op and thursday's packages/tokens build is not baked into aidos".
     * aidos itself is that repo, so this is also the regression test for
     * "preparation stayed silent for the repository it runs in".
     */
    expect(parseWorktreePrepare(undefined)).toEqual({
      declared: false,
      commands: [],
      problems: [],
    });
    expect(parseWorktreePrepare(JSON.stringify({ name: "aidos" }))).toEqual({
      declared: false,
      commands: [],
      problems: [],
    });
  });

  it("reads argv arrays, which is what a no-shell runner can take", () => {
    const spec = parseWorktreePrepare(
      JSON.stringify({
        aidos: { worktree: { prepare: [["pnpm", "--filter", "./packages/tokens", "run", "build"]] } },
      }),
    );
    expect(spec.declared).toBe(true);
    expect(spec.problems).toEqual([]);
    expect(spec.commands).toEqual([["pnpm", "--filter", "./packages/tokens", "run", "build"]]);
  });

  it("accepts a plain string by splitting on whitespace — and NOT by shelling out", () => {
    /*
     * The convenience form, with its limitation asserted rather than
     * described: every command goes through execFile with a fixed argument
     * list (the rule #78 set), so a declaration cannot grow a pipeline, a
     * redirect or a `;`. Those characters survive as literal ARGUMENTS,
     * which is the safe failure — the command fails visibly instead of
     * doing something nobody declared.
     */
    const spec = parseWorktreePrepare(
      JSON.stringify({ aidos: { worktree: { prepare: ["pnpm run build; rm -rf /"] } } }),
    );
    expect(spec.commands).toEqual([["pnpm", "run", "build;", "rm", "-rf", "/"]]);
  });

  it("REPORTS a declaration that is present but unusable, rather than ignoring it", () => {
    /*
     * Absence and malformation are opposite cases. Absence means "nothing to
     * do"; a broken declaration means the author meant something, and
     * silently doing nothing would hand over the unbuildable tree this
     * ticket is about while looking like the no-op above.
     */
    const notArray = parseWorktreePrepare(
      JSON.stringify({ aidos: { worktree: { prepare: "pnpm build" } } }),
    );
    expect(notArray.declared).toBe(true);
    expect(notArray.commands).toEqual([]);
    expect(notArray.problems.join(" ")).toMatch(/must be an array/);

    const badEntry = parseWorktreePrepare(
      JSON.stringify({ aidos: { worktree: { prepare: [42, [], ["pnpm", "build"]] } } }),
    );
    expect(badEntry.problems.length).toBe(2);
    // ...and the usable entries survive: one broken line must not silently
    // discard the rest of a workspace's preparation.
    expect(badEntry.commands).toEqual([["pnpm", "build"]]);

    const broken = parseWorktreePrepare("{not json");
    expect(broken.problems.join(" ")).toMatch(/not valid JSON/);
  });

  it("allows a real build the time a real build takes", () => {
    // A tight timeout would turn "your workspace's build is slow" into
    // "aidos silently gave you an unusable tree" — the failure being fixed.
    expect(PREPARE_TIMEOUT_MS).toBeGreaterThanOrEqual(300000);
  });
});

describe("#158 a stale worktree is refreshed or reported, never presented as fresh", () => {
  it("says nothing when it is already on the workspace's commit", () => {
    expect(stalenessVerdict("abc123", "abc123", false)).toEqual({ kind: "current" });
    // Dirty but current is still current: a reviewer's mutations are not
    // staleness, and reporting them as such would cry wolf on every review.
    expect(stalenessVerdict("abc123", "abc123", true)).toEqual({ kind: "current" });
  });

  it("REFRESHES a clean stale tree, because nobody's work is in it", () => {
    /*
     * The case that actually bit: both aidos worktrees in the session that
     * found this ticket were clean and stale — one by three commits, one by
     * ten — and each was handed to an agent unchanged with nothing anywhere
     * saying so.
     */
    expect(stalenessVerdict("new111", "old000", false)).toEqual({
      kind: "refresh",
      from: "old000",
      to: "new111",
    });
    expect(worktreeRefreshArgs("new111")).toEqual([["checkout", "--detach", "new111"]]);
  });

  it("NEVER touches a dirty stale tree — it reports it", () => {
    /*
     * A reviewer's whole job is to leave mutations in the tree (the same
     * reason worktreeRemoveArgs forces). A checkout that discarded them to
     * be helpful would destroy exactly the evidence it was asked to
     * produce, so the honest answer is to say so and let a human decide.
     */
    const verdict = stalenessVerdict("new111", "old000", true);
    expect(verdict.kind).toBe("stranded");
    if (verdict.kind !== "stranded") throw new Error("unreachable");
    expect(verdict.from).toBe("old000");
    expect(verdict.to).toBe("new111");
    expect(verdict.note).toMatch(/discard/);
  });
});

describe("#158 the host wires preparation into the move, and says so loudly", () => {
  /*
   * Source assertions, in the style u101 established for this same code
   * path: the decisions above are unit-tested, and these pin the WIRING —
   * the part a refactor can quietly drop while every rule test still passes.
   */

  it("refreshes an existing worktree instead of failing the add", () => {
    // `worktree add` on a live path fails, and #101's catch turned that into
    // a log line — which is why a ten-commit-old tree was handed over.
    expect(core).toContain("_refreshWorktree");
    expect(core).toContain('if (existsSync(join(path, ".git")))');
  });

  it("links every discovered package, not just the root", () => {
    expect(core).toContain("discoverNodeModulesDirs");
    expect(core).toContain("nodeModulesLinkPlan");
  });

  it("runs the workspace's declared prepare, and nothing aidos invented", () => {
    expect(core).toContain("parseWorktreePrepare");
    /*
     * The proof that no repository's layout is baked in: thursday's package
     * may be NAMED in a comment explaining why it is not hardcoded — that is
     * the reasoning this codebase keeps — but it must never appear as a
     * string literal or a path the code builds, because that is the only
     * form that would actually make aidos know about it.
     */
    expect(core).not.toContain('"packages/tokens"');
    expect(core).not.toContain("'packages/tokens'");
    expect(core).not.toMatch(/packages\/tokens[^`\s.,)]*"/);
  });

  it("REPORTS FAILURE TO THE SESSION, not only to a log nobody reads", () => {
    /*
     * "Failure to prepare is loud at preparation time, not at the agent's
     * first build" is a criterion, and logger.warn does not satisfy it: the
     * orchestrator does not read the host log, so a warning there is
     * indistinguishable from silence until a dispatched agent hits the
     * consequence. This is the assertion that a later "tidy up the logging"
     * change cannot silently undo.
     */
    expect(core).toContain("_reportWorktreePreparation");
    expect(core).toContain("worktree preparation failed");
    expect(core).toContain("worktree preparation FAILED");
  });

  it("still never throws out of the move that triggered it", () => {
    // #101's reasoning stands: the move is already committed, so throwing
    // here would report a failed move that in fact succeeded.
    expect(core).toContain("void this._ensureWorktree(agent, ticketId);");
  });
});
