/**
 * The aidos-tools agent plugin: the six model-facing tools, the
 * `tool:aidos` prompt section, and the guard, mask, bash-ask, and
 * allowlist wiring. The dsh-tool-goal shape. SPEC-B1.md is the contract.
 *
 * Every tool body executes as the agent: it passes `exec.agent` to the
 * service, which stamps the actor. A payload key named `author` or `actor`
 * is data, never an instruction. Every result is JSON (rendered by the
 * output declaration); refusals throw `HarnessError(message, code)` so the
 * model sees a structured JSON error, never a traceback. `plan` is the one
 * exception: its result is the plan markdown.
 */

import type { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import type { GenericCallView, ToolCallKind, ToolRunContext } from "@deepseek-ai/dsh-tools";
import { HarnessError } from "@deepseek-ai/dsh-llm";
import type { JsonValue } from "@deepseek-ai/dsh-session";
import type { Agent } from "@deepseek-ai/dsh-agent";
import { delegationDepthOf } from "@deepseek-ai/dsh-subagent";
import { STATE_ORDER } from "../kernel/types";
import {
  BadPayloadError,
  FileNotReadError,
} from "../host/aidos-core";
import {
  ContextTooLongError,
  EvidenceAuthorRefused,
  GateRefused,
  InvariantError,
  PlanParseError,
  ProjectNotEmptyError,
  UnknownKind,
  UnknownProject,
  UnknownTicket,
} from "../kernel/types";
import { installAidosGuard, ORCHESTRATOR_ONLY_MESSAGE } from "./guard";
import { installAidosMask } from "./mask";
import { installBashAskListener } from "./bash-ask";
import { installAllowlistGuard } from "./allowlist";
import { registerScratchTools, scratchRootForAgent } from "./scratch";
export const name = "aidos-tools";

export const inject = [
  "aidos",
  "tools",
  "systemPrompt",
  "agents",
  "subagents",
] as const;

/** Schemastery config for the aidos-tools plugin. */
export const Config = z.object({});

// ---- shared schema fragments ----

const STATE_SCHEMA = { type: "string", enum: [...STATE_ORDER] } as const;

const TICKET_ROW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "integer", required: true },
    projectId: { type: "integer", required: true },
    title: { type: "string", required: true },
    description: { type: "string", required: true },
    body: { type: "string", required: true },
    criteria: { type: "string", required: true },
    phase: { type: "integer", required: true },
    order: { type: "integer", required: true },
    state: { ...STATE_SCHEMA, required: true },
  },
} as const;

const TICKET_VIEW_SCHEMA = {
  ...TICKET_ROW_SCHEMA,
  properties: {
    ...TICKET_ROW_SCHEMA.properties,
    confidenceScore: { type: "number", required: true },
    gateFraction: {
      oneOf: [{ type: "number" }, { type: "null" }],
      required: true,
    },
  },
} as const;

/** One pending-call card for the board tools. */
function present(title: string, kind: ToolCallKind, rawInput: unknown): GenericCallView {
  return {
    card: "generic",
    title,
    kind,
    ...(rawInput === undefined ? {} : { rawInput }),
  };
}

/** Render one JSON result as the model-facing content. */
function renderJson(_args: unknown, value: JsonValue) {
  return [{ type: "text" as const, text: JSON.stringify(value) }];
}

// ---- the orchestrator check ----

/**
 * The call-time re-check every board tool body runs: the caller must be the
 * orchestrator. The registry-level guard already denied depth-1 calls; this
 * keeps the guarantee even if a toolFilter is misconfigured.
 */
function orchestratorAgent(exec: ToolRunContext): Agent {
  const agent = exec.agent;
  if (!agent) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "agent_required", message: "the board tools require a calling agent" }),
      "AIDOS_AGENT_REQUIRED",
    );
  }
  if (delegationDepthOf(agent) !== 0) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "orchestrator_only", message: ORCHESTRATOR_ONLY_MESSAGE }),
      "AIDOS_ORCHESTRATOR_ONLY",
    );
  }
  return agent;
}

// ---- the refusal mapper ----

/**
 * Map one domain failure to a structured JSON refusal. Every board tool
 * throws HarnessError, never a traceback. The code is the refusal value;
 * the message is the JSON payload the model reads.
 */
