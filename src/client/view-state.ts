/**
 * Module-level view state. The view survives a badge remount because all
 * state lives here, outside any React component.
 */

import { STATE_CHECKLIST_ORDER } from "./board-logic";
import type { FilterState } from "./board-logic";
import type { CommentRecord, EvidenceRow } from "../kernel/types";

/** The applied filter state of one session. */
export type AppliedState = FilterState;

/** The hardcoded defaults. All states, confidence descending, no search. */
export const DEFAULT_APPLIED: AppliedState = {
  projectIds: null,
  stateIds: [...STATE_CHECKLIST_ORDER],
  sortKey: "confidence",
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
