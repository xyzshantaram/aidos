/**
 * #123 (user report 2026-09-05, settled 2026-09-07): "Verify is showing the
 * old criterion linker instead of new one" — and, settling it, *"what i
 * expect when i click verify in the queue modal is the same two-step flow
 * that clicking it in the detail view launches."*
 *
 * So the rule under test is REUSE, not resemblance: ONE verify flow, two
 * entry points. The queue used to build a lookalike out of ApprovalRunner
 * steps — a note field plus an inline `<select>` (the old linker) — while
 * the detail panel opened `VerifyModal`, which also takes a pasted
 * screenshot. Two buttons with one label attached two different SHAPES of
 * evidence depending on where the human clicked, and the board kept both.
 *
 * These are source assertions, in the house style of u141: the failure
 * being guarded against is a future edit quietly re-growing a second verify
 * surface, and the import graph IS that contract. A rendered-DOM test would
 * pin the pixels of one render; this pins the thing that made the two
 * diverge in the first place.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const read = (name: string): string =>
  readFileSync(new URL("../src/client/" + name, import.meta.url), "utf8");

const panel = read("queue-panel.tsx");
const detail = read("detail-panel.tsx");
const attach = read("evidence-attach.tsx");

describe("#123 one verify flow, two entry points", () => {
  it("the queue and the detail panel import the SAME modal, from the same module", () => {
    const importer = /import\s*\{[^}]*\bVerifyModal\b[^}]*\}\s*from\s*"\.\/evidence-attach"/;
    expect(
      importer.test(panel),
      "queue-panel must open the shared VerifyModal, not a runner lookalike",
    ).toBe(true);
    expect(
      importer.test(detail),
      "detail-panel must keep opening the shared VerifyModal",
    ).toBe(true);
  });

  it("the queue routes a verify ask to that modal rather than to the step runner", () => {
    expect(panel).toMatch(/running\.actionId === "verify"/);
    expect(panel).toMatch(/<VerifyModal/);
  });

  it("an APPROVAL is never routed to the verify modal: it resolves a card, it does not attach", () => {
    /*
     * The guard that keeps the two apart. An approval entry carries an
     * approvalId and must reach the runner's path-list step; without this
     * clause an approval whose actionId ever reads "verify" would open a
     * modal that attaches evidence and leaves the agent still blocked.
     */
    expect(panel).toMatch(/running\.approvalId === undefined/);
  });

  it("the OLD inline criterion select is gone from the queue's step builder", () => {
    /*
     * The literal defect the user reported. `stepsFor` fed the runner a
     * `criteria` list for verify alone, which the runner rendered as a bare
     * <select> — the old linker. Verify no longer reaches the runner, so
     * the list must not be built either: a dead branch here is how a second
     * surface grows back.
     */
    expect(panel).not.toMatch(/parseCriteria/);
    expect(panel).not.toMatch(/criteria:\s*criteria/);
  });

  it("the modal reports a SUCCESSFUL attach separately from a close", () => {
    /*
     * The queue hides an ask only when the write landed (a refused write
     * must leave it standing), so the shared modal has to distinguish the
     * two. onAttached fires on success only, before onClose.
     */
    expect(attach).toMatch(/onAttached\?\:\s*\(\)\s*=>\s*void/);
    expect(attach).toMatch(/props\.onAttached\?\.\(\)/);
    expect(panel).toMatch(/onAttached=\{/);
  });

  it("both entry points therefore attach the same payload shape", () => {
    /*
     * One attach call, in the shared modal: kind builtin:user_verified with
     * an optional note and an optional imagePath. If a second
     * userAttachEvidence call for user_verified appears in the queue panel,
     * the divergence is back.
     */
    expect(attach).toMatch(/kind: "builtin:user_verified"/);
    expect(panel).not.toMatch(/builtin:user_verified/);
  });
});
