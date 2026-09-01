/**
 * Ticket U2c: the signoff confirmation dialog. Signoff moves the ticket
 * from open to in_progress; the agent gains write access on the ticket.
 */

import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";

export interface SignoffDialogProps {
  open: boolean;
  ticketId: number | string;
  ticketTitle: string;
  onClose: () => void;
  onSignedOff: () => void;
  agentId: string;
}

export function SignoffDialog(props: SignoffDialogProps) {
  const [working, setWorking] = react.useState(false);

  react.useEffect(function () {
    if (props.open) logDebug("signoff dialog opened");
  }, [props.open]);

  if (!props.open) return null;

  // #53: one button, TWO steps in order — the gate needs the
  // builtin:user_signoff row BEFORE the open -> in_progress move, so the
  // attach goes first and the move rides right behind it. A note is optional.
  const [note, setNote] = react.useState("");

  async function confirm() {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote(
        "userAttachEvidence",
        {
          ticketId: props.ticketId,
          kind: "builtin:user_signoff",
          payload: note.trim() === "" ? {} : { note: note.trim() },
        },
        props.agentId,
      );
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
          <div className="aidos-modal-row">
            <label>Note (optional — rides the signoff row)</label>
            <textarea
              className="aidos-evidence-attach-note"
              value={note}
              disabled={working}
              onChange={(event) => {
                setNote(event.target.value);
              }}
            />
          </div>
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
