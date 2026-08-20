/**
 * Item 28. The store holds the plan fields of a ticket, and it holds
 * phases.
 *
 * The prototype's OldRecordReplayTest appended an old-shape ticket record
 * straight into the SQL log and expected the read to fill defaults. The
 * dsh snapshot is whole-value, so a record with missing fields cannot
 * exist: the write boundary applies the defaults at createTicket, and
 * strict replay rejects a partial record as corrupt. The pin therefore
 * reads the filled defaults through the public API, and the old-record
 * angle becomes a comment.
 */

import { describe, expect, it } from "vitest";

import { UnknownProject } from "../src/kernel/types";
import { makeStore, storeFromLog } from "./helpers";

describe("ticket plan fields", () => {
  it("a new ticket holds the plan fields", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/fields", "fields");
    const ticket = store.createTicket(project, "T", "d", {
      body: "A body.",
      criteria: "A test passes.",
      phase: 2,
    });
    const row = store.getTicket(ticket);
    expect(row.body).toBe("A body.");
    expect(row.criteria).toBe("A test passes.");
    expect(row.phase).toBe(2);
    expect(row.order).toBe(1);
  });

  it("the plan fields have defaults", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/fields", "fields");
    const row = store.getTicket(store.createTicket(project, "T", "d"));
    expect(row.body).toBe("");
    expect(row.criteria).toBe("");
    expect(row.phase).toBe(1);
    expect(row.order).toBe(1);
  });

  it("the order counts up inside one phase", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/fields", "fields");
    const first = store.createTicket(project, "A", "d", { phase: 1 });
    const second = store.createTicket(project, "B", "d", { phase: 1 });
    const other = store.createTicket(project, "C", "d", { phase: 2 });
    expect(store.getTicket(first).order).toBe(1);
    expect(store.getTicket(second).order).toBe(2);
    expect(store.getTicket(other).order).toBe(1);
  });

  it("an explicit order is kept", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/fields", "fields");
    const ticket = store.createTicket(project, "A", "d", { order: 7 });
    const later = store.createTicket(project, "B", "d");
    expect(store.getTicket(ticket).order).toBe(7);
    expect(store.getTicket(later).order).toBe(8);
  });

  it("set ticket changes the plan fields", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/fields", "fields");
    const ticket = store.createTicket(project, "A", "d");
    store.setTicket(ticket, {
      body: "New body.",
      criteria: "New rule.",
      phase: 3,
      order: 4,
    });
    const row = store.getTicket(ticket);
    expect(row.body).toBe("New body.");
    expect(row.criteria).toBe("New rule.");
    expect(row.phase).toBe(3);
    expect(row.order).toBe(4);
  });

  it("set ticket leaves an absent field alone", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/fields", "fields");
    const ticket = store.createTicket(project, "A", "d", {
      body: "Keep me.",
      criteria: "Keep me too.",
    });
    store.setTicket(ticket, { title: "New title" });
    const row = store.getTicket(ticket);
    expect(row.title).toBe("New title");
    expect(row.body).toBe("Keep me.");
    expect(row.criteria).toBe("Keep me too.");
  });
});

describe("old record replay", () => {
  it("a ticket created without the plan fields reports the filled defaults", () => {
    // The prototype wrote a ticket.created record that carried no body,
    // criteria, phase, or order, and the read filled the defaults. The
    // dsh snapshot is whole-value, so createTicket writes the full
    // snapshot with the defaults at the write boundary, and getTicket
    // reports exactly those values.
    const store = makeStore();
    const project = store.createProject("/srv/proj/old", "old");
    const ticket = store.createTicket(project, "Old ticket", "An old description.");
    const row = store.getTicket(ticket);
    expect(row.title).toBe("Old ticket");
    expect(row.description).toBe("An old description.");
    expect(row.state).toBe("open");
    expect(row.body).toBe("");
    expect(row.criteria).toBe("");
    expect(row.phase).toBe(1);
    expect(row.order).toBe(1);
  });

  it("a set that names one field keeps the others", () => {
    // The prototype's old update record named only the title. The kernel
    // builds the next whole snapshot from the previous one, so a set
    // that names one field keeps every other field.
    const store = makeStore();
    const project = store.createProject("/srv/proj/old", "old");
    const ticket = store.createTicket(project, "T", "d", { body: "A body." });
    store.setTicket(ticket, { title: "Renamed" });
    const row = store.getTicket(ticket);
    expect(row.title).toBe("Renamed");
    expect(row.body).toBe("A body.");
  });
});

describe("phases", () => {
  it("a new phase starts open with an empty title", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/phase", "phase");
    store.setPhase(project, 1);
    const phase = store.getPhase(project, 1);
    expect(phase.title).toBe("");
    expect(phase.state).toBe("open");
  });

  it("a phase keeps its title and state", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/phase", "phase");
    store.setPhase(project, 1, { title: "Groundwork", state: "done" });
    const phase = store.getPhase(project, 1);
    expect(phase.title).toBe("Groundwork");
    expect(phase.state).toBe("done");
  });

  it("setting one phase field leaves the other", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/phase", "phase");
    store.setPhase(project, 1, { title: "Groundwork", state: "done" });
    store.setPhase(project, 1, { state: "open" });
    const phase = store.getPhase(project, 1);
    expect(phase.title).toBe("Groundwork");
    expect(phase.state).toBe("open");
  });

  it("phases for sorts by number", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/phase", "phase");
    store.setPhase(project, 2, { title: "Second" });
    store.setPhase(project, 1, { title: "First" });
    expect(store.phasesFor(project).map((phase) => phase.number)).toEqual([1, 2]);
  });

  it("phases for skips another project", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/phase", "phase");
    const other = store.createProject("/srv/proj/other", "other");
    store.setPhase(project, 1, { title: "Mine" });
    store.setPhase(other, 1, { title: "Theirs" });
    expect(store.phasesFor(project).map((phase) => phase.title)).toEqual([
      "Mine",
    ]);
  });

  it("a phase of an unknown project is refused", () => {
    const store = makeStore();
    expect(() => store.setPhase(999, 1, { title: "Nowhere" })).toThrow(
      UnknownProject,
    );
  });
});

describe("plan fields survive a reopen", () => {
  it("the plan fields and phases survive a replay", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/reopen", "reopen");
    store.setPhase(project, 1, { title: "Groundwork", state: "done" });
    const ticket = store.createTicket(project, "T", "d", {
      body: "A body.",
      criteria: "A test passes.",
      phase: 1,
    });
    const beforeTicket = store.getTicket(ticket);
    const beforePhase = store.getPhase(project, 1);

    const reopened = storeFromLog(store.events());
    expect(reopened.getTicket(ticket)).toEqual(beforeTicket);
    expect(reopened.getPhase(project, 1)).toEqual(beforePhase);
  });
});
