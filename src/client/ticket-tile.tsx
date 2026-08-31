/**
 * One square ticket tile. Shows the id chip, the title, the state chip, the
 * gate fraction, the confidence, evidence tags, and dependency chips.
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
  ringPercent,
  ticketChipLabel,
} from "./board-logic";
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
      <div className="aidos-tile-meta">
        <span
          className="aidos-chip aidos-chip-id"
          style={{ background: idColor(fullTicketId(ticket)) }}
          title={fullTicketId(ticket)}
        >
          {ticketChipLabel(ticket)}
        </span>
        <span className={badge}>{stateLabel(ticket.state)}</span>
      </div>
      <h3 className="aidos-tile-title">{ticket.title}</h3>
      <p className="aidos-tile-preview">{ticket.description}</p>
      <div className="aidos-tile-chips">
        <span className="aidos-chip aidos-chip-metric">
          {"Gate " +
            formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket))}
        </span>
        <span
          className="aidos-chip aidos-chip-metric"
          title="Advisory score. It never unlocks anything."
        >
          {"Conf " + ringPercent(ticket.confidenceScore) + "%"}
        </span>
        <EvidenceTags evidence={props.evidence} />
        {ticket.dependsOn?.map((ref) => (
          <span key={ref} className="aidos-chip aidos-chip-dep" title={ref}>
            {displayDep(ref)}
          </span>
        ))}
      </div>
      {props.active === true ? (
        <span className="aidos-active-marker">Active</span>
      ) : null}
    </button>
  );
}
