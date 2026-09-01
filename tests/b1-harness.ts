/**
 * The B1 harness: a test double of the dsh context, so the six agent tools,
 * the guard, the masks, the bash-ask listener, and the log-backed service run
 * without a real dsh instance.
 *
 * SPEC-B1.md section 9 (the test plan) and section 5 (the dsh call shapes)
 * are the contract. The harness captures every registration the wiring makes
 * (tools, guards, restrictions, pre-execute listeners, prompt sections,
 * projection units, invariant installers, settings namespaces) and serves a
 * folded session log, so the tests drive the REAL AidosService and the REAL
 * installers through the exact seams the SPEC pins.
 *
 * The harness constructs the real `AidosService` over the fake session
 * (`new AidosService(ctx, config)`) so the C2 evaluate — replay produces
 * identical state, and no code path outside the write boundary can set an
 * author — runs against real logic. Construction is explicit
 * (`harness.installService()` / the lazy `harness.service` getter) so a test
 * can seed the session log before the service folds it.
 *
 * The service reads plan files through `node:fs` (resolved under the session
 * workspace root), so the plan_import tests write real temporary files.
 */

import { expect } from "vitest";

import type { Context } from "@deepseek-ai/cordis";
import type { Agent } from "@deepseek-ai/dsh-agent";
import { CallId, HarnessError } from "@deepseek-ai/dsh-llm";
import type { ContentBlock, ToolSchema, UserMessage } from "@deepseek-ai/dsh-llm";
import { SessionId } from "@deepseek-ai/dsh-session";
import type { Session, SessionEvent, SessionHeader, SessionId as SessionIdType } from "@deepseek-ai/dsh-session";
import { delegationDepthOf } from "@deepseek-ai/dsh-subagent";
import { defineTool } from "@deepseek-ai/dsh-tools";
import type {
  PreToolDecision,
  ToolDefinition,
  ToolExecution,
  ToolExecutionInput,
  ToolExecutionResult,
  ToolExecutionToken,
  ToolGuard,
  ToolRestriction,
  ToolRunContext,
} from "@deepseek-ai/dsh-tools";
import type { FsTarget } from "@deepseek-ai/dsh-fs";

import { AidosService } from "../src/host/aidos-core";
import type { AidosCoreConfig } from "../src/host/aidos-core";
import { DEFAULT_CONFIG } from "../src/kernel/constants";
import type { AidosEvent } from "../src/kernel/events";
import type { Store } from "../src/kernel/store";
import type { AidosConfig } from "../src/kernel/types";

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The six board tools. The guard and the tier table both name them. */
export const SIX_TOOLS = [
  "get_tickets",
  "set_ticket",
  "attach_evidence",
  "move_ticket",
  "plan",
  "plan_import",
] as const;

/** The five builtin kinds the agent may author, from the B0 constant table. */
export const AGENT_AUTHORABLE_KINDS = [
  "builtin:automated_check",
  "builtin:after_shot",
  "builtin:test_run",
  "builtin:review_note",
  "builtin:review_pass",
] as const;

/** The two builtin kinds only a human may supply. */
export const HUMAN_ONLY_KINDS = [
  "builtin:user_signoff",
  "builtin:user_verified",
] as const;

// ---- the fake session ----

/**
 * The session the service reads and appends to. `events` is the folded log,
 * `append` records one event and notifies the captured `internal/dispatch`
 * then `session/event` listeners, mirroring the real session store's
 * post-commit firehose (the invariant companion stages its fold on
 * `internal/dispatch` and commits on `session/event`).
 */
export interface FakeSession {
  readonly id: SessionIdType;
  readonly header: SessionHeader;
  /** An immutable snapshot of the append-only event log. */
  readonly events: readonly SessionEvent[];
  /** The next event's sequence number — always the log length. */
  readonly seq: number;
  /** Append one typed event. Mirrors `Session.append`. */
  append(type: string, data: unknown): SessionEvent;
  /** Harness-only: push a fully formed event verbatim (test injection). */
  appendRaw(event: SessionEvent): void;
}

/**
 * The fake Agent the harness hands to the tools and the service. Structural
 * superset of `Agent` (the extra members are the harness's own bookkeeping),
 * so `h.asAgent()` is a plain cast.
 */
export interface FakeAgent {
  readonly id: SessionIdType;
  readonly options: { subagentDepth?: number };
  readonly session: FakeSession;
  readonly status: "running";
  ctx: FakeAgentCtx;
  /** The stubs below make the fake a structural `Agent`. */
  readonly inbox: unknown;
  cancel(): void;
  whenIdle(): Promise<void>;
  runMaintenance(): Promise<unknown>;
  send(): void;
  followup(): void;
  steer(): void;
  inject(): void;
}

