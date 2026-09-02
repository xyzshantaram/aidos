/**
 * #69: criterion-centric evidence linking. One component renders every
 * criterion with the evidence rows linked to it and a dropdown + add button
 * that attaches an actual evidence ROW instance (not a kind) to that
 * criterion. Used by the criteria panel, the mark-done confirmation modal,
 * and reusable anywhere the same question is asked.
 *
 * The link itself rides the row's payload.criteria (the pre-existing
 * grouping channel), written through the userLinkEvidence remote — so
 * coverage, grouping, and the strips all read one field.
 */
import react from "react";

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { EvidenceStrip } from "./evidence-strip";
import type { EvidenceRow } from "../kernel/types";
import type { EvidenceRowLike } from "./board-logic";

/** The criterion label a row is linked to, or null when unlinked. */
export function criterionOf(row: EvidenceRowLike): string | null {
  const raw = (row.payload ?? {}).criteria;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

/** Rows linked to one criterion label. */
export function rowsForCriterion(
  evidence: readonly EvidenceRowLike[],
  label: string,
): EvidenceRowLike[] {
  return evidence.filter((row) => criterionOf(row) === label);
}

/** Rows not linked to any criterion — the linkable candidates. */
export function unlinkedRows(
  evidence: readonly EvidenceRowLike[],
): EvidenceRowLike[] {
  return evidence.filter((row) => criterionOf(row) === null);
}

function showError(error: unknown) {
  if (error instanceof AidosRemoteError) {
    showToast(error.message, "refusal");
  } else {
    showToast(String(error), "refusal");
  }
}

export interface CriterionLinkerProps {
  criteria: string[];
  evidence: readonly EvidenceRow[];
  ticketIdKey: string;
  agentId: string;
  /** Called after every successful link/unlink so the owner refreshes. */
  onChanged: () => void;
  /** Render strips read-only: no dropdowns, no unlink buttons. */
  readOnly?: boolean;
}

export function CriterionLinker(props: CriterionLinkerProps) {
  const [busyAt, setBusyAt] = react.useState<number | null>(null);
  const [draft, setDraft] = react.useState<Record<string, string>>({});

  const candidates = unlinkedRows(props.evidence);

  async function resolve(
    row: EvidenceRowLike,
    criterion: string | null,
  ): Promise<void> {
    if (busyAt !== null) return;
    setBusyAt(row.at ?? 0);
    try {
      await callAidosRemote(
        "userLinkEvidence",
        { ticketId: props.ticketIdKey, at: row.at, rowKind: row.kind, criterion },
        props.agentId,
      );
      showToast(
        criterion === null ? "Evidence unlinked" : "Evidence linked to criterion",
        "success",
      );
      props.onChanged();
    } catch (error) {
      showError(error);
    } finally {
      setBusyAt(null);
    }
  }

  return (
    <div className="aidos-criterion-blocks">
      {props.criteria.map((label) => {
        const linked = rowsForCriterion(props.evidence, label);
        const options = candidates.filter((row) => !linked.includes(row));
        const value = draft[label] ?? "";
        return (
          <div className="aidos-criterion-block" key={label}>
            <div className="aidos-criterion-label">{label}</div>
            {linked.length > 0 ? (
              <ul className="aidos-criterion-evidence">
                {linked.map((row) => (
                  <EvidenceStrip
                    key={String(row.at) + ":" + row.kind}
                    row={row}
                    deleting={busyAt === row.at}
                    onUnlink={
                      props.readOnly ? undefined : () => void resolve(row, null)
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="aidos-detail-note">No evidence linked.</p>
            )}
            {!props.readOnly && options.length > 0 ? (
              <div className="aidos-criterion-linker">
                <select
                  value={value}
                  onChange={(event) => {
                    setDraft({ ...draft, [label]: event.target.value });
                  }}
                  aria-label={"Evidence to link to criterion " + label}
                >
                  <option value="">Link an evidence row…</option>
                  {options.map((row) => (
                    <option key={String(row.at) + ":" + row.kind} value={String(row.at) + ":" + row.kind}>
                      {evidenceOptionLabel(row)}
                    </option>
                  ))}
                </select>
                <button
                  className="aidos-btn"
                  disabled={value === "" || busyAt !== null}
                  onClick={() => {
                    const row = options.find(
                      (candidate) =>
                        String(candidate.at) + ":" + candidate.kind === value,
                    );
                    if (row) void resolve(row, label);
                  }}
                >
                  Add
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** The dropdown text for one candidate row. */
export function evidenceOptionLabel(row: EvidenceRowLike): string {
  const excerpt = evidenceExcerptForOption(row);
  const kind = row.kind.replace(/^builtin:/, "");
  return excerpt !== null ? kind + " — " + excerpt : kind;
}

function evidenceExcerptForOption(row: EvidenceRowLike): string | null {
  const payload = row.payload ?? {};
  if (typeof payload.note === "string" && payload.note.trim() !== "") {
    const note = payload.note.trim();
    return note.length > 48 ? note.slice(0, 48) + "…" : note;
  }
  if (Array.isArray(payload.paths) && payload.paths.length > 0) {
    return payload.paths.length + " path(s)";
  }
  if (typeof payload.claimed_state === "string") return payload.claimed_state;
  if (typeof payload.commit === "string") return payload.commit.slice(0, 12);
  if (typeof payload.imagePath === "string") return "screenshot";
  return null;
}
