/**
 * Item 10. A high score does not bypass a gate.
 *
 * The score is advisory. The audit kinds push it past one hundred, and the
 * gate still demands its own review pass row. Nothing gates on the score.
 */

import { describe, expect, it } from "vitest";

import type { AidosConfig } from "../src/kernel/types";
import {
  expectGateRefused,
  expectSameItems,
  makeConfig,
  makeStore,
} from "./helpers";

const CONFIG: AidosConfig = makeConfig([
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
    weight: 1.0,
    allowedAuthors: ["agent"],
  },
  {
    id: "builtin:review_pass",
    label: "Review pass",
    description: "A human review passed.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
  {
    id: "plugin:audit:a",
    label: "Audit a",
    description: "Advisory evidence.",
    weight: 50.0,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "plugin:audit:b",
    label: "Audit b",
    description: "More advisory evidence.",
    weight: 50.0,
    allowedAuthors: ["agent"],
  },
]);

describe("score is advisory", () => {
  it("a high score does not open the gate", () => {
    const store = makeStore({
      kinds: CONFIG.kinds,
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
          allowedActors: ["user"],
        },
        {
          fromState: "awaiting_verification",
          toState: "done",
          requiredKinds: ["builtin:review_pass"],
          allowedActors: ["user"],
        },
      ],
    });
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    store.attachEvidence(ticket, "builtin:agent_report", { ok: true }, "agent");
    store.moveTicket(ticket, "awaiting_verification", "user");

    store.attachEvidence(ticket, "plugin:audit:a", { x: 1 }, "user");
    store.attachEvidence(ticket, "plugin:audit:b", { y: 1 }, "agent");
    store.attachEvidence(ticket, "plugin:audit:a", { x: 2 }, "agent");

    expect(store.confidenceScore(ticket)).toBeGreaterThanOrEqual(100.0);

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "done", "user"),
    );
    expectSameItems(refusal.missingKinds, ["builtin:review_pass"]);

    store.attachEvidence(ticket, "builtin:review_pass", { ok: true }, "user");
    store.moveTicket(ticket, "done", "user");
    expect(store.getTicket(ticket).state).toBe("done");
  });
});
