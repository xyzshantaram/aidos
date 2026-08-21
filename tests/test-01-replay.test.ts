/**
 * Item 1. Replay. The log alone carries the state after a reopen.
 *
 * The kernel has no file handle to reopen. The equivalent is a fresh store
 * built from the first store's log, which is what storeFromLog provides.
 * The refused moves and the mixed sequence stay in the log, so the second
 * store must derive the same tickets, evidence, and scores.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { makeStore, storeFromLog } from "./helpers";

const CONFIG: AidosConfig = {
  kinds: [
    {
      id: "builtin:user_signoff",
      label: "User signoff",
      description: "The human signs off.",
      weight: 2.0,
      allowedAuthors: ["user"],
    },
    {
      id: "builtin:agent_report",
      label: "Agent report",
      description: "The agent reports.",
      weight: 1.0,
      allowedAuthors: ["agent"],
    },
  ],
  gates: [
    {
      fromState: "open",
      toState: "in_progress",
      requiredKinds: ["builtin:user_signoff"],
      allowedActors: ["user"],
    },
  ],
};

describe("replay", () => {
  it("replays an identical state from the log alone", () => {
    const store = makeStore(CONFIG);
    const projectOne = store.createProject("/srv/proj/one", "one");
    const ticketOne = store.createTicket(projectOne, "First ticket", "Body one.", {
      actor: "user",
    });
    store.setTicket(ticketOne, { actor: "agent", title: "First ticket edited" });

    // Refused move: the required kind is not attached yet.
    expect(() => store.moveTicket(ticketOne, "in_progress", "user")).toThrow(
      GateRefused,
    );
    store.attachEvidence(ticketOne, "builtin:user_signoff", { ok: true }, "user");
    // Refused move: the agent is not an allowed actor on this gate.
    expect(() => store.moveTicket(ticketOne, "in_progress", "agent")).toThrow(
      GateRefused,
    );
    store.moveTicket(ticketOne, "in_progress", "user");
    // Refused move: no legal path leads to done from here.
    expect(() => store.moveTicket(ticketOne, "done", "agent")).toThrow(
      GateRefused,
    );
    store.attachEvidence(ticketOne, "builtin:agent_report", { lines: 3 }, "agent");

    const projectTwo = store.createProject("/srv/proj/two", "two");
    const ticketTwo = store.createTicket(projectTwo, "Second ticket", "Body two.", {
      actor: "agent",
    });
    store.attachEvidence(ticketTwo, "builtin:agent_report", { lines: 12 }, "agent");
    store.setTicket(ticketTwo, { actor: "agent", description: "Body two revised" });
    store.moveProject(projectTwo, "/srv/proj/two-moved");

    const logBefore = store.events();
    expect(logBefore.length).toBeGreaterThanOrEqual(12);

    const ticketsBefore = [ticketOne, ticketTwo].map((id) => [
      id,
      store.getTicket(id),
    ] as const);
    const evidenceBefore = [ticketOne, ticketTwo].map((id) => [
      id,
      store.evidenceFor(id),
    ] as const);
    const scoresBefore = [ticketOne, ticketTwo].map((id) => [
      id,
      store.confidenceScore(id),
    ] as const);

    // Sanity: the snapshot is concrete, not empty.
    expect(store.getTicket(ticketOne).state).toBe("in_progress");
    expect(store.getTicket(ticketTwo).state).toBe("open");
    expect(store.evidenceFor(ticketOne).length).toBe(2);

    const reopened = storeFromLog(store.events(), CONFIG);

    for (const [ticketId, ticket] of ticketsBefore) {
      expect(reopened.getTicket(ticketId)).toEqual(ticket);
    }
    for (const [ticketId, rows] of evidenceBefore) {
      expect(reopened.evidenceFor(ticketId)).toEqual(rows);
    }
    for (const [ticketId, score] of scoresBefore) {
      expect(reopened.confidenceScore(ticketId)).toBe(score);
    }
    expect(reopened.events()).toEqual(logBefore);
  });
});
