/**
 * The per-ticket allowlist guard. The write boundary enforces the union
 * of the in-progress tickets' allowlists; a write outside the union is
 * refused and names the in-progress ticket whose allowlist would need to
 * cover it. Subagents get the same path predicate as a child-scope guard.
 * SPEC-B1.md sections 4b and 4 are the contract.
 */

import type { Context } from "@deepseek-ai/cordis";
import type { Agent } from "@deepseek-ai/dsh-agent";
import type { FsTarget } from "@deepseek-ai/dsh-fs";
import type { ToolExecution, ToolGuard } from "@deepseek-ai/dsh-tools";
import { isAbsolute, join, relative, resolve } from "path";
import type { TicketView } from "../kernel/projections";
import { scratchRootForAgent } from "./scratch";

/** The fs path tools the child-scope guard covers. */
const PATH_TOOLS = new Set<string>(["read", "write", "edit"]);

/** The fs waterfall events the write boundary guards. */
const WRITE_INTENT = "fs/write-intent";
const EDIT_INTENT = "fs/edit-intent";

/** Whether one path sits under (or equals) a root, after both are normalized. */
function isUnder(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (!rel.startsWith("../") && rel !== ".." && !isAbsolute(rel));
}

/** Whether one target path sits under one of the allowed roots. */
function pathAllowed(target: string, roots: readonly string[]): boolean {
  for (const root of roots) {
    const base = root.replace(/\/+$/, "");
    if (base === "") continue;
    if (isUnder(base, target)) return true;
  }
  return false;
}

/** A write outside the allowlist union. The waterfall throws it to veto. */
export class FsWriteRefused extends Error {
  readonly code = "FS_WRITE_REFUSED";
  constructor(message: string) {
    super(message);
  }
}

/**
 * The write-boundary decision. Returns a refusal reason for a target path
 * that no in-progress ticket allowlist covers, naming the in-progress ticket
 * whose allowlist would need to cover it, or the absence of any in-progress
 * ticket. Returns undefined to allow the write.
 */
export function writeBoundaryReason(
  ctx: Context,
  agent: Agent | undefined,
  path: string,
): string | undefined {
  if (agent === undefined) return undefined;
  // Scratch root is exempt from the allowlist: the agent writes there freely.
  try {
    const scratchRoot = scratchRootForAgent(agent);
    if (isUnder(scratchRoot, path)) return undefined;
  } catch {
    // No scratch root (no cwd) → skip the exemption, fall through to union.
  }
  const union = ctx.aidos ? ctx.aidos.allowlistUnion(agent) : [];
  if (pathAllowed(path, union)) return undefined;
  // Name the in-progress ticket whose allowlist would need to cover it.
  let rows: TicketView[] = [];
  try {
    rows = ctx.aidos ? ctx.aidos.getTickets(agent) : [];
  } catch {
    rows = [];
  }
  // No tickets at all → standard session, no ticket machinery → pass through.
  if (rows.length === 0) return undefined;
  const inProgress = rows.filter((row) => row.state === "in_progress");
  if (inProgress.length === 0) {
    return `write to ${path} is outside the allowlist union; no in-progress ticket allowlist covers it`;
  }
  const ticket = inProgress[0];
  return `write to ${path} is outside the allowlist of in-progress ticket ${ticket.id}; extend that ticket's allowlist to cover this path`;
}

/**
 * The one waterfall listener the write boundary installs on both fs intents.
 * When the target path is outside the union it throws; the throw vetoes the
 * rest of the waterfall chain including the observation-policy bookkeeping.
 * When the path is allowed it calls `next()` so that bookkeeping still runs.
 */
function fsIntentListener(
  ctx: Context,
  target: FsTarget,
  actor: object | undefined,
  next: () => unknown,
): unknown {
  const agent = (actor as { agent?: Agent } | undefined)?.agent;
  const reason = writeBoundaryReason(ctx, agent, target.displayPath);
  if (reason !== undefined) {
    throw new FsWriteRefused(reason);
  }
  return next();
}

/**
 * Register the write-union guard on a context. Returns the disposer.
 *
 * The guard registers prepended on the `fs/write-intent` and
 * `fs/edit-intent` waterfalls, which the builtin fs tools (`write`/`edit`)
 * and the hashline editors (`path`/`batch_edit`/`undo_last_edit`) both
 * funnel through. `{ prepend: true }` is load-bearing: the guard must run
 * before the observation-policy listener so a refused write never starts,
 * and an allowed write calls `next()` so that listener still does its
 * staleness bookkeeping.
 */
