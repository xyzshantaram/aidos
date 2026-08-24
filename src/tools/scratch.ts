/**
 * The scratch workspace tools: four model-facing tools that read, write, edit,
 * and mkdir under the session workspace's scratch root. SPEC plan ticket T5
 * (2026-08-24) is the contract.
 *
 * The scratch root is `dshHomePath("aidos", "scratch", <workspaceKey>)` where
 * the workspace key is the canonical key of the session's cwd. The agent writes
 * here freely: no allowlist, no approval, no read-before-write gate — the
 * allowlist guard exempts the root.
 *
 * `scratch_edit` delegates to the resolved `edit` tool via the registry seam:
 * `ctx.tools.get("edit", scope)` + `ctx.tools.execute(input)`. The resolved
 * path is absolute, so the builtin edit (and the hashline edit, when present)
 * inherit the path without re-resolving.
 */

import { isAbsolute, join } from "path";
import { mkdirSync } from "fs";

import { HarnessError } from "@deepseek-ai/dsh-llm";
import type { Context } from "@deepseek-ai/cordis";
import type { Agent } from "@deepseek-ai/dsh-agent";
import { defineTool } from "@deepseek-ai/dsh-tools";
import type { ToolRunContext } from "@deepseek-ai/dsh-tools";
import { dshHomePath } from "@deepseek-ai/dsh-home-paths";
import { workspaceKeyFromPath } from "../kernel/slug";

/** The scratch root for one workspace's canonical key. */
export function scratchRootForAgent(agent: Agent | undefined): string {
  const cwd = agent?.session?.header?.cwd;
  if (!cwd) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "no_workspace_cwd", message: "the session has no cwd; scratch requires a workspace" }),
      "AIDOS_NO_WORKSPACE_CWD",
    );
  }
  const workspaceKey = workspaceKeyFromPath(cwd);
  return dshHomePath("aidos", "scratch", workspaceKey);
}

/**
 * Resolve one user-supplied path against the scratch root. Relative paths land
 * under the root; absolute paths must equal or sit beneath it; escape attempts
 * (`../` climbing out, or an absolute path outside the root) are refused.
 */
export function resolveScratchPath(root: string, path: string): string {
  if (path.length === 0) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "empty_path", message: "scratch path must not be empty" }),
      "AIDOS_SCRATCH_EMPTY_PATH",
    );
  }
  const normalized = isAbsolute(path) ? path : join(root, path);
  if (normalized !== root && !normalized.startsWith(root + "/")) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "path_escape", message: `scratch path must stay under ${root}` }),
      "AIDOS_SCRATCH_PATH_ESCAPE",
    );
  }
  return normalized;
}

/** The calling agent is the current session's workspace owner, so scratch does not check orchestrator depth. */
function callingAgent(exec: ToolRunContext): Agent {
  const agent = exec.agent;
  if (!agent) {
    throw new HarnessError(
      JSON.stringify({
        ok: false,
        error: "agent_required",
        message: "the scratch tools require a calling agent",
      }),
      "AIDOS_AGENT_REQUIRED",
    );
  }
  return agent;
}

/** One JSON-text render for the scratch tool results. */
function renderJson(_args: unknown, value: unknown) {
  return [{ type: "text" as const, text: JSON.stringify(value) }];
}

