/**
 * Ticket C5: globally distinct ticket ids.
 *
 * A ticket id is unique across every workspace: the numeric `TicketId` stays
 * the internal key, but every ticket snapshot gains a durable `slug` and a
 * `workspaceKey`. The raw global form is `<workspaceKey>:<slug>`. The
 * per-workspace number is allocated from a folded monotonic counter, never
 * recomputed as max over live keys, so a future delete cannot reissue an id.
 *
 * The six evaluate criteria:
 *   1. A create whose slug the workspace already holds refuses, naming the
 *      slug and the workspace.
 *   2. A rename leaves every stored reference resolving to the same ticket.
 *   3. A bare number or a bare slug in workspace A never resolves to a
 *      ticket in workspace B.
 *   4. A write against a foreign id refuses and names the workspace to open.
 *   5. The next-number counter only climbs and is never recomputed from live
 *      keys.
 *   6. A created ticket carries a non-empty slug and workspaceKey even when
 *      the caller gave no slug.
 */
import { describe, expect, it } from "vitest";

import { Store } from "../src/kernel/store";
import type { AidosState } from "../src/kernel/fold";
import type { AidosEvent, TicketChangeEvent } from "../src/kernel/events";
import { DuplicateSlug, ForeignWorkspace } from "../src/kernel/types";
import { makeStore } from "./helpers";
import { createHarness } from "./b1-harness";

/** The create event of one ticket, from a store's log. */
function createEvent(
  events: readonly AidosEvent[],
  ticketId: number,
): TicketChangeEvent {
  const event = events.find(
    (candidate): candidate is TicketChangeEvent =>
      candidate.kind === "ticket/change" &&
      candidate.operation === "create" &&
      candidate.ticket.id === ticketId,
  );
  if (!event) {
    throw new Error(`no create event for ticket ${ticketId}`);
  }
  return event;
}

/** Read the folded counter field of a store for a white-box assertion. */
function nextTicketId(store: Store): number {
  return (store as unknown as { _state: AidosState })._state.nextTicketId;
}

describe("the slug and workspaceKey on a created ticket", () => {
  it("stamps a non-empty slug and workspaceKey even with no slug given", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "Fix the login form", "d");

    const snapshot = createEvent(store.events(), ticket).ticket;
    expect(snapshot.slug).toBe("fix-the-login-form");
    expect(snapshot.workspaceKey).toBe("--srv-proj-a--");
  });

  it("uses an explicit slug when one is given", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "Title", "d", { slug: "custom-slug" });

    expect(createEvent(store.events(), ticket).ticket.slug).toBe("custom-slug");
  });

  it("falls back to a ticket-N slug when the derived slug is empty", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "", "d");

    expect(createEvent(store.events(), ticket).ticket.slug).toBe(`ticket-${ticket}`);
  });
});

describe("the duplicate slug refusal", () => {
  it("refuses a create whose slug the workspace already holds", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    store.createTicket(project, "First", "d", { slug: "shared" });

    let caught: unknown;
    try {
      store.createTicket(project, "Second", "d", { slug: "shared" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DuplicateSlug);
    const message = (caught as Error).message;
    expect(message).toMatch(/shared/);
    expect(message).toMatch(/--srv-proj-a--/);
  });

  it("allows the same slug in a different workspace", () => {
    const store = makeStore();
    const alpha = store.createProject("/srv/proj/a", "a");
    const beta = store.createProject("/srv/proj/b", "b");
    store.createTicket(alpha, "First", "d", { slug: "shared" });

    expect(() => store.createTicket(beta, "Second", "d", { slug: "shared" })).not.toThrow();
  });

  it("refuses an edit that moves a ticket onto an existing slug", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const first = store.createTicket(project, "First", "d", { slug: "one" });
    store.createTicket(project, "Second", "d", { slug: "two" });

    expect(() => store.setTicket(first, { slug: "two" })).toThrow(DuplicateSlug);
    // Renaming to its own slug is not a duplicate.
    expect(() => store.setTicket(first, { slug: "one" })).not.toThrow();
  });
});

describe("a rename leaves stored references resolving", () => {
  it("evidence attached before a rename still resolves by the same number", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "Before", "d", { slug: "before-slug" });
    store.attachEvidence(ticket, "builtin:comment", { note: "pre-rename" }, "user");

    // Rename: the slug changes, the number does not.
    store.setTicket(ticket, { slug: "after-slug" });

    expect(store.getTicket(ticket).id).toBe(ticket);
    const evidence = store.evidenceFor(ticket);
    expect(evidence.length).toBe(1);
    expect(evidence[0].payload).toEqual({ note: "pre-rename" });

    const sets = store
      .events()
      .filter(
        (event): event is TicketChangeEvent =>
          event.kind === "ticket/change" &&
          event.operation === "set" &&
          event.ticket.id === ticket,
      );
    expect(sets[sets.length - 1].ticket.slug).toBe("after-slug");
  });
});

