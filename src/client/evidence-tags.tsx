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
  return (
    <>
      {counts.map((count) => (
        <span
          key={count.kind}
          className="aidos-chip aidos-chip-kind"
          style={{ background: count.color }}
          title={kindDescription(count.kind)}
        >
          <span className="aidos-chip-key">{kindKeyword(count.kind)}</span>
          {count.count > 1 ? (
            <span className="aidos-chip-count" style={{ color: count.color }}>
              {String(count.count)}
            </span>
          ) : null}
        </span>
      ))}
    </>
  );
}
