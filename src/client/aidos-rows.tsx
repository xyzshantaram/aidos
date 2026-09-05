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
import { TicketStrip } from "./ticket-strip";
import { ModalShell } from "./ui";
import { ChevronIcon } from "./icons";
import { asBoardKey } from "./board-logic";
import { setSelection, ticketTitle } from "./view-state";
import {
  allowlistPaths,
  planBlocksWritten,
  suggestionLines,
  ticketEvidence,
  ticketFacts,
  ticketFromProjection,
  ticketLines,
  writtenFields,
  oneLine,
  type Fact,
} from "./aidos-row-data";
import {
  argsRawOf,
  errorTextOf,
  firstLineOfError,
  parseArgs,
  parseErrorEnvelope,
  resultTextOf,
  rowStateOf,
  rowSummary,
  type RowState,
} from "./tool-block";

export interface AidosViewProps {
  block: unknown;
  sessionId?: string;
  /**
   * A session-scoped Standard Prop the harness supplies to every atomic tool
   * view for free -- confirmed against the LIVE Slot contract (`Slots`
   * Inspect Provider, `tool.call.toolview`), not inferred from a bundle.
   * Absent in a harness version that has not grown it yet, or in a test
   * double that does not supply one; every reader here tolerates that.
   */
  useProjection?: (key: string) => unknown;
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
  useProjection?: (key: string) => unknown;
}

