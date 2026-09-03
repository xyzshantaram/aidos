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
  /**
   * #21: the viewing session's workspace. Given, the id chip drops the
   * prefix that is identical on every tile; absent, the chip stays fully
   * qualified (it shows MORE, never less).
   */
  ownWorkspaceKey?: string;
  onSelect: () => void;
}

export function TicketTile(props: TicketTileProps) {
  const ticket = props.ticket;
  const className =
    "aidos-tile" +
    (props.selected ? " aidos-tile-selected" : "") +
    (props.active === true ? " aidos-tile-active" : "");
  const badge = badgeClass(ticket.state);
  return (

    <button className={className} onClick={props.onSelect}>
      <div className="aidos-tile-meta">
        <span
          className="aidos-chip aidos-chip-id"
          style={{ background: idColor(fullTicketId(ticket)) }}
          title={fullTicketId(ticket)}
        >
          {ticketChipLabel(ticket, props.ownWorkspaceKey)}
        </span>
        <span className={badge}>{stateLabel(ticket.state)}</span>
      </div>
      <h3 className="aidos-tile-title">{ticket.title}</h3>
      <p className="aidos-tile-preview">{ticket.description}</p>
      <div className="aidos-tile-chips">
        {/*
         * #21: the metric chips carried the literal words "Gate" and "Conf".
         * The value is the information; the key was four characters of
         * furniture repeated on every tile. They become icons, and the
         * tooltip carries the full sentence -- a label may only be replaced
         * by an icon if hovering still explains it.
         */}
        <span
          className="aidos-chip aidos-chip-metric"
          title={
            "Gate: " +
            formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)) +
            " of the required evidence is attached"
          }
        >
          <span className="aidos-chip-key" aria-hidden="true">
            ◧
          </span>
          <span className="aidos-chip-value">
            {formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket))}
          </span>
        </span>
        <span
          className="aidos-chip aidos-chip-metric"
          title={
            "Confidence " +
            ringPercent(ticket.confidenceScore) +
            "%. Advisory only — it never unlocks anything."
          }
        >
          <span className="aidos-chip-key" aria-hidden="true">
            ◑
          </span>
          <span className="aidos-chip-value">{ringPercent(ticket.confidenceScore) + "%"}</span>
        </span>
        <EvidenceTags evidence={props.evidence} state={ticket.state} />
        {ticket.dependsOn?.map((ref) => (
          <span
            key={ref}
            className="aidos-chip aidos-chip-dep"
            title={"Depends on " + ref}
          >
            <span className="aidos-chip-dep-icon" aria-hidden="true">
              ↳
            </span>
            {displayDep(ref, ticket.workspaceKey)}
          </span>
        ))}
      </div>
    </button>
  );
}
