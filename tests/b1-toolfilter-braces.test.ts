/**
 * The spawn-time toolFilter braces (Ticket A5).
 *
 * The belt is the runtime depth guard: `installAidosGuard` refuses every board
 * tool when `delegationDepthOf(exec.agent) !== 0`. The braces are the
 * spawn-time `toolFilter`: the orchestrator denies the six board tools on
 * every subagent or fork, so the child never sees them in its schema.
 *
 * The harness cannot start a real delegation. The child driver applies the
 * filter at one seam: `childCtx.tools.restrict(composition.toolFilter)`. This
 * file applies the same call on the fake agent's context, then reads the
 * harness's `effectiveToolSet`, which models the schema the child would see.
 * The harness applies restrictions globally, so each test keeps one
 * restriction active. The guard is the real `installAidosGuard`, and the
 * depth classification is the real `delegationDepthOf` over the fake session
 * headers. No API is faked.
 */

import { describe, expect, it } from "vitest";

import { BOARD_TOOLS, installAidosGuard } from "../src/tools/guard";
import { asContext, createHarness, SIX_TOOLS } from "./b1-harness";

describe("the spawn-time toolFilter braces", () => {
  /** A harness with the service and the depth guard installed. */
  function bracesHarness() {
    const harness = createHarness();
    harness.installService();
    installAidosGuard(asContext(harness.ctx));
    expect(harness.guards.length).toBe(1);
    return harness;
  }

  it("the deny filter hides all six board tools from a depth-1 agent", () => {
    const harness = bracesHarness();
    const subagent = harness.makeAgent({ depth: 1 });

    // The child driver runs this exact call with the spawn-time toolFilter.
    subagent.ctx.tools.restrict({ deny: [...BOARD_TOOLS] });

    const visible = harness.effectiveToolSet([...SIX_TOOLS, "read"]);
    for (const name of SIX_TOOLS) {
      expect(visible, `tool ${name} must hide from a subagent`).not.toContain(name);
    }
  });

  it("a non-board tool stays visible under the same restriction", () => {
    const harness = bracesHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    subagent.ctx.tools.restrict({ deny: [...BOARD_TOOLS] });

    const visible = harness.effectiveToolSet([...SIX_TOOLS, "read"]);
    expect(visible).toContain("read");

    // The belt does not block a non-board tool either.
    const exec = harness.makeExec("read", { file_path: "src/a.ts" }, subagent);
    expect(guard(exec)).toBeUndefined();
  });

  it("without the filter, the depth guard alone refuses all six board tools", () => {
    const harness = bracesHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    for (const name of SIX_TOOLS) {
      const exec = harness.makeExec(name, {}, subagent);
      const reason = guard(exec);
      expect(typeof reason, `tool ${name} must refuse a subagent`).toBe("string");
    }
  });

  it("a misconfigured empty deny hides nothing and the depth guard still refuses", () => {
    const harness = bracesHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    // An empty deny is a valid filter that hides nothing.
    subagent.ctx.tools.restrict({ deny: [] });

    const visible = harness.effectiveToolSet([...SIX_TOOLS]);
    expect(visible).toEqual([...SIX_TOOLS]);

    // The belt does not depend on the filter: the guard still refuses.
    for (const name of SIX_TOOLS) {
      const reason = guard(harness.makeExec(name, {}, subagent));
      expect(typeof reason, `tool ${name} must refuse a subagent`).toBe("string");
    }
  });
});
