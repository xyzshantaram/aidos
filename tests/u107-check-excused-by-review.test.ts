/**
 * #107: an accepted review excuses the machine check.
 *
 * User ask, prompted by the live case in the same minute: #9 received a
 * review_pass from the user reading "this flow works fine, we've been using
 * it extensively" -- and its gate sat at 1/2, demanding a machine check for
 * a flow proven in months of daily use.
 *
 * WHY THIS DOES NOT WEAKEN THE GATE, which is the whole argument:
 *
 *   - automated_check is the CHEAP evidence. The agent attaches it freely
 *     from its own claim that it ran something, and nothing verifies the
 *     claim.
 *   - review_pass is the EXPENSIVE one. It needs an independent reviewer --
 *     a subagent that did not write the code, or the human.
 *
 * The requirement being dropped is the one the agent can already self-issue
 * at will; the one that actually constrains it stays mandatory. Requiring
 * the cheap artefact alongside the expensive one added ceremony rather than
 * safety, and taught the agent to attach a check as a formality -- which is
 * precisely how automated_check becomes a rubber stamp.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_GATES } from "../src/kernel/constants";
import { isMissing } from "../src/kernel/gates";
import { gateProgressOf } from "../src/kernel/projections";

const CHECK = "builtin:automated_check";
const PASS = "builtin:review_pass";
const FAIL = "builtin:review_fail";

const SUBMIT = DEFAULT_GATES.find(
  (gate) => gate.fromState === "in_progress" && gate.toState === "awaiting_verification",
);

function missingFor(attached: string[]): string[] {
  if (SUBMIT === undefined) throw new Error("the submit gate is missing");
  const set = new Set(attached);
  return SUBMIT.requiredKinds.filter((kind) => isMissing(SUBMIT, set, kind));
}

describe("#107 the submit gate", () => {
  it("still passes with BOTH, unchanged", () => {
    expect(missingFor([CHECK, PASS])).toEqual([]);
  });

  it("passes with a review and NO check: the ask", () => {
    expect(missingFor([PASS])).toEqual([]);
  });

  it("still REFUSES a check with no review, naming review_pass", () => {
    /*
     * THE test that proves the gate is not weakened. The excuse is
     * DIRECTIONAL: review_pass excuses automated_check and never the
     * reverse. Excusing the expensive evidence with the cheap one would
     * hollow out the only thing that stops the agent marking its own
     * homework.
     */
    expect(missingFor([CHECK])).toEqual([PASS]);
  });

  it("refuses an empty evidence list, naming both", () => {
    expect(missingFor([])).toEqual([CHECK, PASS]);
  });
});

describe("#107 review_fail never satisfies and never excuses", () => {
  it("a check plus a FAILED review is still refused", () => {
    expect(missingFor([CHECK, FAIL])).toEqual([PASS]);
  });

  it("a failed review alone excuses nothing", () => {
    // If review_fail could excuse the check, a FAILING review would move a
    // ticket forward -- the catastrophic case #96 was designed to prevent.
    expect(missingFor([FAIL])).toEqual([CHECK, PASS]);
  });

  it("the excuse names an exact kind id, never a prefix", () => {
    /*
     * #96 rejected namespacing (review_pass:ok / review_pass:fail) because
     * the only thing making it "just work" was PREFIX matching, under which
     * review_pass:fail would satisfy a gate wanting review_pass. Nothing
     * here may reintroduce that: a kind that merely starts with the excuse's
     * id must not excuse.
     */
    expect(missingFor(["builtin:review_pass_lookalike"])).toEqual([CHECK, PASS]);
    expect(missingFor([PASS + ":fail"])).toEqual([CHECK, PASS]);
  });
});

describe("#107 the excuse is directional and narrow", () => {
  it("only excuses the kind it names", () => {
    if (SUBMIT === undefined) throw new Error("the submit gate is missing");
    expect(SUBMIT.excusedBy).toEqual({ [CHECK]: PASS });
  });

  it("no OTHER gate gains an excuse", () => {
    // The signoff gate and the done gate must be untouched: neither
    // user_signoff nor user_verified may ever be excused by anything.
    for (const gate of DEFAULT_GATES) {
      if (gate.fromState === "in_progress" && gate.toState === "awaiting_verification") continue;
      expect(gate.excusedBy ?? {}).toEqual({});
    }
  });

  it("a gate with no excuse behaves exactly as before", () => {
    const done = DEFAULT_GATES.find(
      (gate) => gate.fromState === "awaiting_verification" && gate.toState === "done",
    );
    if (done === undefined) throw new Error("the done gate is missing");
    expect(done.requiredKinds.filter((k) => isMissing(done, new Set([PASS]), k))).toEqual([
      "builtin:user_verified",
    ]);
  });
});

describe("#107 the board's gate FRACTION agrees with the gate", () => {
  /*
   * The third place the rule appears, and the one that would be missed. If
   * only the gate were updated, a ticket the gate would let through would
   * still render as blocked -- the fraction disagreeing with its own button.
   */
  function fractionFor(kinds: string[]) {
    return gateProgressOf(
      { kinds: [], gates: [...DEFAULT_GATES] } as never,
      { state: "in_progress" } as never,
      kinds.map((kind) => ({ kind })) as never,
    );
  }

  it("counts an EXCUSED kind as present", () => {
    const gate = fractionFor([PASS]);
    expect(gate.present).toBe(2);
    expect(gate.total).toBe(2);
    expect(gate.fraction).toBe(1);
  });

  it("does not inflate when the excuse is absent", () => {
    const gate = fractionFor([CHECK]);
    expect(gate.present).toBe(1);
    expect(gate.fraction).toBe(0.5);
  });

  it("a failed review does not raise the fraction", () => {
    expect(fractionFor([CHECK, FAIL]).present).toBe(1);
  });
});
