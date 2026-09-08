/**
 * Module-level view state. The view survives a badge remount because all
 * state lives here, outside any React component.
 */

import { STATE_CHECKLIST_ORDER } from "./board-logic";
import type { FilterState, SelectionCandidate, SelectionResolution } from "./board-logic";
import type { CommentRecord, EvidenceRow } from "../kernel/types";
// NOTE: TicketView is imported further down, beside the merge store it was
// added for. One import of it is enough (a second is a duplicate-identifier
// error), and the held-ticket store above uses that same type.

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
/**
 * Whether the sessions store has answered AT ALL. Distinct from
 * `authoritativeSessionId !== null`, because null is itself an answer.
 */
let authorityKnown = false;
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

/**
 * Reset every piece of badge state. TEST-ONLY.
 *
 * Added in round 2 because the reviewer found the round-1 badge tests were
 * ORDER-COUPLED: this module is process-global by nature (the slot label is
 * a zero-argument thunk, so the badge cannot be per-instance), and each test
 * inherited whatever the previous one left behind. In particular "no store
 * answer yet" is unreachable once any earlier test has called
 * `setCurrentSession`, so the fallback path could not be tested honestly
 * without this.
 *
 * Deliberately not exported through any production path: nothing in src/
 * calls it.
 */
export function __resetBadgeStateForTests(): void {
  authoritativeSessionId = null;
  authorityKnown = false;
  lastRenderedSessionId = null;
  counts.clear();
  /*
   * Round 3, reviewer advisory 3: the original reset cleared four fields
   * and left these two, so a test that ended with suppression on silently
   * swallowed the NEXT test's relabel (0 bumps instead of 1) -- the exact
   * order-coupling class this helper was added to end.
   */
  remountSuppressed = false;
  relabelPending = false;
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
  /*
   * ROUND 2 (independent review, 2026-09-05): THIS MUST BUMP THE LABEL.
   *
   * Round 1 only assigned the field, and re-registration is the ONLY thing
   * that makes the tab header re-read the label thunk. `setCurrentSession`
   * is called from the visibility effect's `sync()`, whose only other
   * action is `reconcile()` -- a no-op while `want` is unchanged, and
   * `want` does not change when switching between two aidos sessions.
   *
   * So the reported symptom SURVIVED round 1: open A's board (header shows
   * "Tickets (3)"), switch to B without opening B's board, and the header
   * still shows A's count. Switching BACK to A was worse, because
   * `reportCount(A, 3)` sees an unchanged count and returns early, leaving
   * the header on B's string until some unrelated count changed.
   *
   * Round 1's tests passed anyway because they asserted the SOURCE TEXT
   * contained `setCurrentSession(list.current ?? null)`. The string was
   * there, the test was green, and the badge did not relabel. That is the
   * clearest evidence in this repository that a source-grep test is worse
   * than no test: it manufactures confidence.
   */
  const changed = !authorityKnown || authoritativeSessionId !== sessionId;
  authoritativeSessionId = sessionId;
  authorityKnown = true;
  if (!changed) return;
  if (remountSuppressed) {
    // Same rule reportCount follows: a stale label is recoverable by
    // looking again, a destroyed modal is not.
    relabelPending = true;
    return;
  }
  if (bumpCallback !== null) bumpCallback();
}

/**
 * The session the badge speaks for: the store's answer once it has given
 * one, else the last board rendered.
 *
 * `authorityKnown` rather than `authoritativeSessionId !== null`, because
 * null is a real answer ("there is no current session") and round 1
 * conflated it with "nobody has told me yet". The reviewer probed exactly
 * that: after `setCurrentSession(null)` the badge returned the PREVIOUS
 * board's "Tickets (11)", and the tab stays registered when there is no
 * current session, so it was visible rather than theoretical.
 */
