/**
 * Audit hygiene 2: hard orphan checks and required snapshot fields.
 *
 * As of C5 the C4 legacy tolerance has been removed: slug and workspaceKey
 * are now required fields with no fallback. Evidence and comment events now
 * fail hard if they reference a ticket the fold has never created.
 *
 * This test suite proves:
 * - A ticket/change event missing slug now fails the fold with an invariant violation
 * - A ticket/change event missing workspaceKey now fails the fold with an invariant violation
 * - An evidence/attached event referencing an unknown ticket now throws during the fold
 * - A comment/added event referencing an unknown ticket now throws during the fold
 */

import { describe, expect, it } from "vitest";

import { createInitialState, foldAidosEvents } from "../src/kernel/fold";
import type { AidosEvent } from "../src/kernel/events";
import { InvariantError } from "../src/kernel/types";
import { expectThrows } from "./helpers";

describe("audit: hard orphan checks and required snapshot fields", () => {
  it("rejects a ticket/change event missing slug", () => {
    const state = createInitialState();
    // First, set up the project
    const projectEvent: AidosEvent = {
      kind: "project/created",
      version: 1,
      projectId: 1,
      absPath: "/srv/proj/test",
      name: "test",
      at: 1000,
    };
    foldAidosEvents(state, projectEvent);

    // Try to create a ticket without slug
    const ticketEvent: AidosEvent = {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      at: 1001,
      ticket: {
        id: 1,
        projectId: 1,
        title: "Test ticket",
        description: "A test",
        body: "",
        criteria: "",
        phase: 0,
        order: 0,
        state: "open",
        allowlist: [],
        revision: 1,
        createdAt: 1001,
        updatedAt: 1001,
        // slug is missing
        workspaceKey: "--srv-proj-test--",
        dependsOn: [],
      } as never,
    };

    expect(() => foldAidosEvents(state, ticketEvent)).toThrow(InvariantError);
  });

  it("rejects a ticket/change event missing workspaceKey", () => {
    const state = createInitialState();
    // First, set up the project
    const projectEvent: AidosEvent = {
      kind: "project/created",
      version: 1,
      projectId: 1,
      absPath: "/srv/proj/test",
      name: "test",
      at: 1000,
    };
    foldAidosEvents(state, projectEvent);

    // Try to create a ticket without workspaceKey
    const ticketEvent: AidosEvent = {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      at: 1001,
      ticket: {
        id: 1,
        projectId: 1,
        title: "Test ticket",
        description: "A test",
        body: "",
        criteria: "",
        phase: 0,
        order: 0,
        state: "open",
        allowlist: [],
        revision: 1,
        createdAt: 1001,
        updatedAt: 1001,
        slug: "test-ticket",
        // workspaceKey is missing
        dependsOn: [],
      } as never,
    };

    expect(() => foldAidosEvents(state, ticketEvent)).toThrow(InvariantError);
  });

  it("rejects an evidence/attached event referencing an unknown ticket", () => {
    const state = createInitialState();

    // Try to attach evidence to a ticket that does not exist
    const evidenceEvent: AidosEvent = {
      kind: "evidence/attached",
      version: 1,
      ticketId: 999,
      row: {
        kind: "builtin:test_run",
        author: "agent",
        at: 1000,
        payload: { note: "test" },
      },
    };

    expect(() => foldAidosEvents(state, evidenceEvent)).toThrow(InvariantError);
  });

  it("rejects a comment/added event referencing an unknown ticket", () => {
    const state = createInitialState();

    // Try to add a comment to a ticket that does not exist
    const commentEvent: AidosEvent = {
      kind: "comment/added",
      version: 1,
      ticketId: 999,
      text: "A comment",
      author: "user",
      at: 1000,
    };

    expect(() => foldAidosEvents(state, commentEvent)).toThrow(InvariantError);
  });
});
