/**
 * One square ticket tile. Shows the id chip, the title, the state chip, the
 * gate fraction, the confidence, evidence tags, and dependency chips.
 * The active marker names the in_progress ticket with the latest update.
 *
 * #194: the tile also carries the ticket's human-action buttons, derived
 * from the SAME `actionsFor` availability the detail panel's action bar
 * uses -- a button is shown if and only if the action is currently legal,
 * with no agent nomination involved. The buttons ARE the shared `ActionBar`
 * (grey with tooltip, exactly as the panel shows them: no third treatment),
 * and every click re-checks eligibility against the board BEFORE any flow
 * opens, so a stale card refuses with the reason writing nothing (the #177
 * lesson). The flows are the SAME components the detail panel opens --
 * `SignoffDialog`, `VerifyModal`, `SendBackModal`, `MarkDoneModal`,
 * `AllowlistEditor` -- never a second implementation of a write (#170);
 * submit for review calls the panel's shared `submitTicketForReview`.
 *
 * The root used to be a <button>. Action buttons cannot live inside a
 * button (nested interactive content: the inner click also selects the
 * tile), so the root is a div wearing the button's role, focusability, and
 * keyboard (Enter/Space select). The action row and every dialog sit in a
 * wrapper that stops propagation, so acting never selects.
 *
 * #199: a poll tick used to re-render EVERY tile. The exported TicketTile
 * is now a thin wrapper that (a) always calls the hooks, in a stable
 * order, and (b) returns a CACHED element when nothing that shapes the
 * markup changed. A cached return is what React's bail-out needs (same
 * element reference -> the subtree is not reconciled), and keeping the
 * hooks in the wrapper keeps hook order legal on every render. The cache
 * is keyed by ticket (session-stamped id) and validated against the props
 * that reach the markup; onSelect is deliberately excluded -- see the
 * note above tilePropsEqual. Live updates propagate because any tick
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
import { ActionBar } from "./action-bar";
import { checkBoardActionAvailable } from "./inline-actions";
import { submitTicketForReview } from "./detail-panel";
import type { ActionId } from "./action-visibility";
import { SignoffDialog } from "./signoff-dialog";
import { VerifyModal } from "./evidence-attach";
import { SendBackModal } from "./send-back-modal";
import { MarkDoneModal } from "./mark-done-modal";
import { AllowlistEditor } from "./allowlist-editor";
import { AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";

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
  /**
   * #194: the board write identity, as the detail panel receives it: the
   * session the guard READ and the dialogs' writes route through, and the
   * ticket's board key. Explicit props win; both fall back to the row (see
   * below), so the board -- which cannot pass new props without touching
   * ticket-view.tsx -- gets working buttons with no caller change, and
   * tests address the tile exactly.
   */
  agentId?: string;
  ticketIdKey?: string;
  onSelect: () => void;
}

export function TicketTile(props: TicketTileProps) {
  /*
   * #199: the dialog state is the ONLY hookful part of the tile, and it
   * lives here in the wrapper so it is called on EVERY render -- including
   * the renders that then return a cached element. A cache hit skips the
   * body below entirely; skipping hook calls would be the illegal kind of
   * conditional hook order, so the hooks must not live in the body.
   *
   * The flows' open state lives in plain useState, deliberately NOT in the
   * store-backed detail-modal store: that store is keyed by ticket, so a
   * tile copy would share open-state with the detail panel's copy and open
   * the SAME dialog twice. A board refresh keeps these (same-key
   * re-render); only unmounting the tile closes them.
   */
  const [signoffOpen, setSignoffOpen] = react.useState(false);
  const [verifyOpen, setVerifyOpen] = react.useState(false);
  const [sendBackOpen, setSendBackOpen] = react.useState(false);
  const [markDoneOpen, setMarkDoneOpen] = react.useState(false);
  const [allowlistOpen, setAllowlistOpen] = react.useState(false);
  const [submitting, setSubmitting] = react.useState(false);
  const controls: TileControls = {
    signoffOpen,
    setSignoffOpen,
    verifyOpen,
    setVerifyOpen,
    sendBackOpen,
    setSendBackOpen,
    markDoneOpen,
    setMarkDoneOpen,
    allowlistOpen,
    setAllowlistOpen,
    submitting,
    setSubmitting,
  };

  const key = tileCacheKey(props.ticket);
  const hit = tileMarkupCache.get(key);
  if (
    hit !== undefined &&
    tilePropsEqual(hit.props, props) &&
    tileControlsEqual(hit.controls, controls)
  ) {
    return hit.element;
  }
  const element = renderTicketTile(props, controls);
  if (tileMarkupCache.size >= TILE_CACHE_LIMIT) tileMarkupCache.clear();
  tileMarkupCache.set(key, { props, controls, element });
  return element;
}

