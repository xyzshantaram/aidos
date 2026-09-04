/**
 * Item 27 (tool layer). The agent walks the lifecycle as far as a machine may
 * go; the last gate stays shut.
 *
 * The tool creates the ticket and makes every move it may make. The board
 * supplies the human evidence through the user actor (the harness seeds the
 * row, as the board would). The final move to done refuses for any agent.
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

describe("lifecycle with the human half blocked", () => {
  let harness: Harness;
  let ticketId: number;

  beforeEach(async () => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const created = successJson(
      await harness.runTool("set_ticket", { title: "Walk the lifecycle", body: "A body." }),
    );
    ticketId = created.ticketId as number;
  });

  async function stateOf() {
    const listed = successJson(await harness.runTool("get_tickets", {}));
    const tickets = listed.tickets as Record<string, unknown>[];
    return tickets[0].state as string;
  }

  async function reachInProgress() {
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
    successJson(await harness.runTool("move_ticket", { ticketId, to: "in_progress" }));
  }

  async function reachAwaitingVerification() {
    await reachInProgress();
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "builtin:automated_check" }),
    );
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "builtin:review_pass" }),
    );
    successJson(await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }));
  }

  it("a new ticket starts open", async () => {
    expect(await stateOf()).toBe("open");
  });

  it("the move out of open needs a signoff", async () => {
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "in_progress" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.missingKinds).toEqual(["builtin:user_signoff"]);
    expect(await stateOf()).toBe("open");
  });

  it("the tool cannot supply the signoff itself", async () => {
    const refusal = failureJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "builtin:user_signoff" }),
    );
    expect(refusal.error).toBe("human_only_kind");
    expect(refusal.kind).toBe("builtin:user_signoff");
    expect(await stateOf()).toBe("open");
  });

  it("the agent reaches in progress after a human signoff", async () => {
    failureJson(await harness.runTool("move_ticket", { ticketId, to: "in_progress" }));
    await reachInProgress();
    expect(await stateOf()).toBe("in_progress");
  });

  it("the agent reaches awaiting verification", async () => {
    await reachAwaitingVerification();
    expect(await stateOf()).toBe("awaiting_verification");
  });

  it("a review alone now makes the second move: it excuses the check (#107)", async () => {
    await reachInProgress();
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "builtin:review_pass" }),
    );
    /*
     * #107 CONTRACT CHANGE: a review_pass now EXCUSES the machine check, so
     * this no longer refuses.
     *
     * An earlier version of this comment said the converse property was
     * "asserted below". IT WAS NOT -- there is no such assertion in this
     * file, and the #107 review caught the claim (finding 2). A comment
     * asserting coverage that does not exist is worse than no comment,
     * because it stops the next reader looking.
     *
     * Where it IS asserted: tests/test-30-review-pass-is-its-own-kind.test.ts
     * and its tool twin both keep "a passing check without a review is
     * refused", and tests/u107-check-excused-by-review.test.ts asserts
     * missingFor([CHECK]) === [PASS]. So the excuse is directional and the
     * expensive evidence stays mandatory -- just not in THIS file, which is
     * a net coverage reduction here rather than the like-for-like swap the
     * old comment implied.
     */
    successJson(await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }));
    expect(await stateOf()).toBe("awaiting_verification");
  });

  it("done stays blocked", async () => {
    await reachAwaitingVerification();
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "done" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.fromState).toBe("awaiting_verification");
    expect(refusal.toState).toBe("done");
    expect([...(refusal.allowedActors as string[])].sort()).toEqual(["user"]);
    expect(await stateOf()).toBe("awaiting_verification");
  });
});
