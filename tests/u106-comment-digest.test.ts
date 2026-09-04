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

import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { marked } from "marked";

import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";
import {
  DIGEST_LINE_CAP,
  DIGEST_LINE_LENGTH_CAP,
  DIGEST_TEXT_CAP,
} from "../src/host/aidos-core";

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = (harness as any).service;
  const agent = (harness as any).asAgent();
  const lines = () =>
    [...((svc as any)._pendingInjections as Map<string, string[]>).values()].flat();
  /**
   * Drive the REAL `_flushInjection` and return the message text it steered.
   *
   * The flush had zero coverage: the one test that looked like it covered
   * the assembly re-built the string itself. Capturing the steer is the only
   * way to assert what the agent actually receives.
   */
  const flush = (): string => {
    const captured: unknown[] = [];
    (agent as { steer?: unknown }).steer = (message: unknown) => captured.push(message);
    (svc as any)._flushInjection(agent.session);
    const content = (captured[0] as { content?: Array<{ text?: string }> } | undefined)?.content;
    return content?.[0]?.text ?? "";
  };
  return { svc, agent, lines, flush };
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
    // A comment is now an indented BLOCKQUOTE continuation, so it ends at
    // the ellipsis rather than a closing quote. The property is unchanged:
    // the text is MARKED as truncated, not silently cut.
    expect((long as string).endsWith("…")).toBe(true);
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
    const line = lines().find((l) => l.includes("**created** by user"));
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
    const line = lines().find((l) => l.includes("**detached** by user"));
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
    const line = lines().find((l) => l.includes("**Plan** — edited by user"));
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
    /*
     * The comment now renders as an indented BLOCKQUOTE continuation, so the
     * line legitimately contains ONE newline. The property this test exists
     * for is unchanged and is asserted more precisely than before: the
     * human's TEXT is collapsed to a single line, so it cannot break out of
     * the quote and restructure the digest.
     *
     * Exactly one newline, and it introduces the indented quote.
     */
    const parts = (line as string).split("\n");
    expect(parts).toHaveLength(2);
    expect(parts[1].startsWith("  > ")).toBe(true);
    // The quoted text itself carries no further newlines, so a "- " or "#"
    // in the comment cannot start a new list item or a heading.
    expect(parts[1]).toContain("second looks like a list item");
    expect(parts[1]).toContain("and this like a heading");
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
    // The id is BOLD and the title ITALIC now. Both are the digest's own
    // markup, applied around interpolated text rather than to it, so they
    // must survive the escaping that protects the text itself.
    expect(line as string).toContain("**#" + ticket.id + "**");
    expect(line as string).toContain("*Plain title*");
  });

  it("a multi-change digest separates its header from the list", () => {
    /*
     * A bullet list may interrupt a paragraph in CommonMark, so the
     * unseparated form mostly rendered -- but "mostly" depends on the
     * renderer, and a lazy continuation can fold the first item back into
     * the header paragraph.
     */
    /*
     * This asserts the REAL flush output. It previously re-implemented the
     * assembly locally -- still using the OLD prose header -- so it asserted
     * `toContain("changes):")` against a string it had just built itself. It
     * passed for the wrong reason and covered nothing: a reviewer removed
     * the blank line from the real code and no test noticed.
     */
    const { svc, agent, flush } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "one" });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "two" });
    const text = flush();
    expect(text).toContain("**aidos board update** — 2 changes\n\n- ");
    // Every top-level list item is one line; a quote continues indented.
    const items = text.split("\n").filter((line) => line.startsWith("- "));
    expect(items.length).toBe(2);
  });
});

describe("#106 the digest is bounded as a whole", () => {
  /*
   * DIGEST_TEXT_CAP bounds one interpolated NOTE. It never bounded a LINE --
   * an allowlist line maps over an unbounded path array -- and nothing
   * bounded the digest as a whole. A reviewer measured 11KB in one line and
   * 20KB across twenty capped comments. Raising the note cap 160 -> 1000
   * removed the accident that had kept this survivable.
   */

  it("caps the number of bullets and says how many it dropped", () => {
    const { svc, agent, flush } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    for (let i = 0; i < DIGEST_LINE_CAP + 7; i += 1) {
      svc.userAddComment(agent, { ticketId: ticket.id, text: `comment ${i}` });
    }
    const text = flush();
    const items = text.split("\n").filter((line) => line.startsWith("- "));
    // The cap, plus the one line reporting the truncation.
    expect(items.length).toBe(DIGEST_LINE_CAP + 1);
    expect(text).toContain("7 more change(s)");
    // The header reports the TRUE count, not the shown count: the agent must
    // know the digest is partial.
    expect(text).toContain(`${DIGEST_LINE_CAP + 7} changes`);
  });

  it("caps one line, so an unbounded path array cannot flood it", () => {
    const { svc, agent, flush } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const many = Array.from({ length: 400 }, (_unused, i) => `src/path-number-${i}`);
    // The allowlist edit refuses paths no file_allowlist row covers, so the
    // covering evidence comes first -- as it does in the real flow.
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:file_allowlist",
      payload: { paths: many },
    });
    svc.userSetTicket(agent, { ticketId: ticket.id, allowlist: many });
    const text = flush();
    for (const line of text.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(DIGEST_LINE_LENGTH_CAP + 32);
    }
    expect(text).toContain("(truncated)");
  });
});

