/**
 * Item 8. The full lifecycle from open to done, one gate step at a time.
 *
 * The prototype attached every required kind as the move's actor. The
 * constant table admits both user and agent for every kind the flow
 * attaches, so the same pattern works here: the helper attaches each
 * kind as the move's actor, then moves the ticket. The refusal and the
 * move claims are unchanged.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { expectGateRefused, expectSameItems, makeConfig, makeStore } from "./helpers";

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

describe("full lifecycle", () => {
  it("drives open to done", () => {
    const store = makeStore(GATE_CONFIG);
    const project = store.createProject("/srv/proj/life", "life");
    const ticket = store.createTicket(project, "Lifecycle", "d", {
      actor: "user",
    });

    const moveAfterAttaching = (
      toState: "in_progress" | "awaiting_verification" | "done",
      kinds: string[],
      moveActor: "user" | "agent",
    ) => {
      const refusal = expectGateRefused(() =>
        store.moveTicket(ticket, toState, moveActor),
      );
      expectSameItems(refusal.missingKinds, kinds);
      for (const kind of kinds) {
        store.attachEvidence(ticket, kind, { k: kind }, moveActor);
      }
      store.moveTicket(ticket, toState, moveActor);
    };

    moveAfterAttaching(
      "in_progress",
      ["builtin:eval_criteria", "builtin:file_allowlist", "builtin:user_signoff"],
      "user",
    );
    expect(store.getTicket(ticket).state).toBe("in_progress");

    moveAfterAttaching("awaiting_verification", ["builtin:agent_report"], "agent");
    expect(store.getTicket(ticket).state).toBe("awaiting_verification");

    const refusal = expectGateRefused(() => store.moveTicket(ticket, "done", "agent"));
    expect(refusal).toBeInstanceOf(GateRefused);
    expect(refusal.allowedActors).toEqual(["user"]);
    expect(store.getTicket(ticket).state).toBe("awaiting_verification");

    moveAfterAttaching("done", ["builtin:review_pass", "builtin:after_shot"], "user");
    expect(store.getTicket(ticket).state).toBe("done");
  });
});
