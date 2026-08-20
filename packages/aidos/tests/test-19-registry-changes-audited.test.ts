/**
 * Item 19. Registry changes are audited, ported as the audit pin.
 *
 * The kernel puts the registry in config, never in the log (SPEC decision
 * 1). The prototype's kind.registered, kind.weight_set, and gate.set
 * records therefore cannot exist here. The ported pin asserts the log
 * never carries a config mutation, and that events() returns a frozen
 * copy. The versioned settings seam that produces config values is B1.
 */

import { describe, expect, it } from "vitest";

import type { AidosEvent } from "../src/kernel/events";
import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { defaultKinds, makeStore } from "./helpers";

/** The event kinds that would mean a config mutation. */
const CONFIG_MUTATION_KINDS = ["kind.registered", "kind.weight_set", "gate.set"];

/** The whole event vocabulary of the B0 kernel. */
const EVENT_VOCABULARY = [
  "ticket/change",
  "evidence/attached",
  "plan/change",
  "comment/added",
  "aidos/refusal",
  "project/created",
  "project/moved",
  "phase/set",
];

/** One config with the default kinds and one gate, for the audit walk. */
const CONFIG: AidosConfig = {
  kinds: defaultKinds(),
  gates: [
    {
      fromState: "open",
      toState: "in_progress",
      requiredKinds: ["builtin:user_signoff"],
      allowedActors: ["user", "agent"],
    },
  ],
};

describe("registry changes audited", () => {
  it("the log never carries a config mutation", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/audit", "audit");
    store.moveProject(project, "/srv/proj/audited");
    store.setPhase(project, 1, { title: "One", state: "done" });
    store.setPlanMeta(project, { frontmatter: "---\nx: 1\n---", preamble: "Intro" });
    store.setRules(project, "No rules yet.");
    const ticket = store.createTicket(project, "T", "d", {
      body: "b",
      criteria: "c",
    });
    store.setTicket(ticket, { title: "Renamed" });
    store.attachEvidence(ticket, "builtin:comment", { note: "one" }, "user");
    store.addComment(ticket, "A remark", "user");
    expect(() => store.moveTicket(ticket, "in_progress", "user")).toThrow(
      GateRefused,
    );
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");

    for (const event of store.events()) {
      expect(CONFIG_MUTATION_KINDS).not.toContain(event.kind);
      expect(EVENT_VOCABULARY).toContain(event.kind);
    }
  });

  it("events() returns a frozen copy that rejects mutation", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/frozen", "frozen");
    store.createTicket(project, "T", "d");
    store.attachEvidence(1, "builtin:comment", { note: "one" }, "user");

    const log = store.events();
    expect(Object.isFrozen(log)).toBe(true);

    const snapshot = store.events();
    const fake: AidosEvent = {
      kind: "aidos/refusal",
      version: 1,
      ticketId: 999,
      fromState: null,
      toState: null,
      actor: null,
      reason: "not a real event",
      at: 1,
    };
    expect(() => (log as AidosEvent[]).push(fake)).toThrow();
    expect(store.events()).toEqual(snapshot);
  });
});
