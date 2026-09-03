/**
 * Evidence kind tags: one chip per kind, colored from the kind name. The chip
 * shows a short keyword, for example IMPORTED or CHECK. A kind with more than
 * one row splits: the keyword keeps the kind color, and the count segment
 * inverts it. The title holds the kind description.
 *
 * #21: `state` drops the chips that state already implies (a SIGNED OFF chip
 * beside an "In progress" chip restates it).
 *
 * It is REQUIRED. It was optional, justified by "the DETAIL panel wants
 * every kind" -- but the detail panel does not use this component at all; it
 * renders its own full evidence list. So the branch had no caller and its
 * stated reason described one that does not exist (#21 review F6/W9), which
 * a mutation confirmed by deleting the branch with the suite still green. An
 * unreachable branch defended by a false rationale is worse than no branch.
 */

import react from "react";

import { evidenceKindCounts, kindDescription, kindKeyword, tileKindCounts } from "./board-logic";
import type { EvidenceRowLike } from "./board-logic";
import type { TicketState } from "../kernel/types";

export interface EvidenceTagsProps {
  evidence: readonly EvidenceRowLike[];
  /** Kinds implied by this state are dropped. Required: see the note above. */
  state: TicketState;
}

export function EvidenceTags({ evidence, state }: EvidenceTagsProps) {
  const counts = tileKindCounts(state, evidenceKindCounts(evidence));
  if (counts.length === 0) return null;
  // #55: the IMPORTED badge's value half is the claimed ticket state from
  // the row payload, not a bare count.
  const claimedStates = new Map<string, string>();
  for (const row of evidence) {
    if (row.kind === "builtin:imported_state" && typeof row.payload.claimed_state === "string") {
      claimedStates.set(row.kind, row.payload.claimed_state);
    }
  }
  return (
    <>
      {counts.map((count) => {
        const claimed = claimedStates.get(count.kind);
        const value =
          claimed !== undefined
            ? claimed
            : count.count > 1
              ? String(count.count)
              : null;
        return (
          <span
            key={count.kind}
            className="aidos-chip aidos-chip-kind"
            /*
             * #21: the hue rides a CUSTOM PROPERTY, not the background. One
             * CSS rule then derives the tint, the border and the text colour
             * from it, so the chip's whole look lives in the stylesheet
             * instead of half here and half there.
             */
            style={{ ["--chip-hue"]: count.color } as react.CSSProperties}
            title={kindDescription(count.kind)}
          >
            <span className="aidos-chip-key">{kindKeyword(count.kind)}</span>
            {value !== null ? (
              <span className="aidos-chip-count">
                {value}
              </span>
            ) : null}
          </span>
        );
      })}
    </>
  );
}
