/**
 * #101: where a ticket's git worktree lives, as pure functions.
 *
 * THE INCIDENT this exists to prevent (2026-09-03, real, not hypothetical):
 * a reviewer subagent mutation-tested a line by reverting it IN THE SHARED
 * WORKING TREE, the orchestrator committed unrelated work with `git add -A`
 * while that mutation was live, and the mutation rode into the commit. The
 * suite passed, because the mutated line had no coverage -- which was
 * precisely what the reviewer was demonstrating. The reviewer then restored
 * its copy, so `git status` was clean and the tree looked healthy while the
 * repository carried the regression.
 *
 * A worktree removes the race physically rather than by discipline: a
 * subagent editing its own checkout cannot reach the orchestrator's tree, so
 * there is no timing window to get wrong.
 *
 * The path is derived, never stored, so it cannot drift from the directory
 * that actually exists. It is computed HERE and nowhere else -- the criterion
 * is explicit that it must not be "derived by convention in two places".
 */

/**
 * The root of every aidos worktree.
 *
 * `/tmp` is deliberate (user, 2026-09-04): every worktree is a checkout of
 * commits that already live in the repository, so nothing durable is lost
 * when the machine reboots. What IS durable is the `.git/worktrees/<name>`
 * record inside the real repository -- see `worktreeName` and the
 * prune-before-add rule that record forces.
 */
export const WORKTREE_ROOT = "/tmp/dsh/aidos";

/**
 * One ticket's worktree directory: `/tmp/dsh/aidos/<workspaceKey>/<id>`.
 *
 * Keyed by workspace first so several workspaces can be open at once without
 * colliding, and by ticket second because a worktree belongs to the ticket
 * whose work is being reviewed.
 */
export function worktreePathFor(workspaceKey: string, ticketId: number): string {
  return `${WORKTREE_ROOT}/${workspaceKey}/${ticketId}`;
}

/**
 * The name git records for this worktree inside `.git/worktrees/`.
 *
 * git derives it from the LAST path segment, so every ticket in every
 * workspace would register as a bare number and the second workspace's #7
 * would collide with the first's. The registration is the durable half of a
 * worktree, so a collision there is durable too.
 *
 * Not currently passed to git (it infers the name), but the collision is
 * real and this is where a future `--reason`/rename would compute it. Kept
 * next to the path so the two cannot disagree.
 */
export function worktreeName(workspaceKey: string, ticketId: number): string {
  return `${workspaceKey}-${ticketId}`;
}

/**
 * Whether a path sits inside the worktree root.
 *
 * Lexical containment, like the rest of this codebase's boundaries (#110
 * records that a symlink escapes a lexical check, and that this is accepted
 * for a single-user local tool).
 */
export function isUnderWorktreeRoot(path: string): boolean {
  return path === WORKTREE_ROOT || path.startsWith(WORKTREE_ROOT + "/");
}

/**
 * The git arguments that create one worktree, in order.
 *
 * PRUNE BEFORE ADD, always. MEASURED on the real repository (2026-09-04)
 * rather than assumed, because the user asked what happens when /tmp is
 * cleared while a worktree is open:
 *
 *   - the real repository is UNAFFECTED: `git status` stays clean;
 *   - `git worktree list` marks the entry "prunable";
 *   - re-adding the SAME path REFUSES -- "fatal: is a missing but already
 *     registered worktree; use 'add -f' to override, or 'prune' or 'remove'
 *     to clear";
 *   - `git worktree prune` clears it, and the add then succeeds.
 *
 * So the failure mode is not corruption. It is that after any reboot every
 * ticket silently fails to get a worktree, forever, until something prunes.
 * Pruning at creation makes it self-healing and needs no startup hook.
 *
 * DETACHED, at the current HEAD: a reviewer reads and mutates, and must
 * never commit. A branch per ticket would leave dozens of refs behind and
 * imply the worktree is somewhere work is kept, which it is not.
 */
export function worktreeAddArgs(path: string): string[][] {
  return [
    ["worktree", "prune"],
    ["worktree", "add", "--detach", path, "HEAD"],
  ];
}

/**
 * The git arguments that remove one worktree.
 *
 * `--force` because a reviewer's whole job is to leave the tree dirty: a
 * mutation test that was interrupted leaves modifications behind, and git
 * refuses a plain remove on a dirty worktree. Refusing to clean up because
 * the reviewer did exactly what it was asked to do would strand the
 * directory forever.
 *
 * The trailing prune clears the record even when the directory has already
 * gone -- the reboot case above.
 */
export function worktreeRemoveArgs(path: string): string[][] {
  return [
    ["worktree", "remove", "--force", path],
    ["worktree", "prune"],
  ];
}
