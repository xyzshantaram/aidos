/**
 * Item 30 (tool layer, P8 pin). A review is its own evidence kind, and the
 * second gate needs it.
 *
 * A passing check says nothing about dead code or scope that grew; a review
 * says nothing about whether the thing runs. The gate from in_progress to
 * awaiting_verification asks for both, and the agent may author both, so the
 * number of gates a human must satisfy does not change. The review weighs
 * 1.0 per the B0 constant table.
 */

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import {
  asContext,
  createHarness,
  failureJson,
  successJson,
  type Harness,
} from "./b1-harness";

const AUTOMATED_CHECK = "builtin:automated_check";
const REVIEW_PASS = "builtin:review_pass";

describe("review pass is its own kind at the tool layer", () => {
  let harness: Harness;
  let ticketId: number;

  beforeEach(async () => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const created = successJson(
      await harness.runTool("set_ticket", { title: "Needs a review", body: "A body." }),
    );
    ticketId = created.ticketId as number;
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
    successJson(await harness.runTool("move_ticket", { ticketId, to: "in_progress" }));
  });

  async function attach(kind: string) {
    successJson(await harness.runTool("attach_evidence", { ticketId, kind }));
  }

  async function score() {
    const listed = successJson(await harness.runTool("get_tickets", {}));
    const tickets = listed.tickets as Record<string, unknown>[];
    return tickets[0].confidenceScore as number;
  }

  async function state() {
    const listed = successJson(await harness.runTool("get_tickets", {}));
    const tickets = listed.tickets as Record<string, unknown>[];
    return tickets[0].state as string;
  }

  it("a passing check without a review is refused", async () => {
    await attach(AUTOMATED_CHECK);
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.missingKinds).toEqual([REVIEW_PASS]);
    expect(await state()).toBe("in_progress");
  });

  it("a review without a check is refused", async () => {
    await attach(REVIEW_PASS);
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.missingKinds).toEqual([AUTOMATED_CHECK]);
    expect(await state()).toBe("in_progress");
  });

  it("the same ticket moves once the review row exists", async () => {
    await attach(AUTOMATED_CHECK);
    failureJson(await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }));
    await attach(REVIEW_PASS);
    successJson(await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }));
    expect(await state()).toBe("awaiting_verification");
  });

  it("the agent may author the review", async () => {
    await attach(REVIEW_PASS);
    const listed = successJson(await harness.runTool("get_tickets", {}));
    const tickets = listed.tickets as Record<string, unknown>[];
    expect(tickets[0].state).toBe("in_progress");
  });

  it("the review weighs one", async () => {
    const before = await score();
    await attach(REVIEW_PASS);
    expect(await score() - before).toBe(1.0);
  });

  it("a review note does not satisfy the gate", async () => {
    await attach(AUTOMATED_CHECK);
    await attach("builtin:review_note");
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.missingKinds).toEqual([REVIEW_PASS]);
    expect(await state()).toBe("in_progress");
  });
});
