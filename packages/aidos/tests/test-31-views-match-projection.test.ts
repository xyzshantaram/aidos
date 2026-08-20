/**
 * Item 31. The derived views match hand-written expected values.
 *
 * The prototype compared SQL views over its log to literals derived by
 * hand. The kernel derives the same views by folding, and the store reads
 * them through the same code path the paged read uses. The fixture drives
 * every read field. The refused move writes an aidos/refusal record that
 * must change no view.
 *
 * The fixture's custom "review" state is not in the kernel enum, so the
 * gates adapt to enum pairs: open to in_progress needs kind_a and kind_b
 * from user or agent, and in_progress to awaiting_verification needs
 * kind_a from the user. The first ticket drives to awaiting_verification.
 * The prototype's SeqOrderingTest cannot port: the kernel rejects a later
 * record whose at falls (SPEC decision 7). Its LegacyTicketDefaultsTest
 * ports through the public API instead of raw record injection, because
 * the dsh snapshot is whole-value and always carries the plan fields.
 * Ticket C3 carries the seq ordering decision.
 */

import { describe, expect, it } from "vitest";

import { GateRefused } from "../src/kernel/types";
import type {
  AidosConfig,
  EvidenceViewRow,
  GateDef,
  KindDef,
  PhaseView,
  ProjectView,
  TicketRow,
} from "../src/kernel/types";
import { defaultKinds, makeStore } from "./helpers";

const CONFIG: AidosConfig = {
  kinds: [
    ...defaultKinds(),
    {
      id: "kind_a",
      label: "Kind A",
      description: "The first kind.",
      weight: 3.0,
      allowedAuthors: ["user", "agent"],
    },
    {
      id: "kind_b",
      label: "Kind B",
      description: "The second kind.",
      weight: 2.0,
      allowedAuthors: ["user", "agent"],
    },
  ],
  gates: [
    {
      fromState: "open",
      toState: "in_progress",
      requiredKinds: ["kind_a", "kind_b"],
      allowedActors: ["user", "agent"],
    },
    {
      fromState: "in_progress",
      toState: "awaiting_verification",
      requiredKinds: ["kind_a"],
      allowedActors: ["user"],
    },
  ],
};

