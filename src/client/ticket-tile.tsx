/**
 * One square ticket tile. Shows the id chip, the title, the state chip, the
 * gate fraction, the confidence, evidence tags, and dependency chips.
 * The active marker names the in_progress ticket with the latest update.
 */

import react from "react";

import {
  badgeClass,
  displayDep,
  formatGateFraction,
  fullTicketId,
  gateIsFailed,
  hasCriteria,
  idColor,
  stateLabel,
  ringPercent,
  ticketChipLabel,
} from "./board-logic";
import { EvidenceTags } from "./evidence-tags";
import { AlertCircleIcon, ChevronIcon, CompassIcon, ForkIcon, KeyholeIcon } from "./icons";

import type { TicketView } from "../kernel/projections";
import type { EvidenceRow } from "../kernel/types";

export interface TicketTileProps {
  ticket: TicketView;
  evidence: readonly EvidenceRow[];
  selected: boolean;
  active?: boolean;
  /**
   * #21: the viewing session's workspace. Given, the id chip drops the
   * prefix that is identical on every tile; absent, the chip stays fully
   * qualified (it shows MORE, never less).
   */
  ownWorkspaceKey?: string;
  /**
   * #21: this ticket has an allowlist request waiting for the human. Shown
   * beside the id, because it is the one thing on the card that is BLOCKED
   * ON THEM -- so it is allowed to draw attention where the rest of the chip
   * row deliberately is not.
   */
  awaitingApproval?: boolean;
  onSelect: () => void;
}

