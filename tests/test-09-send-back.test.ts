/**
 * Item 9. Send-back keeps the evidence attached earlier.
 *
 * The awaiting_verification to in_progress edge is the one backward move
 * the kernel allows (SPEC decision 3). It needs a comment from the user,
 * and it keeps every row that the earlier gates required.
 */

import { describe, expect, it } from "vitest";

import type { AidosConfig } from "../src/kernel/types";
import { makeConfig, makeStore } from "./helpers";

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
    const store = makeStore(config);
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    store.attachEvidence(ticket, "builtin:agent_report", { lines: 5 }, "agent");
    store.moveTicket(ticket, "awaiting_verification", "agent");

    store.attachEvidence(ticket, "builtin:comment", { text: "fix this" }, "user");
    store.moveTicket(ticket, "in_progress", "user");

    const kinds = new Set(store.evidenceFor(ticket).map((row) => row.kind));
    expect(kinds).toEqual(
      new Set(["builtin:user_signoff", "builtin:agent_report", "builtin:comment"]),
    );
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });
});
