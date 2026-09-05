/**
 * Ticket #50: the evidence viewer modal. Clicking one evidence row opens a
 * modal with the row's full payload, rendered per kind: pretty-printed JSON
 * at minimum, with paths listed for allowlist rows. Closes via the close
 * button, a backdrop click, and Escape.
 */

import react from "react";

import { kindColor, kindKeyword } from "./board-logic";
import type { EvidenceRowLike } from "./board-logic";
import { FieldRow } from "./ui";
import { EvidencePayloadView } from "./evidence-payload-view";

export interface EvidenceViewerProps {
  row: EvidenceRowLike | null;
  onClose: () => void;
}

export function EvidenceViewer(props: EvidenceViewerProps) {
  const row = props.row;

  react.useEffect(function () {
    if (row === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, [row, props]);

  if (row === null) return null;

  return (
    <div
      className="aidos-modal-mask"
      onClick={props.onClose}
    >
      <div
        className="aidos-modal"
        onClick={(event: react.MouseEvent<HTMLDivElement>) => {
          event.stopPropagation();
        }}
      >
        <div className="aidos-modal-head">
          <h3 className="aidos-modal-title">
            <span
              className="aidos-chip aidos-chip-kind"
              style={{ ["--chip-hue"]: kindColor(row.kind) } as react.CSSProperties}
            >
              <span className="aidos-chip-key">{kindKeyword(row.kind)}</span>
            </span>
            {" " + row.kind}
          </h3>
          <button
            className="aidos-close-btn"
            onClick={props.onClose}
            aria-label="Close"
          >
            {"\u00d7"}
          </button>
        </div>
        <div className="aidos-modal-form">
          <div className="aidos-evidence-fields">
            <FieldRow label="Author">{row.author}</FieldRow>
            <FieldRow label="At">
              {typeof row.at === "number"
                ? new Date(row.at * 1000).toISOString()
                : "unknown"}
            </FieldRow>
          </div>
          <EvidencePayloadView row={row} />
        </div>
      </div>
    </div>
  );
}
