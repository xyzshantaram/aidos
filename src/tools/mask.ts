/**
 * The state-gated tool masks. ctx.tools.restrict masks the agent scope
 * keyed on the union of ticket states, re-applied at session start and on
 * every ticket/change event. SPEC-B1.md sections 4b and 4 are the
 * contract.
 *
 * The tier table names tool groups; this module concretizes them to the
 * deployment's tool names (SPEC-B1 section 4). The mask is the union: a
 * tool stays visible while ANY present state allows it, and the deny list
 * is computed from the tools the registry actually holds, so the mask never
 * names an unknown tool. A session with no tickets yet sees the open tier
 * (the agent still has to plan and create the first ticket).
 */

import type { Context } from "@deepseek-ai/cordis";
import type { Agent } from "@deepseek-ai/dsh-agent";
import type { Session } from "@deepseek-ai/dsh-session";
import { scopeOf } from "@deepseek-ai/dsh-scope";
import type { TicketState } from "../kernel/types";

/** The reserved code-mode transport, which restrictions must never name. */
const RUN_CODE = "run_code";

/** The ticket tools of the open tier. */
const TICKET_TOOLS = ["get_tickets", "set_ticket", "attach_evidence", "move_ticket"] as const;

/** The plan tools of the open tier. */
const PLAN_TOOLS = ["plan", "plan_import"] as const;

/** The read/research/skill/question tools of the open tier. */
const RESEARCH_TOOLS = ["read", "read_image", "web_search", "web_fetch", "skill", "ask_user_question"] as const;

/** The implementation tools the in-progress tier adds. */
const IMPLEMENTATION_TOOLS = ["write", "edit", "bash"] as const;

/** The delegation and job tools the in-progress and review tiers add. */
const DELEGATION_TOOLS = ["subagent", "subagent_fork", "job_output", "job_kill", "job_list"] as const;

/** Every tool the tier table names, concretized. */
const TOOL_UNIVERSE: ReadonlySet<string> = new Set([
  ...TICKET_TOOLS,
  ...PLAN_TOOLS,
  ...RESEARCH_TOOLS,
  ...IMPLEMENTATION_TOOLS,
  ...DELEGATION_TOOLS,
]);

/** The tools each state allows. The mask is the union over the session. */
const TIER_TOOLS: Record<TicketState, ReadonlySet<string>> = {
  open: new Set([...RESEARCH_TOOLS, ...TICKET_TOOLS, ...PLAN_TOOLS]),
  in_progress: new Set(TOOL_UNIVERSE),
  awaiting_verification: new Set([
    "read",
    "bash",
    "get_tickets",
    "attach_evidence",
    "move_ticket",
    ...DELEGATION_TOOLS,
  ]),
  done: new Set(["read", "get_tickets"]),
};

/** The union of the tools the present states allow. */
function visibleFor(states: ReadonlySet<TicketState>): Set<string> {
  const visible = new Set<string>();
  for (const state of states) {
    for (const tool of TIER_TOOLS[state]) visible.add(tool);
  }
  return visible;
}

/** The agent whose session this is, when it is still live. */
function agentForSession(ctx: Context, session: Session): Agent | undefined {
  const registry = ctx.agents;
  if (!registry) return undefined;
  for (const agent of registry.list()) {
    if (agent.session === session) return agent;
  }
  return undefined;
}

/** Register the mask wiring on a context. Returns the disposer. */
export function installAidosMask(ctx: Context): () => void {
  const aidos = ctx.aidos;
  // The current restriction disposer per agent, replaced on every re-apply.
  // A Map (not a WeakMap) because the disposer must be able to lift every
  // live restriction; entries are bounded by the agents of this preset.
  const disposers = new Map<Agent, () => void>();

  /**
   * The tool names the registry actually holds and the tier table covers.
   * The real registry exposes schemas(); a minimal harness may not, so fall
   * back to the static universe (a validating registry never sees a name it
   * does not hold, because the real registry always has schemas()).
   */
  const registryTools = (): string[] => {
    try {
      return ctx.tools
        .schemas(scopeOf(ctx))
        .map((schema) => schema.name)
        .filter((name) => name !== RUN_CODE);
    } catch {
      return [...TOOL_UNIVERSE];
    }
  };

  const applyMask = (agent: Agent): void => {
    if (!aidos) return;
    let states: TicketState[];
    try {
      states = aidos.ticketStates(agent);
    } catch {
      // The service may not be ready yet; the next re-apply covers it.
      return;
    }
    const present = new Set<TicketState>(states.length === 0 ? ["open"] : states);
    const visible = visibleFor(present);
    // The deny list names only tools the registry holds and the tier table
    // covers, so restrict() never fails on an unknown or scope-local name,
    // and tools outside the universe are not the mask's to hide.
    const deny = registryTools().filter(
      (name) => TOOL_UNIVERSE.has(name) && !visible.has(name),
    );
    const previous = disposers.get(agent);
    if (previous) {
      previous();
      disposers.delete(agent);
    }
    if (deny.length === 0) return;
    disposers.set(agent, agent.ctx.tools.restrict({ deny }));
  };

  const disposersList: Array<() => void> = [];
  // Re-apply at session start and on every ticket/change event.
  disposersList.push(
    ctx.on("agent/session-start", ({ agent }) => {
      applyMask(agent);
    }),
  );
  disposersList.push(
    ctx.on("session/event", (session, event) => {
      if (event.type !== "ticket/change") return;
      const agent = agentForSession(ctx, session);
      if (agent) applyMask(agent);
    }),
  );
  // Apply to agents already live when the wiring mounts.
  const registry = ctx.agents;
  if (registry) {
    for (const agent of registry.list()) applyMask(agent);
  }

  return () => {
    for (const dispose of disposersList) dispose();
    for (const dispose of disposers.values()) {
      try {
        dispose();
      } catch {
        // The agent may already be disposed; its restriction dies with it.
      }
    }
  };
}