/** The dialog open-state the wrapper owns and the body reads. */
interface TileControls {
  signoffOpen: boolean;
  setSignoffOpen: (open: boolean) => void;
  verifyOpen: boolean;
  setVerifyOpen: (open: boolean) => void;
  sendBackOpen: boolean;
  setSendBackOpen: (open: boolean) => void;
  markDoneOpen: boolean;
  setMarkDoneOpen: (open: boolean) => void;
  allowlistOpen: boolean;
  setAllowlistOpen: (open: boolean) => void;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
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
  { props: TicketTileProps; controls: TileControls; element: react.ReactElement }
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
    a.ownWorkspaceKey === b.ownWorkspaceKey &&
    (a.agentId ?? null) === (b.agentId ?? null) &&
    (a.ticketIdKey ?? null) === (b.ticketIdKey ?? null)
  );
}

/** The state flags shape the markup; the setters do not (React's useState
 *  setters are stable, so the live component's are already identical). */
function tileControlsEqual(a: TileControls, b: TileControls): boolean {
  return (
    a.signoffOpen === b.signoffOpen &&
    a.verifyOpen === b.verifyOpen &&
    a.sendBackOpen === b.sendBackOpen &&
    a.markDoneOpen === b.markDoneOpen &&
    a.allowlistOpen === b.allowlistOpen &&
    a.submitting === b.submitting
  );
}

