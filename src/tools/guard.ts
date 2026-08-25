/**
 * The monotonic guard and the delegation-depth check for the board tools.
 * A subagent that calls any board tool is refused; the refusal says the
 * orchestrator is the only actor that may do it. SPEC-B1.md sections 4b
 * and 8 are the contract.
 *
 * The guard is registered through the tools registry, so it is evaluated at
 * call time for every board-tool call — a mid-turn state change cannot
 * unlock a call that already started. Guards have no allow result, so a
 * denial cannot turn back into permission (monotonic).
 */

import type { Context } from "@deepseek-ai/cordis";
import { delegationDepthOf } from "@deepseek-ai/dsh-subagent";
import { BOARD_TOOLS as SHARED_BOARD_TOOLS } from "./board-tools";

/** The six board tools. Shared by the guard and the tool bodies' re-check. */
export const BOARD_TOOLS = SHARED_BOARD_TOOLS;

const BOARD_TOOL_SET = new Set<string>(BOARD_TOOLS);

/** The denial text the guard and the tool bodies both use. */
export const ORCHESTRATOR_ONLY_MESSAGE =
  "the orchestrator is the only actor that may use the board tools; a subagent cannot";

/** Register the guard on a context. Returns the disposer. */
export function installAidosGuard(ctx: Context): () => void {
  return ctx.tools.guard((execution) => {
    if (!BOARD_TOOL_SET.has(execution.name)) return undefined;
    const agent = execution.agent;
    if (!agent) return "the board tools require a calling agent";
    if (delegationDepthOf(agent) !== 0) {
      return ORCHESTRATOR_ONLY_MESSAGE;
    }
    return undefined;
  });
}
