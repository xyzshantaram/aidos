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
import { PlanMetaModal } from "./plan-meta-modal";
import { QueuePanel, queueEntriesFor } from "./queue-panel";
import { ModalShell } from "./ui";
import type { QueueEntry } from "./human-queue";
import type { RunOutcome } from "./approval-runner";
import { activeTicketId } from "./active-ticket";
import { logDebug } from "./log";
import { showToast } from "./toast-store";
import { callAidosRemote } from "./remote";
import { getMerge, getPulledVersion, isMergePulling, setMerge, setMergePulling, setPulledVersion } from "./view-state";
import type { WorkspaceMerge } from "./view-state";
import { ToastContainer } from "./toast";
import type { TicketView as TicketViewType } from "../kernel/projections";
import type { CommentRecord, EvidenceRow, PlanValue } from "../kernel/types";


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

/**
 * Mobile top-chrome clearance (#64).
 *
 * dsh-plugin-better-mobile-ui floats a fixed top bar over the whole frame,
 * and its real height depends on the device safe area, so every hardcoded
 * clearance we tried was either too small (toolbar clipped) or wasteful.
 * Measure the actual overlap instead and publish two custom properties on
 * the layout element:
 *
 *   --aidos-top-clearance : how far fixed chrome reaches PAST the board's own
 *                           top edge (0 on desktop, where nothing covers it).
 *   --aidos-top-chrome    : that chrome's bottom in VIEWPORT coordinates, for
 *                           the fixed mobile detail overlay, which is pinned
 *                           to the viewport rather than to the board box.
 */
