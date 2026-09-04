/**
 * #73: the aidos tools' conversation cards.
 *
 * #71 took the host side as far as it goes -- each tool declares up to four
 * TEXT chips. Text cannot show a ticket's title, render an evidence strip,
 * or carry a button, so the rest needs a client toolview.
 *
 * What these add over the host chips:
 *  - a ticket's TITLE, not a bare number (resolved from the board's own
 *    title index, best-effort);
 *  - a real EvidenceStrip for evidence-bearing calls -- the same component
 *    the evidence panel, the criteria panel and the mark-done modal use, so
 *    one evidence row looks identical everywhere it appears;
 *  - a click that selects the ticket on the board.
 *
 * The host chips remain the FALLBACK: aidos stays fully usable with this
 * client half absent, which is one of the ticket's criteria and the reason
 * the display work could land before the navigation work.
 *
 * The row chrome is tool-render's, via the stylesheet vendored in #82, so an
 * aidos call sits in the transcript looking like every other tool call
 * rather than like a foreign widget.
 */

import react from "react";

import { EvidenceStrip } from "./evidence-strip";
import { asBoardKey } from "./board-logic";
import { setSelection, ticketTitle } from "./view-state";
import {
  argsRawOf,
  errorTextOf,
  firstLineOfError,
  parseArgs,
  resultTextOf,
  rowStateOf,
  type RowState,
} from "./tool-block";

export interface AidosViewProps {
  block: unknown;
  sessionId?: string;
}

/** The ticket id a call names, from its arguments or its result. */
function ticketIdOf(args: Record<string, unknown> | null, result: unknown): string | null {
  const fromArgs = args?.ticketId;
  if (typeof fromArgs === "number" || typeof fromArgs === "string") return String(fromArgs);
  if (result !== null && typeof result === "object") {
    const value = (result as Record<string, unknown>).ticketId;
    if (typeof value === "number" || typeof value === "string") return String(value);
  }
  return null;
}

/** The tool's JSON result, or null when it has not settled or is not JSON. */
function resultOf(block: unknown): Record<string, unknown> | null {
  const text = resultTextOf(block);
  if (text === null || text === "") return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * `#14 — Some ticket title`, or `#14` when the board has not published a
 * title yet. Never blank: the id is always worth showing.
 */
function ticketLabel(ticketId: string | null): string | null {
  if (ticketId === null) return null;
  const title = ticketTitle(ticketId);
  return title === null ? `#${ticketId}` : `#${ticketId} — ${title}`;
}

interface RowProps {
  title: string;
  summary: string;
  state: RowState;
  body?: react.ReactNode | null;
  errorSummary?: string;
  /** Selecting this ticket on the board when the summary is clicked. */
  ticketId?: string | null;
  sessionId?: string;
}

function AidosRow(props: RowProps) {
  const [expanded, setExpanded] = react.useState(false);
  const body = props.body ?? null;
  const expandable = body !== null;
  const open = expanded && expandable;
  const showsError = props.state === "error" && props.errorSummary !== undefined;
  const shown = showsError ? props.errorSummary : props.summary;

  /*
   * CLICK-THROUGH, and the fallback #73 required be decided explicitly.
   *
   * No API in the conversation contract activates a `conversation.view` tab
   * programmatically -- searched dsh-client-ui-conversation and
   * dsh-client-runtime for activate/setActive/selectView. So a click SELECTS
   * the ticket in the board's module-level store and the board opens there
   * when the user switches tabs.
   *
   * That store exists because of #100: the selection had to live outside
   * React state to survive the slot remount a badge change causes. The same
   * property makes it writable from here, outside the board's tree.
   *
   * One click short of true navigation, and recorded as the accepted shape
   * rather than discovered later. It becomes real click-through the moment
   * dsh grows an activation API: only this handler changes.
   */
  const canSelect =
    props.ticketId !== null && props.ticketId !== undefined && props.sessionId !== undefined;
  const select = canSelect
    ? (event: react.MouseEvent | react.KeyboardEvent) => {
        event.stopPropagation();
        setSelection(props.sessionId as string, asBoardKey(props.ticketId as string));
      }
    : undefined;

  return (
    <div className="tool-render-card" data-error={props.state === "error" || undefined}>
      <div
        className="tool-render-row"
        data-state={props.state}
        data-expandable={expandable ? true : undefined}
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? open : undefined}
        onClick={expandable ? () => setExpanded(!expanded) : undefined}
        onKeyDown={
          expandable
            ? (event: react.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setExpanded(!expanded);
                }
              }
            : undefined
        }
      >
        <span className="tool-render-leading" aria-hidden="true">
          {open ? "▾" : props.state === "error" || props.state === "stopped" ? "●" : "▸"}
        </span>
        <span className="tool-render-title">{props.title}</span>
        <span className="tool-render-sep" aria-hidden="true" />
        {select !== undefined && !showsError ? (
          <span
            className="tool-render-path"
            role="link"
            tabIndex={0}
            title={"Select " + shown + " on the board"}
            onClick={select}
            onKeyDown={(event: react.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                select(event);
              }
            }}
          >
            {shown}
          </span>
        ) : (
          <span className="tool-render-summary" tool-render-error={showsError ? true : undefined}>
            {shown}
          </span>
        )}
      </div>
      {open ? <div className="tool-render-body">{body}</div> : null}
    </div>
  );
}