function badgeSessionId(): string | null {
  return authorityKnown ? authoritativeSessionId : lastRenderedSessionId;
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
//
// ROUND 2 (user, 2026-09-07: "board still unmounts if it updates while the
// queue is open"; then "still broken"). The reasoning above was right about
// the ANTI-PATTERN and wrong about the conclusion, and the independent
// diagnosis found why: suppression can only ever cover the remount paths it
// is wired into. It guards two (reportCount, setCurrentSession) and misses
// a third -- index.ts's visibility effect calls reconcile() straight from
// the sessions-store subscription with no check at all -- so a subscription
// firing while the queue is open still destroys the tree.
//
// Adding a fourth guard would be the band-aid this comment already argues
// against, one path at a time, forever. The GENERAL answer is the one #100
// used for `selectedKey`: state that must outlive a remount lives outside
// React. So the modal flags now live below, and the suppression stays only
// as churn-avoidance -- it is no longer what makes the modal survive.
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

/**
 * #100 round 2: which modals a session has open, OUTSIDE React.
 *
 * `queueOpen`, `createOpen` and `planOpen` were plain useState, so any
 * remount reset them to false and the modal the human was working in simply
 * vanished. Suppressing the remount only helps for the paths suppression
 * knows about, and one of them (index.ts's visibility effect, which
 * reconciles straight from the sessions-store subscription) was never
 * wired in. This store makes the question moot: whatever remounts the tree
 * and for whatever reason, the mount reads its modal state back.
 *
 * Keyed by SESSION, like every other store in this module. Two boards open
 * on different sessions must not share a modal — and a modal left open on
 * a session you navigate away from should still be open when you return,
 * which is the same property the selection has.
 */
export type ModalKey = "queue" | "create" | "plan";

const openModals = new Map<string, Set<ModalKey>>();

/** Is this session's modal open? Read on mount to restore across remounts. */
export function isModalOpen(sessionId: string, modal: ModalKey): boolean {
  return openModals.get(sessionId)?.has(modal) === true;
}

/** Record a modal opening or closing for one session. */
export function setModalOpen(sessionId: string, modal: ModalKey, open: boolean): void {
  const current = openModals.get(sessionId);
  if (open) {
    if (current === undefined) openModals.set(sessionId, new Set([modal]));
    else current.add(modal);
    return;
  }
  if (current === undefined) return;
  current.delete(modal);
  // Drop the empty set rather than leaving a husk per session visited.
  if (current.size === 0) openModals.delete(sessionId);
}

/**
 * Whether ANY modal is open for this session (the suppression input).
 *
 * Round 3: the DETAIL dialogs count too. Suppression is churn-avoidance
 * rather than the thing holding a modal together, but a reader typing into
 * the mark-done modal has exactly as much claim on a quiet tree as a reader
 * with the queue open, and leaving them out made this predicate quietly
 * disagree with its own name.
 */
export function anyModalOpen(sessionId: string): boolean {
  if ((openModals.get(sessionId)?.size ?? 0) > 0) return true;
  return anyDetailModalOpen(sessionId);
}

/** TEST-ONLY: forget every open modal, so tests cannot leak into each other. */
export function __resetModalsForTests(): void {
  openModals.clear();
  detailModals.clear();
  runningApprovals.clear();
}

// ---- the DETAIL modal store (#100 round 3) ----

/**
 * The dialogs that live INSIDE the detail panel, OUTSIDE React.
 *
 * ROUND 3. Round 2 moved `queueOpen`, `createOpen` and `planOpen` out of
 * React and stopped at the BOARD level -- but the modals this ticket's
 * criterion actually names ("mark-done, evidence viewer, approval runner")
 * are one level down, in `DetailView`, and every one of them was still a
 * plain `useState`: mark-done, the evidence viewer, signoff, verify,
 * send-back and the allowlist editor. The board-level fix did nothing for
 * them. The same remount that used to close the queue still emptied the
 * dialog the reader was typing into.
 *
 * Worse, DetailView had a SECOND remount all of its own that no board-level
 * store could ever have covered: `key={selectedBoardKey}`. A row's board key
 * flips when it goes foreign -> own, and React tears the subtree down and
 * builds it again when a key changes. That is #100's second mechanism
 * arriving at the modals by a different road, and the view's own comment
 * said so ("it remounts and any open modal is destroyed") while shipping it.
 *
 * So: the same answer as round 2, applied one level down. State that must
 * outlive a remount does not live in React.
 *
 * SCOPED BY SESSION AND BY THE TICKET'S DURABLE IDENTITY (`workspaceKey:slug`
 * -- `fullTicketId`), never by the board key and never by the numeric id.
 * The board key is precisely the value that flips underneath a selection, so
 * keying the dialogs by it would drop them on one of the two events they
 * exist to survive; the bare id collides across sessions, which this file
 * has already paid for twice (the badge, and the title index above).
 */
export type DetailModalKey = "signoff" | "verify" | "sendBack" | "markDone" | "allowlist";

interface DetailModalState {
  open: Set<DetailModalKey>;
  /** The row the evidence viewer is showing. Null when it is closed. */
  evidence: unknown;
}

/** session -> durable ticket id -> that ticket's open dialogs. */
const detailModals = new Map<string, Map<string, DetailModalState>>();

/** The stored dialogs of one ticket. Created on demand, and only for a write. */
function detailEntry(
  sessionId: string,
  ticketId: string,
  create: boolean,
): DetailModalState | undefined {
  let byTicket = detailModals.get(sessionId);
  if (byTicket === undefined) {
    if (!create) return undefined;
    byTicket = new Map<string, DetailModalState>();
    detailModals.set(sessionId, byTicket);
  }
  let entry = byTicket.get(ticketId);
  if (entry === undefined) {
    if (!create) return undefined;
    entry = { open: new Set<DetailModalKey>(), evidence: null };
    byTicket.set(ticketId, entry);
  }
  return entry;
}

/**
 * Drop an entry that now holds nothing, so reading a hundred tickets does
 * not leave a hundred husks -- and, more importantly, so `anyDetailModalOpen`
 * can answer by asking whether the session has any entry AT ALL.
 */
function pruneDetailEntry(sessionId: string, ticketId: string): void {
  const byTicket = detailModals.get(sessionId);
  const entry = byTicket?.get(ticketId);
  if (byTicket === undefined || entry === undefined) return;
  if (entry.open.size > 0 || entry.evidence !== null) return;
  byTicket.delete(ticketId);
  if (byTicket.size === 0) detailModals.delete(sessionId);
}

/** Is this ticket's dialog open? Read on mount, to restore across remounts. */
export function isDetailModalOpen(
  sessionId: string,
  ticketId: string,
  modal: DetailModalKey,
): boolean {
  return detailEntry(sessionId, ticketId, false)?.open.has(modal) === true;
}

/** Record one of this ticket's dialogs opening or closing. */
export function setDetailModalOpen(
  sessionId: string,
  ticketId: string,
  modal: DetailModalKey,
  open: boolean,
): void {
  if (open) {
    detailEntry(sessionId, ticketId, true)?.open.add(modal);
    return;
  }
  const entry = detailEntry(sessionId, ticketId, false);
  if (entry === undefined) return;
  entry.open.delete(modal);
  pruneDetailEntry(sessionId, ticketId);
}

/**
 * The row the evidence viewer is showing, or null.
 *
 * A ROW rather than a flag, because that is what the viewer takes -- so the
 * row is what has to survive, exactly as with the held ticket above. It is
 * a plain projection row the board already handed the panel, so storing it
 * borrows no lifetime from anything React owns.
 */
export function getViewedEvidence<T>(sessionId: string, ticketId: string): T | null {
  return (detailEntry(sessionId, ticketId, false)?.evidence as T | undefined) ?? null;
}

/** Remember (or clear) the row the evidence viewer is showing. */
export function setViewedEvidence<T>(sessionId: string, ticketId: string, row: T | null): void {
  if (row !== null) {
    const entry = detailEntry(sessionId, ticketId, true);
    if (entry !== undefined) entry.evidence = row;
    return;
  }
  const entry = detailEntry(sessionId, ticketId, false);
  if (entry === undefined) return;
  entry.evidence = null;
  pruneDetailEntry(sessionId, ticketId);
}

/**
 * Forget every dialog of one ticket. Called when the READER changes what is
 * open -- closing the panel, or opening a different ticket.
 *
 * This is the rule the selection store already follows, and it is why the
 * clearing cannot be done from an unmount cleanup: a remount and a close are
 * the SAME event to a component, and only the caller knows which one it was.
 * Clearing on unmount is what the third fix did with the held identity, and
 * the review named it as the mechanism that destroyed the durable state at
 * the exact moment it was needed. A dialog is ended by the person who opened
 * it, never by a refresh.
 */
export function clearDetailModals(sessionId: string, ticketId: string): void {
  const byTicket = detailModals.get(sessionId);
  if (byTicket === undefined) return;
  byTicket.delete(ticketId);
  if (byTicket.size === 0) detailModals.delete(sessionId);
}

/** Whether this session has any DETAIL dialog open, on any ticket. */
function anyDetailModalOpen(sessionId: string): boolean {
  return (detailModals.get(sessionId)?.size ?? 0) > 0;
}

// ---- the approval runner store (#100 round 3) ----

/**
 * Which queue entry has its approval runner open, per session.
 *
 * The runner is the third modal the criterion names, and it was the last one
 * still held together by React alone: `QueuePanel` kept it in a `useState`,
 * so a remount closed it even after round 2 taught the queue MODAL to
 * survive one. The queue came back open with the runner gone -- which reads
 * to the human as the approval they were halfway through simply vanishing.
 *
 * An entry KEY, not the entry object (`entryKey`, which already exists for
 * the answered set). The entry is derived from the current board on every
 * render, so re-deriving it here is correct AND self-healing: if the ask
 * stops being derived because it was answered elsewhere, the runner closes,
 * which is exactly what it should do. That is the opposite of the held
 * ticket, whose whole problem was that its row can be transiently absent --
 * different data, different rule, stated rather than assumed.
 */
const runningApprovals = new Map<string, string>();

/** The queue entry key whose runner is open for this session, or null. */
export function getRunningApproval(sessionId: string): string | null {
  return runningApprovals.get(sessionId) ?? null;
}

/** Remember (or clear) which entry's runner is open for this session. */
export function setRunningApproval(sessionId: string, key: string | null): void {
  if (key === null) runningApprovals.delete(sessionId);
  else runningApprovals.set(sessionId, key);
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

// ---- the held-ticket store (#100, fourth fix) ----

/**
 * The last RESOLVED ticket ROW of one session, OUTSIDE React state.
 *
 * The remount that #100 traced destroys every useRef alongside every
 * useState. The selection key survived it (module store, above), but the
 * HELD ticket -- `lastSelected` in the view, the resolver's `previous`
 * input -- did not: a remount-wiped ref meant resolveSelection received
 * null for `previous`, so a transient row miss after a remount read as
 * "gone" and ejected the reader anyway.
 *
 * WHY A ROW AND NOT AN IDENTITY STRING. The third fix stored the durable
 * identity (`workspaceKey:slug`) and had the view re-derive the row from
 * the current board. The independent review failed it, correctly and at
 * the root: `resolveSelection`'s hold branch RETURNS `previous` as the
 * displayed ticket, so its input must be a row OBJECT. Re-deriving that
 * row from the current board is impossible in precisely the case the fix
 * exists for -- the row transiently ABSENT from that board -- so the hold
 * still collapsed to "gone" and still ejected the reader.
 *
 * The earlier objection to a row snapshot ("it would age badly in module
 * scope") does not survive contact with what this replaces: the REF was
 * already a row snapshot from an earlier render, and this store is that
 * ref with a longer life. Aging is bounded because every render where the
 * row IS present overwrites it, and a held row is displayed with
 * `absent: true` -- the panel already says it is showing a row the board
 * does not currently carry.
 */
const heldTickets = new Map<string, SelectionCandidate>();

/**
 * The row one session last had resolved, or null when it never did.
 *
 * The store is typed by the CALLER's row shape: the invariant is that it
 * holds exactly what that session's resolver produced (recordResolution is
 * the only writer), so the cast inside is honest -- the generic keeps the
 * store composable with resolveSelection over ANY row type the board uses
 * (the view's TicketView, the tests' minimal Row).
 */
export function getHeldTicket<T extends SelectionCandidate = SelectionCandidate>(
  sessionId: string,
): T | null {
  return (heldTickets.get(sessionId) as T | undefined) ?? null;
}

/** Remember (or clear) the last resolved row of one session. */
export function setHeldTicket<T extends SelectionCandidate>(
  sessionId: string,
  ticket: T | null,
): void {
  if (ticket === null) heldTickets.delete(sessionId);
  else heldTickets.set(sessionId, ticket);
}

/**
 * The resolver's `previous` input: the live ref when it survived, the
 * durable store when a remount wiped it.
 *
 * This is the whole seam, and it is a function rather than an inline `??`
 * in the view so it can be unit tested against the REAL resolver. The
 * review that failed the third fix found its two headline tests could not
 * fail under any change to the view, because they re-implemented the
 * derivation instead of importing it. Composing this with resolveSelection
 * is exactly what the view does, so a test of that composition tests the
 * shipped path.
 */
export function holdInput<T extends SelectionCandidate>(
  sessionId: string,
  refValue: T | null,
): T | null {
  return refValue ?? getHeldTicket<T>(sessionId);
}

/**
 * Apply one resolution to the durable store. The view calls this on every
 * render; the RULES live here so they are testable and stated once.
 *
 *  - resolved / reanchored: remember the row that is on the board now.
 *  - held: leave it exactly as it is. The stored row IS the held row, and
 *    the hold is the case the store exists for.
 *  - none: clear. A selection is ended by the USER (closeDetail writes a
 *    null selection), which is the only thing that may forget a ticket.
 *  - gone: leave it. The third fix cleared here, and the review named that
 *    as the mechanism destroying the durable state at the exact moment it
 *    was needed. It is also unreachable with a stored row: `holdInput`
 *    returns that row, so a non-null store makes `previous` non-null and
 *    the resolver holds instead. "gone" therefore means nothing was ever
 *    stored, and clearing would be a no-op that only invites the bug back.
 */
export function recordResolution<T extends SelectionCandidate>(
  sessionId: string,
  reason: SelectionResolution<T>["reason"],
  ticket: T | null,
): void {
  if (reason === "resolved" || reason === "reanchored") {
    if (ticket !== null) setHeldTicket(sessionId, ticket);
    return;
  }
  if (reason === "none") setHeldTicket(sessionId, null);
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

/**
 * Publish the titles of the rows one session's board just rendered, EACH
 * UNDER THE SESSION THAT OWNS IT.
 *
 * ROUND 2 (independent review, 2026-09-05). Round 1 keyed every row by the
 * RENDERING session, which is the wrong half of the pair. A board renders
 * `[...ownRows, ...foreignRows]` -- the foreign ones are sibling sessions'
 * rows pulled through `workspaceTickets` -- and they are appended LAST, so
 * a sibling's #39 overwrote this session's #39 under this session's own
 * key. The contamination survived the fix; it merely moved from
 * cross-workspace to cross-session-within-a-workspace.
 *
 * This repository states the rule twice, and round 1 violated it anyway:
 * `board-logic.ts` ("addressed sourceSessionId:id, because ids collide
 * across sessions") and `aidos-core.ts` ("deliberately NOT the numeric id,
 * which collides across sessions and is the confusion behind eleven bugs in
 * this file").
 *
 * The distinguishing half is the session that OWNS the row, which every row
 * already carries: own rows are stamped `sourceSessionId: sessionId` when
 * they are built, and foreign rows arrive with the owner's id on them. The
 * rendering session is only the fallback for a row that carries no owner.
 */
export function publishTicketTitles(
  sessionId: string,
  rows: ReadonlyArray<{
    id: number;
    title: string;
    sourceSessionId?: string;
    foreign?: boolean;
  }>,
): void {
  for (const row of rows) {
    /*
     * Round 3, reviewer advisory 4: a FOREIGN row with no owner is not
     * published at all rather than published under the viewing session.
     * The `?? sessionId` fallback exists for callers whose rows are all
     * their own; defaulting an ownerless FOREIGN row onto the viewer is
     * exactly the round-1 bug, silently reinstated by the next caller
     * that forgets to stamp. Dropping the title costs a bare id on one
     * card; borrowing it puts ANOTHER session's title on this session's
     * card.
     */
    if (row.foreign === true && row.sourceSessionId === undefined) continue;
    ticketTitles.set(titleKey(row.sourceSessionId ?? sessionId, row.id), row.title);
  }
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
