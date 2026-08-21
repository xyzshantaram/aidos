/**
 * Ticket C5: the invariant companion's state clone.
 *
 * `cloneState` must copy every field of the folded state, including
 * `nextTicketId`. The installer validates each candidate against a clone and
 * persists that clone, so a dropped counter would diverge from the service's
 * own fold.
 */

import { describe, expect, it } from "vitest";

import { createInitialState, foldAidosEvents } from "../src/kernel/fold";
import { cloneState } from "../src/host/invariant";
import type { AidosEvent } from "../src/kernel/events";

function seedLog(): AidosEvent[] {
  return [
    {
      kind: "project/created",
      version: 1,
      projectId: 1,
      absPath: "/srv/proj/a",
      name: "a",
      at: 1000,
    },
    {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      at: 1000,
      ticket: {
        id: 1,
        projectId: 1,
        title: "One",
        description: "",
        body: "",
        criteria: "",
        phase: 1,
        order: 1,
        state: "open",
        allowlist: [],
        slug: "one",
        workspaceKey: "--srv-proj-a--",
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
      },
    },
    {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      at: 1000,
      ticket: {
        id: 2,
        projectId: 1,
        title: "Two",
        description: "",
        body: "",
        criteria: "",
        phase: 1,
        order: 2,
        state: "open",
        allowlist: [],
        slug: "two",
        workspaceKey: "--srv-proj-a--",
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
      },
    },
  ];
}

describe("cloneState copies the ticket counter", () => {
  it("keeps nextTicketId equal to the source after folding", () => {
    const state = createInitialState();
    for (const event of seedLog()) {
      foldAidosEvents(state, event);
    }
    // Two creates advance the counter to 3.
    expect(state.nextTicketId).toBe(3);

    const copy = cloneState(state);
    expect(copy.nextTicketId).toBe(state.nextTicketId);
    expect(copy.nextTicketId).toBe(3);
  });
});
