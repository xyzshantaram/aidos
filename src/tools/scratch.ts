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

import { isAbsolute, relative, resolve } from "node:path";
import { mkdirSync } from "node:fs";

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
  const candidate = resolve(root, path);
  const rel = relative(root, candidate);
  // Windows: rel may use backslash; normalize before parent-escape check.
  const norm = rel.replace(/\\/g, "/");
  if (rel !== "" && (norm.startsWith("../") || norm === ".." || isAbsolute(rel))) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "path_escape", message: `scratch path must stay under ${root}` }),
      "AIDOS_SCRATCH_PATH_ESCAPE",
    );
  }
  return candidate;
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

/** Resolve the fs service or throw a structured HarnessError. Harnesses provide it as ctx.fs; production via ctx.get. */
function requireFs(ctx: Context): { resolve: (p: string, opts?: unknown) => Promise<unknown>; readText: (t: unknown, signal?: AbortSignal) => Promise<string>; writeText: (t: unknown, content: string, u: unknown, signal?: AbortSignal) => Promise<{ operation: string }> } {
  let direct: unknown;
  try {
    // Cordis throws on an undeclared service property instead of returning
    // undefined, so this probe must not run before the get() fallback (#54).
    direct = (ctx as unknown as { fs?: unknown }).fs;
  } catch {
    direct = undefined;
  }
  if (direct) return direct as never;
  const viaGet = (ctx as unknown as { get?: (k: string) => unknown }).get?.call(ctx, "fs");
  if (viaGet) return viaGet as never;
  throw new HarnessError(
    JSON.stringify({ ok: false, error: "fs_unavailable", message: "fs service not available" }),
    "AIDOS_FS_UNAVAILABLE",
  );
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
        ctx.logger?.info?.(`aidos: scratch_read called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: scratch_read path ${args.path}`);
        const root = scratchRootForAgent(agent);
        const absPath = resolveScratchPath(root, args.path);
        // Delegate to the resolved read tool when present, so the content
        // rides the session's read grammar — hashline anchors included —
        // and scratch_edit accepts them (T5). Falls back to raw fs text.
        const readDef = ctx.tools.get("read", agent);
        if (readDef) {
          const delegated = await ctx.tools.execute({
            callId: exec.callId,
            rootCallId: exec.rootCallId,
            name: "read",
            arguments: { file_path: absPath },
            agent: exec.agent,
            parent: exec.token,
            signal: exec.signal,
          });
          if (!delegated.isError) {
            const first = delegated.content[0];
            const text = first && first.type === "text" ? first.text : "";
            return { ok: true, path: absPath, scratch_root: root, content: text };
          }
        }
        const fs = requireFs(ctx);
        const target = await fs.resolve(absPath, { signal: exec.signal });
        const content = await fs.readText(target, exec.signal);
        ctx.logger?.info?.(`aidos: scratch_read read ${absPath}`);
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
        ctx.logger?.info?.(`aidos: scratch_write called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: scratch_write path ${args.path}, content length ${args.content.length}`);
        const root = scratchRootForAgent(agent);
        const absPath = resolveScratchPath(root, args.path);
        const fs = requireFs(ctx);
        const target = await fs.resolve(absPath, { signal: exec.signal });
        const outcome = await fs.writeText(target, args.content, undefined, exec.signal);
        ctx.logger?.info?.(`aidos: scratch_write ${outcome.operation} ${absPath}`);
        return { ok: true, path: absPath, scratch_root: root, operation: outcome.operation as "create" | "update" };
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
        old_string: { type: "string", description: "Literal-edit grammar: the text to replace. Omit when using edits." },
        new_string: { type: "string", description: "Literal-edit grammar: the replacement text." },
        replace_all: { type: "boolean", description: "Literal-edit grammar: replace every match." },
        edits: { type: "array", items: { type: "array" }, description: "Anchor-edit grammar: [[remove_from, remove_to, replacement_text], ...] with 3-char hashline anchors. Omit old_string/new_string when using edits." },
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
        ctx.logger?.info?.(`aidos: scratch_edit called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: scratch_edit path ${args.path}`);
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

        const delegatedArgs: Record<string, unknown> =
          Array.isArray(args.edits)
            ? { path: absPath, edits: args.edits }
            : {
                file_path: absPath,
                old_string: args.old_string,
                new_string: args.new_string,
              };
        if (!Array.isArray(args.edits) && args.replace_all !== undefined) {
          delegatedArgs.replace_all = args.replace_all;
        }
        const delegated = await ctx.tools.execute({
          callId: exec.callId,
          rootCallId: exec.rootCallId,
          name: "edit",
          arguments: delegatedArgs,
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
        ctx.logger?.info?.(`aidos: scratch_edit edited ${absPath}`);
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
        ctx.logger?.info?.(`aidos: scratch_mkdir called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: scratch_mkdir path ${args.path}`);
        const root = scratchRootForAgent(agent);
        const absPath = resolveScratchPath(root, args.path);
        // Run mkdir off the main thread so the signal can abort; prefer fs.mkdir if available.
        // #54: the property access must go through the same guarded probe as
        // requireFs — Cordis THROWS on an undeclared service property ("cannot
        // get property 'fs' without inject"), it does not return undefined, so
        // this bare read escaped the try/catch that every other scratch tool
        // wraps its fs access in.
        let fs: { mkdir?: (p: string, opts: unknown) => Promise<void> } | undefined;
        try {
          fs = (ctx as unknown as { fs?: { mkdir?: (p: string, opts: unknown) => Promise<void> } }).fs;
        } catch {
          fs = undefined;
        }
        if (fs?.mkdir) {
          await fs.mkdir(absPath, { recursive: true });
        } else {
          // Fallback: use node:fs but yield to event loop so abort signal is observable.
          await new Promise<void>((resolve, reject) => {
            if (exec.signal.aborted) return reject(exec.signal.reason);
            const onAbort = () => reject(exec.signal.reason);
            exec.signal.addEventListener("abort", onAbort, { once: true });
            try {
              mkdirSync(absPath, { recursive: true });
              exec.signal.removeEventListener("abort", onAbort);
              resolve();
            } catch (e) {
              exec.signal.removeEventListener("abort", onAbort);
              reject(e);
            }
          });
        }
        ctx.logger?.info?.(`aidos: scratch_mkdir created ${absPath}`);
        return { ok: true, path: absPath, scratch_root: root };
      },
    }),
  );
}
