/**
 * The session-scoped board wrapper. Reads the aidos.tickets projection,
 * reports the open count for the tab badge, restores and persists the applied
 * filter, and owns the deep-link, detail, create, loading, and error states.
 *
 * LocalTicketView owns the retry nonce. ProjectionReader holds the whole body
 * and remounts on retry, which re-subscribes the projection.
 */

import react from "react";

import {
  STATE_CHECKLIST_ORDER,
  filterTickets,
  openCount,
  evidenceIsMany,
} from "./board-logic";
import type { SortKey } from "./board-logic";


import type { AppliedState } from "./view-state";
import {
  DEFAULT_APPLIED,
  cloneAppliedState,
  reportCount,
  setAppliedState,
} from "./view-state";
import { TicketView } from "./ticket-view";
import { DetailView } from "./detail-panel";
import { CreateTicketModal } from "./create-ticket-modal";
import { activeTicketId } from "./active-ticket";
import { logDebug } from "./log";
import { showToast } from "./toast-store";
import { callAidosRemote } from "./remote";
import { getMerge, getPulledVersion, setMerge, setPulledVersion } from "./view-state";
import type { WorkspaceMerge } from "./view-state";
import { ToastContainer } from "./toast";
import type { TicketView as TicketViewType } from "../kernel/projections";
import type { CommentRecord, EvidenceRow } from "../kernel/types";


export interface LocalTicketViewProps {
  sessionId: string;
  useProjection: (key: string) => unknown;
}

interface ProjectionReaderProps {
  sessionId: string;
  useProjection: (key: string) => unknown;
  onRetry: () => void;
}

/** One workspace-local filter key. */
function filterStorageKey(workspaceKey: string): string {
  return "aidos:board:local:filter:" + workspaceKey;
}

/**
 * Intersect a stored project selection with the projects actually present.
 * Null covers every present project.
 */
function intersectProjectIds(
  stored: number[] | null,
  tickets: readonly TicketViewType[],
): number[] | null {
  if (stored === null) return null;
  const present = new Set<number>();
  for (const ticket of tickets) present.add(ticket.projectId);
  const kept = stored.filter((id) => present.has(id));
  if (kept.length === present.size) return null;
  return kept;
}

/** Read the persisted filter. Falls back to defaults on any failure. */
function restoreFilter(
  workspaceKey: string,
  tickets: readonly TicketViewType[],
): AppliedState {
  try {
    const raw = window.localStorage.getItem(filterStorageKey(workspaceKey));
    if (raw === null) return cloneAppliedState(DEFAULT_APPLIED);
    const parsed = JSON.parse(raw) as Partial<AppliedState>;
    const stateIds = Array.isArray(parsed.stateIds)
      ? (parsed.stateIds as AppliedState["stateIds"]).filter(
          (state) => STATE_CHECKLIST_ORDER.includes(state),
        )
      : [...DEFAULT_APPLIED.stateIds];
    const projectIds = Array.isArray(parsed.projectIds)
      ? intersectProjectIds(
          parsed.projectIds.filter((id): id is number => typeof id === "number"),
          tickets,
        )
      : null;
    const sortKey: SortKey =
      parsed.sortKey === "confidence" ||
      parsed.sortKey === "gates" ||
      parsed.sortKey === "time" ||
      parsed.sortKey === "alpha"
        ? parsed.sortKey
        : "confidence";
    return {
      projectIds,
      stateIds,
      sortKey,
      descending: typeof parsed.descending === "boolean" ? parsed.descending : true,
      search: typeof parsed.search === "string" ? parsed.search : "",
    };
  } catch {
    return cloneAppliedState(DEFAULT_APPLIED);
  }
}

/** Read the ticket id from the query string. */
function ticketIdFromSearch(search: string): number | null {
  const match = /[?&]ticket=(\d+)/.exec(search);
  if (match === null) return null;
  return Number(match[1]);
}

/** Write the ticket id into the query string. Null clears it. */
function setTicketParam(id: number | null): void {
  const url = new URL(window.location.href);
  if (id === null) {
    url.searchParams.delete("ticket");
    window.history.replaceState({}, "", url);
  } else {
    url.searchParams.set("ticket", String(id));
    window.history.pushState({}, "", url);
  }
}

export function LocalTicketView(props: LocalTicketViewProps) {
  const [retryNonce, setRetryNonce] = react.useState(0);

  react.useEffect(function () {
    logDebug("board view mounted");
  }, []);

  return (
    <ProjectionReader
      key={retryNonce}
      sessionId={props.sessionId}
      useProjection={props.useProjection}
      onRetry={() => {
        setRetryNonce((n) => n + 1);
      }}
    />
  );
}