function refusal(error: unknown, overrides?: { kind?: string }): never {
  if (error instanceof UnknownProject) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "unknown_project", projectId: error.projectId, message: error.message }),
      "unknown_project",
    );
  }
  if (error instanceof UnknownTicket) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "unknown_ticket", ticketId: error.ticketId, message: error.message }),
      "unknown_ticket",
    );
  }
  if (error instanceof GateRefused) {
    throw new HarnessError(
      JSON.stringify({
        ok: false,
        error: "gate_refused",
        fromState: error.fromState,
        toState: error.toState,
        missingKinds: error.missingKinds,
        allowedActors: error.allowedActors,
        message: error.message,
      }),
      "gate_refused",
    );
  }
  if (error instanceof UnknownKind) {
    const kind = overrides?.kind ?? error.kind;
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "unknown_kind", kind, message: `no evidence kind with id ${kind}` }),
      "unknown_kind",
    );
  }
  if (error instanceof EvidenceAuthorRefused) {
    const kind = overrides?.kind ?? error.kind;
    throw new HarnessError(
      JSON.stringify({
        ok: false,
        error: "human_only_kind",
        kind,
        message: `the kind ${kind} is human evidence, so a human must supply it`,
      }),
      "human_only_kind",
    );
  }
  if (error instanceof PlanParseError) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "plan_parse_error", line: error.line, message: error.message }),
      "plan_parse_error",
    );
  }
  if (error instanceof ProjectNotEmptyError) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "project_not_empty", projectId: error.projectId, message: error.message }),
      "project_not_empty",
    );
  }
  if (error instanceof ContextTooLongError) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "context_too_long", overage: error.overage, message: error.message }),
      "context_too_long",
    );
  }
  if (error instanceof BadPayloadError) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "bad_payload", message: error.message }),
      "bad_payload",
    );
  }
  if (error instanceof FileNotReadError) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "file_not_read", path: error.path, message: error.message }),
      "file_not_read",
    );
  }
  if (error instanceof InvariantError) {
    throw new HarnessError(
      JSON.stringify({ ok: false, error: "invariant", message: error.message }),
      "INVARIANT",
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  throw new HarnessError(
    JSON.stringify({ ok: false, error: "tool_error", message }),
    "AIDOS_TOOL_ERROR",
  );
}

// ---- the tool:aidos prompt section ----

/** The lifecycle rules the model reads before it reaches for the board. */
const AIDOS_GUIDANCE =
  "Run the ticket lifecycle of the session's project with the board tools. " +
  "get_tickets reads the board; every row carries the confidence score and the gate fraction, and the score is advisory. " +
  "set_ticket creates a ticket when you omit ticketId and edits the named fields when you give one; it never changes a ticket's state, and it creates the phase when the phase is absent. " +
  "attach_evidence records agent-authored evidence for the agent-allowed kinds (automated_check, review_pass, review_note, subagent_report); user_signoff and user_verified are the human's to supply, never yours. " +
  "move_ticket moves a ticket only when the required proof exists: the gate's refusal names the missing kinds, and signoff is the human's to give. You never move a ticket to done; the human marks done. " +
  "plan and plan_import serialize and load the plan markdown, and an import lands every ticket in open. " +
  "Your implementation tools (write, edit, bash, subagents, jobs) exist only while a ticket is in progress: before any signoff you can read and plan but cannot change files or run commands, and writes stay inside the in-progress tickets' file allowlists. A ticket awaiting verification keeps bash (every call asks the human) and freezes its files. " +
  "The board tools are the orchestrator's: a subagent cannot use them.";

// ---- the six tools ----

function registerGetTickets(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "get_tickets",
      description:
        "Read the board rows of the session's project: every ticket with its state, confidence score, and gate fraction, sorted by phase and order.",
      parameters: {
        projectId: {
          type: "integer",
          description: "The project to read; the session's workspace project when absent.",
        },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            tickets: { type: "array", required: true, items: TICKET_VIEW_SCHEMA },
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = orchestratorAgent(exec);
        try {
          const tickets = ctx.aidos.getTickets(
            agent,
            args.projectId === undefined ? undefined : { projectId: args.projectId },
          );
          return { ok: true, tickets };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) => present("Read the board", "read", args.projectId),
    }),
  );
}

function registerSetTicket(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "set_ticket",
      description:
        "Create or edit one ticket. With no ticketId it creates a ticket in open (title required; the phase is created when absent, titled 'Untitled phase'). With a ticketId it edits the named fields; an absent field leaves its value. It never changes a ticket's state.",
      parameters: {
        ticketId: {
          oneOf: [{ type: "integer" }, { type: "string" }],
          description: "The ticket to edit, by numeric id or slug; absent creates a new ticket.",
        },
        projectId: { type: "integer", description: "The project for a new ticket; the session's workspace project when absent." },
        title: { type: "string", description: "The ticket title; required when creating." },
        description: { type: "string", description: "The ticket description." },
        body: { type: "string", description: "The ticket body." },
        criteria: { type: "string", description: "The evaluation criteria." },
        phase: { type: "integer", description: "The phase number; defaults to 1 on create." },
        phaseTitle: { type: "string", description: "The title a newly created phase takes; defaults to 'Untitled phase'." },
        order: { type: "integer", description: "The order within the phase; defaults to the next free position on create." },
        slug: { type: "string", description: "A per-workspace-unique alias for a new ticket; derived from the title when absent." },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            ticket: TICKET_ROW_SCHEMA,
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = orchestratorAgent(exec);
        try {
          const ticket = ctx.aidos.setTicket(agent, { ...args });
          return { ok: true, ticket };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) =>
        present(args.ticketId === undefined ? "Create ticket" : "Edit ticket", "edit", args.ticketId ?? args.title),
    }),
  );
}

