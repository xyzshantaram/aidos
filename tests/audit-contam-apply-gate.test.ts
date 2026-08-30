/**
 * Contamination audit, corrected contract. The daf1f96 gates were dead in
 * production and fatal: composedPreset(ctx) reads the live scope chain and
 * answers undefined for any context that is not a real agent context — a
 * host-plane row ctx (unscoped) or a row ctx inside a standing preset mount
 * (the mount scope has no parent). Gating those two apply bodies on it
 * stopped the host service from mounting and stopped the preset's tools row
 * from activating; the latter fails the whole preset mount ("N row(s) did
 * not activate"), which bounced aidos preset selection back to Standard.
 *
 * The corrected contract pins what actually protects a non-aidos project:
 * per-agent checks at the seams that run per agent (bashContext, project
 * creation, mask, guard, allowlist all key off agent.ctx), and composition
 * ownership for the plugin rows (the aidos preset's own agent.cordis.yml is
 * the only thing that composes the tools row; the host bundle patch is the
 * only thing that composes the service).
 *
 * SPEC: the per-agent gate itself is covered by
 * tests/audit-bash1-preset-gate.test.ts for bashContext / project creation.
 */
import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { apply as hostApply } from "../src/host/aidos-plugin";
import { asContext, createHarness, SIX_TOOLS } from "./b1-harness";

describe("aidos plugin apply bodies are not preset-gated", () => {
  it("the tools row registers everything even when agentPresets exists and answers a non-aidos preset", () => {
    // The row ctx inside a standing mount answers undefined from
    // composedPreset — modeled here by a service that answers a different
    // preset for whatever context it is handed. The row must still activate:
    // its composition (the aidos preset) is what scopes it to aidos sessions.
    const harness = createHarness();
    harness.ctx.reflect.provide("agentPresets", {
      composedPreset: () => "some-other-preset",
    });
    apply(asContext(harness.ctx), {});

    for (const name of SIX_TOOLS) {
      expect(harness.tools.get(name), `tool ${name} must register`).toBeDefined();
    }
    const section = harness.promptSections.find(
      (candidate) => candidate.name === "tool:aidos",
    );
    expect(section, "tool:aidos prompt section must register").toBeDefined();
    expect(harness.guards.length, "the delegation guard must install").toBe(1);
    // The mask installs per-agent wiring, not a restriction at apply time:
    // restrictions appear only when agents exist (agent/session-start), and
    // the harness has none.
    expect(
      (harness.listeners["agent/session-start"] ?? []).length,
      "the mask wiring must install",
    ).toBeGreaterThanOrEqual(1);
  });

  it("the host entry mounts the aidos service even when agentPresets exists and answers a non-aidos preset", () => {
    // The host-plane ctx is unscoped, so composedPreset(hostCtx) is
    // undefined in production. An apply-time gate on it can only ever mean
    // "never mount". The service must mount unconditionally; per-session
    // isolation comes from the session log and the per-agent call-time gates.
    const harness = createHarness();
    harness.ctx.reflect.provide("agentPresets", {
      composedPreset: () => "some-other-preset",
    });
    hostApply(asContext(harness.ctx), {});
    expect(harness.ctx.aidos, "the aidos service must mount").toBeDefined();
  });

  it("still activates when agentPresets is absent (harness default)", () => {
    const harness = createHarness();
    apply(asContext(harness.ctx), {});
    for (const name of SIX_TOOLS) {
      expect(harness.tools.get(name), `tool ${name} must register`).toBeDefined();
    }
  });
});