function ProjectionReader(props: ProjectionReaderProps) {
  const sessionId = props.sessionId;

  const ticketsProjection = props.useProjection("aidos.tickets");
  const evidenceProjection = props.useProjection("aidos.evidence");
  const commentsProjection = props.useProjection("aidos.comments");
  const loaded =
    ticketsProjection !== undefined &&
    evidenceProjection !== undefined &&
    commentsProjection !== undefined;

  // The workspace merge. The projection covers the own session only; the
  // workspaceTickets Remote adds every sibling session of the same
  // workspace (live and closed). The merge lives in the module-level
  // view-state store: the badge re-register remounts this component, and
  // component state would drop the merge on every remount (the badge then
  // flips 20 -> 0 -> 20 forever and the board renders empty).
  const [merge, setMergeState] = react.useState(() => getMerge(sessionId));
  const ownVersion = ticketsProjection === undefined
    ? null
    : JSON.stringify(ticketsProjection).length + ":" + Object.keys(ticketsProjection as Record<string, unknown>).length;
  react.useEffect(function () {
    if (!loaded || ownVersion === null) return;
    // Skip the pull when this exact own-board version already landed: a
    // badge remount re-runs the effect with unchanged inputs.
    if (getPulledVersion(sessionId) === ownVersion) return;
    setPulledVersion(sessionId, ownVersion);
    let cancelled = false;
    const pull = async function () {
      try {
        const result = await callAidosRemote("workspaceTickets", {}, sessionId);
        if (cancelled) return;
        setMerge(sessionId, result as unknown as WorkspaceMerge);
        setMergeState(result as unknown as WorkspaceMerge);
      } catch {
        // The merge is additive; a failed pull leaves the cached board.
      }
    };
    void pull();
    return function () {
      cancelled = true;
    };
  }, [loaded, sessionId, ownVersion]);

  // The effective board: the merged rows when a merge exists, else the own
  // projection alone. Foreign rows carry key sessionId:ticketId; own rows
  // plain ticketId.
  const boardTickets: Array<TicketViewType & { sourceSessionId?: string; foreign?: boolean }> =
    merge !== null
      ? merge.tickets
      : Object.values(ticketsProjection as Record<string, TicketViewType> | undefined ?? {}).map(
          (row) => ({ ...row, sourceSessionId: sessionId, foreign: false }),
        );
  const rawTickets = boardTickets;
  const rawEvidence: Record<string, EvidenceRow[]> =
    merge !== null ? merge.evidence : (evidenceProjection as Record<string, EvidenceRow[]> | undefined) ?? {};
  const rawComments: Record<string, CommentRecord[]> =
    merge !== null ? merge.comments : (commentsProjection as Record<string, CommentRecord[]> | undefined) ?? {};
  const allTicketsCount = rawTickets.length;
  // Persist the filter under one workspace key. When the board shows tickets
  // from projects with different workspace keys, keep the first key but suffix
  // with sessionId so the shared "default" bucket does not poison across
  // sessions. M9 fix: mixed boards used to share a single "default" key.
  const rawWsSet = new Set(rawTickets.map((ticket) => ticket.workspaceKey));
  const workspaceKey =
    rawTickets.length === 0
      ? "default"
      : rawWsSet.size === 1
        ? rawTickets[0].workspaceKey
        : `default:${sessionId}`;


  const [applied, setAppliedStateLocal] = react.useState<AppliedState>(function () {
    return cloneAppliedState(DEFAULT_APPLIED);
  });
  const [selectedKey, setSelectedKey] = react.useState<string | null>(null);
  const [createOpen, setCreateOpen] = react.useState(false);
  const [errorTimedOut, setErrorTimedOut] = react.useState(false);
  const deepLinkHandled = react.useRef(false);
  const restoredRef = react.useRef(false);
  // Report the open count to the tab badge store.
  const count = openCount(rawTickets);
  react.useEffect(
    function () {
      if (!loaded) return;
      reportCount(sessionId, count);
    },
    [sessionId, loaded, count],
  );

  // A-LOG2: the projections flip from undefined to loaded once per mount.
  react.useEffect(
    function () {
      if (!loaded) return;
      logDebug("board loaded: " + allTicketsCount + " tickets");
    },
    [loaded],
  );

  // Restore the persisted filter once the real workspace key is known.
  react.useEffect(
    function () {
      if (!loaded) return;
      if (restoredRef.current) return;
      restoredRef.current = true;
      const restored = restoreFilter(workspaceKey, rawTickets);
      setAppliedStateLocal(restored);
      setAppliedState(sessionId, restored);
    },
    [loaded, workspaceKey],
  );

  // The deep link. Run once per mount, once the projection has loaded.
  react.useEffect(
    function () {
      if (!loaded) return;
      if (deepLinkHandled.current) return;
      deepLinkHandled.current = true;
      const id = ticketIdFromSearch(window.location.search);
      if (id === null) return;
      const exists = rawTickets.some((ticket) => ticket.id === id);
      if (exists) {
        setSelectedKey(String(id));
      } else {
        showToast("Ticket " + id + " not found", "info");
      }
    },
    [loaded],
  );

  // Strip a leftover ticket param on unmount so it cannot leak to the next
  // session or tab.
  react.useEffect(function () {
    return function () {
      if (new URL(window.location.href).searchParams.has("ticket")) setTicketParam(null);
    };
  }, []);

  // The load error. When the projection stays undefined for five seconds,
  // show the error and offer a retry that re-subscribes the projection.
  react.useEffect(
    function () {
      if (loaded) {
        setErrorTimedOut(false);
        return;
      }
      const timer = window.setTimeout(function () {
        setErrorTimedOut(true);
      }, 5000);
      return function () {
        window.clearTimeout(timer);
      };
    },
    [loaded],
  );

  const error =
    errorTimedOut && !loaded ? (
      <div className="aidos-error">
        <span>The board projection is unavailable. Retry to re-read it.</span>
        <button className="aidos-btn" onClick={props.onRetry}>
          Retry
        </button>
      </div>
    ) : null;

  const filtered = filterTickets(rawTickets, applied);

  function applyState(state: AppliedState) {
    const next = cloneAppliedState(state);
    setAppliedStateLocal(next);
    setAppliedState(sessionId, next);
    try {
      window.localStorage.setItem(filterStorageKey(workspaceKey), JSON.stringify(next));
    } catch {
      // Storage can be full or blocked. The in-memory store still holds it.
    }
  }

  function clearFilters() {
    applyState(cloneAppliedState(DEFAULT_APPLIED));
  }

  function selectTicket(key: string) {
    if (selectedKey === key) {
      closeDetail();
      return;
    }
    setSelectedKey(key);
    const numeric = Number(key);
    setTicketParam(Number.isInteger(numeric) ? numeric : null);
  }

  function closeDetail() {
    setSelectedKey(null);
    setTicketParam(null);
  }

  const selectedTicket =
    selectedKey === null
      ? null
      : rawTickets.find(
            (ticket) =>
              (ticket.foreign ? ticket.sourceSessionId + ":" + ticket.id : String(ticket.id)) ===
              selectedKey,
          ) ?? null;

  const selectedBoardKey = selectedTicket
    ? selectedTicket.foreign
      ? selectedTicket.sourceSessionId + ":" + selectedTicket.id
      : String(selectedTicket.id)
    : null;

  const selectedEvidence: EvidenceRow[] =
    selectedBoardKey === null ? [] : rawEvidence[selectedBoardKey] ?? [];

  const selectedComments: CommentRecord[] =
    selectedBoardKey === null ? [] : rawComments[selectedBoardKey] ?? [];

  const [evidenceCollapsed, setEvidenceCollapsed] = react.useState(function () {
    return evidenceIsMany(selectedEvidence);
  });
  // Re-evaluate collapsed state when selected ticket changes so one ticket's state does not leak.
  react.useEffect(function () {
    setEvidenceCollapsed(evidenceIsMany(selectedEvidence));
  }, [selectedTicket?.id]);


  const detailPanel =
    selectedTicket === null ? null : (
      <DetailView
        key={selectedBoardKey}
        ticket={selectedTicket}
        evidence={selectedEvidence}
        comments={selectedComments}
        evidenceCollapsed={evidenceCollapsed}
        onToggleEvidence={() => {
          setEvidenceCollapsed((v) => !v);
        }}
        onClose={closeDetail}
        agentId={sessionId}
        ticketIdKey={selectedBoardKey ?? String(selectedTicket.id)}
        onFieldSaved={function () {
          // The projection frame re-renders the new value automatically.
        }}
      />
    );
  const createModal = (
    <CreateTicketModal
      open={createOpen}
      onClose={() => {
        setCreateOpen(false);
      }}
      onCreated={(id) => {
        selectTicket(String(id));
      }}
      agentId={sessionId}
    />
  );

  let body;
  if (error !== null) {
    body = error;
  } else if (!loaded) {
    body = (
      <div className="aidos-skeleton-grid">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div className="aidos-skeleton-tile" key={index} />
        ))}
      </div>
    );
  } else {
    body = (
      <TicketView
        sessionId={sessionId}
        tickets={filtered}
        allTicketsCount={allTicketsCount}
        applied={applied}
        selectedId={selectedKey}
        activeTicketId={activeTicketId(rawTickets) === null ? null : String(activeTicketId(rawTickets))}
        evidenceByTicket={rawEvidence}
        onSelect={selectTicket}
        onApply={applyState}
        onJump={selectTicket}
        onClearFilters={clearFilters}
        onCreate={() => {
          setCreateOpen(true);
        }}
      />
    );
  }

  return (
    <>
      <div className="aidos-layout">
        {body}
        {detailPanel}
      </div>
      {createModal}
      {/* The toast container is a sibling of the layout, not a child, so it
          persists across the slot-mutation remount. The single-string toast
          state and its timer are gone; the module-level toast store owns
          every toast now. */}
      <ToastContainer />
    </>
  );
}
