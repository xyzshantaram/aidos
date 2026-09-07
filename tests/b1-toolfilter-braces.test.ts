/**
 * The spawn-time toolFilter braces (Ticket A5), as #146 redrew them.
 *
 * The belt is the runtime depth guard: `installAidosGuard` refuses every
 * board tool that WRITES when `delegationDepthOf(exec.agent) !== 0`. The
 * braces are the spawn-time `toolFilter`: the orchestrator denies those
 * write tools on every subagent or fork, so the child never sees them in
 * its schema. Neither layer touches the READ tools any more — a subagent
 * must be able to read the board it is working against.
 *
 * The harness cannot start a real delegation. The child driver applies the
 * filter at one seam: `childCtx.tools.restrict(composition.toolFilter)`. This
 * file applies the same call on the fake agent's context, then reads the
 * harness's `effectiveToolSet`, which models the schema the child would see.
 * The harness applies restrictions globally, so each test keeps one
 * restriction active. The guard is the real one installed by `apply`, and
 * the depth classification is the real `delegationDepthOf` over the fake
 * session headers. No API is faked, and the deny list is DERIVED from the
 * tools' own declarations rather than retyped here.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { boardToolNames } from "../src/tools/board-access";
import { asContext, createHarness, SIX_TOOLS } from "./b1-harness";

/** What the orchestrator denies on a child: the write half, derived. */
const denyList = (): string[] => boardToolNames("write");

describe("the spawn-time toolFilter braces", () => {
  /** A harness with the service and the real registration + guard. */
  function bracesHarness() {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    expect(harness.guards.length).toBe(1);
    return harness;
  }

  it("the deny filter hides every WRITE board tool from a depth-1 agent", () => {
    const harness = bracesHarness();
    const subagent = harness.makeAgent({ depth: 1 });

    // The child driver runs this exact call with the spawn-time toolFilter.
    subagent.ctx.tools.restrict({ deny: denyList() });

    const visible = harness.effectiveToolSet([...SIX_TOOLS, ...denyList(), "read"]);
    for (const name of denyList()) {
      expect(visible, `tool ${name} must hide from a subagent`).not.toContain(name);
    }
  });

  it("it does NOT hide the read tools: the child still sees the board (#146)", () => {
    const harness = bracesHarness();
    const subagent = harness.makeAgent({ depth: 1 });

    subagent.ctx.tools.restrict({ deny: denyList() });

    const reads = boardToolNames("read");
    const visible = harness.effectiveToolSet([...reads, ...denyList(), "read"]);
    for (const name of reads) {
      expect(visible, `tool ${name} must stay visible to a subagent`).toContain(name);
    }
  });

  it("a non-board tool stays visible under the same restriction", () => {
    const harness = bracesHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    subagent.ctx.tools.restrict({ deny: denyList() });

    const visible = harness.effectiveToolSet([...SIX_TOOLS, "read"]);
    expect(visible).toContain("read");

    // The belt does not block a non-board tool either.
    const exec = harness.makeExec("read", { file_path: "src/a.ts" }, subagent);
    expect(guard(exec)).toBeUndefined();
  });

  it("without the filter, the depth guard alone refuses every write tool", () => {
    const harness = bracesHarness();
    const guard = harness.guards[0];
    const subagent = harness.makeAgent({ depth: 1 });

    for (const name of denyList()) {
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

    // The belt does not depend on the filter: the guard still refuses the
    // writes, and still lets the reads through.
    for (const name of denyList()) {
      const reason = guard(harness.makeExec(name, {}, subagent));
      expect(typeof reason, `tool ${name} must refuse a subagent`).toBe("string");
    }
    for (const name of boardToolNames("read")) {
      expect(guard(harness.makeExec(name, {}, subagent))).toBeUndefined();
    }
  });
});
