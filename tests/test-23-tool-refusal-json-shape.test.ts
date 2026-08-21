/**
 * Item 23 (tool layer). A refusal renders JSON that names the states and the
 * reason.
 *
 * SPEC-B1.md section 7 pins the `gate_refused` shape: `fromState`, `toState`,
 * `missingKinds`, `allowedActors`, `message`. An unknown ticket gives a
 * structured refusal that names the id, never a traceback (P29).
 */

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import {
  asContext,
  createHarness,
  failureJson,
  failureWithCode,
  successJson,
  type Harness,
} from "./b1-harness";

describe("refusal shape at the tool layer", () => {
  let harness: Harness;
  let ticketId: number;

  beforeEach(async () => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const created = successJson(await harness.runTool("set_ticket", { title: "T" }));
    ticketId = (created.ticket as Record<string, unknown>).id as number;
  });

  it("a refused move renders the gate_refused shape", async () => {
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "in_progress" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.fromState).toBe("open");
    expect(refusal.toState).toBe("in_progress");
    expect(refusal.missingKinds).toEqual(["builtin:user_signoff"]);
    expect(Array.isArray(refusal.allowedActors)).toBe(true);
    expect(typeof refusal.message).toBe("string");
  });

  it("a refusal names the allowed actors", async () => {
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
    successJson(await harness.runTool("move_ticket", { ticketId, to: "in_progress" }));
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "builtin:automated_check" }),
    );
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "builtin:review_pass" }),
    );
    successJson(await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }));

    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "done" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.fromState).toBe("awaiting_verification");
    expect(refusal.toState).toBe("done");
    expect([...(refusal.allowedActors as string[])].sort()).toEqual(["user"]);
  });

  it("an unknown ticket gives JSON and not a traceback", async () => {
    const outcome = await harness.runTool("move_ticket", { ticketId: 999, to: "done" });
    const refusal = failureJson(outcome);
    expect(refusal.error).toBe("unknown_ticket");
    expect(String(refusal.message)).toContain("999");
  });

  it("a refused move changes no state", async () => {
    failureWithCode(
      await harness.runTool("move_ticket", { ticketId, to: "in_progress" }),
      "gate_refused",
    );
    const listed = successJson(await harness.runTool("get_tickets", {}));
    const tickets = listed.tickets as Record<string, unknown>[];
    expect(tickets[0].state).toBe("open");
  });
});
