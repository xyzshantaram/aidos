/**
 * The aidos-tools agent plugin: the six model-facing tools, the
 * `tool:aidos` prompt section, and the guard, mask, and
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
import type { ContextSection } from "../kernel/types";
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
import { installAllowlistGuard } from "./allowlist";
import { registerScratchTools, scratchRootForAgent } from "./scratch";
import { isAidosAgent } from "./preset-gate";
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
    dependsOn: { type: "array", items: { type: "string" }, required: true },
    allowlist: { type: "array", items: { type: "string" }, required: true },
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
    gatePresent: {
      oneOf: [{ type: "number" }, { type: "null" }],
      required: true,
    },
    gateTotal: {
      oneOf: [{ type: "number" }, { type: "null" }],
      required: true,
    },
    updatedAt: { type: "number", required: true },
    workspaceKey: { type: "string", required: true },
    slug: { type: "string", required: true },
  },
} as const;

const PLAN_META_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    frontmatter: { type: "string", required: true },
    preamble: { type: "string", required: true },
    contextSections: {
      type: "array",
      required: true,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          heading: { type: "string", required: true },
          text: { type: "string", required: true },
          index: { type: "integer", required: true },
        },
      },
    },
  },
} as const;

/**
 * One pending-call card for the board tools (#71): a verb+object line plus
 * up to FOUR field chips the tool declares. The chips ride `content` (the
 * collapsed card shows them alongside the title); the raw input appears only
 * in the expanded view via rawInput, which stays the audit path. No raw JSON
 * ever renders as the collapsed body.
 */
function present(
  title: string,
  kind: ToolCallKind,
  rawInput: unknown,
  chips: string[] = [],
): GenericCallView {
  const capped = chips.slice(0, 4).filter((chip) => chip.trim() !== "");
  return {
    card: "generic",
    title,
    kind,
    ...(capped.length > 0
      ? {
          content: capped.map((chip) => ({
            type: "text" as const,
            text: chip,
          })),
        }
      : {}),
    ...(rawInput === undefined ? {} : { rawInput }),
  };
}

/** Render one JSON result as the model-facing content. */
function renderJson(_args: unknown, value: JsonValue) {
  return [{ type: "text" as const, text: JSON.stringify(value) }];
}

/**
 * Parse the plan_meta_set contextSections argument: one JSON array of
 * {heading, text, index} objects. The tool layer owns the JSON decode so the
 * service keeps its typed argument; a malformed payload is a refusal, not a
 * traceback. Undefined passes through, so absent keeps the stored sections.
 */
