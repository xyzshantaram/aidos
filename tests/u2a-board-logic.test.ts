/**
 * Ticket U2A: the ticket board-logic helpers.
 *
 * The future src/client/board-logic module must satisfy this contract.
 * compareTickets is total and deterministic. A ticket without criteria
 * always sorts after a ticket with criteria, for every key and every
 * direction. filterTickets keeps tickets by project, state, and search,
 * then sorts the survivors. autocompleteTickets returns at most limit
 * matches, sorted by id ascending.
 */

import { describe, expect, it } from "vitest";

import type { TicketState } from "../src/kernel/types";
import type { TicketView } from "../src/kernel/projections";
import {
  STATE_CHECKLIST_ORDER,
  hasCriteria,
  compareTickets,
  filterTickets,
  autocompleteTickets,
  displayDep,
  openCount,
  formatGateFraction,
  ringPercent,
  fullTicketId,
  idColor,
  ticketChipLabel,
  kindKeyword,
} from "../src/client/board-logic";

const ALL_STATES: TicketState[] = ["open", "in_progress", "awaiting_verification", "done"];

const WORKSPACE_KEY = "--home-sid-repos-aidos--";

function makeTicket(overrides: Partial<TicketView> & { updatedAt?: number }) {
  return {
    id: 1,
    projectId: 1,
    title: "T",
    description: "",
    body: "",
    criteria: "",
    phase: 0,
    workspaceKey: WORKSPACE_KEY,
    slug: "t",
    order: 0,
    state: "open",
    confidenceScore: 0,
    gateFraction: null,
    gatePresent: null,
    gateTotal: null,
    updatedAt: 0,
    ...overrides,
  };
}

describe("STATE_CHECKLIST_ORDER", () => {
  it("lists every state exactly once with done last", () => {
    expect(STATE_CHECKLIST_ORDER).toEqual(ALL_STATES);
  });

  it("holds no duplicate states", () => {
    expect(new Set(STATE_CHECKLIST_ORDER).size).toBe(STATE_CHECKLIST_ORDER.length);
  });

  it("puts done last", () => {
    expect(STATE_CHECKLIST_ORDER[STATE_CHECKLIST_ORDER.length - 1]).toBe("done");
  });
});

describe("hasCriteria", () => {
  it("returns false for an empty criteria string", () => {
    expect(hasCriteria(makeTicket({ criteria: "" }))).toBe(false);
  });

  it("returns false for a whitespace-only criteria string", () => {
    expect(hasCriteria(makeTicket({ criteria: " \n\t " }))).toBe(false);
  });

  it("returns true for a non-empty criteria string", () => {
    expect(hasCriteria(makeTicket({ criteria: "ship the gate" }))).toBe(true);
  });
});

