/**
 * #117 (2026-09-05): the agent must prefer suggest_actions over prose for
 * any ask the board can encode. The user filed it after receiving a
 * hand-written work queue in chat ("One item needs you: #141 ... and #132
 * ... are both open and need signoff") when the board already has a
 * "Waiting on you" queue built for exactly that.
 *
 * This is a guidance-text change, so the product IS the text -- but the
 * assertion is made against what the harness actually REGISTERS (the
 * system-prompt section and the tool description the model really sees),
 * not against source-code spelling. A grep of aidos-tools.ts would pass
 * while the section stayed unwired, which is the failure mode the #73
 * review called out: spelling is not behaviour.
 *
 * The limit is asserted with the same seriousness as the rule, because a
 * rule the agent cannot follow is one it ignores wholesale (#101 lesson):
 * the guidance must TELL the agent that only signoff/verify/mark-done are
 * nominatable, so allowlist approvals and design questions stay in prose
 * by design rather than by failure.
 */

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness, type Harness } from "./b1-harness";

describe("#117 the guidance prefers suggest_actions over prose", () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
  });

  it("the tool:aidos prompt section carries the rule", () => {
    const section = harness.promptSections.find((s) => s.name === "tool:aidos");
    expect(section).toBeDefined();
    const text = section?.text ?? "";
    expect(text).toContain("NEVER remind the user of pending work as a list in chat");
    expect(text).toContain("suggest_actions");
    // The one-line WHY, so a future edit that keeps the injunction but drops
    // the reasoning is visible: the queue is gate-checked, prose can ask for
    // the impossible.
    expect(text).toContain("gate-checked");
  });

  it("the rule names its own limit: only signoff, verify and mark-done are nominatable", () => {
    const text = harness.promptSections.find((s) => s.name === "tool:aidos")?.text ?? "";
    // The limit is what keeps the rule honest -- without it the agent is
    // instructed to nominate allowlist approvals, which the tool drops.
    expect(text).toContain("only signoff, verify and mark-done are nominatable");
    expect(text).toContain("allowlist approval");
    expect(text).toContain("prose");
  });

  it("the suggest_actions tool description says to prefer it over prose", () => {
    const def = harness.tools.get("suggest_actions");
    expect(def).toBeDefined();
    const description = String((def as { description?: string }).description ?? "");
    expect(description).toContain("PREFER THIS TOOL OVER PROSE");
  });

  /*
   * User addendum (2026-09-05), after catching the anti-pattern AGAIN in a
   * closing message that listed pending signoffs in prose: the rule text
   * alone was not enough -- the guidance must carry one BAD and one GOOD
   * example, drawn from the real offense. Examples are what a tier-3
   * (prompt text) control needs to actually change behavior; a bare
   * convention gets ignored (#101 lesson: the worktree convention was in
   * the system prompt and was still bypassed).
   */
  it("carries one BAD and one GOOD example of the ask", () => {
    const text = harness.promptSections.find((s) => s.name === "tool:aidos")?.text ?? "";
    // The BAD example is a real hand-written work queue, verbatim in shape:
    // ticket numbers mined out of a closing message.
    expect(text).toContain("BAD (a work report with the asks welded into it)");
    expect(text).toContain("#117 signoff, #118 signoff");
    // The GOOD example is the encoded ask: the tool call plus exactly one
    // line -- no list. The one-liner is the contract; if the example shows
    // a list AND a nomination, it teaches the wrong thing.
    expect(text).toContain("GOOD (the same turn, asks encoded)");
    expect(text).toContain("actionId: 'signoff'");
    expect(text).toContain("Please approve the suggested actions.");
  });
});
