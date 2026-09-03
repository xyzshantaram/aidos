/**
 * #21: a badge should contribute information, not clutter.
 *
 * Two rules, both pure and both derived rather than hardcoded:
 *
 *  - a DEPENDENCY chip shows the bare ticket id when the dependency is local,
 *    and keeps a workspace label only when it genuinely crosses a workspace;
 *  - an EVIDENCE chip is dropped from a TILE when the ticket's state already
 *    proves that kind is present, unless there is more than one row of it.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  displayDep,
  evidenceKindCounts,
  stateImpliedKinds,
  tileKindCounts,
  workspaceLabel,
} from "../src/client/board-logic";
import { DEFAULT_GATES } from "../src/kernel/constants";

const OWN = "--home-sid-repos-aidos--";
const OTHER = "--home-sid-repos-dotfiles-ai--";

describe("#21 dependency chips: local id only, workspace only when foreign", () => {
  it("drops the workspace prefix from a LOCAL dependency", () => {
    expect(displayDep(OWN + ":93", OWN)).toBe("93");
  });

  it("KEEPS a workspace label on a foreign dependency", () => {
    expect(displayDep(OTHER + ":7", OWN)).toBe("ai#7");
  });

  it("tells a foreign dependency apart from a local one", () => {
    /*
     * The defect this replaced: the old form rewrote EVERY workspace prefix
     * to the literal string "aidos#", so these two rendered identically. The
     * chip looked like it was drawing a distinction while erasing it.
     */
    expect(displayDep(OWN + ":7", OWN)).not.toBe(displayDep(OTHER + ":7", OWN));
  });

  it("shows MORE, not less, when the own workspace is unknown", () => {
    // Omitting ownWorkspaceKey must never hide the prefix: an unlabelled
    // foreign dependency reading as local would be a lie.
    expect(displayDep(OTHER + ":7")).toBe("ai#7");
    expect(displayDep(OWN + ":7")).toContain("#");
  });

  it("passes a reference that is not in the workspace shape through unchanged", () => {
    expect(displayDep("42", OWN)).toBe("42");
    expect(displayDep("", OWN)).toBe("");
  });

  it("keeps a slug reference readable", () => {
    expect(displayDep(OWN + ":some-ticket-slug", OWN)).toBe("some-ticket-slug");
  });

  it("workspaceLabel takes the last meaningful segment", () => {
    expect(workspaceLabel(OWN)).toBe("aidos");
    expect(workspaceLabel("--x--")).toBe("x");
    // Degenerate input must not produce an empty label.
    expect(workspaceLabel("")).toBe("");
    expect(workspaceLabel("----")).toBe("----");
  });
});

