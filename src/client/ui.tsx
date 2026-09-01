/**
 * #70 + #72: the shared UI vocabulary. One set of primitives every modal,
 * panel, and card composes, so the same API object renders identically
 * wherever it appears — and so no surface hand-rolls a JSON dump.
 *
 * The rule this module exists for: a field has a LABEL and a VALUE, rendered
 * the same way everywhere (FieldRow); a status is a CHIP (Chip); a detail is
 * a KEY/VALUE pair (KeyVal); anything long or optional hides behind a
 * disclosure (Collapse).aidos stays standalone: these are ours, styled from
 * board.css tokens, no external dependency.
 */
import react from "react";

/** A status or kind badge. The color comes from the caller (token or hash). */
export function Chip(props: {
  label: string;
  background?: string;
  title?: string;
  emphasis?: boolean;
}) {
  return (
    <span
      className={"aidos-chip" + (props.emphasis ? " aidos-chip-emphasis" : "")}
      style={props.background === undefined ? undefined : { background: props.background }}
      title={props.title}
    >
      {props.label}
    </span>
  );
}

/** One labeled value. The workhorse of every structured surface. */
export function FieldRow(props: {
  label: string;
  children: react.ReactNode;
}) {
  return (
    <div className="aidos-field-row">
      <span className="aidos-field-row-label">{props.label}</span>
      <span className="aidos-field-row-value">{props.children}</span>
    </div>
  );
}

/** A compact key/value line for fact tables. */
export function KeyVal(props: { k: string; v: react.ReactNode; title?: string }) {
  return (
    <div className="aidos-facts-row" title={props.title}>
      <dt className="aidos-facts-label">{props.k}</dt>
      <dd className="aidos-facts-value">{props.v}</dd>
    </div>
  );
}

/** A collapsed disclosure for anything long, optional, or last-resort. */
export function Collapse(props: {
  summary: string;
  children: react.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = react.useState(props.defaultOpen === true);
  return (
    <details
      className="aidos-collapse"
      open={open}
      onToggle={(event: react.SyntheticEvent<HTMLDetailsElement>) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary>{props.summary}</summary>
      <div className="aidos-collapse-body">{props.children}</div>
    </details>
  );
}

/** The shared modal chrome: mask, panel, title row, close, action row. */
export function ModalShell(props: {
  title: string;
  working?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  children: react.ReactNode;
}) {
  react.useEffect(function () {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [props]);
  return (
    <div className="aidos-modal-mask" onClick={props.onClose}>
      <div
        className="aidos-modal"
        onClick={(event: react.MouseEvent<HTMLDivElement>) => {
          event.stopPropagation();
        }}
      >
        <div className="aidos-modal-head">
          <h3 className="aidos-modal-title">{props.title}</h3>
          <button className="aidos-close-btn" onClick={props.onClose} aria-label="Close">
            {"\u00d7"}
          </button>
        </div>
        <div className="aidos-modal-form">
          {props.children}
          {props.onConfirm !== undefined ? (
            <div className="aidos-form-actions">
              <button className="aidos-btn" onClick={props.onClose} disabled={props.working}>
                Cancel
              </button>
              <button
                className="aidos-btn aidos-btn-primary"
                onClick={props.onConfirm}
                disabled={props.working}
              >
                {props.working ? "Working\u2026" : (props.confirmLabel ?? "Confirm")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A labeled textarea used by every note-like input. */
export function NoteField(props: {
  label: string;
  value: string;
  working?: boolean;
  placeholder?: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="aidos-modal-row">
      <label>{props.label}</label>
      <textarea
        className="aidos-evidence-attach-note"
        value={props.value}
        disabled={props.working}
        placeholder={props.placeholder}
        onChange={(event) => {
          props.onChange(event.target.value);
        }}
      />
    </div>
  );
}
