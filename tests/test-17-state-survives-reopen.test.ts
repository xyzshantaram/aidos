/**
 * Item 17. State survives a close and a reopen.
 *
 * The reopen equivalent is a fresh store built from the first store's log.
 * Every observable part of the store must come back identical, and the
 * replay must be repeatable.
 */

import { describe, expect, it } from "vitest";

import type { AidosEvent } from "../src/kernel/events";
import type { Store } from "../src/kernel/store";
import type { EvidenceViewRow, ProjectView, TicketRow } from "../src/kernel/types";
import type { AidosConfig } from "../src/kernel/types";
import { makeConfig, makeStore, storeFromLog } from "./helpers";

const CONFIG: AidosConfig = {
  kinds: makeConfig([
    {
      id: "builtin:user_signoff",
      label: "User signoff",
      description: "The human signs off.",
      weight: 1.0,
      allowedAuthors: ["user"],
    },
    {
      id: "builtin:agent_report",
      label: "Agent report",
      description: "The agent reports.",
      weight: 1.0,
      allowedAuthors: ["agent"],
    },
  ]).kinds,
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

interface Ids {
  project: number;
  ticketA: number;
  ticketB: number;
}

interface Snapshot {
  projects: ProjectView[];
  tickets: TicketRow[];
  evidence: EvidenceViewRow[][];
  scores: number[];
  events: AidosEvent[];
}

function build() {
  const store = makeStore(CONFIG);
  const project = store.createProject("/srv/proj/x", "x");
  const ticketA = store.createTicket(project, "A", "Body A.", { actor: "user" });
  const ticketB = store.createTicket(project, "B", "Body B.", { actor: "agent" });
  store.attachEvidence(ticketA, "builtin:user_signoff", { ok: true }, "user");
  store.moveTicket(ticketA, "in_progress", "user");
  store.attachEvidence(ticketA, "builtin:agent_report", { lines: 3 }, "agent");
  store.moveTicket(ticketA, "awaiting_verification", "agent");
  store.attachEvidence(ticketB, "builtin:user_signoff", { ok: true }, "user");
  return { store, project, ticketA, ticketB };
}

function snapshot(store: Store, ids: Ids): Snapshot {
  return {
    projects: [store.getProject(ids.project)],
    tickets: [store.getTicket(ids.ticketA), store.getTicket(ids.ticketB)],
    evidence: [
      store.evidenceFor(ids.ticketA),
      store.evidenceFor(ids.ticketB),
    ],
    scores: [
      store.confidenceScore(ids.ticketA),
      store.confidenceScore(ids.ticketB),
    ],
    events: [...store.events()],
  };
}

describe("state survives a reopen", () => {
  it("the state survives a replay from the log", () => {
    const { store, project, ticketA, ticketB } = build();
    const before = snapshot(store, { project, ticketA, ticketB });

    const reopened = storeFromLog(store.events(), CONFIG);
    const after = snapshot(reopened, { project, ticketA, ticketB });
    expect(after).toEqual(before);
  });

  it("replaying is repeatable", () => {
    const { store, project, ticketA, ticketB } = build();
    const before = snapshot(store, { project, ticketA, ticketB });

    const first = storeFromLog(store.events(), CONFIG);
    const second = storeFromLog(first.events(), CONFIG);
    const after = snapshot(second, { project, ticketA, ticketB });
    expect(after).toEqual(before);
  });
});
