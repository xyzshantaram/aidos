/**
 * Ticket #63: the injection seam. User/system-actor board events queue a
 * one-line note; a debounce timer flushes them as ONE digest into the live
 * agent's inbox via agent.steer: a running agent consumes it at the next
 * step boundary; an IDLE agent STARTS A TURN (the user-reported behavior —
 * quiet inject left board updates unread until the user happened to
 * prompt, which defeats the seam's purpose).
 * Agent-actor events never queue. Failures are swallowed.
 */
import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { Store } from "../src/kernel/store";
import { createHarness } from "./b1-harness";

/** Build a harness with one signed-off open ticket and debounce 0. */
function makeFixture() {
  const harness = createHarness();
  const store = new Store(DEFAULT_CONFIG, { now: () => 1788196000 });
  const project = store.createProject("/srv/proj/cli", "cli");
  const ticket = store.createTicket(project, "Injection probe", "d", { actor: "agent" });
  harness.seedFromStore(store);
  harness.installService();
  // Debounce 0: queue flushes synchronously, so no fake timers are needed.
  const internal = harness.service as unknown as {
    _resolvedConfig: { injectDebounceMs: number; injectEnabled: boolean };
  };
  internal._resolvedConfig.injectDebounceMs = 0;
  internal._resolvedConfig.injectEnabled = true;
  // Record what the live agent receives.
  const injected: string[] = [];
  const live = harness.asAgent() as unknown as { steer: (m: unknown) => void };
  live.steer = (message: unknown) => {
    const blocks = (message as { content: Array<{ type: string; text?: string }> }).content;
    const text = blocks
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join(" ");
    injected.push(text);
  };
  return { harness, ticketId: ticket, injected };
}

describe("injection seam", () => {
  it("a user move injects one digest naming the ticket and transition", () => {
    const { harness, ticketId, injected } = makeFixture();
    // The gate needs the signoff row first; its attach injects its own line.
    harness.service.userAttachEvidence(harness.asAgent(), {
      ticketId,
      kind: "builtin:user_signoff",
    });
    harness.service.userMoveTicket(harness.asAgent(), { ticketId, to: "in_progress" });
    expect(injected.length).toBe(2);
    expect(injected[0]).toContain("user_signoff");
    expect(injected[1]).toContain("#" + String(ticketId));
    expect(injected[1]).toContain("Injection probe");
    expect(injected[1]).toContain("open -> in_progress");
    expect(injected[1]).toContain("by user");
  });

  it("user evidence attach injects the kind", () => {
    const { harness, ticketId, injected } = makeFixture();
    harness.service.userAttachEvidence(harness.asAgent(), {
      ticketId,
      kind: "builtin:user_signoff",
    });
    expect(injected.length).toBe(1);
    expect(injected[0]).toContain("user_signoff");
  });

  it("agent-actor moves inject nothing", () => {
    const { harness, ticketId, injected } = makeFixture();
    // Sign off first so the agent's own move passes the gate.
    harness.service.userAttachEvidence(harness.asAgent(), {
      ticketId,
      kind: "builtin:user_signoff",
    });
    const before = injected.length;
    harness.service.agentMoveTicket(harness.asAgent(), { ticketId, to: "in_progress" });
    expect(injected.length).toBe(before);
  });

  it("an inject failure never fails the commit", () => {
    const { harness, ticketId } = makeFixture();
    harness.service.userAttachEvidence(harness.asAgent(), {
      ticketId,
      kind: "builtin:user_signoff",
    });
    const live = harness.asAgent() as unknown as { inject: (m: unknown) => void };
    live.inject = () => {
      throw new Error("inbox exploded");
    };
    expect(() =>
      harness.service.userMoveTicket(harness.asAgent(), { ticketId, to: "in_progress" }),
    ).not.toThrow();
    // The move still committed.
    const row = harness.service.getTickets(harness.asAgent()).find((t) => t.id === ticketId);
    expect(row?.state).toBe("in_progress");
  });
});
