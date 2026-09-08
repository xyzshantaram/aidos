/**
 * #175: the agent can read board changes it missed.
 *
 * The digest is DELIVERED, not stored — it rides `agent.steer`, so it shares
 * the conversation's fate: compaction drops it, a long turn buries it, and
 * an agent mid-step when four signoffs land may never see them.
 *
 * The property these tests protect is the one that made the design choice:
 * this is FOLDED FROM THE DURABLE LOG, not buffered. A buffer would die on
 * restart and drift from the board the moment a write bypassed the digest
 * path. A fold reads the same events the board itself is folded from, so it
 * cannot disagree with the board and it cannot be lost — including for
 * changes made before this process existed, which is what the criterion
 * "answers correctly for changes made before the service was constructed"
 * means and what the last test here drives.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { recentBoardChanges } from "../src/kernel/recent-changes";
import type { TicketSnapshot } from "../src/kernel/types";

const ticket = (id: number, over: Partial<TicketSnapshot> = {}): TicketSnapshot =>
  ({
    id,
    projectId: 1,
    title: "ticket " + id,
    description: "",
    body: "",
    criteria: "",
    phase: 1,
    order: 1,
    state: "open",
    allowlist: [],
    dependsOn: [],
    slug: "t" + id,
    updatedAt: 0,
    ...over,
  }) as TicketSnapshot;

const moved = (id: number, at: number, state: string) => ({
  kind: "ticket/change",
  version: 1,
  operation: "move",
  ticket: ticket(id, { state: state as TicketSnapshot["state"] }),
  at,
});

const attached = (id: number, at: number, kind: string, author = "user") => ({
  kind: "evidence/attached",
  version: 1,
  ticketId: id,
  row: { kind, author, at, payload: {} },
});

describe("#175 recent changes are folded from the log", () => {
  const log = [
    { kind: "ticket/change", version: 1, operation: "create", ticket: ticket(1), at: 10 },
    attached(1, 20, "builtin:user_signoff"),
    moved(1, 30, "in_progress"),
    attached(2, 40, "builtin:review_pass", "agent"),
  ];

  it("returns changes NEWEST FIRST, naming ticket, change and time", () => {
    const out = recentBoardChanges(log);
    expect(out.changes.map((c) => c.at)).toEqual([40, 30, 20, 10]);
    expect(out.changes[0]?.ticketId).toBe(2);
    expect(out.changes[0]?.change).toContain("review_pass");
    expect(out.changes[1]?.change).toContain("in_progress");
  });

  it("bounds the answer and SAYS what it omitted, rather than trailing off", () => {
    // #92's rule: a bounded read that hides its own truncation is how an
    // agent concludes it has seen everything when it has not.
    const out = recentBoardChanges(log, { limit: 2 });
    expect(out.changes).toHaveLength(2);
    expect(out.omitted).toBe(2);
  });

  it("filters by time and by ticket without changing the ordering", () => {
    expect(recentBoardChanges(log, { since: 25 }).changes.map((c) => c.at)).toEqual([40, 30]);
    expect(recentBoardChanges(log, { ticketId: 1 }).changes.every((c) => c.ticketId === 1)).toBe(
      true,
    );
  });

  it("ignores log entries that are not board changes", () => {
    /*
     * A refusal row, a plan write, a phase edit: real events that are not
     * "something happened to a ticket you care about". Including them would
     * bury the four lines that matter under the log's bookkeeping.
     */
    const noisy = [...log, { kind: "aidos/refusal", version: 1, at: 50 }, { nonsense: true }];
    expect(recentBoardChanges(noisy).changes).toHaveLength(4);
  });

  it("answers for events written before this process existed", () => {
    /*
     * THE test for the design decision. These events were never seen by any
     * digest in this process — no buffer could hold them — and the fold
     * returns them because the log is durable.
     */
    const fromDisk = [attached(7, 1, "builtin:user_verified"), moved(7, 2, "awaiting_verification")];
    const out = recentBoardChanges(fromDisk);
    expect(out.changes).toHaveLength(2);
    expect(out.changes[0]?.change).toContain("awaiting_verification");
  });
});

describe("#175 the tool states its own boundary", () => {
  const core = readFileSync(
    new URL("../src/host/aidos-core.ts", import.meta.url).pathname,
    "utf8",
  );
  const tools = readFileSync(
    new URL("../src/tools/aidos-tools.ts", import.meta.url).pathname,
    "utf8",
  );

  it("says out loud that non-board notices are NOT recoverable", () => {
    /*
     * The criterion, and the honesty that makes the tool usable: worktree
     * reports and refused approvals are digest lines with no log row, so no
     * fold can return them. An agent that believes it has seen everything is
     * worse off than one told what it is missing.
     */
    expect(core).toContain("covers:");
    expect(core).toContain("NOT recoverable here");
    expect(tools).toContain("cannot be recovered here");
  });

  it("carries each row's next step, so guidance is recovered with the fact", () => {
    expect(core).toContain("this.nextStepFor(reader, change.ticketId)");
  });

  it("resolves against the DISPATCHING board, like every other read", () => {
    // #157: a subagent's reads resolve against the board it was dispatched
    // against, not its own empty session.
    const body = core.slice(core.indexOf("recentChanges(\n    agent: Agent"));
    expect(body.slice(0, 400)).toContain("this._boardAgent(agent)");
  });
});
