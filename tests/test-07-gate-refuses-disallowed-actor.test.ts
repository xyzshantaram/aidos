/**
 * Item 7. A gate refuses a move by a disallowed actor.
 *
 * The refusal names the actors the gate permits. The same move by a
 * permitted actor succeeds.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { expectGateRefused, makeConfig, makeStore } from "./helpers";

describe("gate refuses disallowed actor", () => {
  it("a disallowed actor is refused but the user succeeds", () => {
    const config: AidosConfig = {
      kinds: makeConfig().kinds,
      gates: [
        {
          fromState: "open",
          toState: "in_progress",
          requiredKinds: ["builtin:user_signoff"],
          allowedActors: ["user"],
        },
      ],
    };
    const store = makeStore(config);
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "in_progress", "agent"),
    );
    expect(refusal).toBeInstanceOf(GateRefused);
    expect(refusal.allowedActors).toEqual(["user"]);

    store.moveTicket(ticket, "in_progress", "user");
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });
});
