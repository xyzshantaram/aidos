/**
 * Item 26. A plan document survives an import, an export, and a second
 * import.
 *
 * The fixture holds every part of the format: frontmatter, a preamble, one
 * context section, a done ticket, an open ticket, and a ticket with a body of
 * three lines. An import is never a transition, so
 * lines, and one context section. An import is never a transition, so
 * every ticket lands in open and the claim of the document becomes one
 * builtin:imported_state row. The round trip therefore compares the plan
 * fields of the ticket and holds the state to open on both sides.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import {
  PlanParseError,
  ProjectNotEmptyError,
} from "../src/kernel/types";
import { STATE_MARKS } from "../src/plan/plan";
import { exportPlan, importPlan } from "../src/plan/plan-io";
import type { Store } from "../src/kernel/store";
import type { TicketRow } from "../src/kernel/types";
import { expectThrows, makeStore } from "./helpers";

const PLAN = `---
plan: Prototype plan
owner: sid
---

# Prototype plan

## Notes

This section is not a phase. The parser must keep the text.

The list below must survive:

- one
- two

- [x] **Ticket 1: Read the kernel.** Read the store and note the API. **Evaluate:** The notes name every public method.
- [ ] **Ticket 2: Choose the flags.** Pick one spelling for each flag.
  Keep the spelling the same in every subcommand.
  Write the choice into a docstring. **Evaluate:** Every flag appears once in the docstring.
- [ ] **Ticket 3: Write the suite.** One module for each subject. **Evaluate:** The suite fails on the missing module.
`;

const FRONTMATTER = "---\nplan: Prototype plan\nowner: sid\n---";
const PREAMBLE = "# Prototype plan";

const CONTEXT_SECTION = `## Notes

This section is not a phase. The parser must keep the text.

The list below must survive:

- one
- two`;

// One line that is neither blank, nor a ticket, nor a continuation. The
// parser must stop and name the line.
const BAD_PLAN_LINES = [
  "## Notes",
  "",
  "- [ ] **Ticket 1: Read it.** A body. **Evaluate:** The work is done.",
  "",
  "This line is neither a ticket nor a continuation.",
  "",
];
const BAD_PLAN = BAD_PLAN_LINES.join("\n");
const BAD_LINE_NUMBER =
  BAD_PLAN_LINES.indexOf("This line is neither a ticket nor a continuation.") + 1;

// The ticket fields that must survive a round trip through a plan document.
// The state is absent, because an import always lands in open.
const ROUND_TRIP_TICKET_KEYS = ["id", "title", "body", "criteria", "phase", "order"] as const;

/** One fresh store with one empty project. */
function freshStore() {
  const store = makeStore(DEFAULT_CONFIG);
  const projectId = store.createProject("/srv/proj/plan", "plan");
  return { store, projectId };
}

/** The round trip fields of every ticket, in list order. */
function ticketData(store: Store, projectId: number) {
  return store.ticketsFor(projectId).map((ticket) => {
    const row: Record<string, unknown> = {};
    for (const key of ROUND_TRIP_TICKET_KEYS) {
      row[key] = ticket[key];
    }
    return row;
  });
}

/** The state of every ticket, in list order. */
function ticketStates(store: Store, projectId: number) {
  return store.ticketsFor(projectId).map((ticket) => ticket.state);
}

/** The mark that the export gave one ticket. */
function markOf(text: string, ticketId: number) {
  const wanted = `**Ticket ${ticketId}:`;
  for (const line of text.split("\n")) {
    if (line.includes(wanted)) {
      return line.trim().slice(2, 5);
    }
  }
  throw new Error(`ticket ${ticketId} has no line in the export`);
}

/** Drive one ticket to a state the way the board would. */
function driveTo(store: Store, ticketId: number, state: TicketRow["state"]) {
  if (state === "open") {
    return;
  }
  store.attachEvidence(ticketId, "builtin:user_signoff", { ok: true }, "user");
  store.moveTicket(ticketId, "in_progress", "user");
  if (state === "in_progress") {
    return;
  }
  store.attachEvidence(ticketId, "builtin:automated_check", {}, "agent");
  store.attachEvidence(ticketId, "builtin:review_pass", {}, "agent");
  store.moveTicket(ticketId, "awaiting_verification", "user");
  if (state === "awaiting_verification") {
    return;
  }
  store.attachEvidence(ticketId, "builtin:user_verified", { ok: true }, "user");
  store.moveTicket(ticketId, "done", "user");
}

