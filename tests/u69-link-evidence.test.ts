/**
 * #69: the evidence/linked event pipeline. Linking one evidence row to one
 * criterion writes payload.criteria through the fold; unlinking clears it;
 * invalid criteria and unknown rows are refused. Grouping and coverage read
 * the same channel the link writes.
 */
import { describe, expect, it } from "vitest";
import { foldAidosEvents } from "../src/kernel/fold";
import { EvidenceLinkedEvent } from "../src/kernel/events";
import { createInitialState } from "../src/kernel/fold";
import type { AidosState } from "../src/kernel/fold";
import { EvidenceRow } from "../src/kernel/types";

function baseState(criteria: string, rows: EvidenceRow[]): AidosState {
  const state = createInitialState();
  state.tickets.set(1, {
    id: 1,
    title: "t",
    description: "",
    body: "",
    criteria,
    state: "in_progress",
    phase: 1,
    order: 0,
    createdAt: 0,
    updatedAt: 0,
    dependsOn: [],
  } as never);
  state.evidence.set(1, rows);
  state.lastAt.set(1, Math.max(...rows.map((row) => row.at), 0));
  return state;
}

function row(kind: string, at: number, payload: Record<string, unknown> = {}): EvidenceRow {
  return { kind, author: "user", at, payload };
}

function linkEvent(at: number, rowKind: string, criterion: string | null): EvidenceLinkedEvent {
  return {
    kind: "evidence/linked",
    version: 1,
    ticketId: 1,
    at,
    rowKind,
    criterion: criterion ?? "",
  } as EvidenceLinkedEvent;
}

describe("evidence/linked fold", () => {
  it("sets payload.criteria on the named row", () => {
    const state = baseState("runs on mobile\nships clean", [row("builtin:user_signoff", 5)]);
    const next = foldAidosEvents(state, linkEvent(5, "builtin:user_signoff", "runs on mobile"));
    const linked = next.evidence.get(1)!.find((r) => r.at === 5)!;
    expect(linked.payload.criteria).toBe("runs on mobile");
  });

  it("unlinking clears the criterion", () => {
    const state = baseState("runs on mobile", [
      row("builtin:user_signoff", 5, { criteria: "runs on mobile" }),
    ]);
    const next = foldAidosEvents(state, linkEvent(5, "builtin:user_signoff", null));
    expect(next.evidence.get(1)!.find((r) => r.at === 5)!.payload.criteria).toBe("");
  });

  it("refuses a criterion that is not on the ticket", () => {
    const state = baseState("runs on mobile", [row("builtin:user_signoff", 5)]);
    expect(() => foldAidosEvents(state, linkEvent(5, "builtin:user_signoff", "nonexistent")))
      .toThrow(/not one of the ticket's criteria/);
  });

  it("refuses an unknown row", () => {
    const state = baseState("runs on mobile", [row("builtin:user_signoff", 5)]);
    expect(() => foldAidosEvents(state, linkEvent(9, "builtin:user_signoff", "runs on mobile")))
      .toThrow(/names no live row/);
  });
});

// The #69 reviewer's blocking scenario: a row whose `at` predates later
// writes (a comment, a move, another attach) must still be linkable — the
// link REFERENCES an old row; it does not create a new timestamp. This is
// the common case: agent rows attach first, the user links them later.
describe("evidence/linked references older rows", () => {
  it("links a row older than the ticket's lastAt", () => {
    const state = baseState("runs on mobile", [row("builtin:user_signoff", 5)]);
    // A later comment advanced lastAt to 10; the row is still at 5.
    foldAidosEvents(state, {
      kind: "comment/added",
      version: 1,
      ticketId: 1,
      text: "later write",
      author: "user",
      at: 10,
    } as never);
    expect(state.lastAt.get(1)).toBe(10);
    const next = foldAidosEvents(state, linkEvent(5, "builtin:user_signoff", "runs on mobile"));
    const linked = next.evidence.get(1)!.find((r) => r.at === 5)!;
    expect(linked.payload.criteria).toBe("runs on mobile");
  });

  it("detach also accepts an older row (same identity rule)", () => {
    const state = baseState("runs on mobile", [row("builtin:user_signoff", 5)]);
    foldAidosEvents(state, {
      kind: "comment/added",
      version: 1,
      ticketId: 1,
      text: "later write",
      author: "user",
      at: 10,
    } as never);
    const next = foldAidosEvents(state, {
      kind: "evidence/detached",
      version: 1,
      ticketId: 1,
      at: 5,
      rowKind: "builtin:user_signoff",
    } as never);
    expect(next.evidence.get(1)!.some((r) => r.at === 5)).toBe(false);
  });
});
