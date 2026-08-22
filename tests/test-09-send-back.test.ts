/**
 * Item 9. Send-back keeps the evidence attached earlier.
 *
 * The awaiting_verification to in_progress edge is the one backward move
 * the kernel allows (SPEC decision 3). It needs a comment from the user,
 * and it keeps every row that the earlier gates required. The port runs
 * against the service: the user side goes through userAttachEvidence /
 * userMoveTicket, the agent side through agentAttachEvidence /
 * agentMoveTicket.
 *
 * The "fix this" remark is an evidence row of kind builtin:comment, not a
 * comment/added event: the send-back gate reads the ticket's evidence rows,
 * and a comment event never lands in evidence. So the user attaches it
 * through userAttachEvidence, not userAddComment.
 */

import { describe, expect, it } from "vitest";

import type { AidosConfig } from "../src/kernel/types";
import type { AidosEvent } from "../src/kernel/events";
import { makeConfig } from "./helpers";
import { createHarness } from "./b1-harness";

describe("send back", () => {
  it("the evidence survives a send back", () => {
    const config: AidosConfig = {
      kinds: makeConfig().kinds,
      gates: [
        {
          fromState: "open",
          toState: "in_progress",
          requiredKinds: ["builtin:user_signoff"],
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
      ],
    };
    const harness = createHarness();
    harness.settingsValue = config;
    const service = harness.installService();
    const agent = harness.asAgent();

    const ticket = service.userSetTicket(agent, { title: "T", description: "d" }).id;

    service.userAttachEvidence(agent, {
      ticketId: ticket,
      kind: "builtin:user_signoff",
      payload: { ok: true },
    });
    service.userMoveTicket(agent, { ticketId: ticket, to: "in_progress" });
    service.agentAttachEvidence(agent, {
      ticketId: ticket,
      kind: "builtin:agent_report",
      payload: { lines: 5 },
    });
    service.agentMoveTicket(agent, { ticketId: ticket, to: "awaiting_verification" });

    service.userAttachEvidence(agent, {
      ticketId: ticket,
      kind: "builtin:comment",
      payload: { text: "fix this" },
    });
    service.userMoveTicket(agent, { ticketId: ticket, to: "in_progress" });

    const kinds = new Set(
      harness
        .aidosEvents(harness.agent)
        .filter(
          (event): event is Extract<AidosEvent, { kind: "evidence/attached" }> =>
            event.kind === "evidence/attached" && event.ticketId === ticket,
        )
        .map((event) => event.row.kind),
    );
    expect(kinds).toEqual(
      new Set(["builtin:user_signoff", "builtin:agent_report", "builtin:comment"]),
    );
    const state = service
      .getTickets(agent)
      .find((row) => row.id === ticket)?.state;
    expect(state).toBe("in_progress");
  });
});
