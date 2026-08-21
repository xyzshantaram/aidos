/**
 * Item 32. ticketsPage returns one page plus the total count.
 *
 * Each row carries the get_ticket fields plus a score and a
 * gate_fraction. The tests compare the page score against
 * confidence_score, because the score is advisory. The total counts
 * matching tickets before limit and offset apply. The prototype's
 * legacy-row sort ports with auto-filled orders: the write boundary
 * applies the defaults at createTicket, so the sort orders by the same
 * filled values the legacy record reported (see PORT-MAP.md, test_32
 * row).
 */

import { describe, expect, it } from "vitest";

import { STATE_ORDER } from "../src/kernel/constants";
import type { AidosConfig, KindDef, SortKey } from "../src/kernel/types";
import { makeConfig, makeStore } from "./helpers";

/** One store with one project holding the given ticket count. */
function storeWithTickets(count: number) {
  const store = makeStore();
  const project = store.createProject("/srv/proj/page", "page");
  for (let index = 0; index < count; index++) {
    store.createTicket(project, `Ticket ${index}`, "A description.");
  }
  return store;
}

/** One config with three kinds and the given weights. */
function configWithKinds(kinds: KindDef[]): AidosConfig {
  return makeConfig(kinds);
}

describe("tickets page", () => {
  it("a page of twenty returns twenty rows", () => {
    const store = storeWithTickets(25);
    const page = store.ticketsPage({ limit: 20, offset: 0 });
    expect(page.page.length).toBe(20);
    expect(page.total).toBe(25);
  });

  it("every row score matches the confidence oracle", () => {
    const store = makeStore(
      configWithKinds([
        {
          id: "kind_a",
          label: "Kind A",
          description: "The first kind.",
          weight: 1.0,
          // The prototype attached kind_a as both the user and the agent,
          // so the kind must admit both authors here too.
          allowedAuthors: ["user", "agent"],
        },
        {
          id: "kind_b",
          label: "Kind B",
          description: "The second kind.",
          weight: 2.0,
          allowedAuthors: ["user"],
        },
      ]),
    );
    const project = store.createProject("/srv/proj/score", "score");
    const first = store.createTicket(project, "T1", "One.");
    const second = store.createTicket(project, "T2", "Two.");
    store.createTicket(project, "T3", "Three.");
    store.attachEvidence(first, "kind_a", { n: 1 }, "user");
    store.attachEvidence(first, "kind_b", { n: 2 }, "user");
    store.attachEvidence(first, "kind_a", { n: 3 }, "agent");
    store.attachEvidence(second, "kind_a", { n: 4 }, "user");
    store.attachEvidence(second, "kind_a", { n: 5 }, "user");

    const page = store.ticketsPage();
    for (const row of page.page) {
      expect(row.score).toBe(store.confidenceScore(row.id));
    }
  });

  it("score sort and gate fraction sort disagree", () => {
    const store = makeStore({
      kinds: configWithKinds([
        {
          id: "kind_a",
          label: "Kind A",
          description: "The first kind.",
          weight: 1.0,
          allowedAuthors: ["user"],
        },
        {
          id: "kind_b",
          label: "Kind B",
          description: "The second kind.",
          weight: 1.0,
          allowedAuthors: ["user"],
        },
        {
          id: "kind_c",
          label: "Kind C",
          description: "The heavy kind.",
          weight: 10.0,
          allowedAuthors: ["user"],
        },
      ]).kinds,
      gates: [
        {
          fromState: "open",
          toState: "in_progress",
          requiredKinds: ["kind_a", "kind_b"],
          allowedActors: ["user"],
        },
      ],
    });
    const project = store.createProject("/srv/proj/sort", "sort");
    const highScore = store.createTicket(project, "T1", "One.");
    const lowScore = store.createTicket(project, "T2", "Two.");
    store.attachEvidence(highScore, "kind_b", { n: 1 }, "user");
    store.attachEvidence(highScore, "kind_c", { n: 2 }, "user");
    store.attachEvidence(lowScore, "kind_a", { n: 3 }, "user");
    store.attachEvidence(lowScore, "kind_b", { n: 4 }, "user");

    const byScore = store
      .ticketsPage({ sort: "score" })
      .page.map((row) => row.id);
    const byFraction = store
      .ticketsPage({ sort: "gate_fraction" })
      .page.map((row) => row.id);
    expect(byScore).not.toEqual(byFraction);
  });

  it("a project filter limits the rows and the total", () => {
    const store = makeStore();
    const alpha = store.createProject("/srv/proj/a", "Alpha");
    const beta = store.createProject("/srv/proj/b", "Beta");
    for (let index = 0; index < 3; index++) {
      store.createTicket(alpha, `A${index}`, "Desc.");
    }
    for (let index = 0; index < 2; index++) {
      store.createTicket(beta, `B${index}`, "Desc.");
    }

    const alphaPage = store.ticketsPage({ projectId: alpha });
    expect(alphaPage.page.length).toBe(3);
    expect(alphaPage.total).toBe(3);
    for (const row of alphaPage.page) {
      expect(row.projectId).toBe(alpha);
    }
    expect(store.ticketsPage({ projectId: beta }).total).toBe(2);
  });

  it("walking offsets visits every ticket once", () => {
    const store = storeWithTickets(7);
    const project = store.projects()[0].id;
    const ids = store.ticketsFor(project).map((ticket) => ticket.id).sort(
      (a, b) => a - b,
    );
    const collected: number[] = [];
    let offset = 0;
    while (collected.length < ids.length) {
      const page = store.ticketsPage({ limit: 3, offset });
      collected.push(...page.page.map((row) => row.id));
      offset += 3;
    }
    expect([...collected].sort((a, b) => a - b)).toEqual(ids);
  });

  it("rows sort by the phase and order they report", () => {
    const store = makeStore();
    const project = store.createProject("/srv/proj/legacy", "legacy");
    store.createTicket(project, "Modern A", "One.", { phase: 1 });
    store.createTicket(project, "Modern B", "Two.", { phase: 2 });
    // The prototype inserted a legacy record here and let the read fill
    // phase 1 and the next free order. The dsh snapshot is whole-value,
    // so the write boundary fills the same values at createTicket: the
    // third ticket takes the default phase 1 and the next free order 2,
    // which is exactly what the legacy record reported.
    store.createTicket(project, "Legacy", "A desc.");

    const expected = [1, 3, 2];
    expect(store.ticketsFor(project).map((ticket) => ticket.id)).toEqual(
      expected,
    );
    expect(
      store.ticketsPage({ sort: "phase" }).page.map((row) => row.id),
    ).toEqual(expected);
  });

  it("an unknown sort key is refused and named", () => {
    const store = storeWithTickets(2);
    let caught: unknown;
    try {
      store.ticketsPage({ sort: "unknown" as SortKey });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(String(caught)).toContain("unknown");
  });

  it("descending reverses the id order", () => {
    const store = storeWithTickets(5);
    const ascending = store
      .ticketsPage({ sort: "id", descending: false })
      .page.map((row) => row.id);
    const descending = store
      .ticketsPage({ sort: "id", descending: true })
      .page.map((row) => row.id);
    expect(descending).toEqual([...ascending].reverse());
  });
});

describe("the gate fraction", () => {
  /** One config with a gate on every forward transition. */
  function configWithForwardGates(required: string[]): AidosConfig {
    return {
      kinds: makeConfig().kinds,
      gates: [
        {
          fromState: "open",
          toState: "in_progress",
          requiredKinds: required,
          allowedActors: ["user"],
        },
        {
          fromState: "in_progress",
          toState: "awaiting_verification",
          requiredKinds: required,
          allowedActors: ["user"],
        },
        {
          fromState: "awaiting_verification",
          toState: "done",
          requiredKinds: required,
          allowedActors: ["user"],
        },
      ],
    };
  }

  /** The only row of the only ticket in the store. */
  function firstRow(store: ReturnType<typeof makeStore>) {
    const page = store.ticketsPage();
    expect(page.page.length).toBe(1);
    return page.page[0];
  }

  it("a done ticket has no gate fraction", () => {
    const store = makeStore(configWithForwardGates(["builtin:user_signoff"]));
    const project = store.createProject("/srv/proj/done", "done");
    const ticket = store.createTicket(project, "T", "A description.");
    store.attachEvidence(ticket, "builtin:user_signoff", { n: 1 }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    store.moveTicket(ticket, "awaiting_verification", "user");
    store.moveTicket(ticket, "done", "user");
    const row = firstRow(store);
    expect(row.state).toBe("done");
    expect(row.gateFraction).toBeNull();
  });

  it("a missing forward gate has no gate fraction", () => {
    const store = makeStore({
      kinds: makeConfig().kinds,
      gates: [
        {
          // A gate on a non forward pair. The fraction stays null,
          // because the open to in_progress forward pair has no gate.
          fromState: "done",
          toState: "open",
          requiredKinds: ["builtin:user_signoff"],
          allowedActors: ["user"],
        },
      ],
    });
    const project = store.createProject("/srv/proj/gate", "gate");
    store.createTicket(project, "T", "A description.");
    const row = firstRow(store);
    expect(row.state).toBe("open");
    expect(row.gateFraction).toBeNull();
  });

  it("a gate with no required kinds is one", () => {
    const store = makeStore(configWithForwardGates([]));
    const project = store.createProject("/srv/proj/empty", "empty");
    store.createTicket(project, "T", "A description.");
    expect(firstRow(store).gateFraction).toBe(1.0);
  });

  it("every required kind gives one", () => {
    const store = makeStore(
      configWithForwardGates(["builtin:user_signoff", "builtin:eval_criteria"]),
    );
    const project = store.createProject("/srv/proj/full", "full");
    const ticket = store.createTicket(project, "T", "A description.");
    store.attachEvidence(ticket, "builtin:user_signoff", { n: 1 }, "user");
    store.attachEvidence(ticket, "builtin:eval_criteria", { n: 2 }, "user");
    expect(firstRow(store).gateFraction).toBe(1.0);
  });

  it("some required kinds give a partial fraction", () => {
    const store = makeStore(
      configWithForwardGates(["builtin:user_signoff", "builtin:eval_criteria"]),
    );
    const project = store.createProject("/srv/proj/partial", "partial");
    const ticket = store.createTicket(project, "T", "A description.");
    store.attachEvidence(ticket, "builtin:user_signoff", { n: 1 }, "user");
    const fraction = firstRow(store).gateFraction as number;
    expect(fraction).toBeGreaterThan(0.0);
    expect(fraction).toBeLessThan(1.0);
  });
});

describe("forward transition coverage", () => {
  // One required kind per forward transition, so an earlier kind cannot
  // satisfy a later gate.
  const GATE_KINDS = ["builtin:user_signoff", "builtin:agent_report", "builtin:after_shot"];

  it("every state before the last reports a fraction", () => {
    expect(GATE_KINDS.length).toBe(STATE_ORDER.length - 1);
    const config: AidosConfig = {
      kinds: makeConfig().kinds,
      gates: STATE_ORDER.slice(0, -1).map((state, index) => ({
        fromState: state,
        toState: STATE_ORDER[index + 1],
        requiredKinds: [GATE_KINDS[index]],
        allowedActors: ["user"],
      })),
    };
    const store = makeStore(config);
    const project = store.createProject("/srv/proj/walk", "walk");
    const ticket = store.createTicket(project, "Walker", "A description.");

    const fraction = (ticketId: number) => {
      const page = store.ticketsPage({ limit: 10 });
      const row = page.page.find((candidate) => candidate.id === ticketId);
      if (!row) {
        throw new Error(`ticket ${ticketId} is missing from the page`);
      }
      return row.gateFraction;
    };

    for (const [index, kind] of GATE_KINDS.entries()) {
      const state = STATE_ORDER[index];
      expect(store.getTicket(ticket).state).toBe(state);
      expect(fraction(ticket)).toBe(0.0);
      // The prototype attached every kind as the user. The constant
      // table admits the user for all three kinds, so the same call
      // works here.
      store.attachEvidence(ticket, kind, { ok: true }, "user");
      expect(fraction(ticket)).toBe(1.0);
      store.moveTicket(ticket, STATE_ORDER[index + 1], "user");
    }

    expect(store.getTicket(ticket).state).toBe(STATE_ORDER[STATE_ORDER.length - 1]);
    expect(fraction(ticket)).toBeNull();
  });
});
