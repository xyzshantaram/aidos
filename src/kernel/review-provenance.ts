/**
 * #136: chain provenance for reviews — the RELIABILITY AID, not a security
 * boundary.
 *
 * READ THIS BEFORE CHANGING THE SEMANTICS. An earlier design (the deleted
 * `partner` chain) was fail-closed: a review_pass satisfied the gate only
 * when a stamp proved a partner-chain run, and reviewer unavailability was
 * required never to auto-pass. That framing is GONE, and the constraint
 * that replaced it is explicit: this defends against DRIFT AND
 * MISROUTING — aidos quietly sending a batch of reviews to a cheap tier —
 * and not against an adversary. Nothing here prevents a host plugin from
 * writing rows, so nothing here may be described as unspoofable.
 *
 * The strongest consequence this mechanism may ever have is "this review
 * result is invalid; re-run it". It must never block a session, wedge the
 * board, or throw out of the gate.
 *
 * ## Why containment rather than "which model answered"
 *
 * With failover, the chain a run DECLARED and the model that PRODUCED the
 * output are different facts: a run can start at rung 0 and finish at rung
 * 4, and that is normal, healthy behaviour rather than a fault. So the
 * question worth asking is not "did the head model answer" but "did every
 * model that served this run belong to the chain the run declared" —
 * `contained`. That is what makes a chain a boundary rather than a
 * suggestion.
 *
 * `rungsDeclared` is snapshotted by the harness AT DISPATCH, deliberately:
 * a stamp recording only the name "frontier" would later be evaluated
 * against whatever `frontier` has become, and would stop being evidence the
 * moment someone edits the chain. This module therefore never re-resolves a
 * chain name — it reads the snapshot it was given.
 *
 * ## The asymmetry, which is the whole design
 *
 * Reviews are BATCHED, so invalidating a review means re-running a batch.
 * That cost is worth paying on a positive off-chain finding and is not
 * worth paying on an absence of data. A dropped provenance write must
 * therefore degrade to "unverified" — never to a false accusation.
 */

/** One route a chain rung names. Split on the FIRST slash only, upstream. */
export interface ChainRung {
  provider: string;
  model: string;
}

/**
 * What the harness records for a finished run. Mirrors
 * `chainProvenance.forSession(sessionId)`; this is a frozen contract and
 * aidos does not add to it.
 */
export interface ChainProvenanceRecord {
  /** The subagent type, e.g. "partner_review". */
  type: string;
  /** The declared chain NAME. */
  chain: string;
  /** The expanded rung list, snapshotted at dispatch. */
  rungsDeclared: ChainRung[];
  /** Every route that actually served a request in the run. */
  rungsUsed: ChainRung[];
  /** rungsUsed is a subset of rungsDeclared. */
  contained: boolean;
}

/**
 * What aidos concluded about one review row.
 *
 * - `verified`   — the run stayed inside the review chain it declared.
 * - `unverified` — provenance is UNAVAILABLE. Evidence of nothing. The row
 *                  counts exactly as it does today.
 * - `invalidated`— a POSITIVE finding that the run left its declared chain,
 *                  or ran on a chain that is not the configured review
 *                  chain. The review result does not count and should be
 *                  re-run.
 */
export type ReviewStanding = "verified" | "unverified" | "invalidated";

/** The standing plus the one-line reason a human reads on the board. */
export interface ReviewJudgement {
  standing: ReviewStanding;
  reason: string;
  /** The chain the run declared, when the record supplied one. */
  chain?: string;
}

/** The default review chain NAME. A name, never a model, and never pinned. */
export const DEFAULT_REVIEW_CHAIN = "frontier";

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Judge one provenance record against the configured review chain.
 *
 * Total and never throws: every malformed shape lands in `unverified`,
 * because a record this function cannot read is missing data rather than a
 * finding. `contained` must be a real boolean `false` to invalidate — an
 * absent or non-boolean field is unreadable, not a confession.
 */
