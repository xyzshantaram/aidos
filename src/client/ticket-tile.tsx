/**
 * One square ticket tile. Shows the title, the confidence ring, the gate
 * fraction, the state badge, and evidence tags (one per kind with a count).
 */

import react from "react";

import {
  badgeClass,
  formatGateFraction,
  hasCriteria,
  stateClass,
  stateLabel,
} from "./board-logic";
import { ConfidenceRing } from "./confidence-ring";
import { EvidenceTags } from "./evidence-tags";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRow } from "../kernel/types";

export interface TicketTileProps {
  ticket: TicketView;
  evidence: readonly EvidenceRow[];
  selected: boolean;
  onSelect: () => void;
}

export function TicketTile(props: TicketTileProps) {
  const ticket = props.ticket;
  const className =
    "aidos-tile" + (props.selected ? " aidos-tile-selected" : "");
  const badge = badgeClass(ticket.state);

  return (
    <button
      className={className}
      onClick={props.onSelect}
      title={ticket.title}
    >
      <h3 className="aidos-tile-title">{ticket.title}</h3>
      <div className="aidos-ring-wrap">
        <ConfidenceRing ticket={ticket} />
      </div>
      <div className="aidos-tile-meta">
        <span className="aidos-tile-gate">
          {formatGateFraction(ticket.gateFraction, hasCriteria(ticket))}
        </span>
        <span className={badge}>{stateLabel(ticket.state)}</span>
      </div>
      <EvidenceTags evidence={props.evidence} />
    </button>
  );
}
