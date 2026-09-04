/**
 * #101: a reviewer subagent cannot mutate the orchestrator's working tree.
 *
 * THE INCIDENT (2026-09-03, real, not hypothetical): a reviewer mutation-
 * tested a line by reverting it in the SHARED tree; the orchestrator
 * committed unrelated work with `git add -A` while that mutation was live,
 * and the mutation rode into the commit. The suite passed, because the
 * mutated line had no coverage -- precisely what the reviewer was
 * demonstrating. The reviewer restored its copy afterwards, so `git status`
 * was clean and the tree looked healthy while the repository carried the
 * regression.
 *
 * Every earlier attempt at this problem was discipline. Discipline is what
 * failed. These tests pin the physical version.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  WORKTREE_ROOT,
  isUnderWorktreeRoot,
  worktreeAddArgs,
  worktreeName,
  worktreePathFor,
  worktreeRemoveArgs,
} from "../src/kernel/worktree";
import { writeBoundaryReason } from "../src/tools/allowlist";
import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";
import { scratchRootForAgent } from "../src/tools/scratch";

const core = readFileSync(new URL("../src/host/aidos-core.ts", import.meta.url), "utf8");

describe("#101 the worktree path", () => {
  it("is /tmp/dsh/aidos/<workspaceKey>/<ticketId>", () => {
    expect(worktreePathFor("--home-sid-repos-aidos--", 42)).toBe(
      "/tmp/dsh/aidos/--home-sid-repos-aidos--/42",
    );
  });

  it("separates workspaces, so two boards cannot collide", () => {
    expect(worktreePathFor("--a--", 7)).not.toBe(worktreePathFor("--b--", 7));
  });

  it("names the git registration by workspace AND ticket", () => {
    /*
     * git derives the name in .git/worktrees/ from the LAST path segment, so
     * every ticket would register as a bare number and workspace B's #7 would
     * collide with workspace A's. The registration is the DURABLE half of a
     * worktree, so a collision there is durable too.
     */
    expect(worktreeName("--a--", 7)).not.toBe(worktreeName("--b--", 7));
    expect(worktreeName("--a--", 7)).toContain("--a--");
    expect(worktreeName("--a--", 7)).toContain("7");
  });

  it("recognises its own root", () => {
    expect(isUnderWorktreeRoot(WORKTREE_ROOT)).toBe(true);
    expect(isUnderWorktreeRoot(worktreePathFor("--w--", 1))).toBe(true);
    expect(isUnderWorktreeRoot("/tmp/dsh/aidos-evil/x")).toBe(false);
    expect(isUnderWorktreeRoot("/home/sid/repos/aidos")).toBe(false);
  });
});

describe("#101 creation prunes before it adds", () => {
  /*
   * MEASURED on the real repository, because the user asked what happens
   * when /tmp is cleared while a worktree is open:
   *   - the real repository is UNAFFECTED, git status stays clean;
   *   - git worktree list marks the entry "prunable";
   *   - re-adding the SAME path REFUSES: "is a missing but already
   *     registered worktree";
   *   - prune clears it and the add then succeeds.
   *
   * So the failure mode is not corruption. It is that after ANY reboot every
   * ticket silently fails to get a worktree, forever, until something
   * prunes. This ordering is the whole fix.
   */
  it("prunes first, then adds", () => {
    const args = worktreeAddArgs("/tmp/dsh/aidos/--w--/3");
    expect(args[0]).toEqual(["worktree", "prune"]);
    expect(args[1][0]).toBe("worktree");
    expect(args[1][1]).toBe("add");
  });

  it("checks out DETACHED, because a reviewer must never commit", () => {
    // A branch per ticket would leave dozens of refs behind and imply the
    // worktree is somewhere work is kept, which it is not.
    expect(worktreeAddArgs("/x")[1]).toContain("--detach");
    expect(worktreeAddArgs("/x")[1]).toContain("HEAD");
  });

  it("forces removal, because a reviewer's job leaves the tree dirty", () => {
    /*
     * A mutation test that was interrupted leaves modifications behind, and
     * git refuses a plain remove on a dirty worktree. Refusing to clean up
     * because the reviewer did exactly what it was asked would strand the
     * directory forever.
     */
    const args = worktreeRemoveArgs("/tmp/dsh/aidos/--w--/3");
    expect(args[0]).toContain("--force");
    // The trailing prune clears the record even when the directory is
    // already gone -- the reboot case.
    expect(args[args.length - 1]).toEqual(["worktree", "prune"]);
  });
});

