/**
 * The bash-ask listener. A tools/pre-execute listener returns `ask` for
 * the bash tool while any ticket awaits verification. Approval outcomes
 * are one-shot, so each call asks again. SPEC-B1.md sections 4b and 4
 * are the contract.
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
      if (states.has("awaiting_verification")) {
        // ask resolves through the approval seam; each call asks again.
        return Promise.resolve({ kind: "ask", reason: BASH_ASK_REASON });
      }
      return next();
    },
    { prepend: true },
  );
}