describe("plan round trip", () => {
  it("the fixture imports with the documented fields", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");
    const rows = ticketData(store, projectId);
    expect(rows.length).toBe(3);
    expect(rows.map((row) => row.title)).toEqual([
      "Read the kernel",
      "Choose the flags",
      "Write the suite",
    ]);
    expect(rows.map((row) => row.phase)).toEqual([1, 1, 1]);
    expect(rows.map((row) => row.order)).toEqual([1, 2, 3]);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(rows[0].criteria).toBe("The notes name every public method.");
  });

  it("a multi line body keeps every line", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");
    const rows = ticketData(store, projectId);
    const body = rows[1].body as string;
    expect(body).toContain("Pick one spelling for each flag.");
    expect(body).toContain("Keep the spelling the same in every subcommand.");
    expect(body).toContain("Write the choice into a docstring.");
    expect(body).not.toContain("**Evaluate:**");
    expect(rows[1].criteria).toBe("Every flag appears once in the docstring.");
  });

  it("every imported ticket lands in open", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");
    expect(ticketStates(store, projectId)).toEqual(["open", "open", "open"]);
  });

  it("the done ticket keeps its claim as evidence", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");
    const rows = store
      .evidenceFor(1)
      .filter((row) => row.kind === "builtin:imported_state");
    expect(rows.length).toBe(1);
    expect(rows[0].payload).toEqual({
      claimed_state: "done",
      source: "plan.md",
    });
    expect(store.getTicket(1).state).toBe("open");
  });

  it("every imported ticket holds one import record", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");
    const claims: string[] = [];
    for (const ticketId of [1, 2, 3]) {
      const rows = store
        .evidenceFor(ticketId)
        .filter((row) => row.kind === "builtin:imported_state");
      expect(rows.length).toBe(1);
      claims.push((rows[0].payload as { claimed_state: string }).claimed_state);
    }
    expect(claims).toEqual(["done", "open", "open"]);
  });

  it("a round trip keeps the ticket data", () => {
    const first = freshStore();
    importPlan(first.store, first.projectId, PLAN, "plan.md");
    const before = ticketData(first.store, first.projectId);

    const exported = exportPlan(first.store, first.projectId);
    const second = freshStore();
    importPlan(second.store, second.projectId, exported, "exported.md");
    const after = ticketData(second.store, second.projectId);

    expect(after).toEqual(before);
    expect(ticketStates(second.store, second.projectId)).toEqual([
      "open",
      "open",
      "open",
    ]);
  });

  it("two exports are byte identical", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");
    expect(exportPlan(store, projectId)).toBe(exportPlan(store, projectId));
  });

  it("a context section survives unchanged", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");
    expect(exportPlan(store, projectId)).toContain(CONTEXT_SECTION);
  });

  it("the frontmatter survives unchanged", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");
    expect(exportPlan(store, projectId)).toContain(FRONTMATTER);
  });

  it("the preamble survives unchanged", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");
    expect(exportPlan(store, projectId)).toContain(PREAMBLE);
  });

  it("the export renders all four state marks", () => {
    const { store, projectId } = freshStore();
    importPlan(store, projectId, PLAN, "plan.md");

    const wanted: Array<[number, string]> = [];
    for (const state of [
      "open",
      "in_progress",
      "awaiting_verification",
      "done",
    ] as const) {
      const ticket = store.createTicket(
        projectId,
        `Ticket in ${state}`,
        "A description.",
        { actor: "user" },
      );
      driveTo(store, ticket, state);
      expect(store.getTicket(ticket).state).toBe(state);
      wanted.push([ticket, `[${STATE_MARKS[state]}]`]);
    }

    const text = exportPlan(store, projectId);
    for (const [ticketId, mark] of wanted) {
      expect(markOf(text, ticketId)).toBe(mark);
    }
  });

  it("an unparsable line names the line number", () => {
    const { store, projectId } = freshStore();
    const error = expectThrows(
      () => importPlan(store, projectId, BAD_PLAN, "bad_plan.md"),
      PlanParseError,
    );
    expect(error.line).toBe(BAD_LINE_NUMBER);
    expect(error.message).toContain(String(BAD_LINE_NUMBER));
  });

  it("an unparsable line imports nothing", () => {
    const { store, projectId } = freshStore();
    expect(() => importPlan(store, projectId, BAD_PLAN, "bad_plan.md")).toThrow(
      PlanParseError,
    );
    expect(store.ticketsFor(projectId)).toEqual([]);
  });

  it("an import into a non empty project refuses", () => {
    const { store, projectId } = freshStore();
    store.createTicket(projectId, "Already here", "A body.", { actor: "user" });
    const error = expectThrows(
      () => importPlan(store, projectId, PLAN, "plan.md"),
      ProjectNotEmptyError,
    );
    expect(error.projectId).toBe(projectId);
  });
});
