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
    label: "Review pass",
    description: "A reviewer read the change and reported findings.",
    weight: 1.0,
    allowedAuthors: ["agent", "user"],
  },
  {
    id: "builtin:review_note",
    label: "Review note",
    description: "A remark from a review.",
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
    label: "Comment",
    description: "A remark on the ticket.",
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
};

/**
 * The plan context cap. A plan/change context (the preamble plus every
 * section's heading and text lines) may not exceed this many lines. Both
 * the write boundary (setPlanMeta) and the replay fold enforce it.
 */
export const PLAN_CONTEXT_LIMIT = 2000;

export { STATE_ORDER };
