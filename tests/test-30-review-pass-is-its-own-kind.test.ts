/**
 * Item 30. A review is its own evidence kind, and the second gate needs
 * it.
 *
 * A passing check says nothing about dead code or scope that grew. A
 * review says nothing about whether the thing runs. The gate from
 * in_progress to awaiting_verification asks for both, and the agent may
 * author both, so the number of gates a human must satisfy does not
 * change.
 */

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { expectGateRefused, makeStore } from "./helpers";

const AUTOMATED_CHECK = "builtin:automated_check";
const REVIEW_PASS = "builtin:review_pass";
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

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "awaiting_verification", "user"),
    );
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
     */
    const { store, ticket } = ticketInProgress();
    store.attachEvidence(ticket, REVIEW_PASS, {}, "agent");

    store.moveTicket(ticket, "awaiting_verification", "user");
    expect(store.getTicket(ticket).state).toBe("awaiting_verification");
  });

  it("the same ticket moves once the review row exists", () => {
    const { store, ticket } = ticketInProgress();
    store.attachEvidence(ticket, AUTOMATED_CHECK, {}, "agent");
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

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "awaiting_verification", "user"),
    );
    expect(refusal.missingKinds).toEqual([REVIEW_PASS]);
    expect(store.getTicket(ticket).state).toBe("in_progress");
  });
});
