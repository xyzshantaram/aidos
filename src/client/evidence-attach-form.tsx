/**
 * Ticket U2c + #53: the evidence attach form. Pick a user-allowed kind,
 * an optional JSON payload, and an optional note, then attach through
 * userAttachEvidence. Non-empty JSON input parses and rides as the payload
 * object; input that fails to parse refuses with the parse error (#53).
 */

import react from "react";

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { userEvidenceKinds } from "./user-evidence-kinds";

export interface EvidenceAttachFormProps {
  ticketId: number | string;
  agentId: string;
}

export function EvidenceAttachForm(props: EvidenceAttachFormProps) {
  const kinds = userEvidenceKinds();
  const [kind, setKind] = react.useState(kinds.length > 0 ? kinds[0].id : "");
  const [note, setNote] = react.useState("");
  const [payloadText, setPayloadText] = react.useState("");
  const [working, setWorking] = react.useState(false);

  async function attach() {
    if (working) return;
    if (kind === "") return;
    // #53: the payload is a real object, never a stringified note. Empty
    // input sends an empty payload; non-empty input must parse as a JSON
    // OBJECT, and a parse failure refuses with the error text.
    let structured: Record<string, unknown> = {};
    if (payloadText.trim() !== "") {
      try {
        const parsed: unknown = JSON.parse(payloadText);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          showToast("Payload must be a JSON object", "refusal");
          return;
        }
        structured = parsed as Record<string, unknown>;
      } catch (error) {
        showToast(
          "Payload is not valid JSON: " + (error instanceof Error ? error.message : String(error)),
          "refusal",
        );
        return;
      }
    }
    const payload =
      note.trim() === "" ? structured : { ...structured, note: note.trim() };
    setWorking(true);
    try {
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketId, kind, payload },
        props.agentId,
      );
      showToast("Evidence attached", "success");
      setNote("");
      setPayloadText("");
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
        <label>Payload JSON (optional object)</label>
        <textarea
          className="aidos-evidence-attach-note"
          value={payloadText}
          disabled={working}
          placeholder={'{"paths": ["src/"]}'} 
          onChange={(event) => {
            setPayloadText(event.target.value);
          }}
        />
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
      <div className="aidos-form-actions">
        <button
          className="aidos-btn aidos-btn-primary"
          disabled={working || kind === ""}
          type="submit"
        >
          {working ? "Working\u2026" : "Attach"}
        </button>
      </div>
    </form>
  );
}
