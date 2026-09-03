/**
 * #93: the HUMAN WORK QUEUE — what is waiting on the person, not the agent.
 *
 * Two halves feed one list:
 *
 *  - the DERIVED half, computed here from board state alone. It needs no
 *    agent, no event, and no persistence: a ticket is in the queue when it
 *    has an available action only a human may take. `actionsFor` already
 *    computes availability and the unlock reason for every action, so this
 *    module only decides which of those actions are the human's.
 *  - the NOMINATED half, which the agent pushes with a reason. Nominations
 *    are SESSION-SCOPED (decided 2026-09-03): a restart drops them and the
 *    queue degrades to the derived half rather than to nothing.
 *
 * No React, no DOM, no dsh imports — the same rule action-visibility follows,
 * so the queue can be unit tested and reused by a tool card as easily as by
 * a panel.
 */

import type { TicketView } from "../kernel/projections";
import { actionsFor } from "./action-visibility";
import { boardKeyOf } from "./board-logic";
import type { BoardKey } from "./board-logic";
import type { ActionId, EvidenceKinds } from "./action-visibility";

/**
 * The actions a HUMAN performs. `submit-for-review` is the agent's move and
 * `allowlist` is an editor rather than a pending decision, so neither puts a
 * ticket in the human's queue.
 *
 * `send-back` is deliberately excluded too: it is always available on an
 * awaiting ticket, so including it would enqueue every awaiting ticket twice
 * and drown the signal. Send-back is a choice the human makes AT the ticket,
 * not a task the board asks them for.
 */
const HUMAN_ACTIONS: ReadonlySet<ActionId> = new Set<ActionId>([
  "signoff",
  "verify",
  "mark-done",
]);

/** Why a ticket is in the queue, in the human's words. */
export const QUEUE_PROMPTS: Record<string, string> = {
  signoff: "Sign off to let the agent start work",
  verify: "Verify the work and attach your row",
  "mark-done": "Verified — mark it done",
};

export interface QueueEntry {
  /** The ticket awaiting the human. */
  ticket: TicketView;
  /**
   * THE address of this row on the merged board: a plain id for an own
   * ticket, `sourceSessionId:id` for a foreign one. Carried on the entry so
   * no consumer can re-derive it wrongly — #93's review found exactly that
   * bug, where a bare String(ticket.id) made a foreign ticket read another
   * ticket's evidence and an action on it write to the wrong ticket.
   */
  boardKey: BoardKey;
  /** The action they can take right now. */
  actionId: ActionId;
  /** The button label, straight from the action descriptor. */
  label: string;
  /** One line of why this is here. */
  prompt: string;
  /** Set when the agent nominated this entry, with its reason. */
  nominationReason?: string;
  /** The nomination's id, so dismissing can name it. */
  nominationId?: string;
  /** Set when this entry IS a pending approval card rather than a gate ask. */
  approvalId?: string;
  /** The paths the agent proposed, for an allowlist approval. */
  approvalPaths?: string[];
}

/**
 * A pending approval card as the host hands it to the client (#51). The queue
 * surfaces these because nothing else did: `pendingApproval` is per-ticket, so
 * a queued card was invisible unless you already had that ticket open.
 */
export interface PendingApprovalLike {
  id: string;
  ticketId: number | string;
  kind: string;
  prompt: string;
  payload?: Record<string, unknown>;
  at: number;
}

/** A nomination as the host hands it to the client. */
export interface Nomination {
  id: string;
  ticketId: number | string;
  actionId: ActionId;
  reason: string;
  at: number;
}

/**
 * The derived queue: every ticket with an available human action, in board
 * order. A ticket with two available human actions normally yields two
 * entries, because they are genuinely different asks and dropping one would
 * hide it.
 *
 * ONE deliberate exception, and it is enforced in the body below: when
 * `mark-done` is available, `verify` is dropped. Verify being available
 * means the ticket can be verified; mark-done being available means it
 * ALREADY HAS a user_verified row, so offering Verify beside Mark Done
 * reads as "do this again" on a ticket that is already verified.
 *
 * This is a QUEUE-only collapse. `actionsFor` in action-visibility.ts is
 * untouched, so the detail panel's action bar still offers both -- a human
 * may legitimately want to attach a second verification (another
 * screenshot, another note) before marking done.
 */
