/**
 * Ticket U2b: the real ticket detail panel. Fields on top, evidence grouped
 * by criterion below in a collapsible section, uncovered criteria tinted.
 * Read-only: editing and moves are U2c.
 */

import react from "react";

import {
  badgeClass,
  formatGateFraction,
  groupEvidenceByCriterion,
  hasCriteria,
  stateClass,
  stateLabel,
  uncoveredCriteria,
} from "./board-logic";
import { ConfidenceRing } from "./confidence-ring";
import { EvidenceTags } from "./evidence-tags";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRow } from "../kernel/types";

export interface DetailPanelProps {
  ticket: TicketView;
  evidence: readonly EvidenceRow[];
  evidenceCollapsed: boolean;
  onToggleEvidence: () => void;
  onClose: () => void;
}

/** One criterion row: the label, an uncovered tint when nothing addresses it. */
function renderCriterionGroup(
  group: ReturnType<typeof groupEvidenceByCriterion>[number],
) {
  const isUngrouped = group.criterion === "";
  const rowClass = isUngrouped
    ? "aidos-criterion aidos-criterion-ungrouped"
    : group.matched
      ? "aidos-criterion"
      : "aidos-criterion aidos-criterion-uncovered";
  const label = isUngrouped ? (
    "Ungrouped"
  ) : (
    <span className="aidos-criterion-label">{group.criterion}</span>
  );

  const rows = group.rows.map((row, rowIndex) => (
    <div className="aidos-evidence-row-item" key={rowIndex}>
      <span className="aidos-evidence-kind">{row.kind}</span>
      <span className="aidos-evidence-author">{row.author}</span>
      {typeof row.payload.criteria === "string" ? (
        <span className="aidos-evidence-meta">
          {"criterion: " + row.payload.criteria}
        </span>
      ) : null}
    </div>
  ));

  return (
    <div className={rowClass} key={group.criterion}>
      <div className="aidos-criterion-head">
        {label}
        <span className="aidos-criterion-count">{String(group.rows.length)}</span>
      </div>
      {rows}
    </div>
  );
}

/** The collapsible evidence section: criteria in order, ungrouped last. */
function renderEvidenceSection(props: DetailPanelProps) {
  const groups = groupEvidenceByCriterion(props.ticket.criteria, props.evidence);
  const body = (
    <div className="aidos-evidence-body">
      {groups.length === 0 && props.evidence.length === 0 ? (
        <p className="aidos-detail-note">No evidence rows yet.</p>
      ) : (
        groups.map((group) => renderCriterionGroup(group))
      )}
    </div>
  );

  return (
    <div className="aidos-panel-section">
      <div className="aidos-panel-head">
        <h4 className="aidos-panel-title">Evidence</h4>
        <button
          className="aidos-btn aidos-toggle-btn"
          onClick={props.onToggleEvidence}
        >
          {props.evidenceCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {props.evidenceCollapsed ? null : body}
    </div>
  );
}

export function DetailPanel(props: DetailPanelProps) {
  const ticket = props.ticket;
  const badge = badgeClass(ticket.state);
  const uncovered = uncoveredCriteria(ticket.criteria, props.evidence);

  return (
    <div className="aidos-detail">
      <div className="aidos-detail-head">
        <h3 className="aidos-detail-title">{ticket.title}</h3>
        <button className="aidos-close-btn" onClick={props.onClose}>
          {"\u00d7"}
        </button>
      </div>
      <div className="aidos-ring-wrap"><ConfidenceRing ticket={ticket} /></div>
      <div className="aidos-tile-meta">
        <span className="aidos-tile-gate">
          {formatGateFraction(ticket.gateFraction, hasCriteria(ticket))}
        </span>
        <span className={badge}>{stateLabel(ticket.state)}</span>
      </div>
      {ticket.description ? (
        <p className="aidos-detail-body">{ticket.description}</p>
      ) : null}
      <p className="aidos-detail-body">{"#" + ticket.id}</p>
      <EvidenceTags evidence={props.evidence} />
      {uncovered.length > 0 ? (
        <p className="aidos-detail-note">
          {uncovered.length + " uncovered criteria"}
        </p>
      ) : null}
      {renderEvidenceSection(props)}
    </div>
  );
}
