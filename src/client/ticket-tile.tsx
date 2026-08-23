/**
 * One square ticket tile. Shows the title, the confidence ring, the gate
 * fraction, the state badge, and a placeholder evidence row.
 */

import react from "react";

import { formatGateFraction, hasCriteria, ringPercent, stateLabel } from "./board-logic";
import type { TicketView } from "../kernel/projections";

export interface TicketTileProps {
  ticket: TicketView;
  selected: boolean;
  onSelect: () => void;
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

/** The placeholder evidence chips. Real evidence arrives in a later ticket. */
function renderEvidenceRow() {
  const chips = [0, 1, 2].map(function (index) {
    return react.createElement("span", {
      className: "aidos-evidence-chip",
      key: index,
    });
  });
  return react.createElement("div", { className: "aidos-evidence-row" }, chips);
}

export function TicketTile(props: TicketTileProps) {
  const ticket = props.ticket;
  const className =
    "aidos-tile" + (props.selected ? " aidos-tile-selected" : "");
  const badgeClass = "aidos-state-badge aidos-state-" + stateClass(ticket.state);

  return react.createElement(
    "button",
    {
      className: className,
      onClick: props.onSelect,
      title: ticket.title,
    },
    react.createElement("h3", { className: "aidos-tile-title" }, ticket.title),
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
    renderEvidenceRow(),
  );
}
