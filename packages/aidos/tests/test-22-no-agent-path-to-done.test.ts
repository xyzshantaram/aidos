/**
 * Item 22. The agent has no path to done, whatever evidence it attaches.
 *
 * A plan import is no way around this. An import lands in the state "open"
 * even when the document marks every ticket done. The kernel refuses the
 * awaiting_verification to done move for the agent, names the missing kind
 * and the allowed actors, and leaves the ticket put. The earlier states
 * refuse with the pair named. The imported claim stays a
 * builtin:imported_state row with author system only.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { GateRefused } from "../src/kernel/types";
import { importPlan } from "../src/plan/plan-io";
import { expectGateRefused, makeStore } from "./helpers";

/** Every ticket carries the done mark. None of them may land in "done". */
const ALL_DONE_PLAN = `## Phase 1: Everything claims done — \`done\`

- [x] **Ticket 1: First claim.** A body. **Evaluate:** A test passes.
- [x] **Ticket 2: Second claim.** A body. **Evaluate:** A test passes.
`;

/** The kinds the CLI may author, from the B0 constant table. */
const AGENT_AUTHORABLE = [
  "builtin:automated_check",
  "builtin:after_shot",
  "builtin:test_run",
  "builtin:review_note",
  "builtin:review_pass",
];

describe("no agent path to done", () => {
  it("the setup reaches awaiting_verification", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "Ticket one", "A body.", {
      actor: "agent",
    });
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    for (const kind of AGENT_AUTHORABLE) {
      store.attachEvidence(ticket, kind, {}, "agent");
    }
    store.moveTicket(ticket, "awaiting_verification", "user");

    expect(store.getTicket(ticket).state).toBe("awaiting_verification");
    const attached = new Set(store.evidenceFor(ticket).map((row) => row.kind));
    for (const kind of AGENT_AUTHORABLE) {
      expect(attached.has(kind)).toBe(true);
    }
  });

  it("done is refused with every agent kind attached", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "Ticket one", "A body.", {
      actor: "agent",
    });
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    for (const kind of AGENT_AUTHORABLE) {
      store.attachEvidence(ticket, kind, {}, "agent");
    }
    store.moveTicket(ticket, "awaiting_verification", "user");

    expect(() => store.moveTicket(ticket, "done", "agent")).toThrow(
      GateRefused,
    );
  });

  it("the refusal names the missing kind or the allowed actors", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "Ticket one", "A body.", {
      actor: "agent",
    });
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    for (const kind of AGENT_AUTHORABLE) {
      store.attachEvidence(ticket, kind, {}, "agent");
    }
    store.moveTicket(ticket, "awaiting_verification", "user");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "done", "agent"),
    );
    const missing = refusal.missingKinds;
    const allowed = refusal.allowedActors;
    expect(missing.length > 0 || allowed.length > 0).toBe(true);
    if (missing.length > 0) {
      expect(missing).toContain("builtin:user_verified");
    }
    if (allowed.length > 0) {
      expect([...allowed].sort()).toEqual(["user"]);
    }
  });

  it("the ticket stays in awaiting_verification", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const ticket = store.createTicket(project, "Ticket one", "A body.", {
      actor: "agent",
    });
    store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(ticket, "in_progress", "user");
    for (const kind of AGENT_AUTHORABLE) {
      store.attachEvidence(ticket, kind, {}, "agent");
    }
    store.moveTicket(ticket, "awaiting_verification", "user");

    expect(() => store.moveTicket(ticket, "done", "agent")).toThrow(
      GateRefused,
    );
    expect(store.getTicket(ticket).state).toBe("awaiting_verification");
  });

  it("done is refused from the earlier states", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    const openTicket = store.createTicket(project, "Still open", "A body.", {
      actor: "agent",
    });

    const fromOpen = expectGateRefused(() =>
      store.moveTicket(openTicket, "done", "agent"),
    );
    expect(fromOpen.fromState).toBe("open");
    expect(fromOpen.toState).toBe("done");
    expect(store.getTicket(openTicket).state).toBe("open");

    store.attachEvidence(openTicket, "builtin:user_signoff", { ok: true }, "user");
    store.moveTicket(openTicket, "in_progress", "user");

    const fromInProgress = expectGateRefused(() =>
      store.moveTicket(openTicket, "done", "agent"),
    );
    expect(fromInProgress.fromState).toBe("in_progress");
    expect(fromInProgress.toState).toBe("done");
    expect(store.getTicket(openTicket).state).toBe("in_progress");
  });

  it("a plan import cannot produce a done ticket", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    importPlan(store, project, ALL_DONE_PLAN, "all_done.md");

    const tickets = store.ticketsFor(project);
    expect(tickets.length).toBe(2);
    expect(tickets.map((ticket) => ticket.state)).toEqual(["open", "open"]);
  });

  it("an import keeps the done claim as evidence only", () => {
    const store = makeStore(DEFAULT_CONFIG);
    const project = store.createProject("/srv/proj/cli", "cli");
    importPlan(store, project, ALL_DONE_PLAN, "all_done.md");

    for (const ticketId of [1, 2]) {
      const rows = store
        .evidenceFor(ticketId)
        .filter((row) => row.kind === "builtin:imported_state");
      expect(rows.length).toBe(1);
      expect(rows[0].payload).toEqual({
        claimed_state: "done",
        source: "all_done.md",
      });
      expect(rows[0].author).toBe("system");
      expect(store.getTicket(ticketId).state).toBe("open");
    }
  });
});
