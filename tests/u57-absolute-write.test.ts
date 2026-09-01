/**
 * Ticket #57 regression. The write boundary used to resolve relative
 * allowlist entries against the dsh PROCESS cwd, so a user-approved entry
 * like `src/client/` never matched an absolute write
 * (/home/sid/.../src/client/x.tsx) unless the daemon happened to run from
 * the repo root. The fix resolves relative entries against the AGENT'S
 * SESSION cwd.
 *
 * This test pins the exact scenario: session cwd deliberately different
 * from process cwd, relative entry, absolute target.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";
import { writeBoundaryReason } from "../src/tools/allowlist";

describe("#57 relative allowlist entries resolve against the session cwd", () => {
  it("an absolute write under the session workspace passes with a relative entry", () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as unknown as { service: any }).service;
    const agent = (harness as unknown as { asAgent: () => any }).asAgent();

    // A workspace that is NOT the process cwd.
    const ws = mkdtempSync(join(tmpdir(), "ws57-"));
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;

    const ticket = svc.setTicket(agent, { title: "P11" });
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:user_signoff",
      payload: {},
    });
    svc.userMoveTicket(agent, { ticketId: ticket.id, to: "in_progress" });
    // The approval row first, then the field write — the designed order.
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:file_allowlist",
      payload: { paths: ["src/client/"] },
    });
    svc.userSetTicket(agent, { ticketId: ticket.id, allowlist: ["src/client/"] });

    // The union is workspace-relative; the decision must resolve it against
    // the SESSION cwd (ws), not the process cwd.
    const target = resolve(ws, "src/client", "x.tsx");
    expect(writeBoundaryReason(asContext(harness.ctx), agent, target)).toBeUndefined();

    // Outside the workspace-relative entry still refuses.
    const outside = resolve(ws, "src", "host", "aidos-core.ts");
    expect(writeBoundaryReason(asContext(harness.ctx), agent, outside)).toMatch(/allowlist/);
  });
});
