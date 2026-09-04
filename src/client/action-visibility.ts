/**
 * Ticket U2c + #62: the per-action descriptors. Every action is always
 * present; availability and the unlock reason ride the descriptor so the
 * action bar can grey buttons out with a tooltip naming what is missing.
 * No React, no DOM, no dsh imports.
 */

import type { TicketView } from "../kernel/projections";

export type ActionId =
  | "signoff"
  | "submit-for-review"
  | "send-back"
  | "verify"
  | "mark-done"
  | "allowlist";

export interface ActionDescriptor {
  id: ActionId;
  label: string;
  primary?: boolean;
  /** Undefined when the action is available now; the unlock hint otherwise. */
  unavailableReason?: string;
}

/** The evidence kinds present on the ticket, from the caller's rows. */
export type EvidenceKinds = readonly string[];

/** Signoff is open → in_progress; the user authors the row. */
function signoffReason(ticket: TicketView): string | undefined {
  if (ticket.state !== "open") {
    return "the ticket is already signed off";
  }
  return undefined;
}

/**
 * Submit for review needs a review_pass, and an automated_check UNLESS the
 * review_pass already covers it (#107).
 *
 * This is the THIRD place the gate rule appears, and the one most likely to
 * be forgotten: the kernel refuses, the projection computes the fraction,
 * and this writes the sentence the human reads. Left unchanged it would keep
 * naming automated_check as required after the gate stopped requiring it --
 * telling the user to do something the button no longer needs.
 *
 * review_pass stays mandatory. It is the expensive evidence: an independent
 * reviewer, or the human. automated_check is the cheap one the agent
 * attaches from its own claim, so excusing it removes ceremony rather than
 * safety. The asymmetry is deliberate and must not be flipped.
 */
function submitReason(
  ticket: TicketView,
  kinds: EvidenceKinds,
): string | undefined {
  if (ticket.state !== "in_progress") {
    return "the ticket must be in progress";
  }
  const present = new Set(kinds);
  if (!present.has("builtin:review_pass")) {
    const missing = ["review_pass (a reviewer subagent or the human reviews first)"];
    if (!present.has("builtin:automated_check")) missing.unshift("automated_check");
    return "requires " + missing.join(", ");
  }
  return undefined;
}

/** Send back is the user-only send-back edge from awaiting_verification. */
function sendBackReason(ticket: TicketView): string | undefined {
  if (ticket.state !== "awaiting_verification") {
    return "the ticket must be awaiting verification";
  }
  return undefined;
}

/**
 * #53: Verify is the one-button authoring of the user_verified row on an
 * awaiting ticket. The row IS the action's product; the mark-done button
 * (next to it) carries the final move, so verify does not move anything.
 */
function verifyReason(ticket: TicketView): string | undefined {
  if (ticket.state !== "awaiting_verification") {
    return "the ticket must be awaiting verification";
  }
  return undefined;
}

/** Mark done needs the user_verified row on an awaiting ticket. */
function markDoneReason(
  ticket: TicketView,
  kinds: EvidenceKinds,
): string | undefined {
  if (ticket.state !== "awaiting_verification") {
    return "the ticket must be awaiting verification";
  }
  if (!kinds.includes("builtin:user_verified")) {
    return "requires user_verified (attach your verification row first)";
  }
  return undefined;
}

/** The allowlist editor edits the write boundary of an in-progress ticket. */
function allowlistReason(ticket: TicketView): string | undefined {
  if (ticket.state !== "in_progress") {
    return "the ticket must be in progress";
  }
  return undefined;
}

/**
 * Every action, always, in render order, each with its availability. The
 * caller renders disabled buttons with `unavailableReason` as the tooltip.
 * `evidenceKinds` feeds the evidence-gated reasons.
 */
export function actionsFor(
  ticket: TicketView,
  evidenceKinds: EvidenceKinds = [],
): ActionDescriptor[] {
  return [
    { id: "signoff", label: "Sign off", primary: true, unavailableReason: signoffReason(ticket) },
    { id: "verify", label: "Verify", unavailableReason: verifyReason(ticket) },
    { id: "submit-for-review", label: "Submit for review", unavailableReason: submitReason(ticket, evidenceKinds) },
    { id: "send-back", label: "Send back", unavailableReason: sendBackReason(ticket) },
    { id: "mark-done", label: "Mark done", primary: true, unavailableReason: markDoneReason(ticket, evidenceKinds) },
    { id: "allowlist", label: "Allowlist", unavailableReason: allowlistReason(ticket) },
  ];
}
