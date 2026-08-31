/**
 * Ticket U12: the plan-meta modal. It shows the stored plan blocks of the
 * session's own project: the frontmatter, the preamble, and one collapsible
 * block per context section. Edit turns one block into a textarea, and Save
 * posts userSetPlanMeta with only that block. The service merges the rest.
 *
 * The plan value comes from the aidos.plan projection and rides down through
 * LocalTicketView. A null plan shows the no-plan note. A refusal surfaces
 * the refusal text verbatim. A success toasts, and the projection re-renders
 * the saved block.
 */

import react from "react";

import { logDebug } from "./log";
import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import type { PlanMetaView } from "../kernel/types";

export interface PlanMetaModalProps {
  open: boolean;
  /** The stored plan of the session's own project. Null shows the no-plan note. */
  planMeta: PlanMetaView | null;
  agentId: string;
  onClose: () => void;
}

/** One editable block: a named field, or one context section by array position. */
type PlanBlockKey = "frontmatter" | "preamble" | number;

export function PlanMetaModal(props: PlanMetaModalProps) {
  const [editing, setEditing] = react.useState<PlanBlockKey | null>(null);
  const [draft, setDraft] = react.useState("");
  const [saving, setSaving] = react.useState(false);
  // One expanded position per context section. The first section starts open.
  const [expanded, setExpanded] = react.useState<readonly number[]>([]);

  react.useEffect(function () {
    if (props.open) {
      setEditing(null);
      setDraft("");
      setExpanded([0]);
      logDebug("plan meta modal opened");
    }
  }, [props.open]);

  if (!props.open) return null;

  function beginEdit(key: PlanBlockKey, text: string) {
    setEditing(key);
    setDraft(text);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  function toggleSection(position: number) {
    setExpanded((current) =>
      current.includes(position)
        ? current.filter((item) => item !== position)
        : [...current, position],
    );
  }

  async function save(key: PlanBlockKey) {
    if (saving) return;
    const args: Record<string, unknown> = {};
    if (key === "frontmatter") {
      args.frontmatter = draft;
    } else if (key === "preamble") {
      args.preamble = draft;
    } else {
      // The section edit replaces the whole array. The saved section carries
      // the draft text, and every other section keeps its heading and index.
      args.contextSections = (props.planMeta?.contextSections ?? []).map((section, position) =>
        position === key ? { ...section, text: draft } : { ...section },
      );
    }
    setSaving(true);
    try {
      await callAidosRemote("userSetPlanMeta", args, props.agentId);
      showToast("Plan block saved", "success");
      cancelEdit();
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

  function renderEditControls(key: PlanBlockKey) {
    return (
      <>
        <textarea
          className="aidos-plan-meta-input"
          value={draft}
          disabled={saving}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
        />
        <div className="aidos-plan-meta-actions">
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={saving}
            onClick={() => {
              void save(key);
            }}
          >
            {saving ? "Saving\u2026" : "Save"}
          </button>
          <button
            className="aidos-btn"
            disabled={saving}
            onClick={cancelEdit}
          >
            Cancel
          </button>
        </div>
      </>
    );
  }

  function renderNamedBlock(key: "frontmatter" | "preamble", label: string, text: string) {
    return (
      <div className="aidos-plan-meta-block" key={key}>
        <div className="aidos-plan-meta-block-head">
          <span className="aidos-plan-meta-block-title">{label}</span>
          <button
            className="aidos-btn"
            disabled={saving}
            onClick={() => {
              beginEdit(key, text);
            }}
          >
            Edit
          </button>
        </div>
        {editing === key ? (
          renderEditControls(key)
        ) : (
          <pre className="aidos-plan-meta-text">{text === "" ? "(empty)" : text}</pre>
        )}
      </div>
    );
  }

  function renderSectionBlock(position: number, heading: string, text: string) {
    const open = expanded.includes(position);
    return (
      <div className="aidos-plan-meta-block" key={position}>
        <div className="aidos-plan-meta-block-head">
          <button
            className="aidos-plan-meta-toggle"
            onClick={() => {
              toggleSection(position);
            }}
          >
            <span aria-hidden="true">{open ? "\u25be" : "\u25b8"}</span>
            {heading}
          </button>
          <button
            className="aidos-btn"
            disabled={saving}
            onClick={() => {
              beginEdit(position, text);
            }}
          >
            Edit
          </button>
        </div>
        {editing === position || open ? (
          editing === position ? (
            renderEditControls(position)
          ) : (
            <pre className="aidos-plan-meta-text">{text === "" ? "(empty)" : text}</pre>
          )
        ) : null}
      </div>
    );
  }

  const meta = props.planMeta;

  return (
    <div
      className="aidos-modal-mask"
      onClick={() => {
        if (!saving) props.onClose();
      }}
    >
      <div
        className="aidos-plan-meta-modal"
        onClick={(event: react.MouseEvent<HTMLDivElement>) => {
          event.stopPropagation();
        }}
      >
        <div className="aidos-modal-head">
          <h3 className="aidos-modal-title">Plan</h3>
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
        {meta === null ? (
          <p className="aidos-plan-meta-note">This project holds no plan yet.</p>
        ) : (
          <div className="aidos-plan-meta-blocks">
            {renderNamedBlock("frontmatter", "Frontmatter", meta.frontmatter)}
            {renderNamedBlock("preamble", "Preamble", meta.preamble)}
            {meta.contextSections.map((section, position) =>
              renderSectionBlock(position, section.heading, section.text),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
