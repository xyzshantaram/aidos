/**
 * #129: gate semantics v2 — the review-pass gate as a CONTAINMENT check.
 *
 * Built on #126's host-written row stamps (which now exist in the tree, the
 * ticket's precondition). The semantics under test:
 *
 *  - verified IFF the snapshotted record shows contained === true AND chain
 *    === the configured review chain;
 *  - contained === false invalidates the review result and the refusal names
 *    it OFF-CHAIN;
 *  - provenance UNAVAILABLE proceeds exactly as today, unverified — absence
 *    of data is not evidence of anything, and no code path throws;
 *  - human signoff and user_verified ALWAYS pass the gate;
 *  - a payload-crafted stamp cannot move the judgement (the stamp lives on
 *    the row, host-written);
 *  - legacy pre-provenance rows: no migration, no backfill, no branch.
 */

import { describe, expect, it } from "vitest";

import { checkGate } from "../src/kernel/gates";
import {
  DEFAULT_REVIEW_CHAIN,
  judgeReviewRow,
  reviewSessionIdOf,
} from "../src/kernel/review-provenance";
import { GateRefused } from "../src/kernel/types";
import type { AidosConfig, EvidenceRow, TicketSnapshot } from "../src/kernel/types";
import { DEFAULT_CONFIG } from "../src/kernel/constants";

const REVIEW_SESSION = "sess-reviewer-v2";

const ticket = (): TicketSnapshot =>
  ({ id: 1, state: "in_progress" }) as unknown as TicketSnapshot;

const row = (
  kind: string,
  at: number,
  stamp?: Record<string, unknown>,
  payload: Record<string, unknown> = {},
): EvidenceRow => ({
  kind,
  author: "agent",
  at,
  payload,
  ...(stamp === undefined ? {} : { stamp }),
} as EvidenceRow);

const commitRow = (): EvidenceRow =>
  row("builtin:user_commit", 3, undefined, { commit: "abc1234" });

const record = (over: Record<string, unknown> = {}) => ({
  type: "partner_review",
  chain: DEFAULT_REVIEW_CHAIN,
  rungsDeclared: [{ provider: "zai", model: "glm-5.3" }],
  rungsUsed: [{ provider: "zai", model: "glm-5.3" }],
  contained: true,
  ...over,
});

function moveToAwaiting(
  evidence: EvidenceRow[],
  lookup?: (sessionId: string) => unknown,
  config: AidosConfig = DEFAULT_CONFIG,
): GateRefused | null {
  try {
    checkGate(config, ticket(), evidence, "awaiting_verification", "agent", lookup);
    return null;
  } catch (error) {
    if (error instanceof GateRefused) return error;
    throw error;
  }
}

describe("#129 verified: containment + chain match, from the snapshot only", () => {
  it("a contained run on the configured chain is verified and records the chain", () => {
    const judgement = judgeReviewRow(
      row("builtin:review_pass", 1, { sessionId: REVIEW_SESSION }),
      "frontier",
      () => record(),
    );
    expect(judgement.standing).toBe("verified");
    expect(judgement.chain).toBe("frontier");
  });

  it("a contained run on the WRONG chain is OFF-CHAIN: invalidated, re-run", () => {
    const judgement = judgeReviewRow(
      row("builtin:review_pass", 1, { sessionId: REVIEW_SESSION }),
      "frontier",
      () => record({ chain: "flash", contained: true }),
    );
    expect(judgement.standing).toBe("invalidated");
    expect(judgement.reason).toMatch(/OFF-CHAIN/);
    const refusal = moveToAwaiting(
      [row("builtin:review_pass", 1, { sessionId: REVIEW_SESSION }), commitRow()],
      () => record({ chain: "flash" }),
    );
    expect(refusal).not.toBeNull();
    expect(refusal?.discountedReviews.join(" ")).toMatch(/OFF-CHAIN/);
  });

  it("a run that left its declared chain is OFF-CHAIN even when the name matches", () => {
    const refusal = moveToAwaiting(
      [row("builtin:review_pass", 1, { sessionId: REVIEW_SESSION }), commitRow()],
      () => record({ contained: false }),
    );
    expect(refusal?.discountedReviews.join(" ")).toMatch(/OFF-CHAIN/);
  });

  it("the judgement never re-resolves the chain name: it reads the record given", () => {
    // The record was snapshotted at dispatch; whatever the profile says
    // NOW is not evidence of what the chain WAS. A lookup returning the
    // snapshotted record is all the gate sees.
    const snapshotted = record({ chain: "frontier-2026-08", contained: true });
    const judgement = judgeReviewRow(
      row("builtin:review_pass", 1, { sessionId: REVIEW_SESSION }),
      // The CONFIGURED name differs from the snapshot: contained true, wrong
      // chain name -> invalidated on the snapshot's evidence, no re-resolution.
      "frontier",
      () => snapshotted,
    );
    expect(judgement.standing).toBe("invalidated");
    expect(judgement.chain).toBe("frontier-2026-08");
  });
});

