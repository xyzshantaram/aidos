/**
 * Ticket D1: dependency tracking, kernel half.
 *
 * A ticket may carry `dependsOn`, a list of `<workspaceKey>:<ticketId>`
 * references (cross-workspace allowed). The field is informational only:
 * no gate reads it. The kernel stores it on the snapshot, carries it through
 * the fold, the reads, and the projections, and refuses two shapes at the
 * invariant: a ticket depending on itself, and a cycle in the dependency
 * graph. A pre-D1 snapshot without the field replays with the empty list.
 */

import { describe, expect, it } from "vitest";

import { createInitialState, foldAidosEvents } from "../src/kernel/fold";
import type { AidosState } from "../src/kernel/fold";
import type { AidosEvent } from "../src/kernel/events";
import { ticketsProjection } from "../src/kernel/projections";
import { Store } from "../src/kernel/store";
import { InvariantError } from "../src/kernel/types";
import { createHarness } from "./b1-harness";
import { makeConfig, makeStore } from "./helpers";

/** One full post-C5 snapshot, with or without dependsOn. */
function snapshot(opts: {
  id: number;
  workspaceKey: string;
  dependsOn?: string[];
}) {
  return {
    id: opts.id,
    projectId: 1,
    title: "T",
    description: "",
    body: "",
    criteria: "",
    phase: 1,
    order: 1,
    state: "open" as const,
    allowlist: [],
    slug: `ticket-${opts.id}`,
    workspaceKey: opts.workspaceKey,
    revision: 1,
    createdAt: 1000,
    updatedAt: 1000,
    ...(opts.dependsOn === undefined ? {} : { dependsOn: opts.dependsOn }),
  };
}

/** Fold one project/created then one ticket/change create. */
function foldCreate(state: AidosState, opts: { id: number; workspaceKey: string; dependsOn?: string[] }): void {
  foldAidosEvents(state, {
    kind: "project/created",
    version: 1,
    projectId: 1,
    absPath: "/ws",
    name: "ws",
    at: 1000,
  });
  foldAidosEvents(state, {
    kind: "ticket/change",
    version: 1,
    operation: "create",
    at: 1000,
    ticket: snapshot(opts) as never,
  });
}

describe("d1: the store holds dependsOn", () => {
  it("creating a ticket with a dependency stores it", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", {
      dependsOn: ["--srv-proj-a--:99"],
    });
    expect(store.getTicket(ticket).dependsOn).toEqual(["--srv-proj-a--:99"]);
  });

  it("a ticket created without a dependency holds an empty list", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d");
    expect(store.getTicket(ticket).dependsOn).toEqual([]);
  });

  it("editing a ticket to add dependsOn works", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d");
    store.setTicket(ticket, { dependsOn: ["--srv-proj-a--:7", "--other-ws--:3"] });
    expect(store.getTicket(ticket).dependsOn).toEqual([
      "--srv-proj-a--:7",
      "--other-ws--:3",
    ]);
  });

  it("editing a ticket to clear dependsOn works", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", {
      dependsOn: ["--srv-proj-a--:7"],
    });
    store.setTicket(ticket, { dependsOn: [] });
    expect(store.getTicket(ticket).dependsOn).toEqual([]);
  });

  it("an edit that names other fields leaves dependsOn alone", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", {
      dependsOn: ["--srv-proj-a--:7"],
    });
    store.setTicket(ticket, { title: "Renamed" });
    expect(store.getTicket(ticket).dependsOn).toEqual(["--srv-proj-a--:7"]);
  });
});

describe("d1: the invariant refuses bad dependency shapes", () => {
  it("a ticket depending on itself is refused", () => {
    const state = createInitialState();
    foldAidosEvents(state, {
      kind: "project/created",
      version: 1,
      projectId: 1,
      absPath: "/ws",
      name: "ws",
      at: 1000,
    });
    let caught: unknown;
    try {
      foldAidosEvents(state, {
        kind: "ticket/change",
        version: 1,
        operation: "create",
        at: 1000,
        ticket: snapshot({ id: 42, workspaceKey: "--ws--", dependsOn: ["--ws--:42"] }) as never,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvariantError);
    expect((caught as Error).message).toContain("ticket 42 cannot depend on itself");
    expect((caught as Error).message).toContain("--ws--:42");
  });

  it("a self-dependency through the store is refused and appends nothing", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d");
    const before = store.events().length;
    expect(() => store.setTicket(ticket, { dependsOn: ["--srv-proj-a--:1"] })).toThrow(
      InvariantError,
    );
    // A refused append changes the log.
    expect(store.events().length).toBe(before);
  });

  it("a circular dependency is refused", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticketA = store.createTicket(project, "A", "d", {
      dependsOn: ["--srv-proj-a--:2"],
    });
    const ticketB = store.createTicket(project, "B", "d");
    const before = store.events().length;
    expect(() =>
      store.setTicket(ticketB, { dependsOn: ["--srv-proj-a--:1"] }),
    ).toThrow(InvariantError);
    expect((store.events().length)).toBe(before);
    expect(store.getTicket(ticketA).dependsOn).toEqual(["--srv-proj-a--:2"]);
  });

  it("a three-ticket cycle is refused and names the cycle", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticketA = store.createTicket(project, "A", "d", {
      dependsOn: ["--srv-proj-a--:2"],
    });
    const ticketB = store.createTicket(project, "B", "d", {
      dependsOn: ["--srv-proj-a--:3"],
    });
    store.createTicket(project, "C", "d");
    let caught: unknown;
    try {
      store.setTicket(3, { dependsOn: ["--srv-proj-a--:1"] });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvariantError);
    const message = (caught as Error).message;
    expect(message).toMatch(/depends on ticket 1 which depends on ticket 2 which depends on ticket 3/);
    expect(store.getTicket(ticketA).dependsOn).toEqual(["--srv-proj-a--:2"]);
    expect(store.getTicket(ticketB).dependsOn).toEqual(["--srv-proj-a--:3"]);
  });

  it("a dependency on a missing ticket is a leaf, not a cycle", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/a", "a");
    const ticket = store.createTicket(project, "T", "d", {
      dependsOn: ["--srv-proj-a--:999"],
    });
    // Unresolvable: no ticket 999 exists, so the graph stays acyclic.
    expect(store.getTicket(ticket).dependsOn).toEqual(["--srv-proj-a--:999"]);
  });

  it("a present but non-array dependsOn is refused as corrupt", () => {
    const state = createInitialState();
    foldAidosEvents(state, {
      kind: "project/created",
      version: 1,
      projectId: 1,
      absPath: "/ws",
      name: "ws",
      at: 1000,
    });
    let caught: unknown;
    try {
      foldAidosEvents(state, {
        kind: "ticket/change",
        version: 1,
        operation: "create",
        at: 1000,
        ticket: {
          ...snapshot({ id: 1, workspaceKey: "--ws--" }),
          dependsOn: "bogus",
        } as never,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvariantError);
    expect((caught as Error).message).toContain("dependsOn must be an array of strings");
  });
});

