/**
 * Ticket #459: board WRITE tools must resolve against the workspace board,
 * not the calling session's own fold.
 *
 * The calling session below (the "stranger") created NONE of the tickets it
 * writes to: every write names a ticket that lives only in another live
 * session's log of the same workspace. The board reads (get_tickets,
 * get_ticket) resolve those tickets; the write paths must too.
 *
 * Against the pre-fix code this suite is RED: attach_evidence refuses with
 * `no such ticket`, suggest_actions and request_allowlist refuse with
 * `unknown ticket`, and set_ticket-in-edit-mode refuses with
 * `no such ticket`.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createHarness } from "./b1-harness";
import { RetiredTicketWriteRefused } from "../src/host/aidos-core";

type Harness = ReturnType<typeof createHarness>;

/** One owner session holding a ticket, plus a stranger that created nothing. */
function foreignSetup(): {
  harness: Harness;
  owner: ReturnType<Harness["makeAgent"]>;
  stranger: ReturnType<Harness["makeAgent"]>;
  ticketId: number;
} {
  const ws = mkdtempSync(join(tmpdir(), "ws459-"));
  mkdirSync(join(ws, "src"), { recursive: true });
  const harness = createHarness(undefined, { cwd: ws });
  harness.installService();
  const svc = harness.service;
  const owner = harness.makeAgent({ id: "owner-session" });
  const stranger = harness.makeAgent({ id: "stranger-session" });
  const ticket = svc.setTicket(harness.asAgent(owner), { title: "Foreign ticket" });
  return { harness, owner, stranger, ticketId: ticket.id };
}

describe("#459 a session can write to tickets it did not create", () => {
  it("the reads agree first: the stranger sees the foreign ticket on the board", () => {
    const { harness, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    const board = svc.getTickets(harness.asAgent(stranger));
    expect(board.some((row) => row.id === ticketId)).toBe(true);
    const read = svc.getTicket(harness.asAgent(stranger), { ticketId });
    expect(read.ticket.id).toBe(ticketId);
  });

  it("attach_evidence lands on a ticket the caller did not create", () => {
    const { harness, owner, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    const attached = svc.agentAttachEvidence(harness.asAgent(stranger), {
      ticketId,
      kind: "builtin:test_run",
      payload: { ok: true },
    });
    expect(attached.ticketId).toBe(ticketId);
    // The row is durable on the ticket: the owner reads it back.
    const read = svc.getTicket(harness.asAgent(owner), { ticketId });
    expect(read.evidence.some((row) => row.kind === "builtin:test_run")).toBe(true);
  });

  it("suggest_actions accepts a nomination for a ticket the caller did not create", () => {
    const { harness, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    const result = svc.suggestActions(harness.asAgent(stranger), {
      suggestions: [{ ticketId, actionId: "verify", reason: "please verify this" }],
    });
    expect(result.accepted).toBe(1);
    expect(result.nominations.some((nomination) => nomination.ticketId === ticketId)).toBe(true);
  });

  it("request_allowlist queues a card for a ticket the caller did not create", () => {
    const { harness, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    const result = svc.requestAllowlist(harness.asAgent(stranger), {
      ticketId,
      paths: ["src"],
    });
    expect(result.status).toBe("pending");
    expect(result.ticketId).toBe(ticketId);
  });

  it("set_ticket in edit mode edits a ticket the caller did not create", () => {
    const { harness, owner, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    const row = svc.setTicket(harness.asAgent(stranger), {
      ticketId,
      description: "edited by a session that did not create this ticket",
    });
    expect(row.id).toBe(ticketId);
    const read = svc.getTicket(harness.asAgent(owner), { ticketId });
    expect(read.ticket.description).toBe(
      "edited by a session that did not create this ticket",
    );
  });

  it("digest_recent returns changes for a ticket the caller did not create", () => {
    const { harness, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    svc.agentAttachEvidence(harness.asAgent(stranger), {
      ticketId,
      kind: "builtin:test_run",
      payload: { ok: true },
    });
    const digest = svc.recentChanges(harness.asAgent(stranger), { ticketId });
    expect(digest.changes.length).toBeGreaterThan(0);
    expect(digest.changes.every((change) => change.ticketId === ticketId)).toBe(true);
  });

  it("move_ticket moves a ticket the caller did not create", () => {
    const { harness, owner, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    // The open -> in_progress gate requires a user signoff row; the owner
    // seeds it so this test exercises resolution, not the gate.
    harness.seedEvidence(owner, ticketId, "builtin:user_signoff");
    const moved = svc.agentMoveTicket(harness.asAgent(stranger), {
      ticketId,
      to: "in_progress",
    });
    expect(moved.toState).toBe("in_progress");
    const read = svc.getTicket(harness.asAgent(owner), { ticketId });
    expect(read.ticket.state).toBe("in_progress");
  });

  it("addComment appends to a ticket the caller did not create", () => {
    const { harness, owner, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    const comment = svc.agentAddComment(harness.asAgent(stranger), {
      ticketId,
      text: "a note from a session that did not create this ticket",
    });
    expect(comment.ticketId).toBe(ticketId);
    const read = svc.getTicket(harness.asAgent(owner), { ticketId });
    expect(
      read.comments.some((row) =>
        row.text.includes("did not create this ticket"),
      ),
    ).toBe(true);
  });

  it("a ticket that truly does not exist is still refused", () => {
    const { harness, stranger } = foreignSetup();
    const svc = harness.service;
    const strangerAgent = harness.asAgent(stranger);
    expect(() =>
      svc.agentAttachEvidence(strangerAgent, {
        ticketId: 999999,
        kind: "builtin:test_run",
        payload: {},
      }),
    ).toThrow(/no such ticket|unknown ticket/);
    expect(() =>
      svc.setTicket(strangerAgent, { ticketId: 999999, description: "ghost" }),
    ).toThrow(/no such ticket|unknown ticket/);
    expect(() =>
      svc.suggestActions(strangerAgent, {
        suggestions: [{ ticketId: 999999, actionId: "verify", reason: "ghost" }],
      }),
    ).toThrow(/no such ticket|unknown ticket/);
    expect(() =>
      svc.requestAllowlist(strangerAgent, { ticketId: 999999, paths: ["src"] }),
    ).toThrow(/no such ticket|unknown ticket/);
  });

  it("retired tickets still refuse stranger writes", () => {
    const { harness, owner, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    svc.userRetireTicket(harness.asAgent(owner), { ticketId, reason: "hidden" });
    const strangerAgent = harness.asAgent(stranger);
    expect(() =>
      svc.setTicket(strangerAgent, { ticketId, description: "ghost edit" }),
    ).toThrow(RetiredTicketWriteRefused);
    expect(() =>
      svc.suggestActions(strangerAgent, {
        suggestions: [{ ticketId, actionId: "verify", reason: "ghost ask" }],
      }),
    ).toThrow(/is retired/);
    expect(() =>
      svc.requestAllowlist(strangerAgent, { ticketId, paths: ["src"] }),
    ).toThrow(/retired/);
    expect(() =>
      svc.agentMoveTicket(strangerAgent, { ticketId, to: "in_progress" }),
    ).toThrow(RetiredTicketWriteRefused);
    expect(() =>
      svc.agentAddComment(strangerAgent, { ticketId, text: "ghost note" }),
    ).toThrow(RetiredTicketWriteRefused);
  });
});
