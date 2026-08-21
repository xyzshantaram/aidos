/**
 * The bash-ask listener (SPEC-B1.md sections 4 and 9, decision 11).
 *
 * A `tools/pre-execute` listener returns `ask` for the bash tool while any
 * ticket sits in awaiting_verification; every other tool delegates to
 * `next()`. Approval outcomes are one-shot, so each call asks again. The ask
 * resolves through the approval seam via `ctx.get("approval")`: allowed-once
 * proceeds, the non-grants deny, and an absent approval service degrades to
 * deny (SPEC-B1.md section 5).
 */

import { describe, expect, it } from "vitest";

import { installBashAskListener } from "../src/tools/bash-ask";
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

/** The one pre-execute listener the installer registered. */
function bashAskListener(harness: Harness): BashAskListener {
  const records = harness.listeners["tools/pre-execute"];
  expect(records.length).toBeGreaterThan(0);
  return records[0].listener as unknown as BashAskListener;
}

/** Drive one ticket into awaiting_verification on the harness session. */
function reachAwaitingVerification(harness: Harness) {
  const ticket = harness.service.setTicket(harness.asAgent(), { title: "Under review" });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:user_signoff");
  harness.service.moveTicket(harness.asAgent(), { ticketId: ticket.id, to: "in_progress" });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:automated_check");
  harness.seedEvidence(harness.agent, ticket.id, "builtin:review_pass");
  harness.service.moveTicket(harness.asAgent(), {
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
  harness.service.moveTicket(harness.asAgent(), {
    ticketId: inProgress.id,
    to: "in_progress",
  });
  reachAwaitingVerification(harness);
}

describe("the bash-ask listener", () => {
  it("asks for bash while a ticket awaits verification", async () => {
    const harness = createHarness();
    harness.installService();
    installBashAskListener(asContext(harness.ctx));
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
    installBashAskListener(asContext(harness.ctx));
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
    installBashAskListener(asContext(harness.ctx));
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
    installBashAskListener(asContext(harness.ctx));
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
    installBashAskListener(asContext(harness.ctx));

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
