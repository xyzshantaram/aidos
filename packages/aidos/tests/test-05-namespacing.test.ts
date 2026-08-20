/**
 * Item 5. Kind ids are namespaced. Similar ids are distinct kinds.
 *
 * builtin:comment and plugin:xyz.shantaram:comment are two registrations,
 * two weights, and two gate requirements. The weight of one never leaks
 * into the score of the other, and one row never satisfies the other's
 * gate.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import {
  expectGateRefused,
  expectSameItems,
  makeConfig,
  makeStore,
  storeFromLog,
} from "./helpers";

const NAMESPACED_KINDS: AidosConfig = makeConfig([
  {
    id: "builtin:comment",
    label: "Comment",
    description: "A built-in comment.",
    weight: 0.5,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "plugin:xyz.shantaram:comment",
    label: "Plugin comment",
    description: "A plugin comment.",
    weight: 2.0,
    allowedAuthors: ["user", "agent"],
  },
]);

describe("namespacing", () => {
  it("similar ids are distinct kinds", () => {
    const store = makeStore(NAMESPACED_KINDS);
    const project = store.createProject("/srv/proj/a", "a");
    const ticketBuiltin = store.createTicket(project, "B", "d", { actor: "user" });
    const ticketPlugin = store.createTicket(project, "P", "d", { actor: "user" });

    store.attachEvidence(ticketBuiltin, "builtin:comment", { x: 1 }, "user");
    store.attachEvidence(
      ticketPlugin,
      "plugin:xyz.shantaram:comment",
      { y: 1 },
      "user",
    );

    expect(store.confidenceScore(ticketBuiltin)).toBe(0.5);
    expect(store.confidenceScore(ticketPlugin)).toBe(2.0);

    // The prototype changed the weight of builtin:comment here. The kernel
    // has no setKindWeight, so the same claim reads from a store built on
    // the same log with the lighter builtin:comment weight.
    const lighter = makeConfig([
      {
        id: "builtin:comment",
        label: "Comment",
        description: "A built-in comment.",
        weight: 0.1,
        allowedAuthors: ["user", "agent"],
      },
      {
        id: "plugin:xyz.shantaram:comment",
        label: "Plugin comment",
        description: "A plugin comment.",
        weight: 2.0,
        allowedAuthors: ["user", "agent"],
      },
    ]);
    const withLighterWeight = storeFromLog(store.events(), lighter);

    expect(withLighterWeight.confidenceScore(ticketBuiltin)).toBe(0.1);
    expect(withLighterWeight.confidenceScore(ticketPlugin)).toBe(2.0);
  });

  it("one kind does not satisfy the other", () => {
    const config: AidosConfig = {
      kinds: NAMESPACED_KINDS.kinds,
      gates: [
        {
          fromState: "open",
          toState: "in_progress",
          requiredKinds: ["builtin:comment"],
          allowedActors: ["user"],
        },
      ],
    };
    const store = makeStore(config);
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    store.attachEvidence(
      ticket,
      "plugin:xyz.shantaram:comment",
      { y: 1 },
      "user",
    );

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "in_progress", "user"),
    );
    expect(refusal).toBeInstanceOf(GateRefused);
    expectSameItems(refusal.missingKinds, ["builtin:comment"]);

    store.attachEvidence(ticket, "builtin:comment", { x: 1 }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });
});