function renderTicketTile(props: TicketTileProps, controls: TileControls) {
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

  /*
   * #194: who the tile acts AS, and ON.
   *
   * The tile cannot know the VIEWING session -- its caller passes no
   * session, and no store names a current one -- so it addresses its ticket
   * in the OWNER's space: the board stamps every row (own and foreign) with
   * the owning session in `sourceSessionId`, and the plain id names the
   * ticket there. For own rows that session IS the viewing session, so the
   * tile's address is exactly the detail panel's; for foreign rows the
   * guard READ and the dialogs' writes route through the owner, landing on
   * the same ticket the composite key would name.
   *
   * When neither the prop nor the stamp names a session, the buttons still
   * render (their grey state needs no session) but every click refuses
   * through the guard -- a click that cannot check must never open a flow
   * that would write before discovering it is stale.
   */
  const stampedSession = (ticket as { sourceSessionId?: unknown }).sourceSessionId;
  const agentId =
    props.agentId ?? (typeof stampedSession === "string" ? stampedSession : null);
  const ticketIdKey = props.ticketIdKey ?? String(ticket.id);

  /*
   * #199: the hooks moved UP into TicketTile (the wrapper) so a cache-hit
   * render can skip this body without skipping hook calls. The flags and
   * setters arrive through `controls`.
   */
  const {
    signoffOpen,
    setSignoffOpen,
    verifyOpen,
    setVerifyOpen,
    sendBackOpen,
    setSendBackOpen,
    markDoneOpen,
    setMarkDoneOpen,
    allowlistOpen,
    setAllowlistOpen,
    submitting,
    setSubmitting,
  } = controls;

  /*
   * #194: the click-time re-check. The bar renders from render-time
   * descriptors; the grid can sit unrefreshed while the ticket moves, so
   * the click re-derives from the board and refuses -- writing nothing --
   * when the action no longer applies.
   */
  function checkAction(id: ActionId): Promise<string | null> {
    if (agentId === null) {
      return Promise.resolve(
        "the board session for this ticket is unknown, so the action cannot be checked",
      );
    }
    return checkBoardActionAvailable(agentId, ticketIdKey, id);
  }

  function showSubmitError(error: unknown) {
    if (error instanceof AidosRemoteError) {
      showToast(error.message, "refusal");
    } else {
      showToast(String(error), "refusal");
    }
  }

  function openSubmitForReview() {
    if (agentId === null || submitting) return;
    const agent = agentId;
    const key = ticketIdKey;
    setSubmitting(true);
    void submitTicketForReview(agent, key)
      .catch((error: unknown) => {
        showSubmitError(error);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  function onTileKeyDown(event: react.KeyboardEvent) {
    // Keyboard parity with the old <button> root, without hijacking the
    // action buttons' own keys: only a keypress ON the tile selects it.
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      props.onSelect();
    }
  }

  return (

    <div
      className={className}
      onClick={props.onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={onTileKeyDown}
    >
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
      {/*
        * #194: the tile's action row. The SHARED ActionBar, so the card and
        * the panel can never disagree about what is available or how an
        * unavailable action reads (grey with the unlock reason as tooltip).
        * Clicks stop here: acting must never select the tile underneath.
        */}
      <div
        className="aidos-tile-actions"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <ActionBar
          ticket={ticket}
          evidence={props.evidence}
          checkAction={checkAction}
          onOpenSignoff={() => {
            if (agentId === null) return;
            setSignoffOpen(true);
          }}
          onOpenVerify={() => {
            if (agentId === null) return;
            setVerifyOpen(true);
          }}
          onOpenSendBack={() => {
            if (agentId === null) return;
            setSendBackOpen(true);
          }}
          onOpenMarkDone={() => {
            if (agentId === null) return;
            setMarkDoneOpen(true);
          }}
          onOpenSubmitForReview={openSubmitForReview}
          onOpenAllowlist={() => {
            if (agentId === null) return;
            setAllowlistOpen(true);
          }}
        />
        {signoffOpen && agentId !== null ? (
          <SignoffDialog
            open
            ticketId={ticketIdKey}
            ticketTitle={ticket.title}
            agentId={agentId}
            onClose={() => {
              setSignoffOpen(false);
            }}
            onSignedOff={() => {
              setSignoffOpen(false);
            }}
          />
        ) : null}
        {verifyOpen && agentId !== null ? (
          <VerifyModal
            ticketId={ticketIdKey}
            agentId={agentId}
            onClose={() => {
              setVerifyOpen(false);
            }}
          />
        ) : null}
        {sendBackOpen && agentId !== null ? (
          <SendBackModal
            open
            ticketId={ticketIdKey}
            agentId={agentId}
            onClose={() => {
              setSendBackOpen(false);
            }}
            onSentBack={() => {
              setSendBackOpen(false);
            }}
          />
        ) : null}
        {markDoneOpen && agentId !== null ? (
          <MarkDoneModal
            open
            ticketId={ticketIdKey}
            ticket={ticket}
            evidence={props.evidence}
            agentId={agentId}
            onClose={() => {
              setMarkDoneOpen(false);
            }}
            onMarkedDone={() => {
              setMarkDoneOpen(false);
            }}
          />
        ) : null}
        {allowlistOpen && agentId !== null ? (
          <AllowlistEditor
            open
            ticketId={ticket.id}
            ticketIdKey={ticketIdKey}
            currentAllowlist={ticket.allowlist ?? []}
            agentId={agentId}
            onClose={() => {
              setAllowlistOpen(false);
            }}
            onSaved={() => {
              // The projection frame re-renders the new value automatically.
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
