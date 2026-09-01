/**
 * #68 + the UI push: kind-aware evidence payload rendering, shared by the
 * evidence viewer modal (#50) and any surface that shows an evidence row.
 *
 * The design rule is NO RAW JSON in primary surfaces: every field the board's
 * own kinds use renders as a structured row (note text, path lists, claimed
 * state, commit identity, image paths). Unknown kinds fall back to a
 * structured key/value walk of the payload — still not a JSON dump — and raw
 * JSON survives only behind an explicit collapsed disclosure for extenuating
 * circumstances (debugging, foreign kinds).
 */
import react from "react";

import type { EvidenceRowLike } from "./board-logic";

/** One label/value row of the structured payload view. */
function FieldRow(props: { label: string; children: react.ReactNode }) {
  return (
    <div className="aidos-evidence-field">
      <span className="aidos-evidence-field-label">{props.label}</span>
      <span className="aidos-evidence-field-value">{props.children}</span>
    </div>
  );
}

/** A note-like string: quoted, preserved across lines. */
function NoteText(props: { text: string }) {
  return <span className="aidos-evidence-note-text">{props.text}</span>;
}

/** A collapsible raw-JSON disclosure: the last resort, never the default. */
function RawJsonDisclosure(props: { payload: Record<string, unknown> }) {
  const [open, setOpen] = react.useState(false);
  return (
    <details
      className="aidos-evidence-raw-json"
      open={open}
      onToggle={(event: react.SyntheticEvent<HTMLDetailsElement>) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary>{"raw payload"}</summary>
      <pre className="aidos-evidence-payload-json">
        {JSON.stringify(props.payload, null, 2)}
      </pre>
    </details>
  );
}

function isImage(path: string): boolean {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(path);
}

/** One payload value rendered kind-aware. Unknown kinds walk key/value. */
export function EvidencePayloadView(props: { row: EvidenceRowLike }) {
  const { kind } = props.row;
  const payload = (props.row.payload ?? {}) as Record<string, unknown>;
  const note = typeof payload.note === "string" ? payload.note : null;
  const rest: Record<string, unknown> = { ...payload };
  delete rest.note;

  if (kind === "builtin:file_allowlist" && Array.isArray(payload.paths)) {
    return (
      <div className="aidos-evidence-fields">
        <FieldRow label="Paths">
          <ul className="aidos-evidence-payload-list">
            {(payload.paths as string[]).map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </FieldRow>
        {note !== null ? <FieldRow label="Note"><NoteText text={note} /></FieldRow> : null}
        <RawJsonDisclosure payload={payload} />
      </div>
    );
  }

  if (kind === "builtin:imported_state" && typeof payload.claimed_state === "string") {
    return (
      <div className="aidos-evidence-fields">
        <FieldRow label="Claimed state">
          <span className="aidos-evidence-note-text">{payload.claimed_state}</span>
        </FieldRow>
        {typeof payload.source === "string" ? <FieldRow label="Source">{payload.source}</FieldRow> : null}
        {note !== null ? <FieldRow label="Note"><NoteText text={note} /></FieldRow> : null}
        <RawJsonDisclosure payload={payload} />
      </div>
    );
  }

  if (typeof payload.imagePath === "string") {
    return (
      <div className="aidos-evidence-fields">
        <FieldRow label="Screenshot">
          <img className="aidos-evidence-image" src={payload.imagePath} alt={note ?? "evidence screenshot"} />
          <span className="aidos-evidence-image-path">{payload.imagePath}</span>
        </FieldRow>
        {note !== null ? <FieldRow label="Note"><NoteText text={note} /></FieldRow> : null}
        <RawJsonDisclosure payload={payload} />
      </div>
    );
  }

  if (typeof payload.commit === "string") {
    return (
      <div className="aidos-evidence-fields">
        <FieldRow label="Commit">
          <code>{String(payload.commit).slice(0, 12)}</code>
          {typeof payload.subject === "string" ? <NoteText text={" " + payload.subject} /> : null}
        </FieldRow>
        {typeof payload.author === "string" ? <FieldRow label="Committed by">{payload.author}</FieldRow> : null}
        {typeof payload.branch === "string" ? <FieldRow label="Branch">{payload.branch}</FieldRow> : null}
        {note !== null ? <FieldRow label="Note"><NoteText text={note} /></FieldRow> : null}
        <RawJsonDisclosure payload={payload} />
      </div>
    );
  }

  // Verdict-ish rows (review_pass, user_verified, automated_check, review_note):
  // the text IS the payload, quoted — never a JSON dump.
  const textFields = Object.entries(rest).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== "",
  );
  const otherFields = Object.entries(rest).filter((entry) => typeof entry[1] !== "string");
  return (
    <div className="aidos-evidence-fields">
      {textFields.map(([key, value]) => (
        <FieldRow key={key} label={key}>
          <NoteText text={value} />
        </FieldRow>
      ))}
      {otherFields.map(([key, value]) => (
        <FieldRow key={key} label={key}>
          <code>{isImage(String(value)) ? String(value) : JSON.stringify(value)}</code>
        </FieldRow>
      ))}
      {note !== null ? <FieldRow label="Note"><NoteText text={note} /></FieldRow> : null}
      <RawJsonDisclosure payload={payload} />
    </div>
  );
}
