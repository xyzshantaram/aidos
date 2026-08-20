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

  it("a review without a check is refused", () => {
    const { store, ticket } = ticketInProgress();
    store.attachEvidence(ticket, REVIEW_PASS, {}, "agent");

    const refusal = expectGateRefused(() =>
      store.moveTicket(ticket, "awaiting_verification", "user"),
    );
    expect(refusal.missingKinds).toEqual([AUTOMATED_CHECK]);
    expect(store.getTicket(ticket).state).toBe("in_progress");
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