/** The agent-scoped context: `tools.restrict` records the calling scope. */
export interface FakeAgentCtx {
  tools: FakeTools;
  on(
    type: string,
    listener: (...args: unknown[]) => unknown,
    opts?: { prepend?: boolean; global?: boolean },
  ): () => void;
  get(name: string): unknown;
  systemPrompt: { section(section: PromptSection): void };
}

/** The fake tools service: captures registrations and restrictions. */
export interface FakeTools {
  register(def: ToolDefinition): () => void;
  get(name: string): ToolDefinition | undefined;
  guard(guard: ToolGuard): () => void;
  restrict(filter: ToolRestriction): () => void;
  schemas(scope?: unknown): ToolSchema[];
  execute(exec: ToolExecutionInput): Promise<ToolExecutionResult>;
}

/** The in-memory fake fs: resolves paths, reads and writes text. */
export interface FakeFs {
  resolve(path: string, opts?: { cwd?: string; signal?: AbortSignal }): Promise<FsTarget>;
  readText(target: FsTarget, signal?: AbortSignal): Promise<string>;
  writeText(
    target: FsTarget,
    content: string,
    expected?: unknown,
    signal?: AbortSignal,
  ): Promise<{ operation: "create" | "update"; version: unknown }>;
  /** Direct test hook: the current content at one resolved path. */
  contentOf(path: string): string | undefined;
}

/** One `systemPrompt.section` registration. */
export interface PromptSection {
  name: string;
  order?: number;
  text: string;
}

/** One captured `ctx.on` listener. */
export interface CapturedListener {
  type: string;
  listener: (...args: unknown[]) => unknown;
  opts?: { prepend?: boolean; global?: boolean };
  /** The scope the listener was registered on. */
  scope: string;
}

/** One captured `ctx.tools.restrict` call. */
export interface RestrictionRecord {
  filter: ToolRestriction;
  /** "root" or "agent:<id>" — the calling scope. */
  scope: string;
  active: boolean;
  at: number;
}

/** One captured projection unit registration. */
export interface ProjectionRegistration {
  key: string;
  definition: {
    init(): unknown;
    apply(state: unknown, event: SessionEvent): unknown;
    view(state: unknown): unknown;
    stateVersion: number;
  };
}

/** One captured invariant installer. */
export interface InvariantRegistration {
  packageName: string;
  installer: (invCtx: Context, fail: (message: string) => never) => void | Promise<void>;
}

/** One captured settings namespace registration. */
export interface SettingsRegistration {
  namespace: string;
  schema: unknown;
  options: unknown;
}

/** The approval seam `ctx.get("approval")` resolves to. */
export interface FakeApproval {
  request: (
    req: unknown,
  ) => Promise<"allowed-once" | "rejected" | "cancelled" | "unavailable">;
}

/** A controllable workspace record. */
export interface FakeWorkspace {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sessionIds: readonly SessionIdType[];
  setTitle(title: string): Promise<void>;
}

/** The one normalized outcome of `Harness.runTool`. */
export interface ToolOutcome {
  isError: boolean;
  /** Present only on success: the canonical value execute returned. */
  value?: unknown;
  /** The rendered content blocks, mirroring the registry's materialization. */
  content: ContentBlock[];
  /** Present only on failure: the registry-shaped error projection. */
  error?: { message: string; info?: { name: string; code: string } };
  deferred: UserMessage[];
  concluded: boolean;
}

/** One execution with the harness's capture channels attached. */
export type ExecWithCapture = ToolRunContext & {
  deferred: UserMessage[];
  concluded: { value: boolean };
};

// ---- helpers the test files share ----

/** Cast the harness context to the cordis `Context` the installers take. */
export function asContext(ctx: HarnessCtx): Context {
  return ctx as unknown as Context;
}

/** Assert one run succeeded and return its rendered JSON object. */
export function successJson(outcome: ToolOutcome): Record<string, unknown> {
  expect(outcome.isError).toBe(false);
  const block = outcome.content[0] as { type: "text"; text: string } | undefined;
  expect(block?.type).toBe("text");
  const text = block?.text ?? "";
  const parsed = JSON.parse(text) as Record<string, unknown>;
  expect(parsed).toBeTypeOf("object");
  return parsed;
}

/** Assert one run failed and return its registry-shaped error. */
export function failureOf(outcome: ToolOutcome): { code?: string; message: string } {
  expect(outcome.isError).toBe(true);
  expect(outcome.error).toBeDefined();
  const message = outcome.error?.message ?? "";
  // A structured refusal is never a traceback: no stack frames in the message.
  expect(message).not.toMatch(/\n\s+at /);
  return { code: outcome.error?.info?.code, message };
}