describe("compareTickets", () => {
  it("orders by confidence ascending", () => {
    const low = makeTicket({ criteria: "x", confidenceScore: 1 });
    const high = makeTicket({ criteria: "x", confidenceScore: 3 });
    expect(compareTickets(low, high, "confidence", false)).toBeLessThan(0);
    expect(compareTickets(high, low, "confidence", false)).toBeGreaterThan(0);
  });

  it("orders by gate fraction ascending", () => {
    const low = makeTicket({ criteria: "x", gateFraction: 0.25 });
    const high = makeTicket({ criteria: "x", gateFraction: 0.75 });
    expect(compareTickets(low, high, "gates", false)).toBeLessThan(0);
    expect(compareTickets(high, low, "gates", false)).toBeGreaterThan(0);
  });

  it("orders by updatedAt ascending", () => {
    const old = makeTicket({ criteria: "x", updatedAt: 10 });
    const fresh = makeTicket({ criteria: "x", updatedAt: 20 });
    expect(compareTickets(old, fresh, "time", false)).toBeLessThan(0);
    expect(compareTickets(fresh, old, "time", false)).toBeGreaterThan(0);
  });

  it("orders by title ascending case-insensitively", () => {
    const a = makeTicket({ criteria: "x", title: "Apple" });
    const b = makeTicket({ criteria: "x", title: "banana" });
    expect(compareTickets(a, b, "alpha", false)).toBeLessThan(0);
    expect(compareTickets(b, a, "alpha", false)).toBeGreaterThan(0);
  });

  it("breaks a confidence tie by gate fraction ascending", () => {
    const a = makeTicket({ criteria: "x", confidenceScore: 5, gateFraction: 0.2 });
    const b = makeTicket({ criteria: "x", confidenceScore: 5, gateFraction: 0.8 });
    expect(compareTickets(a, b, "confidence", false)).toBeLessThan(0);
  });

  it("breaks a gate tie by confidence ascending", () => {
    const a = makeTicket({ criteria: "x", gateFraction: 0.5, confidenceScore: 1 });
    const b = makeTicket({ criteria: "x", gateFraction: 0.5, confidenceScore: 3 });
    expect(compareTickets(a, b, "gates", false)).toBeLessThan(0);
  });

  it("breaks a time tie by title ascending case-insensitively", () => {
    const a = makeTicket({ criteria: "x", updatedAt: 7, title: "Alpha" });
    const b = makeTicket({ criteria: "x", updatedAt: 7, title: "beta" });
    expect(compareTickets(a, b, "time", false)).toBeLessThan(0);
  });

  it("breaks an alpha tie by updatedAt ascending", () => {
    const a = makeTicket({ criteria: "x", title: "same", updatedAt: 5 });
    const b = makeTicket({ criteria: "x", title: "same", updatedAt: 9 });
    expect(compareTickets(a, b, "alpha", false)).toBeLessThan(0);
  });

  it("reverses the primary order when descending", () => {
    const low = makeTicket({ criteria: "x", confidenceScore: 1 });
    const high = makeTicket({ criteria: "x", confidenceScore: 3 });
    expect(compareTickets(low, high, "confidence", true)).toBeGreaterThan(0);
  });

  it("reverses the tiebreak when descending", () => {
    const a = makeTicket({ criteria: "x", confidenceScore: 5, gateFraction: 0.2 });
    const b = makeTicket({ criteria: "x", confidenceScore: 5, gateFraction: 0.8 });
    expect(compareTickets(a, b, "confidence", true)).toBeGreaterThan(0);
  });

  for (const key of ["confidence", "gates", "time", "alpha"] as const) {
    it(`keeps a no-criteria ticket last under ${key} in both directions`, () => {
      const withCriteria = makeTicket({ criteria: "must ship" });
      const withoutCriteria = makeTicket({ criteria: "" });
      expect(compareTickets(withCriteria, withoutCriteria, key, false)).toBeLessThan(0);
      expect(compareTickets(withCriteria, withoutCriteria, key, true)).toBeLessThan(0);
      expect(compareTickets(withoutCriteria, withCriteria, key, false)).toBeGreaterThan(0);
      expect(compareTickets(withoutCriteria, withCriteria, key, true)).toBeGreaterThan(0);
    });
  }

  it("treats a null gateFraction with criteria as 0 under the gates key", () => {
    const a = makeTicket({ criteria: "x", gateFraction: null });
    const b = makeTicket({ criteria: "x", gateFraction: 0.5 });
    expect(compareTickets(a, b, "gates", false)).toBeLessThan(0);
    expect(compareTickets(b, a, "gates", false)).toBeGreaterThan(0);
  });

  it("breaks a full tie by id ascending in both directions", () => {
    const a = makeTicket({ id: 3, criteria: "x", title: "same", confidenceScore: 4, gateFraction: 0.5, updatedAt: 9 });
    const b = makeTicket({ id: 7, criteria: "x", title: "same", confidenceScore: 4, gateFraction: 0.5, updatedAt: 9 });
    expect(compareTickets(a, b, "confidence", false)).toBeLessThan(0);
    expect(compareTickets(b, a, "confidence", true)).toBeGreaterThan(0);
    expect(compareTickets(a, a, "confidence", false)).toBe(0);
  });
});

