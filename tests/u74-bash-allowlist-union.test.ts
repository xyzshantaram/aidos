/**
 * #74 (user, 2026-09-01): bash writes bypassed the allowlist entirely.
 *
 * `echo x >> README.md` succeeded even when README.md was outside every
 * in-progress ticket's allowlist. The fs tools have been gated by that
 * union since #9 — but the board's write boundary is one shell redirect
 * away from irrelevant if bash is not gated by the same list.
 *
 * bash-guard lives in dotfiles-ai and cannot import aidos, so the union has
 * to travel on the context it already reads: `bashContext`. This file pins
 * the CONTRACT that guard depends on. It cannot test the guard itself
 * (different repository), so what it tests is the promise: the field is
 * always there, it is the same union the fs boundary uses, and every
 * deny-by-default path yields an empty one.
 */

import { describe, expect, it } from "vitest";

import { asContext, createHarness, type Harness } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";

function riggedHarness(): Harness {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

/** A ticket in progress with an approved allowlist, the normal write case. */
let frontSeq = 0;
function ticketInProgress(harness: Harness, paths: string[]): number {
  // The service takes an Agent; seedEvidence takes the harness's FakeAgent.
  // They are the same session, and mixing the two types is a typecheck error
  // rather than a runtime one -- keep both handles explicit.
  const agent = harness.asAgent();
  const fake = harness.agent;
  // Unique title per call: two fronts sharing a slug is a different error.
  const ticket = harness.service.setTicket(agent, { title: `Front ${++frontSeq}` });
  harness.seedEvidence(fake, ticket.id, "builtin:user_signoff");
  harness.service.agentMoveTicket(agent, { ticketId: ticket.id, to: "in_progress" });
  // #9's rule, and it is doing its job: an allowlist may only name paths a
  // builtin:file_allowlist row covers. Seeding the approval is what the
  // user's click does in life.
  harness.seedEvidence(fake, ticket.id, "builtin:file_allowlist", { paths });
  harness.service.userSetTicket(agent, { ticketId: ticket.id, allowlist: paths });
  return ticket.id;
}

describe("#74 bashContext publishes the write boundary", () => {
  it("carries the allowlist field even when nothing is in progress", () => {
    /*
     * ALWAYS PRESENT, including empty. An absent field is
     * indistinguishable from "this build predates #74", and a guard that
     * cannot tell those apart must fail OPEN — which is exactly how the fs
     * guard failed before #9. Empty says what it means: nothing in the
     * workspace is writable right now.
     */
    const harness = riggedHarness();
    const context = harness.service.bashContext(harness.asAgent());
    expect(Array.isArray(context.allowlist)).toBe(true);
    expect(context.allowlist).toEqual([]);
  });

  it("publishes an in-progress ticket's approved paths", () => {
    const harness = riggedHarness();
    ticketInProgress(harness, ["src/client", "tests"]);
    const context = harness.service.bashContext(harness.asAgent());
    expect(context.allowlist).toContain("src/client");
    expect(context.allowlist).toContain("tests");
  });

  it("is the SAME union the fs write boundary uses, not a second computation", () => {
    /*
     * The drift this avoids is the one #91 just removed from the filters:
     * two implementations of one rule that agree until someone fixes only
     * one. bash and `write` must never disagree about what is writable.
     */
    const harness = riggedHarness();
    ticketInProgress(harness, ["src/host", "docs"]);
    const agent = harness.asAgent();
    expect([...harness.service.bashContext(agent).allowlist].sort()).toEqual(
      [...harness.service.allowlistUnion(agent)].sort(),
    );
  });

  it("unions ACROSS in-progress tickets, since several fronts run at once", () => {
    const harness = riggedHarness();
    ticketInProgress(harness, ["src/client"]);
    ticketInProgress(harness, ["src/host"]);
    const context = harness.service.bashContext(harness.asAgent());
    expect(context.allowlist).toContain("src/client");
    expect(context.allowlist).toContain("src/host");
  });

  it("drops a ticket's paths when it leaves in_progress", () => {
    // The boundary must NARROW as work finishes, or a finished ticket keeps
    // its write access forever and the gate stops meaning anything.
    const harness = riggedHarness();
    const agent = harness.asAgent();
    const id = ticketInProgress(harness, ["src/client"]);
    harness.seedEvidence(harness.agent, id, "builtin:automated_check");
    harness.seedEvidence(harness.agent, id, "builtin:review_pass");
    harness.seedEvidence(harness.agent, id, "builtin:user_commit");
    harness.service.agentMoveTicket(agent, { ticketId: id, to: "awaiting_verification" });
    expect(harness.service.bashContext(agent).allowlist).toEqual([]);
  });

  it("denies by default: a non-aidos agent gets no profile AND no paths", () => {
    /*
     * The three early returns must agree with each other. A build that
     * returned "none" for the profile but a populated allowlist would hand
     * write targets to a session the board does not govern.
     */
    const harness = riggedHarness();
    // A real in-progress front exists, so the union is non-empty for an
    // aidos agent -- the point is that the non-aidos path never sees it.
    ticketInProgress(harness, ["src/client"]);
    expect(harness.service.bashContext(harness.asAgent()).allowlist).toContain("src/client");

    harness.ctx.reflect.provide("agentPresets", {
      composedPreset: () => "standard",
    });
    const context = harness.service.bashContext(harness.asAgent());
    expect(context.profile).toBe("none");
    expect(context.allowlist).toEqual([]);
  });
});
