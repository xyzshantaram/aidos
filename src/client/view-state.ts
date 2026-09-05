/**
 * Module-level view state. The view survives a badge remount because all
 * state lives here, outside any React component.
 */

import { STATE_CHECKLIST_ORDER } from "./board-logic";
import type { FilterState } from "./board-logic";
import type { CommentRecord, EvidenceRow } from "../kernel/types";

/** The applied filter state of one session. */
export type AppliedState = FilterState;

/**
 * The hardcoded defaults. All states, most recently updated first, no search.
 *
 * #95: this led with CONFIDENCE, which is explicitly advisory and never
 * unlocks anything -- so the board opened sorted by a number that means
 * little, and "what moved recently?" needed a manual sort every session.
 * Only the DEFAULT changes: a chosen sort persists through view-state.
 */
export const DEFAULT_APPLIED: AppliedState = {
  projectIds: null,
  stateIds: [...STATE_CHECKLIST_ORDER],
  sortKey: "time",
  descending: true,
  search: "",
};

/** A plain copy of one applied state. */
export function cloneAppliedState(state: AppliedState): AppliedState {
  return {
    projectIds: state.projectIds === null ? null : [...state.projectIds],
    stateIds: [...state.stateIds],
    sortKey: state.sortKey,
    descending: state.descending,
    search: state.search,
  };
}

const sessionStates = new Map<string, { applied: AppliedState; staged: AppliedState }>();

/** Create a fresh pair from the hardcoded defaults. */
function freshState(): { applied: AppliedState; staged: AppliedState } {
  return {
    applied: cloneAppliedState(DEFAULT_APPLIED),
    staged: cloneAppliedState(DEFAULT_APPLIED),
  };
}

/** The stored staged state of one session, or defaults when absent. */
export function getStagedState(sessionId: string): AppliedState {
  const entry = sessionStates.get(sessionId);
  if (entry) return entry.staged;
  return cloneAppliedState(DEFAULT_APPLIED);
}

/** Overwrite the applied state of one session. */
export function setAppliedState(sessionId: string, state: AppliedState): void {
  let entry = sessionStates.get(sessionId);
  if (!entry) {
    entry = freshState();
    sessionStates.set(sessionId, entry);
  }
  entry.applied = cloneAppliedState(state);
}

/** Overwrite the staged state of one session. */
export function setStagedState(sessionId: string, state: AppliedState): void {
  let entry = sessionStates.get(sessionId);
  if (!entry) {
    entry = freshState();
    sessionStates.set(sessionId, entry);
  }
  entry.staged = cloneAppliedState(state);
}

// ---- the tab badge store ----

const counts = new Map<string, number>();
/**
 * The session whose board rendered most recently.
 *
 * This is a FALLBACK ONLY, and the distinction is the bug fix. It used to be
 * the sole answer to "which session's count does the tab show", and it is
 * the wrong authority: a board render happens for whatever board is on
 * screen, so opening workspace B's board relabelled workspace A's tab.
 * User-reported 2026-09-05, alongside the identical defect in the title
 * index: "the ticket count in the chat/trajectory/tickets bar shows the
 * count of the previous workspace you opened the board in" -- and then,
 * exactly: "they both update when the board is opened but it doesn't matter
 * WHICH board".
 *
 * Kept because the test harness (and any runtime with no sessions store)
 * has no other source, and dropping it would silently zero the badge there.
 */
let lastRenderedSessionId: string | null = null;
/**
 * The current session according to the SESSIONS STORE (`list.current`),
 * which is the only component that actually knows. Set by the plugin's
 * visibility effect, which already subscribes to that store for exactly
 * this reason. Takes precedence over the last-rendered fallback whenever it
 * is known.
 */
let authoritativeSessionId: string | null = null;
let bumpCallback: (() => void) | null = null;

/** The callback the plugin entry registers to re-render the tab label. */
export function setCountCallback(callback: (() => void) | null): void {
  bumpCallback = callback;
}

/**
 * Record the open count of one session. Update the current session and the
 * count, then bump the tab label when the count for that session changed.
 */
export function reportCount(sessionId: string, count: number): void {
  const changed = counts.get(sessionId) !== count;
  counts.set(sessionId, count);
  lastRenderedSessionId = sessionId;
  if (!changed) return;
  if (remountSuppressed) {
    // The label WILL be stale until release, deliberately: a stale count is
    // recoverable by looking again, a destroyed modal is not.
    relabelPending = true;
    return;
  }
  if (bumpCallback !== null) bumpCallback();
}

/** The tab label for a specific session. Use badgeLabel() for the current session. */
export function badgeLabelFor(sessionId: string): string {
  const count = counts.get(sessionId) ?? 0;
  return count > 0 ? "Tickets (" + count + ")" : "Tickets";
}

