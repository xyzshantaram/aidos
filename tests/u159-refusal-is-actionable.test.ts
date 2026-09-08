/**
 * #159 (2026-09-08): the write refusal named a remedy the reader could not
 * perform, on a ticket that was not theirs.
 *
 * The message read:
 *
 *   write to <path> is outside the allowlist of in-progress ticket 77;
 *   extend that ticket's allowlist to cover this path
 *
 * Three faults at once, and a subagent hit all three:
 *
 *  1. The remedy was IMPOSSIBLE for that reader. request_allowlist refuses
 *     subagents and approvals auto-reject in a subagent session, so the
 *     message named the one action it definitively could not take, and
 *     never named the one it should (report the path and stop).
 *  2. The ticket was WRONG — `inProgress[0]`, the first row of the board,
 *     unrelated to the work. Obeying it literally would have widened an
 *     UNRELATED ticket's write scope.
 *  3. It arrived mid-task, after the reader had read, planned and started.
 *
 * A refusal that misdirects is worse than one that only says no, because it
 * is specific enough to be obeyed confidently. These tests pin the rule
 * that replaced it: address the remedy to the actor who can perform it, and
 * never name a ticket unless it genuinely governs the path.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { writeBoundaryReason } from "../src/tools/allowlist";
import { asContext, createHarness, type FakeAgent, type Harness } from "./b1-harness";

function riggedHarness(): Harness {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

let childSeq = 0;
function childOf(harness: Harness, parent: FakeAgent): FakeAgent {
  const child = harness.makeAgent({ depth: 1, id: `session-refusal-${++childSeq}` });
  const header = child.session.header as { parentSession?: string; origin?: string };
  header.parentSession = parent.session.id;
  header.origin = "subagent";
  return child;
}

let frontSeq = 0;
function front(harness: Harness, paths: string[]): number {
  const agent = harness.asAgent();
  const ticket = harness.service.setTicket(agent, { title: `Front ${++frontSeq}` });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:user_signoff");
  harness.service.agentMoveTicket(agent, { ticketId: ticket.id, to: "in_progress" });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:file_allowlist", { paths });
  harness.service.userSetTicket(agent, { ticketId: ticket.id, allowlist: paths });
  return ticket.id;
}

/**
 * A refused write outside every allowlist, as seen by one actor.
 *
 * The path is OUTSIDE the workspace on purpose. A subagent writing INSIDE
 * the workspace is refused earlier, by #101's shared-tree rule, which is
 * its own message with its own reasons — so a path under cwd would test
 * that rule instead of this one. Outside the workspace (and outside the
 * /tmp/dsh exemption) is where the union refusal actually speaks to a
 * subagent.
 */
function refusalFor(harness: Harness, agent: FakeAgent | ReturnType<Harness["asAgent"]>): string {
  const reason = writeBoundaryReason(
    asContext(harness.ctx),
    agent as never,
    "/home/elsewhere/not-allowed.md",
  );
  expect(reason, "the write must be refused for this test to mean anything").toBeDefined();
  return reason as string;
}

describe("#159 a subagent is not told to do the impossible", () => {
  it("never tells a subagent to extend an allowlist", () => {
    // The headline defect. request_allowlist refuses subagents outright, so
    // this instruction could only ever waste the reader's remaining turns.
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const message = refusalFor(harness, childOf(harness, harness.agent));
    expect(message).not.toMatch(/extend .*allowlist/i);
    expect(message).toMatch(/cannot widen an allowlist/i);
  });

  it("names no ticket id to a subagent", () => {
    /*
     * A number it cannot act on is worse than none: it invites the child to
     * try anyway, or to report the WRONG ticket to the orchestrator.
     */
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    front(harness, ["src/host"]);
    const message = refusalFor(harness, childOf(harness, harness.agent));
    expect(message).not.toMatch(/#\d+/);
    expect(message).not.toMatch(/ticket \d+/);
  });

  it("tells the subagent where it CAN write, and to report the path", () => {
    // The action it can actually take, which the old message never named.
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const message = refusalFor(harness, childOf(harness, harness.agent));
    expect(message).toMatch(/worktree/);
    expect(message).toMatch(/scratch/);
    expect(message).toMatch(/\/tmp\/dsh/);
    expect(message).toMatch(/report/i);
  });

  it("every location it recommends is one the boundary actually allows", () => {
    /*
     * The trap #157 fixed, asserted from the other side: a refusal that
     * recommends a path the SAME guard refuses teaches the reader that the
     * messages cannot be trusted. This proves the advice is followable
     * rather than merely well-worded.
     */
    const harness = riggedHarness();
    const child = childOf(harness, harness.agent);
    const context = asContext(harness.ctx);
    for (const recommended of [
      "/tmp/dsh/aidos/--srv-proj-cli--/12/src/index.ts",
      "/tmp/dsh/report.md",
    ]) {
      expect(
        writeBoundaryReason(context, child as never, recommended),
        `${recommended} is recommended by the refusal and must be writable`,
      ).toBeUndefined();
    }
  });
});

describe("#159 the orchestrator gets a remedy it can perform", () => {
  it("points at request_allowlist, which it CAN call", () => {
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    expect(refusalFor(harness, harness.asAgent())).toMatch(/request_allowlist/);
  });

  it("does not claim an arbitrary ticket owns the path", () => {
    /*
     * The retired sentence, gone: "outside the allowlist of in-progress
     * ticket N" asserted a relationship that did not exist, since N was
     * simply the first row of the board.
     */
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    front(harness, ["src/host"]);
    const message = refusalFor(harness, harness.asAgent());
    expect(message).not.toMatch(/allowlist of in-progress ticket/);
    expect(message).toMatch(/no in-progress ticket covers it/);
  });

  it("lists EVERY in-progress ticket, so the caller can choose the right one", () => {
    // Which ticket should own a path is a judgement only the caller can
    // make; the message supplies the candidates instead of guessing.
    const harness = riggedHarness();
    const a = front(harness, ["src/client"]);
    const b = front(harness, ["src/host"]);
    const message = refusalFor(harness, harness.asAgent());
    expect(message).toContain(`#${a}`);
    expect(message).toContain(`#${b}`);
  });

  it("still says so plainly when the board is empty", () => {
    const harness = riggedHarness();
    const message = refusalFor(harness, harness.asAgent());
    expect(message).toMatch(/board is empty/);
  });
});
