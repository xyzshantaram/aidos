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
  hideRetiredTickets,
} from "./board-logic";
import type { SortKey } from "./board-logic";


import type { AppliedState } from "./view-state";
import {
  DEFAULT_APPLIED,
  cloneAppliedState,
  reportCount,
  setTicketParam,
  setAppliedState,
} from "./view-state";
import { TicketView } from "./ticket-view";
import { DetailView } from "./detail-panel";
import { CreateTicketModal } from "./create-ticket-modal";
import { PlanMetaModal } from "./plan-meta-modal";
import { QueuePanel, queueEntriesFor } from "./queue-panel";
import { RetiredPanel } from "./retired-panel";
import { TagsModal } from "./tags-modal";
import {
  boardKeyOf,
  rememberWorkspaceLabel,
  resolveDeepLinkRow,
  resolveSelection,
} from "./board-logic";
import { ModalShell } from "./ui";
import { agentAskCount, queuePollMs } from "./human-queue";
import type { ModalKey } from "./view-state";
import type { Nomination, PendingApprovalLike, QueueEntry } from "./human-queue";
import { asBoardKey, fullTicketId } from "./board-logic";
import type { BoardKey } from "./board-logic";
import type { RunOutcome } from "./approval-runner";
import { activeTicketRow } from "./active-ticket";
import { logDebug, logWarn } from "./log";
import { showToast } from "./toast-store";
import { resolveApprovalRequest } from "./approval-resolution";
import { callAidosRemote } from "./remote";
import { clearDetailModals, isModalOpen, setModalOpen, getHeldTicket, getMerge, getPulledVersion, getSelection, holdInput, isMergePulling, onSelectionChanged, publishTicketTitles, recordResolution, setMerge, setMergePulling, setPulledVersion, setRemountSuppressed, setSelection } from "./view-state";
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
// Exported for #138's follow-up tests: the tag filter has to survive the
// restore, and a pure function is the only honest way to pin that.
export function restoreFilter(
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
    // #138 follow-up: restore the tag filter too, validated as a string
    // array; absent (or malformed) stays absent, which matches "all tags".
    const tags =
      Array.isArray(parsed.tags) && parsed.tags.every((tag) => typeof tag === "string")
        ? [...parsed.tags]
        : undefined;
    return {
      projectIds,
      stateIds,
      sortKey,
      descending: typeof parsed.descending === "boolean" ? parsed.descending : true,
      search: typeof parsed.search === "string" ? parsed.search : "",
      tags,
    };
  } catch {
    return cloneAppliedState(DEFAULT_APPLIED);
  }
}

/**
 * Read the ticket REFERENCE from the query string.
 *
 * #100 round 4: a BOARD KEY, not a bare id. The param is now the only
 * channel that survives a page RELOAD -- the module store is in-memory and
 * dies with the page -- so it has to address a ticket the way everything
 * else does: `sourceSessionId:id` for a foreign row, the bare id for an own
 * one (kernel/board-key.ts). A bare number still parses, so links written
 * by the previous build keep working.
 */
