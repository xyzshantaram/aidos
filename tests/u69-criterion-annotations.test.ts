/**
 * #69: the criterion kind annotation round-trips and drives kind-aware
 * coverage. The annotation is a trailing HTML comment on the criterion
 * line, so it survives parseCriteria and the plan renderer verbatim.
 */
import { describe, expect, it } from "vitest";
import {
  stripKindsAnnotation,
  kindsForCriterion,
  withKindsAnnotation,
  uncoveredCriteria,
} from "../src/client/board-logic";
import type { EvidenceRowLike } from "../src/client/board-logic";

const row = (kind: string, at = 1): EvidenceRowLike => ({ kind, payload: {}, at });

describe("criterion kind annotations", () => {
  it("strips, reads, and writes round-trip", () => {
    const line = "the suite covers every subcommand <!-- kinds: automated_check, review_pass -->";
    expect(stripKindsAnnotation(line)).toBe("the suite covers every subcommand");
    expect(kindsForCriterion(line)).toEqual(["automated_check", "review_pass"]);
    expect(withKindsAnnotation("the suite covers every subcommand", ["automated_check"])).toBe(
      "the suite covers every subcommand <!-- kinds: automated_check -->",
    );
    // Clearing: empty kinds leaves clean text.
    expect(withKindsAnnotation(line, [])).toBe("the suite covers every subcommand");
    // A line without an annotation is untouched and reads no kinds.
    expect(stripKindsAnnotation("plain")).toBe("plain");
    expect(kindsForCriterion("plain")).toEqual([]);
  });

  it("a linked kind covers the criterion without a text match", () => {
    const criteria = "runs on mobile <!-- kinds: user_verified -->";
    expect(uncoveredCriteria(criteria, [])).toEqual([
      "runs on mobile <!-- kinds: user_verified -->",
    ]);
    expect(uncoveredCriteria(criteria, [row("builtin:user_verified")])).toEqual([]);
    // A different kind does not cover it.
    expect(uncoveredCriteria(criteria, [row("builtin:review_pass")])).toEqual([
      "runs on mobile <!-- kinds: user_verified -->",
    ]);
  });
});
