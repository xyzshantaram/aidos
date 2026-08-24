/**
 * Item 22. The agent has no path to done, whatever evidence it attaches.
 *
 * A plan import is no way around this. An import lands in the state "open"
 * even when the document marks every ticket done. The kernel refuses the
 * awaiting_verification to done move for the agent, names the missing kind
 * and the allowed actors, and leaves the ticket put. The earlier states
 * refuse with the pair named. The imported claim stays a
 * builtin:imported_state row with author system only.
 *
 * The port runs against the service: the user side goes through
 * userAttachEvidence / userMoveTicket, the agent side through
 * agentAttachEvidence / agentMoveTicket.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosEvent } from "../src/kernel/events";
import { expectGateRefused } from "./helpers";
import { createHarness, type Harness } from "./b1-harness";

/** Every ticket carries the done mark. None of them may land in "done". */
const ALL_DONE_PLAN = `- [x] **Ticket 1: First claim.** A body. **Evaluate:** A test passes.
- [x] **Ticket 2: Second claim.** A body. **Evaluate:** A test passes.
`;

/** The kinds the CLI may author, from the B0 constant table. */
const AGENT_AUTHORABLE = [
  "builtin:automated_check",
  "builtin:after_shot",
  "builtin:test_run",
  "builtin:review_note",
  "builtin:review_pass",
];

/** Drive one ticket to awaiting_verification on the service. Returns its id. */
function driveToAwaitingVerification(harness: Harness): number {
  const service = harness.service;
  const agent = harness.asAgent();
  const ticket = service.setTicket(agent, { title: "Ticket one", body: "A body." }).id;

  service.userAttachEvidence(agent, {
    ticketId: ticket,
    kind: "builtin:user_signoff",
    payload: { ok: true },
  });
  service.userMoveTicket(agent, { ticketId: ticket, to: "in_progress" });
  for (const kind of AGENT_AUTHORABLE) {
    service.agentAttachEvidence(agent, { ticketId: ticket, kind });
  }
  service.userMoveTicket(agent, { ticketId: ticket, to: "awaiting_verification" });
  return ticket;
}

describe("no agent path to done", () => {
  it("the setup reaches awaiting_verification", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const ticket = driveToAwaitingVerification(harness);

    const state = harness.service
      .getTickets(agent)
      .find((row) => row.id === ticket)?.state;
    expect(state).toBe("awaiting_verification");
    const attached = new Set(
      harness
        .aidosEvents(harness.agent)
        .filter(
          (event): event is Extract<AidosEvent, { kind: "evidence/attached" }> =>
            event.kind === "evidence/attached" && event.ticketId === ticket,
        )
        .map((event) => event.row.kind),
    );
    for (const kind of AGENT_AUTHORABLE) {
      expect(attached.has(kind)).toBe(true);
    }
  });

  it("done is refused with every agent kind attached", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const ticket = driveToAwaitingVerification(harness);

    expect(() =>
      harness.service.agentMoveTicket(agent, { ticketId: ticket, to: "done" }),
    ).toThrow(GateRefused);
  });

  it("the refusal names the missing kind or the allowed actors", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const ticket = driveToAwaitingVerification(harness);

    const refusal = expectGateRefused(() =>
      harness.service.agentMoveTicket(agent, { ticketId: ticket, to: "done" }),
    );
    const missing = refusal.missingKinds;
    const allowed = refusal.allowedActors;
    expect(missing.length > 0 || allowed.length > 0).toBe(true);
    if (missing.length > 0) {
      expect(missing).toContain("builtin:user_verified");
    }
    if (allowed.length > 0) {
      expect([...allowed].sort()).toEqual(["user"]);
    }
  });

  it("the ticket stays in awaiting_verification", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const ticket = driveToAwaitingVerification(harness);

    expect(() =>
      harness.service.agentMoveTicket(agent, { ticketId: ticket, to: "done" }),
    ).toThrow(GateRefused);
    const state = harness.service
      .getTickets(agent)
      .find((row) => row.id === ticket)?.state;
    expect(state).toBe("awaiting_verification");
  });

  it("done is refused from the earlier states", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const service = harness.service;

    const openTicket = service.setTicket(agent, { title: "Still open", body: "A body." }).id;

    const fromOpen = expectGateRefused(() =>
      service.agentMoveTicket(agent, { ticketId: openTicket, to: "done" }),
    );
    expect(fromOpen.fromState).toBe("open");
    expect(fromOpen.toState).toBe("done");
    const openState = service.getTickets(agent).find((row) => row.id === openTicket)?.state;
    expect(openState).toBe("open");

    service.userAttachEvidence(agent, {
      ticketId: openTicket,
      kind: "builtin:user_signoff",
      payload: { ok: true },
    });
    service.userMoveTicket(agent, { ticketId: openTicket, to: "in_progress" });

    const fromInProgress = expectGateRefused(() =>
      service.agentMoveTicket(agent, { ticketId: openTicket, to: "done" }),
    );
    expect(fromInProgress.fromState).toBe("in_progress");
    expect(fromInProgress.toState).toBe("done");
    const inProgressState = service.getTickets(agent).find((row) => row.id === openTicket)?.state;
    expect(inProgressState).toBe("in_progress");
  });

  it("a plan import cannot produce a done ticket", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const planFile = harness.tempPlanFile(ALL_DONE_PLAN);
    harness.service.planImport(agent, { file: planFile });

    const tickets = harness.service.getTickets(agent);
    expect(tickets.length).toBe(2);
    expect(tickets.map((ticket) => ticket.state)).toEqual(["open", "open"]);
  });

  it("an import keeps the done claim as evidence only", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const planFile = harness.tempPlanFile(ALL_DONE_PLAN);
    harness.service.planImport(agent, { file: planFile });

    for (const ticketId of [1, 2]) {
      const rows = harness
        .aidosEvents(harness.agent)
        .filter(
          (event): event is Extract<AidosEvent, { kind: "evidence/attached" }> =>
            event.kind === "evidence/attached" && event.ticketId === ticketId,
        )
        .filter((event) => event.row.kind === "builtin:imported_state");
      expect(rows.length).toBe(1);
      expect(rows[0].row.payload).toEqual({
        claimed_state: "done",
        source: planFile,
      });
      expect(rows[0].row.author).toBe("system");
      const state = harness.service
        .getTickets(agent)
        .find((row) => row.id === ticketId)?.state;
      expect(state).toBe("open");
    }
  });
});
