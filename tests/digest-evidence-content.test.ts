/**
 * #63 follow-up: the injection digest carries the evidence row's
 * HUMAN-READABLE content, not just its kind. A review note's text, an
 * allowlist's paths, and an imported state's claim all surface in the line,
 * capped so a long note cannot flood the digest. User asked for this after
 * reading digests that said only "evidence attached: builtin:review_note".
 */
import { describe, expect, it } from "vitest";
import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";
import { DIGEST_TEXT_CAP } from "../src/host/aidos-core";

describe("the board-update digest carries evidence content", () => {
  it("a review note's text rides the injection line, capped", async () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as any).service;
    const agent = (harness as any).asAgent();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:review_note",
      payload: { note: "the allowlist looks right" },
    });
    const pending = (svc as any)._pendingInjections as Map<string, string[]>;
    const lines = [...pending.values()].flat();
    expect(lines.some((line) => line.includes('the allowlist looks right'))).toBe(true);

    // A long note is ellipsized, not truncated silently mid-word with no mark.
    svc.setTicket(agent, { title: "Probe 2" });
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:review_note",
      // Derived from the cap, not hardcoded: this was "x".repeat(400) and
      // silently stopped exercising the cap the moment it was raised to
      // 1000 -- a test passing because its input no longer reaches the
      // branch it exists to test.
      payload: { note: "x".repeat(DIGEST_TEXT_CAP + 100) },
    });
    const lines2 = [...pending.values()].flat();
    const long = lines2.find((line) => line.includes("xxx"));
    expect(long).toBeDefined();
    // The note is now an indented BLOCKQUOTE continuation rather than a
    // quoted field, so it ends at the ellipsis. What is asserted is
    // unchanged: the text is marked as truncated, not silently cut.
    expect((long as string).endsWith("…")).toBe(true);
    expect(long as string).toContain("\n  > ");
  });

  it("an allowlist attach lists its paths in the line", async () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as any).service;
    const agent = (harness as any).asAgent();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:file_allowlist",
      payload: { paths: ["src/client/", "src/host/aidos-core.ts"] },
    });
    const pending = (svc as any)._pendingInjections as Map<string, string[]>;
    const lines = [...pending.values()].flat();
    // Paths are CODE SPANS now, one per path, instead of a count plus a
    // comma-joined blob. The property is the same: every approved path is
    // named in the line the agent reads.
    expect(
      lines.some((line) => line.includes("`src/client/`") && line.includes("`src/host/aidos-core.ts`")),
    ).toBe(true);
  });

  it("an imported_state attach does NOT report back to the agent", async () => {
    /*
     * This asserted the opposite, and it was wrong -- it encoded a feedback
     * loop as a feature.
     *
     * `imported_state` is stamped by the plan importer with the `system`
     * actor, and `planImport` has NO Remote: it is reachable only from the
     * agent's own `plan_import` tool. So every row of this kind describes
     * something the agent just did, and reporting it back told the agent
     * about its own import -- one digest line per imported ticket.
     *
     * The old guard was `actor !== "agent"`, which reads as "only a user"
     * and is not: Actor has a third member. The rule is deny-by-default now
     * (`actor === "user"`), and this is the case that proves it.
     */
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as any).service;
    const agent = (harness as any).asAgent();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    const pending = (svc as any)._pendingInjections as Map<string, string[]>;
    const before = [...pending.values()].flat().length;
    (svc as any)._attachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:imported_state",
      payload: { claimed_state: "in_progress" },
    }, "system");
    const lines = [...pending.values()].flat();
    expect(lines.length).toBe(before);
    expect(lines.some((line) => line.includes("claimed `in_progress`"))).toBe(false);
  });

  it("a commit-carrying row names the commit and subject in the line", async () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as any).service;
    const agent = (harness as any).asAgent();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:agent_report",
      payload: {
        commit: "abc123def4567890",
        subject: "feat(board): kind-tailored evidence attach",
        author: "sid",
        branch: "main",
      },
    });
    const pending = (svc as any)._pendingInjections as Map<string, string[]>;
    const lines = [...pending.values()].flat();
    // The hash is a code span and the subject is emphasised; both are still
    // present, which is what this test exists to prove.
    expect(
      lines.some(
        (line) =>
          line.includes("commit `abc123def456`") &&
          line.includes("kind-tailored evidence attach"),
      ),
    ).toBe(true);
  });

  it("a verdict row with no note still surfaces its first string field", async () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = (harness as any).service;
    const agent = (harness as any).asAgent();
    const ticket = svc.setTicket(agent, { title: "Probe" });
    svc.userAttachEvidence(agent, {
      ticketId: ticket.id,
      kind: "builtin:user_verified",
      payload: { summary: "checked on device at 360px" },
    });
    const pending = (svc as any)._pendingInjections as Map<string, string[]>;
    const lines = [...pending.values()].flat();
    expect(lines.some((line) => line.includes("checked on device at 360px"))).toBe(true);
  });
});
