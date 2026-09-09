/**
 * #108: the RETIRED panel and the retire dialog — the one module for the
 * retirement UI, so the one-flow rule (#98, extended to retirement) holds by
 * construction: every surface that retires or un-retires reaches the host's
 * `userRetireTicket` / `userUnretireTicket` remotes THROUGH THIS FILE.
 *
 * The panel is the "special panel" the owner asked for: it lists every
 * retired ticket with its reason, who retired it and when, and what
 * superseded it — each row rendered through the SHARED TicketStrip (#93),
 * never a second ticket-row implementation — with an un-retire action in
 * place.
 *
 * The dialog is the retire entry from the ticket's own detail panel. It is
 * deliberately the only place that offers the write from the ticket: the
 * queue never retires, and no other surface grows a copy.
 */
import react from "react";

import { callAidosRemote, AidosRemoteError } from "./remote";
import { showToast } from "./toast-store";
import { TicketStrip } from "./ticket-strip";
import { UnretireIcon } from "./icons";
import { ModalShell, NoteField, LinesField, linesOf } from "./ui";
import { boardKeyOf } from "./board-logic";
import { logDebug } from "./log";

import type { BoardKey } from "./board-logic";
import type { TicketView } from "../kernel/projections";

/**
 * One row of the retiredTickets Remote's answer, read STRUCTURALLY — the
 * client never imports host types, and the strip renders the fields named
 * here. The authoritative shape lives in src/host/aidos-core.ts
 * (`RetiredTicketRow`) and the u108 suite asserts the two agree.
 */
export interface RetiredTargetLike {
  ref: string;
  id: number;
  title: string;
  state: string;
  workspaceKey: string;
  sourceSessionId: string;
  known: boolean;
}

export interface RetiredRowLike {
  id: number;
  title: string;
  /** The ticket's state, exactly as TicketStrip renders it. */
  state: TicketView["state"];
  slug: string;
  workspaceKey: string;
  sourceSessionId: string;
  foreign?: boolean;
  retirement: {
    at: number;
    author: string;
    reason: string | null;
    supersededBy: string[];
    supersededByTickets: RetiredTargetLike[];
    chainTerminals: string[];
    chainCycle: boolean;
  };
}

// ---- the panel ---------------------------------------------------------------

export interface RetiredPanelProps {
  sessionId: string;
  /** Jump the board's selection (supersede targets, the row itself). */
  onOpen?: (key: BoardKey) => void;
}

/** A short human date for the "retired when" line. */
function retiredWhen(at: number): string {
  return new Date(at * 1000).toLocaleString();
}

