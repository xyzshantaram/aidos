/**
 * The one constant table of builtin kinds and the default gate config.
 *
 * This file is part of the B0 contract (SPEC.md). The CLI, the tests, and
 * the settings defaults read the same constants. The test suite's mirror
 * restates them on purpose, so drift fails the suite.
 */

import type { AidosConfig, GateDef, KindDef } from "./types";
import { STATE_ORDER } from "./types";

/** The builtin kinds. One table, read by the CLI and the tests. */
export const BUILTIN_KINDS: readonly KindDef[] = [
  {
    id: "builtin:user_signoff",
    label: "User signoff",
    description: "The human confirms the work.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
  {
    id: "builtin:user_verified",
    label: "User verified",
    description: "The human checked the finished work.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
  {
    id: "builtin:eval_criteria",
    label: "Evaluation criteria",
    description: "The criteria to judge the work.",
    weight: 1.0,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "builtin:file_allowlist",
    label: "File allowlist",
    description: "The files the change may touch.",
    weight: 1.0,
    allowedAuthors: ["user"],
  },
  {
    id: "builtin:agent_report",
    label: "Agent report",
    description: "The agent describes the work.",
    weight: 1.0,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "builtin:automated_check",
    label: "Automated check",
    description: "A machine check ran and reported a result.",
    weight: 1.0,
    allowedAuthors: ["agent", "user"],
  },
  {
    id: "builtin:test_run",
    label: "Test run",
    description: "A test run and its result.",
    weight: 1.0,
    allowedAuthors: ["agent", "user"],
  },
  {
    id: "builtin:review_pass",
    label: "Review \u2014 accepted",
    description:
      "An independent review of the change accepted it: a reviewer subagent or the human read it, reported findings, and PASSED it. The orchestrator's own read does not qualify. A failing review is recorded with builtin:review_fail instead \u2014 never here.",
    weight: 1.0,
    allowedAuthors: ["agent", "user"],
  },
  {
    id: "builtin:review_fail",
    label: "Review \u2014 failed",
    description:
      "An independent review of the change FAILED it: a reviewer subagent or the human found a defect and did not pass it. Contributes to nothing \u2014 it never satisfies a gate. Kept alongside any later builtin:review_pass so the review history (how many rounds, what each found) stays visible.",
    weight: 0,
    allowedAuthors: ["agent", "user"],
  },
  {
    id: "builtin:review_note",
    label: "Remark",
    description:
      "A remark: a note from a review round, or a general comment on the ticket. The one surviving free-form remark kind after builtin:comment folded into it — same weight, same authors, one kind instead of two doing the same job.",
    weight: 0.5,
    allowedAuthors: ["agent", "user"],
  },
  {
    id: "builtin:after_shot",
    label: "After shot",
    description: "The state after the work.",
    weight: 1.0,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "builtin:comment",
    label: "Comment (deprecated)",
    description:
      "DEPRECATED — folded into builtin:review_note, which is identical in weight and authorship. Kept here only so a pre-existing evidence row of this kind still validates and renders; no longer offered for new rows. Do not confuse with the ticket's COMMENT THREAD (CommentRecord/userAddComment), a separate durable mechanism this kind never wrote to.",
    weight: 0.5,
    allowedAuthors: ["user", "agent"],
  },
  {
    id: "builtin:imported_state",
    label: "Imported state",
    description: "The state that a plan document claimed at import time.",
    weight: 0.0,
    allowedAuthors: ["system"],
  },
  {
    id: "builtin:user_commit",
    label: "Git commit",
    description:
      "One git commit from the ticket's workspace, resolved through git show at attach time. " +
      "The AGENT may attach it as well as the human, because it is a VERIFIED FACT rather than " +
      "an attestation: the host resolves the hash and stores what git reports, so an unresolvable " +
      "or invented hash is refused instead of recorded. That is what separates it from " +
      "review_pass, which stays human- or reviewer-authored because nothing can verify a judgement.",
    weight: 1.0,
    allowedAuthors: ["user", "agent"],
  },
];

/** The default gate config. Ported from the prototype's CLI spec. */
export const DEFAULT_GATES: readonly GateDef[] = [
  {
    fromState: "open" as const,
    toState: "in_progress" as const,
    requiredKinds: ["builtin:user_signoff"],
    allowedActors: ["user", "agent"],
  },
  {
    fromState: "in_progress" as const,
    toState: "awaiting_verification" as const,
    /*
     * #178: A COMMIT WILL BE REQUIRED TO REACH VERIFICATION (owner,
     * 2026-09-08). NOT YET ENFORCED -- the requirement is staged, and the
     * reason is recorded here rather than in a commit message nobody reads:
     * adding it to requiredKinds fails 57 assertions across 20 files, every
     * one of them a lifecycle test that advances a ticket without naming a
     * commit. That sweep is mechanical but it is not a footnote to a tool
     * addition, so it lands as its own change with its own review.
     *
     * The half that IS live: builtin:user_commit is now agent-authorable
     * and the `attach_commit` tool exists, so an agent can satisfy the
     * requirement before it starts being enforced. Shipping it the other
     * way round would have wedged every ticket the moment it landed.
     *
     * Work that cannot name the commit it landed in is work nobody can
     * verify: the reviewer has no diff to read, the human has nothing to
     * check out, and the ticket's claim to be finished rests entirely on
     * the agent's say-so. This board has already paid for that -- a session
     * that "repeatedly accepted subagent self-reports as done" shipped two
     * UI bugs that surfaced only when the user clicked.
     *
     * It is the one required kind that is MECHANICALLY VERIFIED rather than
     * asserted: the host resolves the hash through git show and refuses
     * what it cannot find, so unlike automated_check it cannot be satisfied
     * by a confident sentence.
     *
     * The commit is NOT excusable by review_pass or automated_check, and
     * that is deliberate, not an omission from the excusedBy map below.
     * Excusal is only legitimate between two kinds making the SAME claim at
     * different strengths -- review_pass excuses automated_check because a
     * review is stronger evidence that the thing runs. A commit makes a
     * DIFFERENT claim: that a diff exists to read. Accepting a review or a
     * check in place of a commit would be the gate accepting an answer to a
     * question it never asked.
     */
    requiredKinds: ["builtin:automated_check", "builtin:review_pass", "builtin:user_commit"],
    allowedActors: ["user", "agent"],
    /*
     * #107: an accepted review excuses the machine check.
     *
     * automated_check is the CHEAP evidence -- the agent attaches it from
     * its own claim that it ran something, and nothing verifies the claim.
     * review_pass is the EXPENSIVE one: an independent reviewer, or the
     * human. Requiring the cheap artefact alongside the expensive one adds
     * ceremony, not safety, and worse, teaches the agent to attach a check
     * as a formality -- which is precisely how automated_check becomes a
     * rubber stamp.
     *
     * The motivating case was a human writing "this flow works fine, we've
     * been using it extensively" on a ticket that then sat blocked waiting
     * for a machine check. That review IS empirical evidence the thing
     * runs, arguably stronger than a test run, and a design that cannot
     * record it without also demanding a check is failing the human.
     *
     * DIRECTIONAL, and that is the safety property: review_pass excuses
     * automated_check and never the reverse. The expensive evidence stays
     * mandatory, so the gate still stops the agent marking its own homework.
     */
    excusedBy: { "builtin:automated_check": "builtin:review_pass" },
  },
  {
    fromState: "awaiting_verification" as const,
    toState: "done" as const,
    requiredKinds: ["builtin:user_verified"],
    allowedActors: ["user"],
  },
  {
    fromState: "awaiting_verification" as const,
    toState: "in_progress" as const,
    requiredKinds: [],
    allowedActors: ["user"],
  },
];

/** The default config: every builtin kind and the default gates. */
export const DEFAULT_CONFIG: AidosConfig = {
  kinds: [...BUILTIN_KINDS],
  gates: [...DEFAULT_GATES],
  injectEnabled: true,
  injectDebounceMs: 30000,
};

/**
 * The plan context cap. A plan/change context (the preamble plus every
 * section's heading and text lines) may not exceed 2000 lines. Both
 * the write boundary (setPlanMeta) and the replay fold enforce it.
 */
export const PLAN_CONTEXT_LIMIT = 2000;

export { STATE_ORDER } from "./types"; // re-export for tests that import from constants; canonical source remains src/kernel/types.ts