describe("#106 every user action is reported, and ONLY a user action", () => {
  it("reports UNLINKING a criterion, not only linking", () => {
    /*
     * The unlink branch committed and returned before the injection -- the
     * exact shape of the bug this ticket exists to fix. The shared message
     * even carried an "unlinked from its criterion" case that could never
     * run, because the only path reaching it had already returned.
     *
     * Unlinking REMOVES the criterion a row was said to keep, so the agent's
     * coverage silently changes. More worth reporting than the link, not
     * less.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe", criteria: "the one criterion" });
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:review_note",
      payload: { note: "a note" },
    });
    const row = svc
      .getTicket(agent, { ticketId: ticket.id })
      .evidence.find((r: { kind: string }) => r.kind === "builtin:review_note");
    svc.userLinkEvidence(agent, {
      ticketId: ticket.id,
      at: row.at,
      rowKind: "builtin:review_note",
      criterion: "the one criterion",
    });
    expect(lines().some((line) => line.includes("linked to a criterion"))).toBe(true);
    svc.userLinkEvidence(agent, {
      ticketId: ticket.id,
      at: row.at,
      rowKind: "builtin:review_note",
      criterion: null,
    });
    expect(lines().some((line) => line.includes("unlinked from its criterion"))).toBe(true);
  });

  it("reports a re-phase, a re-order and a re-slug", () => {
    /*
     * These were missing from the reported-field list, so each was entirely
     * silent -- and a slug is half of the durable id (#35), so the agent's
     * own reference to the ticket stops resolving.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userSetTicket(agent, { ticketId: ticket.id, phase: 2, order: 99, slug: "renamed-slug" });
    const line = lines().find((l) => l.includes("edited by user"));
    expect(line).toBeDefined();
    for (const field of ["phase", "order", "slug"]) {
      expect(line as string, field).toContain(field);
    }
  });

  it("does NOT report a system write back to the agent", () => {
    /*
     * The guard was `actor !== "agent"`, which reads as "only a user" and is
     * not: Actor has a third member. Plan import attaches with `system`, so
     * an agent importing its OWN plan was told about it, one line per
     * imported ticket -- the very feedback loop the guard exists to prevent.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Agent's own ticket" });
    const before = lines().length;
    (svc as any)._attachEvidence(
      agent,
      {
        ticketId: ticket.id,
        kind: "builtin:imported_state",
        payload: { claimed_state: "open" },
      },
      "system",
    );
    expect(lines().length, "a system write must not reach the agent").toBe(before);
  });
});

describe("#106 nothing interpolated can inject Markdown", () => {
  it("escapes the allowlist REFUSAL detail, which was the missed site", () => {
    /*
     * `b.path` is verbatim textarea content from the approval card. A
     * reviewer confirmed `[click](http://evil.example)` rendering as a live
     * hyperlink in the agent's own context. The earlier claim of "all ten
     * interpolation sites" was a count of the sites that were CHANGED, not
     * of the sites that exist.
     *
     * This DRIVES the real refusal and RENDERS the result. It used to be a
     * source grep for `_mdCode(b.path)`, which round 2 rightly called out:
     * it would still pass with _mdCode and _mdInline replaced by identity
     * functions, and no test anywhere exercised the refusal digest.
     */
    const { svc, agent, flush } = setup();
    const ws = mkdtempSync(join(tmpdir(), "ws106-"));
    mkdirSync(join(ws, "src"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const proposal = svc.requestAllowlist(agent, { ticketId: ticket.id, paths: ["src"] });
    // The card's textarea, edited to something hostile before approving.
    const resolved = svc.resolveApproval(agent, {
      requestId: proposal.requestId,
      approved: true,
      paths: ["../[click](http://evil.example)", "../**bold**", "../<script>x</script>"],
    });
    expect(resolved.resolved).toContain("refused");

    const html = marked.parse(flush()) as string;
    // The deception vector: attacker-chosen anchor text hiding a different
    // destination. No anchor may carry text the attacker wrote.
    expect(html).not.toContain(">click<");
    expect(html).not.toContain("<strong>bold</strong>");
    expect(html).not.toContain("<script>");
    // And the true path still reaches the reader.
    expect(html).toContain("evil.example");
  });

  it("escapes a leading # or - inside the blockquote", () => {
    /*
     * The claim was that `#` and `-` are only structural at the start of a
     * line and that nothing interpolated can be there. True everywhere
     * except the blockquote, where the text lands immediately after
     * "\n  > " -- the start of the quote's content line. The old test only
     * exercised them MID-line, the one position where they are harmless.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAddComment(agent, { ticketId: ticket.id, text: "# THIS IS A HEADING" });
    const line = lines().find((l) => l.includes("THIS IS A HEADING")) as string;
    expect(line).toContain("> \\#");

    svc.userAddComment(agent, { ticketId: ticket.id, text: "- a list item" });
    const listLine = lines().find((l) => l.includes("a list item")) as string;
    expect(listLine).toContain("> \\-");
  });

  it("never MISREPORTS a path that contains a backtick", () => {
    /*
     * _mdCode deleted backticks, so an allowlist path containing one was
     * reported as a DIFFERENT path from the one being approved. Misstating a
     * security-relevant value is worse than rendering an ugly one.
     */
    const { svc, agent, lines } = setup();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:file_allowlist",
      payload: { paths: ["src/we`ird"] },
    });
    svc.userSetTicket(agent, { ticketId: ticket.id, allowlist: ["src/we`ird"] });
    const line = lines().find((l) => l.includes("allowlist")) as string;
    // The characters survive, and the reader is told why it reads oddly.
    expect(line).toContain("contains a backtick");
    expect(line).not.toContain("`src/weird`");
  });
});
