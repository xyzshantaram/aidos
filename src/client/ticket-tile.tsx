/**
 * One square ticket tile. Shows the title, the confidence ring, the gate
 * fraction, the state badge, and evidence tags (one per kind with a count).
 * The active marker names the in_progress ticket with the latest update.
 */

import react from "react";

import {
  badgeClass,
  displayDep,
  formatGateFraction,
  fullTicketId,
  hasCriteria,
  idColor,
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
  active?: boolean;
  onSelect: () => void;
}

export function TicketTile(props: TicketTileProps) {
  const ticket = props.ticket;
  const className =
    "aidos-tile" + (props.selected ? " aidos-tile-selected" : "");
  const badge = badgeClass(ticket.state);

  return (
    <button className={className} onClick={props.onSelect}>
      <div className="aidos-tile-top">
        <span
          className="aidos-id-badge"
          style={{ background: idColor(fullTicketId(ticket)) }}
          title={fullTicketId(ticket)}
        >
          {displayDep(fullTicketId(ticket))}
        </span>
        <h3 className="aidos-tile-title">{ticket.title}</h3>
        <span className={badge}>{stateLabel(ticket.state)}</span>
      </div>
      <p className="aidos-tile-preview">{ticket.description}</p>
      <div className="aidos-tile-meta">
        <span className="aidos-tile-gate">
          {formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket))}
        </span>
        <span className="aidos-ring-inline">
          <ConfidenceRing ticket={ticket} />
        </span>
      </div>
      {props.active === true ? (
        <span className="aidos-active-marker">Active</span>
      ) : null}
      <EvidenceTags evidence={props.evidence} />
      {ticket.dependsOn?.map((ref) => (
        <span key={ref} className="aidos-dep-badge" title={ref}>
          {displayDep(ref)}
        </span>
      ))}
    </button>
  );
}
