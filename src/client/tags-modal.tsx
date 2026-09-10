/**
 * #180: the Tags browser panel and the tags modal — the one module for the
 * tags UI, so the one-flow rule holds by construction: every surface that
 * attaches, detaches, migrates, or deletes tags reaches the host through
 * THIS FILE (attach is agent-only; detach/migrate/delete are the
 * user-authored remotes), and the approval cards resolve through resolveApproval.
 *
 * The panel lists every tag in the workspace with its count (scrollable, so
 * a long list stays readable); clicking a tag expands it in place: the
 * tickets carrying it, the migrate and delete actions with their approvals,
 * and any pending agent proposals for the tag as approve/reject cards.
 */

import react from "react";

import { callAidosRemote } from "./remote";
import { showToast } from "./toast-store";
import { TicketStrip } from "./ticket-strip";
import { ModalShell } from "./ui";
import { logDebug } from "./log";

import type { BoardKey } from "./board-logic";
import type { TicketView } from "../kernel/projections";

/**
 * One ticket named by the workspaceTags Remote, read STRUCTURALLY — the
 * client never imports host types. The authoritative shape lives in
 * src/host/aidos-core.ts (`workspaceTags`) and the u180 suite asserts the
 * two agree.
 */
export interface TagTicketLike {
  boardKey: string;
  id: number;
  title: string;
  state: string;
  slug: string;
  workspaceKey: string;
}

/** One workspaceTags row, read structurally. */
export interface TagRowLike {
  tag: string;
  count: number;
  tickets: TagTicketLike[];
}

/** One agent tag proposal, read structurally off pendingApprovals. */
export interface TagProposalLike {
  id: string;
  kind: string;
  payload: { tag?: unknown; to?: unknown; reason?: unknown };
  prompt?: unknown;
}

/**
 * Parse the workspaceTags answer into rows. Structural and total: a row
 * missing any field is dropped rather than rendered half-formed.
 */
export function tagRowsFor(payload: unknown): TagRowLike[] {
  if (payload === null || typeof payload !== "object") return [];
  const tags = (payload as { tags?: unknown }).tags;
  if (!Array.isArray(tags)) return [];
  const out: TagRowLike[] = [];
  for (const entry of tags) {
    if (entry === null || typeof entry !== "object") continue;
    const row = entry as { tag?: unknown; count?: unknown; tickets?: unknown };
    if (typeof row.tag !== "string" || typeof row.count !== "number") continue;
    const tickets: TagTicketLike[] = [];
    if (Array.isArray(row.tickets)) {
      for (const item of row.tickets) {
        if (item === null || typeof item !== "object") continue;
        const ticket = item as { boardKey?: unknown; id?: unknown; title?: unknown; state?: unknown; slug?: unknown; workspaceKey?: unknown };
        if (
          typeof ticket.boardKey !== "string" ||
          typeof ticket.id !== "number" ||
          typeof ticket.title !== "string" ||
          typeof ticket.state !== "string" ||
          typeof ticket.slug !== "string" ||
          typeof ticket.workspaceKey !== "string"
        ) {
          continue;
        }
        tickets.push({ boardKey: ticket.boardKey, id: ticket.id, title: ticket.title, state: ticket.state, slug: ticket.slug, workspaceKey: ticket.workspaceKey });
      }
    }
    out.push({ tag: row.tag, count: row.count, tickets });
  }
  return out;
}

/**
 * Filter tag rows by a free-text query. Case-insensitive substring over the
 * tag name; an empty query shows everything. Pure, so it is testable
 * without a browser.
 */
export function filterTagRows(rows: readonly TagRowLike[], query: string): TagRowLike[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...rows];
  return rows.filter((row) => row.tag.toLowerCase().includes(needle));
}

/**
 * The pending agent proposals ABOUT one tag, oldest first. A proposal whose
 * payload names a different tag is not this tag's business.
 */
