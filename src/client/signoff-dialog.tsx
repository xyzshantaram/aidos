/**
 * Ticket U2c + #53 + #72: the signoff confirmation dialog, on the shared
 * ModalShell/NoteField primitives. Signoff is TWO steps in order — the gate
 * needs the builtin:user_signoff row BEFORE the open -> in_progress move, so
 * the attach goes first and the move rides right behind it. A note is
 * optional and rides the signoff row.
 */
import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { ModalShell, NoteField } from "./ui";

export interface SignoffDialogProps {
  open: boolean;
  ticketId: number | string;
  ticketTitle: string;
  onClose: () => void;
  onSignedOff: () => void;
  agentId: string;
}

export function SignoffDialog(props: SignoffDialogProps) {
  // All hooks live ABOVE any conditional return (the reviewer's finding:
  // useState after `if (!props.open) return null` was a latent
  // Rules-of-Hooks mismatch waiting for a mounted-closed caller).
  const [working, setWorking] = react.useState(false);
  const [note, setNote] = react.useState("");

  react.useEffect(function () {
    if (props.open) logDebug("signoff dialog opened");
  }, [props.open]);

  if (!props.open) return null;

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
    <ModalShell
      title="Sign off ticket"
      working={working}
      onClose={props.onClose}
      onConfirm={confirm}
      confirmLabel="Confirm"
    >
      <p className="aidos-modal-body">
        Signoff grants the agent write access on this ticket. Confirm to proceed.
      </p>
      <NoteField
        label="Note (optional — rides the signoff row)"
        value={note}
        working={working}
        onChange={setNote}
      />
    </ModalShell>
  );
}
