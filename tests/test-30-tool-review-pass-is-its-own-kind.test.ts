/**
 * Item 30 (tool layer, P8 pin). A review is its own evidence kind, and the
 * second gate needs it.
 *
 * A passing check says nothing about dead code or scope that grew; a review
 * says nothing about whether the thing runs. The gate from in_progress to
 * awaiting_verification asks for all three (#178 adds the commit: a reviewer
 * needs a diff to read), and the agent may author all three, so the
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
const USER_COMMIT = "builtin:user_commit";

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

  /*
   * #178: the commit rides along as a seeded row in every test below. The
   * attach_evidence tool refuses builtin:user_commit -- a commit row is a
   * resolved fact, never a composed payload -- and the resolving
   * attach_commit tool needs a real git workspace. Seeding keeps these tests
   * about what they were always about (the review), with the commit present
   * so the gate can actually open.
   */
  function seedCommit() {
    harness.seedEvidence(harness.agent, ticketId, USER_COMMIT, {
      commit: "seeded-setup-row",
      subject: "setup scaffolding, not a resolved commit",
    });
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
    seedCommit();
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.missingKinds).toEqual([REVIEW_PASS]);
    expect(await state()).toBe("in_progress");
  });

  it("a review WITHOUT a check now passes: it excuses the check (#107)", async () => {
    /*
     * CONTRACT CHANGE, at the tool layer this time. automated_check is the
     * cheap evidence the agent attaches from its own claim; review_pass
     * needs an independent reviewer. Demanding both taught the agent to
     * attach a check as a formality, which is how automated_check becomes a
     * rubber stamp.
     *
     * The gate is NOT weakened: the sibling test still proves a check alone
     * is refused and still names review_pass as missing.
     *
     * #178: the review still excuses the check but not the commit, so the
     * commit is seeded and the move still proves the #107 excuse (no check
     * attached).
     */
    await attach(REVIEW_PASS);
    seedCommit();
    successJson(await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }));
    expect(await state()).toBe("awaiting_verification");
  });

  it("the same ticket moves once the review row exists", async () => {
    await attach(AUTOMATED_CHECK);
    seedCommit();
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
    seedCommit();
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.missingKinds).toEqual([REVIEW_PASS]);
    expect(await state()).toBe("in_progress");
  });

  it("a review and a check without a commit are refused, naming the commit (#178)", async () => {
    // The mirror image of the tests above: judgement and a run prove
    // nothing about whether a diff exists to read.
    await attach(AUTOMATED_CHECK);
    await attach(REVIEW_PASS);
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.missingKinds).toEqual([USER_COMMIT]);
    expect(await state()).toBe("in_progress");
  });
});