export function RetiredPanel(props: RetiredPanelProps) {
  const [rows, setRows] = react.useState<RetiredRowLike[] | null>(null);
  const [error, setError] = react.useState<string | null>(null);
  const [workingKey, setWorkingKey] = react.useState<string | null>(null);
  const [expandedKey, setExpandedKey] = react.useState<BoardKey | null>(null);

  const refresh = react.useCallback(function () {
    setError(null);
    callAidosRemote("retiredTickets", {}, props.sessionId)
      .then((result) => {
        const tickets = (result as { tickets?: RetiredRowLike[] }).tickets ?? [];
        setRows(tickets);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [props.sessionId]);

  react.useEffect(function () {
    logDebug("retired panel opened");
    refresh();
  }, [refresh]);

  async function unretire(row: RetiredRowLike) {
    const key = boardKeyOf(row);
    if (workingKey !== null) return;
    setWorkingKey(key);
    try {
      await callAidosRemote("userUnretireTicket", { ticketId: key }, props.sessionId);
      showToast("Un-retired — the ticket is back on the board", "success");
      refresh();
    } catch (err) {
      if (err instanceof AidosRemoteError) {
        showToast(err.message, "refusal");
      } else {
        showToast(String(err), "refusal");
      }
    } finally {
      setWorkingKey(null);
    }
  }

  if (error !== null) {
    return (
      <div className="aidos-retired-panel">
        <p className="aidos-retired-error">
          The retired list could not be read: {error}
        </p>
        <button className="aidos-btn" onClick={refresh}>
          Retry
        </button>
      </div>
    );
  }
  if (rows === null) {
    return (
      <div className="aidos-retired-panel" role="status">
        <span className="aidos-merge-spinner" aria-hidden="true" />
        <span className="aidos-retired-empty">Loading retired tickets…</span>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="aidos-retired-panel">
        <p className="aidos-retired-empty">
          Nothing is retired. Retired tickets are hidden from the board, the
          queue and the agent's reads — they appear here until un-retired.
        </p>
      </div>
    );
  }
  return (
    <ul className="aidos-retired-panel">
      {rows.map((row) => {
        const key = boardKeyOf(row);
        const retirement = row.retirement;
        const reason = retirement.reason ?? "(no reason given)";
        const directTargets = retirement.supersededByTickets;
        const onward = retirement.chainTerminals.filter(
          (ref) => !retirement.supersededBy.includes(ref),
        );
        return (
          <TicketStrip
            key={key}
            ticket={row}
            working={workingKey === key}
            expanded={expandedKey === key}
            onToggleActions={() => {
              setExpandedKey(expandedKey === key ? null : key);
            }}
            actionIcon={<UnretireIcon />}
            actionHint="Un-retire this ticket"
            actions={
              <button
                className="aidos-btn aidos-btn-primary"
                disabled={workingKey === key}
                title="Puts the ticket back on the board exactly as it was"
                data-dsh-tip=""
                onClick={() => {
                  void unretire(row);
                }}
              >
                Un-retire
              </button>
            }
            onOpen={
              props.onOpen === undefined ? undefined : () => props.onOpen?.(key)
            }
            meta={
              <>
                <span title={reason} data-dsh-tip="">{reason}</span>
                <span>
                  {" — by "}
                  {retirement.author}
                  {" · "}
                  {retiredWhen(retirement.at)}
                </span>
                {directTargets.length > 0 ? (
                  <span className="aidos-retired-supersede">
                    {directTargets
                      .map((target) =>
                        target.known
                          ? `#${target.id} ${target.title}`
                          : target.ref,
                      )
                      .join(", ")}
                  </span>
                ) : null}
                {onward.length > 0 ? (
                  <span className="aidos-retired-supersede">
                    chain ends at {onward.join(", ")}
                  </span>
                ) : null}
                {retirement.chainCycle ? (
                  <span className="aidos-retired-supersede">
                    supersede cycle cut here
                  </span>
                ) : null}
              </>
            }
          />
        );
      })}
    </ul>
  );
}

// ---- the retire dialog ---------------------------------------------------------

export interface RetireDialogProps {
  open: boolean;
  ticketId: number | string;
  ticketTitle: string;
  agentId: string;
  onClose: () => void;
  onRetired: () => void;
}

/**
 * The retire entry from the ticket's detail panel. The write goes to the
 * host's `userRetireTicket` Remote — the ONE implementation, which validates
 * the supersede references and refuses when live tickets depend on this one.
 * The refusal names every dependent, and the dialog surfaces it as-is so the
 * human can act on the named tickets rather than hunt for them.
 */
export function RetireDialog(props: RetireDialogProps) {
  const [working, setWorking] = react.useState(false);
  const [reason, setReason] = react.useState("");
  const [supersedesText, setSupersedesText] = react.useState("");

  react.useEffect(function () {
    if (props.open) logDebug("retire dialog opened");
  }, [props.open]);

  if (!props.open) return null;

  async function confirm() {
    if (working) return;
    setWorking(true);
    const refs = linesOf(supersedesText);
    try {
      await callAidosRemote(
        "userRetireTicket",
        {
          ticketId: props.ticketId,
          ...(reason.trim() === "" ? {} : { reason: reason.trim() }),
          ...(refs.length > 0 ? { supersededBy: refs } : {}),
        },
        props.agentId,
      );
      showToast("Retired — hidden from the board until un-retired", "success");
      props.onClose();
      props.onRetired();
    } catch (error) {
      if (error instanceof AidosRemoteError) {
        showToast(error.message, "refusal");
      } else {
        showToast(String(error), "refusal");
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <ModalShell
      title="Retire ticket"
      working={working}
      onClose={props.onClose}
      onConfirm={confirm}
      confirmLabel="Retire"
    >
      <p className="aidos-modal-body">
        {`Retiring "${props.ticketTitle}" hides it from the board grid, the ` +
          "filter counts, the tab badge, the human queue, the plan render and " +
          "the agent's board reads. Nothing is deleted: the Retired panel " +
          "lists it, and un-retiring restores it exactly as it was."}
      </p>
      <NoteField
        label="Reason (optional — the panel shows it)"
        value={reason}
        working={working}
        onChange={setReason}
      />
      <LinesField
        label={"Superseded by (one ticket reference per line, optional) — where the work went, e.g. " + "workspace-key:12"}
        value={supersedesText}
        working={working}
        onChange={setSupersedesText}
      />
    </ModalShell>
  );
}
