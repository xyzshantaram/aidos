/**
 * Ticket U2e + #170: the per-ticket allowlist editor. A modal opened from
 * the detail panel for in-progress tickets only. A text area holds one path
 * per line, prefilled from the ticket's current allowlist, plus a preview
 * of the union with the other in-progress tickets' allowlists.
 *
 * Save grants through `userGrantAllowlist` -- the ONE allowlist path, which
 * validates, attaches the user-authored `builtin:file_allowlist` row, and
 * MERGES into the field. The editor used to attach the row itself and write
 * the field through `userSetTicket`, where the field write REPLACED rather
 * than merged: that split is what silently dropped config's earlier grant
 * (#112). The direct field write is deleted, not deprecated.
 *
 * Saving is therefore ADDITIVE: paths named here are granted on top of what
 * the ticket already holds. To revoke a path, delete its grant row from the
 * ticket's evidence -- the next grant carries forward only what is still
 * covered, so a detached grant stops applying instead of jamming the
 * ticket (#112 round 2).
 */

import react from "react";

import { boardKeyOf } from "./board-logic";

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";

export interface AllowlistEditorProps {
  open: boolean;
  ticketId: number | string;
  ticketIdKey: string;
  currentAllowlist: readonly string[];
  agentId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface TicketRowLike {
  id: number;
  state: string;
  allowlist?: string[];
  /** Present on merged rows; needed to address the row unambiguously. */
  sourceSessionId?: string;
  foreign?: boolean;
}

/** Parse the text area: one path per line, trimmed, empties dropped, deduped. */
export function parseAllowlistText(text: string): string[] {
  const seen = new Set<string>();
  for (const line of text.split("\n")) {
    const path = line.trim();
    if (path !== "" && !seen.has(path)) {
      seen.add(path);
    }
  }
  return [...seen];
}


/**
 * The union of paths already writable by OTHER in-progress tickets.
 *
 * Extracted from the editor's effect (#93 review 5). It was called
 * "structurally untestable without jsdom", but the untestability was
 * self-inflicted: the logic sat inside a useEffect. Pure, it needs no DOM --
 * and it needs to be tested, because an uncovered line here is what let a
 * reviewer's mutation get committed unnoticed.
 *
 * `selfKey` is the BOARD KEY of the ticket being edited. Comparing bare
 * numeric ids here excluded every OTHER ticket sharing that number on a
 * merged board, silently dropping their paths from the union.
 */
export function otherAllowlistUnion(
  rows: readonly TicketRowLike[],
  selfKey: string,
): string[] {
  const union: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (boardKeyOf(row) === selfKey || row.state !== "in_progress") continue;
    for (const path of row.allowlist ?? []) {
      if (!seen.has(path)) {
        seen.add(path);
        union.push(path);
      }
    }
  }
  return union;
}

export function AllowlistEditor(props: AllowlistEditorProps) {
  const [text, setText] = react.useState(
    props.currentAllowlist.join("\n"),
  );
  const [others, setOthers] = react.useState<string[]>([]);
  const [saving, setSaving] = react.useState(false);

  react.useEffect(function () {
    if (!props.open) return;
    let cancelled = false;
    void (async function () {
      try {
        const rows = (await callAidosRemote("workspaceTickets", {}, props.agentId)) as
          | TicketRowLike[]
          | { tickets?: TicketRowLike[] };
        const list = Array.isArray(rows) ? rows : (rows?.tickets ?? []);
        const union = otherAllowlistUnion(list, props.ticketIdKey);
        if (!cancelled) setOthers(union);
      } catch {
        // The preview is advisory; a failed read leaves it empty.
      }
    })();
    return function () {
      cancelled = true;
    };
  }, [props.open, props.agentId, props.ticketId]);

  if (!props.open) return null;

  async function save() {
    if (saving) return;
    const paths = parseAllowlistText(text);
    setSaving(true);
    try {
      // #170: the grant is one remote -- validate, attach the
      // user-authored row, merge -- owned host-side by userGrantAllowlist.
      // No direct field write: userSetTicket REPLACES the allowlist, which
      // is the replace-not-merge split that caused #112's silent data loss.
      const outcome = (await callAidosRemote(
        "userGrantAllowlist",
        { ticketId: props.ticketIdKey, paths },
        props.agentId,
      )) as unknown as { granted?: string[] };
      const granted = Array.isArray(outcome?.granted) ? outcome.granted.length : paths.length;
      showToast(
        granted > 0 ? "Allowlist granted — " + granted + " path(s)" : "Allowlist unchanged",
        "success",
      );
      props.onClose();
      props.onSaved();
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
          <h3 className="aidos-modal-title">File allowlist</h3>
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
            <label>One path per line. Saving grants these paths on top of the current list — a write outside the granted set refuses while the ticket is in progress. To revoke a path, delete its grant row from the ticket's evidence.</label>
            <textarea
              className="aidos-allowlist-input"
              value={text}
              disabled={saving}
              rows={8}
              onChange={(event) => {
                setText(event.target.value);
              }}
            />
          </div>
          {others.length > 0 ? (
            <div className="aidos-modal-row aidos-allowlist-preview">
              <label>Also allowed by other in-progress tickets</label>
              <ul>
                {others.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            className="aidos-btn aidos-btn-primary"
            disabled={saving}
            onClick={() => {
              void save();
            }}
          >
            {saving ? "Saving\u2026" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
