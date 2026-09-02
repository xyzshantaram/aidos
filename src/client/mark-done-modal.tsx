/**
 * Ticket U2c + #72: the mark-done modal on the shared primitives. Two steps.
 * Step one shows the criteria reminder. Step two shows the evidence summary
 * and a final comment field.
 *
 * Confirm attaches a final comment when one is given, attaches the
 * user_verified kind, then moves the ticket to done. A refusal aborts the
 * remaining calls.
 */

import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { ModalShell, NoteField } from "./ui";
import { CriterionLinker } from "./criterion-linker";
import type { EvidenceRow } from "../kernel/types";
import type { TicketView } from "../kernel/projections";

export interface MarkDoneModalProps {
  open: boolean;
  ticketId: number | string;
  ticket: TicketView;
  evidence: readonly EvidenceRow[];
  onClose: () => void;
  onMarkedDone: () => void;
  agentId: string;
}

export function MarkDoneModal(props: MarkDoneModalProps) {
  // Hooks before the early return (Rules-of-Hooks; see #72 review note).
  const [step, setStep] = react.useState<1 | 2>(1);
  const [finalComment, setFinalComment] = react.useState("");
  const [working, setWorking] = react.useState(false);

  react.useEffect(function () {
    if (props.open) logDebug("mark done modal opened");
  }, [props.open]);

  if (!props.open) return null;

  const criteriaLines = props.ticket.criteria
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const kindCounts = new Map<string, number>();
  for (const row of props.evidence) {
    kindCounts.set(row.kind, (kindCounts.get(row.kind) ?? 0) + 1);
  }
  const summary: { kind: string; count: number }[] = [];
  for (const [kind, count] of kindCounts) {
    summary.push({ kind, count });
  }
  summary.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    if (a.kind < b.kind) return -1;
    if (a.kind > b.kind) return 1;
    return 0;
  });

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
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind: "builtin:user_verified", payload: {} },
        props.agentId,
      );
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

  return (
    <ModalShell title="Mark done" working={working} onClose={props.onClose}>
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
          <p className="aidos-modal-body">The evidence summary:</p>
          {summary.length === 0 ? (
            <p className="aidos-detail-note">No evidence rows yet.</p>
          ) : (
            <ul className="aidos-check-list">
              {summary.map((entry) => (
                <li className="aidos-check-row" key={entry.kind}>
                  {entry.kind + ": " + entry.count}
                </li>
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
