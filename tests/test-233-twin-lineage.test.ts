/**
 * #233 follow-up (review FAIL on 9a8cc92): the twin rule's createdAt-only
 * gate hides genuinely distinct tickets, lets a twin win re-duplicate the
 * id, and breaks ties by session-id luck.
 *
 * PROVENANCE (measured on a read-only copy of the live store, 2026-09-18):
 * all 82 real pairs share a byte-identical createdAt (81 also share
 * updatedAt), ZERO chains exist (no `*-2-*` slug), every shared-createdAt
 * group is exactly one N/N+82 pair, and all 82 twins come from a DIFFERENT
 * origin session than their base (base session-21aca9bc-… vs twin
 * session-e39817a8-…, 82/82 differ, 0/82 same). So a real twin and its base
 * always differ in origin session, while tickets a user creates in one
 * instant share one session. The lineage gate below admits the former and
 * rejects the latter: same instant + same session = DECLINE, exactly as
 * `_reconstructTicketMap` (store.ts) declines on same-slug-plus-same-
 * instant ambiguity rather than guessing.
 */

import { describe, expect, it } from "vitest";

import { dedupeBoardRows } from "../src/host/aidos-core";
import type { BoardTicketView } from "../src/host/aidos-core";

const WS = "--home-sid-repos-aidos--";
const T = 1789000000.5;

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

describe("#233 review defect 1: same-session same-instant pairs are distinct tickets, never twins", () => {
  it("P1a: phase (open) + phase-2 (in_progress WITH an allowlist), one instant, one session — both stay", () => {
    // The review's probe: pre-fix this collapses to ONE row and the ticket
    // being actively worked vanishes from the board.
    const out = dedupeBoardRows([
      row({
        id: 5,
        slug: "phase",
        title: "Phase one work",
        state: "open",
        createdAt: T,
        updatedAt: T + 10,
        sourceSessionId: "session-live",
      }),
      row({
        id: 6,
        slug: "phase-2",
        title: "Phase two work",
        state: "in_progress",
        allowlist: ["src/a.ts"],
        createdAt: T,
        updatedAt: T + 20,
        sourceSessionId: "session-live",
      }),
    ]);
    expect(out.rows).toHaveLength(2);
    const phase2 = out.rows.find((r) => r.slug === "phase-2")!;
    expect(phase2.state).toBe("in_progress");
    expect(phase2.allowlist).toEqual(["src/a.ts"]);
  });

  it("P1c: twin newer — the BASE still survives when both come from one session", () => {
    // Same shape with the recency reversed: pre-fix the base vanishes.
    const out = dedupeBoardRows([
      row({
        id: 5,
        slug: "phase",
        title: "Phase one work",
        state: "open",
        createdAt: T,
        updatedAt: T + 10,
        sourceSessionId: "session-live",
      }),
      row({
        id: 6,
        slug: "phase-2",
        title: "Phase two work",
        state: "open",
        createdAt: T,
        updatedAt: T + 30,
        sourceSessionId: "session-live",
      }),
    ]);
    expect(out.rows).toHaveLength(2);
    expect(out.rows.find((r) => r.slug === "phase")!.state).toBe("open");
  });

  it("P5: three distinct tickets s / s-2 / s-2-3 born in one instant, one session — all three stay", () => {
    // Pre-fix the chain rule collapses all three to one row.
    const out = dedupeBoardRows([
      row({ id: 1, slug: "s", title: "s one", createdAt: T, updatedAt: T + 1, sourceSessionId: "session-live" }),
      row({ id: 2, slug: "s-2", title: "s two", createdAt: T, updatedAt: T + 2, sourceSessionId: "session-live" }),
      row({ id: 3, slug: "s-2-3", title: "s three", createdAt: T, updatedAt: T + 3, sourceSessionId: "session-live" }),
    ]);
    expect(out.rows).toHaveLength(3);
  });
});

describe("#233 review defect 3: a tied twin group prefers the base BY RULE, not by session-id luck", () => {
  it("base wins a tie even when lexical session order would elect the twin", () => {
    // Sessions arranged so the old rule picks the twin: 'aaa' < 'zzz'.
    // Lineage still admits the merge (different origin sessions — the real
    // backfill shape), but the winner must be the base, by rule.
    const out = dedupeBoardRows([
      row({
        id: 10,
        slug: "tied",
        title: "base",
        createdAt: T,
        updatedAt: T + 100,
        sourceSessionId: "session-zzz-base",
      }),
      row({
        id: 92,
        slug: "tied-2",
        title: "twin",
        createdAt: T,
        updatedAt: T + 100,
        sourceSessionId: "session-aaa-twin",
      }),
    ]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].slug).toBe("tied");
    expect(out.rows[0].sourceSessionId).toBe("session-zzz-base");
  });
});

describe("#233 review defect 2: a twin-group winner displays under the BASE id", () => {
  it("a winning twin takes the base id, so no id carries two rows and the board agrees with get_ticket", () => {
    // Base g (id 7) + twin g-2 NEWEST (id 84) + an unrelated live row that
    // legitimately holds id 84. Pre-fix the twin keeps id 84 and the board
    // shows TWO rows with id 84, disagreeing with get_ticket(84).
    const out = dedupeBoardRows([
      row({
        id: 7,
        slug: "g",
        title: "gee",
        state: "open",
        createdAt: T,
        updatedAt: T + 10,
        sourceSessionId: "session-first",
      }),
      row({
        id: 84,
        slug: "g-2",
        title: "gee",
        state: "in_progress",
        createdAt: T,
        updatedAt: T + 100,
        sourceSessionId: "session-second",
      }),
      row({
        id: 84,
        slug: "unrelated-live-ticket",
        title: "Something else entirely",
        state: "open",
        createdAt: T + 5000,
        updatedAt: T + 50,
        sourceSessionId: "session-live",
      }),
    ]);
    expect(out.rows).toHaveLength(2);
    // One id means one ticket: ids are 7 and 84, never 84 twice.
    expect(out.rows.map((r) => r.id).sort((a, b) => a - b)).toEqual([7, 84]);
    // The group winner carries the newest CONTENT under the base ADDRESS.
    const g = out.rows.find((r) => r.slug === "g")!;
    expect(g.id).toBe(7);
    expect(g.state).toBe("in_progress");
    expect(g.sourceSessionId).toBe("session-second");
    // And id 84 names the live ticket get_ticket(84) resolves to.
    expect(out.rows.find((r) => r.id === 84)!.slug).toBe("unrelated-live-ticket");
  });
});

describe("#233 lineage gate admits the real backfill shape", () => {
  it("different origin sessions + shared createdAt still reconciles, base winning the tie by rule", () => {
    // The measured production shape (store ids 2/84 origins): the merge
    // must still collapse, with the base surviving.
    const out = dedupeBoardRows([
      row({
        id: 2,
        slug: "globally-distinct-ticket-ids",
        title: "Globally distinct ticket ids",
        state: "done",
        createdAt: 1788196851.78,
        updatedAt: 1788197526.321,
        sourceSessionId: "session-21aca9bc-first",
      }),
      row({
        id: 84,
        slug: "globally-distinct-ticket-ids-2",
        title: "Globally distinct ticket ids",
        state: "done",
        createdAt: 1788196851.78,
        updatedAt: 1788197526.321,
        sourceSessionId: "session-e39817a8-second",
      }),
    ]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].slug).toBe("globally-distinct-ticket-ids");
    expect(out.rows[0].id).toBe(2);
  });
});
