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
import type { EvidenceRow } from "../kernel/types";

export interface TicketViewProps {
  sessionId: string;
  tickets: TicketView[];
  allTicketsCount: number;
  applied: AppliedState;
  selectedId: number | null;
  activeTicketId: number | null;
  /** Ticket id (string) to its evidence rows. Undefined falls back to empty. */
  evidenceByTicket?: Record<string, EvidenceRow[]>;
  onSelect: (id: number) => void;
  onApply: (state: AppliedState) => void;
  onJump: (id: number) => void;
  onClearFilters: () => void;
  onCreate: () => void;
  projects?: { id: number; name: string }[];
}

export function TicketView(props: TicketViewProps) {
  const [collapsed, setCollapsed] = react.useState(false);

  const tiles = props.tickets.map((ticket) => (
    <TicketTile
      key={ticket.id}
      ticket={ticket}
      evidence={props.evidenceByTicket?.[String(ticket.id)] ?? []}
      selected={ticket.id === props.selectedId}
      active={ticket.id === props.activeTicketId}
      onSelect={() => {
        props.onSelect(ticket.id);
      }}
    />
  ));

  let content;
  if (props.allTicketsCount === 0) {
    content = (
      <div className="aidos-empty">
        <h3 className="aidos-empty-title">No tickets yet</h3>
        <p className="aidos-empty-note">
          This session holds no tickets. Create the first one to start the board.
        </p>
        <button className="aidos-btn aidos-btn-primary" onClick={props.onCreate}>
          Create a ticket
        </button>
      </div>
    );
  } else if (props.tickets.length === 0) {
    content = (
      <div className="aidos-empty">
        <h3 className="aidos-empty-title">No tickets match</h3>
        <p className="aidos-empty-note">
          The active filters hide every ticket. Clear them to see the board.
        </p>
        <button className="aidos-btn" onClick={props.onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  } else {
    content = <div className="aidos-board-grid">{tiles}</div>;
  }

  return (
    <div className="aidos-root">
      <FilterPanel
        sessionId={props.sessionId}
        projects={props.projects}
        applied={props.applied}
        tickets={props.tickets}
        onApply={props.onApply}
        onJump={props.onJump}
        collapsed={collapsed}
        onToggleCollapsed={() => {
          setCollapsed(!collapsed);
        }}
      />
      <div className="aidos-grid-wrap">
        <div className="aidos-grid-chrome">
          <span className="aidos-empty-note">
            {props.tickets.length + " of " + props.allTicketsCount + " tickets"}
          </span>
          <button className="aidos-btn aidos-btn-primary" onClick={props.onCreate}>
            Create
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
