/**
 * #110: the write boundary is LEXICAL, and that is a decision, not a bug.
 *
 * The #104 review found it: `isUnder` compares resolved STRINGS and never
 * calls realpath/lstat/readlink, so a symlink inside an allowlisted path
 * that points outside the workspace is not detected. The user settled the
 * threat model in the same session -- "it's not intended to guard against a
 * malicious/poisoned model, just a dumb one" -- so this ships as a
 * disclosure rather than a fix.
 *
 * WHY THESE TESTS EXIST, given that the ticket is documentation-only.
 *
 * A test that greps the source for the comment would be worthless: it would
 * pass whatever the code did, which is the exact "passes for the wrong
 * reason" failure three reviews have caught in this repo already. So these
 * pin the BEHAVIOUR the comment describes, with a real symlink on a real
 * filesystem.
 *
 * That makes them load-bearing in an unusual direction. They FAIL if someone
 * later makes the boundary resolve real paths. That is deliberate: the
 * failure lands them in this file, which sends them to `isUnder`'s comment
 * and to the two conditions that would justify the change. Changing the
 * behaviour is allowed. Changing it silently is not.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, symlinkSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";
import { writeBoundaryReason } from "../src/tools/allowlist";

/** A workspace with `escape/` allowlisted, where `escape` links elsewhere. */
function workspaceWithEscapingLink() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = (harness as unknown as { service: any }).service;
  const agent = (harness as unknown as { asAgent: () => any }).asAgent();

  // realpathSync: macOS puts tmpdir behind /private, and an unresolved cwd
  // would make every comparison below lexically false for reasons that have
  // nothing to do with what is being tested.
  const ws = realpathSync(mkdtempSync(join(tmpdir(), "ws110-")));
  const outside = realpathSync(mkdtempSync(join(tmpdir(), "out110-")));
  (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;

  mkdirSync(join(outside, "secrets"));
  symlinkSync(join(outside, "secrets"), join(ws, "escape"));

  const ticket = svc.setTicket(agent, { title: "#110 probe" });
  svc.userAttachEvidence(agent, {
    ticketId: ticket.id,
    kind: "builtin:user_signoff",
    payload: {},
  });
  svc.userMoveTicket(agent, { ticketId: ticket.id, to: "in_progress" });
  svc.userAttachEvidence(agent, {
    ticketId: ticket.id,
    kind: "builtin:file_allowlist",
    payload: { paths: ["escape"] },
  });
  svc.userSetTicket(agent, { ticketId: ticket.id, allowlist: ["escape"] });

  return { harness, agent, ws, outside };
}

describe("#110 the write boundary is lexical only", () => {
  it("ALLOWS a write through a symlink whose target is outside the workspace", () => {
    const { harness, agent, ws, outside } = workspaceWithEscapingLink();

    const viaLink = join(ws, "escape", "stolen.txt");

    // The link really does leave the workspace -- asserted, not assumed, so
    // this test cannot quietly degrade into checking an ordinary directory.
    expect(realpathSync(join(ws, "escape"))).toBe(join(outside, "secrets"));
    expect(realpathSync(join(ws, "escape")).startsWith(ws)).toBe(false);

    // And the boundary allows it anyway. This is the documented behaviour.
    expect(writeBoundaryReason(asContext(harness.ctx), agent, viaLink)).toBeUndefined();
  });

  it("still refuses a path that is LEXICALLY outside the allowlist", () => {
    // The companion assertion, and the reason the one above is acceptable:
    // the boundary has not been weakened for ordinary mistakes, which are
    // the whole thing it exists to catch. Without this, "allows everything"
    // would satisfy the test above.
    const { harness, agent, ws } = workspaceWithEscapingLink();

    const reason = writeBoundaryReason(
      asContext(harness.ctx),
      agent,
      resolve(ws, "src", "host", "aidos-core.ts"),
    );
    expect(reason).toMatch(/allowlist/);
  });

  it("refuses a `..` traversal, which IS lexical and so IS caught", () => {
    // Marks the line between the two: string-visible escapes are refused,
    // filesystem-level ones are not. A reader of the failure above needs
    // this contrast to understand what the boundary does and does not do.
    const { harness, agent, ws } = workspaceWithEscapingLink();

    const reason = writeBoundaryReason(
      asContext(harness.ctx),
      agent,
      join(ws, "escape", "..", "..", "elsewhere.txt"),
    );
    expect(reason).toMatch(/allowlist/);
  });
});