function ticketRefFromSearch(search: string): string | null {
  const match = /[?&]ticket=([^&#]+)/.exec(search);
  if (match === null) return null;
  const raw = decodeURIComponent(match[1]);
  return raw === "" ? null : raw;
}

/** Write the ticket's board key into the query string. Null clears it. */
/*
 * The writer moved to view-state (#177 follow-up): a tool card opens tickets
 * too, and this is the channel that survives a reload, so both surfaces
 * share one implementation rather than agreeing by coincidence.
 */

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

  /*
   * #100 INSTRUMENTATION. `key={retryNonce}` REMOUNTS ProjectionReader when
   * the nonce changes -- destroying every useState and useRef inside it,
   * including `selectedKey` and the held-ticket ref. No amount of care in
   * the selection resolver survives that: the selection is simply gone.
   *
   * This is the leading suspect for the bug persisting after the resolver
   * was made to hold unconditionally. If a remount is what ejects the
   * reader, we will see "REMOUNT" in the log at the moment it happens.
   */
  react.useEffect(
    function () {
      if (retryNonce > 0) {
        logWarn(
          `#100 REMOUNT: retryNonce -> ${retryNonce}; ProjectionReader state (selection included) was destroyed`,
        );
      }
    },
    [retryNonce],
  );

  return (
    <ProjectionReader
      key={retryNonce}
      sessionId={props.sessionId}
      useProjection={props.useProjection}
      onRetry={() => {
        logWarn("#100 onRetry called -> forcing a remount");
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
        /*
         * #139: learn the real directory name of every workspace this merge
         * touched, BEFORE the rows render. The workspace key cannot be
         * inverted (a literal `-` in a directory name is indistinguishable
         * from a path separator once encoded), so a label guessed from the
         * key rendered `dotfiles-ai` as `ai`. The host sends the answer
         * because only it holds each session's cwd.
         */
        const labels = (result as unknown as { workspaceLabels?: Record<string, string> })
          .workspaceLabels;
        if (labels !== undefined) {
          for (const [key, label] of Object.entries(labels)) {
            rememberWorkspaceLabel(key, label);
          }
        }
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
  /*
   * #21: the viewing session's OWN workspace, taken from its own rows --
   * which are in the own workspace by definition. Deliberately NOT the
   * `workspaceKey` computed below for filter storage: that one degrades to
   * `default:<sessionId>` on a mixed board, which is fine as a storage
   * bucket and useless as an identity. Undefined when the session has no
   * rows yet, and the id chips then stay fully qualified.
   */
  const ownWorkspaceKey = ownRows.length > 0 ? ownRows[0].workspaceKey : undefined;
  const boardTickets: Array<TicketViewType & { sourceSessionId?: string; foreign?: boolean }> = [
    ...ownRows,
    ...foreignRows,
  ];
  const rawTickets = boardTickets;
  /*
   * #73: publish id -> title so a TOOL CARD can name the ticket it acted on.
   *
   * A tool call carries only an id -- attach_evidence names `ticketId` in
   * both its arguments and its result, and neither carries a title. The
   * board knows, and a card renders outside this tree, so the board pushes
   * what it knows into the module store the card can read.
   *
   * During render on purpose: it is an idempotent write to a plain Map with
   * no React state involved, and an effect would leave the first card render
   * after a board load showing bare ids for one frame.
   *
   * EACH ROW IS PUBLISHED UNDER THE SESSION THAT OWNS IT, not under this
   * one. `rawTickets` is `[...ownRows, ...foreignRows]`: own rows are
   * stamped `sourceSessionId: sessionId` above, and foreign rows arrive
   * from `workspaceTickets` carrying their owner's id. Publishing the whole
   * array under the RENDERING session -- which round 1 of this fix did --
   * let a sibling session's #39 overwrite this session's #39, because the
   * foreign rows are appended last. The contamination did not go away, it
   * moved from cross-workspace to cross-session (independent review,
   * 2026-09-05). `sessionId` remains only as the fallback for a row that
   * carries no owner.
   */
  publishTicketTitles(sessionId, rawTickets);
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
  /*
   * #108: THE one hiding point for the merged board. Every surface below —
   * the grid, the filter counts, the tab badge, the active-ticket marker,
   * the human queue — reads `liveTickets`; `rawTickets` stays the full merge
   * for the things a retired ticket must still answer: the detail panel's
   * held row, the deep-link resolver, the dependency cards, and the title
   * index the tool cards read.
   */
  const liveTickets = hideRetiredTickets(rawTickets, rawEvidence);
  const retiredCount = rawTickets.length - liveTickets.length;
  const allTicketsCount = liveTickets.length;
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
  /*
   * #100 ROOT-CAUSE FIX. The selection is seeded from the module-level store
   * and mirrored back to it on every change, so it SURVIVES A REMOUNT.
   *
   * A badge-count change disposes and re-registers the Tickets slot entry,
   * and a slot re-registration unmounts and remounts this whole tree --
   * taking every useState and useRef with it. The count changes on any board
   * write anywhere in the workspace, which is why being ejected felt random:
   * the trigger was never the reader's own action.
   *
   * Two earlier fixes hardened the selection RESOLVER, which was correct
   * both times and irrelevant both times: a pure function cannot preserve
   * state that no longer exists. This keeps the state somewhere the remount
   * cannot reach.
   */
  const [selectedKeyRaw, setSelectedKeyRaw] = react.useState<BoardKey | null>(function () {
    const stored = getSelection(sessionId);
    // asBoardKey is the deliberate escape hatch: what went INTO the store was
    // already a BoardKey, so this is a round trip through string storage
    // rather than a key constructed from an id.
    return stored === null ? null : asBoardKey(stored);
  });
  const selectedKey = selectedKeyRaw;
  const setSelectedKey = react.useCallback(
    function (next: BoardKey | null) {
      /*
       * #100 round 3: the READER changing what is open is the one event that
       * may forget that ticket's dialogs, and this is the only place it
       * happens -- `selectTicket` and `closeDetail` both come through here.
       *
       * It cannot be done from DetailView's unmount cleanup, which is the
       * obvious-looking spot: a remount and a close are the SAME event to a
       * component, so clearing there would wipe the dialogs on exactly the
       * refresh they are stored to survive. That is the mistake the review
       * caught in the third fix's held identity, in the same shape.
       *
       * The ticket being left is the last one RESOLVED, which the held-row
       * store already knows -- including when it is currently held-absent,
       * where the board itself can no longer answer.
       */
      const leaving = getHeldTicket<TicketViewType>(sessionId);
      if (leaving !== null) clearDetailModals(sessionId, fullTicketId(leaving));
      setSelection(sessionId, next);
      setSelectedKeyRaw(next);
    },
    [sessionId],
  );
  /*
   * #73 click-through: adopt a selection written from OUTSIDE this tree.
   *
   * A tool card in the transcript calls setSelection, and the board is
   * already mounted -- so reading the store on mount, which is all #100
   * needed, never saw it. User-reported: "clickthrough does not work".
   *
   * My own note in aidos-rows.tsx claimed the board "opens there when you
   * switch tabs", and that was wrong on its own terms: switching tabs does
   * not remount the view either. The store notifies now, and this adopts the
   * change for THIS session only.
   */
  react.useEffect(
    function () {
      return onSelectionChanged(function (changed: string) {
        if (changed !== sessionId) return;
        const stored = getSelection(sessionId);
        setSelectedKeyRaw(stored === null ? null : asBoardKey(stored));
      });
    },
    [sessionId],
  );
  /*
   * #100 round 2: the modal flags are BACKED BY THE MODULE STORE.
   *
   * They were plain useState, so any remount reset them to false and the
   * modal the human was working in vanished — reported twice, most recently
   * as "board still unmounts if it updates while the queue is open". The
   * remount suppression only ever covered the paths it was wired into, and
   * index.ts's visibility effect reconciles straight from the sessions-store
   * subscription without consulting it. A fourth guard would be one more
   * band-aid on a list that keeps growing.
   *
   * This is the move #100 already made for `selectedKey`: state that must
   * outlive a remount does not live in React. The useState below is only a
   * render trigger; the STORE is the truth, and it is what a fresh mount
   * reads. Whatever remounts the tree, and for whatever reason, the modal
   * comes back open.
   */
  const useStoredModal = function (modal: ModalKey): [boolean, (open: boolean) => void] {
    const [value, setValue] = react.useState(() => isModalOpen(sessionId, modal));
    const set = function (open: boolean): void {
      // Store FIRST: if this render never completes -- which is exactly the
      // remount that started all this -- the store still carries the truth.
      setModalOpen(sessionId, modal, open);
      setValue(open);
    };
    return [value, set];
  };
  const [createOpen, setCreateOpen] = useStoredModal("create");
  const [planOpen, setPlanOpen] = useStoredModal("plan");
  const [queueOpen, setQueueOpen] = useStoredModal("queue");
  const [retiredOpen, setRetiredOpen] = useStoredModal("retired");
  const [tagsOpen, setTagsOpen] = useStoredModal("tags");

  /*
   * User-reported 2026-09-05: "opening the queue makes the board vanish."
   *
   * These three modals are plain useState, unlike `selectedKey` (#100),
   * which was moved to the module store precisely because it had to survive
   * a badge-triggered remount. A remount resets useState to its initial
   * value, so one landing while the queue (or create/plan) is open silently
   * flips it back to closed -- not a stale board, an actually-closed modal.
   * Opening the queue did not CAUSE the remount; some unrelated board write
   * elsewhere changed the open-ticket count at an unlucky moment, and #100's
   * existing guard only skips a remount when the LABEL TEXT is unchanged --
   * a genuine count change still fires it.
   *
   * Deferring the remount itself while any of these holds this tree open
   * fixes the actual defect without giving each flag its own persisted
   * slot (more state to keep in sync, the same bug for the next modal).
   * The count is never stale for a WRITE, only for the visible badge text,
   * and only until the last one of these closes.
   */
  react.useEffect(
    function () {
      const open = queueOpen || createOpen || planOpen || retiredOpen || tagsOpen;
      setRemountSuppressed(open);
      return function () {
        // Release on unmount for a REAL reason (session switch), so a stale
        // suppression cannot wedge a future mount's badge shut.
        setRemountSuppressed(false);
      };
    },
    [queueOpen, createOpen, planOpen, retiredOpen, tagsOpen],
  );
  /*
   * #93: nominations are fetched when the queue OPENS, not polled. They only
   * annotate entries the derived queue already produced, so they can never
   * change the badge count — which means there is nothing to keep live while
   * the queue is shut.
   */
  const [nominations, setNominations] = react.useState<Nomination[]>([]);
  const [approvals, setApprovals] = react.useState<PendingApprovalLike[]>([]);

  /*
   * #21: which tiles carry the pending-approval flag.
   *
   * A pending approval names a ticket by NUMERIC ID and always belongs to
   * THIS session -- requestAllowlist validates against the calling session's
   * own state -- so the row it refers to is an own row, whose board key is
   * String(id). That candidate key is VALIDATED against the real keys of the
   * real rows rather than trusted: a mis-constructed key can then only fail
   * to match, never flag the wrong tile. Constructing a key by hand and
   * trusting it is how the same bug happened twelve times.
   *
   * NOT memoised (#21 review round 2, finding 1). It was, on [approvals,
   * ownRows] -- and `ownRows` is rebuilt by Object.values(...).map(...) on
   * every render, so its identity always changed and the memo re-ran every
   * time anyway. It bought nothing and hid that fact behind a useMemo that
   * looked like an optimisation. Two set builds over a handful of approvals
   * is not worth memoising; the honest version is the plain one.
   */
  /*
   * Set<string>, not Set<BoardKey>: the candidate below is an UNBRANDED
   * string built from a host-supplied number, and the brand refused to let
   * it be tested against branded keys -- correctly. Widening here is the
   * safe direction (a BoardKey is a string), and it keeps the check honest:
   * an unbranded candidate can only ever fail to match a real key.
   */
  const ownBoardKeys = new Set<string>(ownRows.map((row) => boardKeyOf(row)));
  const awaitingApprovalKeys = new Set(
    approvals
      .map((approval) => String(approval.ticketId))
      .filter((key) => ownBoardKeys.has(key)),
  );

  /*
   * #93: the first cut swallowed both failures with `.catch(() => set([]))`,
   * so a broken fetch was INDISTINGUISHABLE from "nothing is waiting on you"
   * -- the worst possible failure mode for a queue whose entire job is
   * telling you what is waiting. A failure now says so.
   */
  const [queueError, setQueueError] = react.useState<string | null>(null);

  const refreshNominations = react.useCallback(
    function () {
      setQueueError(null);
      /*
       * INDEPENDENT fetches. A first attempt used Promise.all, which meant one
       * failing remote wiped BOTH lists -- turning a partial outage into a
       * total one. Each reports its own failure and neither can erase the
       * other's result.
       */
      void callAidosRemote("actionNominations", {}, sessionId)
        .then((rows) => {
          setNominations((rows as unknown as Nomination[]) ?? []);
        })
        .catch((error: unknown) => {
          /*
           * #131 review: the LAST GOOD list is kept rather than cleared.
           *
           * Clearing made a failed fetch indistinguishable from "nothing is
           * waiting on you" -- the #93 header calls that the worst possible
           * failure mode for this surface, and then the toolbar indicator
           * gave it teeth: a transient failure silently extinguished a lit
           * button, so the human was told "nothing to do" by an outage.
           * Stale-but-lit plus a visible error beats confidently dark.
           */
          const detail =
            "nominations: " +
            (error instanceof Error ? error.message : String(error));
          // APPEND: both fetches wrote this slot, so two simultaneous
          // failures showed as one and the first was invisible -- which is
          // exactly how the _args bug hid on the nominations side.
          setQueueError((prev) => (prev == null ? detail : prev + "; " + detail));
        });
      void callAidosRemote("pendingApprovals", {}, sessionId)
        .then((rows) => {
          setApprovals((rows as unknown as PendingApprovalLike[]) ?? []);
        })
        .catch((error: unknown) => {
          // Same rule as the nominations fetch above: an outage must not
          // masquerade as an empty queue, and these entries now feed the
          // toolbar indicator too.
          const detail =
            "approvals: " +
            (error instanceof Error ? error.message : String(error));
          setQueueError((prev) => (prev == null ? detail : prev + "; " + detail));
        });
    },
    [sessionId],
  );

  /*
   * Keep the queue live WHILE IT IS OPEN. The first cut fetched only on open,
   * reasoning that nominations cannot change the badge count -- true, but it
   * means an agent nominating something while the queue is already open is
   * invisible, and the human sees a stale list with no hint that it is stale.
   *
   * #131 RETIRED that reasoning. Nominations now DO change what the toolbar
   * shows, so "nothing to keep live while the queue is shut" became the bug:
   * the user asked for an indicator precisely because a new nomination was
   * invisible until the queue was opened, and an indicator fed by a list
   * that is only fetched on open would light up only after you had already
   * looked. So the fetch runs on mount and keeps running while closed --
   * slowly, because a closed queue needs freshness measured in glances, not
   * in seconds, and this is a poll against a remote rather than a push.
   */
  react.useEffect(
    function () {
      refreshNominations();
      // The cadence rule lives in queuePollMs so it can be tested; the
      // review's mutation (reinstating an open-only guard here) now fails.
      const timer = setInterval(refreshNominations, queuePollMs(queueOpen));
      return function () {
        clearInterval(timer);
      };
    },
    [queueOpen, refreshNominations],
  );
  const [errorTimedOut, setErrorTimedOut] = react.useState(false);
  const deepLinkHandled = react.useRef(false);
  const restoredRef = react.useRef(false);
  const layoutRef = react.useRef<HTMLDivElement | null>(null);
  useTopChromeClearance(layoutRef);

  // Report the open count to the tab badge store. Live rows only: a retired
  // ticket must not raise the badge (#108).
  const count = openCount(liveTickets);
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
      const ref = ticketRefFromSearch(window.location.search);
      if (ref === null) return;
      /*
       * Resolved against THIS board, by board key first.
       *
       * #100 round 4: this is what lets the param survive a session switch
       * safely, and it is why the unmount no longer strips it. A key names
       * exactly one ticket in one workspace, so carrying it into another
       * session resolves to nothing rather than to that session's row with
       * the same number -- which is the leak the old strip-on-unmount was
       * defending against, at the cost of destroying the only thing that
       * could restore the reader's ticket after a reload.
       *
       * The numeric fallback keeps older links working, and it is matched
       * against the ROW's own key so a foreign row still selects correctly.
       */
      const row = resolveDeepLinkRow(ref, rawTickets);
      if (row !== null) {
        setSelectedKey(boardKeyOf(row));
      } else {
        /*
         * Silent: a param naming another workspace's ticket is the NORMAL
         * case after a session switch now, not a mistake worth a toast on
         * every board open.
         */
        logDebug(`#100 deep link ${ref} does not resolve on this board`);
      }
    },
    [loaded],
  );

  /*
   * #100 ROUND 4: THE UNMOUNT NO LONGER STRIPS THE PARAM.
   *
   * Round 3's own comment called this a strong suspect and left it in
   * place, and the bug survived: ProjectionReader is keyed on retryNonce,
   * so ANY remount unmounted this component and the cleanup then wiped
   * `?ticket=N`. Within one page life the module store covered it. Across
   * a RELOAD it could not -- the store is in-memory and dies with the page,
   * so the state was destroyed AND the only thing that could rebuild it was
   * erased on the way out. That is the reported shape exactly: the view
   * "randomly refreshes" and you are on the grid.
   *
   * The strip existed to stop the param leaking into the next session. That
   * job now belongs to the param's CONTENT: it carries a board key, which
   * names one ticket in one workspace, and the deep link adopts it only if
   * it resolves on the board being read. A leak is therefore impossible
   * without the erasure that caused the bug.
   *
   * The selection is still ended by the USER alone -- closeDetail clears
   * both the store and the param, and nothing else does.
   */
  react.useEffect(function () {
    logDebug("#100 ProjectionReader MOUNTED");
    /*
     * The queue-disappearance report: "opening the Waiting-on-you queue
     * still makes the board disappear for a bit." Code audit found NO
     * remount trigger on that path, so this logs unconditionally (not
     * through the gated logDebug) to DISCRIMINATE the two hypotheses: an
     * UNMOUNT here means something re-registered the slot entry and the
     * flash is the skeleton of a remount; its ABSENCE means the board never
     * unmounts and the disappearance is paint/CSS, which the code audit
     * says nothing should cause.
     */
    // eslint-disable-next-line no-console
    console.info("[aidos] board MOUNT");
    return function () {
      const had = new URL(window.location.href).searchParams.has("ticket");
      logWarn(
        `#100 ProjectionReader UNMOUNTING; ticket param present=${had}` +
          (had ? " -> KEPT (round 4: it is what restores the selection after a reload)" : ""),
      );
      // eslint-disable-next-line no-console
      console.info("[aidos] board UNMOUNT <- if you see this when opening the queue, it is a remount");
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

  const filtered = filterTickets(liveTickets, applied);

  /*
   * #180: the distinct tags across the live board — the Tags button's count.
   * Derived from the same rows the board renders (which carry tags on their
   * TicketView), so the button cannot disagree with the modal's listing.
   */
  const tagsTotal = (function (): number {
    const seen = new Set<string>();
    for (const row of liveTickets) {
      for (const tag of row.tags ?? []) seen.add(tag);
    }
    return seen.size;
  })();

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

  function selectTicket(key: BoardKey) {
    if (selectedKey === key) {
      // #100 instrumentation: selecting the OPEN ticket toggles it shut. If
      // anything re-fires selection with the current key (a re-render that
      // re-invokes a handler, a duplicate click), this closes the panel and
      // looks exactly like being "booted out".
      logWarn(`#100 selectTicket(${key}) matched the open selection -> TOGGLING CLOSED`);
      closeDetail();
      return;
    }
    logDebug(`#100 selectTicket(${key})`);
    setSelectedKey(key);
    /*
     * The KEY, verbatim. It used to write the param only when the key
     * parsed as a number, so a FOREIGN ticket -- `sourceSessionId:id` --
     * got no param at all and could never be restored by a reload, on top
     * of #100's other half.
     */
    setTicketParam(key);
  }

  function closeDetail() {
    /*
     * #100 instrumentation: the ONLY path that clears the selection. The
     * resolver now holds unconditionally, so if the panel still closes,
     * either this ran or the component remounted. The stack tells us WHO
     * called it -- a close button, the toggle above, the mobile pane, or an
     * effect nobody remembered.
     */
    logWarn(
      "#100 closeDetail() called; stack: " +
        (new Error().stack ?? "unavailable").split("\n").slice(1, 5).join(" <- "),
    );
    setSelectedKey(null);
    setTicketParam(null);
  }

  /*
   * #93 re-review, finding 2: these two inlined their own board key and
   * DIVERGED from boardKeyOf -- no `sourceSessionId !== undefined` guard, so a
   * foreign row lacking that field produced "undefined:12" here while
   * boardKeyOf produced "12", and onOpen feeding entry.boardKey into this
   * lookup would silently open nothing. One implementation, imported.
   */
  /*
   * #100: the detail panel used to be PURELY derived -- one missed lookup and
   * it unmounted, dropping the reader back to the grid mid-read. The merge
   * re-pulls after ANY board write, including someone else's, so this fired
   * on other people's actions and felt random.
   *
   * It also took every modal with it: EvidenceViewer, AllowlistEditor,
   * SignoffDialog and MarkDoneModal all render INSIDE the detail panel, so a
   * refresh could vanish a dialog the user was typing into.
   *
   * Three-step resolution:
   *  1. the board key, as before;
   *  2. RE-ANCHOR on the durable identity when the key itself changed -- a
   *     row's board key flips when it goes foreign->own, but workspaceKey:slug
   *     does not. Deliberately NOT matched on the numeric id: that is the
   *     confusion behind eleven separate bugs in this file's history;
   *  3. otherwise keep showing the last resolved ticket WHILE A PULL IS IN
   *     FLIGHT, and close only once the board is settled and the ticket is
   *     genuinely gone.
   */
  const lastSelected = react.useRef<TicketViewType | null>(null);
  /*
   * #100 second attempt. No `boardSettling` argument: the merge pull clears
   * its in-flight flag BEFORE it triggers the re-render, so the flag is
   * already false on exactly the render that lands the new board -- which is
   * the render that used to eject the reader. Passing it was worse than
   * useless, because it made the hold look covered while it was not.
   *
   * #100 FOURTH fix, and the whole of the remount repair: the resolver's
   * `previous` comes from holdInput, which falls back to the module store
   * when THIS mount's ref is null. The third fix stored a durable identity
   * and re-derived the row from `rawTickets` here; the review failed it
   * because that re-derivation cannot produce a row that is absent from
   * `rawTickets`, which is the only case the hold exists for. The store
   * carries the row itself now, so a remount-wiped ref costs nothing.
   */
  const resolution = resolveSelection(
    rawTickets,
    selectedKey,
    holdInput(sessionId, lastSelected.current),
  );
  // Write-through. The RULES live in recordResolution (view-state) so they
  // are stated once and unit tested: notably, a miss NEVER clears the store
  // -- clearing on "gone" is what destroyed the durable state in the third
  // fix, at the exact moment it was needed.
  recordResolution(sessionId, resolution.reason, resolution.ticket);

  /*
   * #100 INSTRUMENTATION. Logs every render where a selection EXISTS, so the
   * transition that ejects the reader is visible rather than inferred.
   *
   * What each field tells us:
   *   reason     - resolved / reanchored / held / gone / none
   *   sel        - the board key currently selected
   *   rows       - how many rows the board has this render (0 = empty board)
   *   own/foreign- where those rows came from, since a merge re-pull drops
   *                foreign rows first
   *   ref        - whether the held ticket survived (a REMOUNT wipes it)
   *
   * "gone" with a non-null sel and a null ref is the fingerprint of a
   * REMOUNT: the selection key was restored from somewhere but the held
   * ticket was destroyed. "none" with rows > 0 means selectedKey itself was
   * cleared -- something called closeDetail.
   */
  const lastLogged = react.useRef<string>("");
  const shape =
    `${resolution.reason}|sel=${selectedKey ?? "-"}|rows=${rawTickets.length}` +
    `|own=${ownRows.length}|foreign=${foreignRows.length}` +
    `|ref=${lastSelected.current === null ? "null" : "held"}` +
    // #100 fourth fix: the store is the half that survives a remount, so the
    // log must show BOTH. "ref=null|store=held" is a post-remount render that
    // the hold now covers; "ref=null|store=null" is a genuinely fresh selection.
    `|store=${getHeldTicket(sessionId) === null ? "null" : "held"}`;
  if (shape !== lastLogged.current && (selectedKey !== null || lastSelected.current !== null)) {
    lastLogged.current = shape;
    const noisy = resolution.reason === "gone" || resolution.reason === "held";
    (noisy ? logWarn : logDebug)(`#100 select: ${shape}`);
  }

  // The ref is the only state this owns; every DECISION lives in the pure
  // resolver, so there is exactly one implementation of it (the duplicate
  // implementations in this file are what produced eleven wrong-ticket bugs).
  if (
    resolution.reason === "resolved" ||
    resolution.reason === "reanchored" ||
    resolution.reason === "held"
  ) {
    // "held" adopts the row too: after a remount the ref is null and the row
    // came from the store, so adopting it keeps THIS mount's ref warm rather
    // than reaching into the module store on every subsequent render.
    lastSelected.current = resolution.ticket;
  } else if (resolution.reason === "none" || resolution.reason === "gone") {
    lastSelected.current = null;
  }

  const reanchoredKey = resolution.reanchorKey;
  react.useEffect(
    function () {
      // The ticket is the same ticket; only its address moved.
      if (reanchoredKey !== null) setSelectedKey(reanchoredKey);
    },
    [reanchoredKey],
  );

  const selectedTicket = resolution.ticket;

  const selectedBoardKey =
    selectedTicket === null ? null : boardKeyOf(selectedTicket);

  /*
   * #93 third review, finding 2: this was String(activeTicketId(...)), a bare
   * id compared against boardKeyOf in ticket-view, so a FOREIGN active ticket
   * highlighted the wrong card (or none). Resolve the row, then key it.
   *
   * #108: live rows only — a retired in-progress ticket must not wear the
   * active marker while it is hidden.
   */
  const activeRow = activeTicketRow(liveTickets);
  const activeBoardKey = activeRow === null ? null : boardKeyOf(activeRow);

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
  /*
   * #93 fourth review, finding 2. This wrote `workspaceKey:id` as if it were
   * an address, but every session in a workspace shares the workspace key, so
   * that string COLLIDES across sessions -- and foreign rows were written
   * last, overwriting own rows. An `aidos#12` dependency card rendered the
   * foreign ticket's title and state.
   *
   * FIRST WRITE WINS, and rawTickets puts own rows first, so a legacy
   * dependency ref resolves to the OWN ticket -- the only board a plain ref
   * could have meant. The board key is written too, and is unambiguous.
   */
  const ticketsByKey = new Map<string, TicketViewType>();
  const remember = (key: string, view: TicketViewType) => {
    if (!ticketsByKey.has(key)) ticketsByKey.set(key, view);
  };
  for (const view of rawTickets) {
    remember(boardKeyOf(view), view);
    remember(String(view.id), view);
    remember(view.workspaceKey + ":" + String(view.id), view);
  }

  /*
   * #100: when the held ticket is absent from the current board, SAY SO
   * instead of closing. The reader keeps their place and their open modals,
   * and learns why the panel looks stale -- rather than being ejected and
   * left to guess, which is what the original bug felt like.
   */
  const absentNotice = resolution.absent ? (
    <div className="aidos-detail-absent" role="status">
      This ticket is not on the board right now. You are seeing the last
      version that loaded. Close the panel to return to the grid.
    </div>
  ) : null;

  /*
   * #100 ROUND 3: the panel is keyed on the DURABLE IDENTITY, not the board
   * key.
   *
   * The key used to be `selectedBoardKey`, which remounted DetailView
   * whenever the board key changed. (Spelled out rather than quoted as a JSX
   * attribute, because a test guards this file against that literal coming
   * back.)
   *
   * That never ejected the reader to the grid -- the resolver
   * re-anchors, so the same ticket kept rendering -- but React tears a
   * subtree down and rebuilds it when a key changes, so it DID destroy every
   * dialog open inside it: the evidence viewer, the allowlist editor,
   * signoff, mark-done. The comment that used to live here said precisely
   * that, and shipped it anyway.
   *
   * A row's board key flips foreign -> own, which is #100's own second
   * mechanism; `workspaceKey:slug` does not flip, and it still differs
   * between two DIFFERENT tickets, which is the only thing the key is for.
   * So the re-anchor stops remounting and opening another ticket still does.
   *
   * The instrumentation below now watches the key that actually drives the
   * remount, so a key churn and a panel close stay distinguishable in the log.
   */
  const panelKey = selectedTicket === null ? null : fullTicketId(selectedTicket);
  const lastPanelKey = react.useRef<string | null>(null);
  if (panelKey !== lastPanelKey.current) {
    if (lastPanelKey.current !== null && panelKey !== null) {
      logWarn(
        `#100 DetailView KEY CHANGED ${lastPanelKey.current} -> ${panelKey}; it remounts, and the dialog store is what carries the modals through`,
      );
    } else if (lastPanelKey.current !== null && panelKey === null) {
      logWarn(`#100 detail panel CLOSING (was ${lastPanelKey.current})`);
    }
    lastPanelKey.current = panelKey;
  }

  const detailPanel =
    selectedTicket === null ? null : (
      <>
        {absentNotice}
        <DetailView
        key={panelKey}
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
      </>
    );
  const createModal = (
    <CreateTicketModal
      open={createOpen}
      onClose={() => {
        setCreateOpen(false);
      }}
      onCreated={(id) => {
        // A ticket created HERE is always an own row, so its plain id is its
        // board key. One of the few honest uses of the escape hatch.
        selectTicket(asBoardKey(String(id)));
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
    /*
     * #131: composed ONCE and read twice. The toolbar needs the total and
     * the ask count, and computing them from two separate calls would let
     * the badge's number and its colour drift apart under a mid-render
     * change.
     *
     * #108: composed over the LIVE rows — a retired ticket is in no queue
     * and lights no badge.
     */
    const queueEntries = queueEntriesFor(liveTickets, rawEvidence, nominations, approvals);
    body = (
      <TicketView
        ownWorkspaceKey={ownWorkspaceKey}
        awaitingApprovalKeys={awaitingApprovalKeys}
        sessionId={sessionId}
        tickets={filtered}
        allTicketsCount={allTicketsCount}
        applied={applied}
        selectedId={selectedKey}
        activeTicketId={activeBoardKey}
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
          // No refresh call here: the poll effect re-runs the moment
          // queueOpen flips and fetches immediately, so this was a second
          // identical request on every open (#131 review, MINOR).
          setQueueOpen(true);
        }}
        onTags={() => {
          setTagsOpen(true);
        }}
        tagsTotal={tagsTotal}
        onRetired={() => {
          setRetiredOpen(true);
        }}
        retiredCount={retiredCount}
        /*
         * #131: the SAME composition the panel renders, counted. Passing the
         * nominations in is what makes the count mean "asks the gate allows"
         * -- humanQueue drops a nomination it cannot match, so an ask that
         * would open to nothing can never light the button. The approvals
         * ride in for the same reason: an allowlist card IS the agent
         * asking, and it is the state where it is hard-blocked.
         */
        /*
         * BOTH numbers come from ONE composition, so the badge's number and
         * its colour cannot disagree: the total is what the panel would
         * list, and the ask count is how many of those the agent raised.
         */
        queueTotal={queueEntries.length}
        agentAskCount={agentAskCount(queueEntries)}
        /*
         * The count SURVIVES a failed fetch (see refreshNominations), so the
         * button discloses that it may be stale rather than presenting a
         * possibly-old number as current.
         */
        agentAskCountStale={queueError !== null}
      />
    );
  }

  /**
   * #93 + #170: the queue's writes go through the SAME flows the detail
   * panel opens -- one label, one flow. Signoff, verify and mark-done open
   * their shared dialogs (rendered by QueuePanel), so this function never
   * implements them: that is precisely how "signoff carries the allowlist"
   * ended up true from the queue and false from the ticket, and how the
   * queue's bare mark-done move diverged from the modal's. What reaches here
   * is the one ask with no richer surface: an allowlist approval, which
   * resolves its card through the shared approval-resolution module.
   */
  async function performQueueAction(
    entry: QueueEntry,
    outcome: RunOutcome,
  ): Promise<void> {
    if (outcome.status === "rejected") {
      // Rejecting an APPROVAL must resolve its card, or it lingers forever
      // and the agent is never told. Rejecting a gate ask writes nothing.
      // #170: the resolution lives in approval-resolution.ts, shared with
      // the ticket card -- this path only names the request.
      if (entry.approvalId !== undefined) {
        await resolveApprovalRequest(sessionId, entry.approvalId, false);
      }
      return;
    }
    try {
      /*
       * #93 + #170: an approval entry resolves the pending CARD; it does not
       * attach evidence itself. The resolution lives in
       * approval-resolution.ts, shared with the ticket card -- this path
       * only collects the (possibly edited) paths from the runner step.
       */
      if (entry.approvalId !== undefined) {
        const step = outcome.values[0];
        const paths = step !== undefined && step.kind === "path-list" ? step.paths : [];
        await resolveApprovalRequest(sessionId, entry.approvalId, true, paths);
        return;
      }
      /*
       * SIGNOFF, VERIFY AND MARK-DONE ARE NOT HANDLED HERE.
       *
       * Each used to have a write implementation in this function beside the
       * detail panel's dialogs. The queue now opens the SAME SignoffDialog,
       * VerifyModal and MarkDoneModal, so those flows have exactly one
       * implementation each. A gate ask reaching here is a routing bug, and
       * it writes nothing.
       */
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "refusal");
      throw error;
    }
  }

  const queueModal = queueOpen ? (
    <ModalShell
      title="Waiting on you"
      wide
      onClose={() => {
        setQueueOpen(false);
      }}
    >
      <QueuePanel
        sessionId={sessionId}
        tickets={liveTickets}
        evidenceByTicket={rawEvidence}
        nominations={nominations}
        approvals={approvals}
        error={queueError}
        onRefresh={refreshNominations}
        onOpen={(entry) => {
          setQueueOpen(false);
          selectTicket(entry.boardKey);
        }}
        onAct={async (entry, outcome) => {
          await performQueueAction(entry, outcome);
          // Acting on a nominated entry retires the nomination with it.
          refreshNominations();
        }}
        onDismiss={(nominationId) => {
          void callAidosRemote("dismissNomination", { nominationId }, sessionId)
            .then(() => {
              showToast("Suggestion dismissed", "info");
              refreshNominations();
            })
            .catch((error: unknown) => {
              showToast(
                error instanceof Error ? error.message : String(error),
                "refusal",
              );
            });
        }}
      />
    </ModalShell>
  ) : null;

  const retiredModal = retiredOpen ? (
    <ModalShell
      title="Retired tickets"
      wide
      onClose={() => {
        setRetiredOpen(false);
      }}
    >
      <RetiredPanel
        sessionId={sessionId}
        onOpen={(key) => {
          setRetiredOpen(false);
          selectTicket(key);
        }}
      />
    </ModalShell>
  ) : null;

  const tagsModal = tagsOpen ? (
    <TagsModal
      sessionId={sessionId}
      onOpen={(key) => {
        setTagsOpen(false);
        selectTicket(key);
      }}
      onClose={() => {
        setTagsOpen(false);
      }}
    />
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
      {retiredModal}
      {tagsModal}
      {/* The toast container is a sibling of the layout, not a child, so it
          persists across the slot-mutation remount. The single-string toast
          state and its timer are gone; the module-level toast store owns
          every toast now. */}
      <ToastContainer />
    </>
  );
}
