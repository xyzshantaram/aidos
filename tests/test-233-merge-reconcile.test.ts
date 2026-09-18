/**
 * #233: the workspace merge shows 82 ids twice — a suffixed-slug store copy
 * next to the live ticket that happens to hold the same number.
 *
 * PROVENANCE (measured on the live store copy, 2026-09-18 — see the ticket):
 * the backfill imported session-21aca9bc's 82 tickets as store ids 1-82
 * (bare slugs) and session-e39817a8's fork-copies of the SAME 82 tickets as
 * store ids 83-164 with `-2`-suffixed slugs (slug-collision rename) and
 * renumbered ids. All 82 pairs share an identical createdAt; 81 share an
 * identical updatedAt, and the 82nd (68/150) is the fork moved one step
 * further (open -> in_progress). The live session's own fold-counter ids
 * 83-164 are unrelated tickets, so the board shows two rows per id with
 * different titles — and search/the browser can attribute one ticket's
 * state to another (already happened: #95 misread as a duplicate of #13).
 *
 * SCOPE (a) RECONCILE: a suffixed-slug row whose base identity is present
 * in the merge with an EQUAL createdAt is a copy of that ticket (the same
 * rule the #222 migration export proved on this exact data), so it joins
 * the base group — newest updatedAt wins, losers ride as supersededCopies.
 * Anything the rule cannot prove a copy (no base, createdAt differs,
 * createdAt absent) stays visible, exactly as today: hiding a real ticket
 * is worse than showing two.
 */

import { describe, expect, it } from "vitest";

import { dedupeBoardRows } from "../src/host/aidos-core";
import type { BoardTicketView } from "../src/host/aidos-core";

const WS = "--home-sid-repos-aidos--";

// Measured values from the live store (store ids 2/84 and 68/150) and the
// live board (get_ticket(68), get_ticket(84)). createdAt equality is the
// identity proof; the numbers below are the production readings.
const C2 = 1788196851.78;
const C68 = 1788259295.299;

function row(
  over: Partial<BoardTicketView> & {
    slug: string;
    updatedAt: number;
    sourceSessionId: string;
    createdAt?: number;
  },
): BoardTicketView {
  return {
    id: 1,
    projectId: 1,
    title: "T",
    description: "",
    body: "",
    criteria: "",
    state: "open",
    phase: 1,
    order: 1,
    dependsOn: [],
    allowlist: [],
    confidenceScore: 0,
    gateFraction: null,
    gatePresent: null,
    gateTotal: null,
    workspaceKey: WS,
    foreign: false,
    ...over,
  } as BoardTicketView;
}

