/**
 * #175: what changed on the board, folded from the durable log.
 *
 * ## Why a fold and not a buffer
 *
 * The digest is DELIVERED, not stored: it rides `agent.steer`, so it shares
 * the conversation's fate — compaction drops it, a long turn buries it, and
 * an agent that was mid-step when four signoffs landed may never see them.
 * The obvious repair is a ring buffer of emitted digests, and it is the
 * wrong one: it dies on process restart, it drifts from the board the moment
 * a write bypasses the digest path, and it is new mutable state to keep in
 * sync with state that already exists.
 *
 * The event log is already an append-only record of every board change with
 * a timestamp. Folding it answers "what changed since I last looked" from
 * data that is durable across restarts and CANNOT disagree with the board,
 * because it is the same data the board itself is folded from.
 *
 * ## The boundary, stated rather than discovered
 *
 * This covers BOARD changes only. Some digest lines are not board events —
 * a worktree preparation report, a refused allowlist approval, an injection
 * failure — and they have no log row, so no fold can recover them. The tool
 * that exposes this must SAY so: an agent that believes it has seen
 * everything is worse off than one told what it is missing.
 */

import type { AidosEvent } from "./events";
import type { TicketId, TicketState } from "./types";

/** One board change, in the words a reader needs. */
export interface BoardChange {
  ticketId: TicketId;
  /** Seconds since the epoch, as the log records it. */
  at: number;
  /** What happened, one phrase: "moved open -> in_progress", "evidence …". */
  change: string;
  /** The ticket's title at the time, when the event carried it. */
  title?: string;
  /** The state the ticket landed in, for a move. */
  state?: TicketState;
}

/** A bounded answer that says what it left out. */
export interface RecentChanges {
  changes: BoardChange[];
  /** How many matching changes were not returned. */
  omitted: number;
}

/** The evidence row an attach event carries. */
interface AttachedRow {
  kind: string;
  author: string;
  at: number;
}

/**
 * Fold the log into recent board changes, newest first.
 *
 * `since` is exclusive and optional; `limit` bounds the answer the way every
 * other read is bounded (#92), and `omitted` names what was dropped rather
 * than letting the list trail off.
 */
export function recentBoardChanges(
  events: readonly unknown[],
  options: { limit?: number; since?: number; ticketId?: TicketId } = {},
): RecentChanges {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 200));
  const collected: BoardChange[] = [];

  for (const raw of events) {
    const event = raw as AidosEvent & { kind?: string };
    if (typeof event?.kind !== "string") continue;

    let change: BoardChange | null = null;

    if (event.kind === "ticket/change") {
      const e = event as Extract<AidosEvent, { kind: "ticket/change" }>;
      const ticket = e.ticket;
      change = {
        ticketId: ticket.id,
        at: e.at,
        title: ticket.title,
        state: ticket.state,
        change:
          e.operation === "create"
            ? "created"
            : e.operation === "move"
              ? "moved to " + ticket.state
              : "edited",
      };
    } else if (event.kind === "evidence/attached") {
      const e = event as Extract<AidosEvent, { kind: "evidence/attached" }>;
      const row = e.row as unknown as AttachedRow;
      change = {
        ticketId: e.ticketId,
        at: row.at,
        change: "evidence " + row.kind + " by " + row.author,
      };
    } else if (event.kind === "evidence/detached") {
      const e = event as Extract<AidosEvent, { kind: "evidence/detached" }>;
      change = {
        ticketId: e.ticketId,
        at: e.at,
        change: "evidence detached",
      };
    } else if (event.kind === "comment/added") {
      const e = event as unknown as { ticketId: TicketId; at: number };
      change = { ticketId: e.ticketId, at: e.at, change: "comment added" };
    }

    if (change === null) continue;
    if (options.ticketId !== undefined && change.ticketId !== options.ticketId) continue;
    if (options.since !== undefined && !(change.at > options.since)) continue;
    collected.push(change);
  }

  /*
   * Newest first, and STABLE within one timestamp: the log's own order is
   * the tie-break, because two rows written in the same second are ordered
   * by the log and by nothing else. Reversing after a stable sort preserves
   * that.
   */
  collected.sort((a, b) => a.at - b.at);
  collected.reverse();

  return {
    changes: collected.slice(0, limit),
    omitted: Math.max(0, collected.length - limit),
  };
}
