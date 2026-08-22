/**
 * Item 27. The CLI walks the lifecycle as far as a machine may go.
 *
 * The agent creates the ticket and makes every move it may make. The board
 * supplies the human evidence through the user actor. The last gate stays
 * shut.
 *
 * The port runs against the service: the user side goes through
 * userAttachEvidence / userMoveTicket, the agent side through
 * agentAttachEvidence / agentMoveTicket.
 */

import { describe, expect, it } from "vitest";

import { EvidenceAuthorRefused, GateRefused } from "../src/kernel/types";
import { expectEvidenceAuthorRefused, expectGateRefused } from "./helpers";
import { createHarness, type Harness } from "./b1-harness";

/** A fresh harness on the default config, with one agent-created ticket. */
function freshHarness(): { harness: Harness; ticketId: number } {
  const harness = createHarness();
  harness.installService();
  const ticketId = harness.service
    .setTicket(harness.asAgent(), { title: "Walk the lifecycle", body: "A body." })
    .id;
  return { harness, ticketId };
}

/** The service's board state for one ticket, or null. */
function stateOf(harness: Harness, ticketId: number): string | null {
  return harness.service
    .getTickets(harness.asAgent())
    .find((row) => row.id === ticketId)?.state ?? null;
}

describe("lifecycle with the human half blocked", () => {
  it("a new ticket starts open", () => {
    const { harness, ticketId } = freshHarness();
    expect(stateOf(harness, ticketId)).toBe("open");
  });

  it("the move out of open needs a signoff", () => {
    const { harness, ticketId } = freshHarness();
    const refusal = expectGateRefused(() =>
      harness.service.agentMoveTicket(harness.asAgent(), { ticketId, to: "in_progress" }),
    );
    expect(refusal.missingKinds).toEqual(["builtin:user_signoff"]);
    expect(stateOf(harness, ticketId)).toBe("open");
  });

  it("the agent cannot supply the signoff itself", () => {
    const { harness, ticketId } = freshHarness();
    const error = expectEvidenceAuthorRefused(() =>
      harness.service.agentAttachEvidence(harness.asAgent(), {
        ticketId,
        kind: "builtin:user_signoff",
        payload: {},
      }),
    );
    expect(error).toBeInstanceOf(EvidenceAuthorRefused);
    expect(error.kind).toBe("builtin:user_signoff");
    expect(stateOf(harness, ticketId)).toBe("open");
  });

  it("the agent reaches in progress after a human signoff", () => {
    const { harness, ticketId } = freshHarness();
    const agent = harness.asAgent();
    expect(() =>
      harness.service.agentMoveTicket(agent, { ticketId, to: "in_progress" }),
    ).toThrow(GateRefused);
    harness.service.userAttachEvidence(agent, {
      ticketId,
      kind: "builtin:user_signoff",
      payload: { ok: true },
    });
    harness.service.agentMoveTicket(agent, { ticketId, to: "in_progress" });
    expect(stateOf(harness, ticketId)).toBe("in_progress");
  });

  it("the agent reaches awaiting verification", () => {
    const { harness, ticketId } = freshHarness();
    const agent = harness.asAgent();
    harness.service.userAttachEvidence(agent, {
      ticketId,
      kind: "builtin:user_signoff",
      payload: { ok: true },
    });
    harness.service.agentMoveTicket(agent, { ticketId, to: "in_progress" });
    harness.service.agentAttachEvidence(agent, { ticketId, kind: "builtin:automated_check" });
    harness.service.agentAttachEvidence(agent, { ticketId, kind: "builtin:review_pass" });
    harness.service.agentMoveTicket(agent, { ticketId, to: "awaiting_verification" });
    expect(stateOf(harness, ticketId)).toBe("awaiting_verification");
  });

  it("the automated check is needed for the second move", () => {
    const { harness, ticketId } = freshHarness();
    const agent = harness.asAgent();
    harness.service.userAttachEvidence(agent, {
      ticketId,
      kind: "builtin:user_signoff",
      payload: { ok: true },
    });
    harness.service.agentMoveTicket(agent, { ticketId, to: "in_progress" });
    harness.service.agentAttachEvidence(agent, { ticketId, kind: "builtin:review_pass" });

    const refusal = expectGateRefused(() =>
      harness.service.agentMoveTicket(agent, { ticketId, to: "awaiting_verification" }),
    );
    expect(refusal.missingKinds).toEqual(["builtin:automated_check"]);
    expect(stateOf(harness, ticketId)).toBe("in_progress");
  });

  it("done stays blocked", () => {
    const { harness, ticketId } = freshHarness();
    const agent = harness.asAgent();
    harness.service.userAttachEvidence(agent, {
      ticketId,
      kind: "builtin:user_signoff",
      payload: { ok: true },
    });
    harness.service.agentMoveTicket(agent, { ticketId, to: "in_progress" });
    harness.service.agentAttachEvidence(agent, { ticketId, kind: "builtin:automated_check" });
    harness.service.agentAttachEvidence(agent, { ticketId, kind: "builtin:review_pass" });
    harness.service.agentMoveTicket(agent, { ticketId, to: "awaiting_verification" });

    const refusal = expectGateRefused(() =>
      harness.service.agentMoveTicket(agent, { ticketId, to: "done" }),
    );
    expect(refusal.fromState).toBe("awaiting_verification");
    expect(refusal.toState).toBe("done");
    expect([...refusal.allowedActors].sort()).toEqual(["user"]);
    expect(stateOf(harness, ticketId)).toBe("awaiting_verification");
  });
});
