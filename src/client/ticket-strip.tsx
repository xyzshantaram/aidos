/**
 * #93: the TICKET STRIP. One ticket rendered as a compact row — id chip,
 * title, state chip, gate fraction — with slots the CALLER fills for the
 * meta and actions that matter in its context.
 *
 * The same treatment `EvidenceStrip` got, and for the same reason: a ticket
 * referenced (rather than opened) should look identical everywhere it
 * appears. Deliberate consumers:
 *
 *  - the human work queue (#93): meta is the prompt and any agent
 *    nomination reason; actions are Sign off / Verify / Mark done / Dismiss.
 *  - the dependency section: meta is the edge direction; the action is Open.
 *  - tool-call result cards (#73): meta is whatever that call is about, and
 *    the actions are the call's own.
 *
 * The strip renders no action of its own and knows no board verbs, so
 * adding a consumer never means editing this file.
 */
import react from "react";

import {
  badgeClass,
  formatGateFraction,
  fullTicketId,
  gateIsFailed,
  hasCriteria,
  idColor,
  stateLabel,
  ticketChipLabel,
} from "./board-logic";
import { KeyholeIcon, PopOutIcon } from "./icons";

import type { TicketView } from "../kernel/projections";

/** The minimum a strip needs. Anything TicketView-shaped satisfies it. */
export type TicketStripTicket = Pick<
  TicketView,
  "id" | "title" | "state" | "slug" | "workspaceKey"
> &
  Partial<Pick<TicketView, "gatePresent" | "gateTotal" | "criteria">>;

export interface TicketStripProps {
  ticket: TicketStripTicket;
  /**
   * The context line under the title. A string renders as plain meta; a node
   * lets a caller mix chips or emphasis into it.
   */
  meta?: react.ReactNode;
  /** Opens the ticket in the detail panel. Renders the pop-out affordance. */
  onOpen?: () => void;
  /**
   * Caller-supplied action buttons. Rendered on a SECOND ROW, revealed by
   * the action icon -- see the note at the toggle below for why they are no
   * longer inline.
   */
  actions?: react.ReactNode;
  /**
   * The coloured icon that stands for this row's action while it is
   * collapsed. Absent means the row has no actions and shows no toggle.
   */
  actionIcon?: react.ReactNode;
  /** What the icon means, for its tooltip and its accessible name. */
  actionHint?: string;
  /** Whether the action row is revealed. Owned by the caller, so only one
   *  row need be open at a time. */
  expanded?: boolean;
  onToggleActions?: () => void;
  /** Dims the row while one of its actions is in flight. */
  working?: boolean;
  /** Marks the row as the one the agent is pointing at. */
  highlighted?: boolean;
  /**
   * #93: this ticket carries a PENDING APPROVAL REQUEST the human has not
   * answered. Shown as its own chip because a queued approval card was
   * otherwise invisible unless you already had that ticket open -- five
   * stacked up unseen in one session before this existed.
   */
  awaitingApproval?: boolean;
}

