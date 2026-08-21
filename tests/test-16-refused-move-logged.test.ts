/**
 * Item 16. A refused move is logged as an audit record.
 *
 * The kernel's audit record is the aidos/refusal event. It names the
 * actor, the target state, the ticket, and the reason, and the projection
 * ignores it entirely. Replaying the log gives the same views.
 */

import { describe, expect, it } from "vitest";

import type { RefusalEvent } from "../src/kernel/events";
import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { makeConfig, makeStore, storeFromLog } from "./helpers";

const CONFIG: AidosConfig = {
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
  ],
};

function refusalEvent(store: ReturnType<typeof makeStore>): RefusalEvent {
  const events = store.events();
  const last = events[events.length - 1];
  if (last.kind !== "aidos/refusal") {
    throw new Error("the last event must be a refusal");
  }
  return last;
}

describe("a refused move is logged", () => {
  it("a refused move appends exactly one record", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/r", "r");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    const before = store.events().length;
    expect(() => store.moveTicket(ticket, "in_progress", "user")).toThrow(
      GateRefused,
    );
    expect(store.events().length).toBe(before + 1);
    expect(store.getTicket(ticket).state).toBe("open");
  });

  it("the refusal record names the actor, the target, and the ticket", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/r", "r");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    expect(() => store.moveTicket(ticket, "in_progress", "agent")).toThrow(
      GateRefused,
    );
    const event = refusalEvent(store);
    expect(event.actor).toBe("agent");
    expect(event.fromState).toBe("open");
    expect(event.toState).toBe("in_progress");
    expect(event.ticketId).toBe(ticket);
  });

  it("the refusal record names the missing kind", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/r", "r");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    expect(() => store.moveTicket(ticket, "in_progress", "user")).toThrow(
      GateRefused,
    );
    const event = refusalEvent(store);
    expect(event.reason).toContain("builtin:user_signoff");
  });

  it("the projection ignores refusal records", () => {
    const store = makeStore(CONFIG);
    const project = store.createProject("/srv/proj/r", "r");
    const ticket = store.createTicket(project, "T", "d", { actor: "user" });

    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    expect(() => store.moveTicket(ticket, "in_progress", "agent")).toThrow(
      GateRefused,
    );
    store.moveTicket(ticket, "in_progress", "user");
    expect(() => store.moveTicket(ticket, "done", "agent")).toThrow(GateRefused);
    store.attachEvidence(ticket, "builtin:agent_report", { lines: 4 }, "agent");
    store.moveTicket(ticket, "awaiting_verification", "agent");
    expect(() => store.moveTicket(ticket, "done", "user")).toThrow(GateRefused);
    expect(() => store.moveTicket(ticket, "in_progress", "user")).toThrow(
      GateRefused,
    );

    const ticketBefore = store.getTicket(ticket);
    const rowsBefore = store.evidenceFor(ticket);
    const scoreBefore = store.confidenceScore(ticket);
    const logBefore = store.events();

    const reopened = storeFromLog(store.events(), CONFIG);
    expect(reopened.getTicket(ticket)).toEqual(ticketBefore);
    expect(reopened.evidenceFor(ticket)).toEqual(rowsBefore);
    expect(reopened.confidenceScore(ticket)).toBe(scoreBefore);
    expect(reopened.events()).toEqual(logBefore);
  });
});
