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
 * The sanctioned temp area as a whole: worktrees live under it, and so do
 * the larger artifacts a subagent is told to leave outside the workspace.
 *
 * #157 made this an exemption in the write boundary. The subagent refusal
 * names this directory as where to work instead, and until that ticket the
 * boundary refused it too — so the instruction could not be followed. It is
 * the whole of /tmp/dsh rather than just WORKTREE_ROOT because the refusal
 * names both uses, and a boundary that allowed one and refused the other
 * would recreate the same trap one level down.
 */
export const DSH_TMP_ROOT = "/tmp/dsh";

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

/*
 * ===========================================================================
 * #158: a prepared worktree, not merely a created one.
 * ===========================================================================
 *
 * FOUND BY HITTING IT (2026-09-08). A dispatched subagent landed in
 * `/tmp/dsh/aidos/--home-sid-repos-thursday--/86`, found no built
 * `packages/tokens/dist`, repaired the tree itself and carried on. Another
 * agent would have repaired it differently, and one that did not think of
 * it would have reported a build error belonging to no ticket.
 *
 * The first investigation of this ticket saved the next one from a wasted
 * round, and its finding shapes everything below: the node_modules symlink
 * "this ticket asks for" ALREADY EXISTS and has since #101. The defect is
 * narrower than the report made it sound, and is really three things:
 *
 *   1. THE LINK IS SINGLE-PACKAGE SHAPED. It links the ROOT node_modules
 *      only. In a pnpm workspace each package has its own node_modules
 *      symlink farm, so a root-only link leaves `packages/*` unresolvable
 *      and the tree still does not build.
 *
 *   2. NO AMOUNT OF LINKING PRODUCES BUILD OUTPUT. `packages/tokens/dist`
 *      is gitignored: an internal package must be BUILT before its
 *      dependents compile. That is the half no dependency link can cover,
 *      and it is the half the reporting subagent had to do by hand.
 *
 *   3. AN EXISTING WORKTREE IS NEVER REFRESHED. `worktree add` on a path
 *      that already exists fails, the failure is swallowed to a log line,
 *      and the agent inherits whatever commit the tree was cut at. Both
 *      aidos worktrees in this very session were stale by three and ten
 *      commits, and nothing said so.
 *
 * THE DECISION THIS FILE RECORDS, because the criterion asks for it
 * explicitly rather than for an accident:
 *
 *   SYMLINK, NOT INSTALL — with its cross-contamination risk stated.
 *   A per-ticket `pnpm install` costs minutes and gigabytes per ticket, and
 *   the dependency set is identical BY CONSTRUCTION because a worktree is a
 *   checkout of the same repository. The cost of that choice is real and is
 *   not hypothetical: node_modules is then SHARED MUTABLE STATE, so an
 *   install run inside a worktree writes through the link into the main
 *   checkout -- the exact cross-contamination worktrees exist to prevent.
 *   Two things keep that bounded, and neither is a guarantee:
 *     - preparation itself NEVER installs. It links, and then runs only
 *       what the workspace declared.
 *     - a workspace that declares an install as its prepare command is
 *       choosing to mutate the shared tree, and is told so here.
 *   Accepted deliberately for a single-user local tool, in the same spirit
 *   as #110's lexical containment.
 */

/*
 * (A PREPARE_TIMEOUT_MS lived here while the HOST ran preparation. It was
 * removed on 2026-09-08 with the executor itself: the orchestrator runs the
 * recipe from its own turn, under the timeout its own tooling applies, and a
 * timeout constant that nothing reads is a leftover pretending to be a rule.)
 */

/** One directory whose node_modules must be visible inside the worktree. */
export interface NodeModulesLink {
  /** Absolute path in the main checkout, the link target. */
  from: string;
  /** Absolute path inside the worktree, the link itself. */
  to: string;
}