describe("filterTickets", () => {
  it("keeps only tickets in the chosen states", () => {
    const open = makeTicket({ id: 1, state: "open" });
    const done = makeTicket({ id: 2, state: "done" });
    const inProgress = makeTicket({ id: 3, state: "in_progress" });
    const out = filterTickets([open, done, inProgress], {
      projectIds: null,
      stateIds: ["open", "in_progress"] as TicketState[],
      sortKey: "confidence",
      descending: false,
      search: "",
    });
    expect(out.map((t) => t.id)).toEqual([1, 3]);
  });

  it("keeps only tickets in the chosen projects", () => {
    const inProject = makeTicket({ id: 1, projectId: 1 });
    const outside = makeTicket({ id: 2, projectId: 2 });
    const out = filterTickets([inProject, outside], {
      projectIds: [1],
      stateIds: ALL_STATES,
      sortKey: "confidence",
      descending: false,
      search: "",
    });
    expect(out.map((t) => t.id)).toEqual([1]);
  });

  it("matches a title substring case-insensitively", () => {
    const a = makeTicket({ id: 1, title: "Fix the gate" });
    const b = makeTicket({ id: 2, title: "Write docs" });
    const out = filterTickets([a, b], {
      projectIds: null,
      stateIds: ALL_STATES,
      sortKey: "confidence",
      descending: false,
      search: "GATE",
    });
    expect(out.map((t) => t.id)).toEqual([1]);
  });

  it("matches a search against the id string", () => {
    const a = makeTicket({ id: 1, title: "One" });
    const b = makeTicket({ id: 21, title: "Two" });
    const out = filterTickets([a, b], {
      projectIds: null,
      stateIds: ALL_STATES,
      sortKey: "confidence",
      descending: false,
      search: "2",
    });
    expect(out.map((t) => t.id)).toEqual([21]);
  });

  it("combines the state, project, and search filters", () => {
    const keep = makeTicket({ id: 1, projectId: 2, state: "open", title: "Deploy alpha" });
    const wrongState = makeTicket({ id: 2, projectId: 2, state: "done", title: "Deploy alpha" });
    const wrongProject = makeTicket({ id: 3, projectId: 3, state: "open", title: "Deploy alpha" });
    const wrongTitle = makeTicket({ id: 4, projectId: 2, state: "open", title: "Write docs" });
    const out = filterTickets([keep, wrongState, wrongProject, wrongTitle], {
      projectIds: [2],
      stateIds: ["open"] as TicketState[],
      sortKey: "confidence",
      descending: false,
      search: "alpha",
    });
    expect(out.map((t) => t.id)).toEqual([1]);
  });

  it("sorts the survivors with the given key and direction", () => {
    const low = makeTicket({ id: 1, criteria: "x", confidenceScore: 1 });
    const high = makeTicket({ id: 2, criteria: "x", confidenceScore: 5 });
    const out = filterTickets([high, low], {
      projectIds: null,
      stateIds: ["open"] as TicketState[],
      sortKey: "confidence",
      descending: true,
      search: "",
    });
    expect(out.map((t) => t.id)).toEqual([2, 1]);
  });
});

