/**
 * The digest says a repeated instruction ONCE (user, 2026-09-08: "board
 * digest should not repeat the exact same worktree instruction like 50
 * times").
 *
 * Signing off four tickets produced four copies of the same worktree
 * paragraph. At four it is noise; at fifty it buries every other change in
 * the one channel the agent is steered with.
 *
 * The rule is general rather than a worktree special case: the digest's
 * grammar is already `subject — instruction`, so ANY bulk operation repeats
 * its tail once per ticket. Keying the fix on worktrees would leave the next
 * one — bulk signoff, batched review verdicts, a mass send-back — to
 * rediscover it.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DIGEST_SEPARATOR, coalesceDigestLines } from "../src/kernel/digest";

const core = readFileSync(
  new URL("../src/host/aidos-core.ts", import.meta.url).pathname,
  "utf8",
);

const line = (subject: string, instruction: string): string =>
  subject + DIGEST_SEPARATOR + instruction;

describe("digest coalescing", () => {
  it("says one instruction once, naming every ticket that carried it", () => {
    const out = coalesceDigestLines([
      line("worktree for #4", "not prepared; record a recipe"),
      line("worktree for #5", "not prepared; record a recipe"),
      line("worktree for #6", "not prepared; record a recipe"),
    ]);
    expect(out).toEqual([
      "worktree for #4, worktree for #5, worktree for #6" +
        DIGEST_SEPARATOR +
        "not prepared; record a recipe",
    ]);
  });

  it("drops NOTHING: every subject survives, and the instruction is unabridged", () => {
    /*
     * The difference between coalescing and summarising. A digest that
     * said "3 worktrees created" would be shorter and useless — the agent
     * could not tell WHICH tickets without reading the board.
     */
    const instruction = "a long instruction that must appear in full, verbatim, once";
    const out = coalesceDigestLines([
      line("**#169**", instruction),
      line("**#171**", instruction),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("**#169**");
    expect(out[0]).toContain("**#171**");
    expect(out[0]).toContain(instruction);
    expect(out[0].split(instruction).length - 1).toBe(1);
  });

  it("never merges two instructions that merely look alike", () => {
    /*
     * Exact equality only. Merging near-matches would put one ticket's
     * path against another ticket's name, and a digest that lies is worse
     * than one that repeats — which is why the caller keeps every
     * per-ticket interpolation in the SUBJECT.
     */
    const out = coalesceDigestLines([
      line("#4", "worktree at /tmp/a; not prepared"),
      line("#5", "worktree at /tmp/b; not prepared"),
    ]);
    expect(out).toHaveLength(2);
  });

  it("is invisible when there is nothing to collapse", () => {
    const singles = [
      line("**#12**", "moved `open` -> `in_progress`"),
      line("**#13**", "evidence `builtin:user_signoff` attached"),
    ];
    expect(coalesceDigestLines(singles)).toEqual(singles);
    expect(coalesceDigestLines([])).toEqual([]);
  });

  it("keeps a line with no separator exactly as it is, in place", () => {
    const out = coalesceDigestLines([
      "a bare line",
      line("#1", "same"),
      "another bare line",
      line("#2", "same"),
    ]);
    // Order is first appearance: the bare lines hold their slots and the
    // two grouped subjects merge at the first one's position.
    expect(out).toEqual(["a bare line", "#1, #2" + DIGEST_SEPARATOR + "same", "another bare line"]);
  });

  it("preserves first-appearance order across interleaved groups", () => {
    const out = coalesceDigestLines([
      line("#1", "alpha"),
      line("#2", "beta"),
      line("#3", "alpha"),
    ]);
    expect(out).toEqual([
      "#1, #3" + DIGEST_SEPARATOR + "alpha",
      "#2" + DIGEST_SEPARATOR + "beta",
    ]);
  });
});

describe("the flush uses it, and still counts real changes", () => {
  it("coalesces before rendering", () => {
    expect(core).toContain("coalesceDigestLines(lines)");
  });

  it("counts CHANGES, not rendered lines", () => {
    /*
     * Four signoffs are four changes however few lines they take. A header
     * whose count shrank because the text got tidier would be the digest
     * lying about what happened on the board.
     */
    expect(core).toContain("${lines.length} change${lines.length === 1 ? \"\" : \"s\"}");
    expect(core).toContain("merged.slice(0, DIGEST_LINE_CAP)");
  });

  it("keeps the worktree line's variable parts in the SUBJECT", () => {
    /*
     * The coupling that makes the collapse work at all: an instruction
     * containing the ticket id or its path is unique per ticket and can
     * never merge. This pins the split so a later edit cannot silently
     * un-collapse the digest.
     */
    const report = core.slice(core.indexOf("SUBJECT carries what differs"));
    const queued = report.slice(0, report.indexOf("return;"));
    expect(queued).toContain("`worktree for #${ticketId} at ${_mdCode(path)}${DIGEST_SEPARATOR}");
    const instruction = report.slice(report.indexOf("const instruction ="), report.indexOf("this._queueInjection"));
    expect(instruction).not.toContain("${ticketId}");
    expect(instruction).not.toContain("${path}");
  });
});
