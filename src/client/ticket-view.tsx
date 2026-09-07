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
import { queueButtonState } from "./human-queue";
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
  /**
   * #131: how many queue entries are the AGENT ASKING for something the
   * gate still allows — nominations and pending approval cards alike. This
   * drives BOTH the number and the button's attention state.
   *
   * It replaced #93's total-entry count deliberately (user, 2026-09-07).
   * The total answers "how big is the backlog", which barely changes from
   * one minute to the next and so never earns a glance. An agent ask is
   * new information, which is the signal worth a colour.
   *
   * Approvals were added in round 2 after a review found the button idle in
   * the one state where the agent is hard-blocked. The name says "ask"
   * rather than "nomination" because it counts both: the previous name
   * outlived its meaning by exactly one commit.
   */
  agentAskCount?: number;
  /**
   * True when the last fetch behind that count FAILED and the view is
   * showing the last known value.
   *
   * The count is kept rather than cleared on failure, because a dark button
   * during an outage tells the human "nothing is waiting" — the worst lie
   * this surface can tell. The honest cost is a possibly-stale number, so
   * the button says so in its tooltip rather than presenting stale data as
   * current.
   */
  agentAskCountStale?: boolean;
  projects?: { id: number; name: string }[];
  /** #21: the viewing session's workspace, so local id chips drop the prefix. */
  ownWorkspaceKey?: string;
  /**
   * #21: BOARD KEYS of tickets with an allowlist request awaiting the human.
   * Board keys, not ids -- an id is not an address on a merged board, and
   * that confusion is behind eleven wrong-ticket bugs in this codebase.
   */
  awaitingApprovalKeys?: ReadonlySet<string>;
}

export function TicketView(props: TicketViewProps) {
  const [collapsed, setCollapsed] = react.useState(false);

  const tiles = props.tickets.map((ticket) => (
    <TicketTile
      key={boardKeyOf(ticket)}
      ticket={ticket}
      evidence={props.evidenceByTicket?.[boardKeyOf(ticket)] ?? []}
      ownWorkspaceKey={props.ownWorkspaceKey}
      awaitingApproval={props.awaitingApprovalKeys?.has(boardKeyOf(ticket)) === true}
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

  // #131: one decision, evaluated once, read by the class, the title and the
  // number so the three can never disagree.
  const queueButton = queueButtonState(props.agentAskCount ?? 0);

  return (
    <div className="aidos-root">
      <div className="aidos-toolbar">
        <span className="aidos-empty-note">
          {props.tickets.length + " of " + props.allTicketsCount + " tickets"}
        </span>
        <span className="aidos-toolbar-actions">
          {props.onQueue !== undefined ? (
            /*
             * #131: the count and the colour are ONE decision, taken by
             * queueButtonState so it can be tested without a browser. The
             * number is typographic (bold text beside the label), never a
             * pill -- the pill read as a second chip competing with the id
             * and gate chips the board already uses.
             */
            <button
              className={"aidos-btn" + (queueButton.indicator ? " aidos-btn-attention" : "")}
              onClick={props.onQueue}
              title={
                (queueButton.indicator
                  ? "The agent has asked for something you can act on"
                  : "What is waiting on you") +
                /*
                 * Staleness is disclosed, not hidden. Keeping the last good
                 * count through an outage is the right call -- a dark
                 * button would say "nothing is waiting" -- but presenting a
                 * stale number as current is how the surface loses trust.
                 */
                (props.agentAskCountStale === true
                  ? " (the last refresh failed; showing the last known count)"
                  : "")
              }
              data-dsh-tip=""
            >
              {"Waiting on you"}
              {queueButton.count !== null ? (
                <b className="aidos-queue-count">{queueButton.count}</b>
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
