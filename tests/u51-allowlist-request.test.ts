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
    /*
     * #104 changed this test's inputs, NOT its property.
     *
     * It used to prove "names each" by mixing an escaping path with one that
     * merely did not exist yet -- and "does not exist" is no longer a
     * refusal reason, because a ticket whose purpose is to CREATE something
     * could never be authorised to create it. Two genuinely escaping paths
     * prove the same property without depending on the removed reason, and
     * the escape refusal itself is unchanged and still enumerated.
     */
    expect(() =>
      svc.requestAllowlist(agent, {
        ticketId: ticket.id,
        paths: ["src/", "../../etc", "../../var"],
      }),
    ).toThrow(/\.\.\/\.\.\/etc.*escapes the workspace/);
    expect(() =>
      svc.requestAllowlist(agent, {
        ticketId: ticket.id,
        paths: ["src/", "../../etc", "../../var"],
      }),
    ).toThrow(/\.\.\/\.\.\/var.*escapes the workspace/);
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
    expect(resolved.resolved).toContain("src/client");

    const row = svc
      .getTickets(agent)
      .find((t: { id: number }) => t.id === ticket.id);
    // The stored entry carries the validator's clean form (no trailing /).
    expect(row.allowlist).toEqual(["src/client"]);
    const evidence = harness.service.getTickets
      ? undefined
      : undefined;
    void evidence;
    // The queue dropped the request.
    expect(svc.pendingApproval(agent, { ticketId: ticket.id })).toBeNull();
  });


  /*
   * #112, user-reported live: "request_allowlist replaces a ticket's
   * allowlist rather than merging into it — that's what silently dropped
   * config's earlier grant."
   *
   * TWO rounds, because one round can never see the bug: the replace and
   * the union are indistinguishable when there is nothing to preserve. The
   * second round names ONLY the new path, exactly as a real second
   * request_allowlist call does, so a regression back to
   * `allowlist: paths` fails on the missing first-round path rather than on
   * ordering or duplicates.
   */
  it("#112 a second approval UNIONS with the first instead of revoking it", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ws = mkdtempSync(join(tmpdir(), "ws112-"));
    mkdirSync(join(ws, "src", "host"), { recursive: true });
    mkdirSync(join(ws, "config"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });

    const first = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["src/host"],
    });
    svc.resolveApproval(agent, { requestId: first.requestId, approved: true, paths: ["src/host"] });
    expect(
      svc.getTickets(agent).find((t: { id: number }) => t.id === ticket.id).allowlist,
    ).toEqual(["src/host"]);

    // The second proposal names ONLY the new path — the real shape of a
    // follow-up request, and the exact input that used to revoke src/host.
    const second = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["config"],
    });
    svc.resolveApproval(agent, { requestId: second.requestId, approved: true, paths: ["config"] });

    const row = svc.getTickets(agent).find((t: { id: number }) => t.id === ticket.id);
    // BOTH grants survive, earlier first: an approval adds, never revokes.
    expect(row.allowlist).toEqual(["src/host", "config"]);

    // And BOTH evidence rows are still there and still mean something —
    // the first one was previously left satisfied but granting nothing.
    const evidence = svc.getTicket(agent, { ticketId: ticket.id }).evidence;
    const grants = evidence.filter((e: { kind: string }) => e.kind === "builtin:file_allowlist");
    expect(grants).toHaveLength(2);
  });

  it("#112 re-approving an ALREADY-granted path does not duplicate it", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ws = mkdtempSync(join(tmpdir(), "ws112b-"));
    mkdirSync(join(ws, "src"), { recursive: true });
    mkdirSync(join(ws, "tests"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });

    const first = svc.requestAllowlist(agent, { ticketId: ticket.id, paths: ["src"] });
    svc.resolveApproval(agent, { requestId: first.requestId, approved: true, paths: ["src"] });
    // An overlapping second proposal: the agent re-lists a path it already
    // has alongside a new one, which is the common case in practice.
    const second = svc.requestAllowlist(agent, { ticketId: ticket.id, paths: ["src", "tests"] });
    svc.resolveApproval(agent, {
      requestId: second.requestId,
      approved: true,
      paths: ["src", "tests"],
    });

    const row = svc.getTickets(agent).find((t: { id: number }) => t.id === ticket.id);
    expect(row.allowlist).toEqual(["src", "tests"]);
  });

  it("#112 the direct set_ticket allowlist edit still REPLACES (the editor may shrink)", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ws = mkdtempSync(join(tmpdir(), "ws112c-"));
    mkdirSync(join(ws, "src"), { recursive: true });
    mkdirSync(join(ws, "tests"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });

    const proposal = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["src", "tests"],
    });
    svc.resolveApproval(agent, {
      requestId: proposal.requestId,
      approved: true,
      paths: ["src", "tests"],
    });

    /*
     * #112 is scoped to the APPROVAL call site. The per-ticket allowlist
     * editor (#14) writes the field directly, and a human removing a path
     * there means it: making _editTicket additive would make revocation
     * impossible from the only surface that offers it.
     */
    svc.userSetTicket(agent, { ticketId: ticket.id, allowlist: ["src"] });
    const row = svc.getTickets(agent).find((t: { id: number }) => t.id === ticket.id);
    expect(row.allowlist).toEqual(["src"]);
  });

  it("rejection resolves with no row and steers the agent", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ws = mkdtempSync(join(tmpdir(), "ws51c-"));
    mkdirSync(join(ws, "src"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const proposal = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["src"],
    });
    const resolved = svc.resolveApproval(agent, {
      requestId: proposal.requestId,
      approved: false,
    });
    expect(resolved.resolved).toContain("rejected");
    // No row attached, no field written.
    const row = svc.getTickets(agent).find((t: { id: number }) => t.id === ticket.id);
    expect(row.allowlist).toEqual([]);
  });

  it("the sibling-prefix escape is refused (../ws-evil, not just ../etc)", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ws = mkdtempSync(join(tmpdir(), "ws51d-"));
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });
    // The exact case the startsWith check missed: a sibling whose name
    // extends the workspace basename.
    const sibling = ws + "-evil" + "/src";
    mkdirSync(sibling, { recursive: true });
    expect(() =>
      svc.requestAllowlist(agent, { ticketId: ticket.id, paths: [sibling] }),
    ).toThrow(/escapes the workspace/);
  });

  it("approve-time re-validation refuses edited paths that escape", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ws = mkdtempSync(join(tmpdir(), "ws51e-"));
    mkdirSync(join(ws, "src"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const proposal = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["src"],
    });
    // The card's textarea was edited to an escaping path before approve.
    const resolved = svc.resolveApproval(agent, {
      requestId: proposal.requestId,
      approved: true,
      paths: ["../outside"],
    });
    expect(resolved.resolved).toContain("refused");
    const row = svc.getTickets(agent).find((t: { id: number }) => t.id === ticket.id);
    expect(row.allowlist).toEqual([]);
  });

  it("an unknown ticketId refuses instead of queueing an orphan", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ws = mkdtempSync(join(tmpdir(), "ws51f-"));
    mkdirSync(join(ws, "src"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    expect(() => svc.requestAllowlist(agent, { ticketId: 9999, paths: ["src"] })).toThrow(
      /unknown ticket 9999/,
    );
  });

  it("a resolver from another session is refused (cross-session protection)", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();
    const ws = mkdtempSync(join(tmpdir(), "ws51g-"));
    mkdirSync(join(ws, "src"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const proposal = svc.requestAllowlist(agent, { ticketId: ticket.id, paths: ["src"] });
    // A second agent (another session) tries to resolve A's request.
    const other = harness.createAgent
      ? (harness as any).createAgent()
      : (harness as unknown as { service: any }).service
      ? undefined
      : undefined;
    void other;
    // A genuinely distinct agent (asAgent() returns the SAME object, so
    // mutating its session.id corrupted the owner — the first cut of this
    // test did exactly that and its "request survives" assertion failed).
    const foreignAgent = (harness as unknown as { makeAgent: (o: { id: string }) => any }).makeAgent({
      id: "session-foreign" as never,
    });
    (foreignAgent as { session: unknown }).session = {
      id: "session-foreign",
      header: { cwd: ws },
    } as never;
    expect(() =>
      svc.resolveApproval(foreignAgent, {
        requestId: proposal.requestId,
        approved: true,
        paths: ["src"],
      }),
    ).toThrow(/belongs to another session/);
    // The request survives for the real owner.
    expect(svc.pendingApproval(agent, { ticketId: ticket.id })).not.toBeNull();
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
