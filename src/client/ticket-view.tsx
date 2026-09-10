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
import { queueButtonState, queueButtonTitle } from "./human-queue";
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
   * #180: opens the Tags browser. Absent hides the button entirely. The
   * count is the number of DISTINCT tags in the workspace (what the modal
   * lists), passed by the wrapper so this view stays presentation-only.
   */
  onTags?: () => void;
  /** #180: how many distinct tags the workspace carries. */
  tagsTotal?: number;
  /**
   * #108: opens the Retired panel. Shown only while at least one ticket is
   * retired — a permanent zero button is furniture the board does not need.
   */
  onRetired?: () => void;
  /** #108: how many tickets are currently retired (the button's count). */
  retiredCount?: number;
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
   * #131 round 2: the TOTAL number of queue entries — what the number on
   * the badge shows, always, including zero.
   *
   * Separate from the ask count on purpose. The number answers "how much is
   * waiting" and must match what opening the queue shows; the ask count
   * only decides the badge's colour and its tooltip. Round 1 collapsed the
   * two into one value and the toolbar ended up showing nothing at all in
   * the common case.
   */
  queueTotal?: number;
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

  // #131: one decision, evaluated once, read by the badge class, the title
  // and the number so the three can never disagree.
  const queueButton = queueButtonState(props.queueTotal ?? 0, props.agentAskCount ?? 0);

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
              className="aidos-btn"
              onClick={props.onQueue}
              /*
               * Staleness is disclosed rather than hidden: keeping the last
               * good count through an outage is right -- a blank button
               * would claim nothing is waiting -- but presenting a stale
               * number as current is how a surface loses trust.
               */
              title={queueButtonTitle(queueButton, props.agentAskCountStale === true)}
              data-dsh-tip=""
            >
              {"Waiting on you"}
              {/*
                * The BADGE carries the attention colour, never the button.
                * Round 1 put the class on the button and the user reported
                * it on sight: a whole control changing colour is a much
                * louder statement than a coloured count, and it fought
                * every other button in the toolbar.
                */}
              <b
                className={
                  "aidos-queue-count" + (queueButton.indicator ? " aidos-queue-count-asks" : "")
                }
              >
                {queueButton.count}
              </b>
            </button>
          ) : null}
          {/*
            * #108: the Retired panel's entry. Hidden at zero — the owner's
            * ask is a panel that exists when something is retired, not a
            * permanent counter of nothing.
            */}
          {props.onRetired !== undefined && (props.retiredCount ?? 0) > 0 ? (
            <button
              className="aidos-btn"
              onClick={props.onRetired}
              title="Hidden tickets — view and un-retire them"
              data-dsh-tip=""
            >
              {"Retired"}
              <b className="aidos-queue-count">{props.retiredCount}</b>
            </button>
          ) : null}
          <button className="aidos-btn" onClick={props.onPlan}>
            Plan
          </button>
          {props.onTags !== undefined ? (
            <button
              className="aidos-btn"
              onClick={props.onTags}
              title="Browse every tag in the workspace, with counts"
              data-dsh-tip=""
            >
              {"Tags"}
              <b className="aidos-queue-count">{props.tagsTotal ?? 0}</b>
            </button>
          ) : null}
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
