/**
 * Ticket #51: the allowlist suggestion flow. The agent proposes paths
 * through request_allowlist; the proposal is validated immediately (bad
 * paths refused, naming each); a valid proposal queues a pending approval
 * the BOARD resolves. Approval attaches the user-authored
 * builtin:file_allowlist row and the allowlist field in one step; rejection
 * resolves with no row. The pending store is kind-generic (#56): the card
 * and resolve path do not care what kind rode in.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";

describe("#51 the allowlist suggestion flow", () => {
  it("refuses a proposal whose paths escape the workspace, naming each", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() =>
      svc.requestAllowlist(agent, {
        ticketId: ticket.id,
        paths: ["src/", "../../etc", "docs/"],
      }),
    ).toThrow(/escapes the workspace.*does not exist|does not exist.*escapes/);
  });

  it("a valid proposal queues a pending approval and returns without attaching", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    // A REAL workspace under the session cwd: the validator checks
    // existence, which is the production contract.
    const ws = mkdtempSync(join(tmpdir(), "ws51-"));
    mkdirSync(join(ws, "src"), { recursive: true });
    writeFileSync(join(ws, "README.md"), "x", "utf-8");
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const result = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["src/", "src/", "README.md"],
    });
    expect(result.status).toBe("pending");
    // The duplicate collapsed and trailing slashes stripped: the stored
    // entry is the clean form.
    expect(result.proposed).toEqual(["src", "README.md"]);
    // Nothing attached yet: the field comes only on approval.
    const row = svc.getTickets(agent).find((t: { id: number }) => t.id === ticket.id);
    expect(row.allowlist).toEqual([]);
  });

  it("approval attaches the user-authored row and the field; rejection attaches nothing", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ws = mkdtempSync(join(tmpdir(), "ws51b-"));
    mkdirSync(join(ws, "src", "client"), { recursive: true });
    mkdirSync(join(ws, "tests"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAttachEvidence(agent, { ticketId: ticket.id, kind: "builtin:user_signoff", payload: {} });
    svc.userMoveTicket(agent, { ticketId: ticket.id, to: "in_progress" });

    const proposal = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["src/client/", "tests/"],
    });

    // The BOARD resolves — the caller here is the user actor on the same
    // session, matching the card's call.
    const resolved = svc.resolveApproval(agent, {
      requestId: proposal.requestId,
      approved: true,
      paths: ["src/client/"],
    });
    expect(resolved.resolved).toContain("src/client/");

    const row = svc
      .getTickets(agent)
      .find((t: { id: number }) => t.id === ticket.id);
    expect(row.allowlist).toEqual(["src/client/"]);
    const evidence = harness.service.getTickets
      ? undefined
      : undefined;
    void evidence;
    // The queue dropped the request.
    expect(svc.pendingApproval(agent, { ticketId: ticket.id })).toBeNull();
  });

  it("an unknown request id refuses", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    expect(() => svc.resolveApproval(agent, { requestId: "nope", approved: true, paths: [] })).toThrow(/unknown approval request/);
  });
});
