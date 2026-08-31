/**
 * Ticket U2c: the mark-done modal. Two steps. Step one shows the criteria
 * reminder. Step two shows the evidence summary and a final comment field.
 *
 * Confirm attaches a final comment when one is given, attaches the
 * user_verified kind, then moves the ticket to done. A refusal aborts the
 * remaining calls.
 */

import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRow } from "../kernel/types";

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
          <h3 className="aidos-modal-title">Mark done</h3>
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
        {step === 1 ? (
          <div className="aidos-modal-form">
            <p className="aidos-modal-body">The ticket criteria:</p>
            {criteriaLines.length === 0 ? (
              <p className="aidos-detail-note">No criteria on this ticket.</p>
            ) : (
              <ul className="aidos-check-list">
                {criteriaLines.map((line) => (
                  <li className="aidos-check-row" key={line}>
                    {line}
                  </li>
                ))}
              </ul>
            )}
            <button
              className="aidos-btn aidos-btn-primary"
              onClick={() => {
                setStep(2);
              }}
            >
              Continue
            </button>
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
            <div className="aidos-modal-row">
              <label>Final comment (optional)</label>
              <textarea
                value={finalComment}
                disabled={working}
                onChange={(event) => {
                  setFinalComment(event.target.value);
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
        )}
      </div>
    </div>
  );
}
