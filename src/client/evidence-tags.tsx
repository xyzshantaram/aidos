/**
 * Evidence kind tags: one chip per kind, colored from the kind name. The chip
 * shows a short keyword, for example IMPORTED or CHECK. A kind with more than
 * one row splits: the keyword keeps the kind color, and the count segment
 * inverts it. The title holds the kind description.
 */

import react from "react";

import { evidenceKindCounts, kindDescription, kindKeyword } from "./board-logic";
import type { EvidenceRowLike } from "./board-logic";

export interface EvidenceTagsProps {
  evidence: readonly EvidenceRowLike[];
}

export function EvidenceTags({ evidence }: EvidenceTagsProps) {
  const counts = evidenceKindCounts(evidence);
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
            style={{ background: count.color }}
            title={kindDescription(count.kind)}
          >
            <span className="aidos-chip-key">{kindKeyword(count.kind)}</span>
            {value !== null ? (
              <span className="aidos-chip-count" style={{ color: count.color }}>
                {value}
              </span>
            ) : null}
          </span>
        );
      })}
    </>
  );
}