/** Assert one run failed with the given refusal code and return the message. */
export function failureWithCode(outcome: ToolOutcome, code: string): string {
  const failure = failureOf(outcome);
  expect(failure.code).toBe(code);
  return failure.message;
}

/** Parse one failure's message as the structured refusal JSON object. */
export function failureJson(outcome: ToolOutcome): Record<string, unknown> {
  const failure = failureOf(outcome);
  const parsed = JSON.parse(failure.message) as Record<string, unknown>;
  expect(parsed).toBeTypeOf("object");
  return parsed;
}

/**
 * The tier predicate over one restriction filter. Works whether the mask
 * expresses a tier as `allow` (keep only) or `deny` (remove).
 */
export function filterAllows(filter: ToolRestriction, toolName: string): boolean {
  if (filter.allow && !filter.allow.includes(toolName)) {
    return false;
  }
  if (filter.deny && filter.deny.includes(toolName)) {
    return false;
  }
  return true;
}

// ---- the harness ----

export interface HarnessOptions {
  /** The session the default root agent drives. */
  sessionId?: string;
  /** The header cwd the session binds to (the workspace path). */
  cwd?: string;
  /** The workspace title the bootstrap project takes. */
  workspaceTitle?: string;
  /** Seed the session log before the service is constructed. */
  seed?: (session: FakeSession) => void;
}

export interface Harness {
  ctx: HarnessCtx;
  /** The default root agent and its session. */
  agent: FakeAgent;
  session: FakeSession;
  /** Every agent the harness created, in creation order. */
  agents: FakeAgent[];
  /** The fake services and their captures. */
  tools: Map<string, ToolDefinition>;
  guards: ToolGuard[];
  restrictions: RestrictionRecord[];
  listeners: Record<string, CapturedListener[]>;
  promptSections: PromptSection[];
  projections: ProjectionRegistration[];
  invariants: InvariantRegistration[];
  settingsRegistrations: SettingsRegistration[];
  /** The resolved `aidos` settings value. Controllable before construction. */
  settingsValue: AidosConfig;
  /** The approval seam; set `undefined` to test the degrade-to-deny path. */
  approval: FakeApproval | undefined;
  /** The session's workspace binding. */
  workspace: FakeWorkspace;
  workspaceRegistry: {
    workspaces: FakeWorkspace[];
    list(): FakeWorkspace[];
    get(id: string): FakeWorkspace | undefined;
    create(path: string, title?: string): Promise<FakeWorkspace>;
  };
  subagents: {
    delegationDepthOf(agent: Agent): number;
    on(type: string, listener: (...args: unknown[]) => unknown): () => void;
  };

  /** Construct (once) the real AidosService over the current session log. */
  installService(): AidosService;
  /** The lazy service; constructing it is idempotent. */
  readonly service: AidosService;
  /** Cast one fake agent to the dsh `Agent` surface. */
  asAgent(agent?: FakeAgent): Agent;
  /** Create another agent with an optional delegation depth. */
  makeAgent(opts?: { depth?: number; id?: string }): FakeAgent;
  /** Build a ToolRunContext for one call. */
  makeExec(name: string, args: unknown, agent?: FakeAgent): ExecWithCapture;
  /** Run one registered tool and normalize the outcome like the registry. */
  runTool(
    name: string,
    args: unknown,
    opts?: { agent?: FakeAgent },
  ): Promise<ToolOutcome>;
  /** Register the tier tools the mask computes its deny list from. */
  registerTierTools(): void;
  /** Write one plan fixture to a real temporary file; return its path. */
  tempPlanFile(contents: string): string;
  /** Fire the captured `agent/session-start` listeners for one agent. */
  fireSessionStart(agent: FakeAgent): void;
  /** Fire the captured `session/event` listeners for one session. */
  fireSessionEvent(session: FakeSession, event: SessionEvent): void;
  /** Fire the captured projection change-feed listeners for one session. */
  fireProjectionChanged(session: FakeSession, key: string, value: unknown, seq: number): void;
  /** Append one aidos event to a session log and notify observers. */
  appendAidosEvent(agent: FakeAgent, event: AidosEvent): SessionEvent;
  /** Resolve one PreToolDecision through the approval seam (SPEC 5). */
  resolveAsk(decision: PreToolDecision, exec: ToolExecution): Promise<PreToolDecision>;
  /** The most recent active restriction, or undefined. */
  latestRestriction(): RestrictionRecord | undefined;
  /** The intersection of the active restrictions over one tool set. */
  effectiveToolSet(names: readonly string[]): string[];
  /** The last `at` recorded for one ticket (ties legal). */
  ticketAt(agent: FakeAgent, ticketId: number): number;
  /** Seed one user-authored evidence row (the board half of a gate). */
  seedEvidence(
    agent: FakeAgent,
    ticketId: number,
    kind: string,
    payload?: Record<string, unknown>,
  ): void;
  /** Seed a session from a kernel store's log (a full valid state). */
  seedFromStore(store: Store): void;
  /** The aidos events of one session log, oldest first. */
  aidosEvents(agent: FakeAgent): AidosEvent[];
  dispose(): void;
}

