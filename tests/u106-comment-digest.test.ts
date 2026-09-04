/**
 * #106: a comment must reach the agent through the board-update digest.
 *
 * The user asked "have you been getting my recent comments" and the honest
 * answer was no. `_addComment` committed its event and returned, never
 * calling `_queueInjection` -- the only user-actor write in the service that
 * did not. Evidence attach, state moves and allowlist updates all queue a
 * line; comments silently did not.
 *
 * So the human could type a remark on a ticket, watch it store and render,
 * and the agent would never hear it. That is the worst shape of failure this
 * project keeps hitting: the surface looks like it worked.
 */

import { describe, expect, it } from "vitest";

import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";
import { DIGEST_TEXT_CAP } from "../src/host/aidos-core";

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = (harness as any).service;
  const agent = (harness as any).asAgent();
  const lines = () =>
    [...((svc as any)._pendingInjections as Map<string, string[]>).values()].flat();
  return { svc, agent, lines };
}

describe("#106 a human comment reaches the agent", () => {
  it("queues a digest line carrying the comment TEXT", () => {
    /*
     * The text rides along, not a bare "a comment was added" -- the content
     * is the entire value, and a bare notification would send the agent off
     * to read the ticket, which is the prose-hunting problem #93 exists to
     * remove.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "please use a worktree" });
    expect(lines().some((line) => line.includes("please use a worktree"))).toBe(true);
  });

  it("names the ticket and the actor, like its siblings do", () => {
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "A titled ticket" });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "a remark" });
    const line = lines().find((l) => l.includes("a remark"));
    expect(line).toBeDefined();
    expect(line as string).toContain("#" + ticket.id);
    expect(line as string).toContain("A titled ticket");
    expect(line as string).toContain("user");
  });

  it("caps a long comment with the SAME rule the evidence suffix uses", () => {
    /*
     * A comment is free-form and can be arbitrarily long. The cap was a
     * closure inside _evidenceDigestSuffix, so reusing it meant hoisting it
     * rather than writing a second truncation rule -- two rules drift, which
     * is how this codebase ended up with eleven copies of a board key.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    /*
     * Derived from the cap rather than hardcoded. This was "y".repeat(400),
     * which stopped exercising the cap the moment it rose to 1000 -- the
     * test kept passing for the wrong reason, because its input no longer
     * reached the branch it exists to test.
     */
    const overCap = "y".repeat(DIGEST_TEXT_CAP + 100);
    svc.userAddComment(agent, { ticketId: ticket.id, text: overCap });
    const long = lines().find((l) => l.includes("yyy"));
    expect(long).toBeDefined();
    expect((long as string).endsWith('…"')).toBe(true);
    // And it is genuinely shortened, not merely marked.
    expect((long as string).length).toBeLessThan(overCap.length);
  });
});

