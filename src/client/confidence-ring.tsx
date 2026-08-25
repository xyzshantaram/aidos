/**
 * The confidence ring SVG. A fraction arc when the ticket has criteria,
 * "N/A" when it does not. The asterisk marks the score as advisory.
 *
 * Extracted from ticket-tile.tsx and detail-panel.tsx (which had drifted:
 * the tile omitted the asterisk className, leaving it unstyled).
 */

import react from "react";

import { hasCriteria, ringPercent } from "./board-logic";
import type { TicketView } from "../kernel/projections";

export interface ConfidenceRingProps {
  ticket: TicketView;
}

export function ConfidenceRing({ ticket }: ConfidenceRingProps) {
  const has = hasCriteria(ticket);
  const percent = ringPercent(ticket.confidenceScore);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const arcLength = has ? (percent / 100) * circumference : 0;

  return (
    <svg className="aidos-ring" viewBox="0 0 64 64">
      <circle
        cx={32}
        cy={32}
        r={radius}
        fill="none"
        stroke="var(--dsw-alias-border-l2)"
        strokeWidth={5}
      />
      {has && percent > 0 ? (
        <circle
          cx={32}
          cy={32}
          r={radius}
          fill="none"
          stroke="var(--dsw-alias-brand-primary)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={arcLength + " " + circumference}
          transform="rotate(-90 32 32)"
        />
      ) : null}
      <text
        x={32}
        y={37}
        textAnchor="middle"
        className={has ? "aidos-ring-percent" : "aidos-ring-na"}
      >
        {has ? Math.round(percent) + "%" : "N/A"}
      </text>
      {has && percent > 0 ? (
        <text
          x={47}
          y={24}
          textAnchor="middle"
          className="aidos-ring-asterisk"
          {...({ title: "Advisory score. It never unlocks anything." } as react.SVGProps<SVGTextElement>)}
        >
          *
        </text>
      ) : null}
    </svg>
  );
}