/**
 * Name the current session from the authority that knows it: the sessions
 * store's `list.current`. Pass null when there is no current session.
 *
 * Separate from reportCount ON PURPOSE. A board RENDER is evidence that a
 * board was rendered, nothing more; it is not evidence about which session
 * the tab belongs to, and treating it as such is what made the badge follow
 * the last workspace you looked at.
 */
export function setCurrentSession(sessionId: string | null): void {
  authoritativeSessionId = sessionId;
}

/** The session the badge speaks for: the store's answer, else last rendered. */
function badgeSessionId(): string | null {
  return authoritativeSessionId ?? lastRenderedSessionId;
}

/** The tab label. A nonzero count for the current session adds a suffix. */
export function badgeLabel(): string {
  const sessionId = badgeSessionId();
  const count = sessionId === null ? 0 : counts.get(sessionId) ?? 0;
  return count > 0 ? "Tickets (" + count + ")" : "Tickets";
}

// ---- remount suppression (user-reported 2026-09-05: "opening the queue
// makes the board vanish") ----
//
// A count change re-registers the Tickets tab (see index.ts), and a slot
// re-registration UNMOUNTS AND REMOUNTS LocalTicketView -- the same
// mechanism #100 traced for the reading-a-ticket bug. #100 fixed that bug by
// moving `selectedKey` here, to a module store that survives the remount.
// It did NOT do the same for `queueOpen` (or `createOpen`/`planOpen`): those
// are still plain useState with no backing outside the component, so a
// remount landing while the queue modal is open does not just flash the
// board -- it silently sets queueOpen back to its initial `false` and the
// modal is genuinely gone. Opening the queue did not CAUSE the count change
// that triggered it (the change is some unrelated board write elsewhere in
// the workspace landing at an unlucky moment); it just made the remount's
// effect visible and interactive instead of a harmless flash.
//
// Rather than giving every such flag its own persisted slot (more state to
// keep in sync, the same class of bug for the next modal someone adds), the
// remount itself is deferred while any of them holds this open. The count
// data is never stale for a WRITE -- `reportCount` still records the real
// count immediately -- only the visible, destructive remount waits.
let remountSuppressed = false;
let relabelPending = false;

/** Hold off the next tab remount; a suppressed change is applied on release. */
export function setRemountSuppressed(suppressed: boolean): void {
  remountSuppressed = suppressed;
  if (!suppressed && relabelPending) {
    relabelPending = false;
    if (bumpCallback !== null) bumpCallback();
  }
}

// ---- the selection store (#100) ----

/**
 * The open ticket, per session, OUTSIDE React state.
 *
 * #100's root cause, found from instrumented logs after two fixes aimed at
 * the wrong layer: a badge-count change disposes and re-registers the
 * Tickets slot entry, and a slot re-registration UNMOUNTS AND REMOUNTS the
 * component. Every useState and useRef in the tree dies with it -- so the
 * selection did not survive a ticket count changing, which happens on any
 * board write anywhere in the workspace, including other people's.
 *
 * That is why it felt random: the trigger was never the reader's own
 * action. And it is why a resolver that "holds unconditionally" could not
 * help -- a pure function cannot preserve state that no longer exists.
 *
 * This module already keeps the merge cache and the filter here for exactly
 * this reason: module scope outlives a remount. The selection belongs with
 * them. That defends against this cause AND any future remount, rather than
 * against one known trigger.
 */
const selections = new Map<string, string | null>();

/** The remembered selection of one session, or null when nothing is open. */
export function getSelection(sessionId: string): string | null {
  return selections.get(sessionId) ?? null;
}

/**
 * Listeners on the selection, so a write from OUTSIDE the board's tree
 * reaches a board that is already mounted (#73).
 *
 * Without this, click-through silently did nothing. The store was written
 * for #100, where it is read once on MOUNT to restore a selection a remount
 * destroyed -- a read-on-mount store is enough for that. A tool card in the
 * transcript writes to a board that is already mounted and never remounts,
 * so nothing re-read it.
 *
 * The "the board opens there when you switch tabs" note in aidos-rows.tsx
 * was therefore wrong on its own terms: switching tabs does not remount the
 * view either. A store that is written from two places needs to notify.
 */
const selectionListeners = new Set<(sessionId: string) => void>();

/** Subscribe to selection changes. Returns the unsubscribe. */
export function onSelectionChanged(listener: (sessionId: string) => void): () => void {
  selectionListeners.add(listener);
  return function () {
    selectionListeners.delete(listener);
  };
}

/** Remember (or clear) the open ticket of one session. */
export function setSelection(sessionId: string, key: string | null): void {
  const previous = selections.get(sessionId) ?? null;
  if (key === null) selections.delete(sessionId);
  else selections.set(sessionId, key);
  // Only a real change notifies: the board writes here on every selection,
  // so an unconditional notify would loop through its own subscriber.
  if (previous === key) return;
  for (const listener of [...selectionListeners]) {
    try {
      listener(sessionId);
    } catch {
      // A throwing subscriber must not stop the others, and must never
      // propagate into the caller's render.
    }
  }
}