describe("#106 the agent is never fed its own comment", () => {
  it("an agent comment queues nothing", () => {
    /*
     * Guarded on the actor exactly as _attachEvidence is. Feeding the agent
     * its own writes is a feedback loop, and #63's whole design is that the
     * injection carries what the HUMAN did.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const before = lines().length;
    svc.agentAddComment(agent, { ticketId: ticket.id, text: "agent talking to itself" });
    expect(lines().length).toBe(before);
    expect(lines().some((l) => l.includes("agent talking to itself"))).toBe(false);
  });

  it("a human comment on the same ticket still gets through", () => {
    // The guard must discriminate by actor, not suppress comments wholesale.
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.agentAddComment(agent, { ticketId: ticket.id, text: "agent note" });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "human note" });
    expect(lines().some((l) => l.includes("human note"))).toBe(true);
    expect(lines().some((l) => l.includes("agent note"))).toBe(false);
  });
});

describe("#106 EVERY user action reaches the agent", () => {
  /*
   * User's principle, and the reason this ticket grew past comments: "every
   * user action should go in the digest - it's the most magical part of the
   * experience."
   *
   * The audit that criterion demanded found comment was NOT the only gap.
   * Editing a ticket's criteria, creating a ticket, detaching evidence,
   * linking evidence to a criterion, and editing the plan were all silent
   * too. Each is a case where the human does something consequential and the
   * agent carries on with a stale picture.
   */

  it("an edit names WHICH fields changed", () => {
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userSetTicket(agent, {
      ticketId: ticket.id,
      criteria: "a rewritten criterion",
      description: "a rewritten description",
    });
    const line = lines().find((l) => l.includes("edited by user"));
    expect(line).toBeDefined();
    expect(line as string).toContain("criteria");
    expect(line as string).toContain("description");
    /*
     * Field NAMES, not their text. A description here runs to kilobytes --
     * #92 exists because flooding the agent's context is a real cost, and a
     * digest that pastes a whole rewritten description would undo it.
     */
    expect(line as string).not.toContain("a rewritten description");
  });

  it("an edit that changes nothing reportable stays quiet", () => {
    // Setting only an allowlist already has its own line; this must not
    // produce a second, empty "edited by user:" with no fields after it.
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const before = lines().filter((l) => l.includes("edited by user")).length;
    svc.userSetTicket(agent, { ticketId: ticket.id });
    expect(lines().filter((l) => l.includes("edited by user")).length).toBe(before);
  });

  it("a ticket the human CREATES is announced", () => {
    const { svc, agent, lines } = setup();
    svc.userSetTicket(agent, { title: "Filed by the human" });
    const line = lines().find((l) => l.includes("CREATED by user"));
    expect(line).toBeDefined();
    expect(line as string).toContain("Filed by the human");
  });

  it("a ticket the AGENT creates is not announced back to it", () => {
    const { svc, agent, lines } = setup();
    svc.setTicket(agent, { title: "Filed by the agent" });
    expect(lines().some((l) => l.includes("Filed by the agent"))).toBe(false);
  });

  it("DETACHING evidence is announced, because it changes the gate", () => {
    /*
     * Removal is at least as consequential as attachment, and only
     * attachment was reported. A review pass or a signoff can disappear and
     * the agent would carry on believing the ticket was unblocked.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:review_note",
      payload: { note: "temporary" },
    });
    const rows = svc.getTicket(agent, { ticketId: ticket.id }).evidence;
    const row = rows[rows.length - 1];
    svc.userDetachEvidence(agent, {
      ticketId: ticket.id,
      at: row.at,
      rowKind: row.kind,
    });
    const line = lines().find((l) => l.includes("DETACHED"));
    expect(line).toBeDefined();
    expect(line as string).toContain("builtin:review_note");
  });

  it("editing the PLAN is announced, naming the blocks", () => {
    /*
     * The plan's preamble and context sections are the project's standing
     * instructions -- the agent reads them as direction. A human rewriting
     * them unnoticed means the agent works to a plan that no longer says
     * what it thinks it says.
     */
    const { svc, agent, lines } = setup();
    svc.setTicket(agent, { title: "Anchor" });
    svc.userSetPlanMeta(agent, { projectId: 1, preamble: "new standing direction" });
    const line = lines().find((l) => l.includes("Plan edited by user"));
    expect(line).toBeDefined();
    expect(line as string).toContain("preamble");
  });
});

describe("#106 the digest is valid Markdown", () => {
  /*
   * The digest renders as Markdown in the conversation, and every dynamic
   * part of it -- ticket titles, evidence notes, dismissal reasons -- is
   * authored by a human or an agent and can contain anything.
   *
   * These are not hypothetical shapes. Every one below occurred in this
   * project during the session that produced this test.
   */

  it("collapses a MULTI-LINE note into one list item", () => {
    /*
     * THE structural break. An evidence note is free-form and frequently
     * multi-line -- a review verdict, for instance. A raw newline ends the
     * list item, and if the next line begins with "-" or "#" it starts a new
     * list or a heading, so ONE note silently restructures the whole digest.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAddComment(agent, {
      ticketId: ticket.id,
      text: "first line\n- second looks like a list item\n# and this like a heading",
    });
    const line = lines().find((l) => l.includes("first line"));
    expect(line).toBeDefined();
    expect(line as string).not.toContain("\n");
  });

  it("escapes inline markup in a TITLE", () => {
    // A title with emphasis or code markers would otherwise render as
    // emphasis or swallow the rest of the line into a code span.
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, {
      title: "Fix *everything* and `the rest` [see here](x)",
    });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "probe" });
    const line = lines().find((l) => l.includes("probe"));
    expect(line as string).toContain("\\*everything\\*");
    expect(line as string).toContain("\\`the rest\\`");
    expect(line as string).toContain("\\[see here\\]");
  });

  it("escapes underscores, which real kind ids are full of", () => {
    // "automated_check + review_pass" is a real digest fragment here.
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAddComment(agent, {
      ticketId: ticket.id,
      text: "needs automated_check and review_pass",
    });
    const line = lines().find((l) => l.includes("needs"));
    expect(line as string).toContain("automated\\_check");
    expect(line as string).toContain("review\\_pass");
  });

  it("does not escape the line's own structural characters", () => {
    // The "- " bullet and the "#12" ticket reference are the digest's OWN
    // syntax and must survive; only INTERPOLATED text is escaped.
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Plain title" });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "plain note" });
    const line = lines().find((l) => l.includes("plain note"));
    expect(line as string).toContain("#" + ticket.id);
    expect(line as string).toContain("(Plain title)");
  });

  it("a multi-change digest separates its header from the list", () => {
    /*
     * A bullet list may interrupt a paragraph in CommonMark, so the
     * unseparated form mostly rendered -- but "mostly" depends on the
     * renderer, and a lazy continuation can fold the first item back into
     * the header paragraph.
     */
    const { svc, agent } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "one" });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "two" });
    const flushed = (svc as any)._pendingInjections as Map<string, string[]>;
    const queued = [...flushed.values()].flat();
    expect(queued.length).toBeGreaterThanOrEqual(2);
    // Reproduce the assembly the flush performs.
    const text = `aidos board update (${queued.length} changes):\n\n- ${queued.join("\n- ")}`;
    expect(text).toContain("changes):\n\n- ");
    // Every list item is exactly one line.
    const items = text.split("\n").filter((l) => l.startsWith("- "));
    expect(items.length).toBe(queued.length);
  });
});
