/**
 * #104: an allowlist may name a path that does not exist yet.
 *
 * User: "creating empty directories should be allowed for the agent, if they
 * are within its allowlist." Hit for real in the same session: #102 (add a
 * screenshots/ gallery) could not be granted its own directory, because the
 * proposal validator refused any path missing from disk:
 *
 *     allowlist proposal refused: screenshots (does not exist)
 *
 * So a ticket whose entire purpose is to CREATE something could never be
 * authorised to create it. The only workaround was to request the PARENT
 * directory -- a strictly WIDER grant than the one refused. A validator that
 * pushes users toward broader permissions than they asked for is working
 * against its own purpose, and that is the strongest argument for this fix.
 *
 * Nothing is weakened. Containment is checked FIRST and is purely lexical --
 * relative() plus a "../" test, never touching the filesystem -- so it
 * already answers correctly for a path that does not exist, and a path
 * inside the workspace has every ancestor inside it too. Existence was never
 * the safety property; containment is.
 */

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";
import { createdFromPayload, stillCreated } from "../src/client/allowlist-request-card";

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "aidos-104-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "README.md"), "# probe\n");
  return root;
}

function setup(cwd: string) {
  /*
   * A REAL cwd, not the harness default. The default is "/srv/proj/cli", a
   * path that does not exist -- so existsSync is false for everything under
   * it and the "already exists" half of this contract cannot be observed.
   * The first version of this test missed that and asserted a passing
   * result that meant nothing.
   */
  // createHarness(config, options) -- cwd is the SECOND argument.
  const harness = createHarness(undefined, { cwd });
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = (harness as any).service;
  const agent = (harness as any).asAgent();
  return { svc, agent };
}

describe("#104 a not-yet-existing path is valid and flagged", () => {
  it("accepts a directory that does not exist yet", () => {
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Needs a new directory" });
    const out = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["screenshots"],
    });
    expect(out.ok).toBe(true);
    expect(out.proposed).toContain("screenshots");
  });

  it("reports it as WILL BE CREATED, so the human's consent stays informed", () => {
    /*
     * Approving a path into existence is a different decision from approving
     * writes to something already there. Silently accepting it would trade
     * one dishonesty for another.
     */
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const out = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["screenshots", "README.md"],
    });
    expect(out.created).toEqual(["screenshots"]);
    // An existing path is NOT flagged, or the notice would be meaningless.
    expect(out.created).not.toContain("README.md");
  });

  it("carries the flag on the pending card the human actually sees", () => {
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.requestAllowlist(agent, { ticketId: ticket.id, paths: ["screenshots"] });
    const pending = svc.pendingApprovals(agent, {});
    expect(pending.length).toBeGreaterThan(0);
    expect((pending[0].payload as { created: string[] }).created).toEqual(["screenshots"]);
  });

  it("a file that does not exist yet is accepted too", () => {
    /*
     * Creating a new source file is routine. If only directories were
     * allowed, the workaround would still be to grant the whole parent --
     * the same too-wide grant this fix exists to avoid.
     */
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const out = svc.requestAllowlist(agent, {
      ticketId: ticket.id,
      paths: ["src/brand-new-thing.ts"],
    });
    expect(out.ok).toBe(true);
    expect(out.created).toEqual(["src/brand-new-thing.ts"]);
  });
});

describe("#104 containment is still the safety property, and still refuses", () => {
  it("refuses a path escaping the workspace even though it does not exist", () => {
    /*
     * THE test that matters. Relaxing the existence check must not relax
     * containment -- and containment runs first, so it never depended on
     * existence in the first place.
     */
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() =>
      svc.requestAllowlist(agent, { ticketId: ticket.id, paths: ["../escapes-me"] }),
    ).toThrow(/escapes the workspace/);
  });

  it("refuses an absolute path outside the workspace", () => {
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() =>
      svc.requestAllowlist(agent, { ticketId: ticket.id, paths: ["/etc/passwd"] }),
    ).toThrow(/escapes the workspace/);
  });

  it("refuses a SIBLING directory, the prefix hole the #51 review found", () => {
    /*
     * Containment uses relative() rather than startsWith precisely because
     * "/ws-evil/x".startsWith("/ws") is true. A non-existent sibling must
     * still be refused, so this pins that the lexical check -- not the
     * existence check -- was doing that work all along.
     */
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() =>
      svc.requestAllowlist(agent, { ticketId: ticket.id, paths: [cwd + "-evil/x"] }),
    ).toThrow(/escapes the workspace/);
  });

  it("still refuses an empty list", () => {
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() => svc.requestAllowlist(agent, { ticketId: ticket.id, paths: [] })).toThrow();
  });
});