describe("d1: the projection view carries dependsOn", () => {
  it("ticketsProjection reports the field", () => {
    const state = createInitialState();
    foldCreate(state, { id: 1, workspaceKey: "--ws--", dependsOn: ["--ws--:9"] });
    const views = ticketsProjection(state, makeConfig());
    expect(views.get(1)?.dependsOn).toEqual(["--ws--:9"]);
  });

  it("a ticket without dependencies reports an empty list", () => {
    const state = createInitialState();
    foldCreate(state, { id: 1, workspaceKey: "--ws--" });
    const views = ticketsProjection(state, makeConfig());
    expect(views.get(1)?.dependsOn).toEqual([]);
  });
});

describe("d1: legacy pre-D1 logs replay", () => {
  it("a snapshot without dependsOn folds to the empty list", () => {
    const state = createInitialState();
    foldCreate(state, { id: 1, workspaceKey: "--ws--" });
    const ticket = state.tickets.get(1);
    expect(ticket).toBeDefined();
    expect(ticket?.dependsOn).toEqual([]);
  });

  it("a pre-D1 log replays through the store", () => {
    const log: AidosEvent[] = [
      {
        kind: "project/created",
        version: 1,
        projectId: 1,
        absPath: "/srv/proj/legacy",
        name: "legacy",
        at: 1000,
      },
      {
        kind: "ticket/change",
        version: 1,
        operation: "create",
        at: 1000,
        ticket: snapshot({ id: 1, workspaceKey: "--srv-proj-legacy--" }) as never,
      },
    ];
    const store = new Store(makeConfig(), { log });
    expect(store.getTicket(1).dependsOn).toEqual([]);
    // The whole log replays with no invariant error.
    expect(store.events().length).toBe(2);
  });
});

describe("d1: the service surface", () => {
  it("the service creates a ticket with dependsOn", () => {
    const harness = createHarness();
    const service = harness.installService();
    const row = service.setTicket(harness.asAgent(), {
      title: "T",
      dependsOn: ["--srv-proj-cli--:5"],
    });
    expect(row.dependsOn).toEqual(["--srv-proj-cli--:5"]);
    const views = service.getTickets(harness.asAgent());
    expect(views[0].dependsOn).toEqual(["--srv-proj-cli--:5"]);
  });

  it("the service edits dependsOn and clears it", () => {
    const harness = createHarness();
    const service = harness.installService();
    const created = service.setTicket(harness.asAgent(), { title: "T" });
    const edited = service.setTicket(harness.asAgent(), {
      ticketId: created.id,
      dependsOn: ["--srv-proj-cli--:7"],
    });
    expect(edited.dependsOn).toEqual(["--srv-proj-cli--:7"]);
    const cleared = service.setTicket(harness.asAgent(), {
      ticketId: created.id,
      dependsOn: [],
    });
    expect(cleared.dependsOn).toEqual([]);
  });

  it("the service refuses a self-dependency on an edit", () => {
    const harness = createHarness();
    const service = harness.installService();
    const created = service.setTicket(harness.asAgent(), { title: "T" });
    expect(() =>
      service.setTicket(harness.asAgent(), {
        ticketId: created.id,
        dependsOn: ["--srv-proj-cli--:1"],
      }),
    ).toThrow(InvariantError);
    const views = service.getTickets(harness.asAgent());
    expect(views[0].dependsOn).toEqual([]);
  });

  it("the service refuses a cycle across two tickets", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticketA = service.setTicket(harness.asAgent(), {
      title: "A",
      dependsOn: ["--srv-proj-cli--:2"],
    });
    const ticketB = service.setTicket(harness.asAgent(), { title: "B" });
    expect(() =>
      service.setTicket(harness.asAgent(), {
        ticketId: ticketB.id,
        dependsOn: ["--srv-proj-cli--:1"],
      }),
    ).toThrow(InvariantError);
    const views = service.getTickets(harness.asAgent());
    expect(views.find((row) => row.id === ticketA.id)?.dependsOn).toEqual([
      "--srv-proj-cli--:2",
    ]);
  });
});
