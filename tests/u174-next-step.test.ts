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

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { checkGate } from "../src/kernel/gates";
import { nextStep } from "../src/kernel/next-step";
import { GateRefused } from "../src/kernel/types";
import type { EvidenceRow, TicketSnapshot, TicketState } from "../src/kernel/types";

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
