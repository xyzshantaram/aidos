/**
 * One square ticket tile. Shows the id chip, the title, the state chip, the
 * gate fraction, the confidence, evidence tags, and dependency chips.
 * The active marker names the in_progress ticket with the latest update.
 *
 * #194, REVERSED (owner, 2026-09-12: "Ticket actions bar is appearing in
 * local view - remove it"): the tile carries NO action chrome. Not fewer
 * buttons -- none. The first cut mounted the shared `ActionBar` here, which
 * imported the DETAIL PANEL's visibility rule (always visible, every action
 * present, unavailable ones greyed with unlock tooltips) onto the tile grid:
 * six mostly-greyed buttons on every tile of a 206-ticket board. The settled
 * rule is that always-visible-greyed is a PANEL affordance -- there you are
 * deciding about one ticket and the greyed button teaches you why it is
 * locked. The grid is a SCANNING surface; its tiles render chips and text
 * only. A ticket's human actions live in the detail panel's action bar
 * (`action-bar.tsx`), which keeps the #62 treatment and the #177 click-time
 * re-check; the tile implements no flow of its own and opens no dialog.
 *
 * The tile root is a <button> again. It had been a div wearing the button
 * role only because action buttons cannot nest inside a button; with the
 * action row gone that exception is dead, and the native element restores
 * the semantics (Enter/Space select for free, no key handler to maintain).
 *
 * #199: the exported TicketTile is a thin wrapper that (a) always calls the
 * hooks, in a stable order, and (b) returns a CACHED element when nothing
 * that shapes the markup changed. A cached return is what React's bail-out
 * needs (same element reference -> the subtree is not reconciled), and
 * keeping the hooks in the wrapper keeps hook order legal on every render.
 * The cache is keyed by ticket (session-stamped id) and validated against
 * the props that reach the markup; onSelect is deliberately excluded -- see
 * the note above tilePropsEqual. Live updates propagate because any tick
 * carrying new data for a row hands the tile a NEW ticket object, which
 * fails the identity check and rebuilds.
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
  tagColor,
  ticketChipLabel,
} from "./board-logic";
import { EvidenceTags } from "./evidence-tags";
import { AlertCircleIcon, CompassIcon, ForkIcon, KeyholeIcon } from "./icons";

import type { TicketView } from "../kernel/projections";
import type { EvidenceRow } from "../kernel/types";

/**
 * #138: one compact chip per freeform tag.
 *
 * Hook-free and exported so it is directly unit-renderable AND shared: the
 * detail panel renders this same component rather than a second copy. The
 * hue rides the same `--chip-hue` custom property the evidence kind chips
 * use (see board.css `.aidos-chip`), so no stylesheet change is needed —
 * but that shared mechanism is also why a tag chip READS like an evidence
 * chip at a glance. That collision is reported on #138 rather than
 * redesigned here: renaming either chip's look belongs to its owner.
 */
export function TicketTagChips(props: { tags: readonly string[] }) {
  if (props.tags.length === 0) return null;
  return (
    <>
      {props.tags.map((tag) => (
        <span
          key={tag}
          className="aidos-chip aidos-chip-tag"
          style={{ ["--chip-hue"]: tagColor(tag) } as react.CSSProperties}
          aria-label={"Tag " + tag}
          title={"Tag " + tag}
          data-dsh-tip=""
        >
          {tag}
        </span>
      ))}
    </>
  );
}

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
  /*
   * #199: the cache is the reason this wrapper exists. The hooks it used to
   * carry (the #194 dialog state) left with the action row; the wrapper and
   * its stable call pattern stay, so the memoisation contract -- always call
   * the same hooks in the same order, return a cached element on a hit --
   * holds without a conditional-hook hazard ever being one edit away.
   */
  const key = tileCacheKey(props.ticket);
  const hit = tileMarkupCache.get(key);
  if (hit !== undefined && tilePropsEqual(hit.props, props)) {
    return hit.element;
  }
  const element = renderTicketTile(props);
  if (tileMarkupCache.size >= TILE_CACHE_LIMIT) tileMarkupCache.clear();
  tileMarkupCache.set(key, { props, element });
  return element;
}

/**
 * #199: rendered tile markup, keyed by the session-stamped ticket id and
 * validated by tilePropsEqual. Bounded: a board churn (tickets created and
 * retired across sessions) can only grow the key set, so at the limit the
 * cache drops wholesale -- a cold rebuild is correct, merely slower.
 */
const TILE_CACHE_LIMIT = 1024;
const tileMarkupCache = new Map<
  string,
  { props: TicketTileProps; element: react.ReactElement }
>();

/** The cache key: one ticket in one owning session. */
function tileCacheKey(ticket: TicketView): string {
  const stamped = (ticket as { sourceSessionId?: unknown }).sourceSessionId;
  return (typeof stamped === "string" ? stamped : "") + ":" + String(ticket.id);
}

/** Two empty evidence arrays (the common case: `?? []` at the call site)
 *  are the same markup even though they are different array objects. */
function tileEvidenceEqual(
  a: readonly EvidenceRow[],
  b: readonly EvidenceRow[],
): boolean {
  return a === b || (a.length === 0 && b.length === 0);
}

/**
 * The props that reach the markup. onSelect is DELIBERATELY excluded: the
 * grid passes a fresh closure every render, so including it would void the
 * cache entirely. A stale onSelect is safe to keep: its only state-dependent
 * behaviour is the toggle-shut check, which reads the closure's selectedKey
 * -- and the only tile whose behaviour changes when the selection moves is
 * the selected tile, whose `selected` prop flips and forces a rebuild.
 */
function tilePropsEqual(a: TicketTileProps, b: TicketTileProps): boolean {
  return (
    a.ticket === b.ticket &&
    tileEvidenceEqual(a.evidence, b.evidence) &&
    a.selected === b.selected &&
    (a.active ?? false) === (b.active ?? false) &&
    (a.awaitingApproval ?? false) === (b.awaitingApproval ?? false) &&
    a.ownWorkspaceKey === b.ownWorkspaceKey
  );
}

function renderTicketTile(props: TicketTileProps) {
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
        <TicketTagChips tags={ticket.tags ?? []} />
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
