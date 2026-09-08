/**
 * Item 30. A review is its own evidence kind, and the second gate needs
 * it.
 *
 * A passing check says nothing about dead code or scope that grew. A
 * review says nothing about whether the thing runs. The gate from
 * in_progress to awaiting_verification asks for all three (#178 adds the
 * commit: a reviewer needs a diff to read), and the agent may author all
 * three, so the number of gates a human must satisfy does not change.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { expectGateRefused, makeStore } from "./helpers";

const AUTOMATED_CHECK = "builtin:automated_check";
const REVIEW_PASS = "builtin:review_pass";
const USER_COMMIT = "builtin:user_commit";
const HUMAN_ONLY_KINDS = ["builtin:user_signoff", "builtin:user_verified"];

function ticketInProgress() {
  const store = makeStore(DEFAULT_CONFIG);
  const project = store.createProject("/srv/proj/cli", "cli");
  const ticket = store.createTicket(project, "Needs a review", "A body.", {
    actor: "agent",
  });
  store.attachEvidence(ticket, "builtin:user_signoff", { ok: true }, "user");
  store.moveTicket(ticket, "in_progress", "user");
  return { store, ticket };
}

describe("review pass is its own kind", () => {
  it("a passing check without a review is refused", () => {
    const { store, ticket } = ticketInProgress();
    store.attachEvidence(ticket, AUTOMATED_CHECK, {}, "agent");
    store.attachEvidence(ticket, USER_COMMIT, {}, "agent");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "awaiting_verification", "user"),
    );
    // The commit is attached and still the review is named: the check-plus-
    // commit pair proves a run and a diff, but nothing proves judgement.
    expect(refusal.missingKinds).toEqual([REVIEW_PASS]);
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });

  it("a review WITHOUT a check now passes: the review excuses it (#107)", () => {
    /*
     * CONTRACT CHANGE, deliberate. This asserted that a review alone was
     * refused for want of a machine check.
     *
     * automated_check is the CHEAP evidence -- the agent attaches it from
     * its own claim that it ran something, and nothing verifies the claim.
     * review_pass is the EXPENSIVE one: an independent reviewer, or the
     * human. Demanding the cheap artefact alongside the expensive one added
     * ceremony rather than safety, and taught the agent to attach a check as
     * a formality, which is how automated_check becomes a rubber stamp.
     *
     * The motivating case was a human writing "this flow works fine, we've
     * been using it extensively" on a ticket that then sat blocked waiting
     * for a machine check. That review IS evidence the thing runs.
     *
     * The gate is NOT weakened: the test below still proves a check alone is
     * refused, so the expensive evidence stays mandatory in both directions.
     *
     * #178: the review still excuses the check, but it does NOT excuse the
     * commit -- judgement that the change is good is not proof that a diff
     * exists to read. So this test now attaches the commit alongside the
     * review, and the move still proves the #107 excuse (no check attached).
     */
    const { store, ticket } = ticketInProgress();
    store.attachEvidence(ticket, REVIEW_PASS, {}, "agent");
    store.attachEvidence(ticket, USER_COMMIT, {}, "agent");

    store.moveTicket(ticket, "awaiting_verification", "user");
    expect(store.getTicket(ticket).state).toBe("awaiting_verification");
  });

  it("the same ticket moves once the review row exists", () => {
    const { store, ticket } = ticketInProgress();
    store.attachEvidence(ticket, AUTOMATED_CHECK, {}, "agent");
    store.attachEvidence(ticket, USER_COMMIT, {}, "agent");
    expectGateRefused(() =>
      store.moveTicket(ticket, "awaiting_verification", "user"),
    );
    store.attachEvidence(ticket, REVIEW_PASS, {}, "agent");
    store.moveTicket(ticket, "awaiting_verification", "user");
    expect(store.getTicket(ticket).state).toBe("awaiting_verification");
  });

  it("the agent may author the review", () => {
    expect(HUMAN_ONLY_KINDS).not.toContain(REVIEW_PASS);
    const { store, ticket } = ticketInProgress();
    store.attachEvidence(ticket, REVIEW_PASS, {}, "agent");
  });

  it("the review weighs one", () => {
    const { store, ticket } = ticketInProgress();
    const before = store.confidenceScore(ticket);
    store.attachEvidence(ticket, REVIEW_PASS, {}, "agent");
    expect(store.confidenceScore(ticket) - before).toBe(1.0);
  });

  it("a review note does not satisfy the gate", () => {
    const { store, ticket } = ticketInProgress();
    store.attachEvidence(ticket, AUTOMATED_CHECK, {}, "agent");
    store.attachEvidence(ticket, "builtin:review_note", {}, "agent");
    store.attachEvidence(ticket, USER_COMMIT, {}, "agent");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "awaiting_verification", "user"),
    );
    // A note plus a check plus a commit: still no judgement, so the review
    // is still named -- the commit does not cover for it either.
    expect(refusal.missingKinds).toEqual([REVIEW_PASS]);
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });

  it("a review and a check without a commit are refused, naming the commit (#178)", () => {
    // The mirror image of the tests above: judgement and a run prove
    // nothing about whether a diff exists to read.
    const { store, ticket } = ticketInProgress();
    store.attachEvidence(ticket, AUTOMATED_CHECK, {}, "agent");
    store.attachEvidence(ticket, REVIEW_PASS, {}, "agent");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "awaiting_verification", "user"),
    );
    expect(refusal.missingKinds).toEqual([USER_COMMIT]);
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });
});
