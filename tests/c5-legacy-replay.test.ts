/**
 * Ticket C5: legacy log replay.
 *
 * A `ticket/change` snapshot written before C5 has no `slug` or
 * `workspaceKey`. The fold and the invariant must accept that record,
 * synthesize the defaults (`ticket-<id>` for the slug and the owning project's
 * path for the workspaceKey), and store the normalized snapshot in
 * `state.tickets`. The whole pre-C5 log must replay with no invariant error.
 */

import { describe, expect, it } from "vitest";

import { createInitialState, foldAidosEvents } from "../src/kernel/fold";
import type { AidosState } from "../src/kernel/fold";
import type { AidosEvent } from "../src/kernel/events";
import { Store } from "../src/kernel/store";
import { makeConfig } from "./helpers";

/** A pre-C5 snapshot: every C4 field, no slug and no workspaceKey. */
function legacySnapshot() {
  return {
    id: 1,
    projectId: 1,
    title: "Fix the login form",
    description: "the login form is broken",
    body: "",
    criteria: "",
    phase: 1,
    order: 1,
    state: "open" as const,
    allowlist: [],
    revision: 1,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

/** The pre-C5-format log: project, create, move, evidence. */
function legacyLog(): AidosEvent[] {
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
      // The snapshot has no slug and no workspaceKey.
      ticket: legacySnapshot() as never,
    },
    {
      kind: "ticket/change",
      version: 1,
      operation: "move",
      at: 1001,
      ticket: {
        id: 1,
        projectId: 1,
        title: "Fix the login form",
        description: "the login form is broken",
        body: "",
        criteria: "",
        phase: 1,
        order: 1,
        state: "in_progress",
        allowlist: [],
        revision: 2,
        createdAt: 1000,
        updatedAt: 1001,
      } as never,
    },
    {
      kind: "evidence/attached",
      version: 1,
      ticketId: 1,
      row: {
        kind: "builtin:test_run",
        author: "agent",
        at: 1001,
        payload: { note: "ran" },
      },
    },
  ];
}

describe("a pre-C5 log replays", () => {
  it("folds with no invariant error and normalizes the snapshot", () => {
    const log = legacyLog();
    const state = createInitialState();
    expect(() => {
      for (const event of log) {
        foldAidosEvents(state, event);
      }
    }).not.toThrow();

    const ticket = state.tickets.get(1);
    expect(ticket).toBeDefined();
    expect(ticket?.slug).toBe("ticket-1");
    expect(ticket?.workspaceKey).toBe("--srv-proj-a--");
  });

  it("replays through the Store with flattened reads", () => {
    const store = new Store(makeConfig(), { log: legacyLog() });
    const ticket = store.getTicket(1);
    expect(ticket.id).toBe(1);

    // The folded snapshot carries the normalized slug and workspaceKey.
    const raw = (store as unknown as { _state: AidosState })._state.tickets.get(1);
    expect(raw?.slug).toBe("ticket-1");
    expect(raw?.workspaceKey).toBe("--srv-proj-a--");
  });
});
