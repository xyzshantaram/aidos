/**
 * #174: the next step is DERIVED from the gate, never written.
 *
 * The property under test is not "the sentence is helpful" — it is that the
 * sentence CANNOT CONTRADICT the gate. Guidance that asks for evidence a
 * satisfied gate no longer wants teaches the reader to ignore the field, and
 * a channel that has been learned-away is worse than one that was never
 * added. So every test here pins agreement with `checkGate`/`isMissing`
 * rather than the wording.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { checkGate } from "../src/kernel/gates";
import { nextStep } from "../src/kernel/next-step";
import { GateRefused } from "../src/kernel/types";
import type { EvidenceRow, TicketSnapshot, TicketState } from "../src/kernel/types";
import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness, successJson } from "./b1-harness";

const ticket = (state: TicketState, over: Partial<TicketSnapshot> = {}): TicketSnapshot =>
  ({
    id: 1,
    projectId: 1,
    title: "t",
    description: "",
    body: "",
    criteria: "- it works",
    phase: 1,
    order: 1,
    state,
    allowlist: ["src"],
    dependsOn: [],
    slug: "t",
    updatedAt: 0,
    ...over,
  }) as TicketSnapshot;

const rows = (...kinds: string[]): EvidenceRow[] =>
  kinds.map((kind) => ({ kind, author: "agent" as const, at: 1, payload: {} }));

const attached = (...kinds: string[]): Set<string> => new Set(kinds);

/** Does the gate let this move through? The oracle every test compares to. */
function gateOpens(state: TicketState, to: TicketState, kinds: string[]): boolean {
  try {
    checkGate(DEFAULT_CONFIG, ticket(state), rows(...kinds), to, "agent");
    return true;
  } catch (error) {
    if (error instanceof GateRefused) return false;
    throw error;
  }
}

describe("#174 next_step agrees with the gate, by construction", () => {
  it("says nothing when the gate is satisfied and the ticket has moved on", () => {
    // awaiting_verification with its move made is a ticket needing nothing
    // from the agent: the remaining step is the human's.
    const step = nextStep(
      DEFAULT_CONFIG,
      ticket("awaiting_verification"),
      attached("builtin:user_verified"),
    );
    expect(step).toBeUndefined();
  });

  it("is UNDEFINED, not empty, so a caller can branch and a card can omit it", () => {
    expect(nextStep(DEFAULT_CONFIG, ticket("done"), attached())).toBeUndefined();
  });

  it("never asks for a kind the gate would not name — over every subset", () => {
    /*
     * The load-bearing test. It enumerates every subset of the submit gate's
     * kinds and asserts that whenever the gate OPENS, the step stops asking
     * for evidence. A future edit that hardcodes a sentence, or forgets
     * #107's excusal, fails here rather than in production.
     */
    const kinds = [
      "builtin:automated_check",
      "builtin:review_pass",
      "builtin:user_commit",
    ];
    for (let mask = 0; mask < 1 << kinds.length; mask += 1) {
      const held = kinds.filter((_kind, index) => (mask & (1 << index)) !== 0);
      const opens = gateOpens("in_progress", "awaiting_verification", held);
      const step = nextStep(DEFAULT_CONFIG, ticket("in_progress"), attached(...held));
      if (opens) {
        expect(step, `gate open with [${held.join(",")}] must not ask for evidence`).not.toMatch(
          /still needs/,
        );
      } else {
        expect(step, `gate shut with [${held.join(",")}] must say what is missing`).toMatch(
          /still needs/,
        );
      }
    }
  });

  it("honours #107's excusal rather than restating the required list", () => {
    // A review excuses the check, so a ticket holding a review must not be
    // told to attach one. This is the exact drift a second implementation
    // would introduce.
    const step = nextStep(
      DEFAULT_CONFIG,
      ticket("in_progress"),
      attached("builtin:review_pass"),
    );
    expect(step ?? "").not.toContain("automated_check");
  });

  it("names WHO supplies what it asks for", () => {
    const step = nextStep(DEFAULT_CONFIG, ticket("in_progress"), attached()) ?? "";
    expect(step).toContain("review_pass");
    expect(step).toContain("independent review");
  });

  it("tells a finished ticket to MOVE, which is the invisible failure", () => {
    /*
     * Work that is done but still sitting in in_progress looks identical to
     * work that is not started. Nobody reviews what does not look ready, so
     * the gate being open IS the next step.
     */
    const step = nextStep(
      DEFAULT_CONFIG,
      ticket("in_progress"),
      attached("builtin:review_pass", "builtin:user_commit"),
    );
    expect(step).toContain("awaiting_verification");
  });
});

