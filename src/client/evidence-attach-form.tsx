/**
 * Ticket U2c: the evidence attach form. Pick a user-allowed kind and an
 * optional note, then attach through userAttachEvidence.
 */

import react from "react";

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { userEvidenceKinds } from "./user-evidence-kinds";

export interface EvidenceAttachFormProps {
  ticketId: number;
  agentId: string;
}

export function EvidenceAttachForm(props: EvidenceAttachFormProps) {
  const kinds = userEvidenceKinds();
  const [kind, setKind] = react.useState(kinds.length > 0 ? kinds[0].id : "");
  const [note, setNote] = react.useState("");
  const [working, setWorking] = react.useState(false);

  async function attach() {
    if (working) return;
    if (kind === "") return;
    setWorking(true);
    try {
      const payload = note.trim() === "" ? {} : { note };
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind, payload },
        props.agentId,
      );
      showToast("Evidence attached", "success");
      setNote("");
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
    <form
      className="aidos-evidence-attach-form"
      onSubmit={(event) => {
        event.preventDefault();
        void attach();
      }}
    >
      <div className="aidos-modal-row">
        <label>Evidence kind</label>
        <select
          className="aidos-evidence-attach-kind-select"
          value={kind}
          disabled={working}
          onChange={(event) => {
            setKind(event.target.value);
          }}
        >
          {kinds.map((descriptor) => (
            <option value={descriptor.id} key={descriptor.id}>
              {descriptor.label}
            </option>
          ))}
        </select>
      </div>
      <div className="aidos-modal-row">
        <label>Note (optional)</label>
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
        disabled={working || kind === ""}
        type="submit"
      >
        {working ? "Working\u2026" : "Attach"}
      </button>
    </form>
  );
}
