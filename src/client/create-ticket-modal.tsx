/**
 * Ticket U2c: the create-ticket modal. Title, description, and criteria.
 * Phase, order, and slug are set later through edit.
 *
 * Save posts userSetTicket with the three business fields. A refusal
 * surfaces the refusal text verbatim; a success toasts and hands the new
 * ticket id up so the board can open it.
 */

import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";

export interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: number) => void;
  agentId: string;
}

/**
 * #138: split a tags input on commas. Trims, drops empties, dedupes keeping
 * first order — the same cleaning the host applies, so the modal never
 * sends a batch the host would refuse for shape. Pure, so it is testable
 * without a browser.
 */
export function parseTagInput(value: string): string[] {
  const clean: string[] = [];
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const name = part.trim();
    if (name === "" || seen.has(name)) continue;
    seen.add(name);
    clean.push(name);
  }
  return clean;
}

export function CreateTicketModal(props: CreateTicketModalProps) {
  const [title, setTitle] = react.useState("");
  const [description, setDescription] = react.useState("");
  const [criteria, setCriteria] = react.useState("");
  const [tagsInput, setTagsInput] = react.useState("");
  const [saving, setSaving] = react.useState(false);

  react.useEffect(function () {
    if (props.open) logDebug("create ticket modal opened");
  }, [props.open]);

  if (!props.open) return null;

  async function save() {
    if (saving) return;
    if (title.trim() === "") return;
    setSaving(true);
    try {
      const result = await callAidosRemote(
        "userSetTicket",
        { title, description, criteria },
        props.agentId,
      );
      const id =
        typeof result === "object" &&
        result !== null &&
        !Array.isArray(result) &&
        "id" in result &&
        typeof (result as { id: unknown }).id === "number"
          ? (result as { id: number }).id
          : NaN;
      /*
       * #138: tags arrive as a DELTA after the create, never inside it —
       * setTicket takes no tags argument (#180 merge rule), so the modal
       * creates first and attaches through the board's user-actor path.
       * A refused attach still leaves a created ticket: say so plainly
       * rather than reporting success or failure alone.
       */
      const tags = parseTagInput(tagsInput);
      if (tags.length > 0 && Number.isFinite(id)) {
        try {
          await callAidosRemote(
            "userAttachTags",
            { ticketId: id, tags },
            props.agentId,
          );
        } catch (attachError) {
          const detail =
            attachError instanceof AidosRemoteError
              ? attachError.message
              : String(attachError);
          showToast("Ticket created, but its tags were not attached: " + detail, "refusal");
          props.onClose();
          if (props.onCreated !== undefined) {
            props.onCreated(id);
          }
          return;
        }
      }
      showToast("Ticket created", "success");
      props.onClose();
      if (props.onCreated !== undefined && Number.isFinite(id)) {
        props.onCreated(id);
      }
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="aidos-modal-mask"
      onClick={() => {
        if (!saving) props.onClose();
      }}
    >
      <div
        className="aidos-modal"
        onClick={(event: react.MouseEvent<HTMLDivElement>) => {
          event.stopPropagation();
        }}
      >
        <div className="aidos-modal-head">
          <h3 className="aidos-modal-title">Create a ticket</h3>
          <button
            className="aidos-close-btn"
            onClick={() => {
              if (!saving) props.onClose();
            }}
            aria-label="Close"
          >
            {"\u00d7"}
          </button>
        </div>
        <div className="aidos-modal-form">
          <div className="aidos-modal-row">
            <label>Title</label>
            <input
              type="text"
              value={title}
              disabled={saving}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
            />
          </div>
          <div className="aidos-modal-row">
            <label>Description</label>
            <textarea
              value={description}
              disabled={saving}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
            />
          </div>
          <div className="aidos-modal-row">
            <label>Criteria</label>
            <textarea
              value={criteria}
              disabled={saving}
              onChange={(event) => {
                setCriteria(event.target.value);
              }}
            />
          </div>
          <div className="aidos-modal-row">
            <label>Tags</label>
            <input
              type="text"
              value={tagsInput}
              disabled={saving}
              placeholder="ui, host, debt (comma-separated, optional)"
              onChange={(event) => {
                setTagsInput(event.target.value);
              }}
            />
          </div>
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={saving || title.trim() === ""}
            onClick={save}
          >
            {saving ? "Saving\u2026" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
