/**
 * The mirror pin. The test suite restates the constant table on purpose,
 * so drift of STATE_ORDER, BUILTIN_KINDS, or DEFAULT_GATES fails the
 * suite (PLAN.md, "The test suite's mirror restates them on purpose").
 */

import { describe, expect, it } from "vitest";

import {
  BUILTIN_KINDS,
  DEFAULT_CONFIG,
  DEFAULT_GATES,
} from "../src/kernel/constants";
import { STATE_ORDER } from "../src/kernel/types";
import type { GateDef, KindDef } from "../src/kernel/types";

const MIRROR_STATE_ORDER = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done",
] as const;

const MIRROR_BUILTIN_KINDS: KindDef[] = [
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

const MIRROR_DEFAULT_GATES: GateDef[] = [
  {
    fromState: "open",
    toState: "in_progress",
    requiredKinds: ["builtin:user_signoff"],
    allowedActors: ["user", "agent"],
  },
  {
    fromState: "in_progress",
    toState: "awaiting_verification",
    requiredKinds: ["builtin:automated_check", "builtin:review_pass"],
    allowedActors: ["user", "agent"],
  },
  {
    fromState: "awaiting_verification",
    toState: "done",
    requiredKinds: ["builtin:user_verified"],
    allowedActors: ["user"],
  },
  {
    fromState: "awaiting_verification",
    toState: "in_progress",
    requiredKinds: [],
    allowedActors: ["user"],
  },
];

describe("constants mirror", () => {
  it("restates STATE_ORDER verbatim", () => {
    expect(STATE_ORDER).toEqual(MIRROR_STATE_ORDER);
  });

  it("restates BUILTIN_KINDS verbatim, all 12 rows", () => {
    expect([...BUILTIN_KINDS]).toEqual(MIRROR_BUILTIN_KINDS);
  });

  it("restates DEFAULT_GATES verbatim", () => {
    expect(DEFAULT_GATES).toEqual(MIRROR_DEFAULT_GATES);
  });

  it("builds DEFAULT_CONFIG from the two constant tables", () => {
    expect(DEFAULT_CONFIG.kinds).toEqual([...BUILTIN_KINDS]);
    expect(DEFAULT_CONFIG.gates).toEqual([...DEFAULT_GATES]);
  });
});
