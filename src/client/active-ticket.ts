/**
 * Ticket U2c: the active-ticket derivation.
 *
 * The ticket moved to in_progress becomes the active ticket. This module
 * derives that marker from the projection: the in_progress ticket with the
 * largest updatedAt. No React, no DOM, no dsh imports.
 */

import type { TicketView } from "../kernel/projections";

/**
 * The id of the active ticket: the in_progress ticket with the largest
 * updatedAt. Null when no in_progress ticket exists.
 */
/**
 * The active ROW, not its id (#93 fourth review, finding 1).
 *
 * Returning a bare number forced every caller to re-find the row by id
 * against the MERGED board, where `find` returns the own row first -- so a
 * foreign active ticket highlighted the wrong tile. Handing back the row
 * removes the lookup, and therefore the bug.
 */
export function activeTicketRow(
  tickets: readonly TicketView[],
): TicketView | null {
  let active: TicketView | null = null;
  for (const ticket of tickets) {
    if (ticket.state !== "in_progress") continue;
    if (active === null || ticket.updatedAt > active.updatedAt) {
      active = ticket;
    }
  }
  return active;
}

export function activeTicketId(tickets: readonly TicketView[]): number | null {
  let active: TicketView | null = null;
  for (const ticket of tickets) {
    if (ticket.state !== "in_progress") continue;
    if (active === null || ticket.updatedAt > active.updatedAt) {
      active = ticket;
    }
  }
  return active === null ? null : active.id;
}
