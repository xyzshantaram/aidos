/**
 * Ticket U2c: the action bar. Reads the per-state action descriptors and
 * renders the matching buttons. The row sits under the quick facts of the
 * detail pane. Submit for review lives in a collapsed spoiler; the rest are
 * direct buttons.
 */

import react from "react";

import { actionsFor, type ActionId } from "./action-visibility";
import { logDebug } from "./log";
import type { TicketView } from "../kernel/projections";

export interface ActionBarProps {
  ticket: TicketView;
  onOpenSignoff: () => void;
  onOpenSendBack: () => void;
  onOpenMarkDone: () => void;
  onOpenSubmitForReview: () => void;
}

/** One descriptor id to its opener prop name. */
const OPENERS: Record<ActionId, keyof ActionBarProps> = {
  signoff: "onOpenSignoff",
  "submit-for-review": "onOpenSubmitForReview",
  "send-back": "onOpenSendBack",
  "mark-done": "onOpenMarkDone",
};

export function ActionBar(props: ActionBarProps) {
  const actions = actionsFor(props.ticket);

  react.useEffect(function () {
    logDebug("action bar mounted");
  }, []);

  if (actions.length === 0) return null;

  const buttons = actions.map((action) => {
    const opener = props[OPENERS[action.id]] as () => void;
    if (action.id === "submit-for-review") {
      return (
        <details className="aidos-spoiler" key={action.id}>
          <summary className="aidos-spoiler-summary">Advanced</summary>
          <button
            className="aidos-btn"
            onClick={opener}
          >
            {action.label}
          </button>
        </details>
      );
    }
    const className = action.primary
      ? "aidos-btn aidos-btn-primary"
      : "aidos-btn";
    return (
      <button className={className} key={action.id} onClick={opener}>
        {action.label}
      </button>
    );
  });

  return <div className="aidos-action-bar">{buttons}</div>;
}
