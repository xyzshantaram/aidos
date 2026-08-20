/**
 * The per-ticket allowlist guard. The write boundary enforces the union
 * of the in-progress tickets' allowlists; a write outside the union is
 * refused and names the in-progress ticket whose allowlist would need to
 * cover it. Subagents get the same path predicate as a child-scope guard.
 * SPEC-B1.md sections 4b and 4 are the contract.
 */

import type { Context } from "@deepseek-ai/cordis";
import type { ToolGuard } from "@deepseek-ai/dsh-tools";
import type { TicketView } from "../kernel/projections";

/** The fs write tools the write boundary guards. */
const WRITE_TOOLS = new Set<string>(["write", "edit"]);

/** The fs path tools the child-scope guard covers. */
const PATH_TOOLS = new Set<string>(["read", "write", "edit"]);

/** Whether one target path sits under one of the allowed roots. */
function pathAllowed(target: string, roots: readonly string[]): boolean {
  const normalized = target.replace(/\/+$/, "");
  for (const root of roots) {
    const base = root.replace(/\/+$/, "");
    if (base === "") continue;
    if (normalized === base || normalized.startsWith(base + "/")) return true;
  }
  return false;
}

/** The file_path a fs tool call carries, when it is a non-empty string. */
function readPathArgument(args: unknown): string | undefined {
  if (typeof args !== "object" || args === null) return undefined;
  const path = (args as Record<string, unknown>).file_path;
  return typeof path === "string" && path.length > 0 ? path : undefined;
}

/**
 * Register the write-union guard on a context. Returns the disposer.
 *
 * The guard is monotonic (tools.guard): a write to a path outside the union
 * of the in-progress tickets' allowlists is refused at call time, naming the
 * in-progress ticket whose allowlist would need to cover it.
 */
export function installAllowlistGuard(ctx: Context): () => void {
  return ctx.tools.guard((execution) => {
    if (!WRITE_TOOLS.has(execution.name)) return undefined;
    const agent = execution.agent;
    if (!agent) return undefined;
    const path = readPathArgument(execution.arguments);
    if (path === undefined) return undefined;
    const union = ctx.aidos?.allowlistUnion(agent) ?? [];
    if (pathAllowed(path, union)) return undefined;
    // Name the in-progress ticket whose allowlist would need to cover it.
    let rows: TicketView[] = [];
    try {
      rows = ctx.aidos ? ctx.aidos.getTickets(agent) : [];
    } catch {
      rows = [];
    }
    const inProgress = rows.filter((row) => row.state === "in_progress");
    if (inProgress.length === 0) {
      return `write to ${path} is outside the allowlist union; no in-progress ticket allowlist covers it`;
    }
    const ticket = inProgress[0];
    return `write to ${path} is outside the allowlist of in-progress ticket ${ticket.id}; extend that ticket's allowlist to cover this path`;
  });
}

/**
 * The child-scope path guard. Enforces a dir or file allowlist on a
 * subagent's read/write/edit; a refusal names the allowed root.
 * Register it through the child's `agent.ctx` so it applies to that child
 * only.
 */
export function childPathScope(allowed: string[]): ToolGuard {
  return (execution) => {
    if (!PATH_TOOLS.has(execution.name)) return undefined;
    const path = readPathArgument(execution.arguments);
    if (path === undefined) return undefined;
    if (pathAllowed(path, allowed)) return undefined;
    const roots = allowed.length > 0 ? allowed.join(", ") : "(none)";
    return `path ${path} is outside the allowed root (allowed: ${roots})`;
  };
}