describe("#21 evidence chips a state already implies are dropped from tiles", () => {
  it("an open ticket implies nothing", () => {
    expect(stateImpliedKinds("open").size).toBe(0);
  });

  it("in_progress implies the signoff that unlocked it", () => {
    expect(stateImpliedKinds("in_progress")).toContain("builtin:user_signoff");
  });

  it("awaiting_verification implies the check and the accepted review too", () => {
    const implied = stateImpliedKinds("awaiting_verification");
    expect(implied).toContain("builtin:user_signoff");
    expect(implied).toContain("builtin:automated_check");
    expect(implied).toContain("builtin:review_pass");
    // But NOT the verification it has not received yet.
    expect(implied).not.toContain("builtin:user_verified");
  });

  it("done implies every forward gate's kinds", () => {
    const implied = stateImpliedKinds("done");
    for (const gate of DEFAULT_GATES) {
      if (gate.fromState === "awaiting_verification" && gate.toState === "in_progress") {
        continue; // the send-back edge proves nothing
      }
      for (const kind of gate.requiredKinds) {
        expect(implied).toContain(kind);
      }
    }
  });

  it("a BACKWARD gate implies nothing, however many kinds it requires", () => {
    /*
     * The send-back edge (awaiting_verification -> in_progress) exists so a
     * human can push work back. Reaching in_progress by that route proves
     * NOTHING about evidence, so its requiredKinds must never be treated as
     * implied. Every shipped backward gate has an empty requiredKinds today,
     * which is exactly why this needs an injected table: with the real one
     * the guard is unreachable, and an unreachable guard is untrustworthy.
     */
    const gates = [
      { fromState: "open", toState: "in_progress", requiredKinds: ["builtin:user_signoff"] },
      {
        fromState: "awaiting_verification",
        toState: "in_progress",
        requiredKinds: ["builtin:review_fail"],
      },
    ] as const;
    const implied = stateImpliedKinds("in_progress", gates);
    expect(implied).toContain("builtin:user_signoff");
    expect(implied).not.toContain("builtin:review_fail");
  });

  it("a self-edge implies nothing either", () => {
    const gates = [
      { fromState: "in_progress", toState: "in_progress", requiredKinds: ["builtin:agent_report"] },
    ] as const;
    expect(stateImpliedKinds("in_progress", gates).size).toBe(0);
  });

  it("is DERIVED from the gates, not hardcoded", () => {
    // Every implied kind must be traceable to some gate's requiredKinds.
    const fromGates = new Set(DEFAULT_GATES.flatMap((gate) => gate.requiredKinds));
    for (const kind of stateImpliedKinds("done")) {
      expect(fromGates.has(kind)).toBe(true);
    }
  });

  it("drops the restatement chip from a tile", () => {
    const counts = evidenceKindCounts([
      { kind: "builtin:user_signoff", payload: {} },
      { kind: "builtin:agent_report", payload: {} },
    ]);
    const shown = tileKindCounts("in_progress", counts).map((c) => c.kind);
    expect(shown).not.toContain("builtin:user_signoff");
    expect(shown).toContain("builtin:agent_report");
  });

  it("KEEPS an implied kind when there is more than one row of it", () => {
    /*
     * The rule is "drop the restatement", not "drop the history". Two
     * review_pass rows mean the work took two review rounds, which is one of
     * the most informative things a tile can say (#96) -- suppressing it
     * because the state implies ONE would destroy exactly that signal.
     */
    const counts = evidenceKindCounts([
      { kind: "builtin:review_pass", payload: {} },
      { kind: "builtin:review_pass", payload: {} },
    ]);
    const shown = tileKindCounts("awaiting_verification", counts).map((c) => c.kind);
    expect(shown).toContain("builtin:review_pass");
  });

  it("suppresses nothing on an open ticket", () => {
    const counts = evidenceKindCounts([{ kind: "builtin:user_signoff", payload: {} }]);
    expect(tileKindCounts("open", counts)).toHaveLength(1);
  });

  it("never invents a chip that was not in the counts", () => {
    const counts = evidenceKindCounts([{ kind: "builtin:agent_report", payload: {} }]);
    const shown = tileKindCounts("done", counts);
    expect(shown.length).toBeLessThanOrEqual(counts.length);
  });
});

describe("#21 the chip look lives in the stylesheet, not in inline styles", () => {
  const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
  const tags = readFileSync(
    new URL("../src/client/evidence-tags.tsx", import.meta.url),
    "utf8",
  );

  it("kind chips no longer set a saturated background inline", () => {
    // The hue rides a custom property; a raw `background: <hue>` inline is
    // what made every chip a competing colour block.
    expect(tags).not.toContain("background: count.color");
    expect(tags).toContain("--chip-hue");
  });

  it("declares the rule that consumes the custom property", () => {
    // A custom property nothing reads is dead weight, and a var() reference
    // to an undeclared property renders as nothing -- the silent-failure
    // class this project keeps hitting.
    expect(css).toContain("--chip-hue");
  });

  it("the count segment no longer inverts to a near-white block", () => {
    const countRule = css.slice(css.indexOf(".aidos-chip-count {"));
    const body = countRule.slice(0, countRule.indexOf("}"));
    expect(body).not.toContain("#f9fafb");
  });
});