export function derivedQueue<T extends TicketView>(
  tickets: readonly T[],
  evidenceKindsOf: (ticket: T) => EvidenceKinds,
): QueueEntry[] {
  const entries: QueueEntry[] = [];
  for (const ticket of tickets) {
    if (ticket.state === "done") continue;
    const kinds = evidenceKindsOf(ticket);
    const available = actionsFor(ticket, kinds).filter(
      (action) => HUMAN_ACTIONS.has(action.id) && action.unavailableReason === undefined,
    );
    /*
     * QUEUE-ONLY simplification (user ask, 2026-09-03): once mark-done is
     * ready, drop "verify" from the QUEUE listing — the row already exists,
     * so re-showing Verify next to Mark Done reads as "do this again" on a
     * ticket that has already been verified.
     *
     * This must NOT touch actionsFor / action-visibility.ts: the detail
     * panel's own action bar keeps BOTH buttons always, deliberately — a
     * human may still want to attach a second verification (another
     * screenshot, another note) before marking done. Only the queue's
     * one-line-per-ask summary collapses the two.
     */
    const ids = new Set(available.map((a) => a.id));
    for (const action of available) {
      if (action.id === "verify" && ids.has("mark-done")) continue;
      entries.push({
        ticket,
        boardKey: boardKeyOf(ticket),
        actionId: action.id,
        label: action.label,
        prompt: QUEUE_PROMPTS[action.id] ?? action.label,
      });
    }
  }
  return entries;
}

/**
 * The full queue: the derived entries, with any agent nomination MERGED onto
 * the entry it matches rather than appended beside it. A nomination is a
 * reason attached to an ask that already exists — the agent cannot invent an
 * action the gate does not allow, so a nomination naming an unavailable
 * action is dropped rather than shown as a button that cannot work.
 *
 * The order comes from `sortKey`. "suggested" (the default) puts the agent's
 * nominations first, because it is pointing at where to look; every other key
 * sorts PURELY by that key, so choosing one does what it says rather than
 * quietly keeping a hidden primary sort.
 */
export function humanQueue<T extends TicketView>(
  tickets: readonly T[],
  evidenceKindsOf: (ticket: T) => EvidenceKinds,
  nominations: readonly Nomination[] = [],
  sortKey: QueueSortKey = "suggested",
  approvals: readonly PendingApprovalLike[] = [],
): QueueEntry[] {
  const entries = derivedQueue(tickets, evidenceKindsOf);
  /*
   * A pending approval is an ask in its own right, not a gate-derived one:
   * the agent requested something and the human has not answered. It is
   * appended rather than derived, because no ticket state implies it.
   */
  for (const approval of approvals) {
    const key = String(approval.ticketId);
    const ticket = tickets.find((t) => boardKeyOf(t) === key);
    if (ticket === undefined) continue;
    const paths = Array.isArray(approval.payload?.paths)
      ? (approval.payload.paths as unknown[]).filter(
          (p): p is string => typeof p === "string",
        )
      : [];
    entries.push({
      ticket,
      boardKey: boardKeyOf(ticket),
      actionId: "allowlist",
      label: "Review request",
      prompt:
        approval.prompt +
        (paths.length > 0 ? ` \u2014 ${paths.length} path(s)` : ""),
      approvalId: approval.id,
      approvalPaths: paths,
    });
  }
  for (const nomination of nominations) {
    /*
     * MATCH ON THE BOARD KEY ONLY (#93 re-review, finding 1).
     *
     * The first fix kept a `String(entry.ticket.id) === key` fallback "for
     * safety" and thereby re-created the very bug it was fixing: own rows are
     * stamped foreign:false so boardKeyOf ALREADY returns String(id) for
     * them, which makes the fallback redundant for own rows and a source of
     * FALSE POSITIVES on foreign ones. A numeric nomination for #12 attached
     * its reason to a foreign `sess-abc:12`, putting the agent's ask on the
     * wrong ticket and pointing its button at a write to the wrong ticket.
     *
     * A numeric nomination can only ever mean an OWN ticket anyway:
     * suggestActions validates against the calling session's own state.
     */
    const key = String(nomination.ticketId);
    const match = entries.find(
      (entry) => entry.boardKey === key && entry.actionId === nomination.actionId,
    );
    if (match === undefined) continue;
    match.nominationReason = nomination.reason;
    match.nominationId = nomination.id;
  }
  return sortQueue(entries, sortKey);
}

/**
 * How the queue is ordered. "suggested" is the default and is the only key
 * that groups: the agent's nominations first, then board order. The rest are
 * pure single-key sorts, because a human who picks "by id" means by id.
 */
export type QueueSortKey = "suggested" | "recent" | "id" | "alpha";

export const QUEUE_SORT_LABELS: Record<QueueSortKey, string> = {
  suggested: "Suggested first",
  recent: "Recently updated",
  id: "Ticket id",
  alpha: "Title A\u2013Z",
};

