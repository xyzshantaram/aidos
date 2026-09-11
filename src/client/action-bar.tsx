/**
 * Ticket U2c + #62: the action bar. Every action renders in every state;
 * unavailable ones are greyed out with a tooltip naming what is missing.
 * The allowlist editor opens here for in-progress tickets.
 */

import react from "react";

import { actionsFor, type ActionId } from "./action-visibility";
import { logDebug } from "./log";
import { AidosRemoteError } from "./remote";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRowLike } from "./board-logic";
import { showToast } from "./toast-store";

export interface ActionBarProps {
  ticket: TicketView;
  evidence: readonly EvidenceRowLike[];
  onOpenSignoff: () => void;
  onOpenVerify: () => void;
  onOpenSendBack: () => void;
  onOpenMarkDone: () => void;
  onOpenSubmitForReview: () => void;
  onOpenAllowlist: () => void;
  /**
   * #194: the click-time re-check. The descriptors above are a render-time
   * snapshot: the ticket may have moved since this bar rendered (a stale
   * detail panel, a card grid that has not refreshed), and opening a flow
   * from a stale snapshot is the #177 junk write -- the dialog attaches
   * its row BEFORE the move, and the row is user-authored and append-only,
   * so the junk stays.
   *
   * When present, an enabled button awaits this first: a refusal reason
   * toasts and opens NOTHING (no dialog, no remote beyond the guard's own
   * READ), null opens the flow. Greyed buttons never reach it -- disabled
   * buttons do not fire clicks, so the render-time verdict still rules
   * them out. Absent, the opener runs directly, which is the pre-#194
   * behaviour every existing caller keeps until it wires a guard.
   */
  checkAction?: (id: ActionId) => Promise<string | null>;
}

/** One descriptor id to its opener prop name. */
const OPENERS: Record<ActionId, keyof ActionBarProps> = {
  signoff: "onOpenSignoff",
  verify: "onOpenVerify",
  "submit-for-review": "onOpenSubmitForReview",
  "send-back": "onOpenSendBack",
  "mark-done": "onOpenMarkDone",
  allowlist: "onOpenAllowlist",
};

export function ActionBar(props: ActionBarProps) {
  const kinds = props.evidence.map((row) => row.kind);
  const actions = actionsFor(props.ticket, kinds);
  /*
   * #194: which action is mid-re-check. One at a time: the guard is fast
   * (one READ), and a second click while one is in flight is either a
   * double-click or a change of mind -- both are served by finishing the
   * first check rather than racing two.
   */
  const [checking, setChecking] = react.useState<ActionId | null>(null);

  react.useEffect(function () {
    logDebug("action bar mounted");
  }, []);

  function activate(action: (typeof actions)[number], opener: () => void) {
    if (action.unavailableReason !== undefined) return;
    if (props.checkAction === undefined) {
      opener();
      return;
    }
    if (checking !== null) return;
    const id = action.id;
    setChecking(id);
    void props
      .checkAction(id)
      .then((refusal) => {
        if (refusal !== null) {
          // #177: refuse with the reason, writing nothing. No dialog
          // opens, so no flow can attach its row before discovering the
          // move would be refused.
          showToast(refusal, "refusal");
          return;
        }
        opener();
      })
      .catch((error: unknown) => {
        showToast(
          error instanceof AidosRemoteError ? error.message : String(error),
          "refusal",
        );
      })
      .finally(() => {
        setChecking(null);
      });
  }

  const buttons = actions.map((action) => {
    const opener = props[OPENERS[action.id]] as () => void;
    const disabled = action.unavailableReason !== undefined;
    const busy = checking === action.id;
    const className =
      (action.primary ? "aidos-btn aidos-btn-primary" : "aidos-btn") +
      (disabled ? " aidos-btn-disabled" : "");
    return (
      <button
        className={className}
        key={action.id}
        disabled={disabled || busy}
        title={action.unavailableReason ?? action.label}
        data-dsh-tip=""
        onClick={() => {
          activate(action, opener);
        }}
      >
        {busy ? "Checking…" : action.label}
      </button>
    );
  });

  return <div className="aidos-action-bar">{buttons}</div>;
}
