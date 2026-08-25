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
import { showToast } from "./toast-store";
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
      : [];
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
  const rawTickets: TicketViewType[] =
    ticketsProjection === undefined
      ? []
      : Object.values(ticketsProjection as Record<string, TicketViewType>);
  const rawEvidence: Record<string, EvidenceRow[]> =
    evidenceProjection === undefined
      ? {}
      : (evidenceProjection as Record<string, EvidenceRow[]>);
  const rawComments: Record<string, CommentRecord[]> =
    commentsProjection === undefined
      ? {}
      : (commentsProjection as Record<string, CommentRecord[]>);
  const allTicketsCount = rawTickets.length;
  const workspaceKey =
    rawTickets.length > 0 && typeof rawTickets[0].workspaceKey === "string"
      ? rawTickets[0].workspaceKey
      : "default";


  const [applied, setAppliedStateLocal] = react.useState<AppliedState>(function () {
    return cloneAppliedState(DEFAULT_APPLIED);
  });
  const [selectedId, setSelectedId] = react.useState<number | null>(null);
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
        setSelectedId(id);
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

  function selectTicket(id: number) {
    if (selectedId === id) {
      closeDetail();
      return;
    }
    setSelectedId(id);
    setTicketParam(id);
  }

  function closeDetail() {
    setSelectedId(null);
    setTicketParam(null);
  }

  const selectedTicket =
    selectedId === null ? null : rawTickets.find((ticket) => ticket.id === selectedId) ?? null;

  const selectedEvidence: EvidenceRow[] =
    selectedTicket === null ? [] : rawEvidence[String(selectedTicket.id)] ?? [];

  const selectedComments: CommentRecord[] =
    selectedTicket === null ? [] : rawComments[String(selectedTicket.id)] ?? [];

  const [evidenceCollapsed, setEvidenceCollapsed] = react.useState(function () {
    return evidenceIsMany(selectedEvidence);
  });


  const detailPanel =
    selectedTicket === null ? null : (
      <DetailView
        key={selectedTicket.id}
        ticket={selectedTicket}
        evidence={selectedEvidence}
        comments={selectedComments}
        evidenceCollapsed={evidenceCollapsed}
        onToggleEvidence={() => {
          setEvidenceCollapsed((v) => !v);
        }}
        onClose={closeDetail}
        agentId={sessionId}
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
        selectTicket(id);
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
        selectedId={selectedId}
        activeTicketId={activeTicketId(rawTickets)}
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