/**
 * Where node_modules must appear inside the worktree.
 *
 * `dirsWithNodeModules` are repo-relative directories in the MAIN checkout
 * that contain one; `""` is the root. The caller finds them (that is I/O);
 * this decides the plan (that is a rule), so the rule is testable without a
 * filesystem.
 *
 * Generic on purpose: aidos must not learn what `packages/tokens` is. A
 * single-package repo yields exactly the root link that #101 already made,
 * and a pnpm workspace yields one per package with no repo-specific
 * knowledge anywhere.
 */
export function nodeModulesLinkPlan(
  mainRoot: string,
  worktreePath: string,
  dirsWithNodeModules: string[],
): NodeModulesLink[] {
  const seen = new Set<string>();
  const plan: NodeModulesLink[] = [];
  for (const dir of dirsWithNodeModules) {
    const clean = dir.replace(/^\.?\/+/, "").replace(/\/+$/, "");
    if (seen.has(clean)) continue;
    seen.add(clean);
    const suffix = clean === "" ? "node_modules" : `${clean}/node_modules`;
    plan.push({ from: `${mainRoot}/${suffix}`, to: `${worktreePath}/${suffix}` });
  }
  return plan;
}

/**
 * How deep the node_modules scan goes below the repository root.
 *
 * 3 covers `packages/<name>`, `apps/<name>` and their one-deeper variants.
 * An unbounded walk of a large monorepo on every move to in_progress would
 * be a real cost paid on every ticket for a vanishing case.
 *
 * MEASURED against the repository that prompted this ticket rather than
 * guessed. Running this scan over the real thursday checkout finds ten
 * directories: the root, `packages/build`, `packages/cli`,
 * `packages/install`, `packages/tokens`, `website`, and FOUR at depth 3 --
 * `packages/plugins/meridian-breaker`, `.../thursday-fonts`,
 * `.../thursday-skin`, `.../thursday-thinking`.
 *
 * Two things follow, and both are why this is a walk and not a list. A
 * hardcoded `packages/*` would have missed five of the ten, `website`
 * included. And depth 3 is not slack: it is exactly what those plugin
 * packages need, so a limit of 2 would silently leave four packages
 * unresolvable -- the precise failure this ticket exists to end. The
 * corollary is stated rather than hidden: a workspace nesting a package one
 * level deeper than this is not covered, and shows up as an unresolvable
 * package rather than a linked one.
 */
export const NODE_MODULES_SCAN_DEPTH = 3;

/** The filesystem questions the scan needs answered, so it can be tested without one. */
export interface ScanIO {
  /** Does `<root>/<prefix>/node_modules` exist? `prefix` is "" for the root. */
  hasNodeModules(prefix: string): boolean;
  /** The child DIRECTORY names of `<root>/<prefix>`, in any order. */
  childDirectories(prefix: string): string[];
}

/**
 * Every directory that has a node_modules, repo-relative, `""` for the root.
 *
 * THE MONOREPO HALF of this ticket. #101's link was single-package shaped:
 * it linked the ROOT node_modules only, and in a pnpm workspace each package
 * has its own symlink farm, so `packages/*` stayed unresolvable and the tree
 * still did not build. Discovered by walking rather than declared, because a
 * declaration would make every workspace restate what is already visible on
 * disk -- and hardcoding `packages` would bake one repository's layout into
 * aidos, which the criteria forbid by name.
 *
 * Never descends INTO a node_modules (its interior is full of them, and
 * mirroring those would be both enormous and pointless) or into a dotted
 * directory (`.git` above all).
 *
 * The I/O is injected so the RULE -- what gets scanned, what gets skipped,
 * how deep -- is testable without building a monorepo on disk first.
 */
export function discoverNodeModulesDirs(io: ScanIO, prefix = "", depth = 0): string[] {
  const found: string[] = [];
  if (io.hasNodeModules(prefix)) found.push(prefix);
  if (depth >= NODE_MODULES_SCAN_DEPTH) return found;
  for (const name of io.childDirectories(prefix)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    found.push(...discoverNodeModulesDirs(io, prefix === "" ? name : `${prefix}/${name}`, depth + 1));
  }
  return found;
}

