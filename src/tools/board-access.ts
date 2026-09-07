/**
 * #146: which board tools a SUBAGENT may call.
 *
 * **The rule the user restated, twice.** A subagent reads the board and
 * never writes it. It must be able to look up the ticket it is reviewing —
 * criteria, description, evidence — rather than trust a pasted prompt.
 * Refusing reads produced exactly the failure the ticket was filed for: two
 * reviewers in one session reported "board tools are orchestrator-only
 * (`get_ticket` returns orchestrator_only), so I reviewed against the
 * brief's criteria summary" — a review of the SUMMARY, not the criteria.
 *
 * **Why a declaration and not a list.** The previous shape was a hardcoded
 * `BOARD_TOOLS` array that the guard and the mask both imported, sitting a
 * thousand lines away from the tools it described. Every new tool had to be
 * remembered twice, and the failure mode of forgetting was silent: an
 * unlisted tool was simply ungoverned. Here each tool declares its own
 * access WHERE IT IS DEFINED, through the registration wrapper, and the
 * guard and the mask derive their sets from those declarations. A tool that
 * declares nothing is not a board tool at all, and `u146` asserts that no
 * aidos tool is silently unclassified — so forgetting fails a test rather
 * than opening a hole.
 *
 * The store is module scope on purpose: the declarations describe the tool
 * SHAPES, which are the same in every session, and both readers (a tools
 * guard and the mask's deny computation) run outside any one context.
 */

/** What a subagent may do with a board tool. */
export type BoardAccess = "read" | "write";

/**
 * name -> access, populated by `registerBoardTool` as each tool is defined.
 * Registration happens before the guard and the mask are installed (see the
 * order in `apply`), so every reader sees a complete map.
 */
const declared = new Map<string, BoardAccess>();

/**
 * Declare one board tool's access class. Idempotent for the same class, so
 * re-applying the plugin (every test harness does) is safe; a CONFLICTING
 * redeclaration throws, because two definitions disagreeing about whether a
 * tool writes the board is a bug that must not resolve to last-one-wins.
 */
export function declareBoardTool(name: string, access: BoardAccess): void {
  const previous = declared.get(name);
  if (previous !== undefined && previous !== access) {
    throw new Error(
      `board tool ${name} is declared both ${previous} and ${access}; one definition must be wrong`,
    );
  }
  declared.set(name, access);
}

/**
 * The access class of one tool, or undefined when it is not a board tool.
 * The guard uses undefined as "not mine", which is how every non-aidos tool
 * passes through untouched.
 */
export function boardAccessOf(name: string): BoardAccess | undefined {
  return declared.get(name);
}

/**
 * Every declared board tool, or only those of one access class. Sorted so a
 * deny list is stable across reads (the mask hands this to `restrict`, and
 * an unstable list would churn the runtime restriction every render).
 */
export function boardToolNames(access?: BoardAccess): string[] {
  const names: string[] = [];
  for (const [name, kind] of declared) {
    if (access === undefined || kind === access) names.push(name);
  }
  return names.sort();
}
