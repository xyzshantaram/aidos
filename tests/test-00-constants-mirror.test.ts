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
      "A remark: a note from a review round, or a general comment on the ticket. The one surviving free-form remark kind after builtin:comment folded into it \u2014 same weight, same authors, one kind instead of two doing the same job.",
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
      "DEPRECATED \u2014 folded into builtin:review_note, which is identical in weight and authorship. Kept here only so a pre-existing evidence row of this kind still validates and renders; no longer offered for new rows. Do not confuse with the ticket's COMMENT THREAD (CommentRecord/userAddComment), a separate durable mechanism this kind never wrote to.",
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
    // #107: an accepted review excuses the machine check. Directional --
    // review_pass excuses automated_check and never the reverse, so the
    // expensive evidence stays mandatory.
    excusedBy: { "builtin:automated_check": "builtin:review_pass" },
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

  it("restates BUILTIN_KINDS verbatim, all 14 rows", () => {
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