/**
 * Sort a queue. Returns a NEW array rather than sorting in place, so a caller
 * re-sorting a memoized list cannot mutate what another render is reading.
 */
export function sortQueue(
  entries: readonly QueueEntry[],
  sortKey: QueueSortKey = "suggested",
): QueueEntry[] {
  const rows = [...entries];
  switch (sortKey) {
    case "recent":
      // Newest first: "recently updated" means the freshest at the top.
      return rows.sort(
        (a, b) => b.ticket.updatedAt - a.ticket.updatedAt || a.ticket.id - b.ticket.id,
      );
    case "id":
      return rows.sort((a, b) => a.ticket.id - b.ticket.id);
    case "alpha":
      // localeCompare so accented titles sort where a human expects.
      return rows.sort(
        (a, b) =>
          a.ticket.title.localeCompare(b.ticket.title) || a.ticket.id - b.ticket.id,
      );
    case "suggested":
    default:
      return rows.sort((a, b) => {
        // A pending approval outranks everything: the agent is BLOCKED on it.
        const aApproval = a.approvalId !== undefined ? 0 : 1;
        const bApproval = b.approvalId !== undefined ? 0 : 1;
        if (aApproval !== bApproval) return aApproval - bApproval;
        const aNominated = a.nominationReason !== undefined ? 0 : 1;
        const bNominated = b.nominationReason !== undefined ? 0 : 1;
        if (aNominated !== bNominated) return aNominated - bNominated;
        return a.ticket.phase - b.ticket.phase || a.ticket.order - b.ticket.order;
      });
  }
}

/** The badge count the human sees without opening the queue. */
export function queueCount(entries: readonly QueueEntry[]): number {
  return entries.length;
}

/**
 * Nominations that matched NO entry, with why (#93).
 *
 * `humanQueue` drops an unmatched nomination on purpose -- the agent must not
 * be able to conjure a button the gate refuses. But dropping it SILENTLY made
 * a real bug undiagnosable: an agent nominated #100 for signoff, the human
 * opened the queue, and the row sat in board order with no hint that anything
 * had been proposed or why it did not take. Policy stays; silence goes.
 */
/** The ticket state each human action applies to. */
const ACTION_STATE: Record<string, string> = {
  signoff: "open",
  verify: "awaiting_verification",
  "mark-done": "awaiting_verification",
};

/** Lifecycle order, so "past" can be distinguished from "not yet". */
const STATE_SEQUENCE = ["open", "in_progress", "awaiting_verification", "done"];

export type UnmatchedKind = "fulfilled" | "not-on-board" | "unavailable";

export function unmatchedNominations<T extends TicketView>(
  tickets: readonly T[],
  evidenceKindsOf: (ticket: T) => EvidenceKinds,
  nominations: readonly Nomination[],
): { nomination: Nomination; kind: UnmatchedKind; reason: string }[] {
  const entries = derivedQueue(tickets, evidenceKindsOf);
  const out: { nomination: Nomination; kind: UnmatchedKind; reason: string }[] = [];
  for (const nomination of nominations) {
    const key = String(nomination.ticketId);
    if (entries.some((e) => e.boardKey === key && e.actionId === nomination.actionId)) {
      continue;
    }
    const ticket = tickets.find((t) => boardKeyOf(t) === key);
    if (ticket === undefined) {
      out.push({
        nomination,
        kind: "not-on-board",
        reason:
          "#" + key + " is not on this board (it may belong to another session)",
      });
      continue;
    }
    /*
     * FULFILLED, not broken. The first cut reported every unmatched
     * nomination as a complaint, so signing off #100 -- doing exactly what
     * was asked -- produced "#100 has no available signoff action right now".
     * An ask whose ticket has MOVED PAST the state that action applies to has
     * been answered, and nagging about it is worse than silence.
     */
    const wanted = ACTION_STATE[nomination.actionId];
    const wantedAt = wanted === undefined ? -1 : STATE_SEQUENCE.indexOf(wanted);
    const isAt = STATE_SEQUENCE.indexOf(ticket.state);
    // PAST the state, not merely different from it: an open ticket has not
    // fulfilled a mark-done ask, it has not reached it yet.
    if (wantedAt >= 0 && isAt > wantedAt) {
      out.push({
        nomination,
        kind: "fulfilled",
        reason:
          "#" + key + " is already " + ticket.state + "; the ask was answered",
      });
      continue;
    }
    out.push({
      nomination,
      kind: "unavailable",
      reason:
        "#" + key + " has no available " + nomination.actionId + " action right now",
    });
  }
  return out;
}
