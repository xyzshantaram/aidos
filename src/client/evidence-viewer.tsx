/**
 * Ticket #50: the evidence viewer modal. Clicking one evidence row opens a
 * modal with the row's full payload, rendered per kind: pretty-printed JSON
 * at minimum, with paths listed for allowlist rows. Closes via the close
 * button, a backdrop click, and Escape.
 */

import react from "react";

import { kindColor, kindKeyword } from "./board-logic";
import type { EvidenceRowLike } from "./board-logic";

export interface EvidenceViewerProps {
  row: EvidenceRowLike | null;
  onClose: () => void;
}

/** One payload value rendered kind-aware. JSON at minimum. */
function PayloadView({ row }: { row: EvidenceRowLike }) {
  const payload = row.payload ?? {};
  if (row.kind === "builtin:file_allowlist" && Array.isArray(payload.paths)) {
    return (
      <ul className="aidos-evidence-payload-list">
        {(payload.paths as string[]).map((path) => (
          <li key={path}>{path}</li>
        ))}
      </ul>
    );
  }
  return (
    <pre className="aidos-evidence-payload-json">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
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
              style={{ background: kindColor(row.kind) }}
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
          <div className="aidos-evidence-viewer-meta">
            <span>
              <strong>Author:</strong> {row.author}
            </span>
            <span>
              <strong>At:</strong>{" "}
              {typeof row.at === "number"
                ? new Date(row.at * 1000).toISOString()
                : "unknown"}
            </span>
          </div>
          <PayloadView row={row} />
        </div>
      </div>
    </div>
  );
}
