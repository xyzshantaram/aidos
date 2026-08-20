/**
 * Item 6. A gate refuses a move when a required kind is missing.
 *
 * The refusal lists the absent kinds and the actors the gate permits, and
 * its text names the missing kinds. The ticket never leaves its state.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { expectGateRefused, expectSameItems, makeConfig, makeStore } from "./helpers";

const TWO_KINDS_CONFIG: AidosConfig = makeConfig([
  {
    id: "builtin:req",
    label: "Required",
    description: "Required evidence.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
  {
    id: "builtin:other",
    label: "Other",
    description: "Other evidence.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
]);

function storeWithGate(): ReturnType<typeof makeStore> {
  const config: AidosConfig = {
    kinds: TWO_KINDS_CONFIG.kinds,
    gates: [
      {
        fromState: "open",
        toState: "in_progress",
        requiredKinds: ["builtin:req", "builtin:other"],
        allowedActors: ["user"],
      },
    ],
  };
  return makeStore(config);
}

describe("gate refuses missing kind", () => {
  it("a missing kind refuses the move", () => {
    const store = storeWithGate();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "in_progress", "user"),
    );
    expect(refusal).toBeInstanceOf(GateRefused);
    expectSameItems(refusal.missingKinds, ["builtin:req", "builtin:other"]);
    expect(refusal.allowedActors).toEqual(["user"]);
    expect(String(refusal)).toContain("builtin:req");
    expect(String(refusal)).toContain("builtin:other");
    expect(store.getTicket(ticket).state).toBe("open");
  });

  it("a partial kind set lists only the absent kind", () => {
    const store = storeWithGate();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });
    store.attachEvidence(ticket, "builtin:req", { x: 1 }, "user");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "in_progress", "user"),
    );
    expectSameItems(refusal.missingKinds, ["builtin:other"]);
    expect(store.getTicket(ticket).state).toBe("open");
  });
});
