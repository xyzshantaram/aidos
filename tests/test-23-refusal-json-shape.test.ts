/**
 * Item 23. A refusal names the states and the reason.
 *
 * The CLI's refusal JSON object ports to the GateRefused fields: the
 * missing kinds, the allowed actors, and the from and to states. The JSON
 * rendering and the no-traceback guarantees are B1 tool tests. An unknown
 * ticket raises UnknownTicket and its message names the id.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { UnknownTicket } from "../src/kernel/types";
import { expectGateRefused, expectThrows, makeStore } from "./helpers";

describe("refusal shape", () => {
  it("a refused move names the from state and the to state", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "in_progress", "user"),
    );
    expect(refusal.fromState).toBe("open");
    expect(refusal.toState).toBe("in_progress");
  });

  it("a refusal names the missing kinds", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "in_progress", "user"),
    );
    expect(refusal.missingKinds).toEqual(["builtin:user_signoff"]);
  });

  it("a refusal names the allowed actors", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "Ready for a human", "d", {
      actor: "user",
    });
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    store.attachEvidence(ticket, "builtin:automated_check", {}, "agent");
    store.attachEvidence(ticket, "builtin:review_pass", {}, "agent");
    store.moveTicket(ticket, "awaiting_verification", "user");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "done", "user"),
    );
    expect([...refusal.allowedActors].sort()).toEqual(["user"]);
    expect(refusal.fromState).toBe("awaiting_verification");
    expect(refusal.toState).toBe("done");
  });

  it("an unknown ticket raises an error that names the id", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    store.createTicket(project, "T", "d", { actor: "user" });

    const error = expectThrows(
      () => store.moveTicket(999, "done", "user"),
      UnknownTicket,
    );
    expect(error.ticketId).toBe(999);
    expect(String(error)).toContain("999");
  });

  it("a refused move changes no state", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    expectGateRefused(() => store.moveTicket(ticket, "in_progress", "user"));
    expect(store.getTicket(ticket).state).toBe("open");
  });
});
