/**
 * The gate engine. A pure function used identically by the agent tool and
 * the human Remote. SPEC.md section 9 is the contract.
 */

import { STATE_ORDER } from "./types";
import { GateRefused } from "./types";
import type { EvidenceRow } from "./types";
import type { AidosConfig, Actor, TicketSnapshot, TicketState } from "./types";

/**
 * Say whether one transition is legal. The legal moves are the forward
 * steps of STATE_ORDER, the send-back edge awaiting_verification ->
 * in_progress, and a self-transition. A skipped state (for example
 * open -> done) is illegal even when a gate exists for it (SPEC decision
 * 3). A self-transition still needs its own configured gate: deny by
 * default holds for every pair.
 */
export function isLegalTransition(
  fromState: TicketState,
  toState: TicketState,
): boolean {
  if (fromState === toState) {
    return true;
  }
  const index = STATE_ORDER.indexOf(fromState);
  if (index >= 0 && index + 1 < STATE_ORDER.length) {
    if (STATE_ORDER[index + 1] === toState) {
      return true;
    }
  }
  return fromState === "awaiting_verification" && toState === "in_progress";
}

/**
 * Refuse or allow one transition.
 * Throws GateRefused on refusal. Returns on allow.
 */
export function checkGate(
  config: AidosConfig,
  ticket: TicketSnapshot,
  evidence: readonly EvidenceRow[],
  toState: TicketState,
  actor: Actor,
): void {
  const fromState = ticket.state;

  // 1. The pair must be a legal move. The store checks this before calling
  //    checkGate; this re-check serves callers that skip the store.
  if (!isLegalTransition(fromState, toState)) {
    throw new GateRefused({
      noGate: true,
      fromState,
      toState,
      actor,
    });
  }

  // 2. Deny by default: no gate for the exact pair.
  const gate = config.gates.find(
    (candidate) =>
      candidate.fromState === fromState && candidate.toState === toState,
  );
  if (!gate) {
    throw new GateRefused({
      noGate: true,
      fromState,
      toState,
      actor,
    });
  }

  const attached = new Set<string>();
  for (const row of evidence) {
    attached.add(row.kind);
  }
  const missing = gate.requiredKinds.filter((kind) => !attached.has(kind));

  // 3 and 4. A disallowed actor and an absent kind refuse together, so one
  //    refusal names both the absent kinds and the gate's actors.
  if (missing.length > 0 || !gate.allowedActors.includes(actor)) {
    throw new GateRefused({
      missingKinds: missing,
      allowedActors: gate.allowedActors,
      fromState,
      toState,
      actor,
    });
  }
}
