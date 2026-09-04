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
    description: "One git commit from the ticket's workspace, resolved through git show at attach time.",
    weight: 1.0,
    allowedAuthors: ["user"],
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
    requiredKinds: ["builtin:automated_check", "builtin:review_pass"],
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