function useTopChromeClearance(ref: { current: HTMLDivElement | null }): void {
  react.useEffect(function () {
    const node = ref.current;
    if (node === null || typeof window === "undefined") return;
    let frame = 0;
    const timers: number[] = [];

    const measure = (): void => {
      frame = 0;
      const box = node.getBoundingClientRect();
      let chromeBottom = 0;
      const consider = (element: Element): void => {
        const rect = element.getBoundingClientRect();
        if (rect.height === 0 || rect.bottom <= 0) return;
        // Only chrome that sits at the top and actually covers our top edge.
        if (rect.top > box.top + 4) return;
        if (rect.bottom > chromeBottom) chromeBottom = rect.bottom;
      };
      // 1. The known mobile-plugin bar, INCLUDING children: its buttons can
      //    paint below the 48px bar box, which is what a hardcoded 48px
      //    clearance kept missing.
      document.querySelectorAll<HTMLElement>(".bmu-topbar, [data-bmu-topbar]").forEach(function (bar) {
        consider(bar);
        for (const child of Array.from(bar.children)) consider(child);
      });
      // 2. Anything else painting over our top edge: probe the stack at the
      //    edge and count every fixed/sticky element above us. This keeps the
      //    clearance honest if the shell's chrome changes or the plugin is
      //    absent. The probe reads the border-box top, which our own padding
      //    never moves, so there is no feedback loop.
      if (box.width > 0 && typeof document.elementsFromPoint === "function") {
        const stack = document.elementsFromPoint(box.left + box.width / 2, box.top + 2);
        for (const element of stack) {
          if (element === node || node.contains(element)) break;
          const position = window.getComputedStyle(element).position;
          if (position === "fixed" || position === "sticky") consider(element);
        }
      }
      const overlap = Math.max(0, Math.round(chromeBottom - box.top));
      node.style.setProperty("--aidos-top-clearance", `${overlap}px`);
      node.style.setProperty("--aidos-top-chrome", `${Math.max(0, Math.round(chromeBottom))}px`);
    };

    const schedule = (): void => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    // The bar can mount (or re-lay-out for the safe area) after we do; a few
    // bounded re-measures beat a forever interval.
    for (const delay of [120, 600, 1600]) {
      timers.push(window.setTimeout(schedule, delay));
    }
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    const viewport = window.visualViewport;
    if (viewport) viewport.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(node);

    return function () {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      for (const timer of timers) window.clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (viewport) viewport.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [ref]);
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
  const planProjection = props.useProjection("aidos.plan");
  const loaded =
    ticketsProjection !== undefined &&
    evidenceProjection !== undefined &&
    commentsProjection !== undefined;

  // The own project id and its stored plan. The projection covers the own
  // session only, so the first own ticket names the project. A board with
  // no tickets has no plan to show, and the modal carries the no-plan note.
  const ownProjectId =
    Object.values(ticketsProjection as Record<string, TicketViewType> | undefined ?? {})[0]?.projectId ?? null;
  const ownPlan: PlanValue | null =
    ownProjectId === null
      ? null
      : ((planProjection as Record<string, PlanValue> | undefined) ?? {})[String(ownProjectId)] ?? null;

  // The workspace merge. The projection covers the own session only; the
  // workspaceTickets Remote adds every sibling session of the same
  // workspace (live and closed). The merge lives in the module-level
  // view-state store: the badge re-register remounts this component, and
  // component state would drop the merge on every remount (the badge then
  // flips 20 -> 0 -> 20 forever and the board renders empty).
  const [merge, setMergeState] = react.useState(() => getMerge(sessionId));
  const [mergePending, setMergePending] = react.useState(() => isMergePulling(sessionId) && getMerge(sessionId) === null);
  const ownVersion = ticketsProjection === undefined
    ? null
    : JSON.stringify(ticketsProjection).length + ":" + Object.keys(ticketsProjection as Record<string, unknown>).length;
  react.useEffect(function () {
    if (!loaded || ownVersion === null) return;
    // Skip the pull when this exact own-board version already landed: a
    // badge remount re-runs the effect with unchanged inputs.
    if (getPulledVersion(sessionId) === ownVersion) return;
    setMergePending(getMerge(sessionId) === null);
    let cancelled = false;
    const pull = async function () {
      try {
        const result = await callAidosRemote("workspaceTickets", {}, sessionId);
        // Write the module cache even when this mount was torn down
        // mid-pull: the remount skips re-pulling for the same version, so
        // the cache write is what delivers the merge across the remount.
        setMerge(sessionId, result as unknown as WorkspaceMerge);
        setMergePulling(sessionId, false);
        setPulledVersion(sessionId, ownVersion);
        if (cancelled) return;
        setMergeState(result as unknown as WorkspaceMerge);
        setMergePending(false);
        // A signal that arrived mid-pull was folded into ownVersion; the
        // effect reruns and pulls the fresher merge. The stale marker no
        // longer drops anything (#46/#48).
      } catch {
        setMergePulling(sessionId, false);
        if (cancelled) return;
        setMergePending(false);
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
  // Own rows always render from the live projection (goal-domain pattern):
  // the merge cache contributes foreign rows only, so own-session writes
  // show instantly and a stale merge can never shadow them (#46/#48).
  const ownRows: Array<TicketViewType & { sourceSessionId?: string; foreign?: boolean }> =
    Object.values(ticketsProjection as Record<string, TicketViewType> | undefined ?? {}).map(
      (row) => ({ ...row, sourceSessionId: sessionId, foreign: false }),
    );
  const foreignRows =
    merge !== null
      ? merge.tickets.filter((row) => row.sourceSessionId !== sessionId)
      : [];
  const boardTickets: Array<TicketViewType & { sourceSessionId?: string; foreign?: boolean }> = [
    ...ownRows,
    ...foreignRows,
  ];
  const rawTickets = boardTickets;
  const ownEvidence = (evidenceProjection as Record<string, EvidenceRow[]> | undefined) ?? {};
  const ownComments = (commentsProjection as Record<string, CommentRecord[]> | undefined) ?? {};
  const foreignEvidence: Record<string, EvidenceRow[]> = {};
  const foreignComments: Record<string, CommentRecord[]> = {};
  if (merge !== null) {
    for (const [key, value] of Object.entries(merge.evidence)) {
      if (!key.startsWith(sessionId + ":")) foreignEvidence[key] = value;
    }
    for (const [key, value] of Object.entries(merge.comments)) {
      if (!key.startsWith(sessionId + ":")) foreignComments[key] = value;
    }
  }
  const rawEvidence: Record<string, EvidenceRow[]> = { ...foreignEvidence, ...ownEvidence };
  const rawComments: Record<string, CommentRecord[]> = { ...foreignComments, ...ownComments };
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
  const [planOpen, setPlanOpen] = react.useState(false);
  const [queueOpen, setQueueOpen] = react.useState(false);
  const [errorTimedOut, setErrorTimedOut] = react.useState(false);
  const deepLinkHandled = react.useRef(false);
  const restoredRef = react.useRef(false);
  const layoutRef = react.useRef<HTMLDivElement | null>(null);
  useTopChromeClearance(layoutRef);

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


  // Dependency cards (#board-feedback): every known ticket keyed by plain id
  // and by workspaceKey:id so a ref resolves to a card with title + state.
  const ticketsByKey = new Map<string, TicketViewType>();
  for (const view of rawTickets) {
    ticketsByKey.set(String(view.id), view);
    ticketsByKey.set(view.workspaceKey + ":" + String(view.id), view);
  }

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
        ticketsByKey={ticketsByKey}
        onJump={selectTicket}
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

  const mergeLoading = mergePending && rawTickets.length === 0;
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
  } else if (mergeLoading) {
    body = (
      <div className="aidos-merge-loading" role="status">
        <span className="aidos-merge-spinner" aria-hidden="true" />
        <span>Loading workspace tickets…</span>
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
        onPlan={() => {
          setPlanOpen(true);
        }}
        onCreate={() => {
          setCreateOpen(true);
        }}
        onQueue={() => {
          setQueueOpen(true);
        }}
        queueCount={queueEntriesFor(rawTickets, rawEvidence).length}
      />
    );
  }

  /**
   * #93: the queue's actions go through the SAME remotes the detail panel
   * uses — signoff attaches the row then moves, verify attaches only, and
   * mark-done moves. One write path, so the queue can never drift from what
   * the buttons on a ticket do.
   */
  async function performQueueAction(
    entry: QueueEntry,
    outcome: RunOutcome,
  ): Promise<void> {
    if (outcome.status === "rejected") return;
    const first = outcome.values[0];
    const note =
      first !== undefined && first.kind === "confirm" ? first.note.trim() : "";
    const criterion =
      first !== undefined && first.kind === "confirm" ? first.criterion : undefined;
    const payload: Record<string, unknown> = {};
    if (note !== "") payload.note = note;
    if (criterion !== undefined) payload.criteria = criterion;
    const ticketId = entry.ticket.id;
    try {
      if (entry.actionId === "signoff") {
        await callAidosRemote(
          "userAttachEvidence",
          { ticketId, kind: "builtin:user_signoff", payload },
          sessionId,
        );
        await callAidosRemote(
          "userMoveTicket",
          { ticketId, to: "in_progress" },
          sessionId,
        );
        showToast("Signed off", "success");
      } else if (entry.actionId === "verify") {
        await callAidosRemote(
          "userAttachEvidence",
          { ticketId, kind: "builtin:user_verified", payload },
          sessionId,
        );
        showToast("Verified", "success");
      } else if (entry.actionId === "mark-done") {
        await callAidosRemote("userMoveTicket", { ticketId, to: "done" }, sessionId);
        showToast("Marked done", "success");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "refusal");
      throw error;
    }
  }

  const queueModal = queueOpen ? (
    <ModalShell
      title="Waiting on you"
      onClose={() => {
        setQueueOpen(false);
      }}
    >
      <QueuePanel
        tickets={rawTickets}
        evidenceByTicket={rawEvidence}
        onOpen={(ticket) => {
          setQueueOpen(false);
          selectTicket(String(ticket.id));
        }}
        onAct={performQueueAction}
      />
    </ModalShell>
  ) : null;

  const planModal = (
    <PlanMetaModal
      open={planOpen}
      planMeta={
        ownPlan === null
          ? null
          : {
              frontmatter: ownPlan.frontmatter,
              preamble: ownPlan.context.preamble,
              contextSections: ownPlan.context.contextSections,
            }
      }
      agentId={sessionId}
      onClose={() => {
        setPlanOpen(false);
      }}
    />
  );
  // The conversation shell gives a view a definite-height box only when the
  // view asks for composer-overlay mode. The data attribute below is that
  // request. The shell then sets the view area to flex 1 1 0 with a zero
  // min-height and floats the composer over the bottom edge. The page never
  // scrolls, and each board pane scrolls on its own. The stylesheet keeps the
  // panes clear of the floating composer through --dsh-composer-height, which
  // the shell publishes.

  return (
    <>
      <div className="aidos-layout" ref={layoutRef} data-conversation-composer-overlay="">
        {body}
        {detailPanel}
      </div>
      {createModal}
      {planModal}
      {queueModal}
      {/* The toast container is a sibling of the layout, not a child, so it
          persists across the slot-mutation remount. The single-string toast
          state and its timer are gone; the module-level toast store owns
          every toast now. */}
      <ToastContainer />
    </>
  );
}
