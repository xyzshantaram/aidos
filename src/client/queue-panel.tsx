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

import { humanQueue, unmatchedNominations, QUEUE_SORT_LABELS } from "./human-queue";
import { TicketStrip } from "./ticket-strip";
import { ApprovalRunner } from "./approval-runner";
import { parseCriteria, boardKeyOf } from "./board-logic";

import type {
  Nomination,
  PendingApprovalLike,
  QueueEntry,
  QueueSortKey,
} from "./human-queue";
import type { RunOutcome, Step } from "./approval-runner";
import type { ActionId } from "./action-visibility";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRow } from "../kernel/types";

export interface QueuePanelProps {
  tickets: readonly TicketView[];
  /** Keyed exactly as the board keys it, so foreign rows resolve too. */
  evidenceByTicket: Record<string, readonly EvidenceRow[]>;
  nominations?: readonly Nomination[];
  /** Pending approval cards for this session (#51), surfaced as asks. */
  approvals?: readonly PendingApprovalLike[];
  /** Opens a ticket in the detail panel. */
  /** Opens the ticket in the detail panel, addressed by its BOARD key. */
  onOpen: (entry: QueueEntry) => void;
  /** Performs the action. Resolves when the board has been written. */
  onAct: (entry: QueueEntry, outcome: RunOutcome) => Promise<void>;
  /** A failed fetch, so an empty queue is never mistaken for a working one. */
  error?: string | null;
  /** Re-fetch on demand. */
  onRefresh?: () => void;
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
  /*
   * An approval entry is not a gate ask: the agent proposed something and is
   * BLOCKED until answered. It runs a path-list step pre-filled with what was
   * proposed, so the human edits or accepts in place -- the shape #98 wants
   * for signoff too.
   */
  if (entry.approvalId !== undefined) {
    return [
      {
        kind: "path-list",
        title: "Approve file access for " + entry.ticket.title,
        prompt:
          "The agent proposed these paths. Edit or remove any of them; " +
          "approving grants write access to exactly this list.",
        label: "Paths (one per line)",
        paths: entry.approvalPaths ?? [],
      },
    ];
  }
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
  const [sortKey, setSortKey] = react.useState<QueueSortKey>("suggested");

  const entries = humanQueue(
    props.tickets,
    // The BOARD key, not the bare id: a foreign ticket's evidence is filed
    // under `sourceSessionId:id`, so String(ticket.id) read the wrong rows.
    (ticket) =>
      (props.evidenceByTicket[boardKeyOf(ticket)] ?? []).map((row) => row.kind),
    props.nominations ?? [],
    sortKey,
    props.approvals ?? [],
  );

  const suggested = entries.filter((e) => e.nominationReason !== undefined).length;
  // Only ASKS THAT NEED ATTENTION are surfaced. A fulfilled nomination means
  // the human did the thing; saying so would be nagging about success.
  const unmatched = unmatchedNominations(
    props.tickets,
    (ticket) =>
      (props.evidenceByTicket[boardKeyOf(ticket)] ?? []).map((row) => row.kind),
    props.nominations ?? [],
  );

  /*
   * An error must never render as an empty queue: "nothing is waiting on you"
   * and "I could not find out" are opposite messages.
   */
  if (props.error != null && props.error !== "") {
    return (
      <div className="aidos-queue">
        <p className="aidos-queue-empty">
          {"Could not load the queue: " + props.error}
        </p>
        {props.onRefresh !== undefined ? (
          <button className="aidos-btn" onClick={props.onRefresh}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

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
      <div className="aidos-queue-head">
        <span className="aidos-queue-count">
          {entries.length + (entries.length === 1 ? " ask" : " asks")}
          {suggested > 0 ? " \u00b7 " + suggested + " suggested by the agent" : ""}
        </span>
        <label className="aidos-queue-sort">
          <span>Sort</span>
          <select
            className="aidos-select"
            value={sortKey}
            onChange={(event) => {
              setSortKey(event.target.value as QueueSortKey);
            }}
          >
            {(Object.keys(QUEUE_SORT_LABELS) as QueueSortKey[]).map((key) => (
              <option key={key} value={key}>
                {QUEUE_SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {unmatched.length > 0 ? (
        <ul className="aidos-queue-unmatched">
          {unmatched.map((row) => (
            <li key={row.nomination.id}>
              {"The agent suggested " +
                row.nomination.actionId +
                " but it is not shown: " +
                row.reason}
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="aidos-ticket-strips">
        {entries.map((entry) => (
          <TicketStrip
            key={entry.boardKey + ":" + entry.actionId}
            ticket={entry.ticket}
            highlighted={
              entry.nominationReason !== undefined || entry.approvalId !== undefined
            }
            awaitingApproval={entry.approvalId !== undefined}
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
              props.onOpen(entry);
            }}
            actions={
              <>
                {/*
                  * DISMISS COMES FIRST, and that ordering is the fix for the
                  * gap the user reported.
                  *
                  * With the primary button first, the grid had to RESERVE a
                  * Dismiss column on every row so the primary stayed
                  * aligned -- and on the many rows with no Dismiss that
                  * reserved column rendered as a wide empty space beside
                  * "Sign off".
                  *
                  * Put first, Dismiss occupies an auto-width column that
                  * collapses to nothing when absent, so the primary button
                  * sits flush right at the SAME position on every row with
                  * no hole -- and the space it was wasting goes back to the
                  * ticket's description, which the user also asked for.
                  */}
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
                <button
                  className="aidos-btn aidos-btn-primary"
                  onClick={() => {
                    setRunning(entry);
                  }}
                >
                  {entry.label}
                </button>
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
              /*
               * A rejected APPROVAL must still reach onAct: the pending card
               * has to be resolved or it lingers forever and the agent is
               * never told. A rejected gate ask writes nothing, so it just
               * closes.
               */
              if (running.approvalId === undefined) {
                setRunning(null);
                return;
              }
            }
            setWorking(true);
            void props
              .onAct(running, outcome)
              .then(() => {
                // Only a SUCCESSFUL action closes the modal.
                setWorking(false);
                setRunning(null);
              })
              .catch(() => {
                /*
                 * #93 review, finding 4: the first cut swallowed the failure
                 * and closed the modal as if the write had landed, so a
                 * refusal showed only as a toast over a dismissed dialog.
                 * Keep the modal open on failure — the caller has already
                 * surfaced the reason — so the human can retry or cancel
                 * deliberately rather than wonder whether it worked.
                 */
                setWorking(false);
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
      (evidenceByTicket[boardKeyOf(ticket)] ?? []).map((row) => row.kind),
    nominations,
  );
}

export type { ActionId };
