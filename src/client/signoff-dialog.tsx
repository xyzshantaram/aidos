/**
 * Ticket U2c + #53 + #72 + #98: THE signoff flow — one implementation, two
 * entry points (the detail panel's button and the queue's ask), the rule
 * #123 settled for verify.
 *
 * Signoff is ordered writes, because the gate needs the
 * `builtin:user_signoff` row BEFORE the open -> in_progress move:
 *
 *   1. attach the signoff row (with an optional note),
 *   2. grant the file allowlist, if any paths were named,
 *   3. move to in_progress.
 *
 * #98: STEP 2 IS WHY THIS DIALOG EXISTS IN THIS SHAPE. Signoff on its own
 * grants write access to NOTHING — it moves the ticket to in_progress,
 * which unlocks the write tools, and the boundary then refuses every path
 * because the union is empty until a `builtin:file_allowlist` row exists.
 * So the agent's first act after every signoff was to ask again: five
 * signoffs meant five more approval cards, ten interactions for five
 * decisions. The board had split one decision ("you may work on this,
 * here") into two, and this puts it back together.
 *
 * The paths are OPTIONAL and may be left empty: a human may legitimately
 * sign off now and scope the files later, which lands exactly today's
 * behaviour. The point is to remove the forced round-trip, not to make the
 * allowlist mandatory.
 *
 * The grant sits BETWEEN the attach and the move deliberately. Granting
 * before the move means the agent has its files the instant the ticket is
 * in progress; granting after would leave a window in which it is expected
 * to work and refused every write.
 */
import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { ModalShell, NoteField, LinesField, linesOf } from "./ui";

export interface SignoffDialogProps {
  open: boolean;
  ticketId: number | string;
  ticketTitle: string;
  onClose: () => void;
  onSignedOff: () => void;
  agentId: string;
  /**
   * #98: what to pre-fill the allowlist with — the paths the agent proposed
   * with its nomination, else whatever the ticket already carries. The
   * common case should be a glance and a click, not typing paths by hand.
   */
  proposedPaths?: readonly string[];
}

export function SignoffDialog(props: SignoffDialogProps) {
  // All hooks live ABOVE any conditional return (the reviewer's finding:
  // useState after `if (!props.open) return null` was a latent
  // Rules-of-Hooks mismatch waiting for a mounted-closed caller).
  const [working, setWorking] = react.useState(false);
  const [note, setNote] = react.useState("");
  const [pathsText, setPathsText] = react.useState(() =>
    (props.proposedPaths ?? []).join("\n"),
  );

  react.useEffect(function () {
    if (props.open) logDebug("signoff dialog opened");
  }, [props.open]);

  if (!props.open) return null;

  async function confirm() {
    if (working) return;
    setWorking(true);
    const paths = linesOf(pathsText);
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
      /*
       * A REFUSED PATH MUST NOT COST THE SIGNOFF. The row is already
       * attached and the paths are re-validated host-side (containment and
       * existence, the same checks #51 applies), so a typo here reports
       * precisely and still lets the move proceed — the alternative is a
       * ticket stuck open because one path was misspelt.
       */
      let grantFailure: string | null = null;
      if (paths.length > 0) {
        try {
          await callAidosRemote(
            "userGrantAllowlist",
            { ticketId: props.ticketId, paths },
            props.agentId,
          );
        } catch (error) {
          grantFailure =
            error instanceof Error ? error.message : String(error);
        }
      }
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "in_progress" },
        props.agentId,
      );
      if (grantFailure === null) {
        showToast(
          paths.length > 0
            ? "Signed off — " + paths.length + " path(s) granted"
            : "Signed off",
          "success",
        );
      } else {
        showToast(
          "Signed off and moved, but the allowlist was refused: " +
            grantFailure +
            " — set the paths from the ticket's allowlist editor",
          "refusal",
        );
      }
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
        {"Signoff moves this to in progress and grants the agent write access " +
          "inside the allowlist below. Signoff alone grants access to nothing, " +
          "so name the files here — or leave it empty and scope them later."}
      </p>
      <NoteField
        label="Note (optional — rides the signoff row)"
        value={note}
        working={working}
        onChange={setNote}
      />
      <LinesField
        label="Files the agent may write (one per line, optional)"
        value={pathsText}
        working={working}
        onChange={setPathsText}
      />
    </ModalShell>
  );
}
