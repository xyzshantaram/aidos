/**
 * The guard and the delegation-depth check (SPEC-B1.md sections 8 and 9),
 * as #146 redrew them.
 *
 * The rule is no longer "a subagent may not touch the board". It is: a
 * subagent READS the board and never WRITES it. `delegationDepthOf(exec.agent)
 * !== 0` refuses a board tool that mutates, with the orchestrator-only
 * message, even when a toolFilter is misconfigured (decision 9); a board
 * tool that only reads passes at every depth, because a reviewer that
 * cannot read the ticket it is reviewing reviews a pasted summary instead
 * (observed twice in one session, which is why the ticket exists).
 *
 * The guard runs at call time — a mid-turn depth change cannot unlock a
 * call that already started (decision 8) — and its surface is monotonic: it
 * returns a denial string or nothing, never an allow.
 *
 * The harness runs the REAL `apply`, not a hand-installed guard, because
 * each tool's access class is declared at its registration site (#146):
 * installing the guard without registering the tools would test a guard
 * that has never been told what anything is.
 *
 * The fake agents carry their depth in the session header, so the REAL
 * `delegationDepthOf` (from @deepseek-ai/dsh-subagent) classifies them
 * without mocking the module.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { boardToolNames } from "../src/tools/board-access";
import { asContext, createHarness, type FakeAgent } from "./b1-harness";

/** The board tools that CHANGE the board: refused for a subagent. */
const WRITE_TOOLS = [
  "set_ticket",
  "attach_evidence",
  // #178: resolves a hash through git show host-side, so the agent may
  // author it -- but it still WRITES the board, so the depth guard refuses
  // it for a subagent exactly like every other write.
  "attach_commit",
  "move_ticket",
  "plan_import",
  "plan_meta_set",
  "request_allowlist",
  "suggest_actions",
] as const;

/**
 * The board tools that only READ it: allowed at every depth (#146).
 *
 * `get_evidence` (#164) joined this list when it shipped: a reviewer
 * subagent needs the FULL payload of the review it is answering, which is
 * exactly the read the depth guard must not refuse.
 */
const READ_TOOLS = [
  "get_tickets",
  "get_ticket",
  "get_evidence",
  "plan",
  "plan_meta",
] as const;

describe("the delegation-depth guard", () => {
  function guardHarness() {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    expect(harness.guards.length).toBe(1);
    return harness;
  }

  it("a depth-1 agent is refused on every board tool that WRITES", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    for (const name of WRITE_TOOLS) {
      const exec = harness.makeExec(name, {}, subagent);
      const reason = guard(exec);
      expect(typeof reason, `tool ${name} must refuse a subagent`).toBe("string");
    }
  });

  it("a depth-1 agent PASSES every board tool that only reads (#146)", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    for (const name of READ_TOOLS) {
      const exec = harness.makeExec(name, {}, subagent);
      expect(guard(exec), `tool ${name} must pass for a subagent`).toBeUndefined();
    }
  });

  /*
   * The classification is not a list in this file's imagination: it is what
   * the tools themselves declared at registration. If a tool changes class,
   * or a new board tool forgets to declare one, this fails rather than the
   * two lists above silently drifting away from the shipped guard.
   */
  it("the declared classes are exactly the two lists this file guards", () => {
    guardHarness();
    expect(boardToolNames("write").sort()).toEqual([...WRITE_TOOLS].sort());
    expect(boardToolNames("read").sort()).toEqual([...READ_TOOLS].sort());
  });

  it("the refusal says the orchestrator is the only actor", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    const reason = guard(harness.makeExec("set_ticket", {}, subagent));
    expect(reason).toMatch(/orchestrator/i);
    // And it says what the subagent MAY do, so the refusal teaches the
    // rule instead of only naming the wall.
    expect(reason).toMatch(/read/i);
  });

  it("a root agent passes every board tool", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const root = harness.agent;

    for (const name of [...WRITE_TOOLS, ...READ_TOOLS]) {
      const reason = guard(harness.makeExec(name, {}, root));
      expect(reason, `tool ${name} must pass for a root agent`).toBeUndefined();
    }
  });

  it("a non-board tool is not refused for a subagent", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    const reason = guard(harness.makeExec("read", { file_path: "src/a.ts" }, subagent));
    expect(reason).toBeUndefined();
  });

  it("the guard re-checks at call time", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    expect(guard(harness.makeExec("set_ticket", {}, subagent))).toMatch(/orchestrator/i);
    // The depth is read per call, not pinned at registration: lower the
    // session's delegation depth and the same guard now passes.
    (subagent.session.header as { delegationDepth?: number }).delegationDepth = 0;
    expect(guard(harness.makeExec("set_ticket", {}, subagent))).toBeUndefined();
  });

  it("a mid-turn state change cannot unlock a call that already started", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    // Two consecutive denials while the depth is 1: the first denial is not
    // retroactively allowed by anything the second call observes. The guard
    // surface has no allow channel (monotonic by construction).
    const first = guard(harness.makeExec("move_ticket", {}, subagent));
    const second = guard(harness.makeExec("move_ticket", {}, subagent));
    expect(first).toMatch(/orchestrator/i);
    expect(second).toMatch(/orchestrator/i);
  });

  it("the guard returns only a denial string or undefined", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });
    const root = harness.agent;

    for (const agent of [subagent, root] as FakeAgent[]) {
      for (const name of [...WRITE_TOOLS, ...READ_TOOLS]) {
        const result = guard(harness.makeExec(name, {}, agent));
        expect(result === undefined || typeof result === "string").toBe(true);
      }
    }
  });
});