/** Everything the rows share: parse once, decide once. */
function useAidosRow(props: AidosViewProps) {
  const args = parseArgs(argsRawOf(props.block));
  const state = rowStateOf(props.block);
  const result = resultOf(props.block);
  const ticketId = ticketIdOf(args, result);
  const errorText = state === "error" ? errorTextOf(props.block) : null;
  const errorSummary =
    errorText !== null && errorText !== "" ? firstLineOfError(errorText) : undefined;
  return { args, state, result, ticketId, errorSummary };
}

export function AttachEvidenceRow(props: AidosViewProps) {
  const { args, state, result, ticketId, errorSummary } = useAidosRow(props);
  const kind = typeof args?.kind === "string" ? args.kind : undefined;
  /*
   * The EVIDENCE STRIP, and the criterion's whole point: this is literally
   * the component the evidence panel, the criteria panel and the mark-done
   * modal render, so one evidence row looks identical everywhere it appears.
   * A lookalike built here would drift from it -- which is exactly what #82
   * proved when three hand-written approximations of tool-render all failed.
   */
  const body =
    state !== "error" && kind !== undefined ? (
      <ul className="aidos-evidence-strips">
        <EvidenceStrip
          row={{
            kind: kind.startsWith("builtin:") ? kind : "builtin:" + kind,
            payload: (args?.payload as Record<string, unknown>) ?? {},
            author: "agent",
            at: typeof result?.updatedAt === "number" ? result.updatedAt : undefined,
          }}
        />
      </ul>
    ) : null;
  return (
    <AidosRow
      title="Attach evidence"
      summary={ticketLabel(ticketId) ?? "evidence"}
      state={state}
      body={body}
      errorSummary={errorSummary}
      ticketId={ticketId}
      sessionId={props.sessionId}
    />
  );
}

export function MoveTicketRow(props: AidosViewProps) {
  const { args, state, ticketId, errorSummary } = useAidosRow(props);
  const to = typeof args?.to === "string" ? args.to : null;
  const label = ticketLabel(ticketId);
  return (
    <AidosRow
      title="Move ticket"
      summary={to === null ? (label ?? "move") : `${label ?? ""} → ${to}`.trim()}
      state={state}
      errorSummary={errorSummary}
      ticketId={ticketId}
      sessionId={props.sessionId}
    />
  );
}

export function SetTicketRow(props: AidosViewProps) {
  const { args, state, result, ticketId, errorSummary } = useAidosRow(props);
  const created = result?.created === true;
  // A create names its new title; an edit names the ticket it changed.
  const title = typeof args?.title === "string" ? args.title : null;
  const summary = created && title !== null ? `#${ticketId ?? "?"} — ${title}` : ticketLabel(ticketId);
  return (
    <AidosRow
      title={created ? "Create ticket" : "Edit ticket"}
      summary={summary ?? "ticket"}
      state={state}
      errorSummary={errorSummary}
      ticketId={ticketId}
      sessionId={props.sessionId}
    />
  );
}

export function GetTicketRow(props: AidosViewProps) {
  const { state, ticketId, errorSummary } = useAidosRow(props);
  return (
    <AidosRow
      title="Read ticket"
      summary={ticketLabel(ticketId) ?? "ticket"}
      state={state}
      errorSummary={errorSummary}
      ticketId={ticketId}
      sessionId={props.sessionId}
    />
  );
}

export function GetTicketsRow(props: AidosViewProps) {
  const { args, state, result, errorSummary } = useAidosRow(props);
  /*
   * The board read leads with its COUNT, which is the #71 summary field:
   * "Showing 30 of 42 matching tickets". A truncated read used to look
   * exactly like a complete one.
   */
  const summary =
    typeof result?.summary === "string"
      ? result.summary
      : [
          Array.isArray(args?.stateIds) ? (args.stateIds as string[]).join("|") : null,
          typeof args?.search === "string" && args.search !== "" ? `"${args.search}"` : null,
        ]
          .filter((part): part is string => part !== null)
          .join(" · ") || "the board";
  return (
    <AidosRow title="Read the board" summary={summary} state={state} errorSummary={errorSummary} />
  );
}

/** Tool name -> row, for the slot registrations in index.ts. */
export const AIDOS_ROWS: ReadonlyArray<[string, (props: AidosViewProps) => react.ReactElement]> = [
  ["get_tickets", GetTicketsRow],
  ["get_ticket", GetTicketRow],
  ["set_ticket", SetTicketRow],
  ["attach_evidence", AttachEvidenceRow],
  ["move_ticket", MoveTicketRow],
];
