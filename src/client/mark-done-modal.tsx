/**
 * Ticket U2c + #72 + #170: THE mark-done flow -- one implementation, two
 * entry points (the detail panel's button and the queue's ask), the rule
 * #98 settled for signoff and #123 for verify.
 *
 * Mark done is GATED on the verified row, and this modal never attaches a
 * user_verified row of its own. The two old behaviours are both gone:
 *
 *   - the modal's empty-payload `user_verified` attach gave one evidence
 *     kind two meanings (a hands-on check from Verify, a quiet auto-row
 *     from Mark done);
 *   - the queue's bare move moved with no row at all.
 *
 * When the ticket carries no `builtin:user_verified` row the modal teaches
 * rather than refuses: an explicit prompt-to-verify choice -- `verify` or
 * `force`, never a bare confirm that secretly forces -- routes the human
 * into the shared VerifyModal, or records an explicit force that moves with
 * NO verification row attached. Verify keeps one meaning: only VerifyModal
 * writes the kind.
 */

import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { ModalShell, NoteField } from "./ui";
import { CriterionLinker } from "./criterion-linker";
import { EvidenceStrip } from "./evidence-strip";
import { EvidenceViewer } from "./evidence-viewer";
import { VerifyModal } from "./evidence-attach";
import type { EvidenceRow } from "../kernel/types";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRowLike } from "./board-logic";

export interface MarkDoneModalProps {
  open: boolean;
  ticketId: number | string;
  ticket: TicketView;
  evidence: readonly EvidenceRow[];
  onClose: () => void;
  onMarkedDone: () => void;
  agentId: string;
}

/**
 * The gate's explicit human confirmation. Null means "not yet chosen": no
 * silent force, and no bare confirm that secretly forces. `verify` routes
 * into the shared verify flow; `force` moves with no verification row.
 */
export type PromptToVerify = "verify" | "force";