describe("autocompleteTickets", () => {
  it("narrows by a title substring case-insensitively", () => {
    const a = makeTicket({ id: 1, title: "Deploy alpha" });
    const b = makeTicket({ id: 2, title: "Write docs" });
    expect(autocompleteTickets([a, b], "ALPHA").map((t) => t.id)).toEqual([1]);
  });

  it("narrows by the id string", () => {
    const a = makeTicket({ id: 4, title: "One" });
    const b = makeTicket({ id: 27, title: "Two" });
    expect(autocompleteTickets([a, b], "4").map((t) => t.id)).toEqual([4]);
  });

  it("returns at most limit results", () => {
    const tickets = Array.from({ length: 5 }, (_, i) => makeTicket({ id: i + 1, title: "T" }));
    expect(autocompleteTickets(tickets, "", 3)).toHaveLength(3);
  });

  it("returns every ticket for an empty query when under the limit", () => {
    const tickets = [makeTicket({ id: 1 }), makeTicket({ id: 2 }), makeTicket({ id: 3 })];
    expect(autocompleteTickets(tickets, "").map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it("caps an empty query at the default limit of 8", () => {
    const tickets = Array.from({ length: 12 }, (_, i) => makeTicket({ id: i + 1, title: `T${i}` }));
    expect(autocompleteTickets(tickets, "")).toHaveLength(8);
  });

  it("sorts matches by id ascending", () => {
    const tickets = [makeTicket({ id: 9 }), makeTicket({ id: 2 }), makeTicket({ id: 5 })];
    expect(autocompleteTickets(tickets, "").map((t) => t.id)).toEqual([2, 5, 9]);
  });
});

describe("openCount", () => {
  it("counts only tickets that are not done", () => {
    const tickets = [
      makeTicket({ id: 1, state: "open" }),
      makeTicket({ id: 2, state: "in_progress" }),
      makeTicket({ id: 3, state: "awaiting_verification" }),
      makeTicket({ id: 4, state: "done" }),
      makeTicket({ id: 5, state: "done" }),
    ];
    expect(openCount(tickets)).toBe(3);
  });

  it("returns 0 for an empty list", () => {
    expect(openCount([])).toBe(0);
  });
});

describe("formatGateFraction", () => {
  it("returns N/A when the ticket has no criteria", () => {
    expect(formatGateFraction(1, 2, false)).toBe("N/A");
    expect(formatGateFraction(null, null, false)).toBe("N/A");
  });

  it("returns an em dash for a null gate with criteria", () => {
    expect(formatGateFraction(null, null, true)).toBe("\u2014");
    expect(formatGateFraction(null, 2, true)).toBe("\u2014");
    expect(formatGateFraction(1, null, true)).toBe("\u2014");
  });

  it("formats a real gate as m over n", () => {
    expect(formatGateFraction(0, 2, true)).toBe("0/2");
    expect(formatGateFraction(1, 2, true)).toBe("1/2");
    expect(formatGateFraction(2, 2, true)).toBe("2/2");
    expect(formatGateFraction(1, 1, true)).toBe("1/1");
  });
});

describe("ringPercent", () => {
  it("maps a score to a percent", () => {
    expect(ringPercent(0)).toBe(0);
    expect(ringPercent(5)).toBe(100);
    expect(ringPercent(2.5)).toBe(50);
  });

  it("clamps below 0 and above 100", () => {
    expect(ringPercent(-1)).toBe(0);
    expect(ringPercent(6)).toBe(100);
  });
});

describe("fullTicketId", () => {
  it("joins the workspace key and the slug with a colon", () => {
    expect(fullTicketId(makeTicket({ id: 341 }))).toBe(WORKSPACE_KEY + ":t");
  });

  it("uses the ticket's own workspace key and slug", () => {
    const ticket = makeTicket({
      id: 7,
      workspaceKey: "--home-sid-repos-other--",
      slug: "seven",
    });
    expect(fullTicketId(ticket)).toBe("--home-sid-repos-other--:seven");
  });
});

describe("ticketChipLabel", () => {
  it("returns the aidos form with the numeric id", () => {
    expect(ticketChipLabel(makeTicket({ id: 12 }))).toBe("aidos#12");
  });

  it("uses the ticket's own workspace key", () => {
    /*
     * #21: this test's NAME always said "uses the ticket's own workspace
     * key" while its assertion demanded the opposite -- a ticket in
     * `--srv-other--` had to render as `aidos#5`, i.e. the workspace key
     * IGNORED and a hardcoded label substituted. It documented the bug as
     * intended behaviour, which is why the bug survived: the label erased
     * the very distinction it appeared to draw, so a foreign ticket was
     * indistinguishable from a local one on the board's most prominent chip.
     */
    const ticket = makeTicket({ id: 5, workspaceKey: "--srv-other--" });
    expect(ticketChipLabel(ticket)).toBe("other#5");
  });

  it("drops the prefix for a ticket in the viewing workspace", () => {
    // In a LIST the prefix is identical on every row, so it is furniture.
    const ticket = makeTicket({ id: 5, workspaceKey: "--srv-mine--" });
    expect(ticketChipLabel(ticket, "--srv-mine--")).toBe("5");
  });

  it("keeps the prefix for a ticket from another workspace", () => {
    const ticket = makeTicket({ id: 5, workspaceKey: "--srv-other--" });
    expect(ticketChipLabel(ticket, "--srv-mine--")).toBe("other#5");
  });
});

describe("idColor", () => {
  it("returns the same color for the same id", () => {
    expect(idColor(WORKSPACE_KEY + ":341")).toBe(idColor(WORKSPACE_KEY + ":341"));
  });

  it("returns a css custom property from the badge palette", () => {
    expect(idColor(WORKSPACE_KEY + ":1").startsWith("var(--badge-hue-")).toBe(true);
  });

  it("spreads ids over the palette", () => {
    const colors = new Set(
      Array.from({ length: 40 }, (_, index) => idColor(WORKSPACE_KEY + ":" + index)),
    );
    expect(colors.size).toBe(8);
  });

  it("distinguishes two keys with the same last path segment", () => {
    const a = idColor("--home-sid-repos-aidos--:1");
    const b = idColor("--home-sid-repos-other-aidos--:1");
    expect(a).not.toBe(b);
  });
});

describe("kindKeyword", () => {
  it("gives every builtin kind a short token", () => {
    expect(kindKeyword("builtin:imported_state")).toBe("IMPORTED");
    expect(kindKeyword("builtin:automated_check")).toBe("CHECK");
    expect(kindKeyword("builtin:user_verified")).toBe("VERIFIED");
    // #96: the pass/fail pair reads as a verdict, not as "a pass over the
    // code". The two tokens must be distinguishable at a glance on a chip.
    expect(kindKeyword("builtin:review_pass")).toBe("ACCEPTED");
    expect(kindKeyword("builtin:review_fail")).toBe("FAILED");
  });

  it("never returns the raw kind id of a builtin kind", () => {
    expect(kindKeyword("builtin:file_allowlist")).not.toContain(":");
  });

  it("falls back to the id tail in upper case for an unknown kind", () => {
    expect(kindKeyword("team:load_test")).toBe("LOAD TEST");
    expect(kindKeyword("team:smoke-run")).toBe("SMOKE RUN");
  });

  it("keeps a bare id readable when it carries no namespace", () => {
    expect(kindKeyword("handmade")).toBe("HANDMADE");
  });
});
