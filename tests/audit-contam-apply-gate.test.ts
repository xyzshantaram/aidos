/**
 * Contamination audit: the aidos plugin must not activate for a session whose
 * composed preset is not "aidos". A non-aidos preset project must get no board
 * tools, no tool:aidos prompt section, no mask, no write guard, and no aidos
 * service. SPEC: this is the plugin-level equivalent of the per-agent gate in
 * aidos-core.ts (bashContext / project creation), already covered by
 * tests/audit-bash1-preset-gate.test.ts for those methods.
 */
import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { apply as hostApply } from "../src/host/aidos-plugin";
import { asContext, createHarness, SIX_TOOLS } from "./b1-harness";

describe("aidos plugin does not activate for a non-aidos preset", () => {
  it("omits tools, prompt section, mask, and guard when the preset is not aidos", () => {
    const harness = createHarness();
    harness.ctx.reflect.provide("agentPresets", {
      composedPreset: () => "some-other-preset",
    });
    apply(asContext(harness.ctx), {});

    for (const name of SIX_TOOLS) {
      expect(harness.tools.get(name), `tool ${name} must NOT register`).toBeUndefined();
    }
    const section = harness.promptSections.find(
      (candidate) => candidate.name === "tool:aidos",
    );
    expect(section, "tool:aidos prompt section must NOT register").toBeUndefined();
    expect(harness.guards.length, "no guard should install").toBe(0);
    expect(harness.restrictions.length, "no mask restriction should install").toBe(0);
  });

  it("the host entry provides no aidos service when the preset is not aidos", () => {
    const harness = createHarness();
    harness.ctx.reflect.provide("agentPresets", {
      composedPreset: () => "some-other-preset",
    });
    hostApply(asContext(harness.ctx), {});
    expect(harness.ctx.aidos, "no aidos service should mount").toBeUndefined();
  });

  it("still activates when agentPresets is absent (harness default)", () => {
    const harness = createHarness();
    apply(asContext(harness.ctx), {});
    for (const name of SIX_TOOLS) {
      expect(harness.tools.get(name), `tool ${name} must register`).toBeDefined();
    }
  });
});