describe("#104 review findings", () => {
  it("A: refuses a NUL byte EXPLICITLY, not by accident", () => {
    /*
     * Review finding A, a real regression this commit introduced. A NUL path
     * used to be refused as "does not exist", because existsSync() returns
     * false for it rather than throwing. Removing that refusal turned an
     * accidental rejection into an ACCEPTANCE, writing a NUL path into a
     * security-relevant allowlist.
     *
     * Not exploitable through Node's fs, which rejects NUL itself. But a
     * write boundary should refuse it deliberately rather than lean on a
     * side effect of a check that no longer exists -- and this test is the
     * difference between the two.
     */
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() =>
      svc.requestAllowlist(agent, { ticketId: ticket.id, paths: ["src/foo\u0000bar"] }),
    ).toThrow(/NUL/);
  });

  it("A: a NUL path is refused even alongside valid ones", () => {
    const cwd = workspace();
    const { svc, agent } = setup(cwd);
    const ticket = svc.setTicket(agent, { title: "Probe" });
    expect(() =>
      svc.requestAllowlist(agent, {
        ticketId: ticket.id,
        paths: ["src", "src/ok\u0000evil"],
      }),
    ).toThrow(/NUL/);
  });
});

describe("#104 review finding B: the notice tracks what the human is editing", () => {
  it("drops a path the human deleted from the list", () => {
    /*
     * THE finding. The notice read straight from the request payload, so
     * deleting "screenshots" from the textarea left the card still saying
     * "1 path does not exist yet and will be created: screenshots" -- wrong
     * at exactly the moment the human is exercising control, which is the
     * entire justification for showing it.
     */
    expect(stillCreated(["screenshots"], ["src", "tests"])).toEqual([]);
  });

  it("keeps a path that is still in the list", () => {
    expect(stillCreated(["screenshots"], ["screenshots", "src"])).toEqual(["screenshots"]);
  });

  it("ignores whitespace and blank lines the textarea produces", () => {
    // The textarea splits on newlines, so trailing blanks and indentation
    // are routine rather than exotic.
    expect(stillCreated(["screenshots"], ["  screenshots  ", "", "   "])).toEqual([
      "screenshots",
    ]);
  });

  it("under-reports rather than over-reports", () => {
    /*
     * A newly TYPED path may also be new on disk, but the browser cannot
     * stat to find out -- the host re-validates on approve, which is where
     * that is caught. The safe direction is to say less, never more.
     */
    expect(stillCreated([], ["a-brand-new-thing"])).toEqual([]);
  });
});

describe("#104 review finding C: the card's payload handling is pinned", () => {
  it("reads created paths from a well-formed payload", () => {
    expect(createdFromPayload({ paths: ["a"], created: ["a"] })).toEqual(["a"]);
  });

  it("survives an OLDER pending card that predates the field", () => {
    // A card queued before this field existed must not crash the surface the
    // human needs in order to unblock the agent.
    expect(createdFromPayload({ paths: ["a"] })).toEqual([]);
  });

  it("survives a malformed or hostile payload", () => {
    for (const payload of [null, undefined, 42, "nope", [], { created: "nope" }, { created: 7 }]) {
      expect(createdFromPayload(payload)).toEqual([]);
    }
  });

  it("filters non-string entries rather than trusting the array", () => {
    expect(createdFromPayload({ created: ["ok", 5, null, { x: 1 }, "fine"] })).toEqual([
      "ok",
      "fine",
    ]);
  });
});
