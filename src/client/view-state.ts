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
let currentSessionId: string | null = null;
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
  currentSessionId = sessionId;
  if (changed && bumpCallback !== null) bumpCallback();
}

/** The tab label for a specific session. Use badgeLabel() for the current session. */
export function badgeLabelFor(sessionId: string): string {
  const count = counts.get(sessionId) ?? 0;
  return count > 0 ? "Tickets (" + count + ")" : "Tickets";
}

/** The tab label. A nonzero count for the current session adds a suffix. */
export function badgeLabel(): string {
  const count = currentSessionId === null ? 0 : counts.get(currentSessionId) ?? 0;
  return count > 0 ? "Tickets (" + count + ")" : "Tickets";
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
 */
const ticketTitles = new Map<string, string>();

/** Publish the titles of the rows the board just rendered. */
export function publishTicketTitles(rows: ReadonlyArray<{ id: number; title: string }>): void {
  for (const row of rows) ticketTitles.set(String(row.id), row.title);
}

/** The known title of one ticket id, or null when the board has not loaded. */
export function ticketTitle(ticketId: number | string): string | null {
  return ticketTitles.get(String(ticketId)) ?? null;
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