export function TicketStrip(props: TicketStripProps) {
  const ticket = props.ticket;
  const full = fullTicketId(ticket as TicketView);
  const className =
    "aidos-ticket-strip" +
    (props.highlighted === true ? " aidos-ticket-strip-highlighted" : "") +
    (props.working === true ? " aidos-ticket-strip-working" : "");
  const showGate =
    ticket.gatePresent !== undefined || ticket.gateTotal !== undefined;
  return (
    <li className={className}>
      <div className="aidos-ticket-strip-main">
        {/*
          * #93 (user's design): the STATE moves under the id as coloured
          * TEXT rather than sitting in the chip row as another badge.
          *
          * A state is a property of the ticket, not an ask, and rendering it
          * as a badge gave it the same visual weight as the things that
          * actually need attention. As coloured text under the id it still
          * reads instantly, while surrendering the horizontal space the
          * title and the agent's reason were being squeezed out of.
          */}
        <span className="aidos-ticket-strip-idcol">
          <span
            className="aidos-chip aidos-chip-id"
            style={{ ["--chip-hue"]: idColor(full) } as react.CSSProperties}
            title={full}
            data-dsh-tip=""
          >
            {ticketChipLabel(ticket as TicketView)}
          </span>
          {/*
            * PARENTHESISED (user's design). The state lost its chip border
            * when it became coloured text, and without one it read as part
            * of the id -- "thursday#2 Open" scans as a two-word name. The
            * parens give it back a boundary at no visual weight, which is
            * the whole point of moving it out of a chip.
            *
            * The title keeps the bare label: a tooltip reading "(Open)" is
            * quoting the punctuation rather than naming the state.
            */}
          <span
            className={"aidos-ticket-strip-state " + badgeClass(ticket.state)}
            title={stateLabel(ticket.state)}
            data-dsh-tip=""
          >
            ({stateLabel(ticket.state)})
          </span>
        </span>
        <span className="aidos-ticket-strip-body">
          <span className="aidos-ticket-strip-title" title={ticket.title} data-dsh-tip="">
            {ticket.title}
          </span>
          {props.meta !== undefined ? (
            <span className="aidos-ticket-strip-meta">{props.meta}</span>
          ) : null}
        </span>
        <span className="aidos-ticket-strip-chips">
          {props.awaitingApproval === true ? (
            <span
              className="aidos-chip aidos-chip-awaiting-approval"
              title="This ticket has a request waiting for your approval"
              data-dsh-tip=""
            >
              Needs approval
            </span>
          ) : null}
          {/* The state chip moved under the id (see above), so it is not
              repeated here. */}
          {showGate ? (
            /*
             * #21's chip, not a second design (user: "Gate badge should use
             * the new styling from the ticket board").
             *
             * The board replaced the literal word "Gate" with a KEY icon --
             * the value is the information, the word was four characters of
             * furniture repeated on every row. The queue kept the old chip,
             * so the same fact wore two different faces depending on which
             * surface you were looking at.
             *
             * The sentence rides BOTH aria-label and title, exactly as the
             * tile does. #21's review found that `title` alone never reaches
             * the accessible name when the element has text content, so a
             * screen reader heard a bare "3/4" -- strictly worse than the
             * word it replaced. An icon may replace a label only when the
             * label survives for everyone.
             */
            (() => {
              const fraction = formatGateFraction(
                ticket.gatePresent ?? null,
                ticket.gateTotal ?? null,
                hasCriteria(ticket as TicketView),
              );
              const sentence = `Gate: ${fraction} of the required evidence is attached`;
              /* Red for failures, same rule as the tile -- the decision is
                 shared, in board-logic. */
              const failed = gateIsFailed(
                ticket.gatePresent ?? null,
                ticket.gateTotal ?? null,
                hasCriteria(ticket as TicketView),
              );
              return (
                <span
                  className={
                    "aidos-chip aidos-chip-metric aidos-chip-gate" +
                    (failed ? " aidos-chip-fail" : "")
                  }
                  aria-label={sentence}
                  title={sentence}
                  data-dsh-tip=""
                >
                  <span className="aidos-chip-key">
                    <KeyholeIcon />
                  </span>
                  <span className="aidos-chip-value">{fraction}</span>
                </span>
              );
            })()
          ) : null}
        </span>
        <span className="aidos-ticket-strip-actions">
          {props.onOpen !== undefined ? (
            <button
              className="aidos-icon-btn"
              title={"Open " + full}
              data-dsh-tip=""
              aria-label={"Open " + full}
              disabled={props.working === true}
              onClick={(event: react.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                props.onOpen?.();
              }}
            >
              <PopOutIcon />
            </button>
          ) : null}
          {/*
            * #93 (user's design): the row COLLAPSES to a single coloured
            * action icon, and clicking it reveals the buttons on a second
            * row below.
            *
            * This dissolves the alignment problem rather than solving it.
            * Five attempts failed to align an inline button row because a
            * row's action set VARIES -- one action or two, a Dismiss or
            * none -- so any fixed layout either reserved dead space (the gap
            * beside "Sign off") or went ragged. With nothing inline, there
            * is nothing to align until a row is opened, and an opened row is
            * alone.
            *
            * It also gives the title and the agent's reason back the width
            * the buttons were taking, which was the other half of the
            * report.
            */}
          {props.actionIcon !== undefined ? (
            <button
              className={
                "aidos-strip-action-toggle" + (props.expanded === true ? " is-open" : "")
              }
              title={props.actionHint ?? "Show actions"}
              data-dsh-tip=""
              aria-label={props.actionHint ?? "Show actions"}
              aria-expanded={props.expanded === true}
              disabled={props.working === true}
              onClick={(event: react.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                props.onToggleActions?.();
              }}
            >
              {props.actionIcon}
            </button>
          ) : null}
        </span>
      </div>
      {/*
        * The revealed action row. Rendered only when open, so a collapsed
        * queue is a clean column of one-line rows.
        */}
      {props.expanded === true && props.actions !== undefined ? (
        <div className="aidos-ticket-strip-actionrow">{props.actions}</div>
      ) : null}
    </li>
  );
}