describe("#233 regression: the measured board shape", () => {
  it("one id, two titles, one a suffixed-slug store copy — collapses to one row per ticket", () => {
    // id 84 on the live board: the live ticket ("Agent board tools ...",
    // bare slug) plus store id 84, e39817a8's copy of ticket 2
    // ("Globally distinct ticket ids", slug -2, createdAt == store #2's).
    const out = dedupeBoardRows([
      row({
        id: 84,
        slug: "agent-board-tools-resolve-against-the-workspace-not-just-the-own-session",
        title: "Agent board tools resolve against the workspace, not just the own session",
        state: "in_progress",
        createdAt: 1788512049.999,
        updatedAt: 1788862820.639,
        sourceSessionId: "session-a0872a7d-live",
      }),
      row({
        id: 2,
        slug: "globally-distinct-ticket-ids",
        title: "Globally distinct ticket ids",
        state: "done",
        createdAt: C2,
        updatedAt: 1788197526.321,
        sourceSessionId: "session-21aca9bc-first",
      }),
      row({
        id: 84,
        slug: "globally-distinct-ticket-ids-2",
        title: "Globally distinct ticket ids",
        state: "done",
        createdAt: C2,
        updatedAt: 1788197526.321,
        sourceSessionId: "session-e39817a8-second",
      }),
    ]);
    // Two tickets in, two rows out — and id 84 names the live ticket only.
    expect(out.rows).toHaveLength(2);
    const id84 = out.rows.filter((r) => r.id === 84);
    expect(id84).toHaveLength(1);
    expect(id84[0].title).toContain("Agent board tools");
    // The shadow copy rides on the ticket it copies, visibly.
    const base = out.rows.find((r) => r.slug === "globally-distinct-ticket-ids")!;
    expect(base.supersededCopies?.map((c) => c.sessionId)).toContain("session-e39817a8-second");
  });

  it("the nontrivial pair (68/150): the fork moved further, the live copy is newest — live wins, twin rides along", () => {
    const out = dedupeBoardRows([
      row({
        id: 68,
        slug: "evidence-ux-collapsible-raw-json-tailored-surfaces-per-kind-one-step-git-commit-evidence",
        title: "Evidence UX",
        state: "in_progress",
        createdAt: C68,
        updatedAt: 1788435956.886,
        sourceSessionId: "session-a0872a7d-live",
      }),
      row({
        id: 68,
        slug: "evidence-ux-collapsible-raw-json-tailored-surfaces-per-kind-one-step-git-commit-evidence",
        title: "Evidence UX",
        state: "open",
        createdAt: C68,
        updatedAt: 1788261011.35,
        sourceSessionId: "session-21aca9bc-first",
      }),
      row({
        id: 150,
        slug:
          "evidence-ux-collapsible-raw-json-tailored-surfaces-per-kind-one-step-git-commit-evidence-2",
        title: "Evidence UX",
        state: "in_progress",
        createdAt: C68,
        updatedAt: 1788435566.145,
        sourceSessionId: "session-e39817a8-second",
      }),
    ]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].sourceSessionId).toBe("session-a0872a7d-live");
    expect(out.rows[0].state).toBe("in_progress");
    expect(out.rows[0].supersededCopies).toHaveLength(2);
  });

  it("a twin newer than every base copy wins the group — newest-wins, same as #83 and the migration", () => {
    // No live copy: the fork's snapshot moved further than the import it
    // was renamed from. The ticket must still show once, with the newer
    // state — never vanish, never duplicate.
    const out = dedupeBoardRows([
      row({
        id: 68,
        slug: "evidence-ux",
        title: "Evidence UX",
        state: "open",
        createdAt: C68,
        updatedAt: 1788261011.35,
        sourceSessionId: "session-21aca9bc-first",
      }),
      row({
        id: 150,
        slug: "evidence-ux-2",
        title: "Evidence UX",
        state: "in_progress",
        createdAt: C68,
        updatedAt: 1788435566.145,
        sourceSessionId: "session-e39817a8-second",
      }),
    ]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].state).toBe("in_progress");
    expect(out.rows[0].sourceSessionId).toBe("session-e39817a8-second");
  });
});