export function proposalsForTag(
  approvals: readonly TagProposalLike[],
  tag: string,
): TagProposalLike[] {
  return approvals.filter(
    (approval) =>
      (approval.kind === "tag-delete" || approval.kind === "tag-migrate") &&
      approval.payload.tag === tag,
  );
}

/**
 * Render one proposal's action line: "delete" or "A → B", from the payload
 * rather than the prompt (the prompt is prose; the payload is the contract).
 */
export function proposalAction(proposal: TagProposalLike): string {
  if (proposal.kind === "tag-migrate" && typeof proposal.payload.to === "string") {
    return `${String(proposal.payload.tag)} → ${proposal.payload.to}`;
  }
  return `delete ${String(proposal.payload.tag)}`;
}

export interface TagsModalProps {
  sessionId: string;
  /** Jump the board's selection to a ticket carrying the tag. */
  onOpen: (key: BoardKey) => void;
  onClose: () => void;
}

export function TagsModal(props: TagsModalProps) {
  const [rows, setRows] = react.useState<TagRowLike[] | null>(null);
  const [proposals, setProposals] = react.useState<TagProposalLike[]>([]);
  const [error, setError] = react.useState<string | null>(null);
  const [query, setQuery] = react.useState("");
  const [selected, setSelected] = react.useState<string | null>(null);
  const [migrateTo, setMigrateTo] = react.useState("");
  const [working, setWorking] = react.useState<string | null>(null);

  const refresh = react.useCallback(
    function () {
      setError(null);
      callAidosRemote("workspaceTags", {}, props.sessionId)
        .then((result) => {
          setRows(tagRowsFor(result));
        })
        .catch((refreshError: unknown) => {
          setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
        });
      callAidosRemote("pendingApprovals", {}, props.sessionId)
        .then((result) => {
          const list: unknown[] = Array.isArray(result) ? result : [];
          setProposals(
            list.filter((entry): entry is TagProposalLike => {
              if (entry === null || typeof entry !== "object") return false;
              const kind = (entry as { kind?: unknown }).kind;
              return kind === "tag-delete" || kind === "tag-migrate";
            }),
          );
        })
        .catch(() => {
          // Proposals are decoration on the browser; a failed fetch must
          // not blank the tag list.
        });
    },
    [props.sessionId],
  );

  react.useEffect(
    function () {
      logDebug("tags modal opened");
      refresh();
    },
    [refresh],
  );

  const visible = rows === null ? [] : filterTagRows(rows, query);
  const selectedRow = selected === null ? null : (rows ?? []).find((row) => row.tag === selected) ?? null;
  const selectedProposals = selected === null ? [] : proposalsForTag(proposals, selected);

  async function act(kind: string, args: Record<string, unknown>, label: string): Promise<void> {
    setWorking(label);
    try {
      await callAidosRemote(kind, args, props.sessionId);
      showToast(label, "success");
      refresh();
    } catch (actError: unknown) {
      showToast(actError instanceof Error ? actError.message : String(actError), "refusal");
    } finally {
      setWorking(null);
    }
  }

  const body =
    error !== null ? (
      <div className="aidos-empty">
        <p className="aidos-empty-note">{error}</p>
        <button className="aidos-btn" onClick={refresh}>
          Retry
        </button>
      </div>
    ) : rows === null ? (
      <div className="aidos-merge-loading" role="status">
        <span className="aidos-merge-spinner" aria-hidden="true" />
        <span>Loading workspace tags…</span>
      </div>
    ) : rows.length === 0 ? (
      <div className="aidos-empty">
        <h3 className="aidos-empty-title">No tags yet</h3>
        <p className="aidos-empty-note">
          Tags are created by attaching them — the agent attaches with attach_tags, and a name no
          ticket carries yet is created by the attach.
        </p>
      </div>
    ) : (
      <>
        <div className="aidos-search-box">
          <input
            className="aidos-search-input"
            type="search"
            placeholder="Filter tags…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            aria-label="Filter tags"
          />
        </div>
        <ul className="aidos-tags-list">
          {visible.map((row) => (
            <li key={row.tag} className="aidos-tags-row">
              <button
                className={"aidos-btn" + (selected === row.tag ? " aidos-btn-primary" : "")}
                onClick={() => {
                  setSelected(selected === row.tag ? null : row.tag);
                  setMigrateTo("");
                }}
                title={`${row.count} ticket(s) carry this tag`}
                data-dsh-tip=""
              >
                {row.tag}
                <b className="aidos-queue-count">{row.count}</b>
              </button>
            </li>
          ))}
        </ul>
        {visible.length === 0 ? (
          <p className="aidos-empty-note">No tags match this filter.</p>
        ) : null}
        {selectedRow === null ? null : (
          <div className="aidos-tags-detail">
            <h4 className="aidos-tags-detail-title">
              {selectedRow.tag} — {selectedRow.count} ticket(s)
            </h4>
            {selectedRow.tickets.map((ticket) => (
              <TicketStrip
                key={ticket.boardKey}
                ticket={{
                  id: ticket.id,
                  title: ticket.title,
                  state: ticket.state as TicketView["state"],
                  slug: ticket.slug,
                  workspaceKey: ticket.workspaceKey,
                }}
                onOpen={() => {
                  props.onOpen(ticket.boardKey as BoardKey);
                }}
              />
            ))}
            <div className="aidos-tags-actions">
              <div className="aidos-search-box">
                <input
                  className="aidos-search-input"
                  type="text"
                  placeholder="Migrate to…"
                  value={migrateTo}
                  onChange={(event) => {
                    setMigrateTo(event.target.value);
                  }}
                  aria-label="Replacement tag for migration"
                />
              </div>
              <button
                className="aidos-btn"
                disabled={working !== null || migrateTo.trim() === ""}
                onClick={() => {
                  void act(
                    "userMigrateTag",
                    { from: selectedRow.tag, to: migrateTo.trim() },
                    `Migrated ${selectedRow.tag} → ${migrateTo.trim()}`,
                  );
                }}
                title="Replace this tag with another on every ticket carrying it"
                data-dsh-tip=""
              >
                Migrate
              </button>
              <button
                className="aidos-btn"
                disabled={working !== null}
                onClick={() => {
                  void act("userDeleteTag", { tag: selectedRow.tag }, `Deleted ${selectedRow.tag}`);
                  setSelected(null);
                }}
                title="Delete this tag from every ticket carrying it"
                data-dsh-tip=""
              >
                Delete
              </button>
            </div>
            {selectedProposals.length === 0 ? null : (
              <div className="aidos-tags-proposals">
                <h4 className="aidos-tags-detail-title">Agent proposals awaiting approval</h4>
                {selectedProposals.map((proposal) => (
                  <div key={proposal.id} className="aidos-tags-proposal">
                    <span>{proposalAction(proposal)}</span>
                    {typeof proposal.payload.reason === "string" && proposal.payload.reason !== "" ? (
                      <span className="aidos-empty-note"> — {proposal.payload.reason}</span>
                    ) : null}
                    <span className="aidos-tags-actions">
                      <button
                        className="aidos-btn aidos-btn-primary"
                        disabled={working !== null}
                        onClick={() => {
                          void act("resolveApproval", { requestId: proposal.id, approved: true }, "Proposal approved");
                        }}
                      >
                        Approve
                      </button>
                      <button
                        className="aidos-btn"
                        disabled={working !== null}
                        onClick={() => {
                          void act("resolveApproval", { requestId: proposal.id, approved: false }, "Proposal rejected");
                        }}
                      >
                        Reject
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );

  return (
    <ModalShell title="Tags" wide onClose={props.onClose}>
      {body}
    </ModalShell>
  );
}
