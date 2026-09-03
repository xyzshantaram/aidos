/**
 * #93: the HUMAN WORK QUEUE panel — "here is what is waiting on you".
 *
 * It renders `humanQueue`'s entries as TicketStrips, each carrying the one
 * action that is actually available. Two sources feed it and the panel does
 * not care which: the DERIVED entries (computed from board state, present
 * even with no agent running) and the agent's NOMINATIONS, which only add a
 * reason to an ask that already exists.
 *
 * Cheap actions resolve through the runner's single confirm step. Actions
 * needing more input (paths, criteria) hand the caller a step list and let
 * the runner collect it — the panel never builds a modal of its own.
 */
import react from "react";

import { humanQueue } from "./human-queue";
import { TicketStrip } from "./ticket-strip";
import { ApprovalRunner } from "./approval-runner";
import { parseCriteria } from "./board-logic";

import type { Nomination, QueueEntry } from "./human-queue";
import type { RunOutcome, Step } from "./approval-runner";
import type { ActionId } from "./action-visibility";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRow } from "../kernel/types";

export interface QueuePanelProps {
  tickets: readonly TicketView[];
  /** Keyed exactly as the board keys it, so foreign rows resolve too. */
  evidenceByTicket: Record<string, readonly EvidenceRow[]>;
  nominations?: readonly Nomination[];
  /** Opens a ticket in the detail panel. */
  onOpen: (ticket: TicketView) => void;
  /** Performs the action. Resolves when the board has been written. */
  onAct: (entry: QueueEntry, outcome: RunOutcome) => Promise<void>;
  /** Drops a nomination without acting on it. */
  onDismiss?: (nominationId: string) => void;
}

/** The step list an action collects before it can be performed. */
function stepsFor(entry: QueueEntry): Step[] {
  /*
   * The criterion picker belongs ONLY to verify. Signoff authorises work to
   * START — nothing is proven yet, so there is no criterion to attest, and
   * offering one invites a meaningless link. Mark-done attaches no evidence
   * row at all (it is purely a move), so it has nothing to link either.
   */
  const criteria =
    entry.actionId === "verify" ? parseCriteria(entry.ticket.criteria ?? "") : [];
  const titles: Record<string, string> = {
    signoff: "Sign off on " + entry.ticket.title,
    verify: "Verify " + entry.ticket.title,
    "mark-done": "Mark " + entry.ticket.title + " done",
  };
  const prompts: Record<string, string> = {
    signoff:
      "Signing off moves this to in progress and grants the agent write access " +
      "inside its allowlist.",
    verify: "Attaches your user_verified row. It does not move the ticket.",
    "mark-done": "This is the final state. Only you can set it.",
  };
  return [
    {
      kind: "confirm",
      title: titles[entry.actionId] ?? entry.label,
      prompt: prompts[entry.actionId],
      noteLabel: "Note (optional)",
      criteria: criteria.length > 0 ? criteria : undefined,
    },
  ];
}

export function QueuePanel(props: QueuePanelProps) {
  const [running, setRunning] = react.useState<QueueEntry | null>(null);
  const [working, setWorking] = react.useState(false);

  const entries = humanQueue(
    props.tickets,
    (ticket) =>
      (props.evidenceByTicket[String(ticket.id)] ?? []).map((row) => row.kind),
    props.nominations ?? [],
  );

  if (entries.length === 0) {
    return (
      <div className="aidos-queue">
        <p className="aidos-queue-empty">
          Nothing is waiting on you. Every ticket is either with the agent or done.
        </p>
      </div>
    );
  }

  return (
    <div className="aidos-queue">
      <ul className="aidos-ticket-strips">
        {entries.map((entry) => (
          <TicketStrip
            key={String(entry.ticket.id) + ":" + entry.actionId}
            ticket={entry.ticket}
            highlighted={entry.nominationReason !== undefined}
            meta={
              entry.nominationReason !== undefined ? (
                <span className="aidos-queue-reason">
                  {"the agent asks: " + entry.nominationReason}
                </span>
              ) : (
                entry.prompt
              )
            }
            onOpen={() => {
              props.onOpen(entry.ticket);
            }}
            actions={
              <>
                <button
                  className="aidos-btn aidos-btn-primary"
                  onClick={() => {
                    setRunning(entry);
                  }}
                >
                  {entry.label}
                </button>
                {entry.nominationId !== undefined && props.onDismiss !== undefined ? (
                  <button
                    className="aidos-btn"
                    title="Drop this suggestion without acting on it"
                    onClick={() => {
                      props.onDismiss?.(entry.nominationId as string);
                    }}
                  >
                    Dismiss
                  </button>
                ) : null}
              </>
            }
          />
        ))}
      </ul>
      {running !== null ? (
        <ApprovalRunner
          title={running.label}
          steps={stepsFor(running)}
          working={working}
          onClose={() => {
            if (!working) setRunning(null);
          }}
          onResolve={(outcome: RunOutcome) => {
            if (outcome.status === "rejected") {
              setRunning(null);
              return;
            }
            setWorking(true);
            void props
              .onAct(running, outcome)
              .catch(() => undefined)
              .then(() => {
                setWorking(false);
                setRunning(null);
              });
          }}
        />
      ) : null}
    </div>
  );
}

/** Re-exported so a caller can render the badge without importing the logic. */
export function queueEntriesFor(
  tickets: readonly TicketView[],
  evidenceByTicket: Record<string, readonly EvidenceRow[]>,
  nominations: readonly Nomination[] = [],
): QueueEntry[] {
  return humanQueue(
    tickets,
    (ticket) =>
      (evidenceByTicket[String(ticket.id)] ?? []).map((row) => row.kind),
    nominations,
  );
}

export type { ActionId };
