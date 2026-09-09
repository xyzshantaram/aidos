/**
 * INLINE TOOL-CALL ACTIONS: answer the agent where it asked, in the
 * transcript, instead of hunting for the board.
 *
 * The ask (user, 2026-09-08): "suggest_actions inline tool calls need to be
 * done asap, as do other inline actions such as allowlist (should be able to
 * open allowlist approve modal directly from chat, as well as launch the
 * sign-off/verify flows)".
 *
 * ## The rule this file obeys, which is why it is so short
 *
 * It launches flows; it does not implement them. Every button here opens
 * the SAME component the board opens -- `SignoffDialog`, `VerifyModal`,
 * `AllowlistRequestCard` -- because a third entry point that reimplements
 * the writes is exactly the bug class #170 audits and #98/#123 were filed
 * for twice. "Signoff carries the allowlist" was true from the queue and
 * false from the ticket for a whole session; adding a chat copy would have
 * made it three.
 *
 * The corollary is a deliberate omission. MARK DONE gets no modal here:
 * `MarkDoneModal` needs the ticket row and its evidence to show what is
 * being closed, a tool card has neither, and the alternative -- a bare
 * `userMoveTicket` from this file -- would be that third implementation.
 * So mark-done opens the ticket on the board instead, which is honest about
 * what it is doing and keeps one flow.
 *
 * ## Why the buttons wear the tool-card anatomy
 *
 * They live inside a tool card, beside the approval buttons #141 vendored
 * from tool-render. A second look for the same gesture, one card apart, is
 * what #82's header records three failed attempts at: the classes are
 * reused rather than approximated.
 *
 * ## #177: the card ASKS before it acts
 *
 * A tool card is a RECEIPT for a call that may be hours old: it renders its
 * buttons straight from the call's arguments, so it offers whatever the
 * agent once asked for, forever -- including a Sign off for a ticket that
 * has since moved. Clicking it used to open the dialog straight away, and
 * the dialog's attach-first ordering (correct for a VALID signoff, because
 * the gate needs the row before the move) then wrote a duplicate
 * user_signoff row before the move was refused. The write happened BEFORE
 * anything checked, and the row is user-authored and append-only, so the
 * junk stayed on the ticket.
 *
 * So the button resolves the ticket from the board FIRST, runs the SAME
 * `actionsFor` availability the board uses, and refuses with the reason --
 * writing nothing -- when the action no longer applies. Card and queue
 * agree by construction rather than by coincidence. The one remote this
 * file may make is the `workspaceTickets` READ below; the write remotes
 * stay forbidden by the #171 uniqueness test.
 */
import react from "react";

import type { TicketView } from "../kernel/projections";
import { actionsFor } from "./action-visibility";
import type { EvidenceKinds } from "./action-visibility";
import { AllowlistRequestCard } from "./allowlist-request-card";
import { boardKeyOf } from "./board-logic";
import { VerifyModal } from "./evidence-attach";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { SignoffDialog } from "./signoff-dialog";
import { setSelection, setTicketParam, ticketTitle } from "./view-state";
import { showToast } from "./toast-store";

/** The actions a nomination can carry, as the queue names them. */
export type InlineActionId = "signoff" | "verify" | "mark-done";

/** The button label for each. Matched to the queue's, so one gesture reads the same. */
const LABELS: Record<InlineActionId, string> = {
  signoff: "Sign off",
  verify: "Verify",
  "mark-done": "Open on board",
};

export function isInlineActionId(value: string): value is InlineActionId {
  return value === "signoff" || value === "verify" || value === "mark-done";
}

/**
 * #177: the availability verdict for one inline action, as a refusal reason
 * or null when the action still applies.
 *
 * This is `actionsFor` -- the SAME function the board's action bar and the
 * queue derive from -- looked up for the card's action. A card and the queue
 * can never disagree about whether an action applies, because there is one
 * decider, not two that happen to match.
 *
 * Pure, so the stale-card test can drive the exact reported sequence
 * through the function the button itself calls rather than by
 * re-implementing the state rule beside it.
 */
export function refusalForInlineAction(
  ticket: TicketView,
  evidenceKinds: EvidenceKinds,
  actionId: InlineActionId,
): string | null {
  if (actionId === "mark-done") return null;
  const found = actionsFor(ticket, evidenceKinds).find(
    (action) => action.id === actionId,
  );
  if (found === undefined) return "unknown action " + actionId;
  if (found.unavailableReason === undefined) return null;
  return found.label + " is not available — " + found.unavailableReason;
}

/** One board row as the `workspaceTickets` READ hands it to the client. */
interface BoardRowLike {
  id: number | string;
  foreign?: boolean;
  sourceSessionId?: string;
  state: string;
}

/** One evidence row as the `workspaceTickets` READ hands it to the client. */
interface EvidenceRowLike {
  kind?: unknown;
}

