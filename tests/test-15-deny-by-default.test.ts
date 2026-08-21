/**
 * Item 15. Deny by default. A move needs a configured gate for its exact
 * pair.
 *
 * The kernel pins the legal transitions to a forward step, the send-back
 * edge, or a self-transition (SPEC decision 3). Every unconfigured pair
 * refuses with GateRefused, whatever evidence the ticket carries. A
 * configured gate on a self-pair governs the move like any other exact
 * pair, so both self-transition cases port directly.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { defaultKinds, makeConfig, makeStore } from "./helpers";

const CONFIG: AidosConfig = {
  kinds: defaultKinds(),
  gates: [
    {
      fromState: "open",
      toState: "in_progress",
      requiredKinds: ["builtin:user_signoff"],
      allowedActors: ["user"],
    },
  ],
};

describe("deny by default", () => {
  it("an unconfigured transition is refused for the agent", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/d", "d");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    expect(() => store.moveTicket(ticket, "done", "agent")).toThrow(GateRefused);
    expect(store.getTicket(ticket).state).toBe("open");
  });

  it("an unconfigured transition is refused for the user", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/d", "d");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    expect(() => store.moveTicket(ticket, "done", "user")).toThrow(GateRefused);
    expect(store.getTicket(ticket).state).toBe("open");
  });

  it("other unconfigured pairs are refused", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/d", "d");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    for (const actor of ["user", "agent"] as const) {
      expect(() =>
        store.moveTicket(ticket, "awaiting_verification", actor),
      ).toThrow(GateRefused);
    }

    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");

    for (const actor of ["user", "agent"] as const) {
      expect(() => store.moveTicket(ticket, "done", actor)).toThrow(GateRefused);
    }
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });

  it("every kind attached does not open an unconfigured gate", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/d", "d");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    // The prototype attached every default kind as the user. The
    // constant table admits the user for every one of them, so the
    // same call works here.
    for (const kind of defaultKinds()) {
      store.attachEvidence(ticket, kind.id, { k: kind.id }, "user");
    }
    for (const toState of ["awaiting_verification", "done"] as const) {
      for (const actor of ["user", "agent"] as const) {
        expect(() => store.moveTicket(ticket, toState, actor)).toThrow(
          GateRefused,
        );
      }
    }
    expect(store.getTicket(ticket).state).toBe("open");
  });

  it("a self transition is refused without a gate", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/d", "d");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    expect(() => store.moveTicket(ticket, "open", "user")).toThrow(GateRefused);
    expect(store.getTicket(ticket).state).toBe("open");
  });

  it("a self transition is allowed when a gate exists", () => {
    const config: AidosConfig = {
      kinds: defaultKinds(),
      gates: [
        {
          fromState: "open",
          toState: "open",
          requiredKinds: ["builtin:user_signoff"],
          allowedActors: ["user"],
        },
      ],
    };
    const store = makeStore(config);
    const project = store.createProject("/srv/proj/d", "d");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    expect(() => store.moveTicket(ticket, "open", "user")).toThrow(GateRefused);
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "open", "user");
    expect(store.getTicket(ticket).state).toBe("open");
  });
});