function AidosRow(props: RowProps) {
  const [expanded, setExpanded] = react.useState(false);
  const [peekOpen, setPeekOpen] = react.useState(false);
  const body = props.body ?? null;
  const expandable = body !== null;
  const open = expanded && expandable;
  /*
   * The summary decision lives in rowSummary (tool-block), unit tested: the
   * error summary swaps in whenever it exists -- the refusal retint must
   * not suppress the reason -- and only a true error wears the red attr.
   */
  const shown = rowSummary(props.state, props.summary, props.errorSummary);

  /*
   * CLICK-THROUGH (#73 round 3).
   *
   * ROUND 1 concluded there was no API to activate a `conversation.view` tab
   * and settled for writing a module-level selection the board's Tickets tab
   * would pick up ONCE the human switched to it by hand -- reported back as
   * "still doesn't work", correctly: if the Tickets tab is not the active
   * view, a click visibly does nothing.
   *
   * Confirmed against the LIVE Slot contract this round (the `Slots` Inspect
   * Provider on `tool.call.toolview`, not a bundle read): `standardProps`
   * still has no `activate`/`setView`/`selectView`, so that conclusion holds.
   * But the SAME query also confirmed `useProjection` is a Standard Prop on
   * this exact Slot -- the identical session-scoped hook the Tickets tab
   * itself uses to read `aidos.tickets`. That makes a real fix possible
   * without any tab-activation API at all: show the ticket RIGHT HERE.
   *
   * A click still writes the selection (so opening the Tickets tab still
   * lands on the right ticket, per #100/#73's existing tests) AND opens a
   * peek showing the SAME `TicketStrip` every other ticket reference uses,
   * pulled live from the projection. This works whether or not the Tickets
   * tab exists, is mounted, or is the active view -- the actual problem,
   * not a workaround for the missing platform primitive.
   */
  const canSelect =
    props.ticketId !== null && props.ticketId !== undefined && props.sessionId !== undefined;
  const select = canSelect
    ? (event: react.MouseEvent | react.KeyboardEvent) => {
        event.stopPropagation();
        setSelection(props.sessionId as string, asBoardKey(props.ticketId as string));
        setPeekOpen(true);
      }
    : undefined;
  const peeked =
    props.useProjection !== undefined
      ? ticketFromProjection(props.useProjection("aidos.tickets"), props.ticketId)
      : null;

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
          {props.state === "error" || props.state === "stopped" ? (
            "●"
          ) : (
            <ChevronIcon open={open} />
          )}
        </span>
        <span className="tool-render-title">{props.title}</span>
        <span className="tool-render-sep" aria-hidden="true" />
        {select !== undefined && props.errorSummary === undefined ? (
          <span
            className="tool-render-path"
            role="link"
            tabIndex={0}
            title={"Select " + shown + " on the board"}
            data-dsh-tip=""
            onClick={select}
            onKeyDown={(event: react.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                select(event);
              }
            }}
          >
            {shown.text}
          </span>
        ) : (
          <span
            className="tool-render-summary"
            tool-render-error={shown.isError ? true : undefined}
          >
            {shown.text}
          </span>
        )}
      </div>
      {open ? <div className="tool-render-body">{body}</div> : null}
      {peekOpen ? (
        <ModalShell title="Ticket" onClose={() => setPeekOpen(false)}>
          {peeked !== null ? (
            <>
              <TicketStrip ticket={peeked} />
              {peeked.descriptionExcerpt !== undefined ? (
                <p className="aidos-ticket-peek-excerpt">{peeked.descriptionExcerpt}</p>
              ) : null}
            </>
          ) : (
            <p className="aidos-ticket-peek-empty">
              {"#" +
                (props.ticketId ?? "?") +
                " isn't in this session's own board yet, or belongs to another session. Open the Tickets tab to look it up there."}
            </p>
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}

/**
 * A facts table: the shape every aidos card body uses for `label: value`
 * data, so a body reads the same whichever tool produced it.
 *
 * A `<dl>` rather than a table because that is what this is -- terms and
 * their definitions -- and it reads correctly to a screen reader without any
 * ARIA bolted on.
 */
function Facts({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="aidos-tool-facts">
      {facts.map((fact) => (
        <react.Fragment key={fact.label}>
          <dt>{fact.label}</dt>
          <dd title={fact.value} data-dsh-tip="">{fact.value}</dd>
        </react.Fragment>
      ))}
    </dl>
  );
}

/** The plain text body tool-render uses, for a result that IS text. */
function TextBody({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <pre className="tool-render-output" tool-render-error={isError === true ? true : undefined}>
      {text}
    </pre>
  );
}

/**
 * An error body. Every row gets one, which is the point: a failed call was
 * previously a dead end -- the row showed one line and there was nowhere to
 * see the rest.
 */
export function errorBody(errorText: string | null): react.ReactNode | null {
  if (errorText === null || errorText === "") return null;
  /*
   * The MESSAGE, rendered -- never the envelope.
   *
   * User-reported: "no dumping raw JSON when it can be rendered". Expanding
   * a failed call showed the envelope verbatim:
   *
   *   Error: {"ok":false,"error":"tool_error","message":"Gate refused for
   *            in_progress -> awaiting_verification by actor agent: ..."}
   *
   * which merely REPEATED the summary already on the row, and buried it in
   * punctuation. It also broke the rule #71 exists to enforce, inside the
   * code that enforces it everywhere else.
   *
   * The message is prose, so it renders as prose. Any field beyond
   * ok/error/code/message is real structure and becomes a fact. The raw text
   * is kept only when it will not parse -- then it is all we have, and
   * hiding it would lose the error entirely.
   */
  const envelope = parseErrorEnvelope(errorText);
  if (envelope === null) return <TextBody text={errorText} isError={true} />;
  const facts: Fact[] = [];
  if (envelope.code !== null) facts.push({ label: "code", value: envelope.code });
  for (const [key, value] of Object.entries(envelope.extra)) {
    facts.push({ label: key, value: oneLine(value) });
  }
  if (envelope.message === null && facts.length === 0) {
    return <TextBody text={errorText} isError={true} />;
  }
  return (
    <>
      {envelope.message === null ? null : (
        <p className="aidos-tool-message">{envelope.message}</p>
      )}
      <Facts facts={facts} />
    </>
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
  /*
   * A REFUSAL is not a failure (user: these are "wrongly being recognized as
   * errors"). A gate declining a move, an author check declining an attach,
   * an allowlist declining a path -- in every one of those the call did
   * exactly what it should and the answer was no.
   *
   * Painting that the same red as a crash teaches a reader to ignore the
   * colour, and on this board a refusal is the single most common
   * unsuccessful outcome -- the gate model means to refuse. It takes the
   * warning tint the stopped state already uses, for the same reason.
   */
  const envelope = errorText === null ? null : parseErrorEnvelope(errorText);
  const shownState: RowState =
    state === "error" && envelope?.refusal === true ? "stopped" : state;
  return { args, state: shownState, result, ticketId, errorText, errorSummary };
}

export function AttachEvidenceRow(props: AidosViewProps) {
  const { args, state, result, ticketId, errorText, errorSummary } = useAidosRow(props);
  const kind = typeof args?.kind === "string" ? args.kind : undefined;
  /*
   * The EVIDENCE STRIP, and the criterion's whole point: this is literally
   * the component the evidence panel, the criteria panel and the mark-done
   * modal render, so one evidence row looks identical everywhere it appears.
   * A lookalike built here would drift from it -- which is exactly what #82
   * proved when three hand-written approximations of tool-render all failed.
   */
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : kind !== undefined
        ? (
            <ul className="aidos-evidence-list">
              <EvidenceStrip
                row={{
                  kind: kind.startsWith("builtin:") ? kind : "builtin:" + kind,
                  payload: (args?.payload as Record<string, unknown>) ?? {},
                  author: "agent",
                  at: typeof result?.updatedAt === "number" ? result.updatedAt : undefined,
                }}
              />
            </ul>
          )
        : null;
  return (
    <AidosRow
      title="Attach evidence"
      summary={ticketLabel(ticketId) ?? "evidence"}
      state={state}
      body={body}
      errorSummary={errorSummary}
      ticketId={ticketId}
      sessionId={props.sessionId}
      useProjection={props.useProjection}
    />
  );
}

export function MoveTicketRow(props: AidosViewProps) {
  const { args, state, result, ticketId, errorText, errorSummary } = useAidosRow(props);
  const to = typeof args?.to === "string" ? args.to : null;
  const label = ticketLabel(ticketId);
  /*
   * A move's body is its GATE. A refused move names the missing evidence
   * kinds, and that refusal is the most useful thing aidos ever prints --
   * the whole gate model is "you cannot move because X is missing". It was
   * previously one truncated line with nothing to expand.
   */
  const facts = ticketFacts(result);
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : facts.length > 0
        ? <Facts facts={facts} />
        : null;
  return (
    <AidosRow
      title="Move ticket"
      summary={to === null ? (label ?? "move") : `${label ?? ""} → ${to}`.trim()}
      state={state}
      body={body}
      errorSummary={errorSummary}
      ticketId={ticketId}
      sessionId={props.sessionId}
      useProjection={props.useProjection}
    />
  );
}

export function SetTicketRow(props: AidosViewProps) {
  const { args, state, result, ticketId, errorText, errorSummary } = useAidosRow(props);
  const created = result?.created === true;
  // A create names its new title; an edit names the ticket it changed.
  const title = typeof args?.title === "string" ? args.title : null;
  const summary = created && title !== null ? `#${ticketId ?? "?"} — ${title}` : ticketLabel(ticketId);
  /*
   * The body is WHAT WAS WRITTEN -- the fields the call actually set. A
   * ticket edit is otherwise invisible: the row says a ticket changed and
   * nothing says how, which is exactly the review problem this project keeps
   * paying for.
   */
  const fields = writtenFields(args);
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : fields.length > 0
        ? <Facts facts={fields} />
        : null;
  return (
    <AidosRow
      title={created ? "Create ticket" : "Edit ticket"}
      summary={summary ?? "ticket"}
      state={state}
      body={body}
      errorSummary={errorSummary}
      ticketId={ticketId}
      sessionId={props.sessionId}
      useProjection={props.useProjection}
    />
  );
}

export function GetTicketRow(props: AidosViewProps) {
  const { state, result, ticketId, errorText, errorSummary } = useAidosRow(props);
  const facts = ticketFacts(result);
  const evidence = ticketEvidence(result);
  /*
   * A ticket read expands into the ticket: its facts, then its evidence as
   * real strips. The evidence is the reason to read a ticket at all -- what
   * is attached, and what the gate is still missing.
   */
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : facts.length === 0 && evidence.length === 0
        ? null
        : (
            <>
              <Facts facts={facts} />
              {evidence.length > 0 ? (
                <ul className="aidos-evidence-list">
                  {evidence.map((row, index) => (
                    <EvidenceStrip
                      key={index}
                      row={{
                        kind: row.kind,
                        payload: { note: row.excerpt },
                        author: row.author as "agent" | "user",
                        at: row.at,
                      }}
                    />
                  ))}
                </ul>
              ) : null}
            </>
          );
  return (
    <AidosRow
      title="Read ticket"
      summary={ticketLabel(ticketId) ?? "ticket"}
      state={state}
      body={body}
      errorSummary={errorSummary}
      ticketId={ticketId}
      sessionId={props.sessionId}
      useProjection={props.useProjection}
    />
  );
}

export function GetTicketsRow(props: AidosViewProps) {
  const { args, state, result, errorText, errorSummary } = useAidosRow(props);
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
  /*
   * The body is the ROWS THE READ RETURNED, which is what a reader checking
   * the agent's work actually wants: not "it read the board" but which
   * tickets it saw. Each id selects that ticket, the same click-through the
   * row summary carries.
   */
  const lines = ticketLines(result);
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : lines.length === 0
        ? null
        : (
            <ul className="aidos-tool-list">
              {lines.map((line) => (
                <li key={line.id}>
                  <span className="aidos-tool-list-key">#{line.id}</span>
                  {line.state === "" ? null : (
                    <span className="aidos-tool-list-tag">{line.state}</span>
                  )}
                  <span className="aidos-tool-list-text" title={line.title} data-dsh-tip="">
                    {line.title}
                  </span>
                </li>
              ))}
            </ul>
          );
  return (
    <AidosRow
      title="Read the board"
      summary={summary}
      state={state}
      body={body}
      errorSummary={errorSummary}
    />
  );
}

/*
 * ── The tools that had NO row at all ────────────────────────────────────
 *
 * User-reported: "I see the tool call card for read_ticket and edit_ticket,
 * but I don't see request_allowlist." Five of the eleven aidos tools had a
 * client row; the other six still rendered a raw JSON envelope, which is the
 * exact gap #82 closed for the scratch family.
 *
 * Missed because #71's coverage test enumerates the HOST-side presentCall
 * declarations, and all eleven have one. The client rows are a second,
 * separate registration and nothing compared the two lists. There is now a
 * test that does.
 */

export function RequestAllowlistRow(props: AidosViewProps) {
  const { args, state, result, ticketId, errorText, errorSummary } = useAidosRow(props);
  const paths = allowlistPaths(args, result);
  const label = ticketLabel(ticketId);
  const summary =
    (label ?? "allowlist") + " · " + paths.length + (paths.length === 1 ? " path" : " paths");
  /*
   * Each path says whether approving it CREATES it (#104). That distinction
   * is the informed half of informed consent: approving a path that exists
   * grants write access to what is there, and approving one that does not
   * also brings it into being.
   */
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : paths.length === 0
        ? null
        : (
            <ul className="aidos-tool-list">
              {paths.map((entry) => (
                <li key={entry.path}>
                  <span className="aidos-tool-list-text">{entry.path}</span>
                  {entry.created ? (
                    <span className="aidos-tool-list-tag" title="Does not exist yet; approving creates it" data-dsh-tip="">
                      will be created
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          );
  return (
    <AidosRow
      title="Request allowlist"
      summary={summary}
      state={state}
      body={body}
      errorSummary={errorSummary}
      ticketId={ticketId}
      sessionId={props.sessionId}
      useProjection={props.useProjection}
    />
  );
}

export function SuggestActionsRow(props: AidosViewProps) {
  const { args, state, errorText, errorSummary } = useAidosRow(props);
  const lines = suggestionLines(args);
  const summary =
    lines.length === 0
      ? "nothing"
      : lines.length === 1
        ? (ticketLabel(lines[0].ticketId) ?? "#" + lines[0].ticketId)
        : lines.length + " tickets";
  /*
   * The REASON is the payload of a nomination -- the whole point of
   * suggest_actions is that the agent says why it needs each one, rather
   * than listing them in prose. A card that showed only the count would
   * throw away the only part worth reading.
   */
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : lines.length === 0
        ? null
        : (
            <ul className="aidos-tool-list">
              {lines.map((line) => (
                <li key={line.ticketId + ":" + line.actionId}>
                  <span className="aidos-tool-list-key">#{line.ticketId}</span>
                  <span className="aidos-tool-list-tag">{line.actionId}</span>
                  <span className="aidos-tool-list-text" title={line.reason} data-dsh-tip="">
                    {line.reason}
                  </span>
                </li>
              ))}
            </ul>
          );
  return (
    <AidosRow
      title="Suggest actions"
      summary={summary}
      state={state}
      body={body}
      errorSummary={errorSummary}
      ticketId={lines.length === 1 ? lines[0].ticketId : null}
      sessionId={props.sessionId}
      useProjection={props.useProjection}
    />
  );
}

export function PlanRow(props: AidosViewProps) {
  const { args, state, errorText, errorSummary } = useAidosRow(props);
  /*
   * plan is "the one tool whose result is the plan TEXT, not JSON", so its
   * body is that text verbatim. resultOf returns null for it, correctly --
   * the text is read straight off the block instead.
   */
  /*
   * Error text first: a refusal here must still expand to its reason, and
   * the retinted "stopped" state must not route the body back to the result.
   */
  const text = errorText ?? resultTextOf(props.block);
  const summary =
    args?.projectId === undefined ? "the project plan" : "project " + String(args.projectId);
  return (
    <AidosRow
      title="Export plan"
      summary={summary}
      state={state}
      body={
        text === null || text === "" ? null : (
          <TextBody text={text} isError={errorText !== null && state === "error"} />
        )
      }
      errorSummary={errorSummary}
    />
  );
}

export function PlanImportRow(props: AidosViewProps) {
  const { args, state, result, errorText, errorSummary } = useAidosRow(props);
  const file = typeof args?.file === "string" ? args.file : "a plan";
  /*
   * An import is all-or-nothing and lands every ticket in `open`, so the
   * count it created is the fact that matters -- and a parse error names the
   * line, which is why the error body is worth expanding.
   */
  const facts: Fact[] = [];
  const imported = result?.imported ?? result?.count;
  if (typeof imported === "number") facts.push({ label: "Imported", value: String(imported) });
  if (typeof result?.projectId === "number") {
    facts.push({ label: "Project", value: String(result.projectId) });
  }
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : facts.length > 0
        ? <Facts facts={facts} />
        : null;
  return (
    <AidosRow
      title="Import plan"
      summary={file}
      state={state}
      body={body}
      errorSummary={errorSummary}
    />
  );
}

export function PlanMetaRow(props: AidosViewProps) {
  const { args, state, result, errorText, errorSummary } = useAidosRow(props);
  const summary =
    args?.projectId === undefined ? "the plan blocks" : "project " + String(args.projectId);
  const facts: Fact[] = [];
  for (const block of ["frontmatter", "preamble"]) {
    const value = result?.[block];
    if (typeof value === "string") {
      facts.push({ label: block, value: value === "" ? "(empty)" : value });
    }
  }
  if (Array.isArray(result?.contextSections)) {
    facts.push({
      label: "contextSections",
      value: String((result.contextSections as unknown[]).length),
    });
  }
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : facts.length > 0
        ? <Facts facts={facts} />
        : null;
  return (
    <AidosRow
      title="Read plan blocks"
      summary={summary}
      state={state}
      body={body}
      errorSummary={errorSummary}
    />
  );
}

export function PlanMetaSetRow(props: AidosViewProps) {
  const { args, state, errorText, errorSummary } = useAidosRow(props);
  /*
   * Which BLOCKS were replaced. A present field replaces its stored value
   * and an absent one keeps it, so the blocks named in the arguments are
   * exactly the edit -- and "edited the plan" would not say whether the
   * frontmatter or every context section just moved.
   */
  const blocks = planBlocksWritten(args);
  const written = writtenFields(args).filter((fact) => fact.label !== "projectId");
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : written.length > 0
        ? <Facts facts={written} />
        : null;
  return (
    <AidosRow
      title="Edit plan blocks"
      summary={blocks.length === 0 ? "no block" : blocks.join(" · ")}
      state={state}
      body={body}
      errorSummary={errorSummary}
    />
  );
}

/** Tool name -> row, for the slot registrations in index.ts. */
export const AIDOS_ROWS: ReadonlyArray<[string, (props: AidosViewProps) => react.ReactElement]> = [
  ["get_tickets", GetTicketsRow],
  ["get_ticket", GetTicketRow],
  ["set_ticket", SetTicketRow],
  ["attach_evidence", AttachEvidenceRow],
  ["move_ticket", MoveTicketRow],
  ["request_allowlist", RequestAllowlistRow],
  ["suggest_actions", SuggestActionsRow],
  ["plan", PlanRow],
  ["plan_import", PlanImportRow],
  ["plan_meta", PlanMetaRow],
  ["plan_meta_set", PlanMetaSetRow],
];
