/**
 * Ticket U2c + #62: the action bar. Every action renders in every state;
 * unavailable ones are greyed out with a tooltip naming what is missing.
 * The allowlist editor opens here for in-progress tickets.
 */

import react from "react";

import { actionsFor, type ActionId } from "./action-visibility";
import { logDebug } from "./log";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRowLike } from "./board-logic";

export interface ActionBarProps {
  ticket: TicketView;
  evidence: readonly EvidenceRowLike[];
  onOpenSignoff: () => void;
  onOpenVerify: () => void;
  onOpenSendBack: () => void;
  onOpenMarkDone: () => void;
  onOpenSubmitForReview: () => void;
  onOpenAllowlist: () => void;
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

  react.useEffect(function () {
    logDebug("action bar mounted");
  }, []);

  const buttons = actions.map((action) => {
    const opener = props[OPENERS[action.id]] as () => void;
    const disabled = action.unavailableReason !== undefined;
    const className =
      (action.primary ? "aidos-btn aidos-btn-primary" : "aidos-btn") +
      (disabled ? " aidos-btn-disabled" : "");
    return (
      <button
        className={className}
        key={action.id}
        disabled={disabled}
        title={action.unavailableReason ?? action.label}
        onClick={() => {
          if (!disabled) opener();
        }}
      >
        {action.label}
      </button>
    );
  });

  return <div className="aidos-action-bar">{buttons}</div>;
}