export function registerScratchTools(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "scratch_read",
      description:
        "Read one file under the session workspace's scratch root. A relative path resolves against the scratch root; an absolute or `../` path that escapes it is refused.",
      parameters: {
        path: { type: "string", required: true, description: "The file to read, relative to the scratch root or absolute under it." },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            path: { type: "string", required: true },
            scratch_root: { type: "string", required: true },
            content: { type: "string", required: true },
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = callingAgent(exec);
        const root = scratchRootForAgent(agent);
        const absPath = resolveScratchPath(root, args.path);
        const target = await ctx.fs!.resolve(absPath, { signal: exec.signal });
        const content = await ctx.fs!.readText(target, exec.signal);
        return { ok: true, path: absPath, scratch_root: root, content };
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "scratch_write",
      description:
        "Write one file under the session workspace's scratch root. A relative path resolves against the scratch root; an absolute or `../` path that escapes it is refused. The agent writes freely here: no allowlist membership is required.",
      parameters: {
        path: { type: "string", required: true, description: "The file to write, relative to the scratch root or absolute under it." },
        content: { type: "string", required: true, description: "The full UTF-8 text content to write." },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            path: { type: "string", required: true },
            scratch_root: { type: "string", required: true },
            operation: { type: "string", enum: ["create", "update"] as const, required: true },
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = callingAgent(exec);
        const root = scratchRootForAgent(agent);
        const absPath = resolveScratchPath(root, args.path);
        const target = await ctx.fs!.resolve(absPath, { signal: exec.signal });
        const outcome = await ctx.fs!.writeText(target, args.content, undefined, exec.signal);
        return { ok: true, path: absPath, scratch_root: root, operation: outcome.operation };
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "scratch_edit",
      description:
        "Edit one file under the session workspace's scratch root by delegating to the `edit` tool. Accepts the same edit arguments (old_string, new_string, replace_all) plus a scratch-relative path. The path is resolved to an absolute path under the scratch root and forwarded to `edit` as file_path.",
      parameters: {
        path: { type: "string", required: true, description: "The file to edit, relative to the scratch root or absolute under it." },
        old_string: { type: "string", required: true, description: "The literal text to replace." },
        new_string: { type: "string", required: true, description: "The literal replacement text." },
        replace_all: { type: "boolean", description: "When true, replace every match instead of requiring exactly one." },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            path: { type: "string", required: true },
            scratch_root: { type: "string", required: true },
            message: { type: "string", required: true },
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = callingAgent(exec);
        const root = scratchRootForAgent(agent);
        const absPath = resolveScratchPath(root, args.path);

        // Delegate to the resolved edit tool through the registry seam.
        const editDef = ctx.tools.get("edit", agent);
        if (!editDef) {
          throw new HarnessError(
            JSON.stringify({ ok: false, error: "edit_tool_unavailable", message: "the edit tool is not registered in this scope" }),
            "AIDOS_EDIT_TOOL_UNAVAILABLE",
          );
        }

        const delegated = await ctx.tools.execute({
          callId: exec.callId,
          rootCallId: exec.rootCallId,
          name: "edit",
          arguments: {
            file_path: absPath,
            old_string: args.old_string,
            new_string: args.new_string,
            replace_all: args.replace_all,
          },
          agent: exec.agent,
          parent: exec.token,
          signal: exec.signal,
        });

        if (delegated.isError) {
          const code = delegated.error.info?.code;
          const message = delegated.error.message ?? "edit delegation failed";
          throw new HarnessError(
            JSON.stringify({ ok: false, error: "edit_delegation_failed", code, message }),
            code ?? "AIDOS_EDIT_DELEGATION_FAILED",
          );
        }

        // The delegated edit returns content blocks; surface the first as a message.
        const content = delegated.content[0];
        const message = content && content.type === "text" ? content.text : "edited";

        return { ok: true, path: absPath, scratch_root: root, message };
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "scratch_mkdir",
      description:
        "Create a directory under the session workspace's scratch root. A relative path resolves against the scratch root; an absolute or `../` path that escapes it is refused.",
      parameters: {
        path: { type: "string", required: true, description: "The directory to create, relative to the scratch root or absolute under it." },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            path: { type: "string", required: true },
            scratch_root: { type: "string", required: true },
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = callingAgent(exec);
        const root = scratchRootForAgent(agent);
        const absPath = resolveScratchPath(root, args.path);
        mkdirSync(absPath, { recursive: true });
        return { ok: true, path: absPath, scratch_root: root };
      },
    }),
  );
}