describe("#174 an OPEN ticket is told what signoff cannot fix later", () => {
  it("asks for criteria first when there are none", () => {
    const step =
      nextStep(DEFAULT_CONFIG, ticket("open", { criteria: "  " }), attached()) ?? "";
    expect(step).toContain("criteria");
    // The omission clause, which is the part that cannot be rubber-stamped.
    expect(step).toContain("NOT addressing");
  });

  it("asks for the allowlist next, naming why signoff alone is not enough", () => {
    /*
     * #98's finding, stated where it is actionable: signoff moves the ticket
     * to in_progress and the boundary then refuses every write, because the
     * union is empty until a file_allowlist row exists.
     */
    const step =
      nextStep(DEFAULT_CONFIG, ticket("open", { allowlist: [] }), attached()) ?? "";
    expect(step).toContain("allowlist");
    expect(step).toMatch(/grants write access to nothing/);
  });

  it("says it is ready for signoff once it is grilled and scoped", () => {
    const step = nextStep(DEFAULT_CONFIG, ticket("open"), attached()) ?? "";
    expect(step).toContain("ready for");
    expect(step).toContain("user_signoff");
  });
});

/**
 * The digest is the SECOND consumer, and the reason this derivation lives on
 * the service rather than in the tool layer.
 *
 * Two copies of a rule drift, and this one drifting means the board telling
 * the agent to attach evidence its own gate no longer wants — which teaches
 * the agent to skip the field, at which point the channel is spent.
 */