/** The v_kinds literal. Sorted by id, camelCase fields. */
const EXPECTED_KINDS: KindDef[] = [
  {
    id: "builtin:after_shot",
    label: "After shot",
    description: "The state after the work.",
    weight: 1.0,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "builtin:agent_report",
    label: "Agent report",
    description: "The agent describes the work.",
    weight: 1.0,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "builtin:comment",
    label: "Comment",
    description: "A remark on the ticket.",
    weight: 0.5,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "builtin:eval_criteria",
    label: "Evaluation criteria",
    description: "The criteria to judge the work.",
    weight: 1.0,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "builtin:file_allowlist",
    label: "File allowlist",
    description: "The files the change may touch.",
    weight: 1.0,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "builtin:review_pass",
    label: "Review pass",
    description: "A reviewer read the change and reported findings.",
    weight: 1.0,
    allowedAuthors: ["agent", "user"],
  },
  {
    id: "builtin:user_signoff",
    label: "User signoff",
    description: "The human confirms the work.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
  {
    id: "kind_a",
    label: "Kind A",
    description: "The first kind.",
    weight: 3.0,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "kind_b",
    label: "Kind B",
    description: "The second kind.",
    weight: 2.0,
    allowedAuthors: ["user", "agent"],
  },
];

/** The v_gates literal. Sorted by from then to, adapted to the enum. */
const EXPECTED_GATES: GateDef[] = [
  {
    fromState: "open",
    toState: "in_progress",
    requiredKinds: ["kind_a", "kind_b"],
    allowedActors: ["user", "agent"],
  },
  {
    fromState: "in_progress",
    toState: "awaiting_verification",
    requiredKinds: ["kind_a"],
    allowedActors: ["user"],
  },
];

/** The v_projects literal. Sorted by id. */
const EXPECTED_PROJECTS: ProjectView[] = [
  { id: 1, absPath: "/srv/a2", name: "Alpha" },
  { id: 2, absPath: "/srv/b", name: "Beta" },
];

/** The v_phases literal. Sorted by project then number. */
const EXPECTED_PHASES: PhaseView[] = [
  { projectId: 1, number: 1, title: "Groundwork", state: "done" },
  { projectId: 2, number: 2, title: "Build", state: "open" },
];

/** The v_tickets literal. Sorted by id. */
const EXPECTED_TICKETS: TicketRow[] = [
  {
    id: 1,
    projectId: 1,
    title: "Renamed one",
    description: "First desc.",
    body: "New body.",
    criteria: "A new rule.",
    phase: 2,
    order: 1,
    state: "awaiting_verification",
  },
  {
    id: 2,
    projectId: 1,
    title: "Ticket two",
    description: "Second desc.",
    body: "",
    criteria: "",
    phase: 1,
    order: 2,
    state: "open",
  },
  {
    id: 3,
    projectId: 2,
    title: "Ticket three",
    description: "Third desc.",
    body: "A body.",
    criteria: "A rule.",
    phase: 1,
    order: 1,
    state: "open",
  },
];

/** Build the fixture store and return it with the ticket ids. */
function fixtureStore() {
  const store = makeStore(CONFIG);
  const alpha = store.createProject("/srv/a", "Alpha");
  store.moveProject(alpha, "/srv/a2");
  const beta = store.createProject("/srv/b", "Beta");
  store.setPhase(alpha, 1, { title: "Groundwork" });
  store.setPhase(alpha, 1, { state: "done" });
  store.setPhase(beta, 2, { title: "Build" });
  store.setPlanMeta(alpha, { frontmatter: "# Front", preamble: "Intro" });
  store.setPlanMeta(alpha, {
    contextSections: [{ heading: "H1", text: "T1", index: 0 }],
  });
  const first = store.createTicket(alpha, "Ticket one", "First desc.");
  store.createTicket(alpha, "Ticket two", "Second desc.");
  store.createTicket(beta, "Ticket three", "Third desc.", {
    body: "A body.",
    criteria: "A rule.",
    phase: 1,
  });
  store.setTicket(first, { title: "Renamed one", body: "New body." });
  store.setTicket(first, { criteria: "A new rule.", phase: 2 });
  store.attachEvidence(first, "kind_a", { note: "one" }, "user");
  store.attachEvidence(first, "kind_b", { note: "two" }, "user");
  store.attachEvidence(first, "kind_a", { note: "three" }, "agent");
  store.moveTicket(first, "in_progress", "user");
  store.moveTicket(first, "awaiting_verification", "user");
  return store;
}

/** Every ticket of the fixture, in id order, the v_tickets order. */
function allTickets(store: ReturnType<typeof makeStore>) {
  return store
    .ticketsFor(1)
    .concat(store.ticketsFor(2))
    .sort((a, b) => a.id - b.id);
}

describe("views match the projection", () => {
  it("every view matches the projection, and a refusal changes no view", () => {
    const store = fixtureStore();

    // Snapshot every view before the refused move.
    const before = {
      kinds: [...store.config.kinds].sort((a, b) => (a.id < b.id ? -1 : 1)),
      gates: store.config.gates,
      projects: store.projects(),
      phases: [...store.phasesFor(1), ...store.phasesFor(2)],
      planMeta: store.getPlanMeta(1),
      tickets: allTickets(store),
      evidence: store.evidenceFor(1),
    };

    // The refused move appends a record that must change no state.
    expect(() => store.moveTicket(2, "in_progress", "user")).toThrow(
      GateRefused,
    );
    const events = store.events();
    const last = events[events.length - 1];
    expect(last.kind).toBe("aidos/refusal");
    if (last.kind !== "aidos/refusal") {
      throw new Error("the refused move must append a refusal event");
    }
    expect(last.ticketId).toBe(2);

    // The refused move changes no view. The kind registry compares in
    // id order, the order the prototype's v_kinds view reported.
    expect([...store.config.kinds].sort((a, b) => (a.id < b.id ? -1 : 1))).toEqual(
      before.kinds,
    );
    expect(store.config.gates).toEqual(before.gates);
    expect(store.projects()).toEqual(before.projects);
    expect(store.phasesFor(1).concat(store.phasesFor(2))).toEqual(before.phases);
    expect(store.getPlanMeta(1)).toEqual(before.planMeta);
    expect(allTickets(store)).toEqual(before.tickets);
    expect(store.evidenceFor(1)).toEqual(before.evidence);

    // The literals.
    expect([...store.config.kinds].sort((a, b) => (a.id < b.id ? -1 : 1))).toEqual(
      EXPECTED_KINDS,
    );
    expect(store.config.gates).toEqual(EXPECTED_GATES);
    expect(store.projects()).toEqual(EXPECTED_PROJECTS);
    expect(store.phasesFor(1).concat(store.phasesFor(2))).toEqual(EXPECTED_PHASES);
    expect(store.getPlanMeta(1)).toEqual({
      frontmatter: "# Front",
      preamble: "Intro",
      contextSections: [{ heading: "H1", text: "T1", index: 0 }],
      rules: "",
    });
    expect(allTickets(store)).toEqual(EXPECTED_TICKETS);
    // The evidence literal. The createdAt values come from the clock, so
    // they cannot be literals. They must be numbers and they must not
    // fall as the sequence rises.
    const rows: EvidenceViewRow[] = store.evidenceFor(1);
    expect(
      rows.map((row) => ({
        kind: row.kind,
        payload: row.payload,
        author: row.author,
      })),
    ).toEqual([
      { kind: "kind_a", payload: { note: "one" }, author: "user" },
      { kind: "kind_b", payload: { note: "two" }, author: "user" },
      { kind: "kind_a", payload: { note: "three" }, author: "agent" },
    ]);
    const createdAt = rows.map((row) => row.createdAt);
    expect(createdAt.every((at) => typeof at === "number")).toBe(true);
    expect(createdAt).toEqual([...createdAt].sort((a, b) => a - b));
  });
});

describe("seq ordering", () => {
  it("cannot port", () => {
    // The prototype inserted two registry records with SQL and asserted
    // that the later seq wins even when its at is lower. The kernel
    // rejects a record whose at falls for its subject (SPEC decision 7),
    // so "later seq beats at" is replaced by the fold's non-decreasing
    // at invariant. The ordering itself is the array order, which the
    // caller promises. See PORT-MAP.md, test_31 row.
  });
});

describe("legacy ticket defaults", () => {
  it("the filled defaults match the literal", () => {
    // The prototype inserted a ticket.created record without the plan
    // fields and asserted that the read fills "", "", 1, and the next
    // free order. The dsh snapshot is whole-value, so the write boundary
    // applies the defaults at createTicket and a partial record cannot
    // exist. The pin reads the same filled values through the public
    // API.
    const store = makeStore();
    const project = store.createProject("/srv/a", "Alpha");
    const ticket = store.createTicket(project, "Legacy", "A desc.");
    expect(store.getTicket(ticket)).toEqual({
      id: 1,
      projectId: 1,
      title: "Legacy",
      description: "A desc.",
      body: "",
      criteria: "",
      phase: 1,
      order: 1,
      state: "open",
    });
  });

  it("the filled order steps past an existing order", () => {
    const store = makeStore();
    const project = store.createProject("/srv/a", "Alpha");
    const modern = store.createTicket(project, "Modern", "A desc.", {
      phase: 1,
    });
    const legacy = store.createTicket(project, "Legacy", "A desc.");
    expect(store.getTicket(modern)).toEqual({
      id: 1,
      projectId: 1,
      title: "Modern",
      description: "A desc.",
      body: "",
      criteria: "",
      phase: 1,
      order: 1,
      state: "open",
    });
    expect(store.getTicket(legacy)).toEqual({
      id: 2,
      projectId: 1,
      title: "Legacy",
      description: "A desc.",
      body: "",
      criteria: "",
      phase: 1,
      order: 2,
      state: "open",
    });
  });
});
