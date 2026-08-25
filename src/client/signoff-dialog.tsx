/**
 * Ticket U2c: the signoff confirmation dialog. Signoff moves the ticket
 * from open to in_progress; the agent gains write access on the ticket.
 */

import react from "react";

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";

export interface SignoffDialogProps {
  open: boolean;
  ticketId: number;
  ticketTitle: string;
  onClose: () => void;
  onSignedOff: () => void;
  agentId: string;
}

export function SignoffDialog(props: SignoffDialogProps) {
  const [working, setWorking] = react.useState(false);

  if (!props.open) return null;

  async function confirm() {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "in_progress" },
        props.agentId,
      );
      showToast("Signed off", "success");
      props.onClose();
      props.onSignedOff();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className="aidos-modal-mask"
      onClick={() => {
        if (!working) props.onClose();
      }}
    >
      <div
        className="aidos-modal"
        onClick={(event: react.MouseEvent<HTMLDivElement>) => {
          event.stopPropagation();
        }}
      >
        <div className="aidos-modal-head">
          <h3 className="aidos-modal-title">Sign off ticket</h3>
          <button
            className="aidos-close-btn"
            onClick={() => {
              if (!working) props.onClose();
            }}
            aria-label="Close"
          >
            {"\u00d7"}
          </button>
        </div>
        <p className="aidos-modal-body">
          Signoff grants the agent write access on this ticket. Confirm to proceed.
        </p>
        <div className="aidos-modal-form">
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={working}
            onClick={confirm}
          >
            {working ? "Working\u2026" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
