/**
 * Ticket U2c + #72: the send-back modal on the shared ModalShell/NoteField
 * primitives. A required reason attaches as a user comment, then the ticket
 * moves back to in_progress. Two events, one click.
 */

import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { ModalShell, NoteField } from "./ui";

export interface SendBackModalProps {
  open: boolean;
  ticketId: number | string;
  onClose: () => void;
  onSentBack: () => void;
  agentId: string;
}

export function SendBackModal(props: SendBackModalProps) {
  // Hooks before the early return (Rules-of-Hooks; see #72 review note).
  const [reason, setReason] = react.useState("");
  const [working, setWorking] = react.useState(false);

  react.useEffect(function () {
    if (props.open) logDebug("send back modal opened");
  }, [props.open]);

  if (!props.open) return null;

  async function sendBack() {
    if (working) return;
    setWorking(true);
    try {
      await callAidosRemote(
        "userAddComment",
        { ticketId: props.ticketId, text: reason.trim() },
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
    <ModalShell
      title="Send back"
      working={working}
      onClose={props.onClose}
      onConfirm={sendBack}
      confirmLabel="Send back"
    >
      <p className="aidos-modal-body">
        Send the ticket back to in progress. The reason attaches as a comment.
      </p>
      <NoteField label="Reason" value={reason} working={working} onChange={setReason} />
    </ModalShell>
  );
}
