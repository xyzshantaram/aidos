/**
 * The session-scoped board wrapper. Reads the aidos.tickets projection,
 * reports the open count for the tab badge, restores and persists the applied
 * filter, and owns the deep-link, detail, create, loading, and error states.
 *
 * LocalTicketView owns the retry nonce. ProjectionReader holds the whole body
 * and remounts on retry, which re-subscribes the projection.
 */

import react from "react";

import { filterTickets, openCount } from "./board-logic";
import type { SortKey } from "./board-logic";
import type { AppliedState } from "./view-state";
import {
  DEFAULT_APPLIED,
  cloneAppliedState,
  reportCount,
  setAppliedState,
} from "./view-state";
import { TicketView } from "./ticket-view";
import type { TicketView as TicketViewType } from "../kernel/projections";

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
          (state) =>
            state === "open" ||
            state === "in_progress" ||
            state === "awaiting_verification" ||
            state === "done",
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

export function LocalTicketView(props: LocalTicketViewProps) {
  const [retryNonce, setRetryNonce] = react.useState(0);
  return react.createElement(ProjectionReader, {
    key: retryNonce,
    sessionId: props.sessionId,
    useProjection: props.useProjection,
    onRetry: function () {
      setRetryNonce(function (n) {
        return n + 1;
      });
    },
  });
}

function ProjectionReader(props: ProjectionReaderProps) {
  const sessionId = props.sessionId;

  const projection = props.useProjection("aidos.tickets");
  const loaded = projection !== undefined;
  const rawTickets: TicketViewType[] =
    projection === undefined
      ? []
      : Object.values(projection as Record<string, TicketViewType>);
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
  const [toast, setToast] = react.useState<string | null>(null);
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
        setToast("Ticket " + id + " not found");
      }
    },
    [loaded],
  );

  // Strip a leftover ticket param on unmount so it cannot leak to the next
  // session or tab.
  react.useEffect(function () {
    return function () {
      const url = new URL(window.location.href);
      if (url.searchParams.has("ticket")) {
        url.searchParams.delete("ticket");
        window.history.replaceState({}, "", url);
      }
    };
  }, []);

  // Auto-dismiss the toast after three seconds.
  react.useEffect(
    function () {
      if (toast === null) return;
      const timer = window.setTimeout(function () {
        setToast(null);
      }, 3000);
      return function () {
        window.clearTimeout(timer);
      };
    },
    [toast],
  );

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
    errorTimedOut && !loaded
      ? react.createElement(
          "div",
          { className: "aidos-error" },
          react.createElement(
            "span",
            null,
            "The board projection is unavailable. Retry to re-read it.",
          ),
          react.createElement(
            "button",
            {
              className: "aidos-btn",
              onClick: props.onRetry,
            },
            "Retry",
          ),
        )
      : null;

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
    const url = new URL(window.location.href);
    url.searchParams.set("ticket", String(id));
    window.history.pushState({}, "", url);
  }

  function closeDetail() {
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("ticket");
    window.history.replaceState({}, "", url);
  }

  const selectedTicket =
    selectedId === null ? null : rawTickets.find((ticket) => ticket.id === selectedId) ?? null;

  const detailPanel =
    selectedTicket === null
      ? null
      : react.createElement(
          "div",
          { className: "aidos-detail" },
          react.createElement(
            "div",
            { className: "aidos-detail-head" },
            react.createElement("h3", { className: "aidos-detail-title" }, selectedTicket.title),
            react.createElement(
              "button",
              { className: "aidos-detail-close", onClick: closeDetail },
              "\u00d7",
            ),
          ),
          react.createElement(
            "p",
            { className: "aidos-detail-body" },
            "The full detail view arrives in a later update. This panel is a placeholder for ticket " +
              selectedTicket.id +
              ".",
          ),
        );

  const createModal = createOpen
    ? react.createElement(
        "div",
        { className: "aidos-modal-mask", onClick: function () { setCreateOpen(false); } },
        react.createElement(
          "div",
          {
            className: "aidos-modal",
            onClick: function (event: react.MouseEvent<HTMLDivElement>) {
              event.stopPropagation();
            },
          },
          react.createElement(
            "div",
            { className: "aidos-modal-head" },
            react.createElement("h3", { className: "aidos-modal-title" }, "Create a ticket"),
            react.createElement(
              "button",
              { className: "aidos-modal-close", onClick: function () { setCreateOpen(false); } },
              "\u00d7",
            ),
          ),
          react.createElement(
            "p",
            { className: "aidos-modal-body" },
            "The create form arrives in a later update. This modal is a stub.",
          ),
        ),
      )
    : null;

  const toastEl =
    toast === null
      ? null
      : react.createElement("div", { className: "aidos-toast" }, toast);

  let body;
  if (error !== null) {
    body = error;
  } else if (!loaded) {
    body = react.createElement(
      "div",
      { className: "aidos-skeleton-grid" },
      [0, 1, 2, 3, 4, 5].map(function (index) {
        return react.createElement("div", {
          className: "aidos-skeleton-tile",
          key: index,
        });
      }),
    );
  } else {
    body = react.createElement(TicketView, {
      sessionId: sessionId,
      tickets: filtered,
      allTicketsCount: allTicketsCount,
      applied: applied,
      selectedId: selectedId,
      onSelect: selectTicket,
      onApply: applyState,
      onJump: selectTicket,
      onClearFilters: clearFilters,
      onCreate: function () {
        setCreateOpen(true);
      },
    });
  }

  return react.createElement(
    react.Fragment,
    null,
    react.createElement(
      "div",
      { className: "aidos-layout" },
      body,
      detailPanel,
    ),
    createModal,
    toastEl,
  );
}
