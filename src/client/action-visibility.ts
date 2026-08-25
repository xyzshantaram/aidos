/**
 * Ticket U2c: the per-state action descriptors.
 *
 * One pure function maps a ticket state to the actions the human may take.
 * The component layer reads the descriptors and renders the matching
 * buttons. No React, no DOM, no dsh imports.
 */

import type { TicketView } from "../kernel/projections";

export type ActionId = "signoff" | "submit-for-review" | "send-back" | "mark-done";

export interface ActionDescriptor {
  id: ActionId;
  label: string;
  primary?: boolean;
}

/**
 * The actions for one ticket state, in render order.
 * - open: signoff (the primary button).
 * - in_progress: submit for review. No primary flag; this action lives in
 *   the spoiler.
 * - awaiting_verification: send-back and mark done (primary).
 * - done: no actions.
 */
export function actionsFor(ticket: TicketView): ActionDescriptor[] {
  switch (ticket.state) {
    case "open":
      return [{ id: "signoff", label: "Sign off", primary: true }];
    case "in_progress":
      return [{ id: "submit-for-review", label: "Submit for review" }];
    case "awaiting_verification":
      return [
        { id: "send-back", label: "Send back" },
        { id: "mark-done", label: "Mark done", primary: true },
      ];
    case "done":
      return [];
  }
}
