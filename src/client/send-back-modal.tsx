/**
 * Ticket U2c: the send-back modal. A required reason attaches as a user
 * comment, then the ticket moves back to in_progress. Two events, one click.
 */

import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";

export interface SendBackModalProps {
  open: boolean;
  ticketId: number | string;
  onClose: () => void;
  onSentBack: () => void;
  agentId: string;
}

export function SendBackModal(props: SendBackModalProps) {
  const [reason, setReason] = react.useState("");
  const [working, setWorking] = react.useState(false);

  react.useEffect(function () {
    if (props.open) logDebug("send back modal opened");
  }, [props.open]);

  if (!props.open) return null;

  async function sendBack() {
    if (working) return;
    if (reason.trim() === "") return;
    setWorking(true);
    try {
      await callAidosRemote(
        "userAddComment",
        { ticketId: props.ticketId, text: reason },
        props.agentId,
      );
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "in_progress" },
        props.agentId,
      );
      showToast("Sent back", "success");
      props.onClose();
      props.onSentBack();
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
          <h3 className="aidos-modal-title">Send back</h3>
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
          Send the ticket back to in progress. The reason attaches as a
          comment.
        </p>
        <div className="aidos-modal-form">
          <div className="aidos-modal-row">
            <label>Reason</label>
            <textarea
              value={reason}
              disabled={working}
              onChange={(event) => {
                setReason(event.target.value);
              }}
            />
          </div>
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={working || reason.trim() === ""}
            onClick={sendBack}
          >
            {working ? "Working\u2026" : "Send back"}
          </button>
        </div>
      </div>
    </div>
  );
}