/** What the orchestrator has recorded about making this workspace buildable. */
export interface WorktreePrepareSpec {
  /** Whether a preparation recipe has been recorded for this workspace yet. */
  declared: boolean;
  /** Commands to run in the worktree root, argv-first, never through a shell. */
  commands: string[][];
  /**
   * Things the next agent must KNOW rather than run.
   *
   * Added 2026-09-08 by the first real use of this file, which found the
   * format could not express its own workspace's answer. aidos needs no
   * build step at all -- a fresh worktree ran the entire suite untouched --
   * but `pnpm <script>` dies in one with `[ERR_SQLITE_ERROR] unable to open
   * database file`, because pnpm's pre-script dependency check cannot reach
   * its store through a symlinked node_modules. Nothing to RUN, and yet the
   * tree looks broken to anyone who does not know the flag.
   *
   * A commands-only format would have recorded `prepare: []` for aidos and
   * thrown that finding away, sending the next front down the same dead
   * end -- the exact waste #158 exists to stop.
   */
  notes: string[];
  /** A recipe that was present but unusable, for a loud report. */
  problems: string[];
}

/** The scratch file that records how to make one workspace's worktree build. */
export const WORKTREE_PREPARE_CONFIG = "worktree-prepare.json";

/** Where that file lives, given the session's scratch root. */
export function worktreePrepareConfigPath(scratchRoot: string): string {
  return scratchRoot.replace(/\/+$/, "") + "/" + WORKTREE_PREPARE_CONFIG;
}

/**
 * Read the recorded preparation recipe for this workspace.
 *
 * WHERE IT LIVES, AND WHY IT MOVED (2026-09-08). The first implementation
 * read `aidos.worktree.prepare` from the WORKSPACE's own package.json and
 * had the host execute it. That was rejected, and the reason is worth
 * keeping: its default case was the bug. Every repository declares nothing
 * -- aidos and thursday included -- so the no-op branch was the overwhelming
 * majority, and it reported success over a worktree that still could not
 * build. It also asked every project on earth to opt in, in a file that
 * belongs to the project rather than to aidos.
 *
 * So the recipe lives in the SESSION'S SCRATCH DIRECTORY instead:
 *
 *     { "prepare": [["pnpm", "--filter", "./packages/tokens", "run", "build"]] }
 *
 * Scratch is agent-writable with no allowlist, so the orchestrator records
 * what it worked out the first time it prepared this workspace, and every
 * later dispatch reuses it. The recipe is aidos's memory, not the
 * repository's configuration.
 *
 * WHO RUNS IT: the orchestrator, never the host. The host creates, links,
 * refreshes and reports; the orchestrator prepares the tree and hands a
 * working one to the subagent, so a failure lands in a turn that can
 * diagnose it rather than in a host log that -- as verified on 2026-09-08 --
 * is not persisted anywhere. This function therefore only PARSES; nothing
 * in the kernel or the host executes what it returns.
 *
 * ARGV ARRAYS, NOT SHELL STRINGS. Everything aidos runs goes through
 * execFile with a fixed argument list and no shell (the rule `_gitIn` has
 * followed since #78), so a recipe cannot grow a pipeline, a redirection or
 * a `;`. A bare string is accepted and split on whitespace as a
 * convenience, and that is a real limitation rather than a hidden one: an
 * argument containing spaces must be written as an array.
 *
 * ABSENCE IS "NOT YET KNOWN", NOT "NOTHING TO DO". That distinction is the
 * whole correction: `declared: false` means the orchestrator has not worked
 * this workspace out yet, and the caller REPORTS it rather than treating it
 * as a clean no-op.
 */
