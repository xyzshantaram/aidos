/**
 * #174: what this ticket needs next, DERIVED from the gate.
 *
 * ## The failure this exists for
 *
 * The board knows exactly what a ticket needs — the gate names the missing
 * kinds, the allowlist is empty or it is not — and it told the agent none of
 * it. The agent was expected to recall the lifecycle from a system-prompt
 * section it read once, thousands of tokens ago, and the observed result is
 * a catalogue of compliance failures: work started without an allowlist so
 * every write is refused; tickets left in `in_progress` after their tests
 * pass; evidence never attached, so finished work cannot satisfy a gate;
 * status delivered in chat instead of onto the ticket. None of those are
 * knowledge gaps. They are the agent not recalling a rule at the moment it
 * applies, which is a problem a document cannot fix and a field can.
 *
 * ## DERIVED, NEVER WRITTEN — the rule that makes it worth having
 *
 * Every sentence this module produces comes from `isMissing` over the SAME
 * gate the transition is checked against. Guidance that says "attach
 * automated_check" on a ticket whose gate is already satisfied is worse than
 * silence: it teaches the reader to skip the field, and then it is gone as a
 * channel. #107 settled the equivalent point for the gate FRACTION — the
 * refusal and the board's fraction had to share one implementation or a
 * ticket the gate would pass still rendered as blocked — and this joins that
 * function rather than restating its conclusions.
 *
 * The corollary: when nothing is missing, this returns `undefined`. Absent,
 * not empty, so a caller can branch on it and a card can omit the row
 * entirely.
 *
 * ## It states the CONSTRAINT, not a plan
 *
 * "needs builtin:review_pass, which only an independent review supplies" —
 * not "dispatch a reviewer, then write a summary, then move it". The board
 * owns what is required and who may supply it; the agent owns how. Prose
 * that plans the work is prompt text pretending to be a mechanism, and it
 * ages badly the moment the approach changes.
 */

import { isMissing } from "./gates";
import type { AidosConfig, GateDef, TicketState } from "./types";

/** The ticket facts this derivation reads. A snapshot or a view satisfies it. */
export interface NextStepInput {
  state: TicketState;
  /** The per-ticket file allowlist. Empty means the agent may write nothing. */
  allowlist?: readonly string[];
  /** The ticket's acceptance criteria, verbatim. Empty means ungrilled. */
  criteria?: string;
}

/** Who can supply one kind, in the words a reader needs. */
const SUPPLIER: Record<string, string> = {
  "builtin:user_signoff": "which only you can give",
  "builtin:user_verified": "which only you can give",
  "builtin:review_pass": "which only an independent review supplies",
  "builtin:automated_check":
    "which is the agent's own record of a check it ran",
  "builtin:user_commit":
    "which the host resolves from a real commit hash (attach_commit)",
  "builtin:file_allowlist": "which an approved allowlist writes",
};

/** The gate governing one state's forward move, if any. */
function forwardGate(config: AidosConfig, from: TicketState): GateDef | undefined {
  return config.gates.find((gate) => gate.fromState === from && gate.toState !== from);
}

/** Name one missing kind and who supplies it. */
function nameKind(kind: string): string {
  const short = kind.replace(/^builtin:/, "");
  const who = SUPPLIER[kind];
  return who === undefined ? short : short + " (" + who + ")";
}

/**
 * The next step for one ticket, or undefined when it needs nothing.
 *
 * `attached` is the set of evidence kinds already on the ticket — the same
 * set the gate builds, passed in rather than recomputed so the two cannot
 * diverge.
 */
export function nextStep(
  config: AidosConfig,
  ticket: NextStepInput,
  attached: ReadonlySet<string>,
): string | undefined {
  if (ticket.state === "done") return undefined;

  const gate = forwardGate(config, ticket.state);
  const missing =
    gate === undefined
      ? []
      : gate.requiredKinds.filter((kind) => isMissing(gate, attached, kind));

  /*
   * A ticket in `open` is the one case where the gate alone under-describes
   * the work. Signoff is what moves it, but signoff with no allowlist grants
   * write access to NOTHING (#98) and a ticket with no criteria cannot be
   * reviewed against anything later — so the step names those first, in the
   * order they have to happen.
   */
  if (ticket.state === "open") {
    const hasCriteria = (ticket.criteria ?? "").trim() !== "";
    const hasAllowlist = (ticket.allowlist ?? []).length > 0;
    if (!hasCriteria) {
      return (
        "this ticket has no criteria yet: state what will be built, how each " +
        "part is tested, and what it is NOT addressing, then propose the files " +
        "it needs — signoff can grant them in the same step"
      );
    }
    if (!hasAllowlist) {
      return (
        "propose the files this ticket needs (request_allowlist): signoff on " +
        "its own grants write access to nothing, and the boundary then refuses " +
        "every write"
      );
    }
    return missing.length === 0
      ? undefined
      : "ready for " + missing.map(nameKind).join(" and ");
  }

  if (missing.length === 0) {
    /*
     * Nothing missing is itself a step when the ticket is not where it
     * belongs: the gate opens and the move has not been made. This is the
     * "finished work still sitting in in_progress" case, which is invisible
     * on a board and expensive — nobody reviews what does not look ready.
     */
    if (ticket.state === "in_progress") {
      return "the gate is satisfied: move it to awaiting_verification";
    }
    return undefined;
  }

  return "still needs " + missing.map(nameKind).join(" and ");
}
