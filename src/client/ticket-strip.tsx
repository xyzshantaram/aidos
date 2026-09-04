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
  hasCriteria,
  idColor,
  stateLabel,
  ticketChipLabel,
} from "./board-logic";
import { PopOutIcon } from "./icons";

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
  /** Caller-supplied action buttons, rendered after the open affordance. */
  actions?: react.ReactNode;
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
        <span
          className="aidos-chip aidos-chip-id"
          style={{ background: idColor(full) }}
          title={full}
        >
          {ticketChipLabel(ticket as TicketView)}
        </span>
        <span className="aidos-ticket-strip-body">
          <span className="aidos-ticket-strip-title" title={ticket.title}>
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
            >
              Needs approval
            </span>
          ) : null}
          <span className={badgeClass(ticket.state)}>{stateLabel(ticket.state)}</span>
          {showGate ? (
            <span className="aidos-chip aidos-chip-metric" title="Gate progress">
              <span className="aidos-chip-key">Gate</span>
              <span className="aidos-chip-value">
                {formatGateFraction(
                  ticket.gatePresent ?? null,
                  ticket.gateTotal ?? null,
                  hasCriteria(ticket as TicketView),
                )}
              </span>
            </span>
          ) : null}
        </span>
        <span className="aidos-ticket-strip-actions">
          {props.onOpen !== undefined ? (
            <button
              className="aidos-icon-btn"
              title={"Open " + full}
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
            * The caller's actions get their OWN wrapper (#93, user-reported
            * twice: "lost the right alignment", then "still broken").
            *
            * They used to be siblings of the pop-out button in this span,
            * which mixes two concerns -- the strip's own affordance and the
            * caller's buttons -- in one box. Making that box a grid could
            * never align reliably, because its child COUNT varies: the icon
            * may be absent, and a Dismiss may or may not follow. A fixed
            * column template misaligns the moment either changes.
            *
            * Split, each layout does one job: this span stays flex and keeps
            * the right alignment it always had, and the group below is the
            * grid that makes every caller button the same size.
            */}
          {props.actions !== undefined ? (
            <span className="aidos-ticket-strip-action-group">{props.actions}</span>
          ) : null}
        </span>
      </div>
    </li>
  );
}