export function parseWorktreePrepareConfig(configText: string | undefined): WorktreePrepareSpec {
  const empty: WorktreePrepareSpec = {
    declared: false,
    commands: [],
    notes: [],
    problems: [],
  };
  if (configText === undefined || configText.trim() === "") return empty;

  let parsed: unknown;
  try {
    parsed = JSON.parse(configText);
  } catch (error) {
    return {
      declared: false,
      commands: [],
      notes: [],
      problems: [
        `${WORKTREE_PREPARE_CONFIG} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  const root = parsed as { prepare?: unknown; notes?: unknown } | null;
  /*
   * Notes are read WHETHER OR NOT there is anything to run: "nothing to
   * build, but invoke it like this" is a complete and common answer, and
   * dropping it because `prepare` is absent would lose the finding.
   */
  const notes = Array.isArray(root?.notes)
    ? (root.notes as unknown[]).filter((n): n is string => typeof n === "string" && n !== "")
    : [];
  const declaration = root?.prepare;
  if (declaration === undefined) return { ...empty, notes, declared: notes.length > 0 };
  if (!Array.isArray(declaration)) {
    return {
      declared: true,
      commands: [],
      notes,
      problems: [`${WORKTREE_PREPARE_CONFIG}: "prepare" must be an array of commands`],
    };
  }

  const commands: string[][] = [];
  const problems: string[] = [];
  for (const [index, entry] of declaration.entries()) {
    if (typeof entry === "string") {
      const argv = entry.split(/\s+/).filter((part) => part.length > 0);
      if (argv.length === 0) problems.push(`prepare[${index}] is empty`);
      else commands.push(argv);
      continue;
    }
    if (Array.isArray(entry) && entry.every((part) => typeof part === "string")) {
      const argv = (entry as string[]).filter((part) => part.length > 0);
      if (argv.length === 0) problems.push(`prepare[${index}] is empty`);
      else commands.push(argv);
      continue;
    }
    problems.push(`prepare[${index}] must be a string or an array of strings`);
  }
  return { declared: true, commands, notes, problems };
}

/** What preparation decided to do about a worktree that already existed. */
export type StalenessVerdict =
  | { kind: "current" }
  | { kind: "refresh"; from: string; to: string }
  | { kind: "stranded"; from: string; to: string; note: string };

/**
 * What to do with an existing worktree whose HEAD is behind the workspace.
 *
 * THE CRITERION: a stale worktree "is either refreshed by preparation or
 * reports that plainly -- it must not present as 'unprepared' and send the
 * next agent down the same repair path". Both branches are here because
 * neither alone is right:
 *
 *   - A CLEAN stale worktree is refreshed. Nobody's work is in it, the next
 *     agent wants the current commit, and silently handing over a
 *     ten-commit-old checkout is how a front spends its opening minutes
 *     debugging a bug that was fixed last week.
 *
 *   - A DIRTY one is never touched, only reported. A reviewer's whole job
 *     is to leave mutations in the tree (the same reason `worktreeRemoveArgs`
 *     forces), and a checkout that discards them to be helpful would destroy
 *     exactly the evidence it was asked to produce. Reporting is the honest
 *     answer, and the report names the commit gap and the command.
 */
export function stalenessVerdict(
  workspaceHead: string,
  worktreeHead: string,
  worktreeIsDirty: boolean,
): StalenessVerdict {
  if (workspaceHead === worktreeHead) return { kind: "current" };
  if (!worktreeIsDirty) return { kind: "refresh", from: worktreeHead, to: workspaceHead };
  return {
    kind: "stranded",
    from: worktreeHead,
    to: workspaceHead,
    note:
      "it has uncommitted changes, which are almost certainly a reviewer's mutations; " +
      "refreshing would discard them, so preparation left it alone",
  };
}

/** The git arguments that move a clean existing worktree onto a commit. */
export function worktreeRefreshArgs(commit: string): string[][] {
  return [["checkout", "--detach", commit]];
}
