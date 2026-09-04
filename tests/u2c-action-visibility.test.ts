/**
 * Ticket U2c + #62: the action descriptors.
 *
 * Every action is always present (#62); each descriptor carries an
 * unavailableReason naming the unlock when the action cannot run now.
 * One test per state asserts availability, reasons, and order.
 */

import { describe, expect, it } from "vitest";

import { actionsFor } from "../src/client/action-visibility";
import { makeTicket } from "./u2c-helpers";

describe("u2c action-visibility: actionsFor", () => {
  it("open: signoff available; everything else greyed with reasons", () => {
    const ticket = makeTicket({ state: "open" });
    const actions = actionsFor(ticket);
    expect(actions.map((a) => a.id)).toEqual([
      "signoff",
      "verify",
      "submit-for-review",
      "send-back",
      "mark-done",
      "allowlist",
    ]);
    expect(actions[0].unavailableReason).toBeUndefined();
    expect(actions[1].unavailableReason).toContain("awaiting verification");
    expect(actions[2].unavailableReason).toContain("in progress");
    expect(actions[3].unavailableReason).toContain("awaiting verification");
    expect(actions[4].unavailableReason).toContain("awaiting verification");
    expect(actions[5].unavailableReason).toContain("in progress");
  });

  it("in_progress: submit and allowlist available; submit still needs evidence rows", () => {
    const ticket = makeTicket({ state: "in_progress" });
    const actions = actionsFor(ticket);
    expect(actions[2].unavailableReason).toContain("automated_check");
    expect(actions[2].unavailableReason).toContain("review_pass");
    const withEvidence = actionsFor(ticket, [
      "builtin:automated_check",
      "builtin:review_pass",
    ]);
    expect(withEvidence[2].unavailableReason).toBeUndefined();
    expect(withEvidence[5].unavailableReason).toBeUndefined();
    expect(actions[0].unavailableReason).toContain("already signed off");
  });

  it("in_progress: a review_pass ALONE enables submit (#107)", () => {
    /*
     * #107 review, finding 1 -- the blocking one, and a real hole.
     *
     * The client's submitReason was updated so a review excuses the machine
     * check, and the reviewer reverted that change wholesale with the entire
     * suite still GREEN. This test file exercised only two of the three
     * interesting inputs -- nothing attached, and both attached -- and those
     * two return byte-identical strings before and after the change. The one
     * case #107 actually altered was never covered.
     *
     * The reverted state reproduces exactly the failure the change was
     * written to prevent: the kernel gate allows the move and the board
     * fraction reads 2/2, while the button stays greyed out demanding an
     * automated_check. The fraction disagreeing with its own button.
     *
     * The lesson is the one this project keeps relearning: mutating the
     * kernel and the projection while never mutating the CLIENT is how a
     * rule with no reachable test ships.
     */
    const ticket = makeTicket({ state: "in_progress" });
    const reviewOnly = actionsFor(ticket, ["builtin:review_pass"]);
    expect(reviewOnly[2].unavailableReason).toBeUndefined();
  });

  it("in_progress: a check alone still names review_pass as missing", () => {
    /*
     * The other half, and the property that must NOT change: the excuse is
     * directional. review_pass excuses automated_check and never the
     * reverse, so the expensive evidence stays required in the sentence the
     * human reads, exactly as it stays required in the gate.
     */
    const ticket = makeTicket({ state: "in_progress" });
    const checkOnly = actionsFor(ticket, ["builtin:automated_check"]);
    expect(checkOnly[2].unavailableReason).toContain("review_pass");
    expect(checkOnly[2].unavailableReason).not.toContain("automated_check");
  });

  it("awaiting_verification: send-back available; mark done needs user_verified", () => {
    const ticket = makeTicket({ state: "awaiting_verification" });
    const actions = actionsFor(ticket);
    expect(actions[1].unavailableReason).toBeUndefined();
    expect(actions[3].unavailableReason).toBeUndefined();
    expect(actions[4].unavailableReason).toContain("user_verified");
    const verified = actionsFor(ticket, ["builtin:user_verified"]);
    expect(verified[4].unavailableReason).toBeUndefined();
  });

  it("done: nothing is available", () => {
    const ticket = makeTicket({ state: "done" });
    for (const action of actionsFor(ticket)) {
      expect(action.unavailableReason).toBeDefined();
    }
  });
});