export function installAllowlistGuard(ctx: Context): () => void {
  // Capture the owning session at registration time. During apply(ctx) the
  // current initiator is the agent whose preset is being mounted. The
  // listener compares every write's agent session against this reference;
  // writes from other sessions (including standard sessions) pass through
  // immediately without calling into the aidos service.
  const ownSession = ctx.get("agents")?.currentInitiator()?.session;

  const listener = (target: FsTarget, actor: object | undefined, next: () => unknown) => {
    if (ownSession !== undefined) {
      const agent = (actor as { agent?: Agent } | undefined)?.agent;
      if (agent !== undefined && agent.session !== ownSession) return next();
    }
    return fsIntentListener(ctx, target, actor, next);
  };
  const on = ctx.on as unknown as (
    name: string,
    listener: (target: FsTarget, actor: object | undefined, next: () => unknown) => unknown,
    opts?: { prepend?: boolean },
  ) => () => void;
  const writeDisposer = on(WRITE_INTENT, listener, { prepend: true });
  const editDisposer = on(EDIT_INTENT, listener, { prepend: true });
  return () => {
    writeDisposer();
    editDisposer();
  };
}

/**
 * The child-scope path guard. Enforces a dir or file allowlist on a
 * subagent's read/write/edit; a refusal names the allowed root.
 * Register it through the child's `agent.ctx` so it applies to that child
 * only.
 */
export function childPathScope(allowed: string[]): ToolGuard {
  return (execution) => {
    if (execution.name === "bash") {
      return bashWorkdirClamp(execution, allowed);
    }
    if (!PATH_TOOLS.has(execution.name)) return undefined;
    const path = readPathArgument(execution.arguments);
    if (path === undefined) return undefined;
// Scratch root is always allowed in addition to the caller's scope.
    const extra: string[] = [];
    try {
      extra.push(scratchRootForAgent(execution.agent));
    } catch {
      // No cwd → no scratch root → skip the exemption.
    }
    if (pathAllowed(path, [...allowed, ...extra])) return undefined;
    const roots = allowed.length > 0 ? allowed.join(", ") : "(none)";
    return `path ${path} is outside the allowed root (allowed: ${roots})`;
  };
}

/**
 * The bash half of the child scope. A child scoped to a sub-tree cannot
 * reach outside the scope through `sed -i`, so aidos clamps the bash
 * WORKDIR to the allowed roots. This stops the workdir, not an absolute
 * path inside the command string, so it narrows the hole rather than
 * closing it.
 */
function bashWorkdirClamp(execution: ToolExecution, allowed: string[]): string | undefined {
  const sessionCwd =
    (execution.agent as
      | { session?: { header?: { cwd?: string } } }
      | undefined)?.session?.header?.cwd;
  const raw = readWorkdirArgument(execution.arguments);
  // Mirror dsh-tool-bash's resolveWorkdir: a missing workdir runs at the
  // session cwd, a relative one resolves against it, an absolute one passes through.
  const workdir =
    raw === undefined
      ? sessionCwd
      : sessionCwd !== undefined && !isAbsolute(raw)
        ? join(sessionCwd, raw)
        : raw;
  if (workdir === undefined) return undefined;
  // Put the relative roots in the same absolute frame as the workdir.
  const roots =
    sessionCwd !== undefined
      ? allowed.map((root) => (isAbsolute(root) ? root : join(sessionCwd, root)))
      : allowed;
  // Scratch root is also an allowed bash workdir.
  try {
    roots.push(scratchRootForAgent(execution.agent));
  } catch {
    // No cwd → no scratch root → skip the exemption.
  }
  if (pathAllowed(workdir, roots)) return undefined;
  const shown = allowed.length > 0 ? allowed.join(", ") : "(none)";
  return `workdir ${workdir} is outside the allowed root (allowed: ${shown})`;
}

/** The file_path a fs tool call carries, when it is a non-empty string. */
function readPathArgument(args: unknown): string | undefined {
  if (typeof args !== "object" || args === null) return undefined;
  const path = (args as Record<string, unknown>).file_path;
  return typeof path === "string" && path.length > 0 ? path : undefined;
}

/** The workdir a bash call carries, when it is a non-empty string. */
function readWorkdirArgument(args: unknown): string | undefined {
  if (typeof args !== "object" || args === null) return undefined;
  const workdir = (args as Record<string, unknown>).workdir;
  return typeof workdir === "string" && workdir.length > 0 ? workdir : undefined;
}
