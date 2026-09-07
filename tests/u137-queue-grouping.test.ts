/**
 * #137 (2026-09-07): the queue groups by ticket state, in workdown order.
 *
 * **The user's design, and the reason for the order:** open first (sign off
 * unstarted work), then in-progress (approve the files that work needs),
 * then awaiting-verification (verify what is finished). Read top to bottom,
 * the queue is the order you would actually work it — not a flat list
 * sorted by something incidental.
 *
 * Grouping also retires the parenthesised state on every strip: once the
 * heading says "Sign off", repeating "(Open)" on each row underneath is
 * noise, and it costs the title horizontal space that #93 fought to give it.
 *
 * The grouping is a pure function so the RULES are testable — an ordering
 * asserted by reading JSX is an ordering nobody can check.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  QUEUE_GROUP_ORDER,
  groupQueueByState,
  humanQueue,
} from "../src/client/human-queue";
import type { QueueEntry } from "../src/client/human-queue";
import { makeTicket } from "./u2c-helpers";

const panel = readFileSync(
  new URL("../src/client/queue-panel.tsx", import.meta.url),
  "utf8",
);
const strip = readFileSync(
  new URL("../src/client/ticket-strip.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");

/** One entry per state, built through the real queue so the shape is real. */
function entriesAcrossStates(): QueueEntry[] {
  const tickets = [
    makeTicket({ id: 1, state: "awaiting_verification" }),
    makeTicket({ id: 2, state: "open" }),
    makeTicket({ id: 3, state: "in_progress" }),
  ];
  // in_progress tickets produce no derived ask, so that group is seeded
  // with an approval card — which is what actually lands there in life.
  const approval = {
    id: "req-1",
    ticketId: 3,
    kind: "allowlist",
    prompt: "may I write these paths",
    payload: { paths: ["src/client"] },
    at: 0,
  };
  return humanQueue(tickets, () => [], [], "suggested", [approval as never]);
}

describe("#137 the queue groups in workdown order", () => {
  it("orders the groups sign off, then approve, then verify", () => {
    const groups = groupQueueByState(entriesAcrossStates());
    expect(groups.map((group) => group.state)).toEqual([
      "open",
      "in_progress",
      "awaiting_verification",
    ]);
  });

  it("labels the groups by the WORK, not by the state machine's words", () => {
    // "Sign off" tells the human what to do; "open" tells them what the
    // ticket is. The queue is a list of actions.
    const groups = groupQueueByState(entriesAcrossStates());
    expect(groups.map((group) => group.label)).toEqual(["Sign off", "Approve", "Verify"]);
  });

  it("puts every entry in exactly one group, losing none", () => {
    const entries = entriesAcrossStates();
    const grouped = groupQueueByState(entries).flatMap((group) => group.entries);
    expect(grouped).toHaveLength(entries.length);
    expect(new Set(grouped.map((entry) => entry.boardKey)).size).toBe(
      new Set(entries.map((entry) => entry.boardKey)).size,
    );
  });

  it("emits NO heading for a state with nothing in it", () => {
    // An empty section is a promise of work that is not there.
    const groups = groupQueueByState(
      humanQueue([makeTicket({ id: 1, state: "open" })], () => []),
    );
    expect(groups.map((group) => group.state)).toEqual(["open"]);
  });

  it("returns nothing at all for an empty queue", () => {
    expect(groupQueueByState([])).toEqual([]);
  });

  it("keeps an unexpected state in a trailing group rather than dropping it", () => {
    /*
     * A queue row that vanishes because its state was not in the table is
     * worse than one shown under an odd heading: the human never learns it
     * existed. Built by hand because the derived queue cannot produce a
     * done ticket with an ask.
     */
    const rogue = {
      ticket: makeTicket({ id: 9, state: "done" }),
      boardKey: "9",
      actionId: "verify",
      label: "Verify",
      prompt: "x",
    } as unknown as QueueEntry;
    const groups = groupQueueByState([rogue]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.state).toBe("other");
    expect(groups[0]?.entries).toHaveLength(1);
  });

  it("re-groups live when a ticket moves state", () => {
    // The criterion's "a nomination that outlives its group re-groups on the
    // next render": the function is pure over the entries it is given, so a
    // moved ticket lands in its new group with no bookkeeping.
    const before = groupQueueByState(humanQueue([makeTicket({ id: 1, state: "open" })], () => []));
    expect(before[0]?.state).toBe("open");
    const after = groupQueueByState(
      humanQueue([makeTicket({ id: 1, state: "awaiting_verification" })], () => []),
    );
    expect(after[0]?.state).toBe("awaiting_verification");
  });

  it("the declared order is the one the groups follow", () => {
    // Pins the constant to the behaviour, so reordering the table without
    // meaning to is a failing test rather than a silent UI change.
    expect([...QUEUE_GROUP_ORDER]).toEqual(["open", "in_progress", "awaiting_verification"]);
  });
});

describe("#137 the strips stop repeating what the heading says", () => {
  it("the queue renders groups with headings, not one flat list", () => {
    expect(panel).toContain("groupQueueByState(visible)");
    expect(panel).toContain("aidos-queue-group-heading");
  });

  it("the queue's strips suppress the state", () => {
    expect(panel).toContain("showState={false}");
  });

  it("every OTHER surface keeps the state — the prop is opt-out, not opt-in", () => {
    /*
     * The detail panel, the approval runner and the peek all render strips
     * without a heading above them, so the state must still show there. A
     * default of false would have silently stripped it from three surfaces
     * nobody asked to change.
     */
    expect(strip).toContain("props.showState === false ? null : (");
  });

  it("the heading is styled quieter than the rows it labels", () => {
    const rule = css.slice(css.indexOf(".aidos-queue-group-heading"));
    const block = rule.slice(0, rule.indexOf("}"));
    expect(block).toContain("font-size: 11px");
    expect(block).toContain("var(--text-secondary)");
  });
});