describe("workspace-scoped resolution", () => {
  it("a bare slug in workspace B never resolves a ticket in workspace A", () => {
    const harnessA = createHarness(undefined, { cwd: "/ws/a" });
    harnessA.installService().setTicket(harnessA.asAgent(), { title: "Alpha", slug: "alpha" });

    const harnessB = createHarness(undefined, { cwd: "/ws/b" });
    const serviceB = harnessB.installService();
    serviceB.setTicket(harnessB.asAgent(), { title: "Beta", slug: "beta" });

    // A bare slug "alpha" does not exist in workspace B.
    expect(() =>
      serviceB.agentAttachEvidence(harnessB.asAgent(), {
        ticketId: "alpha",
        kind: "builtin:test_run",
      }),
    ).toThrow();
    // A bare number is scoped to the current workspace, so ticket 1 here is
    // B's own ticket, never A's.
    expect(() =>
      serviceB.agentAttachEvidence(harnessB.asAgent(), {
        ticketId: 1,
        kind: "builtin:test_run",
      }),
    ).not.toThrow();
  });

  it("a cross-workspace reference resolves then refuses the write", () => {
    const harness = createHarness(undefined, { cwd: "/ws/b" });
    // Seed the log with a project and ticket from another workspace before
    // the service folds, so the injected record validates cleanly.
    harness.appendAidosEvent(harness.agent, {
      kind: "project/created",
      version: 1,
      projectId: 1,
      absPath: "/ws/a",
      name: "a",
      at: 1000,
    });
    harness.appendAidosEvent(harness.agent, {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      at: 1000,
      ticket: {
        id: 1,
        projectId: 1,
        title: "Foreign",
        description: "",
        body: "",
        criteria: "",
        phase: 1,
        order: 1,
        state: "open",
        allowlist: [],
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
        slug: "foreign",
        workspaceKey: "--ws-a--",
        dependsOn: [],
      },
    });
    const service = harness.installService();

    // The prefixed reference resolves to the foreign ticket's number, but the
    // write against that foreign workspace is refused, naming the workspace.
    let caught: unknown;
    try {
      service.agentAttachEvidence(harness.asAgent(), {
        ticketId: "--ws-a--:foreign",
        kind: "builtin:test_run",
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ForeignWorkspace);
    expect((caught as Error).message).toMatch(/--ws-a--/);
  });
});

describe("a foreign write is refused", () => {
  it("names the workspace to open", () => {
    const harness = createHarness(undefined, { cwd: "/ws/b" });
    harness.appendAidosEvent(harness.agent, {
      kind: "project/created",
      version: 1,
      projectId: 1,
      absPath: "/ws/a",
      name: "a",
      at: 1000,
    });
    harness.appendAidosEvent(harness.agent, {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      at: 1000,
      ticket: {
        id: 1,
        projectId: 1,
        title: "Foreign",
        description: "",
        body: "",
        criteria: "",
        phase: 1,
        order: 1,
        state: "open",
        allowlist: [],
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
        slug: "foreign",
        workspaceKey: "--ws-a--",
        dependsOn: [],
      },
    });
    const service = harness.installService();

    expect(() =>
      service.agentMoveTicket(harness.asAgent(), { ticketId: 1, to: "in_progress" }),
    ).toThrow(ForeignWorkspace);
  });
});

describe("the monotonic next-number counter", () => {
  it("allocates sequential ids and advances the counter", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ids = ["One", "Two", "Three"].map((title) => store.createTicket(project, title, "d"));
    expect(ids).toEqual([1, 2, 3]);
    expect(nextTicketId(store)).toBe(4);
  });

  it("never reissues an id from live keys when a snapshot is removed", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    store.createTicket(project, "One", "d");
    store.createTicket(project, "Two", "d");
    expect(store.createTicket(project, "Three", "d")).toBe(3);
    expect(nextTicketId(store)).toBe(4);

    // Simulate a not-yet-implemented delete: drop the highest ticket from the
    // live map only. The counter is a separate field and must not fall.
    const state = (store as unknown as { _state: AidosState })._state;
    state.tickets.delete(3);
    expect(nextTicketId(store)).toBe(4);

    // A fresh create takes 4, not 3, which max-over-live would reissue.
    expect(store.createTicket(project, "Four", "d")).toBe(4);
  });
});