/** The fake context surface the harness drives. */
export interface HarnessCtx {
  tools: FakeTools;
  systemPrompt: { section(section: PromptSection): void };
  on(
    type: string,
    listener: (...args: unknown[]) => unknown,
    opts?: { prepend?: boolean; global?: boolean },
  ): () => void;
  inject(services: readonly string[], callback: (ctx: HarnessCtx) => void): void;
  get(name: string): unknown;
  agents: {
    get(id: SessionIdType): Agent | undefined;
    roots(): Agent[];
    list(): Agent[];
    currentInitiator(): Agent | undefined;
  };
  sessions: {
    get(id: SessionIdType): Session | undefined;
    list(): Session[];
  };
  sessionProjections: {
    register(definition: {
      key: string;
      schema: unknown;
      init(): unknown;
      apply(state: unknown, event: SessionEvent): unknown;
      view(state: unknown): unknown;
      stateVersion: number;
    }): () => void;
    onChanged(listener: (session: Session, key: string, value: unknown, seq: number) => void): () => void;
    snapshot(session: Session): { asOfSeq: number; values: Record<string, unknown> };
  };
  invariants: {
    register(
      packageName: string,
      installer: (invCtx: Context, fail: (message: string) => never) => void | Promise<void>,
    ): () => void;
  };
  settings: {
    register(namespace: string, schema: unknown, options?: unknown): {
      get(): unknown;
      watch(callback: (next: unknown, prev: unknown) => void | Promise<void>): () => void;
      update(patch: object): Promise<void>;
      replace(section: object): Promise<void>;
    };
    get(namespace: string): unknown;
  };
  workspaceRegistry: Harness["workspaceRegistry"];
  subagents: Harness["subagents"];
  reflect: {
    provide(name: string, value: unknown, check?: () => boolean): () => void;
    get(name: string): unknown;
  };
  /** Cordis lifecycle hooks the service and the wiring use. */
  effect(callback: () => (() => void) | void): () => void;
  plugin(definition: unknown, config?: unknown): { dispose(): void };
  aidos?: AidosService;
  /** The in-memory fake fs the scratch tools read and write through. */
  fs?: FakeFs;
}

/** Clone one JSON-safe value so the log never aliases caller data. */
function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = deepClone((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
}

/**
 * A minimal signal-shaped object for the fake executions. The tsconfig lib is
 * ES2022 (no DOM, no node types), so the harness never references the global
 * `AbortController`/`AbortSignal` names; the tools only read the signal, so a
 * stub with the read surface suffices.
 */
export function makeSignal(): {
  aborted: boolean;
  reason: unknown;
  onabort: null;
  addEventListener: () => void;
  removeEventListener: () => void;
  dispatchEvent: () => boolean;
  throwIfAborted: () => void;
} {
  return {
    aborted: false,
    reason: undefined,
    onabort: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
    throwIfAborted: () => undefined,
  };
}

const DEFAULT_CWD = "/srv/proj/cli";
const DEFAULT_WORKSPACE_TITLE = "cli";

/** The tier table's tool names the mask computes its deny list from. */
const TIER_TOOL_NAMES = [
  ...SIX_TOOLS,
  "read",
  "read_image",
  "web_search",
  "web_fetch",
  "skill",
  "ask_user_question",
  "write",
  "edit",
  "bash",
  "subagent",
  "subagent_fork",
  "job_output",
  "job_kill",
  "job_list",
] as const;

/** One minimal registered tool so the mask has a universe to mask. */
function probeTool(name: string): ToolDefinition {
  return defineTool({
    name,
    description: `The harness probe tool ${name}.`,
    parameters: {},
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
    },
    execute: async () => ({ ok: true }),
  });
}

