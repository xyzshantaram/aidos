/**
 * Ticket U2c: the inline per-field editor. One field, one save. A textarea
 * for description and criteria, an input for the rest.
 */

import react from "react";
import type { ReactNode } from "react";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { PencilIcon } from "./icons";

export type EditableField =
  | "title"
  | "description"
  | "criteria"
  | "phase"
  | "order"
  | "slug";

export interface FieldEditorProps {
  ticketId: number | string;
  field: EditableField;
  value: string | number;
  agentId: string;
  onSaved: () => void;
  /** Shown instead of String(value) when the editor is not editing. */
  children?: ReactNode;
}

const TEXTAREA_FIELDS: readonly EditableField[] = ["description", "criteria"];

export function FieldEditor(props: FieldEditorProps) {
  const [editing, setEditing] = react.useState(false);
  const [draft, setDraft] = react.useState(String(props.value));
  const [saving, setSaving] = react.useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const field = props.field;
      const raw = draft;
      if ((field === "phase" || field === "order") && !/^\d+$/.test(raw.trim())) {
        showToast("phase and order must be integers ≥ 0", "refusal");
        setSaving(false);
        return;
      }
      const value =
        field === "phase" || field === "order"
          ? Number(raw)
          : raw;
      await callAidosRemote("userSetTicket", { ticketId: props.ticketId, [field]: value }, props.agentId);
      showToast("Field saved", "success");
      setEditing(false);
      props.onSaved();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
      setDraft(String(props.value));
    } finally {
      setSaving(false);
    }
  }

  function beginEdit() {
    setDraft(String(props.value));
    setEditing(true);
  }

  function cancel() {
    setDraft(String(props.value));
    setEditing(false);
  }

  if (editing) {
    const isTextarea = TEXTAREA_FIELDS.includes(props.field);
    return (
      <div className="aidos-field-editor">
        {isTextarea ? (
          <textarea
            className="aidos-field-editor-input"
            value={draft}
            disabled={saving}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
        ) : (
          <input
            className="aidos-field-editor-input"
            type="text"
            value={draft}
            disabled={saving}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
        )}
        <span>
          <button className="aidos-btn" disabled={saving} onClick={save}>
            Save
          </button>{" "}
          <button className="aidos-btn" disabled={saving} onClick={cancel}>
            Cancel
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="aidos-field-editor">
      <span>
        {props.children !== undefined ? props.children : String(props.value)}{" "}
        <button
          className="aidos-icon-btn"
          title="Edit"
          aria-label={"Edit " + props.field}
          onClick={beginEdit}
        >
          <PencilIcon />
        </button>
      </span>
    </div>
  );
}
