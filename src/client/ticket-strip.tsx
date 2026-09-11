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
 *
 * #199: the strip's markup is cached and keyed by CONTENT. Every tick used
 * to re-execute every strip on screen, including the tool-call cards
 * (#73) whose ticket data had not changed -- the card re-renders because
 * its row of the transcript re-renders, not because the ticket moved. The
 * exported TicketStrip now returns a cached element when the ticket's
 * read fields and the caller-supplied nodes are unchanged, so an
 * unchanged row costs a comparison instead of a render. A tick carrying
 * new data fails the comparison and rebuilds, so live updates propagate.
 * The strip has no hooks, so the cache needs no hook-order care.
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
   * Whether the strip prints the ticket's state under its id chip.
   *
   * Defaults to TRUE. A caller with a heading above it that already says
   * the state may pass false — but the queue does NOT: its tabs name the
   * ASK (sign off / approvals / verify), not the state, so the badge is
   * the only place the row says what it is.
   */
  showState?: boolean;
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

/**
 * #199: rendered strip markup, keyed by ticket id and validated by
 * stripPropsEqual. Bounded the same way the tile cache is: at the limit
 * it drops wholesale and the next render rebuilds cold, which is correct.
 */
const STRIP_CACHE_LIMIT = 1024;
const stripMarkupCache = new Map<
  string,
  { props: TicketStripProps; element: react.ReactElement }
>();

export function TicketStrip(props: TicketStripProps) {
  const key = String(props.ticket.id);
  const hit = stripMarkupCache.get(key);
  if (hit !== undefined && stripPropsEqual(hit.props, props)) {
    return hit.element;
  }
  const element = renderTicketStrip(props);
  if (stripMarkupCache.size >= STRIP_CACHE_LIMIT) stripMarkupCache.clear();
  stripMarkupCache.set(key, { props, element });
  return element;
}

/**
 * The comparison. The ticket is compared by the fields the strip READS
 * (content, not identity: callers build fresh row objects on every
 * render, and #73's tool cards are exactly the case where identity always
 * changes but content does not). The caller-supplied nodes -- meta,
 * actions, actionIcon -- are compared by identity: building them is the
 * caller's per-render work, and the caller that hands a NEW node usually
 * has new content in it. onOpen and onToggleActions are excluded: the
 * grid and the queue pass fresh closures every render, and a row's
 * closure only ever names ITS OWN ticket key, which the compared fields
 * already pin (the one state-dependent toggle reads `expanded`, which is
 * compared).
 */
function stripPropsEqual(a: TicketStripProps, b: TicketStripProps): boolean {
  const ta = a.ticket as Partial<TicketStripTicket>;
  const tb = b.ticket as Partial<TicketStripTicket>;
  return (
    ta.id === tb.id &&
    ta.title === tb.title &&
    ta.state === tb.state &&
    ta.slug === tb.slug &&
    ta.workspaceKey === tb.workspaceKey &&
    (ta.gatePresent ?? null) === (tb.gatePresent ?? null) &&
    (ta.gateTotal ?? null) === (tb.gateTotal ?? null) &&
    (ta.criteria ?? null) === (tb.criteria ?? null) &&
    (a.showState ?? null) === (b.showState ?? null) &&
    a.meta === b.meta &&
    a.actions === b.actions &&
    a.actionIcon === b.actionIcon &&
    (a.actionHint ?? null) === (b.actionHint ?? null) &&
    (a.expanded ?? false) === (b.expanded ?? false) &&
    (a.working ?? false) === (b.working ?? false) &&
    (a.highlighted ?? false) === (b.highlighted ?? false) &&
    (a.awaitingApproval ?? false) === (b.awaitingApproval ?? false)
  );
}

function renderTicketStrip(props: TicketStripProps) {
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
          * The STATE sits under the id as a REGULAR BADGE — the same chip
          * the board tile wears (badgeClass + stateLabel, no parens).
          *
          * History: #93 moved it out of the chip row as coloured parenthesised
          * text ("thursday#2 (Open)"), on the theory that a state is a property
          * of the ticket rather than an ask and should not carry a badge's
          * visual weight. The owner reversed it on sight: the parens read as
          * awkward prose next to real chips, and one face for one fact (#21's
          * rule — the same fact wearing two faces on two surfaces) matters
          * more than the weight argument. #137's criterion said exactly this:
          * where a state shows, it is the board's badge, not punctuation.
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
          {props.showState === false ? null : (
            <span
              className={badgeClass(ticket.state)}
              title={stateLabel(ticket.state)}
              data-dsh-tip=""
            >
              {stateLabel(ticket.state)}
            </span>
          )}
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