describe("#129 degrade, never block", () => {
  it("unavailable provenance proceeds unverified — forSession undefined, reader absent, reader throwing", () => {
    const stamped = row("builtin:review_pass", 1, { sessionId: REVIEW_SESSION });
    expect(moveToAwaiting([stamped, commitRow()], () => undefined)).toBeNull();
    expect(moveToAwaiting([stamped, commitRow()], undefined)).toBeNull();
    expect(
      moveToAwaiting([stamped, commitRow()], () => {
        throw new Error("provenance store is down");
      }),
    ).toBeNull();
    // A malformed record says nothing either way.
    expect(moveToAwaiting([stamped, commitRow()], () => ({ contained: "yes" }))).toBeNull();
  });

  it("a legacy unstamped review_pass proceeds — no migration, no backfill, no branch", () => {
    const legacy = row("builtin:review_pass", 1, undefined, { note: "PASS, all criteria MET" });
    // Even a hostile lookup cannot turn absence into a finding.
    expect(moveToAwaiting([legacy, commitRow()], () => record({ contained: false }))).toBeNull();
  });
});

describe("#129 the human is the final gate", () => {
  it("user_verified always passes, whatever its provenance says", () => {
    // A human-verified row carries a stamp too (#126 stamps every row), and
    // the gate must never discount it: isInvalidatedReview only ever
    // touches builtin:review_pass.
    const verified = row("builtin:user_verified", 2, { sessionId: REVIEW_SESSION, actor: "user" });
    const refusal = moveToAwaiting([verified, commitRow()], () => record({ contained: false }));
    expect(refusal?.missingKinds ?? []).not.toContain("builtin:user_verified");
  });

  it("user_signoff satisfies the open->in_progress gate regardless of provenance", () => {
    const signoff = row("builtin:user_signoff", 1, { sessionId: REVIEW_SESSION, actor: "user" });
    try {
      checkGate(DEFAULT_CONFIG, ticket(), [signoff], "in_progress", "user", () =>
        record({ contained: false }),
      );
    } catch (error) {
      // If it refuses, it must not be because the signoff was discounted.
      const refusal = error as GateRefused;
      expect(refusal.missingKinds ?? []).not.toContain("builtin:user_signoff");
      return;
    }
    expect(true).toBe(true);
  });
});

describe("#129 provenance is host-side and unforgable", () => {
  it("a payload-crafted stamp is invisible to the judge", () => {
    const forged = row("builtin:review_pass", 1, undefined, {
      stamp: { sessionId: REVIEW_SESSION },
    });
    // The payload stamp is data: no session id is read from it, so the row
    // judges as legacy-unverified even against an off-chain record.
    expect(reviewSessionIdOf(forged)).toBeUndefined();
    expect(
      judgeReviewRow(forged, "frontier", () => record({ contained: false })).standing,
    ).toBe("unverified");
  });
});
