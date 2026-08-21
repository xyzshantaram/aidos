/**
 * The shared B1 describe: the aidos-tools plugin registers the six tools, the
 * `tool:aidos` prompt section, and the four policy installers, exactly as
 * SPEC-B1.md sections 4b and 5 pin. Each ported tool file below this one
 * drives the same harness.
 */

import { describe, expect, it } from "vitest";
import { defineTool } from "@deepseek-ai/dsh-tools";

import { apply } from "../src/tools/aidos-tools";
import { installAidosGuard } from "../src/tools/guard";
import { installAidosMask } from "../src/tools/mask";
import { installBashAskListener } from "../src/tools/bash-ask";
import { installAllowlistGuard } from "../src/tools/allowlist";
import { registerAidosService } from "../src/host/aidos-core";
import { registerAidosInvariant } from "../src/host/invariant";
import {
  asContext,
  createHarness,
  SIX_TOOLS,
  type Harness,
} from "./b1-harness";

describe("the aidos-tools plugin", () => {
  it("apply registers the six tools with the dsh-tool-goal shape", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});

    for (const name of SIX_TOOLS) {
      const definition = harness.tools.get(name);
      expect(definition, `tool ${name} must register`).toBeDefined();
      expect(typeof definition?.description).toBe("string");
      expect(definition?.parameters).toBeDefined();
      expect(definition?.output?.schema).toBeDefined();
      expect(typeof definition?.output?.render).toBe("function");
      expect(typeof definition?.execute).toBe("function");
    }
  });

  it("apply registers the tool:aidos prompt section", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});

    const section = harness.promptSections.find(
      (candidate) => candidate.name === "tool:aidos",
    );
    expect(section).toBeDefined();
    expect(typeof section?.text).toBe("string");
    expect((section?.text ?? "").length).toBeGreaterThan(0);
  });

  it("apply installs the guard, the mask, the bash-ask listener, and the allowlist guard", () => {
    const harness = createHarness();
    harness.installService();
    // The tier tools give the mask a universe to mask; the six board tools
    // alone are all visible in the open tier, so no restriction would form.
    harness.registerTierTools();
    apply(asContext(harness.ctx), {});

    expect(harness.guards.length).toBeGreaterThan(0);
    expect(harness.listeners["tools/pre-execute"]?.length ?? 0).toBeGreaterThan(0);
    expect(harness.restrictions.length).toBeGreaterThan(0);
  });

  it("each installer returns a disposer", () => {
    const harness = createHarness();
    expect(typeof installAidosGuard(asContext(harness.ctx))).toBe("function");
    expect(typeof installAidosMask(asContext(harness.ctx))).toBe("function");
    expect(typeof installBashAskListener(asContext(harness.ctx))).toBe("function");
    expect(typeof installAllowlistGuard(asContext(harness.ctx))).toBe("function");
  });

  it("registerAidosService mounts the service on the context", () => {
    const harness = createHarness();
    const dispose = registerAidosService(asContext(harness.ctx));
    expect(typeof dispose).toBe("function");
    expect(harness.ctx.aidos).toBeDefined();
    expect(typeof harness.ctx.aidos?.getTickets).toBe("function");
  });

  it("registerAidosInvariant registers the aidos invariant installer", () => {
    const harness = createHarness();
    const dispose = registerAidosInvariant(asContext(harness.ctx));
    expect(typeof dispose).toBe("function");
    expect(harness.invariants.map((entry) => entry.packageName)).toContain("aidos");
  });

  it("tools.register captures into the map and its disposer unregisters", () => {
    const harness = createHarness();
    const definition = defineTool({
      name: "harness_probe",
      description: "A probe tool for the harness.",
      parameters: {},
      output: {
        schema: { type: "object", properties: {}, additionalProperties: true },
        render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }],
      },
      execute: async () => ({ ok: true }),
    });
    const disposer = harness.ctx.tools.register(definition);
    expect(harness.tools.get("harness_probe")).toBe(definition);
    disposer();
    expect(harness.tools.get("harness_probe")).toBeUndefined();
  });
});
