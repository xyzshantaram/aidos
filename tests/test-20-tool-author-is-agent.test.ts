/**
 * Item 20 (tool layer). The tool stores the author "agent". No payload key
 * changes it.
 *
 * SPEC-B1.md decision 1: the service stamps `actor: "agent"` from the entry
 * point, never from the payload. A payload key named `author` or `actor` is
 * data, not an instruction. The kernel event vocabulary has no ticket author
 * field (the actor rides the write call), so the stored-author claim ports to
 * the evidence row the log records. Every tool result is JSON (decision 2).
 */

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import type { EvidenceAttachedEvent } from "../src/kernel/events";
import {
  asContext,
  createHarness,
  successJson,
  failureJson,
  type Harness,
} from "./b1-harness";

/** The aidos evidence rows one session log holds, oldest first. */
function evidenceRows(harness: Harness) {
  return harness
    .aidosEvents(harness.agent)
    .filter((event) => event.kind === "evidence/attached")
    .map((event) => (event as EvidenceAttachedEvent).row);
}

describe("the author is the agent, never the payload", () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
  });

  it("a new ticket is created through the tool and every result is JSON", async () => {
    const created = successJson(
      await harness.runTool("set_ticket", { title: "Ticket one", body: "A body." }),
    );
    expect(created.ok).toBe(true);
    const ticketId = created.ticket as Record<string, unknown>;
    expect(ticketId.id).toBe(1);
    expect(ticketId.state).toBe("open");

    const listed = successJson(await harness.runTool("get_tickets", {}));
    expect(listed.ok).toBe(true);
    const tickets = listed.tickets as Record<string, unknown>[];
    expect(tickets.length).toBe(1);
    expect(tickets[0].title).toBe("Ticket one");
  });

  it("a payload author key does not change the stored author", async () => {
    const created = successJson(await harness.runTool("set_ticket", { title: "T" }));
    const ticketId = (created.ticket as Record<string, unknown>).id as number;

    successJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "builtin:test_run",
        payload: { author: "user", note: "one" },
      }),
    );

    const rows = evidenceRows(harness);
    expect(rows.length).toBe(1);
    expect(rows[0].author).toBe("agent");
  });

  it("a payload actor key does not change the stored author", async () => {
    const created = successJson(await harness.runTool("set_ticket", { title: "T" }));
    const ticketId = (created.ticket as Record<string, unknown>).id as number;

    successJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "builtin:test_run",
        payload: { actor: "user", note: "two" },
      }),
    );

    const rows = evidenceRows(harness);
    expect(rows.length).toBe(1);
    expect(rows[0].author).toBe("agent");
  });

  it("the payload is stored without a change", async () => {
    const created = successJson(await harness.runTool("set_ticket", { title: "T" }));
    const ticketId = (created.ticket as Record<string, unknown>).id as number;
    const payload = { author: "user", actor: "user", note: "three" };

    successJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "builtin:test_run",
        payload,
      }),
    );

    const rows = evidenceRows(harness);
    expect(rows[0].payload).toEqual(payload);
  });

  it("every evidence row the tools author carries the agent", async () => {
    const created = successJson(await harness.runTool("set_ticket", { title: "T" }));
    const ticketId = (created.ticket as Record<string, unknown>).id as number;
    successJson(
      await harness.runTool("set_ticket", { ticketId, title: "New" }),
    );
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "builtin:test_run" }),
    );
    // A refused move still renders JSON and appends no evidence.
    failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "in_progress" }),
    );

    for (const row of evidenceRows(harness)) {
      expect(row.author).toBe("agent");
    }
  });

  it("a refusal is JSON, never a traceback", async () => {
    const created = successJson(await harness.runTool("set_ticket", { title: "T" }));
    const ticketId = (created.ticket as Record<string, unknown>).id as number;
    const refusal = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "in_progress" }),
    );
    expect(refusal.error).toBe("gate_refused");
    expect(refusal.fromState).toBe("open");
    expect(refusal.toState).toBe("in_progress");
  });
});
