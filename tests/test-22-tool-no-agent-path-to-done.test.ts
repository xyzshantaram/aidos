/**
 * Item 22 (tool layer). The agent has no path to done, whatever evidence it
 * attaches.
 *
 * SPEC-B1.md decision 5: `move_ticket` refuses `awaiting_verification ->
 * done` for any agent; the refusal names the missing kind or the allowed
 * actors (test_22, P22). Decision 6: a plan import of an all-done document
 * lands every ticket in `open` with the claim as evidence only — one
 * `builtin:imported_state` row per ticket, author system.
 */

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import type { EvidenceAttachedEvent } from "../src/kernel/events";
import {
  AGENT_AUTHORABLE_KINDS,
  asContext,
  createHarness,
  failureJson,
  successJson,
  type Harness,
} from "./b1-harness";

/** Every ticket carries the done mark. None of them may land in "done". */
const ALL_DONE_PLAN = `- [x] **Ticket 1: First claim.** A body.

  **Evaluate:**

  - A test passes.
- [x] **Ticket 2: Second claim.** A body.

  **Evaluate:**

  - A test passes.
`;

describe("no agent path to done", () => {
  let harness: Harness;
  let ticketId: number;

  /** Drive one ticket to awaiting_verification through the tools. */
  async function driveToAwaitingVerification() {
    const created = successJson(await harness.runTool("set_ticket", { title: "Ticket one", body: "A body." }));
    ticketId = created.ticketId as number;
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
    successJson(await harness.runTool("move_ticket", { ticketId, to: "in_progress" }));
    for (const kind of AGENT_AUTHORABLE_KINDS) {
      successJson(await harness.runTool("attach_evidence", { ticketId, kind }));
    }
    successJson(await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }));
  }

  beforeEach(() => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
  });

  it("the setup reaches awaiting_verification", async () => {
    await driveToAwaitingVerification();
    const listed = successJson(await harness.runTool("get_tickets", {}));
    const tickets = listed.tickets as Record<string, unknown>[];
    expect(tickets[0].state).toBe("awaiting_verification");
  });

  it("done is refused with every agent kind attached", async () => {
    await driveToAwaitingVerification();
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "done" }),
    );
    expect(refusal.error).toBe("gate_refused");
  });

  it("the refusal names the missing kind or the allowed actors", async () => {
    await driveToAwaitingVerification();
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "done" }),
    );
    const missing = refusal.missingKinds as string[];
    const allowed = refusal.allowedActors as string[];
    expect(missing.length > 0 || allowed.length > 0).toBe(true);
    if (missing.length > 0) {
      expect(missing).toContain("builtin:user_verified");
    }
    if (allowed.length > 0) {
      expect([...allowed].sort()).toEqual(["user"]);
    }
  });

  it("the ticket stays in awaiting_verification", async () => {
    await driveToAwaitingVerification();
    failureJson(await harness.runTool("move_ticket", { ticketId, to: "done" }));
    const listed = successJson(await harness.runTool("get_tickets", {}));
    const tickets = listed.tickets as Record<string, unknown>[];
    expect(tickets[0].state).toBe("awaiting_verification");
  });

  it("done is refused from the earlier states", async () => {
    const created = successJson(await harness.runTool("set_ticket", { title: "Still open", body: "A body." }));
    const openTicket = created.ticketId as number;

    const fromOpen = failureJson(
      await harness.runTool("move_ticket", { ticketId: openTicket, to: "done" }),
    );
    expect(fromOpen.error).toBe("gate_refused");
    expect(fromOpen.fromState).toBe("open");
    expect(fromOpen.toState).toBe("done");

    harness.seedEvidence(harness.agent, openTicket, "builtin:user_signoff");
    successJson(await harness.runTool("move_ticket", { ticketId: openTicket, to: "in_progress" }));

    const fromInProgress = failureJson(
      await harness.runTool("move_ticket", { ticketId: openTicket, to: "done" }),
    );
    expect(fromInProgress.error).toBe("gate_refused");
    expect(fromInProgress.fromState).toBe("in_progress");
    expect(fromInProgress.toState).toBe("done");
  });

  it("a plan import cannot produce a done ticket", async () => {
    const importer = createHarness();
    importer.installService();
    const planFile = importer.tempPlanFile(ALL_DONE_PLAN);
    apply(asContext(importer.ctx), {});

    const imported = successJson(await importer.runTool("plan_import", { file: planFile }));
    expect(imported.ok).toBe(true);
    const tickets = imported.tickets as number[];
    expect(tickets.length).toBe(2);

    const listed = successJson(await importer.runTool("get_tickets", {}));
    const rows = listed.tickets as Record<string, unknown>[];
    expect(rows.map((row) => row.state)).toEqual(["open", "open"]);
  });

  it("an import keeps the done claim as evidence only", async () => {
    const importer = createHarness();
    importer.installService();
    const planFile = importer.tempPlanFile(ALL_DONE_PLAN);
    apply(asContext(importer.ctx), {});

    successJson(await importer.runTool("plan_import", { file: planFile }));

    const rows = importer
      .aidosEvents(importer.agent)
      .filter((event) => event.kind === "evidence/attached")
      .map((event) => (event as EvidenceAttachedEvent).row);
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(row.kind).toBe("builtin:imported_state");
      expect(row.author).toBe("system");
      expect(row.payload).toEqual({ claimed_state: "done", source: planFile });
    }
  });
});