describe("#101 the worktree follows the ticket's state", () => {
  it("is created on in_progress and removed on done", () => {
    // Removed at DONE, not on leaving in_progress: a review still running
    // when the ticket reaches awaiting_verification must not have its
    // checkout pulled out from under it.
    expect(core).toContain('if (toState === "in_progress") {');
    expect(core).toContain("void this._ensureWorktree(agent, ticketId);");
    expect(core).toContain('} else if (toState === "done") {');
    expect(core).toContain("void this._removeWorktree(agent, ticketId);");
  });

  it("NEVER blocks the move", () => {
    /*
     * A worktree is an affordance for reviewers, not part of the gate. A git
     * failure -- a full disk, a read-only /tmp, a repository mid-rebase --
     * must not refuse a legitimate state change, and the move has already
     * been committed by the time this runs. Both calls are `void`, and both
     * helpers swallow into a log.
     */
    expect(core).toContain("void this._ensureWorktree");
    expect(core).toContain("void this._removeWorktree");
    const ensure = core.slice(core.indexOf("private async _ensureWorktree"));
    expect(ensure.slice(0, ensure.indexOf("\n  }"))).toContain("catch (error)");
  });

  it("links node_modules, which a fresh worktree does not have", () => {
    /*
     * node_modules is gitignored, so a fresh worktree CANNOT RUN THE SUITE.
     * Every reviewer was already working around this by hand, which is the
     * tell that creation should do it. A symlink rather than an install: the
     * dependencies are identical by construction, because the worktree is a
     * checkout of the same commit.
     */
    expect(core).toContain("node_modules");
    expect(core).toContain("symlinkSync(source");
  });
});

describe("#101 a subagent cannot write the shared tree", () => {
  function boundary(depth: number, path: string): string | undefined {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const agent = harness.asAgent(harness.makeAgent({ depth }));
    return writeBoundaryReason(asContext(harness.ctx), agent, path);
  }

  it("refuses a subagent write inside the workspace", () => {
    const reason = boundary(1, "/srv/proj/cli/src/kernel/store.ts");
    expect(reason, "a subagent write to the shared tree must be refused").toBeDefined();
    expect(reason as string).toContain("#101");
    // The refusal must say where to go instead, or it is just an obstacle.
    expect(reason as string).toContain(WORKTREE_ROOT);
  });

  it("still lets the ORCHESTRATOR write, subject to the allowlist", () => {
    // Depth 0 is the orchestrator: this rule must not touch it, or the board
    // could never do any work at all.
    const reason = boundary(0, "/srv/proj/cli/src/kernel/store.ts");
    // It may still be refused by the allowlist union, but NOT by this rule.
    if (reason !== undefined) expect(reason).not.toContain("#101");
  });

  it("leaves a subagent its scratch root", () => {
    /*
     * Checked AFTER the scratch exemption on purpose. The scratch root is
     * outside the workspace and is where a subagent is meant to work; closing
     * it would leave the subagent nowhere to write at all.
     */
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const agent = harness.asAgent(harness.makeAgent({ depth: 1 }));
    const scratch = scratchRootForAgent(agent);
    expect(writeBoundaryReason(asContext(harness.ctx), agent, scratch + "/notes.md")).toBeUndefined();
  });
});

describe("#101 the convention is in the prompt, not only in a refusal", () => {
  const tools = readFileSync(new URL("../src/tools/aidos-tools.ts", import.meta.url), "utf8");

  it("names the workspace key, which cannot be guessed", () => {
    // The key is a canonicalised form of the workspace path; the rest of the
    // path is a rule. Given the key, a ticket's worktree is derivable, so one
    // prompt line replaces retyping a path into every subagent prompt.
    expect(tools).toContain("This workspace's key is");
    expect(tools).toContain("workspaceKeyFromPath(cwd)");
  });

  it("states the boundary the guard enforces", () => {
    // A subagent should learn the rule from the prompt, not from a refusal.
    expect(tools).toContain("A SUBAGENT MUST WORK THERE");
    expect(tools).toContain("#101");
  });
});
