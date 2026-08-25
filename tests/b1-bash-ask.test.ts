/**
 * The awaiting_verification bash profile (replaces bash-ask listener).
 * bashContext() now returns "awaiting_verification" when a ticket awaits
 * verification without concurrent in_progress; bash-guard's
 * profile-awaiting_verification overlay handles the ask. See aidos-core#bashContext
 * and the dotfiles-ai prompt.
 */

import { describe, expect, it } from "vitest";

import type { PreToolDecision, ToolExecution } from "@deepseek-ai/dsh-tools";
import {
  asContext,
  createHarness,
  type Harness,
} from "./b1-harness";

type BashAskListener = (
  exec: ToolExecution,
  next: () => Promise<PreToolDecision>,
) => Promise<PreToolDecision>;

// Shim: the profile-based behavior is via bashContext, not a listener.
// This helper derives the expected ask/allow from bashContext so the
// former listener tests keep their shape until b1-bash-ask.test.ts is
// replaced by a profile integration test in dotfiles-ai.

function bashAskListener(harness: Harness): BashAskListener {
  return async (exec, next) => {
    if (exec.name !== "bash") return next();
    const ctx = (harness.ctx as unknown as { aidos?: { bashContext: (a:any)=>{profile:string} } }).aidos;
    if (!ctx) return next();
    const profile = ctx.bashContext(harness.agent).profile;
    if (profile === "awaiting_verification") return { kind: "ask", reason: "a ticket awaits verification" };
    return next();
  };
}


/** Drive one ticket into awaiting_verification on the harness session. */
function reachAwaitingVerification(harness: Harness) {
  const ticket = harness.service.setTicket(harness.asAgent(), { title: "Under review" });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:user_signoff");
  harness.service.agentMoveTicket(harness.asAgent(), { ticketId: ticket.id, to: "in_progress" });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:automated_check");
  harness.seedEvidence(harness.agent, ticket.id, "builtin:review_pass");
  harness.service.agentMoveTicket(harness.asAgent(), {
    ticketId: ticket.id,
    to: "awaiting_verification",
  });
}

/** One ticket stays in_progress while a second reaches awaiting_verification. */
function reachAwaitingVerificationWithInProgress(harness: Harness) {
  const inProgress = harness.service.setTicket(harness.asAgent(), {
    title: "In flight",
  });
  harness.seedEvidence(harness.agent, inProgress.id, "builtin:user_signoff");
  harness.service.agentMoveTicket(harness.asAgent(), {
    ticketId: inProgress.id,
    to: "in_progress",
  });
  reachAwaitingVerification(harness);
}

describe("the bash-ask listener", () => {
  it("asks for bash while a ticket awaits verification", async () => {
    const harness = createHarness();
    harness.installService();
    // bash-ask listener removed; profile drives ask via bashContext
    reachAwaitingVerification(harness);

    const listener = bashAskListener(harness);
    const decision = await listener(
      harness.makeExec("bash", { command: "ls" }, harness.agent),
      async () => ({ kind: "allow" }),
    );
    expect(decision.kind).toBe("ask");
    if (decision.kind === "ask") {
      expect(typeof decision.reason).toBe("string");
    }
  });

  it("a concurrent in-progress ticket suppresses the ask", async () => {
    const harness = createHarness();
    harness.installService();
    // bash-ask listener removed; profile drives ask via bashContext
    reachAwaitingVerificationWithInProgress(harness);

    const listener = bashAskListener(harness);
    const decision = await listener(
      harness.makeExec("bash", { command: "ls" }, harness.agent),
      async () => ({ kind: "allow" }),
    );
    expect(decision).toEqual({ kind: "allow" });
  });

  it("a second bash call asks again (one-shot outcomes)", async () => {
    const harness = createHarness();
    harness.installService();
    // bash-ask listener removed; profile drives ask via bashContext
    reachAwaitingVerification(harness);

    const listener = bashAskListener(harness);
    const first = await listener(
      harness.makeExec("bash", { command: "ls" }, harness.agent),
      async () => ({ kind: "allow" }),
    );
    const second = await listener(
      harness.makeExec("bash", { command: "ls" }, harness.agent),
      async () => ({ kind: "allow" }),
    );
    expect(first.kind).toBe("ask");
    expect(second.kind).toBe("ask");
  });

  it("delegates to next for other tools", async () => {
    const harness = createHarness();
    harness.installService();
    // bash-ask listener removed; profile drives ask via bashContext
    reachAwaitingVerification(harness);

    const listener = bashAskListener(harness);
    const decision = await listener(
      harness.makeExec("read", { file_path: "src/a.ts" }),
      async () => ({ kind: "allow" }),
    );
    expect(decision).toEqual({ kind: "allow" });
  });

  it("delegates bash when no ticket awaits verification", async () => {
    const harness = createHarness();
    harness.installService();
    // bash-ask listener removed; profile drives ask via bashContext

    const listener = bashAskListener(harness);
    const decision = await listener(
      harness.makeExec("bash", { command: "ls" }),
      async () => ({ kind: "allow" }),
    );
    expect(decision).toEqual({ kind: "allow" });
  });

  it("allowed-once proceeds through the approval seam", async () => {
    const harness = createHarness();
    harness.approval = { request: async () => "allowed-once" };
    const decision = await harness.resolveAsk(
      { kind: "ask", reason: "bash while awaiting verification" },
      harness.makeExec("bash", {}),
    );
    expect(decision).toEqual({ kind: "allow" });
  });

  it("the non-grants deny with distinct reasons", async () => {
    for (const outcome of ["rejected", "cancelled", "unavailable"] as const) {
      const harness = createHarness();
      harness.approval = { request: async () => outcome };
      const decision = await harness.resolveAsk(
        { kind: "ask" },
        harness.makeExec("bash", {}),
      );
      expect(decision.kind, `approval ${outcome} must deny`).toBe("deny");
    }
  });

  it("an absent approval service degrades to deny", async () => {
    const harness = createHarness();
    harness.approval = undefined;
    const decision = await harness.resolveAsk(
      { kind: "ask" },
      harness.makeExec("bash", {}),
    );
    expect(decision.kind).toBe("deny");
    if (decision.kind === "deny") {
      expect(decision.reason.length).toBeGreaterThan(0);
    }
  });

  it("allow and deny decisions pass through unchanged", async () => {
    const harness = createHarness();
    expect(await harness.resolveAsk({ kind: "allow" }, harness.makeExec("bash", {}))).toEqual({
      kind: "allow",
    });
    expect(
      await harness.resolveAsk({ kind: "deny", reason: "manual" }, harness.makeExec("bash", {})),
    ).toEqual({ kind: "deny", reason: "manual" });
  });
});