function parseContextSectionsArg(raw: string | undefined): ContextSection[] | undefined {
  if (raw === undefined) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new BadPayloadError(
      `contextSections must be a JSON array of {heading, text, index} objects: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new BadPayloadError("contextSections must be a JSON array of {heading, text, index} objects");
  }
  return parsed.map((entry, position) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new BadPayloadError(`contextSections[${position}] must be an object with heading, text, and index`);
    }
    const section = entry as Record<string, unknown>;
    const heading = section.heading;
    const text = section.text;
    const index = section.index;
    if (typeof heading !== "string" || typeof text !== "string") {
      throw new BadPayloadError(`contextSections[${position}] must carry string heading and text fields`);
    }
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
      throw new BadPayloadError(`contextSections[${position}] index must be a non-negative integer`);
    }
    return { heading, text, index } as ContextSection;
  });
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
  "attach_evidence records agent-authored evidence for the agent-allowed kinds (automated_check, review_pass, review_note, agent_report); user_signoff and user_verified are the human's to supply, never yours. " +
  "move_ticket moves a ticket only when the required proof exists: the gate's refusal names the missing kinds, and signoff is the human's to give. You never move a ticket to done; the human marks done. " +
  "plan and plan_import serialize and load the plan markdown, and an import lands every ticket in open. " +
  "plan_meta reads the stored plan blocks (frontmatter, preamble, context sections) and plan_meta_set edits one block in place: every present field replaces its stored value, and absent fields keep it, so there is no need to re-send the whole plan. " +
  "Your implementation tools (write, edit, bash, subagents, jobs) exist only while a ticket is in progress: before any signoff you can read and plan but cannot change files or run commands, and writes stay inside the in-progress tickets' file allowlists. A ticket awaiting verification keeps bash (every call asks the human) and freezes its files. " +
  "The board tools are the orchestrator's: a subagent cannot use them. " +
  "Pass a toolFilter that denies get_tickets, set_ticket, attach_evidence, move_ticket, plan, plan_import, plan_meta, and plan_meta_set whenever you spawn a subagent or a fork. " +
  "The depth guard refuses a subagent anyway, so the filter is a second layer.";

// ---- the six tools ----

function registerGetTickets(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "get_tickets",
      description:
        "Read the board rows of the session's project: every ticket with its state, confidence score, and gate fraction. Optional FilterPanel-parity filters (#49); with no filters, returns everything as before.",
      parameters: {
        projectId: {
          type: "integer",
          description: "The project to read; the session's workspace project when absent.",
        },
        stateIds: {
          type: "array",
          items: { type: "string", enum: [...STATE_ORDER] },
          description: "Only tickets in these states. Absent = all states.",
        },
        projectIds: {
          type: "array",
          items: { type: "integer" },
          description: "Only tickets in these projects. Absent = all.",
        },
        search: {
          type: "string",
          description: "Substring match over title or id, like the board search box.",
        },
        sortKey: {
          type: "string",
          enum: ["confidence", "gates", "time", "alpha"],
          description: "Sort key. Default: confidence.",
        },
        descending: {
          type: "boolean",
          description: "Sort direction. Default: true.",
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
        ctx.logger?.info?.(`aidos: get_tickets called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: get_tickets args ${JSON.stringify(args)}`);
        try {
          const tickets = ctx.aidos.getTickets(agent, {
            projectId: args.projectId,
            stateIds: args.stateIds,
            projectIds: args.projectIds,
            search: args.search,
            sortKey: args.sortKey,
            descending: args.descending,
          });
          ctx.logger?.info?.(`aidos: get_tickets returned ${tickets.length} ticket(s) for agent ${agent.session?.id}`);
          return { ok: true, tickets };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) => {
        const filters: string[] = [];
        if (args.stateIds !== undefined) filters.push("states: " + args.stateIds.join("|"));
        if (args.search !== undefined && args.search !== "") filters.push("search: " + args.search);
        if (args.projectId !== undefined) filters.push("project " + args.projectId);
        return present("Read the board", "read", args.projectId, filters);
      },
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
        dependsOn: {
          type: "array",
          items: { type: "string" },
          description:
            "Ticket dependencies as workspace:ticketId references (e.g., --home-sid-repos-aidos--:42). Empty or absent leaves unchanged.",
        },
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
        ctx.logger?.info?.(`aidos: set_ticket called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: set_ticket args ${JSON.stringify(args)}`);
        try {
          const ticket = ctx.aidos.setTicket(agent, { ...args });
          ctx.logger?.info?.(`aidos: set_ticket wrote ticket ${ticket.id} for agent ${agent.session?.id}`);
          return { ok: true, ticket };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) =>
        present(
          args.ticketId === undefined ? "Create ticket" : "Edit ticket #" + args.ticketId,
          "edit",
          args.ticketId ?? args.title,
          [args.title !== undefined ? args.title : ""],
        ),
    }),
  );
}

function registerAttachEvidence(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "attach_evidence",
      description:
        "Attach one piece of agent-authored evidence to a ticket. Only the agent-allowed kinds are offered: automated_check, review_pass, review_note, agent_report (each resolves to its builtin: kind). The human-only kinds user_signoff and user_verified refuse: a human must supply them.",
      parameters: {
        ticketId: { oneOf: [{ type: "integer" }, { type: "string" }], required: true, description: "The ticket that receives the evidence, by numeric id or slug." },
        kind: {
          type: "string",
          required: true,
          description: "The evidence kind: one of the agent-allowed kinds (automated_check, review_pass, review_note, agent_report).",
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
        ctx.logger?.info?.(`aidos: attach_evidence called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: attach_evidence args ${JSON.stringify(args)}`);
        try {
          const view = ctx.aidos.agentAttachEvidence(agent, {
            ticketId: args.ticketId,
            kind: args.kind,
            payload: args.payload,
          });
          ctx.logger?.info?.(`aidos: attach_evidence recorded ${view.kind} for ticket ${view.ticketId}`);
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
      presentCall: (args) => {
        const chips = ["#" + args.ticketId, args.kind];
        const payload = args.payload as { note?: unknown } | undefined;
        if (payload !== undefined && typeof payload.note === "string" && payload.note.trim() !== "") {
          const note = payload.note.trim();
          chips.push(note.length > 40 ? note.slice(0, 40) + "\u2026" : note);
        }
        return present(`Attach evidence`, "edit", args.ticketId, chips);
      },
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
        ctx.logger?.info?.(`aidos: move_ticket called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: move_ticket args ${JSON.stringify(args)}`);
        try {
          const moved = ctx.aidos.agentMoveTicket(agent, { ticketId: args.ticketId, to: args.to });
          ctx.logger?.info?.(`aidos: move_ticket moved ticket ${moved.ticketId} ${moved.fromState} -> ${moved.toState}`);
          return { ok: true, ticketId: moved.ticketId, fromState: moved.fromState, toState: moved.toState };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) => present("Move ticket", "move", args.ticketId, ["#" + args.ticketId, "to " + args.to]),
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
        ctx.logger?.info?.(`aidos: plan called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: plan args ${JSON.stringify(args)}`);
        try {
          const planText = ctx.aidos.plan(agent, args.projectId === undefined ? undefined : { projectId: args.projectId });
          ctx.logger?.info?.(`aidos: plan serialized for agent ${agent.session?.id}`);
          return planText;
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: () => present("Export plan", "read", undefined),
    }),
  );
}

function registerRequestAllowlist(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "request_allowlist",
      description:
        "Propose file paths for a ticket's write allowlist (#51). Each path is validated " +
        "immediately (inside the session workspace, exists on disk); a bad list is refused " +
        "naming every bad path. A valid proposal queues an APPROVAL CARD on the board and " +
        "returns at once - do not wait, do not poll: you will be steered with the outcome " +
        "(approved paths or a rejection) when the user resolves the card.",
      parameters: {
        ticketId: {
          type: "integer",
          description: "The in-progress ticket the proposal is for.",
          required: true as const,
        },
        paths: {
          type: "array",
          description: "The proposed paths, workspace-relative or absolute.",
          items: { type: "string" },
          required: true as const,
        },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            status: { type: "string", const: "pending", required: true },
            ticketId: { type: "integer", required: true },
            requestId: { type: "string", required: true },
            proposed: { type: "array", items: { type: "string" }, required: true },
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = orchestratorAgent(exec);
        ctx.logger?.info?.(`aidos: request_allowlist called by agent ${agent.session?.id}`);
        try {
          const result = ctx.aidos.requestAllowlist(agent, args as { ticketId: number; paths: string[] });
          ctx.logger?.info?.(`aidos: allowlist request ${result.requestId} queued for ticket ${result.ticketId}`);
          return result;
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (a) => {
        const req = a as { ticketId?: number; paths?: string[] };
        return present("Request allowlist", "edit", req.paths, [
          "#" + req.ticketId,
          (req.paths?.length ?? 0) + " path(s)",
        ]);
      },
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
        ctx.logger?.info?.(`aidos: plan_import called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: plan_import args ${JSON.stringify(args)}`);
        try {
          const result = await ctx.aidos.planImport(agent, args);
          ctx.logger?.info?.(`aidos: plan_import landed ${result.tickets.length} ticket(s) for agent ${agent.session?.id}`);
          return { ok: true, tickets: result.tickets };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) => present("Import plan", "other", args.file, [args.file]),
    }),
  );
}

function registerPlanMeta(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "plan_meta",
      description:
        "Read one project's stored plan blocks as JSON: frontmatter, preamble, and the context sections with their headings and indexes. The result is the editor's data, not the rendered plan markdown.",
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
            planMeta: PLAN_META_SCHEMA,
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = orchestratorAgent(exec);
        ctx.logger?.info?.(`aidos: plan_meta called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: plan_meta args ${JSON.stringify(args)}`);
        try {
          const planMeta = ctx.aidos.planMeta(
            agent,
            args.projectId === undefined ? undefined : { projectId: args.projectId },
          );
          ctx.logger?.info?.(`aidos: plan_meta read for agent ${agent.session?.id}`);
          return { ok: true, planMeta };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) => present("Read plan meta", "read", args.projectId, args.projectId !== undefined ? ["project " + args.projectId] : []),
    }),
  );
}

function registerPlanMetaSet(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: "plan_meta_set",
      description:
        "Edit one plan block in place. Every present field replaces its stored value and absent fields keep it, so pass only the block you changed: frontmatter, preamble, or the full contextSections array with one section's text replaced. The 2000-line context cap runs over the resulting plan. No file read and no markdown parse. You edit the structure, not a document.",

      parameters: {
        projectId: {
          type: "integer",
          description: "The project to edit; the session's workspace project when absent.",
        },
        frontmatter: {
          type: "string",
          description: "Replaces the stored frontmatter. Absent keeps the stored value.",
        },
        preamble: {
          type: "string",
          description: "Replaces the stored preamble. Absent keeps the stored value.",
        },
        contextSections: {
          type: "string",
          description:
            "JSON array of {heading, text, index} objects; it replaces the stored sections whole. The heading keeps its '##' prefix and index counts the phases before the section. Absent keeps the stored sections.",
        },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ok: { type: "boolean", const: true, required: true },
            planMeta: PLAN_META_SCHEMA,
          },
        },
        render: renderJson,
      },
      execute: async (args, exec) => {
        const agent = orchestratorAgent(exec);
        ctx.logger?.info?.(`aidos: plan_meta_set called by agent ${agent.session?.id}`);
        ctx.logger?.debug?.(`aidos: plan_meta_set args ${JSON.stringify(args)}`);
        try {
          const contextSections = parseContextSectionsArg(args.contextSections);
          const planMeta = ctx.aidos.agentSetPlanMeta(agent, {
            ...(args.projectId === undefined ? {} : { projectId: args.projectId }),
            ...(args.frontmatter === undefined ? {} : { frontmatter: args.frontmatter }),
            ...(args.preamble === undefined ? {} : { preamble: args.preamble }),
            ...(contextSections === undefined ? {} : { contextSections }),
          });
          ctx.logger?.info?.(`aidos: plan_meta_set wrote the plan meta for agent ${agent.session?.id}`);
          return { ok: true, planMeta };
        } catch (error) {
          refusal(error);
        }
      },
      presentCall: (args) =>
        present(
          args.contextSections !== undefined
            ? "Set plan sections"
            : args.frontmatter !== undefined
              ? "Set plan frontmatter"
              : "Set plan preamble",
          "edit",
          args.projectId,
        ),
    }),
  );
}

/** Register the six tools, the prompt section, and the policy wiring.
 * bash-ask was removed; awaiting_verification now uses bash-guard's
 * profile-awaiting_verification overlay (see src/host/aidos-core.ts#bashContext).
 */
export function apply(ctx: Context, config: unknown): void {
  // No apply-time preset gate here. This row is composed only by the aidos
  // preset's own agent.cordis.yml, so "which sessions is this for" is the
  // composition's decision, not this module's. The gate daf1f96 tried was
  // dead in production and fatal: composedPreset(ctx) reads the live scope
  // chain and answers undefined for a row context inside the standing mount
  // (the mount scope has no parent; it resolves only for a real agent
  // context), so the row registered nothing, never activated, and the whole
  // preset mount failed. Contamination between presets is already handled at
  // the seams that actually run per agent: the mask/guard/allowlist key off
  // the calling agent, and bashContext/project creation check
  // composedPreset(agent.ctx) at call time in aidos-core.ts.
  // The section text is a provider, not a static string: assemblies happen
  // per agent, and the standing mount makes this registration process-global,
  // so a non-aidos agent's prompt must not carry aidos guidance. The provider
  // receives no agent, so the drop happens in the assemble waterfall below
  // and this provider stays a plain string holder.
  ctx.systemPrompt.section({
    name: "tool:aidos",
    order: 113,
    text: aidosGuidanceText(ctx),
  });
  {
    const on = ctx.on as unknown as {
      (
        name: "system-prompt/assemble",
        handler: (
          assembly: { sections: Array<{ name: string; text: string }> },
          context: { agent?: unknown },
          next: () => unknown,
        ) => void,
      ): () => void;
    };
    ctx.effect(() =>
      on("system-prompt/assemble", (assembly, context, next) => {
        const agent = context.agent as import("@deepseek-ai/dsh-agent").Agent | undefined;
        if (agent === undefined) return next();
        if (isAidosAgent(ctx, agent)) return next();
        // Non-aidos agent: strip the aidos section from its prompt.
        assembly.sections = assembly.sections.filter(
          (section) => section.name !== "tool:aidos",
        );
        return next();
      }),
    );
  }
  registerGetTickets(ctx);
  registerSetTicket(ctx);
  registerAttachEvidence(ctx);
  registerMoveTicket(ctx);
  registerPlan(ctx);
  registerPlanImport(ctx);
  registerPlanMeta(ctx);
  registerPlanMetaSet(ctx);

  registerScratchTools(ctx);
  registerRequestAllowlist(ctx);
  installAidosGuard(ctx);
  installAidosMask(ctx);
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
    } catch (error) {
      ctx.logger?.warn?.(`aidos: scratch root unavailable for the guidance note: ${error instanceof Error ? error.message : String(error)}`);
      note = "";
    }
  }
  return AIDOS_GUIDANCE + note;
}