/** Build one harness. The service is constructed on first access. */
export function createHarness(config?: AidosCoreConfig, options?: HarnessOptions): Harness {
  const sessionId = SessionId(options?.sessionId ?? "session-1");
  const cwd = options?.cwd ?? DEFAULT_CWD;

  const toolMap = new Map<string, ToolDefinition>();
  const guards: ToolGuard[] = [];
  const restrictions: RestrictionRecord[] = [];
  const listeners: Record<string, CapturedListener[]> = {};
  const promptSections: PromptSection[] = [];
  const projections: ProjectionRegistration[] = [];
  const invariants: InvariantRegistration[] = [];
  const settingsRegistrations: SettingsRegistration[] = [];
  const projectionListeners: ((session: Session, key: string, value: unknown, seq: number) => void)[] = [];
  const provided: Record<string, unknown> = {};
  let settingsValue: AidosConfig = deepClone(DEFAULT_CONFIG);
  const tempDirs: string[] = [];
  const workspaces: FakeWorkspace[] = [];

  // The in-memory fake fs backing the scratch tools. Keyed by resolved path;
  // a missing key is an absent file (readText refuses, writeText creates).
  const fsFiles = new Map<string, string>();
  let fsVersionCounter = 0;
  const fakeFs: FakeFs = {
    async resolve(path, opts) {
      const cwdOverride = opts?.cwd;
      const base = cwdOverride !== undefined ? cwdOverride : cwd;
      const resolved = path.startsWith("/") ? path : join(base, path);
      return {
        targetKey: resolved as unknown as FsTarget["targetKey"],
        displayPath: resolved,
      };
    },
    async readText(target, _signal) {
      const key = (target as { displayPath: string }).displayPath;
      const content = fsFiles.get(key);
      if (content === undefined) {
        throw new HarnessError(
          JSON.stringify({ ok: false, error: "file_not_found", message: `no such file: ${key}` }),
          "AIDOS_SCRATCH_READ_MISS",
        );
      }
      return content;
    },
    async writeText(target, content, _expected, _signal) {
      const key = (target as { displayPath: string }).displayPath;
      const operation = fsFiles.has(key) ? "update" : "create";
      fsFiles.set(key, content);
      fsVersionCounter += 1;
      return { operation, version: String(fsVersionCounter) };
    },
    contentOf(path) {
      const resolved = path.startsWith("/") ? path : join(cwd, path);
      return fsFiles.get(resolved);
    },
  };

  const approval: FakeApproval = {
    request: async () => "allowed-once",
  };

  workspaces.push({
    id: "ws-1",
    path: cwd,
    title: options?.workspaceTitle ?? DEFAULT_WORKSPACE_TITLE,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sessionIds: [sessionId],
    setTitle: async () => undefined,
  });

  // The post-commit firehose. Assigned once the harness object exists; the
  // session factory's closures read the variable at append time, never during
  // construction.
  let notifySessionEvent: (session: FakeSession, event: SessionEvent) => void = () => undefined;
  let notifyProjectionChanged: (session: Session, key: string, value: unknown, seq: number) => void =
    () => undefined;

  const makeSession = (id: SessionIdType, depth: number): FakeSession => {
    const header: SessionHeader = {
      version: 0,
      id,
      createdAt: 1000,
      cwd,
      ...(depth > 0 ? { delegationDepth: depth } : {}),
    };
    const log: SessionEvent[] = [];
    const session: FakeSession = {
      id,
      header,
      get events() {
        return [...log];
      },
      get seq() {
        return log.length;
      },
      append(type, data) {
        const event = {
          type,
          seq: log.length,
          time: 1000,
          data: deepClone(data),
        } as unknown as SessionEvent;
        log.push(event);
        notifySessionEvent(session, event);
        return event;
      },
      appendRaw(event) {
        log.push(event);
        notifySessionEvent(session, event);
      },
    };
    return session;
  };

  let harness!: Harness;
  // Assigned right after the ctx literal below; `makeAgentCtx` runs only
  // after that, so the closure reads an initialized binding.
  let ctxRef: HarnessCtx;

  const makeAgentCtx = (agent: FakeAgent): FakeAgentCtx => {
    const shared = ctxRef;
    return {
      tools: {
        register: (def) => shared.tools.register(def),
        get: (name) => shared.tools.get(name),
        guard: (fn) => shared.tools.guard(fn),
        restrict: (filter) => {
          const record: RestrictionRecord = {
            filter,
            scope: `agent:${agent.id}`,
            active: true,
            at: restrictions.length,
          };
          restrictions.push(record);
          return () => {
            record.active = false;
          };
        },
        schemas: (scope) => shared.tools.schemas(scope),
        execute: (exec) => shared.tools.execute(exec),
      },
      on: (type, listener, opts) => shared.on(type, listener, opts),
      get: (name) => shared.get(name),
      systemPrompt: shared.systemPrompt,
    };
  };

  let agentCounter = 1;
  const agents: FakeAgent[] = [];
  const makeAgent = (opts?: { depth?: number; id?: string }): FakeAgent => {
    const id = SessionId(opts?.id ?? `session-${agentCounter++}`);
    const depth = opts?.depth ?? 0;
    const session = makeSession(id, depth);
    const agent = {
      id,
      options: {},
      session,
      status: "running",
      ctx: undefined as unknown as FakeAgentCtx,
      inbox: undefined,
      cancel: () => undefined,
      whenIdle: async () => undefined,
      runMaintenance: async () => undefined,
      send: () => undefined,
      followup: () => undefined,
      steer: () => undefined,
      inject: () => undefined,
    } as FakeAgent;
    agent.ctx = makeAgentCtx(agent);
    agents.push(agent);
    return agent;
  };

  const ctx: HarnessCtx = {
    tools: {
      register(def) {
        toolMap.set(def.name, def);
        return () => {
          toolMap.delete(def.name);
        };
      },
      get(name) {
        return toolMap.get(name);
      },
      guard(fn) {
        guards.push(fn);
        return () => {
          const index = guards.indexOf(fn);
          if (index >= 0) {
            guards.splice(index, 1);
          }
        };
      },
      restrict(filter) {
        const record: RestrictionRecord = {
          filter,
          scope: "root",
          active: true,
          at: restrictions.length,
        };
        restrictions.push(record);
        return () => {
          record.active = false;
        };
      },
      schemas() {
        return [...toolMap.values()].map((definition) => ({
          name: definition.name,
          description: definition.description,
          parameters: definition.parameters,
        }));
      },
      async execute(exec) {
        const definition = toolMap.get(exec.name);
        if (!definition) {
          return {
            isError: true,
            error: { message: `tool "${exec.name}" is not registered through the harness` },
            content: [{ type: "text", text: `Error: tool "${exec.name}" is not registered through the harness` }],
          };
        }
        try {
          const value = await definition.execute(
            exec.arguments,
            exec as unknown as ToolRunContext,
          );
          const content = definition.output.render(
            exec.arguments,
            value as import("@deepseek-ai/dsh-session").JsonValue,
          );
          return { isError: false, value: value as import("@deepseek-ai/dsh-session").JsonValue, content };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const info =
            error instanceof HarnessError ? { name: error.name, code: error.code } : undefined;
          return {
            isError: true,
            error: { message, ...(info ? { info } : {}) },
            content: [{ type: "text", text: `Error: ${message}` }],
          };
        }
      },
    },
    systemPrompt: {
      section(section) {
        promptSections.push({ ...section });
      },
    },
    on(type, listener, opts) {
      const record: CapturedListener = { type, listener, scope: "root", opts };
      (listeners[type] ??= []).push(record);
      return () => {
        const list = listeners[type];
        if (!list) {
          return;
        }
        const index = list.indexOf(record);
        if (index >= 0) {
          list.splice(index, 1);
        }
      };
    },
    inject(services, callback) {
      // The real cordis inject runs the callback in a child fiber once every
      // named service is resolvable; the harness provides all fakes up front,
      // so invoking the callback immediately is the same contract.
      callback(ctx);
      void services;
    },
    get(name) {
      if (name === "approval") {
        return harness.approval;
      }
      // Explicit per-test provides win over the rig default.
      if (name === "agentPresets" && provided.agentPresets !== undefined) {
        return provided.agentPresets;
      }
      if (name === "agentPresets") {
        // The aidos rig composes the aidos preset for its agents: the
        // deny-by-default preset gate (A5) requires provable membership.
        return {
          composedPreset: () => "aidos",
        };
      }
      return provided[name];
    },
    agents: {
      get(id) {
        const agent = agents.find((candidate) => candidate.id === id);
        return agent ? (agent as unknown as Agent) : undefined;
      },
      roots() {
        return agents
          .filter((agent) => delegationDepthOf(agent as unknown as Agent) === 0)
          .map((agent) => agent as unknown as Agent);
      },
      list() {
        return agents.map((agent) => agent as unknown as Agent);
      },
      currentInitiator() {
        return harness.agent as unknown as Agent;
      },
    },
    sessions: {
      get(id) {
        const agent = agents.find((candidate) => candidate.id === id);
        return agent ? (agent.session as unknown as Session) : undefined;
      },
      list() {
        return agents.map((agent) => agent.session as unknown as Session);
      },
    },
    sessionProjections: {
      register(definition) {
        projections.push({ key: definition.key, definition });
        return () => undefined;
      },
      onChanged(listener) {
        projectionListeners.push(listener);
        return () => {
          const index = projectionListeners.indexOf(listener);
          if (index >= 0) {
            projectionListeners.splice(index, 1);
          }
        };
      },
      snapshot(session) {
        const sessionId = (session as unknown as { id: string }).id;
        const agent = agents.find((candidate) => candidate.id === sessionId);
        const log = agent ? (agent.session.events as readonly SessionEvent[]) : [];
        const values: Record<string, unknown> = {};
        for (const registration of projections) {
          const key = registration.key;
          if (key === "aidos.tickets") {
            let state = registration.definition.init() as { tickets: Record<string, unknown>; evidence: Record<string, unknown[]> };
            for (const event of log) {
              state = registration.definition.apply(state, event) as typeof state;
            }
            values[key] = registration.definition.view(state);
          } else if (key === "aidos.evidence") {
            let state = registration.definition.init() as Record<string, unknown[]>;
            for (const event of log) {
              state = registration.definition.apply(state, event) as typeof state;
            }
            values[key] = registration.definition.view(state);
          } else if (key === "aidos.plan") {
            let state = registration.definition.init() as Record<string, unknown>;
            for (const event of log) {
              state = registration.definition.apply(state, event) as typeof state;
            }
            values[key] = registration.definition.view(state);
          } else if (key === "aidos.comments") {
            let state = registration.definition.init() as Record<string, unknown[]>;
            for (const event of log) {
              state = registration.definition.apply(state, event) as typeof state;
            }
            values[key] = registration.definition.view(state);
          }
        }
        return { asOfSeq: log.length, values };
      },
    },
    invariants: {
      register(packageName, installer) {
        invariants.push({ packageName, installer });
        return () => undefined;
      },
    },
    settings: {
      register(namespace, schema, options) {
        settingsRegistrations.push({ namespace, schema, options });
        return {
          get: () => settingsValue,
          watch: () => () => undefined,
          update: async () => undefined,
          replace: async () => undefined,
        };
      },
      get(namespace) {
        return namespace === "aidos" ? settingsValue : undefined;
      },
    },
    workspaceRegistry: {
      get workspaces() {
        return workspaces;
      },
      list() {
        return [...workspaces];
      },
      get(id) {
        return workspaces.find((candidate) => candidate.id === id);
      },
      create: async (path, title) => {
        const created: FakeWorkspace = {
          id: `ws-${workspaces.length + 1}`,
          path,
          title: title ?? path.split("/").filter(Boolean).pop() ?? "workspace",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          sessionIds: [],
          setTitle: async () => undefined,
        };
        workspaces.unshift(created);
        return created;
      },
    },
    subagents: {
      delegationDepthOf(agent) {
        return delegationDepthOf(agent);
      },
      on(type, listener) {
        return ctx.on(type, listener);
      },
    },
    reflect: {
      provide(name, value) {
        provided[name] = value;
        (ctx as unknown as Record<string, unknown>)[name] = value;
        return () => {
          delete provided[name];
        };
      },
      get(name) {
        return provided[name];
      },
    },
    effect(callback) {
      void callback;
      return () => undefined;
    },
    plugin(definition, pluginConfig) {
      // The one plugin the harness mounts is the AidosService class; the
      // real cordis loader would start it through the registry, and the
      // Service constructor already registers itself on `ctx` via reflect.
      const ctor = definition as new (mountCtx: Context, mountConfig?: unknown) => unknown;
      new ctor(ctx as unknown as Context, pluginConfig);
      return { dispose: () => undefined };
    },
    fs: fakeFs,
  };

  ctxRef = ctx;
  const defaultAgent = makeAgent({ id: options?.sessionId ?? "session-1" });

  harness = {
    ctx,
    agent: defaultAgent,
    session: defaultAgent.session,
    agents,
    tools: toolMap,
    guards,
    restrictions,
    listeners,
    promptSections,
    projections,
    invariants,
    settingsRegistrations,
    get settingsValue() {
      return settingsValue;
    },
    set settingsValue(value) {
      settingsValue = value;
    },
    approval,
    workspace: workspaces[0] as FakeWorkspace,
    workspaceRegistry: ctx.workspaceRegistry,
    subagents: ctx.subagents,

    installService() {
      if (!provided.aidos) {
        new AidosService(ctx as unknown as Context, config);
      }
      return provided.aidos as AidosService;
    },
    get service() {
      return harness.installService();
    },
    asAgent(agent) {
      return (agent ?? harness.agent) as unknown as Agent;
    },
    makeAgent,
    makeExec(name, args, agent) {
      const deferred: UserMessage[] = [];
      const concluded = { value: false };
      const callId = CallId(`aidos:${name}`);
      return {
        callId,
        rootCallId: callId,
        name,
        arguments: args,
        ...(agent ? { agent: agent as unknown as Agent } : {}),
        signal: makeSignal(),
        token: Symbol(`aidos:${name}`) as unknown as ToolExecutionToken,
        deferContext: (context: UserMessage) => {
          deferred.push(context);
        },
        concludeTurn: () => {
          concluded.value = true;
        },
        deferred,
        concluded,
      } as unknown as ExecWithCapture;
    },
    async runTool(name, args, opts) {
      const definition = toolMap.get(name);
      if (!definition) {
        throw new Error(`tool "${name}" is not registered through the harness`);
      }
      const agent = opts?.agent ?? harness.agent;
      const exec = harness.makeExec(name, args, agent);
      try {
        const value = await definition.execute(args, exec);
        const content = definition.output.render(
          args,
          value as import("@deepseek-ai/dsh-session").JsonValue,
        );
        return {
          isError: false,
          value,
          content,
          deferred: exec.deferred,
          concluded: exec.concluded.value,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const info =
          error instanceof HarnessError ? { name: error.name, code: error.code } : undefined;
        return {
          isError: true,
          error: { message, ...(info ? { info } : {}) },
          content: [{ type: "text", text: `Error: ${message}` }],
          deferred: exec.deferred,
          concluded: exec.concluded.value,
        };
      }
    },
    registerTierTools() {
      for (const name of TIER_TOOL_NAMES) {
        if (!toolMap.has(name)) {
          toolMap.set(name, probeTool(name));
        }
      }
    },
    tempPlanFile(contents) {
      const dir = mkdtempSync(join(tmpdir(), "aidos-b1-plan-"));
      tempDirs.push(dir);
      const file = join(dir, "plan.md");
      writeFileSync(file, contents);
      return file;
    },
    fireSessionStart(agent) {
      for (const record of listeners["agent/session-start"] ?? []) {
        record.listener({ agent: agent as unknown as Agent });
      }
    },
    fireSessionEvent(session, event) {
      notifySessionEvent(session, event);
    },
    fireProjectionChanged(session, key, value, seq) {
      notifyProjectionChanged(session as unknown as Session, key, value, seq);
    },
    appendAidosEvent(agent, event) {
      return agent.session.append(event.kind, event);
    },
    async resolveAsk(decision, exec) {
      if (decision.kind === "allow" || decision.kind === "deny") {
        return decision;
      }
      const seam = harness.approval;
      if (!seam) {
        return { kind: "deny", reason: "no approval service" };
      }
      const outcome = await seam.request({ tool: exec.name, agent: exec.agent?.id });
      if (outcome === "allowed-once") {
        return { kind: "allow" };
      }
      return { kind: "deny", reason: `approval ${outcome}` };
    },
    latestRestriction() {
      for (let index = restrictions.length - 1; index >= 0; index -= 1) {
        const record = restrictions[index];
        if (record && record.active) {
          return record;
        }
      }
      return undefined;
    },
    effectiveToolSet(names) {
      let visible = new Set(names);
      for (const record of restrictions) {
        if (!record.active) {
          continue;
        }
        if (record.filter.allow) {
          const allow = new Set(record.filter.allow);
          visible = new Set([...visible].filter((name) => allow.has(name)));
        }
        if (record.filter.deny) {
          for (const denied of record.filter.deny) {
            visible.delete(denied);
          }
        }
      }
      return [...visible];
    },
    ticketAt(agent, ticketId) {
      let at = 0;
      for (const event of agent.session.events) {
        const data = event.data as Record<string, unknown>;
        if (
          data.kind === "ticket/change" &&
          (data.ticket as { id?: number } | undefined)?.id === ticketId &&
          typeof data.at === "number"
        ) {
          at = Math.max(at, data.at);
        }
        if (
          data.kind === "evidence/attached" &&
          data.ticketId === ticketId &&
          typeof (data.row as { at?: number } | undefined)?.at === "number"
        ) {
          at = Math.max(at, (data.row as { at: number }).at);
        }
      }
      return at;
    },
    seedEvidence(agent, ticketId, kind, payload) {
      const at = harness.ticketAt(agent, ticketId);
      harness.appendAidosEvent(agent, {
        kind: "evidence/attached",
        version: 1,
        ticketId,
        row: {
          kind,
          author: "user",
          at,
          payload: payload ?? {},
        },
      });
    },
    seedFromStore(store) {
      for (const event of store.events()) {
        harness.appendAidosEvent(harness.agent, event);
      }
    },
    aidosEvents(agent) {
      const events: AidosEvent[] = [];
      for (const event of agent.session.events) {
        events.push(event.data as unknown as AidosEvent);
      }
      return events;
    },
    dispose() {
      // Nothing process-global is registered; the harness owns every fake.
    },
  };

  notifySessionEvent = (session, event) => {
    // The real store fires the cordis-internal dispatch first (the invariant
    // companion stages its candidate fold there), then the public firehose.
    for (const record of listeners["internal/dispatch"] ?? []) {
      record.listener("emit", "session/event", [session, event]);
    }
    for (const record of listeners["session/event"] ?? []) {
      record.listener(session, event);
    }
  };
  notifyProjectionChanged = (session, key, value, seq) => {
    for (const listener of projectionListeners) {
      listener(session, key, value, seq);
    }
  };

  if (options?.seed) {
    options.seed(harness.session);
  }

  return harness;
}