function registerAttachEvidence(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "attach_evidence",
      description:
        "Attach one piece of agent-authored evidence to a ticket. Only the agent-allowed kinds are offered: automated_check, review_pass, review_note, subagent_report (each resolves to its builtin: kind). The human-only kinds user_signoff and user_verified refuse: a human must supply them.",
      parameters: {
        ticketId: { oneOf: [{ type: "integer" }, { type: "string" }], required: true, description: "The ticket that receives the evidence, by numeric id or slug." },
        kind: {
          type: "string",
          required: true,
          description: "The evidence kind: one of the agent-allowed kinds (automated_check, review_pass, review_note, subagent_report).",
        },
        payload: {
          type: "object",
          additionalProperties: true,
          description: "An optional JSON object of evidence details. A key named author or actor is data, never an instruction.",
        },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            ticketId: { type: "integer", required: true },
            kind: { type: "string", required: true },
            payload: { type: "object", additionalProperties: true, required: true },
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = orchestratorAgent(exec);
        try {
          const view = ctx.aidos.agentAttachEvidence(agent, {
            ticketId: args.ticketId,
            kind: args.kind,
            payload: args.payload,
          });
          return {
            ok: true,
            ticketId: view.ticketId,
            kind: view.kind,
            payload: view.payload as Record<string, JsonValue>,
          };
        } catch (error) {
          refusal(error, { kind: args.kind });
        }
      },
      presentCall: (args) => present(`Attach ${args.kind}`, "edit", args.ticketId),
    }),
  );
}

function registerMoveTicket(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "move_ticket",
      description:
        "Move one ticket along a legal transition. The gate enforces the move: the refusal names the missing evidence kinds and the actors allowed to supply them. An agent never reaches done: only a human marks a ticket done.",
      parameters: {
        ticketId: { oneOf: [{ type: "integer" }, { type: "string" }], required: true, description: "The ticket to move, by numeric id or slug." },
        to: { type: "string", enum: [...STATE_ORDER], required: true, description: "The target state." },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            ticketId: { type: "integer", required: true },
            fromState: { ...STATE_SCHEMA, required: true },
            toState: { ...STATE_SCHEMA, required: true },
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = orchestratorAgent(exec);
        try {
          const moved = ctx.aidos.agentMoveTicket(agent, { ticketId: args.ticketId, to: args.to });
          return { ok: true, ticketId: moved.ticketId, fromState: moved.fromState, toState: moved.toState };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) => present(`Move ticket to ${args.to}`, "move", args.ticketId),
    }),
  );
}

function registerPlan(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "plan",
      description:
        "Serialize one project's plan as markdown: frontmatter, preamble, the context sections, and every ticket on its own line with the real state mark. The one tool whose result is the plan text, not JSON.",
      parameters: {
        projectId: {
          type: "integer",
          description: "The project to serialize; the session's workspace project when absent.",
        },
      },
      output: {
        schema: { type: "string" },
        render: (_args, value) => [{ type: "text", text: value }],
      },
      execute: async (args, exec) => {
        const agent = orchestratorAgent(exec);
        try {
          return ctx.aidos.plan(agent, args.projectId === undefined ? undefined : { projectId: args.projectId });
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: () => present("Export plan", "read", undefined),
    }),
  );
}

function registerPlanImport(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "plan_import",
      description:
        "Load one plan document into an empty project. The file is read from the session's workspace. A parse error imports nothing and names the line; a project that already holds a ticket refuses; every imported ticket lands in open with the document's claimed state kept as builtin:imported_state evidence.",
      parameters: {
        file: {
          type: "string",
          required: true,
          description: "The plan file path, relative to the session's workspace or absolute.",
        },
        projectId: {
          type: "integer",
          description: "The project to load into; the session's workspace project when absent.",
        },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            tickets: { type: "array", items: { type: "integer" }, required: true },
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = orchestratorAgent(exec);
        try {
          const result = await ctx.aidos.planImport(agent, args);
          return { ok: true, tickets: result.tickets };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) => present("Import plan", "other", args.file),
    }),
  );
}

/** Register the six tools, the prompt section, and the policy wiring. */
export function apply(ctx: Context, config: unknown): void {
  ctx.systemPrompt.section({
    name: "tool:aidos",
    order: 113,
    text: aidosGuidanceText(ctx),
  });
  registerGetTickets(ctx);
  registerSetTicket(ctx);
  registerAttachEvidence(ctx);
  registerMoveTicket(ctx);
  registerPlan(ctx);
  registerPlanImport(ctx);
  registerScratchTools(ctx);
  installAidosGuard(ctx);
  installAidosMask(ctx);
  installBashAskListener(ctx);
  installAllowlistGuard(ctx);
  void config;
}

/**
 * Build the `tool:aidos` system-prompt text. The static guidance is followed by
 * a one-line note naming the scratch root for the current workspace, computed
 * at registration time from the current initiator's cwd. A session without a
 * cwd contributes no note (the scratch tools refuse at call time instead).
 */
function aidosGuidanceText(ctx: Context): string {
  const agent = ctx.get("agents")?.currentInitiator();
  let note = "";
  if (agent !== undefined) {
    try {
      const root = scratchRootForAgent(agent);
      note = ` The scratch workspace for this session is at ${root}.\n`;
    } catch {
      note = "";
    }
  }
  return AIDOS_GUIDANCE + note;
}