export function judgeReviewProvenance(
  record: unknown,
  configuredChain: string,
): ReviewJudgement {
  if (!isRecordLike(record)) {
    return {
      standing: "unverified",
      reason:
        "no chain provenance for this review run (the service is absent, the " +
        "record was never written, or the row predates stamping) — proceeding " +
        "as unverified, which is what missing data means",
    };
  }

  const chain = typeof record.chain === "string" ? record.chain : undefined;
  const contained = record.contained;

  if (typeof contained !== "boolean") {
    return {
      standing: "unverified",
      reason:
        "the chain provenance record is malformed (no boolean `contained`), " +
        "so it says nothing either way",
      ...(chain === undefined ? {} : { chain }),
    };
  }

  if (!contained) {
    /*
     * The one case worth the cost of a re-run. Positive data: the harness
     * says a model outside the declared chain served this run, so the
     * review did not happen where aidos asked for it to happen.
     */
    return {
      standing: "invalidated",
      reason:
        "OFF-CHAIN: this review ran outside the chain it declared" +
        (chain === undefined ? "" : " (" + chain + ")") +
        " — the result is invalid and the review should be re-run",
      ...(chain === undefined ? {} : { chain }),
    };
  }

  if (chain !== configuredChain) {
    /*
     * Also positive data, and it is the misrouting case this exists for: a
     * contained run on the WRONG chain is exactly what "aidos quietly sent
     * the batch to a cheap tier" looks like from the outside.
     */
    return {
      standing: "invalidated",
      reason:
        "OFF-CHAIN: this review ran on chain " +
        (chain === undefined ? "(unnamed)" : chain) +
        ", not the configured review chain " +
        configuredChain +
        " — the result is invalid and the review should be re-run",
      ...(chain === undefined ? {} : { chain }),
    };
  }

  return {
    standing: "verified",
    reason: "every model that served this review belonged to chain " + chain,
    chain,
  };
}

/**
 * The reviewer session id stamped on an evidence row, or undefined.
 *
 * #126: the stamp is HOST-written and lives on the ROW (`row.stamp`), never
 * inside the payload — the payload is agent-composed data, so a payload key
 * named `stamp`, `model`, `chain`, or `sessionId` is data, and reading it as
 * provenance would let provenance be forged. A row without one is a legacy
 * row and judges as `unverified` — deliberately: legacy `review_pass` rows
 * are automatically promoted and keep satisfying the gate. There is no
 * migration, no backfill, and no grandfather flag, and the risk of that (an
 * old self-reviewed pass stays valid forever) was accepted in writing rather
 * than overlooked.
 */
export function reviewSessionIdOf(row: {
  payload?: Record<string, unknown>;
  stamp?: { sessionId?: unknown };
}): string | undefined {
  const stamp = row.stamp;
  if (
    stamp !== undefined &&
    typeof stamp === "object" &&
    typeof stamp.sessionId === "string" &&
    stamp.sessionId !== ""
  ) {
    return stamp.sessionId;
  }
  return undefined;
}

/**
 * Judge one evidence row, given a provenance lookup that MAY throw or be
 * absent. The lookup is wrapped: no provenance problem may reach the gate
 * as an exception.
 */
export function judgeReviewRow(
  row: { kind: string; payload?: Record<string, unknown>; stamp?: { sessionId?: unknown } },
  configuredChain: string,
  lookup: ((sessionId: string) => unknown) | undefined,
): ReviewJudgement {
  const sessionId = reviewSessionIdOf(row);
  if (sessionId === undefined || lookup === undefined) {
    return judgeReviewProvenance(undefined, configuredChain);
  }
  let record: unknown;
  try {
    record = lookup(sessionId);
  } catch {
    /*
     * A reader that throws is a broken reader, not a bad review. Same
     * branch as a missing record on purpose.
     */
    return judgeReviewProvenance(undefined, configuredChain);
  }
  return judgeReviewProvenance(record, configuredChain);
}

/**
 * The gate's view: which rows must be IGNORED when counting evidence.
 *
 * Only an invalidated review is dropped, and only ever a review row.
 * Everything else — including every unverified review — counts exactly as
 * it counts today.
 */
export function isInvalidatedReview(
  row: { kind: string; payload?: Record<string, unknown>; stamp?: { sessionId?: unknown } },
  configuredChain: string,
  lookup: ((sessionId: string) => unknown) | undefined,
): boolean {
  if (row.kind !== "builtin:review_pass") return false;
  return judgeReviewRow(row, configuredChain, lookup).standing === "invalidated";
}
