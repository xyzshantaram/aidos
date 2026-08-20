/**
 * The log-backed service (SPEC-B1.md sections 6 and 9, the C2 evaluate).
 *
 * Appends land in the session log as the aidos event types; the invariant
 * companion rejects a corrupt record before the log changes; deleting the
 * projections and rebuilding from the log yields identical state; and the
 * author stamping lives in the service — a payload author key never becomes
 * the stored author, because no code path outside the write boundary can set
 * one.
 */

import { describe, expect, it } from "vitest";

import { InvariantError } from "@deepseek-ai/dsh-invariants";
import type { Context } from "@deepseek-ai/cordis";

import type { AidosEvent, EvidenceAttachedEvent } from "../src/kernel/events";
import { createHarness, asContext, type Harness } from "./b1-harness";

/** The B0 event vocabulary the service appends through. */
const AIDOS_EVENT_KINDS = [
  "ticket/change",
  "evidence/attached",
  "plan/change",
  "comment/added",
  "aidos/refusal",
  "project/created",
  "project/moved",
  "phase/set",
];

describe("the aidos-core service", () => {
  it("appends land in the session log as the aidos event types", () => {
    const harness = createHarness();
    const service = harness.installService();

    const ticket = service.setTicket(harness.asAgent(), { title: "T" });
    service.attachEvidence(harness.asAgent(), {
      ticketId: ticket.id,
      kind: "builtin:test_run",
    });
    harness.seedEvidence(harness.agent, ticket.id, "builtin:user_signoff");
    expect(() =>
      service.moveTicket(harness.asAgent(), { ticketId: ticket.id, to: "in_progress" }),
    ).not.toThrow();

    const events = harness.aidosEvents(harness.agent);
    expect(events.length).toBeGreaterThanOrEqual(4);
    for (const event of events) {
      expect(AIDOS_EVENT_KINDS).toContain(event.kind);
    }
    const creates = events.filter(
      (event) => event.kind === "ticket/change" && event.operation === "create",
    );
    const moves = events.filter(
      (event): event is Extract<AidosEvent, { kind: "ticket/change" }> =>
        event.kind === "ticket/change" && event.operation === "move",
    );
    const evidence = events.filter((event) => event.kind === "evidence/attached");
    expect(creates.length).toBe(1);
    expect(moves.length).toBe(1);
    expect(moves[0].ticket.state).toBe("in_progress");
    expect(evidence.length).toBe(2);
  });

  it("the invariant accepts a valid log and rejects a corrupt record", async () => {
    const fail = (message: string): never => {
      throw new InvariantError("aidos", message);
    };

    // A valid log folds without a failure.
    const valid = createHarness();
    valid.installService();
    valid.service.setTicket(valid.asAgent(), { title: "T" });
    const validRegistration = valid.invariants.find(
      (entry) => entry.packageName === "aidos",
    );
    expect(validRegistration).toBeDefined();
    await (async () =>
      (validRegistration as NonNullable<typeof validRegistration>).installer(
        asContext(valid.ctx),
        fail,
      ))();

    // One corrupt record in the stream makes the installer fail, and the
    // rejection changes no log. The record is injected before the installer
    // runs, so no listener observes it during the injection.
    const corrupt = createHarness();
    corrupt.installService();
    corrupt.service.setTicket(corrupt.asAgent(), { title: "T" });
    const before = corrupt.session.events.length;
    corrupt.session.appendRaw({
      type: "ticket/change",
      seq: before,
      time: 1000,
      data: {
        kind: "ticket/change",
        version: 2,
        operation: "create",
        ticket: { id: 99, projectId: 1, title: "Bad" },
        at: 1000,
      },
    } as never);
    const beforeRun = corrupt.session.events.length;
    const corruptRegistration = corrupt.invariants.find(
      (entry) => entry.packageName === "aidos",
    );
    await expect(
      (async () =>
        (corruptRegistration as NonNullable<typeof corruptRegistration>).installer(
          asContext(corrupt.ctx),
          fail,
        ))(),
    ).rejects.toThrow(InvariantError);
    // The rejection itself appends nothing: the log is unchanged by the run.
    expect(corrupt.session.events.length).toBe(beforeRun);
  });

  it("rebuilding from the log yields identical state", () => {
    const harness = createHarness();
    const service = harness.installService();
    const first = service.setTicket(harness.asAgent(), { title: "One", body: "A" });
    const second = service.setTicket(harness.asAgent(), { title: "Two", phase: 2 });
    service.attachEvidence(harness.asAgent(), {
      ticketId: first.id,
      kind: "builtin:test_run",
      payload: { n: 1 },
    });
    harness.seedEvidence(harness.agent, first.id, "builtin:user_signoff");
    service.moveTicket(harness.asAgent(), { ticketId: first.id, to: "in_progress" });

    const before = service.getTickets(harness.asAgent());
    expect(before.length).toBe(2);

    // A fresh session replays the same log; the projections rebuild from it.
    const rebuilt = createHarness();
    for (const event of harness.aidosEvents(harness.agent)) {
      rebuilt.appendAidosEvent(rebuilt.agent, event);
    }
    const rebuiltService = rebuilt.installService();
    const after = rebuiltService.getTickets(rebuilt.asAgent());

    expect(after).toEqual(before);
    expect(after.map((row) => row.title)).toEqual(["One", "Two"]);
    expect(after.find((row) => row.id === first.id)?.state).toBe("in_progress");
    void second;
  });

  it("the author is stamped by the service, never the payload", () => {
    const harness = createHarness();
    const service = harness.installService();
    const ticket = service.setTicket(harness.asAgent(), { title: "T" }).id;

    service.attachEvidence(harness.asAgent(), {
      ticketId: ticket,
      kind: "builtin:test_run",
      payload: { author: "user", actor: "user", note: "three" },
    });

    const rows = harness
      .aidosEvents(harness.agent)
      .filter((event) => event.kind === "evidence/attached")
      .map((event) => (event as EvidenceAttachedEvent).row);
    expect(rows.length).toBe(1);
    expect(rows[0].author).toBe("agent");
    expect(rows[0].payload).toEqual({ author: "user", actor: "user", note: "three" });
  });

  it("the service is reachable as ctx.aidos after construction", () => {
    const harness = createHarness();
    expect(harness.ctx.aidos).toBeUndefined();
    const service = harness.installService();
    expect(harness.ctx.aidos).toBe(service);
    expect(harness.ctx.get("aidos")).toBe(service);
  });
});
