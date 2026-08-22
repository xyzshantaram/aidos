/**
 * Item 8. The full lifecycle from open to done, one gate step at a time.
 *
 * The prototype attached every required kind as the move's actor. The
 * constant table admits both user and agent for every kind the flow
 * attaches, so the same pattern works here. The port runs against the
 * service: an agent-side action goes through agentAttachEvidence /
 * agentMoveTicket, a user-side action through userAttachEvidence /
 * userMoveTicket. The refusal and the move claims are unchanged.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { expectGateRefused, expectSameItems, makeConfig } from "./helpers";
import { createHarness, type Harness } from "./b1-harness";
import type { AidosService } from "../src/host/aidos-core";

const GATE_CONFIG: AidosConfig = {
  kinds: makeConfig().kinds,
  gates: [
    {
      fromState: "open",
      toState: "in_progress",
      requiredKinds: [
        "builtin:eval_criteria",
        "builtin:file_allowlist",
        "builtin:user_signoff",
      ],
      allowedActors: ["user"],
    },
    {
      fromState: "in_progress",
      toState: "awaiting_verification",
      requiredKinds: ["builtin:agent_report"],
      allowedActors: ["user", "agent"],
    },
    {
      fromState: "awaiting_verification",
      toState: "in_progress",
      requiredKinds: ["builtin:comment"],
      allowedActors: ["user"],
    },
    {
      fromState: "awaiting_verification",
      toState: "done",
      requiredKinds: ["builtin:review_pass", "builtin:after_shot"],
      allowedActors: ["user"],
    },
  ],
};

/** The board-state read on the service: the row's state, or null. */
function stateOf(harness: Harness, service: AidosService, ticketId: number): string | null {
  return service.getTickets(harness.asAgent()).find((row) => row.id === ticketId)?.state ?? null;
}

describe("full lifecycle", () => {
  it("drives open to done", () => {
    const harness = createHarness();
    harness.settingsValue = GATE_CONFIG;
    const service = harness.installService();
    const agent = harness.asAgent();

    const ticket = service.userSetTicket(agent, { title: "Lifecycle", description: "d" }).id;

    const moveAfterAttaching = (
      toState: "in_progress" | "awaiting_verification" | "done",
      kinds: string[],
      moveActor: "user" | "agent",
    ) => {
      const refusal = expectGateRefused(() =>
        moveActor === "user"
          ? service.userMoveTicket(agent, { ticketId: ticket, to: toState })
          : service.agentMoveTicket(agent, { ticketId: ticket, to: toState }),
      );
      expectSameItems(refusal.missingKinds, kinds);
      for (const kind of kinds) {
        const attach = { ticketId: ticket, kind, payload: { k: kind } };
        if (moveActor === "user") {
          service.userAttachEvidence(agent, attach);
        } else {
          service.agentAttachEvidence(agent, attach);
        }
      }
      if (moveActor === "user") {
        service.userMoveTicket(agent, { ticketId: ticket, to: toState });
      } else {
        service.agentMoveTicket(agent, { ticketId: ticket, to: toState });
      }
    };

    moveAfterAttaching(
      "in_progress",
      ["builtin:eval_criteria", "builtin:file_allowlist", "builtin:user_signoff"],
      "user",
    );
    expect(stateOf(harness, service, ticket)).toBe("in_progress");

    moveAfterAttaching("awaiting_verification", ["builtin:agent_report"], "agent");
    expect(stateOf(harness, service, ticket)).toBe("awaiting_verification");

    const refusal = expectGateRefused(() => service.agentMoveTicket(agent, { ticketId: ticket, to: "done" }));
    expect(refusal).toBeInstanceOf(GateRefused);
    expect(refusal.allowedActors).toEqual(["user"]);
    expect(stateOf(harness, service, ticket)).toBe("awaiting_verification");

    moveAfterAttaching("done", ["builtin:review_pass", "builtin:after_shot"], "user");
    expect(stateOf(harness, service, ticket)).toBe("done");
  });
});
