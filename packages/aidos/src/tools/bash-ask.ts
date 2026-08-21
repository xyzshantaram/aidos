/**
 * The bash-ask listener. A tools/pre-execute listener returns `ask` for
 * the bash tool while a ticket awaits verification. Approval outcomes
 * are one-shot, so each call asks again. SPEC-B1.md sections 4b and 4
 * are the contract.
 *
 * The ask is scoped to `awaiting_verification` ALONE. A concurrent
 * in-progress ticket suppresses it: a bash call carries no ticket id, so
 * the harness cannot bill the ask to the right ticket.
 */

import type { Context } from "@deepseek-ai/cordis";

/** The reason every bash call carries while a ticket awaits verification. */
export const BASH_ASK_REASON =
  "a ticket awaits verification, so this bash call needs approval before it runs";

/** Register the pre-execute listener on a context. Returns the disposer. */
export function installBashAskListener(ctx: Context): () => void {
  return ctx.on(
    "tools/pre-execute",
    (exec, next) => {
      if (exec.name !== "bash" || !exec.agent) return next();
      const aidos = ctx.aidos;
      if (!aidos) return next();
      const states = new Set(aidos.ticketStates(exec.agent));
      // Ask only when awaiting_verification is the sole relevant state.
      // A concurrent in-progress ticket suppresses the ask, because a bash
      // call carries no ticket id and the harness could not bill the ask.
      if (states.has("awaiting_verification") && !states.has("in_progress")) {
        // ask resolves through the approval seam; each call asks again.
        return Promise.resolve({ kind: "ask", reason: BASH_ASK_REASON });
      }
      return next();
    },
    { prepend: true },
  );
}