export function TicketTile(props: TicketTileProps) {
  const ticket = props.ticket;
  /*
   * #83: other session copies of this same ticket, which the workspace merge
   * collapsed into this row.
   *
   * The #83 review found this field was DEAD DATA -- populated by the host,
   * shipped to the client, and read by nothing. The ticket claimed "nothing
   * becomes invisible" and "a reader can still reach them", which was
   * therefore theoretical: the duplicates stopped being shown and nothing
   * said they had existed.
   *
   * A chip is the minimum that makes the claim true. It states the count and
   * names the losing sessions and their timestamps on hover, so a reader who
   * wonders where a copy went has an answer rather than a silence.
   */
  const superseded =
    (ticket as { supersededCopies?: Array<{ sessionId: string; updatedAt: number }> })
      .supersededCopies ?? [];
  const className =
    "aidos-tile" +
    (props.selected ? " aidos-tile-selected" : "") +
    (props.active === true ? " aidos-tile-active" : "");
  const badge = badgeClass(ticket.state);
  /*
   * The decision lives in board-logic (unit tested): the tile and the queue
   * strip must agree on when the gate chip wears red.
   */
  const gateFailed = gateIsFailed(
    ticket.gatePresent,
    ticket.gateTotal,
    hasCriteria(ticket),
  );
  return (

    <button className={className} onClick={props.onSelect}>
      <div className="aidos-tile-meta">
        {/* The persistent chevron, matching the tool-render rows: always
            present so every tile carries the same affordance, rotating when
            this tile is the one whose detail is open. */}
        <span className="aidos-tile-chevron">
          <ChevronIcon open={props.selected} />
        </span>
        <span
          className="aidos-chip aidos-chip-id"
          style={{ ["--chip-hue"]: idColor(fullTicketId(ticket)) } as react.CSSProperties}
          title={fullTicketId(ticket)}
          data-dsh-tip=""
        >
          {ticketChipLabel(ticket, props.ownWorkspaceKey)}
        </span>
        {superseded.length > 0 ? (
          <span
            className="aidos-chip aidos-chip-copies"
            aria-label={
              superseded.length +
              " other session cop" +
              (superseded.length === 1 ? "y" : "ies") +
              " of this ticket were merged into this row"
            }
            title={
              "Merged from " +
              superseded.length +
              " other session cop" +
              (superseded.length === 1 ? "y" : "ies") +
              ". This row is the most recently updated one.\n" +
              superseded
                .map((copy) => `${copy.sessionId} (updated ${new Date(copy.updatedAt * 1000).toLocaleString()})`)
                .join("\n")
            }
            data-dsh-tip=""
          >
            {"+" + superseded.length}
          </span>
        ) : null}
        {props.awaitingApproval === true ? (
          <span
            className="aidos-chip aidos-chip-approval-flag"
            aria-label="This ticket has a request waiting for your approval"
            title="This ticket has a request waiting for your approval"
            data-dsh-tip=""
          >
            <AlertCircleIcon />
          </span>
        ) : null}
        <span className={badge}>{stateLabel(ticket.state)}</span>
      </div>
      <h3 className="aidos-tile-title">{ticket.title}</h3>
      <p className="aidos-tile-preview">{ticket.description}</p>
      <div className="aidos-tile-chips">
        {/*
         * #21: the metric chips carried the literal words "Gate" and "Conf".
         * The value is the information; the key was four characters of
         * furniture repeated on every tile. They become icons, and the
         * tooltip carries the full sentence -- a label may only be replaced
         * by an icon if hovering still explains it.
         */}
        <span
          className={
            "aidos-chip aidos-chip-metric aidos-chip-gate" +
            (gateFailed ? " aidos-chip-fail" : "")
          }
          /*
           * #21 review F4: `title` on a span inside a <button> NEVER reaches
           * the accessible name -- title is only a fallback for an element
           * with no other name source, and this span has text content. With
           * the glyph aria-hidden, a screen reader heard a bare "3/4" with no
           * key at all: strictly WORSE than the word "Gate" it replaced. An
           * icon may replace a label only if the label survives for everyone,
           * so the sentence rides aria-label as well as title.
           */
          aria-label={
            "Gate: " +
            formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)) +
            " of the required evidence is attached"
          }
          title={
            "Gate: " +
            formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket)) +
            " of the required evidence is attached"
          }
          data-dsh-tip=""
        >
          <span className="aidos-chip-key">
            <KeyholeIcon />
          </span>
          <span className="aidos-chip-value">
            {formatGateFraction(ticket.gatePresent, ticket.gateTotal, hasCriteria(ticket))}
          </span>
        </span>
        <EvidenceTags evidence={props.evidence} state={ticket.state} />
        {ticket.dependsOn?.map((ref) => (
          <span
            key={ref}
            className="aidos-chip aidos-chip-dep"
            aria-label={"Depends on " + ref}
            title={"Depends on " + ref}
            data-dsh-tip=""
          >
            <span className="aidos-chip-dep-icon">
              <ForkIcon />
            </span>
            {/*
              * #21 review F2: this passed `ticket.workspaceKey` -- the TILE's
              * own workspace -- into a parameter that means THE VIEWING
              * SESSION's workspace. On a foreign tile the two differ, so a
              * foreign ticket's dependency on its OWN workspace rendered as a
              * bare number, indistinguishable from a dependency on one of
              * ours. The id chip 50 lines up already used props.ownWorkspaceKey,
              * so the same tile disagreed with itself. Same address-space
              * confusion as the eleven wrong-ticket bugs, one call site away
              * from the fix that motivated this ticket.
              */}
            {displayDep(ref, props.ownWorkspaceKey)}
          </span>
        ))}
        <span
          className="aidos-chip aidos-chip-metric aidos-chip-conf"
          aria-label={
            "Confidence " +
            ringPercent(ticket.confidenceScore) +
            "%. Advisory only \u2014 it never unlocks anything."
          }
          title={
            "Confidence " +
            ringPercent(ticket.confidenceScore) +
            "%. Advisory only — it never unlocks anything."
          }
          data-dsh-tip=""
        >
          <span className="aidos-chip-key">
            <CompassIcon />
          </span>
          <span className="aidos-chip-value">{ringPercent(ticket.confidenceScore) + "%"}</span>
        </span>
      </div>
    </button>
  );
}
