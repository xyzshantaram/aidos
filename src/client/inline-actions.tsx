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
 */
import react from "react";

import { AllowlistRequestCard } from "./allowlist-request-card";
import { VerifyModal } from "./evidence-attach";
import { SignoffDialog } from "./signoff-dialog";
import { setSelection, ticketTitle } from "./view-state";
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

  function activate() {
    if (props.actionId === "mark-done") {
      /*
       * No modal: see the header. Opening the ticket puts the human in
       * front of the one surface that can show what marking done would
       * close -- its evidence and its unmet criteria.
       */
      setSelection(props.sessionId, props.boardKey);
      showToast("Opened " + props.boardKey + " on the board", "info");
      return;
    }
    setOpen(props.actionId);
  }

  const label = LABELS[props.actionId];
  const title =
    props.title ?? ticketTitle(props.sessionId, props.boardKey) ?? props.boardKey;

  return (
    <>
      <button
        type="button"
        className="tool-render-approval-btn tool-render-approval-approve"
        onClick={activate}
      >
        {label}
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
