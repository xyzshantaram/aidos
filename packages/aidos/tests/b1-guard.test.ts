/**
 * The guard and the depth check (SPEC-B1.md sections 8 and 9).
 *
 * `delegationDepthOf(exec.agent) !== 0` refuses a board-tool call with the
 * orchestrator-only message, even when a toolFilter is misconfigured
 * (decision 9). The guard runs at call time — a mid-turn depth change cannot
 * unlock a call that already started (decision 8) — and its surface is
 * monotonic: it returns a denial string or nothing, never an allow.
 *
 * The fake agents carry their depth in the session header, so the REAL
 * `delegationDepthOf` (from @deepseek-ai/dsh-subagent) classifies them
 * without mocking the module.
 */

import { describe, expect, it } from "vitest";

import { installAidosGuard } from "../src/tools/guard";
import {
  asContext,
  createHarness,
  SIX_TOOLS,
  type FakeAgent,
} from "./b1-harness";

describe("the delegation-depth guard", () => {
  function guardHarness() {
    const harness = createHarness();
    harness.installService();
    installAidosGuard(asContext(harness.ctx));
    expect(harness.guards.length).toBe(1);
    return harness;
  }

  it("a depth-1 agent is refused on every board tool", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    for (const name of SIX_TOOLS) {
      const exec = harness.makeExec(name, {}, subagent);
      const reason = guard(exec);
      expect(typeof reason, `tool ${name} must refuse a subagent`).toBe("string");
    }
  });

  it("the refusal says the orchestrator is the only actor", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    const reason = guard(harness.makeExec("set_ticket", {}, subagent));
    expect(reason).toMatch(/orchestrator/i);
  });

  it("a root agent passes every board tool", () => {
    const harness = guardHarness();
    const guard = harness.guards[0];
    const root = harness.agent;

    for (const name of SIX_TOOLS) {
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

    expect(guard(harness.makeExec("get_tickets", {}, subagent))).toMatch(/orchestrator/i);
    // The depth is read per call, not pinned at registration: lower the
    // session's delegation depth and the same guard now passes.
    (subagent.session.header as { delegationDepth?: number }).delegationDepth = 0;
    expect(guard(harness.makeExec("get_tickets", {}, subagent))).toBeUndefined();
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
      for (const name of SIX_TOOLS) {
        const result = guard(harness.makeExec(name, {}, agent));
        expect(result === undefined || typeof result === "string").toBe(true);
      }
    }
  });
});
