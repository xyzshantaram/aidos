/**
 * #114: the click-through modal renders the board's real detail panel.
 *
 * WHAT THIS PINS.
 * 1. RESOLUTION (`modalTicketFor`, pure): the modal's ticket comes from the
 *    session's cached merge addressed by board key -- an own row matches by
 *    bare id, a foreign row only by its composite key, and anything absent
 *    is null (the caller keeps the thin strip peek, never another board's
 *    ticket). Evidence and comments ride the same board key the board reads.
 * 2. WIRING: the modal mounts the board's real `DetailView` (not the strip)
 *    with the merge's evidence/comments, the session as write identity, and
 *    the LARGE modal size. AidosRow owns hooks so it cannot be invoked
 *    without a renderer; like the u138 detail-panel test this pins the
 *    wiring at the source instead of pretending a grep is a render -- and
 *    says so. The live modal itself is human-verify on a rendered board.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { modalTicketFor } from "../src/client/aidos-rows";
import { setMerge, getMerge } from "../src/client/view-state";
import type { WorkspaceMerge } from "../src/client/view-state";
import type { TicketView } from "../src/kernel/projections";
import type { CommentRecord, EvidenceRow } from "../src/kernel/types";

type MergeRow = TicketView & { sourceSessionId: string; foreign: boolean };

function row(
  id: number,
  session: string,
  title: string,
  foreign: boolean,
  workspaceKey = "--ws--",
): MergeRow {
  return {
    id,
    projectId: 1,
    title,
    description: "description",
    body: "",
    criteria: "criterion",
    phase: 1,
    order: id,
    state: "open",
    dependsOn: [],
    allowlist: [],
    tags: [],
    confidenceScore: 1,
    gateFraction: 0.5,
    gatePresent: 1,
    gateTotal: 2,
    updatedAt: 1000 + id,
    workspaceKey,
    slug: "ticket-" + id,
    sourceSessionId: session,
    foreign,
  };
}

function ev(id: number): EvidenceRow {
  return {
    at: 2000 + id,
    kind: "builtin:agent_report",
    author: "agent",
    text: "note " + id,
  } as unknown as EvidenceRow;
}

function comment(id: number): CommentRecord {
  return { at: 3000 + id, author: "user", body: "comment " + id } as unknown as CommentRecord;
}

function merge(
  session: string,
  rows: MergeRow[],
  evidence: Record<string, EvidenceRow[]> = {},
  comments: Record<string, CommentRecord[]> = {},
): WorkspaceMerge {
  return { tickets: rows, evidence, comments };
}

describe("#114 modalTicketFor resolves the modal ticket by board key", () => {
  it("null merge, null or empty id resolve to null, never a guess", () => {
    const m = merge("a", [row(7, "a", "Seven", false)]);
    expect(modalTicketFor(null, "7")).toBeNull();
    expect(modalTicketFor(m, null)).toBeNull();
    expect(modalTicketFor(m, undefined)).toBeNull();
    expect(modalTicketFor(m, "")).toBeNull();
  });

  it("an own row matches by bare id and carries its evidence and comments", () => {
    const m = merge("a", [row(7, "a", "Seven", false)], { "7": [ev(1), ev(2)] }, { "7": [comment(1)] });
    const found = modalTicketFor(m, "7");
    expect(found?.ticket.title).toBe("Seven");
    expect(found?.boardKey).toBe("7");
    expect(found?.evidence).toHaveLength(2);
    expect(found?.comments).toHaveLength(1);
  });

  it("a foreign row matches only by composite key, never by bare id", () => {
    const m = merge("a", [row(39, "b", "Thursday thirty-nine", true)]);
    expect(modalTicketFor(m, "39")).toBeNull();
    const found = modalTicketFor(m, "b:39");
    expect(found?.ticket.title).toBe("Thursday thirty-nine");
    expect(found?.boardKey).toBe("b:39");
  });

  it("two boards' same id resolve per session, with per-board evidence", () => {
    const aOwn = row(39, "a", "Aidos thirty-nine", false);
    const bOwn = row(39, "b", "Thursday thirty-nine", false);
    const mergeA = merge("a", [aOwn], { "39": [ev(1)] });
    const mergeB = merge("b", [bOwn], { "39": [ev(2)] });
    const fromA = modalTicketFor(mergeA, "39");
    const fromB = modalTicketFor(mergeB, "39");
    expect(fromA?.ticket.title).toBe("Aidos thirty-nine");
    expect(fromB?.ticket.title).toBe("Thursday thirty-nine");
    // Same board key, different merges: each session reads its OWN rows.
    expect((fromA?.evidence[0] as unknown as { text: string }).text).toBe("note 1");
    expect((fromB?.evidence[0] as unknown as { text: string }).text).toBe("note 2");
  });

  it("a ticket absent from the merge is null, so the caller keeps the thin peek", () => {
    const m = merge("a", [row(7, "a", "Seven", false)]);
    expect(modalTicketFor(m, "8")).toBeNull();
    expect(modalTicketFor(m, "b:7")).toBeNull();
  });

  it("ticketsByKey is first-write-wins like the board builds it", () => {
    const own = row(7, "a", "Own seven", false);
    const foreign = { ...row(7, "b", "Foreign seven", true) };
    const m = merge("a", [own, foreign]);
    const found = modalTicketFor(m, "7");
    // Bare id resolves to the OWN row: first write wins.
    expect(found?.ticketsByKey.get("7")?.title).toBe("Own seven");
    expect(found?.ticketsByKey.get("b:7")?.title).toBe("Foreign seven");
  });

  it("reads through the module merge store end to end", () => {
    setMerge("sess-114", merge("sess-114", [row(9, "sess-114", "Nine", false)], { "9": [ev(3)] }));
    const found = modalTicketFor(getMerge("sess-114"), "9");
    expect(found?.ticket.title).toBe("Nine");
    expect(found?.evidence).toHaveLength(1);
  });
});

describe("#114 the modal mounts the real DetailView off the merge", () => {
  const source = readFileSync(new URL("../src/client/aidos-rows.tsx", import.meta.url), "utf8");

  it("the click-through branch renders DetailView, not the strip, with merge data", () => {
    expect(source).toMatch(/<DetailView/);
    expect(source).toMatch(/ticketIdKey=\{modalTicket\.boardKey\}/);
    expect(source).toMatch(/evidence=\{modalTicket\.evidence\}/);
    expect(source).toMatch(/comments=\{modalTicket\.comments\}/);
    expect(source).toMatch(/ticketsByKey=\{modalTicket\.ticketsByKey\}/);
  });

  it("the session doubles as the write identity exactly as on the board", () => {
    expect(source).toMatch(/agentId=\{props\.sessionId\}/);
  });

  it("the full-detail modal takes the large size", () => {
    expect(source).toMatch(/wide=\{modalTicket !== null\}/);
  });

  it("a dependency-card jump writes the selection and closes the modal", () => {
    expect(source).toMatch(/onJump=\{\(key\) => \{\s+setSelection\(props\.sessionId as string, key\);\s+setPeekOpen\(false\);\s+\}\}/);
  });
});
