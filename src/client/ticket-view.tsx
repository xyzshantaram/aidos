/**
 * The board layout. A collapsible filter sidebar beside a grid of square
 * tiles, with a persistent Create button in the grid chrome and two distinct
 * empty states.
 */

import react from "react";

import { FilterPanel } from "./filter-panel";
import type { AppliedState } from "./view-state";
import { TicketTile } from "./ticket-tile";
import type { TicketView } from "../kernel/projections";

export interface TicketViewProps {
  sessionId: string;
  tickets: TicketView[];
  allTicketsCount: number;
  applied: AppliedState;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onApply: (state: AppliedState) => void;
  onJump: (id: number) => void;
  onClearFilters: () => void;
  onCreate: () => void;
  projects?: { id: number; name: string }[];
}

export function TicketView(props: TicketViewProps) {
  const [collapsed, setCollapsed] = react.useState(false);

  const tiles = props.tickets.map(function (ticket) {
    return react.createElement(TicketTile, {
      key: ticket.id,
      ticket: ticket,
      selected: ticket.id === props.selectedId,
      onSelect: function () {
        props.onSelect(ticket.id);
      },
    });
  });

  let content;
  if (props.allTicketsCount === 0) {
    content = react.createElement(
      "div",
      { className: "aidos-empty" },
      react.createElement("h3", { className: "aidos-empty-title" }, "No tickets yet"),
      react.createElement(
        "p",
        { className: "aidos-empty-note" },
        "This session holds no tickets. Create the first one to start the board.",
      ),
      react.createElement(
        "button",
        { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate },
        "Create a ticket",
      ),
    );
  } else if (props.tickets.length === 0) {
    content = react.createElement(
      "div",
      { className: "aidos-empty" },
      react.createElement("h3", { className: "aidos-empty-title" }, "No tickets match"),
      react.createElement(
        "p",
        { className: "aidos-empty-note" },
        "The active filters hide every ticket. Clear them to see the board.",
      ),
      react.createElement(
        "button",
        { className: "aidos-btn", onClick: props.onClearFilters },
        "Clear filters",
      ),
    );
  } else {
    content = react.createElement("div", { className: "aidos-board-grid" }, tiles);
  }

  return react.createElement(
    "div",
    { className: "aidos-root" },
    react.createElement(FilterPanel, {
      sessionId: props.sessionId,
      projects: props.projects,
      applied: props.applied,
      tickets: props.tickets,
      onApply: props.onApply,
      onJump: props.onJump,
      collapsed: collapsed,
      onToggleCollapsed: function () {
        setCollapsed(!collapsed);
      },
    }),
    react.createElement(
      "div",
      { className: "aidos-grid-wrap" },
      react.createElement(
        "div",
        { className: "aidos-grid-chrome" },
        react.createElement(
          "span",
          { className: "aidos-empty-note" },
          props.tickets.length + " of " + props.allTicketsCount + " tickets",
        ),
        react.createElement(
          "button",
          { className: "aidos-btn aidos-btn-primary", onClick: props.onCreate },
          "Create",
        ),
      ),
      content,
    ),
  );
}