describe("#233 never hide a real ticket: legitimate pairs are never collapsed", () => {
  it("same stem, DIFFERENT createdAt — two distinct tickets sharing a stem both stay", () => {
    // The migration's nearDuplicate case: a genuinely different ticket that
    // happens to carry a suffixed slug. createdAt differs, so no proof of
    // copy — both rows stay visible, today's behaviour.
    const out = dedupeBoardRows([
      row({
        id: 84,
        slug: "agent-board-tools",
        title: "Agent board tools",
        createdAt: 1000,
        updatedAt: 2000,
        sourceSessionId: "live",
      }),
      row({
        id: 2,
        slug: "globally-distinct-ticket-ids",
        title: "Globally distinct ticket ids",
        createdAt: C2,
        updatedAt: 1500,
        sourceSessionId: "s-first",
      }),
      row({
        id: 84,
        slug: "globally-distinct-ticket-ids-2",
        title: "A different ticket that happens to share the stem",
        createdAt: 9999,
        updatedAt: 2500,
        sourceSessionId: "s-second",
      }),
    ]);
    expect(out.rows).toHaveLength(3);
    expect(out.rows.filter((r) => r.id === 84)).toHaveLength(2);
  });

  it("suffixed slug with NO base in the merge — a legitimate ticket, kept", () => {
    const out = dedupeBoardRows([
      row({
        id: 7,
        slug: "something-2",
        title: "Legit ticket that happens to end in -2",
        createdAt: 1234,
        updatedAt: 2000,
        sourceSessionId: "live",
      }),
    ]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].supersededCopies).toBeUndefined();
  });

  it("a non-numeric tail is not a twin suffix", () => {
    const out = dedupeBoardRows([
      row({ id: 1, slug: "thing", title: "thing", createdAt: 100, updatedAt: 100, sourceSessionId: "s1" }),
      row({
        id: 2,
        slug: "thing-draft",
        title: "thing draft",
        createdAt: 100,
        updatedAt: 200,
        sourceSessionId: "s2",
      }),
    ]);
    expect(out.rows).toHaveLength(2);
  });

  it("missing createdAt never proves a copy — rows without the field never twin-merge", () => {
    // The pre-#233 row shape (and every u83 fixture) carries no createdAt:
    // undefined === undefined must NOT read as proof. Both stay.
    const out = dedupeBoardRows([
      row({ id: 1, slug: "a", title: "a", updatedAt: 100, sourceSessionId: "s1" }),
      row({ id: 9, slug: "a-2", title: "a copy?", updatedAt: 200, sourceSessionId: "s2" }),
    ]);
    expect(out.rows).toHaveLength(2);
  });

  it("the same slug stem in another workspace is another ticket", () => {
    const out = dedupeBoardRows([
      row({
        id: 1,
        slug: "a",
        title: "a",
        createdAt: 100,
        updatedAt: 100,
        sourceSessionId: "s1",
      }),
      row({
        id: 1,
        slug: "a-2",
        title: "a",
        createdAt: 100,
        updatedAt: 200,
        sourceSessionId: "s2",
        workspaceKey: "--srv-other--",
      }),
    ]);
    expect(out.rows).toHaveLength(2);
  });

  it("twin chains resolve to the surviving root", () => {
    // S-3 whose base S-2 is itself a twin of S: all one ticket.
    const out = dedupeBoardRows([
      row({ id: 1, slug: "s", title: "s", createdAt: 50, updatedAt: 100, sourceSessionId: "s1" }),
      row({ id: 2, slug: "s-2", title: "s", createdAt: 50, updatedAt: 200, sourceSessionId: "s2" }),
      row({ id: 3, slug: "s-2-3", title: "s", createdAt: 50, updatedAt: 150, sourceSessionId: "s3" }),
    ]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].sourceSessionId).toBe("s2");
    expect(out.rows[0].supersededCopies).toHaveLength(2);
  });
});

describe("#233 the merge stays observable", () => {
  it("reports name the absorbed twin slug, so the log tells twin-merge from fork-merge", () => {
    const out = dedupeBoardRows([
      row({ id: 1, slug: "a", title: "a", createdAt: 10, updatedAt: 100, sourceSessionId: "s1" }),
      row({ id: 9, slug: "a-2", title: "a", createdAt: 10, updatedAt: 50, sourceSessionId: "s2" }),
    ]);
    expect(out.reports).toHaveLength(1);
    expect(out.reports[0].identity).toBe(WS + ":a");
    expect(out.reports[0].twinSlugs).toContain(WS + ":a-2");
  });

  it("plain fork-merges report no twins", () => {
    const out = dedupeBoardRows([
      row({ id: 1, slug: "a", title: "a", createdAt: 10, updatedAt: 100, sourceSessionId: "s1" }),
      row({ id: 1, slug: "a", title: "a", createdAt: 10, updatedAt: 50, sourceSessionId: "s2" }),
    ]);
    expect(out.reports).toHaveLength(1);
    expect(out.reports[0].twinSlugs ?? []).toHaveLength(0);
  });
});
