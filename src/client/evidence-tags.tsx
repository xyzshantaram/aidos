/**
 * Evidence kind tags: one per kind with a count, colored from the kind name.
 *
 * Extracted from ticket-tile.tsx and detail-panel.tsx (which had identical
 * logic but different wrapper class names — now unified to
 * .aidos-evidence-row).
 */

import react from "react";

import { evidenceKindCounts, kindLabel } from "./board-logic";
import type { EvidenceRowLike } from "./board-logic";

export interface EvidenceTagsProps {
  evidence: readonly EvidenceRowLike[];
}

export function EvidenceTags({ evidence }: EvidenceTagsProps) {
  const counts = evidenceKindCounts(evidence);
  if (counts.length === 0) return null;
  return (
    <div className="aidos-evidence-row">
      {counts.map((count) => (
        <span
          key={count.kind}
          className="aidos-evidence-tag"
          style={{ borderColor: count.color, color: count.color }}
        >
          {kindLabel(count.kind) + " " + count.count}
        </span>
      ))}
    </div>
  );
}
