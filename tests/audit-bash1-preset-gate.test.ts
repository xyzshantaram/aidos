/**
 * Ticket A-BASH1: bashContext() must gate on the aidos preset before any
 * profile logic runs.
 *
 * Before the fix, a session with no aidos project had zero tickets, so
 * ticketStates() returned [] and the function fell through to
 * profile: "planning" -- the same value a real aidos primary agent gets
 * before its first ticket. bash-guard then applied the deny-by-default
 * profile-planning overlay to a session that never ran aidos at all.
 *
 * The fix checks `agentPresets.composedPreset(agent.ctx)` first. When the
 * composed preset is not "aidos", bashContext() returns a static
 * { profile: "none", scratchDir: "", workspaceRoot: "" } and never touches
 * ticketStates(), scratchRootForAgent(), or subagentKind().
 */

import { describe, expect, it } from "vitest";

import { createHarness } from "./b1-harness";

/** Provide a fake agentPresets service that reports the given preset name. */
function provideComposedPreset(harness: ReturnType<typeof createHarness>, preset: string | undefined) {
  harness.ctx.reflect.provide("agentPresets", {
    composedPreset: () => preset,
  });
}

/** Drive one ticket into in_progress on the harness's default agent. */
function reachInProgress(harness: ReturnType<typeof createHarness>) {
  const ticket = harness.service.setTicket(harness.asAgent(), { title: "Doing work" });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:user_signoff");
  harness.service.agentMoveTicket(harness.asAgent(), { ticketId: ticket.id, to: "in_progress" });
}

describe("A-BASH1 bashContext preset gate", () => {
  it("resolves none for a primary agent whose session does not run the aidos preset", () => {
    const harness = createHarness();
    harness.installService();
    provideComposedPreset(harness, "some-other-preset");

    const result = harness.service.bashContext(harness.asAgent());
    expect(result).toEqual({ profile: "none", scratchDir: "", workspaceRoot: "" });
  });

  it("stays none even when the session already has an in_progress ticket", () => {
    // This is the core regression: the old code let ticketStates() decide,
    // so an in_progress ticket would have produced "implementation" even
    // in a non-aidos session. The gate must short-circuit before that.
    const harness = createHarness();
    harness.installService();
    reachInProgress(harness);
    provideComposedPreset(harness, "some-other-preset");

    const result = harness.service.bashContext(harness.asAgent());
    expect(result).toEqual({ profile: "none", scratchDir: "", workspaceRoot: "" });
  });

  it("resolves none for a subagent whose session does not run the aidos preset", () => {
    const harness = createHarness();
    harness.installService();
    const subagent = harness.makeAgent({ depth: 1 });
    provideComposedPreset(harness, "some-other-preset");

    const result = harness.service.bashContext(harness.asAgent(subagent));
    expect(result).toEqual({ profile: "none", scratchDir: "", workspaceRoot: "" });
  });

  it("a real aidos primary agent with zero tickets still resolves planning", () => {
    const harness = createHarness();
    harness.installService();
    provideComposedPreset(harness, "aidos");

    const result = harness.service.bashContext(harness.asAgent());
    expect(result.profile).toBe("planning");
  });

  it("a real aidos primary agent with an in_progress ticket still resolves implementation", () => {
    const harness = createHarness();
    harness.installService();
    provideComposedPreset(harness, "aidos");
    reachInProgress(harness);

    const result = harness.service.bashContext(harness.asAgent());
    expect(result.profile).toBe("implementation");
  });

  it("a real aidos subagent still resolves subagent-<provider>", () => {
    const harness = createHarness();
    harness.installService();
    provideComposedPreset(harness, "aidos");
    const subagent = harness.makeAgent({ depth: 1 });

    const result = harness.service.bashContext(harness.asAgent(subagent));
    // No descriptor is seeded on the fake subagent, so it falls back to
    // "subagent-coder", per the documented default.
    expect(result.profile).toBe("subagent-coder");
  });

  it("a session with no agentPresets service at all keeps the pre-gate default behavior", () => {
    // `presets && ...` short-circuits false when the service was never
    // provided, so the aidos-profile logic still runs unconditionally.
    // This is the shape every pre-existing test in this suite relies on.
    const harness = createHarness();
    harness.installService();

    const result = harness.service.bashContext(harness.asAgent());
    expect(result.profile).toBe("planning");
  });
});
