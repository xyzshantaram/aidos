/**
 * Ticket U2e: the per-ticket allowlist editor. A modal opened from the
 * detail panel for in-progress tickets only. A text area holds one path per
 * line, prefilled from the ticket's current allowlist, plus a preview of the
 * union with the other in-progress tickets' allowlists.
 *
 * Save sends the whole list through `userSetTicket` with the `allowlist`
 * field and writes the `builtin:file_allowlist` evidence row (author `user`,
 * payload `{ paths: string[] }`) with the same paths, matching the A7
 * design: the ticket field and the durable approval record land together.
 */

import react from "react";

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
        const union: string[] = [];
        const seen = new Set<string>();
        for (const row of list) {
          if (row.id === props.ticketId || row.state !== "in_progress") continue;
          for (const path of row.allowlist ?? []) {
            if (!seen.has(path)) {
              seen.add(path);
              union.push(path);
            }
          }
        }
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
      // The approval record first, then the field: the coverage check reads
      // the row, so a field write must never outrun its evidence.
      await callAidosRemote(
        "userAttachEvidence",
        { ticketId: props.ticketIdKey, kind: "builtin:file_allowlist", payload: { paths } },
        props.agentId,
      );
      await callAidosRemote(
        "userSetTicket",
        { ticketId: props.ticketIdKey, allowlist: paths },
        props.agentId,
      );
      showToast("Allowlist saved", "success");
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
            <label>One path per line. A write outside this list refuses while the ticket is in progress.</label>
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
