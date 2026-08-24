/**
 * Ticket U2b: the real ticket detail panel. Fields on top, evidence grouped
 * by criterion below in a collapsible section, uncovered criteria tinted.
 * Read-only: editing and moves are U2c.
 */

import react from "react";

import {
  evidenceKindCounts,
  formatGateFraction,
  groupEvidenceByCriterion,
  hasCriteria,
  ringPercent,
  stateLabel,
  uncoveredCriteria,
} from "./board-logic";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRow } from "../kernel/types";

export interface DetailPanelProps {
  ticket: TicketView;
  evidence: readonly EvidenceRow[];
  evidenceCollapsed: boolean;
  onToggleEvidence: () => void;
  onClose: () => void;
}

/** The css suffix for one state badge. */
function stateClass(state: TicketView["state"]): string {
  switch (state) {
    case "open":
      return "open";
    case "in_progress":
      return "in-progress";
    case "awaiting_verification":
      return "awaiting-verification";
    case "done":
      return "done";
  }
}

/** The confidence ring. A fraction arc when the ticket has criteria. */
function renderRing(ticket: TicketView) {
  const has = hasCriteria(ticket);
  const percent = ringPercent(ticket.confidenceScore);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const arcLength = has ? (percent / 100) * circumference : 0;

  const track = react.createElement("circle", {
    cx: 32,
    cy: 32,
    r: radius,
    fill: "none",
    stroke: "var(--dsw-alias-border-l2)",
    strokeWidth: 5,
  });

  const arc =
    has && percent > 0
      ? react.createElement("circle", {
          cx: 32,
          cy: 32,
          r: radius,
          fill: "none",
          stroke: "var(--dsw-alias-brand-primary)",
          strokeWidth: 5,
          strokeLinecap: "round",
          strokeDasharray: arcLength + " " + circumference,
          transform: "rotate(-90 32 32)",
        })
      : null;

  const percentText = react.createElement(
    "text",
    {
      x: 32,
      y: 37,
      textAnchor: "middle",
      className: has ? "aidos-ring-percent" : "aidos-ring-na",
    },
    has ? Math.round(percent) + "%" : "N/A",
  );

  const asterisk =
    has && percent > 0
      ? react.createElement(
          "text",
          {
            x: 47,
            y: 24,
            textAnchor: "middle",
            className: "aidos-ring-asterisk",
            title: "Advisory score. It never unlocks anything.",
          },
          "*",
        )
      : null;

  return react.createElement(
    "svg",
    { className: "aidos-ring", viewBox: "0 0 64 64" },
    track,
    arc,
    percentText,
    asterisk,
  );
}

/** One criterion row: the label, an uncovered tint when nothing addresses it. */
function renderCriterionGroup(
  group: ReturnType<typeof groupEvidenceByCriterion>[number],
  index: number,
) {
  const isUngrouped = group.criterion === "";
  const rowClass = isUngrouped
    ? "aidos-criterion aidos-criterion-ungrouped"
    : group.matched
      ? "aidos-criterion"
      : "aidos-criterion aidos-criterion-uncovered";
  const label = isUngrouped
    ? "Ungrouped"
    : react.createElement(
        "span",
        { className: "aidos-criterion-label" },
        group.criterion,
      );

  const rows = group.rows.map(function (row, rowIndex) {
    return react.createElement(
      "div",
      { className: "aidos-evidence-row-item", key: rowIndex },
      react.createElement(
        "span",
        { className: "aidos-evidence-kind" },
        row.kind,
      ),
      react.createElement(
        "span",
        { className: "aidos-evidence-author" },
        row.author,
      ),
      typeof row.payload.criteria === "string"
        ? react.createElement(
            "span",
            { className: "aidos-evidence-meta" },
            "criterion: " + row.payload.criteria,
          )
        : null,
    );
  });

  return react.createElement(
    "div",
    { className: rowClass, key: index },
    react.createElement(
      "div",
      { className: "aidos-criterion-head" },
      label,
      react.createElement(
        "span",
        { className: "aidos-criterion-count" },
        String(group.rows.length),
      ),
    ),
    rows,
  );
}

/** The collapsible evidence section: criteria in order, ungrouped last. */
function renderEvidenceSection(props: DetailPanelProps) {
  const groups = groupEvidenceByCriterion(props.ticket.criteria, props.evidence);
  const uncovered = uncoveredCriteria(props.ticket.criteria, props.evidence);

  const body = react.createElement(
    "div",
    { className: "aidos-evidence-body" },
    groups.length === 0 && props.evidence.length === 0
      ? react.createElement(
          "p",
          { className: "aidos-detail-note" },
          "No evidence rows yet.",
        )
      : groups.map(function (group, index) {
          return renderCriterionGroup(group, index);
        }),
  );

  return react.createElement(
    "div",
    { className: "aidos-panel-section" },
    react.createElement(
      "div",
      { className: "aidos-panel-head" },
      react.createElement(
        "h4",
        { className: "aidos-panel-title" },
        "Evidence",
      ),
      react.createElement(
        "button",
        {
          className: "aidos-btn aidos-toggle-btn",
          onClick: props.onToggleEvidence,
        },
        props.evidenceCollapsed ? "Expand" : "Collapse",
      ),
    ),
    props.evidenceCollapsed ? null : body,
  );
}

/** The tile-style evidence tags: one per kind with a count. */
function renderKindTags(props: DetailPanelProps) {
  const counts = evidenceKindCounts(props.evidence);
  const tags = counts.map(function (count, index) {
    return react.createElement(
      "span",
      {
        className: "aidos-evidence-tag",
        key: count.kind,
        style: { borderColor: count.color, color: count.color },
      },
      count.kind + " " + count.count,
    );
  });
  return tags.length === 0
    ? null
    : react.createElement("div", { className: "aidos-evidence-tags" }, tags);
}

export function DetailPanel(props: DetailPanelProps) {
  const ticket = props.ticket;
  const badgeClass = "aidos-state-badge aidos-state-" + stateClass(ticket.state);
  const uncovered = uncoveredCriteria(ticket.criteria, props.evidence);

  return react.createElement(
    "div",
    { className: "aidos-detail" },
    react.createElement(
      "div",
      { className: "aidos-detail-head" },
      react.createElement("h3", { className: "aidos-detail-title" }, ticket.title),
      react.createElement(
        "button",
        { className: "aidos-detail-close", onClick: props.onClose },
        "\u00d7",
      ),
    ),
    react.createElement("div", { className: "aidos-ring-wrap" }, renderRing(ticket)),
    react.createElement(
      "div",
      { className: "aidos-tile-meta" },
      react.createElement(
        "span",
        { className: "aidos-tile-gate" },
        formatGateFraction(ticket.gateFraction, hasCriteria(ticket)),
      ),
      react.createElement(
        "span",
        { className: badgeClass },
        stateLabel(ticket.state),
      ),
    ),
    ticket.description
      ? react.createElement("p", { className: "aidos-detail-body" }, ticket.description)
      : null,
    react.createElement("p", { className: "aidos-detail-body" }, "#" + ticket.id),
    renderKindTags(props),
    uncovered.length > 0
      ? react.createElement(
          "p",
          { className: "aidos-detail-note" },
          uncovered.length + " uncovered criteria",
        )
      : null,
    renderEvidenceSection(props),
  );
}
