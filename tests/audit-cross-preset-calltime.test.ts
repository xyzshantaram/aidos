/**
 * Cross-preset contamination regression. Standing-mount registrations are
 * process-global (the mount's scope admits untagged dispatchers), so the
 * allowlist listener, the mask, the tool guard, and the tool:aidos prompt
 * section observe every session. The per-agent call-time gate
 * (isAidosAgent → composedPreset(agent.ctx)) is what scopes them to aidos
 * sessions. These tests model a deployment whose agentPresets answers a
 * different preset for the agent context and assert the aidos enforcement
 * machinery stands down for it.
 */
import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { writeBoundaryReason } from "../src/tools/allowlist";
import { installAidosGuard, ORCHESTRATOR_ONLY_MESSAGE } from "../src/tools/guard";
import { installAidosMask } from "../src/tools/mask";
import { asContext, createHarness, SIX_TOOLS } from "./b1-harness";

/** A harness whose agentPresets answers a non-aidos preset for agent ctxs. */
function foreignPresetHarness() {
  const harness = createHarness();
  harness.ctx.reflect.provide("agentPresets", {
    composedPreset: (agentCtx: unknown) => {
      // The harness agent ctx is not a real scoped context; answer the
      // foreign preset for anything, which is the production behavior for a
      // standard-preset agent.
      void agentCtx;
      return "standard";
    },
  });
  return harness;
}

describe("aidos enforcement stands down for a non-aidos agent at call time", () => {
  it("the write boundary allows a project write for a standard-preset agent", () => {
    const harness = foreignPresetHarness();
    // The board is empty: before the call-time gate this returned the
    // "board is empty" refusal for every session, standard included.
    const reason = writeBoundaryReason(
      asContext(harness.ctx),
      harness.asAgent(),
      "/home/sid/repos/dotfiles-ai/sync-models.mjs",
    );
    expect(reason).toBeUndefined();
  });

  it("the write boundary still refuses for an agent when no preset service exists", () => {
    const harness = createHarness();
    harness.installService();
    const reason = writeBoundaryReason(
      asContext(harness.ctx),
      harness.asAgent(),
      "/home/sid/repos/other/notes.md",
    );
    expect(reason).toMatch(/allowlist union/);
  });

  it("the delegation guard lets a standard-preset agent's board calls pass", () => {
    const harness = foreignPresetHarness();
    // The real registration declares each tool's access class (#146); the
    // guard reads those declarations, so a guard installed over an
    // unregistered registry would pass everything for the wrong reason.
    apply(asContext(harness.ctx), {});
    const agent = harness.asAgent();
    const refusal = harness.guards[0]?.({
      name: "set_ticket",
      agent: { ...agent, session: agent.session },
      arguments: {},
    } as never);
    expect(refusal).toBeUndefined();
  });

  it("the delegation guard still refuses a subagent of an aidos agent", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const agent = harness.asAgent();
    const child = harness.makeAgent({ depth: 1 });
    // A WRITE: #146 opened the reads, so the refusal lives on the mutating
    // half. get_tickets here would now (correctly) pass.
    const refusal = harness.guards[0]?.({
      name: "set_ticket",
      agent: child,
      arguments: {},
    } as never);
    void agent;
    expect(refusal).toBe(ORCHESTRATOR_ONLY_MESSAGE);
  });

  it("the same subagent READS the board without a refusal (#146)", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const child = harness.makeAgent({ depth: 1 });
    const refusal = harness.guards[0]?.({
      name: "get_tickets",
      agent: child,
      arguments: {},
    } as never);
    expect(refusal).toBeUndefined();
  });

  it("the mask installs no restriction and lifts nothing for a standard-preset agent", () => {
    const harness = foreignPresetHarness();
    installAidosMask(asContext(harness.ctx));
    const agent = harness.makeAgent();
    harness.fireSessionStart(agent);
    expect(harness.restrictions.length).toBe(0);
  });

  it("the mask still restricts an aidos agent's tools by tier", () => {
    const harness = createHarness();
    harness.installService();
    // The tier tools give the mask a universe to mask (see b1-plugin.test).
    harness.registerTierTools();
    installAidosMask(asContext(harness.ctx));
    const agent = harness.makeAgent();
    harness.fireSessionStart(agent);
    expect(harness.restrictions.length).toBeGreaterThan(0);
    // Planning tier: implementation tools denied, board tools visible.
    const denied = harness.restrictions[0]?.filter.deny ?? [];
    expect(denied).toContain("write");
    expect(denied).not.toContain("get_tickets");
    void SIX_TOOLS;
  });
});
