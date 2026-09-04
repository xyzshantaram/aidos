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
 * The parameter names a registered tool actually accepts.
 *
 * `defineTool` COMPILES the parameter spec into a JSON Schema, so a
 * registered tool's `parameters` is `{type, properties, required}` and the
 * per-argument names live one level down under `properties`. Reading the top
 * level instead yields `["type", "properties", "required"]`, which matches no
 * argument name at all.
 *
 * That was not a near miss, it was total: `scratch_edit` decided every
 * grammar was unsupported and refused EVERY edit, with its own error message
 * printing `accepts: ["type","properties","required"]` -- the answer, in the
 * refusal, unread. The suite stayed green because the tests asserted the
 * source TEXT of this line rather than calling the tool.
 *
 * Uncompiled specs are tolerated too: a definition whose `parameters` has no
 * `properties` is read at the top level, so a hand-built definition (as a
 * test harness may register) still resolves. Exported so a test can assert
 * the reading against a real `defineTool` output rather than a string match.
 */
export function declaredParameters(definition: unknown): Record<string, unknown> {
  const parameters = (definition as { parameters?: unknown } | null)?.parameters;
  if (parameters === null || typeof parameters !== "object") return {};
  const properties = (parameters as { properties?: unknown }).properties;
  if (properties !== null && typeof properties === "object" && !Array.isArray(properties)) {
    return properties as Record<string, unknown>;
  }
  return parameters as Record<string, unknown>;
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
            /*
             * Whether the write went through the `write` TOOL, so the file
             * is registered as observed and a following scratch_edit will
             * be allowed to edit it.
             *
             * In-band because the warning for the fallback goes to
             * ctx.logger, which the MODEL NEVER SEES: the agent about to hit
             * FS_NOT_OBSERVED had no way to know. Declared here in the same
             * change that returns it -- a service returning a field its
             * schema does not declare is what made request_allowlist THROW
             * under additionalProperties: false (#104 follow-up), and that
             * is a mistake worth making only once.
             */
            observed: { type: "boolean", required: true },
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
        /*
         * OBSERVE an existing file before overwriting it, by delegating to
         * the `read` tool.
         *
         * This probed with the raw `fs.readText`, which emits no
         * `fs/observed`. That made the observation fix work for a CREATE and
         * fail for an overwrite: the write's intent for an unseen target is
         * `createIfAbsent`, which the fs layer refuses when the file already
         * exists ("cannot overwrite without reading it first"). The write
         * then fell through to raw fs, which records no observation either,
         * so the next scratch_edit hit FS_NOT_OBSERVED.
         *
         * Reachable in the ordinary case, not a corner: the scratch root
         * PERSISTS under dshHomePath, so any file left by an earlier session
         * takes this path. The manual test missed it because it tested a
         * create.
         *
         * The read also answers create-vs-update, so the separate raw probe
         * is gone: it materialised the whole file to compute a label, and its
         * bare `catch` reported "create" for an existing file that merely
         * failed to read (EACCES, EISDIR) -- and swallowed an abort.
         */
        const readDef = ctx.tools.get("read", agent);
        let existed = false;
        if (readDef) {
          const probe = await ctx.tools.execute({
            callId: exec.callId,
            rootCallId: exec.rootCallId,
            name: "read",
            arguments: { file_path: absPath },
            agent: exec.agent,
            parent: exec.token,
            signal: exec.signal,
          });
          existed = !probe.isError;
        }

        /*
         * #82: DELEGATE to the resolved `write` tool, the way scratch_read
         * already delegates to `read`.
         *
         * This wrote through fs.writeText directly, which bypassed the
         * OBSERVATION POLICY. The builtin write registers the file as
         * observed, so write-then-edit works; scratch_write did not, so
         * scratch_edit refused its own freshly written file with
         * FS_NOT_OBSERVED. Found by running the two in sequence during the
         * #82 audit -- the pair worked with the builtins and failed with the
         * scratch tools, which is exactly the parity this ticket is about.
         *
         * Falls back to raw fs when no `write` tool is registered, so the
         * scratch surface keeps working in a scope that has none.
         */
        const writeDef = ctx.tools.get("write", agent);
        if (writeDef) {
          const delegated = await ctx.tools.execute({
            callId: exec.callId,
            rootCallId: exec.rootCallId,
            name: "write",
            arguments: { file_path: absPath, content: args.content },
            agent: exec.agent,
            parent: exec.token,
            signal: exec.signal,
          });
          if (!delegated.isError) {
            /*
             * The write's OWN result is authoritative for create-vs-update
             * (the builtin returns `{path, operation, before, after}`); the
             * read probe is only the fallback for a backend that does not
             * report one.
             */
            const reported = (delegated.value as { operation?: unknown } | undefined)?.operation;
            const operation: "create" | "update" =
              reported === "create" || reported === "update"
                ? reported
                : existed
                  ? "update"
                  : "create";
            ctx.logger?.info?.(`aidos: scratch_write ${operation} ${absPath} (delegated)`);
            return { ok: true, path: absPath, scratch_root: root, operation, observed: true };
          }
          ctx.logger?.warn?.(
            `aidos: scratch_write delegation failed (${delegated.error.message ?? "unknown"}); falling back to raw fs -- the file will NOT be registered as observed, so a following scratch_edit may refuse it`,
          );
        } else {
          /*
           * No `write` tool in scope, which is the DEFAULT in the `open`
           * state: the mask exposes write/edit only while a ticket is in
           * progress, and the scratch tools sit outside that universe so they
           * stay available in every state.
           *
           * The raw path below records no observation, so it silently
           * reintroduces the bug this ticket fixed -- in the very state the
           * scratch workspace exists for. It must SAY so rather than degrade
           * quietly; a silent fallback is how the original defect survived.
           */
          ctx.logger?.warn?.(
            `aidos: scratch_write has no \`write\` tool in this scope (expected outside in_progress); writing through raw fs -- the file will NOT be registered as observed, so a following scratch_edit may refuse it`,
          );
        }

        const outcome = await fs.writeText(target, args.content, undefined, exec.signal);
        ctx.logger?.info?.(`aidos: scratch_write ${outcome.operation} ${absPath}`);
        return {
          ok: true,
          path: absPath,
          scratch_root: root,
          operation: outcome.operation as "create" | "update",
          observed: false,
        };
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

        /*
         * #82: pick the grammar the RESOLVED edit tool actually declares,
         * rather than assuming one.
         *
         * This hardcoded two shapes: `{path, edits}` for the anchor grammar
         * and `{file_path, old_string, new_string}` for the literal one,
         * chosen purely from what the CALLER passed. That was fine while
         * dsh-better-edit was mounted and accepted both. It is now dropped,
         * so a caller passing `edits` would forward arguments the default
         * edit tool does not understand -- a confusing downstream failure
         * instead of a clear refusal here.
         *
         * The tool definition carries its own parameter declaration, so the
         * shape is DETECTED. That also means the scratch tools follow
         * whatever edit backend is mounted, which is the property #82 wants:
         * better-edit can be remounted later and this adapts with no code
         * change.
         */
        const editParams = declaredParameters(editDef);
        const accepts = (key: string): boolean => Object.hasOwn(editParams, key);
        const wantsAnchors = Array.isArray(args.edits);
        const pathKey = accepts("file_path") ? "file_path" : "path";

        if (wantsAnchors && !accepts("edits")) {
          throw new HarnessError(
            JSON.stringify({
              ok: false,
              error: "edit_grammar_unsupported",
              message:
                "the resolved edit tool does not accept the anchor grammar (`edits`); use old_string/new_string instead",
              accepts: Object.keys(editParams),
            }),
            "AIDOS_EDIT_GRAMMAR_UNSUPPORTED",
          );
        }
        if (!wantsAnchors && !accepts("old_string")) {
          throw new HarnessError(
            JSON.stringify({
              ok: false,
              error: "edit_grammar_unsupported",
              message:
                "the resolved edit tool does not accept the literal grammar (`old_string`); use edits instead",
              accepts: Object.keys(editParams),
            }),
            "AIDOS_EDIT_GRAMMAR_UNSUPPORTED",
          );
        }

        /*
         * `old_string` and `new_string` are declared OPTIONAL on scratch_edit
         * because the anchor grammar does not use them -- so a caller can
         * reach this branch having passed neither, and this forwarded
         * `undefined` unconditionally. The real backend then does
         * `args.old_string.length`, which is a TypeError rather than a
         * refusal: a confusing downstream crash, which is precisely what the
         * grammar guard above exists to prevent. Refuse here instead.
         */
        if (!wantsAnchors && typeof args.old_string !== "string") {
          throw new HarnessError(
            JSON.stringify({
              ok: false,
              error: "edit_arguments_incomplete",
              message:
                "a literal edit needs `old_string` (and `new_string`); pass `edits` for the anchor grammar",
            }),
            "AIDOS_EDIT_ARGUMENTS_INCOMPLETE",
          );
        }

        const delegatedArgs: Record<string, unknown> = wantsAnchors
          ? { [pathKey]: absPath, edits: args.edits }
          : {
              [pathKey]: absPath,
              old_string: args.old_string,
              new_string: args.new_string ?? "",
            };
        if (!wantsAnchors && args.replace_all !== undefined && accepts("replace_all")) {
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
