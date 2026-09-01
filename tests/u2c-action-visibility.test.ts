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
      "submit-for-review",
      "send-back",
      "mark-done",
      "allowlist",
    ]);
    expect(actions[0].unavailableReason).toBeUndefined();
    expect(actions[1].unavailableReason).toContain("in progress");
    expect(actions[2].unavailableReason).toContain("awaiting verification");
    expect(actions[3].unavailableReason).toContain("awaiting verification");
    expect(actions[4].unavailableReason).toContain("in progress");
  });

  it("in_progress: submit and allowlist available; submit still needs evidence rows", () => {
    const ticket = makeTicket({ state: "in_progress" });
    const actions = actionsFor(ticket);
    expect(actions[1].unavailableReason).toContain("automated_check");
    expect(actions[1].unavailableReason).toContain("review_pass");
    const withEvidence = actionsFor(ticket, [
      "builtin:automated_check",
      "builtin:review_pass",
    ]);
    expect(withEvidence[1].unavailableReason).toBeUndefined();
    expect(withEvidence[4].unavailableReason).toBeUndefined();
    expect(actions[0].unavailableReason).toContain("already signed off");
  });

  it("awaiting_verification: send-back available; mark done needs user_verified", () => {
    const ticket = makeTicket({ state: "awaiting_verification" });
    const actions = actionsFor(ticket);
    expect(actions[2].unavailableReason).toBeUndefined();
    expect(actions[3].unavailableReason).toContain("user_verified");
    const verified = actionsFor(ticket, ["builtin:user_verified"]);
    expect(verified[3].unavailableReason).toBeUndefined();
  });

  it("done: nothing is available", () => {
    const ticket = makeTicket({ state: "done" });
    for (const action of actionsFor(ticket)) {
      expect(action.unavailableReason).toBeDefined();
    }
  });
});
