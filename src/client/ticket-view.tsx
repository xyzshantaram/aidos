/**
 * The board layout. A collapsible filter sidebar beside a grid of square
 * tiles, with a persistent Create button in the grid chrome and two distinct
 * empty states.
 */

import react from "react";

import { FilterPanel } from "./filter-panel";
import type { AppliedState } from "./view-state";
import { TicketTile } from "./ticket-tile";
import { boardKeyOf } from "./board-logic";
import type { BoardKey } from "./board-logic";
import type { TicketView } from "../kernel/projections";

/** One merged board row (own rows carry foreign: false or the field is absent). */
type BoardTicket = TicketView & { sourceSessionId?: string; foreign?: boolean };
import type { EvidenceRow } from "../kernel/types";

export interface TicketViewProps {
  sessionId: string;
  tickets: BoardTicket[];
  allTicketsCount: number;
  applied: AppliedState;
  /** Board keys (own "id", foreign "sessionId:id") of the selection and the active row. */
  selectedId: BoardKey | null;
  activeTicketId: BoardKey | null;
  /** Board key to its evidence rows. Undefined falls back to empty. */
  evidenceByTicket?: Record<string, EvidenceRow[]>;
  onSelect: (key: BoardKey) => void;
  onApply: (state: AppliedState) => void;
  onJump: (key: BoardKey) => void;
  onClearFilters: () => void;
  onPlan: () => void;
  onCreate: () => void;
  /** #93: opens the human work queue. Absent hides the button entirely. */
  onQueue?: () => void;
  /** #93: how many asks are waiting on the human, for the badge. */
  queueCount?: number;
  projects?: { id: number; name: string }[];
}

export function TicketView(props: TicketViewProps) {
  const [collapsed, setCollapsed] = react.useState(false);

  const tiles = props.tickets.map((ticket) => (
    <TicketTile
      key={boardKeyOf(ticket)}
      ticket={ticket}
      evidence={props.evidenceByTicket?.[boardKeyOf(ticket)] ?? []}
      selected={boardKeyOf(ticket) === props.selectedId}
      active={boardKeyOf(ticket) === props.activeTicketId}
      onSelect={() => {
        props.onSelect(boardKeyOf(ticket));
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
      <div className="aidos-toolbar">
        <span className="aidos-empty-note">
          {props.tickets.length + " of " + props.allTicketsCount + " tickets"}
        </span>
        <span className="aidos-toolbar-actions">
          {props.onQueue !== undefined ? (
            <button
              className="aidos-btn"
              onClick={props.onQueue}
              title="What is waiting on you"
            >
              {"Waiting on you"}
              {props.queueCount !== undefined && props.queueCount > 0 ? (
                <span className="aidos-queue-badge">{props.queueCount}</span>
              ) : null}
            </button>
          ) : null}
          <button className="aidos-btn" onClick={props.onPlan}>
            Plan
          </button>
          <button className="aidos-btn aidos-btn-primary" onClick={props.onCreate}>
            Create
          </button>
        </span>
      </div>
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
        {content}
      </div>
    </div>
  );
}