// ---- the ticket title index (#73) ----

/**
 * Ticket id -> title, so a TOOL CARD can name the ticket it acted on.
 *
 * #73 requires a ticket-bearing call to show "the ticket ID and title, not
 * just a bare number" -- but a tool call carries only an id. attach_evidence
 * names `ticketId` in both its arguments and its result, and neither carries
 * a title. The board already knows, so the board publishes what it knows.
 *
 * A plain module Map, for the same reason the selection is one: a tool card
 * renders OUTSIDE the board's React tree and cannot reach its state.
 *
 * Deliberately BEST-EFFORT. A card must never DEPEND on the board having
 * been opened, or it degrades exactly where it is most useful -- a fresh
 * session reading back what an agent did earlier. A missing title yields a
 * bare id: a worse card, not a broken one.
 *
 * KEYED BY SESSION, not by bare ticket id. User-reported 2026-09-05: "It
 * just showed me a Thursday ticket in the tool call summary for #39, even
 * though the tool call body had the correct details." That split is the
 * whole diagnosis -- the BODY comes from the call's own parsed result and is
 * correct by construction, while the SUMMARY came through this index, which
 * was a single `Map<ticketId, title>` written by whichever board rendered
 * most recently. Open a Thursday board, then read an aidos card naming #39,
 * and the card confidently showed Thursday's #39.
 *
 * The user named the cause precisely: "they both update when the board is
 * opened but it doesn't matter WHICH board". Two ticket ids from different
 * workspaces are not the same ticket and never were; the key was simply
 * missing the half that distinguishes them.
 */
const ticketTitles = new Map<string, string>();

/** The composite key: a bare id is ambiguous across workspaces. */
function titleKey(sessionId: string, ticketId: number | string): string {
  return sessionId + "\u0000" + String(ticketId);
}

/** Publish the titles of the rows one session's board just rendered. */
export function publishTicketTitles(
  sessionId: string,
  rows: ReadonlyArray<{ id: number; title: string }>,
): void {
  for (const row of rows) ticketTitles.set(titleKey(sessionId, row.id), row.title);
}

/**
 * The known title of one ticket in ONE session, or null when that session's
 * board has not loaded it.
 *
 * Returning null rather than falling back to "some other board knew a #39"
 * is the point of the fix: the fallback IS the bug. A bare id is a worse
 * card; another workspace's title is a wrong one.
 */
export function ticketTitle(sessionId: string | undefined, ticketId: number | string): string | null {
  if (sessionId === undefined) return null;
  return ticketTitles.get(titleKey(sessionId, ticketId)) ?? null;
}

// ---- the workspace merge store ----

import type { TicketView } from "../kernel/projections";

/**
 * One workspaceTickets pull. Foreign rows are keyed
 * <sourceSessionId>:<ticketId>; own rows plain ticketId.
 */
export interface WorkspaceMerge {
  tickets: Array<TicketView & { sourceSessionId: string; foreign: boolean }>;
  evidence: Record<string, EvidenceRow[]>;
  comments: Record<string, CommentRecord[]>;
}

// Module-scope like the filter and badge stores: the badge re-register
// remounts the board, and component state would reset to empty on every
// remount — the merge must survive it.
const mergeCache = new Map<string, WorkspaceMerge>();
const mergePulledVersion = new Map<string, string>();

/** The cached merge of one session, or null when none has landed yet. */
export function getMerge(sessionId: string): WorkspaceMerge | null {
  return mergeCache.get(sessionId) ?? null;
}

/** Store one merge for a session. */
export function setMerge(sessionId: string, merge: WorkspaceMerge): void {
  mergeCache.set(sessionId, merge);
}

/** The own-board version the last pull served, or null. */
export function getPulledVersion(sessionId: string): string | null {
  return mergePulledVersion.get(sessionId) ?? null;
}

/** Record the own-board version a pull covered. */
export function setPulledVersion(sessionId: string, version: string): void {
  mergePulledVersion.set(sessionId, version);
}

// Sessions with a workspaceTickets pull in flight. Module scope so a badge
// remount mid-pull keeps the loading indicator up.
const pullsInFlight = new Set<string>();

/** Whether a workspaceTickets pull is running for a session. */
export function isMergePulling(sessionId: string): boolean {
  return pullsInFlight.has(sessionId);
}

/** Mark a pull started/finished for a session. */
export function setMergePulling(sessionId: string, pulling: boolean): void {
  if (pulling) {
    pullsInFlight.add(sessionId);
  } else {
    pullsInFlight.delete(sessionId);
  }
}