describe("#174 one derivation, two consumers", () => {
  const core = readFileSync(
    new URL("../src/host/aidos-core.ts", import.meta.url).pathname,
    "utf8",
  );
  const tools = readFileSync(
    new URL("../src/tools/aidos-tools.ts", import.meta.url).pathname,
    "utf8",
  );

  it("computes the step in ONE place that both consumers call", () => {
    // The kernel function is imported once, by the service; the tools and the
    // digest both go through nextStepFor rather than importing it themselves.
    expect(core).toContain("nextStepFor");
    expect(tools).toContain("ctx.aidos.nextStepFor(");
    expect(tools).not.toContain('from "../kernel/next-step"');
  });

  it("every gate-relevant tool result goes through it — four call sites, no more", () => {
    /*
     * The tool half of "every board tool result that changes gate-relevant
     * state carries next_step". Exactly the four writers that move the gate
     * — set_ticket (create and edit), attach_commit, attach_evidence,
     * move_ticket — and every call is the service derivation, never a
     * second sentence written in the tool layer. A fifth call site, or a
     * dropped one, fails here instead of shipping a result without
     * guidance.
     *
     * This is the next-step uniqueness pin, and it lives in THIS file — not
     * in #170's pin (tests/u98-signoff-one-flow.test.ts), which counts
     * CLIENT writers of board actions. That file proves one flow per user
     * action; this file proves one derivation of next_step. A criterion
     * citing "#170's uniqueness test" for this property names the wrong
     * file; the honest citation is this block.
     */
    const calls = tools.match(/ctx\.aidos\.nextStepFor\(/g) ?? [];
    expect(calls).toHaveLength(4);
  });

  it("the general evidence-attach digest line carries it too", () => {
    /*
     * The move and criterion-link lines already rode _nextStepSuffix while
     * the general evidence-attach line — the most common gate-relevant
     * digest line — appended only the evidence suffix. All three now carry
     * the same guidance, on the INSTRUCTION side so lines needing the same
     * thing still coalesce.
     */
    const start = core.indexOf("private _attachEvidenceInternal(");
    expect(start).toBeGreaterThan(-1);
    const tail = core.slice(start);
    const body = tail.slice(0, tail.indexOf("return row.payload;"));
    expect(body).toContain("_nextStepSuffix");
  });

  it("rides the digest's INSTRUCTION side, so grouping stays honest", () => {
    /*
     * Coalescing (#174's neighbour) merges lines with identical
     * instructions. Putting the step there means two tickets that received
     * the same evidence AND now need the same thing merge, while two that
     * need different things stay apart — which is the correct grouping,
     * because the guidance is what the reader acts on.
     */
    expect(core).toContain("_nextStepSuffix");
    expect(core).toContain("evidence ${_mdCode(rowKind)} ${what} by user` +");
  });

  it("never lets guidance break the write it annotates", () => {
    // nextStepFor swallows a failed read: a ticket that cannot be resolved
    // has no next step, and a decoration must never fail an attach or a move.
    const body = core.slice(core.indexOf("nextStepFor(agent: Agent"));
    expect(body.slice(0, 500)).toContain("catch");
  });
});

/**
 * Gaps 1–2 (verifier round): set_ticket and move_ticket answered with no
 * nextStep, so the motivating case — creating a ticket — never surfaced the
 * open-ticket guidance the kernel already derives. These drive the REAL
 * tools over the REAL service and assert the step rides each result, agrees
 * with the gate at each state, and goes quiet exactly when nothing is
 * missing.
 */
describe("#174 creation and moves answer with the step", () => {
  function setup() {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    return harness;
  }

  it("creating a bare ticket answers with the new-ticket step", async () => {
    const harness = setup();
    const created = successJson(await harness.runTool("set_ticket", { title: "Fresh" }));
    // No criteria yet: the open-ticket guidance names criteria first,
    // including what the ticket is NOT addressing.
    expect(String(created.nextStep ?? "")).toContain("criteria");
  });

  it("grilling the criteria moves the step to the allowlist", async () => {
    const harness = setup();
    const created = successJson(await harness.runTool("set_ticket", { title: "Scoped" }));
    const edited = successJson(
      await harness.runTool("set_ticket", {
        ticketId: created.ticketId as number,
        criteria: "- it works",
      }),
    );
    // The allowlist field is still empty: signoff alone would grant write
    // access to nothing, so the step says so where it is actionable.
    expect(String(edited.nextStep ?? "")).toMatch(/grants write access to nothing/);
  });

  it("a move answers with what the new state still needs", async () => {
    const harness = setup();
    const created = successJson(
      await harness.runTool("set_ticket", { title: "Walker", criteria: "- it works" }),
    );
    const ticketId = created.ticketId as number;
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
    const moved = successJson(
      await harness.runTool("move_ticket", { ticketId, to: "in_progress" }),
    );
    // In progress with no evidence: the submit gate's missing kinds, named
    // with who supplies them — the same sentence the kernel derives.
    expect(String(moved.nextStep ?? "")).toMatch(/still needs/);
    expect(String(moved.nextStep ?? "")).toContain("review_pass");
  });

  it("guidance tracks the gate to the end, then goes absent — not empty", async () => {
    const harness = setup();
    const created = successJson(
      await harness.runTool("set_ticket", { title: "Finisher", criteria: "- it works" }),
    );
    const ticketId = created.ticketId as number;
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
    successJson(await harness.runTool("move_ticket", { ticketId, to: "in_progress" }));
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "builtin:automated_check" }),
    );
    successJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "builtin:review_pass" }),
    );
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_commit", {
      commit: "seeded-setup-row",
      subject: "setup scaffolding, not a resolved commit",
    });
    const moved = successJson(
      await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
    );
    // Landing in awaiting_verification leaves the human's verify step: the
    // move result names it rather than going quiet one state early.
    expect(String(moved.nextStep ?? "")).toContain("user_verified");
    // Once the human verifies, nothing is missing and the step is ABSENT —
    // a caller can branch on the key rather than parsing an empty string.
    harness.seedEvidence(harness.agent, ticketId, "builtin:user_verified");
    const edited = successJson(
      await harness.runTool("set_ticket", { ticketId, title: "Finisher (touched)" }),
    );
    expect("nextStep" in edited).toBe(false);
  });
});
