/**
 * Item 18. The registry survives a close and a reopen.
 *
 * The registry lives in the config, which the replay passes to the fresh
 * store unchanged. The ported claims read: a kind registered before the
 * replay is still registered, the gate is still enforced, the weight still
 * applies, and deny by default still holds.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { expectGateRefused, expectSameItems, makeConfig, makeStore, storeFromLog } from "./helpers";

const CONFIG: AidosConfig = {
  kinds: makeConfig([
    {
      id: "builtin:user_signoff",
      label: "User signoff",
      description: "The human signs off.",
      weight: 1.0,
      allowedAuthors: ["user"],
    },
    {
      id: "builtin:agent_report",
      label: "Agent report",
      description: "The agent reports.",
      weight: 2.5,
      allowedAuthors: ["agent"],
    },
  ]).kinds,
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
  ],
};

describe("the registry survives a reopen", () => {
  it("the registry survives a replay from the log", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/x", "x");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");

    const reopened = storeFromLog(store.events(), CONFIG);

    // A kind registered before the close is still registered.
    reopened.attachEvidence(ticket, "builtin:user_signoff", { again: true }, "user");

    // The gate set before the close is still enforced.
    const refusal = expectGateRefused(() =>
      reopened.moveTicket(ticket, "awaiting_verification", "agent"),
    );
    expect(refusal).toBeInstanceOf(GateRefused);
    expectSameItems(refusal.missingKinds, ["builtin:agent_report"]);
    reopened.attachEvidence(ticket, "builtin:agent_report", { lines: 2 }, "agent");
    reopened.moveTicket(ticket, "awaiting_verification", "agent");
    expect(reopened.getTicket(ticket).state).toBe("awaiting_verification");

    // The weight set before the close still applies. The signoff counts
    // once for the user and the report once for the agent.
    expect(reopened.confidenceScore(ticket)).toBe(3.5);

    // Deny by default still holds.
    expect(() => reopened.moveTicket(ticket, "done", "user")).toThrow(
      GateRefused,
    );
    expect(reopened.getTicket(ticket).state).toBe("awaiting_verification");
  });
});
