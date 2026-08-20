/**
 * Item 12. Loosening a gate is a data change, not a schema change.
 *
 * The kernel keeps the gate in config, so loosening never touches the log
 * and never migrates a record. The ported claim reads: a store built from
 * the same log with the looser gate allows the move, and the ticket, the
 * evidence, and the log are exactly the ones the first store had.
 */

import { describe, expect, it } from "vitest";

import type { AidosConfig } from "../src/kernel/types";
import { expectGateRefused, expectSameItems, makeConfig, makeStore, storeFromLog } from "./helpers";

const KINDS: AidosConfig = makeConfig([
  {
    id: "builtin:user_signoff",
    label: "User signoff",
    description: "The human signs off.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
  {
    id: "plugin:check:x",
    label: "Check x",
    description: "Extra check.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
  {
    id: "plugin:check:y",
    label: "Check y",
    description: "Extra check.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
]);

function configWithAwaitingKinds(kinds: string[]): AidosConfig {
  return {
    kinds: KINDS.kinds,
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
        requiredKinds: kinds,
        allowedActors: ["user"],
      },
    ],
  };
}

describe("loosening a gate needs no migration", () => {
  it("a removed kind no longer blocks", () => {
    const store = makeStore(configWithAwaitingKinds(["plugin:check:x", "plugin:check:y"]));
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    store.attachEvidence(ticket, "plugin:check:x", { ok: true }, "user");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "awaiting_verification", "user"),
    );
    expectSameItems(refusal.missingKinds, ["plugin:check:y"]);

    const ticketBefore = store.getTicket(ticket);
    const rowsBefore = store.evidenceFor(ticket);
    const logBefore = store.events();

    const loosened = storeFromLog(
      store.events(),
      configWithAwaitingKinds(["plugin:check:x"]),
    );

    expect(loosened.getTicket(ticket)).toEqual(ticketBefore);
    expect(loosened.evidenceFor(ticket)).toEqual(rowsBefore);
    expect(loosened.events()).toEqual(logBefore);

    loosened.moveTicket(ticket, "awaiting_verification", "user");
    expect(loosened.getTicket(ticket).state).toBe("awaiting_verification");
  });
});
