/**
 * The monotonic guard and the delegation-depth check for the board tools.
 *
 * #146 changed WHAT it refuses. A subagent that calls a board tool that
 * WRITES — set_ticket, attach_evidence, move_ticket, plan_import,
 * plan_meta_set, request_allowlist, suggest_actions — is refused; the
 * refusal says the orchestrator is the only actor that may do it. A
 * subagent that READS — get_tickets, get_ticket, plan, plan_meta — passes.
 * Reviewers must be able to read the ticket they are reviewing; refusing
 * that produced reviews written against a pasted summary instead of the
 * board's own criteria. SPEC-B1.md sections 4b and 8 are the contract for
 * the write half, which is unchanged.
 *
 * Which class a tool belongs to is NOT a list here: every board tool
 * declares its own access where it is defined (see `board-access.ts`), and
 * this guard reads that declaration. A tool with no declaration is not a
 * board tool and passes through.
 *
 * The guard is registered through the tools registry, so it is evaluated at
 * call time for every board-tool call — a mid-turn state change cannot
 * unlock a call that already started. Guards have no allow result, so a
 * denial cannot turn back into permission (monotonic).
 */

import type { Context } from "@deepseek-ai/cordis";
import { delegationDepthOf } from "@deepseek-ai/dsh-subagent";
import { boardAccessOf, boardToolNames } from "./board-access";
import { isAidosAgent } from "./preset-gate";

/*
 * There is deliberately no `boardTools()` re-export here.
 *
 * #146 shipped one, reasoning it would be handy for the toolFilter tests;
 * nothing ever imported it, because every caller wants a SIDE of the split
 * (`boardToolNames("write")` to deny, `boardToolNames("read")` to leave
 * alone) rather than the undivided list. A re-export that hands out the
 * whole set is a small invitation to deny all of it again, which is the
 * bug this file was rewritten to fix. Import `boardToolNames` from
 * board-access directly.
 */

/** The denial text the guard and the tool bodies both use. */
export const ORCHESTRATOR_ONLY_MESSAGE =
  "the orchestrator is the only actor that may WRITE to the board; a subagent may read it (get_tickets, get_ticket, plan, plan_meta) but never change it";

/** Register the guard on a context. Returns the disposer. */
export function installAidosGuard(ctx: Context): () => void {
  return ctx.tools.guard((execution) => {
    const access = boardAccessOf(execution.name);
    // Not a board tool at all: nothing to say about it.
    if (access === undefined) return undefined;
    const agent = execution.agent;
    if (!agent) return "the board tools require a calling agent";
    // The guard is process-global (standing mount): a non-aidos agent has no
    // board tools to delegate in the first place, so let its calls pass.
    if (!isAidosAgent(ctx, agent)) return undefined;
    // #146: reads are open to every depth. The board is the reviewer's
    // source of truth, and a read cannot corrupt it.
    if (access === "read") return undefined;
    if (delegationDepthOf(agent) !== 0) {
      return ORCHESTRATOR_ONLY_MESSAGE;
    }
    return undefined;
  });
}
