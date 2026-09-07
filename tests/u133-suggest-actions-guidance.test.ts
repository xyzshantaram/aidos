/**
 * #133 (2026-09-07): replace the abstract suggest_actions rule with the
 * concrete transcript BAD/GOOD pair, and make the rule BRANCHLESS.
 *
 * Settled direction: re-nomination is idempotent-by-replace (verified as
 * behavior in u93), so the guidance collapses to ONE rule with no
 * exception branch -- never a prose reminder, never a "gentle nudge".
 * The pair is generalized from a live transcript where a work report
 * listed three fronts and a hand-mined queue of ticket numbers: the GOOD
 * shape keeps the report/ordering prose (real reasoning) and moves only
 * the actionable ask into the tool.
 *
 * Assertions run against what the harness REGISTERS, not source spelling
 * (#73 lesson) -- except the last one, which reads the source on purpose:
 * the #115 delegation is a comment, and a comment's only surface IS the
 * source.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness, type Harness } from "./b1-harness";

describe("#133 the branchless suggest_actions rule", () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
  });

  const text = () =>
    harness.promptSections.find((s) => s.name === "tool:aidos")?.text ?? "";

  it("states ONE rule with no reminder exception: re-suggest, never nudge", () => {
    const t = text();
    expect(t).toContain("BRANCHLESS");
    // The gentle-nudge exception is explicitly REJECTED, not merely
    // missing: a future edit must not quietly reintroduce it.
    expect(t).toContain("there is no 'gentle nudge' exception");
    expect(t).toContain("call suggest_actions again");
    // The premise that makes the branchless rule safe: replacement.
    expect(t).toContain("REPLACES that ticket's previous reason");
  });

  it("the BAD transcript is a work report with a mined queue welded in", () => {
    const t = text();
    // The report and the ordering are the part worth keeping...
    expect(t).toContain("My recommended order");
    // ...the mined queue is the defect being shown.
    expect(t).toContain("queue on your side right now");
    expect(t).toContain("#117 signoff, #118 signoff");
    // The annotation says exactly which half survives and which dies.
    expect(t).toContain("real reasoning the human wants to read");
    expect(t).toContain("dies at the next compaction");
  });

  it("the GOOD transcript keeps the prose, encodes the asks in the REAL schema, closes in one line", () => {
    const t = text();
    // Report and ordering stay in prose around the call.
    expect(t).toContain("keep the report and the recommended order in prose");
    // The call is rendered with the tool's real shape: one suggestion per
    // ticket (ticketId, actionId, reason) -- not "signoff: {117, 118}".
    expect(t).toContain("{ticketId: 117, actionId: 'signoff', reason:");
    expect(t).toContain("{ticketId: 118, actionId: 'signoff', reason:");
    expect(t).toContain("reason: 'composition front; everything else hangs off it'");
    // The one-line close.
    expect(t).toContain("Please approve the suggested actions.");
  });

  it("delegates the bottom-anchored call-row rendering to #115 with a cross-reference", () => {
    const source = readFileSync(
      join(import.meta.dirname, "../src/tools/aidos-tools.ts"),
      "utf8",
    );
    // The delegation is source documentation: assert it names #115 next
    // to the guidance it belongs to.
    expect(source).toMatch(/BRANCHLESS \(#133\)/);
    // The comment wraps across JSDoc lines, so span the wrap.
    expect(source).toMatch(/#115's[\s\S]*?deliverable/);
  });
});