export function MarkDoneModal(props: MarkDoneModalProps) {
  // Hooks before the early return (Rules-of-Hooks; see #72 review note).
  const [step, setStep] = react.useState<1 | 2>(1);
  const [finalComment, setFinalComment] = react.useState("");
  const [working, setWorking] = react.useState(false);
  // The viewer for the step-2 strips; same dead-end rule as the linker.
  const [viewed, setViewed] = react.useState<EvidenceRowLike | null>(null);
  // A verification row that landed through THIS modal's verify flow, before
  // the parent's evidence prop refreshes. The move below needs the row on
  // the board, not in props.
  const [verifiedNow, setVerifiedNow] = react.useState(false);
  // The gate choice. Starts null and only leaves null by an explicit click.
  const [promptToVerify, setPromptToVerify] = react.useState<PromptToVerify | null>(null);

  react.useEffect(function () {
    if (props.open) logDebug("mark done modal opened");
  }, [props.open]);

  if (!props.open) return null;

  const verifiedOnBoard = props.evidence.some(
    (row) => row.kind === "builtin:user_verified",
  );
  const gated = !verifiedOnBoard && !verifiedNow;

  const criteriaLines = props.ticket.criteria
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Step two renders the rows themselves as strips, so no kind-count roll-up
  // is computed any more — the strip already names kind, author, time, and
  // the criterion each row addresses.

  async function confirm() {
    if (working) return;
    setWorking(true);
    try {
      if (finalComment.trim() !== "") {
        await callAidosRemote(
          "userAddComment",
          { ticketId: props.ticketId, text: finalComment },
          props.agentId,
        );
      }
      // No user_verified attach here, ever (#170): verify has one meaning,
      // and only VerifyModal writes the kind. A forced close moves with no
      // verification row behind it, said out loud on the force screen.
      await callAidosRemote(
        "userMoveTicket",
        { ticketId: props.ticketId, to: "done" },
        props.agentId,
      );
      showToast("Marked done", "success");
      props.onClose();
      props.onMarkedDone();
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

  // The gate: no verification row on the board yet. Teach rather than
  // refuse -- but offer no bare Confirm. Either choice below is explicit.
  if (gated && promptToVerify === null) {
    return (
      <ModalShell title="Mark done" working={working} onClose={props.onClose}>
        <div className="aidos-modal-form">
          <p className="aidos-modal-body">
            {"This ticket has no verification row yet. Marking it done " +
              "needs your hands-on check first — verify it, and the row " +
              "you attach is what this close stands on."}
          </p>
          <div className="aidos-form-actions">
            <button
              className="aidos-btn aidos-btn-primary"
              disabled={working}
              onClick={() => {
                setPromptToVerify("verify");
              }}
            >
              Verify now
            </button>
            <button
              className="aidos-btn"
              disabled={working}
              title="Close with no verification row behind it"
              data-dsh-tip=""
              onClick={() => {
                setPromptToVerify("force");
              }}
            >
              Force without verification
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  // The gate's verify choice: the SAME VerifyModal the Verify button opens.
  if (gated && promptToVerify === "verify") {
    return (
      <VerifyModal
        ticketId={props.ticketId}
        agentId={props.agentId}
        onAttached={() => {
          setVerifiedNow(true);
          setPromptToVerify(null);
        }}
        onClose={() => {
          setPromptToVerify(null);
        }}
      />
    );
  }

  // The gate's force choice: an explicit override, confirmed as one. No
  // verification row is attached, and the button says so.
  if (gated && promptToVerify === "force") {
    return (
      <ModalShell title="Mark done" working={working} onClose={props.onClose}>
        <div className="aidos-modal-form">
          <p className="aidos-modal-body">
            {"Forcing closes this ticket with NO verification row behind " +
              "it. The board will show it done with nothing verified — " +
              "choose this only when the check genuinely does not apply."}
          </p>
          <NoteField
            label="Final comment (optional)"
            value={finalComment}
            working={working}
            onChange={setFinalComment}
          />
          <div className="aidos-form-actions">
            <button
              className="aidos-btn"
              disabled={working}
              onClick={() => {
                setPromptToVerify(null);
              }}
            >
              Back
            </button>
            <button
              className="aidos-btn aidos-btn-primary"
              disabled={working}
              onClick={confirm}
            >
              {working ? "Working\u2026" : "Force mark done"}
            </button>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Mark done" working={working} onClose={props.onClose}>
      {viewed === null ? null : (
        <EvidenceViewer
          row={viewed}
          onClose={() => {
            setViewed(null);
          }}
        />
      )}
      {step === 1 ? (
        <div className="aidos-modal-form">
          <p className="aidos-modal-body">The ticket criteria, with their evidence:</p>
          {criteriaLines.length === 0 ? (
            <p className="aidos-detail-note">No criteria on this ticket.</p>
          ) : (
            <CriterionLinker
              criteria={criteriaLines}
              evidence={props.evidence}
              ticketIdKey={String(props.ticketId)}
              agentId={props.agentId}
              onChanged={() => {
                /* The projection frame re-renders on evidence/linked. */
              }}
            />
          )}
          <div className="aidos-form-actions">
            <button
              className="aidos-btn aidos-btn-primary"
              onClick={() => {
                setStep(2);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      ) : (
        <div className="aidos-modal-form">
          <p className="aidos-modal-body">The evidence on this ticket:</p>
          {props.evidence.length === 0 ? (
            <p className="aidos-detail-note">No evidence rows yet.</p>
          ) : (
            <ul className="aidos-evidence-list">
              {props.evidence.map((row, index) => (
                <EvidenceStrip
                  key={String(row.at ?? index) + ":" + row.kind}
                  row={row}
                  onView={setViewed}
                  criterionLabel={
                    typeof row.payload.criteria === "string" &&
                    row.payload.criteria.trim() !== ""
                      ? row.payload.criteria
                      : undefined
                  }
                />
              ))}
            </ul>
          )}
          <NoteField
            label="Final comment (optional)"
            value={finalComment}
            working={working}
            onChange={setFinalComment}
          />
          <div className="aidos-form-actions">
            <button
              className="aidos-btn aidos-btn-primary"
              disabled={working}
              onClick={confirm}
            >
              {working ? "Working\u2026" : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
