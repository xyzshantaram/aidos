/**
 * #69 + #72: the evidence STRIP. One row of evidence rendered as a rich
 * strip — kind chip, author, relative time, a content excerpt, and its
 * action affordances — reused by the evidence panel and the mark-done
 * confirmation modal so an evidence instance looks identical everywhere.
 */
import react from "react";

import { kindColor, kindKeyword, kindDescription } from "./board-logic";
import { PopOutIcon } from "./icons";
import type { EvidenceRowLike } from "./board-logic";

/** A short human excerpt of the row's payload, kind-aware. */
export function evidenceExcerpt(row: EvidenceRowLike): string | null {
  const payload = row.payload ?? {};
  if (typeof payload.note === "string" && payload.note.trim() !== "") {
    return payload.note.trim();
  }
  if (Array.isArray(payload.paths)) {
    const paths = payload.paths.filter((p): p is string => typeof p === "string");
    if (paths.length > 0) return paths.length + " path(s)";
  }
  if (typeof payload.claimed_state === "string") return "claimed " + payload.claimed_state;
  if (typeof payload.commit === "string") return "commit " + payload.commit.slice(0, 12);
  if (typeof payload.imagePath === "string") return "screenshot";
  if (typeof payload.report === "string") return payload.report.slice(0, 60);
  return null;
}

function timeAgo(at: number | undefined): string | null {
  if (typeof at !== "number") return null;
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - at));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return Math.floor(seconds / 86400) + "d ago";
}

export interface EvidenceStripProps {
  row: EvidenceRowLike;
  /** Clicking the strip body opens the viewer (#50). */
  onView?: (row: EvidenceRowLike) => void;
  onDelete?: (row: EvidenceRowLike) => void;
  deleting?: boolean;
  /** The criterion this row is linked to, when the caller knows it. */
  criterionLabel?: string;
  /** Clears the row's criterion link (the ⨯-adjacent unlink affordance). */
  onUnlink?: () => void;
}

export function EvidenceStrip(props: EvidenceStripProps) {
  const row = props.row;
  const excerpt = evidenceExcerpt(row);
  const when = timeAgo(row.at);
  return (
    <li className="aidos-evidence-strip">
      <div className="aidos-evidence-strip-main">
        <span
          className="aidos-chip aidos-chip-kind"
          style={{ ["--chip-hue"]: kindColor(row.kind) } as react.CSSProperties}
          title={kindDescription(row.kind)}
          data-dsh-tip=""
        >
          <span className="aidos-chip-key">{kindKeyword(row.kind)}</span>
        </span>
        <span className="aidos-evidence-strip-body">
          {excerpt !== null ? (
            <span className="aidos-evidence-strip-excerpt">{excerpt}</span>
          ) : (
            <span className="aidos-evidence-strip-kind-name">{row.kind}</span>
          )}
          <span className="aidos-evidence-strip-meta">
            {row.author}
            {when !== null ? " · " + when : ""}
            {props.criterionLabel !== undefined
              ? " · criterion: " + props.criterionLabel
              : null}
          </span>
        </span>
        <span className="aidos-evidence-strip-actions">
          {props.onView !== undefined ? (
            <button
              className="aidos-icon-btn"
              title="View evidence"
              data-dsh-tip=""
              aria-label="View evidence"
              onClick={(event: react.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                props.onView?.(row);
              }}
            >
              <PopOutIcon />
            </button>
          ) : null}
          {props.onUnlink !== undefined ? (
            <button
              className="aidos-evidence-unlink"
              title="Unlink from criterion"
              data-dsh-tip=""
              aria-label="Unlink from criterion"
              disabled={props.deleting === true}
              onClick={(event: react.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                props.onUnlink?.();
              }}
            >
              {"\u2a02"}
            </button>
          ) : null}
          {props.onDelete !== undefined ? (
          <button
            className="aidos-evidence-delete"
            title="Delete this evidence row"
            data-dsh-tip=""
            aria-label="Delete this evidence row"
            disabled={props.deleting === true}
            onClick={(event: react.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              props.onDelete?.(row);
            }}
          >
            {"\u2715"}
          </button>
          ) : null}
        </span>
      </div>
    </li>
  );
}