/**
 * #177: resolve the card's ticket from the board and check the action is
 * still available, BEFORE any flow opens.
 *
 * Returns the refusal reason when the action no longer applies (or the
 * ticket is not on this board), null when the dialog may open. Makes
 * exactly ONE remote call -- the `workspaceTickets` READ -- so the refusal
 * path writes nothing: no evidence row, no move, no grant.
 */
export async function checkInlineActionAvailable(
  sessionId: string,
  boardKey: string,
  actionId: InlineActionId,
): Promise<string | null> {
  if (actionId === "mark-done") return null;
  const result = (await callAidosRemote("workspaceTickets", {}, sessionId)) as unknown as {
    tickets?: BoardRowLike[];
    evidence?: Record<string, EvidenceRowLike[]>;
  } | BoardRowLike[];
  const tickets = Array.isArray(result) ? result : (result.tickets ?? []);
  const evidence = Array.isArray(result) ? {} : (result.evidence ?? {});
  const row = tickets.find((ticket) => boardKeyOf(ticket) === boardKey) ?? null;
  if (row === null) {
    return (
      "#" + boardKey + " is not on this board (it may belong to another session)"
    );
  }
  const kinds = (evidence[boardKey] ?? [])
    .map((entry) => entry.kind)
    .filter((kind): kind is string => typeof kind === "string");
  return refusalForInlineAction(row as unknown as TicketView, kinds, actionId);
}

/**
 * One nomination's action, answerable in place.
 *
 * `boardKey` is THE address (#93: a bare number makes a foreign ticket
 * resolve to the caller's own row with that id), so callers pass the
 * composite when they have one.
 */
export function InlineTicketAction(props: {
  sessionId: string;
  boardKey: string;
  actionId: InlineActionId;
  /** Shown in the signoff dialog's title; falls back to the id. */
  title?: string;
}) {
  const [open, setOpen] = react.useState<null | "signoff" | "verify">(null);
  const [checking, setChecking] = react.useState(false);

  function activate() {
    if (props.actionId === "mark-done") {
      /*
       * No modal: see the header. Opening the ticket puts the human in
       * front of the one surface that can show what marking done would
       * close -- its evidence and its unmet criteria.
       *
       * USER-REPORTED, 2026-09-08: "does not actually open the ticket's
       * detail view - it just opens the board." The first cut wrote only
       * the selection store, which is enough ONLY when the board is already
       * mounted for this session -- the store is in-memory, so a board that
       * mounts later had nothing to restore from and landed on the grid.
       *
       * Writing the deep-link param too is what makes this work from a
       * transcript, where the board usually is NOT mounted: #100 round 4
       * made that param the channel a board reads on mount, and the same
       * function now serves both surfaces.
       */
      setSelection(props.sessionId, props.boardKey);
      setTicketParam(props.boardKey);
      showToast("Opening " + props.boardKey + " — see the Tickets tab", "info");
      return;
    }
    /*
     * #177: ASK before acting. The card is a receipt for arguments the
     * agent gave hours ago; the ticket may have moved since. Resolve from
     * the board and refuse with the reason when the action no longer
     * applies -- writing nothing -- and only then open the dialog.
     */
    if (checking) return;
    const action = props.actionId;
    setChecking(true);
    void checkInlineActionAvailable(props.sessionId, props.boardKey, action)
      .then((refusal) => {
        if (refusal !== null) {
          showToast(refusal, "refusal");
          return;
        }
        setOpen(action);
      })
      .catch((error: unknown) => {
        showToast(
          error instanceof AidosRemoteError ? error.message : String(error),
          "refusal",
        );
      })
      .finally(() => {
        setChecking(false);
      });
  }

  const label = LABELS[props.actionId];
  const title =
    props.title ?? ticketTitle(props.sessionId, props.boardKey) ?? props.boardKey;

  return (
    <>
      <button
        type="button"
        className="tool-render-approval-btn tool-render-approval-approve"
        disabled={checking}
        onClick={activate}
      >
        {checking ? "Checking…" : label}
      </button>
      {open === "signoff" ? (
        <SignoffDialog
          open
          ticketId={props.boardKey}
          ticketTitle={title}
          agentId={props.sessionId}
          onClose={() => {
            setOpen(null);
          }}
          onSignedOff={() => {
            setOpen(null);
          }}
        />
      ) : null}
      {open === "verify" ? (
        <VerifyModal
          ticketId={props.boardKey}
          agentId={props.sessionId}
          onClose={() => {
            setOpen(null);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * A pending allowlist proposal, answerable from the card that made it.
 *
 * The whole component is `AllowlistRequestCard`, unchanged: it polls
 * `pendingApproval` for this ticket itself, so it shows the editable paths
 * while the request is outstanding and renders nothing once it has been
 * answered -- which is the correct behaviour for a card scrolled back to
 * later, and would have had to be re-invented by any bespoke inline copy.
 */
export function InlineAllowlistApproval(props: {
  sessionId: string;
  boardKey: string;
}) {
  return (
    <div className="aidos-inline-approval">
      <AllowlistRequestCard ticketId={props.boardKey} agentId={props.sessionId} />
    </div>
  );
}
