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
/*
 * The SAME markdown renderer the detail panel's DescriptionPanel uses. A
 * ticket's description is markdown wherever it appears, and #73's rule --
 * one thing looks identical in the card, the panel and the modal -- applies
 * to prose exactly as it applies to an evidence row.
 */
import { renderMarkdownSafe } from "./safe-markdown";

import { EvidenceStrip } from "./evidence-strip";
import { TicketStrip } from "./ticket-strip";
import { ModalShell } from "./ui";
import {
  AlertCircleIcon,
  AllowlistIcon,
  CompassIcon,
  ForkIcon,
  KeyholeIcon,
  PencilIcon,
  PopOutIcon,
  SignoffIcon,
  ToolRenderChevron,
} from "./icons";
import { asBoardKey } from "./board-logic";
import { setSelection, ticketTitle } from "./view-state";
import {
  allowlistPaths,
  boardQuerySummary,
  planBlocksWritten,
  suggestionLines,
  ticketEvidence,
  ticketCaptionOf,
  ticketFacts,
  ticketFromProjection,
  ticketTables,
  writtenFields,
  oneLine,
  type Fact,
  type TicketTable,
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
  nameBadgeColors,
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
 * `#14 — Some ticket title`, or `#14` when THIS SESSION's board has not
 * published a title yet. Never blank: the id is always worth showing.
 *
 * The session id is required, not optional-with-a-global-fallback. A card
 * naming #39 in an aidos session showed a Thursday ticket's title because
 * the index was keyed by bare id and the last board to render won
 * (user-reported 2026-09-05). Falling back to "whatever some board knew" is
 * the bug, so a card with no session shows the bare id instead.
 */
function ticketLabel(sessionId: string | undefined, ticketId: string | null): string | null {
  if (ticketId === null) return null;
  const title = ticketTitle(sessionId, ticketId);
  return title === null ? `#${ticketId}` : `#${ticketId} — ${title}`;
}

interface RowProps {
  title: string;
  /** The badge's leading glyph, exactly as the base card's badge carries one. */
  icon?: react.ReactNode;
  summary: string;
  state: RowState;
  body?: react.ReactNode | null;
  /**
   * A line rendered AFTER the body, inside the expanded card.
   *
   * For counts and other facts ABOUT the result: they belong under the thing
   * they count, where they read as a total, rather than on the collapsed row
   * where they crowd out what the call actually asked for.
   */
  footer?: react.ReactNode | null;
  errorSummary?: string;
  /** Selecting this ticket on the board when the summary is clicked. */
  ticketId?: string | null;
  sessionId?: string;
  useProjection?: (key: string) => unknown;
}

/**
 * The click-through link's hover title.
 *
 * A pure function so this exact bug is unit tested rather than left to
 * TypeScript, which does NOT catch it: `"Select " + shown + " on the board"`
 * (`shown` being the `{text, isError}` object `rowSummary` returns, not a
 * string) type-checks cleanly under `--strict` -- confirmed by compiling it
 * in isolation -- because `+` permits an arbitrary object on the string's
 * other side and silently calls its `toString()`. The result renders as the
 * literal text "[object Object]" in a live hover, which is exactly what was
 * reported ("On hover, i see 'Open ticket [object Object] on the board'").
 */
export function selectTitle(summaryText: string): string {
  return `Select ${summaryText} on the board`;
}

function AidosRow(props: RowProps) {
  const [expanded, setExpanded] = react.useState(false);
  const [peekOpen, setPeekOpen] = react.useState(false);
  const body = props.body ?? null;
  const footer = props.footer ?? null;
  // A footer alone is worth expanding for: a read that matched nothing has
  // no rows to list, and "Showing 0 of 42" is the whole answer.
  const expandable = body !== null || footer !== null;
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

  /*
   * CLICK-THROUGH INSTRUMENTATION (user-reported 2026-09-05: still broken
   * after two rounds of source-level fixes, and after a full restart --
   * which rules out the "stale bundle" explanation given for the earlier
   * render crashes).
   *
   * Static reading cannot settle this further. The offline contract types
   * available to this checkout only enumerate `tool.call.toolview`'s own
   * `owner` fields -- callId, toolName, block, cwd, home, openFile, inspect
   * -- with NO `sessionId` and NO `useProjection`. An earlier round claimed
   * both are "Standard Props" on this exact slot via a LIVE Inspect
   * Provider query; that tool is not available in this session, so the
   * claim cannot be re-verified from here. If it was wrong, `props.sessionId`
   * is undefined on every real render, `canSelect` is always false, and the
   * summary never becomes a clickable link at all -- which matches "still
   * broken" better than any DOM/CSS explanation would.
   *
   * Logs unconditionally (not behind logDebug's gate) on every row that
   * names a ticket, and again the instant a click fires, so the next report
   * settles this with the actual prop values instead of another read.
   */
  react.useEffect(() => {
    if (props.ticketId === null || props.ticketId === undefined) return;
    // eslint-disable-next-line no-console
    console.info(
      `[aidos] toolview ticket=${props.ticketId} sessionId=${props.sessionId ?? "MISSING"} ` +
        `useProjection=${typeof props.useProjection} canSelect=${canSelect}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.ticketId, props.sessionId, props.useProjection, canSelect]);

  const select = canSelect
    ? (event: react.MouseEvent | react.KeyboardEvent) => {
        event.stopPropagation();
        // eslint-disable-next-line no-console
        console.info(`[aidos] click-through fired for ticket ${props.ticketId}`);
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
        {/*
          * The base card's row anatomy (dotfiles-ai tool-render), mirrored:
          * chevron leading on every expandable row -- errored ones included,
          * and the old state DOTS are gone, a failed card is announced by
          * its red badge and its data-error outline instead -- then the
          * hashed name badge, then the summary. The badge colours come from
          * nameBadgeColors (tool-block), the same hash the native rows use,
          * so an aidos call and a native call hash to the same hue and
          * failures go white-on-red in both.
          */}
        {expandable ? <ToolRenderChevron open={open} /> : null}
        <span className="tool-render-name-badge" style={nameBadgeColors(props.title, props.state === "error")}>
          <span className="tool-render-name-badge-icon">{props.icon}</span>
          <span className="tool-render-name-badge-text" title={props.title} data-dsh-tip="">
            {props.title}
          </span>
        </span>
        <span className="tool-render-sep" aria-hidden="true" />
        {select !== undefined && props.errorSummary === undefined ? (
          <span
            className="tool-render-path"
            role="link"
            tabIndex={0}
            title={selectTitle(shown.text)}
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
      {open ? (
        <div className="tool-render-body">
          {body}
          {footer !== null ? <div className="aidos-tool-footer">{footer}</div> : null}
        </div>
      ) : null}
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
          <FactValue fact={fact} />
        </react.Fragment>
      ))}
    </dl>
  );
}

/**
 * One fact's cell, which can expand IN PLACE to its untruncated text.
 *
 * User direction (2026-09-05): "every ellipsized strip should have a show
 * more that expands its own cell (and if the result then exceeds the max
 * tool call card height, it should scroll, like usual)."
 *
 * Two deliberate choices:
 *
 * ITS OWN CELL, not the whole card. Expanding one description must not
 * reflow the facts beside it or push the rest of a stacked table off
 * screen; the reader asked about that one value. The scroll half is met by
 * the CONTAINER, not here -- `.aidos-tool-facts` already carries the house
 * max-height with `overflow-y: auto`, so a cell that grows past it scrolls
 * exactly like every other long tool body.
 *
 * NO BUTTON WHEN THERE IS NOTHING MORE. `full` is set upstream only when
 * the flat line genuinely lost something (it was cut, or flattening ate
 * newlines). An expander that reveals nothing is worse than no expander: it
 * teaches the reader that the control lies, everywhere in the UI.
 */
function FactValue({ fact }: { fact: Fact }) {
  const [expanded, setExpanded] = react.useState(false);
  const expandable = fact.full !== undefined && fact.full !== "";
  if (!expandable) {
    return (
      <dd title={fact.value} data-dsh-tip="">
        {fact.value}
      </dd>
    );
  }
  return (
    <dd data-expanded={expanded ? true : undefined}>
      {expanded ? (
        <ExpandedFact fact={fact} />
      ) : (
        <span className="aidos-tool-fact-clipped" title={fact.value} data-dsh-tip="">
          {fact.value}
        </span>
      )}
      <button
        className="aidos-tool-fact-more"
        type="button"
        aria-expanded={expanded}
        onClick={(event: react.MouseEvent) => {
          // The row above is itself a click target that collapses the card;
          // an expander inside it must not fold the card it lives in.
          event.stopPropagation();
          setExpanded(!expanded);
        }}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </dd>
  );
}

/**
 * The expanded text of one fact: rendered markdown for prose, preserved
 * plain text for everything else.
 *
 * User direction (2026-09-05): "the body/description should render
 * markdown". Every ticket in this project writes its description and body
 * as markdown, and a card showing `**User ask (2026-09-03):**` as literal
 * asterisks is the same defect the board digest was fixed for.
 *
 * Through `marked` and the `aidos-md` class, which is exactly what the
 * detail panel's DescriptionPanel already does. Reusing that rather than
 * writing a second renderer is the same rule #73 applies to EvidenceStrip:
 * one description looks identical wherever it appears.
 */
function ExpandedFact({ fact }: { fact: Fact }) {
  const text = fact.full ?? fact.value;
  if (fact.markdown !== true) {
    // Plain text with its newlines intact: criteria are one assertion per
    // line, and a markdown pass silently eats a line starting with `#`.
    return <span className="aidos-tool-fact-full">{text}</span>;
  }
  return (
    <div
      className="aidos-md aidos-tool-fact-full"
      dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(text) }}
    />
  );
}

/**
 * A STACK of per-ticket tables, one table per ticket.
 *
 * User direction (2026-09-05): "if it's a single ticket, it should be one
 * table. if it's many, it should be a stack of tables, like batch_edit
 * stacks single edit diffs in tool-render" -- and, before it, "tool calls
 * should look internally consistent."
 *
 * So a board read stops being a list of one-line rows and becomes N of the
 * SAME table a single-ticket read renders. The caption carries the id, the
 * state and the title, so the facts inside never repeat them.
 */
function FactsStack({
  tables,
  onSelect,
}: {
  tables: TicketTable[];
  onSelect?: (id: string) => void;
}) {
  if (tables.length === 0) return null;
  return (
    <div className="aidos-tool-stack">
      {tables.map((table) => (
        <section className="aidos-tool-table" key={table.id}>
          <TicketCaption
            id={table.id}
            state={table.state}
            title={table.title}
            onSelect={onSelect}
          />
          <Facts facts={table.facts} />
        </section>
      ))}
    </div>
  );
}

/**
 * One table's caption: `#id`, its state, its title.
 *
 * Shared by the stack and the single-ticket read on purpose. Two
 * near-identical captions is how "internally consistent" quietly stops
 * being true after the next edit to one of them.
 */
function TicketCaption({
  id,
  state,
  title,
  onSelect,
}: {
  id: string;
  state: string;
  title: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <header className="aidos-tool-table-head">
      {onSelect !== undefined ? (
        <button
          className="aidos-tool-table-id aidos-tool-table-id-link"
          type="button"
          onClick={(event: react.MouseEvent) => {
            event.stopPropagation();
            onSelect(id);
          }}
        >
          {"#" + id}
        </button>
      ) : (
        <span className="aidos-tool-table-id">{"#" + id}</span>
      )}
      {state === "" ? null : <span className="aidos-tool-list-tag">{state}</span>}
      <span className="aidos-tool-table-title" title={title} data-dsh-tip="">
        {title}
      </span>
    </header>
  );
}

/** The caption of a single-ticket read, or null when the result has no ticket. */
function ticketCaption(result: Record<string, unknown> | null): react.ReactNode | null {
  const caption = ticketCaptionOf(result);
  if (caption === null) return null;
  return <TicketCaption id={caption.id} state={caption.state} title={caption.title} />;
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

/** Everything the rows share: parse once, decide once.
 *
 * `props` itself is optional: the harness may mount a toolview before its
 * block is attached, and `undefined` props used to die on `props.block`
 * inside the hook rather than rendering the ordinary "nothing yet" state. */
function useAidosRow(props?: AidosViewProps) {
  const block = props?.block;
  const args = parseArgs(argsRawOf(block));
  const state = rowStateOf(block);
  const result = resultOf(block);
  const ticketId = ticketIdOf(args, result);
  const errorText = state === "error" ? errorTextOf(block) : null;
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
  /*
   * RAW RESULT TEXT, alongside the parsed one.
   *
   * User-reported: "I can see the call succeeded and the agent received the
   * tickets but the rendered card does not expand." `resultOf` returns null
   * whenever the block's text is not valid JSON -- which a truncated or
   * spilled result (the harness's own large-payload handling) produces even
   * though the call plainly succeeded. Every row that derives its body from
   * `result` alone then computed zero facts/rows and rendered nothing,
   * making the card silently unexpandable for exactly the calls whose
   * result was too interesting to fit. Exposed here so a row can fall back
   * to the raw text rather than to emptiness. See `fallbackBody`.
   */
  const resultText = resultTextOf(block);
  return { args, state: shownState, result, resultText, ticketId, errorText, errorSummary };
}

/**
 * The last resort for a body that would otherwise be null.
 *
 * A row's structured parse (facts, evidence, list rows) can come up empty
 * for two very different reasons: the call genuinely returned nothing, or
 * the result text existed but did not parse as the JSON shape the row
 * expects. This makes the second case visible instead of indistinguishable
 * from the first -- a card that HAS text always has something to expand.
 */
export function fallbackBody(resultText: string | null): react.ReactNode | null {
  return resultText === null || resultText === "" ? null : <TextBody text={resultText} isError={false} />;
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
      icon={<SignoffIcon />}
      title="Attach evidence"
      summary={ticketLabel(props.sessionId, ticketId) ?? "evidence"}
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
  const { args, state, result, resultText, ticketId, errorText, errorSummary } = useAidosRow(props);
  const to = typeof args?.to === "string" ? args.to : null;
  const label = ticketLabel(props.sessionId, ticketId);
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
        // See GetTicketsRow: only a genuine parse failure falls back to the
        // raw text; a move that succeeded with no extra facts stays empty.
        : result === null
          ? fallbackBody(resultText)
          : null;
  return (
    <AidosRow
      icon={<ForkIcon />}
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
  const summary = created && title !== null ? `#${ticketId ?? "?"} — ${title}` : ticketLabel(props.sessionId, ticketId);
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
      icon={<PencilIcon />}
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
  const { state, result, resultText, ticketId, errorText, errorSummary } = useAidosRow(props);
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
        // See GetTicketsRow: fall back to raw text only when the JSON
        // itself did not parse, not when a ticket genuinely has no facts.
        ? (result === null ? fallbackBody(resultText) : null)
        : (
            <>
              {/*
                * ONE table, with the same caption a stacked table carries --
                * "if it's a single ticket, it should be one table" (user,
                * 2026-09-05). The caption is what makes a single read and a
                * board read visibly the same object at two counts, rather
                * than two unrelated layouts.
                */}
              {ticketCaption(result)}
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
      icon={<CompassIcon />}
      title="Read ticket"
      summary={ticketLabel(props.sessionId, ticketId) ?? "ticket"}
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
  const { args, state, result, resultText, errorText, errorSummary } = useAidosRow(props);
  /*
   * THE ROW SAYS WHAT WAS ASKED FOR; THE COUNT GOES UNDER THE ANSWER.
   *
   * It used to be the other way round: the collapsed summary led with the
   * result's own `summary` field ("Showing 30 of 42 matching tickets") and
   * fell back to the filters only when that was missing. Two reads with
   * completely different filters then rendered identically whenever they
   * returned the same count, and the count is the one part of a board read a
   * reader cannot act on without opening the card anyway.
   *
   * The count is not dropped -- it moves to the footer, under the rows it
   * counts, where it still catches a TRUNCATED read (30 of 42) that would
   * otherwise look complete.
   */
  const summary = boardQuerySummary(args);
  const footer = typeof result?.summary === "string" ? result.summary : null;
  /*
   * The body is the ROWS THE READ RETURNED, which is what a reader checking
   * the agent's work actually wants: not "it read the board" but which
   * tickets it saw. Each id selects that ticket, the same click-through the
   * row summary carries.
   */
  /*
   * A STACK OF TABLES, one per ticket (user direction 2026-09-05): "if it's
   * a single ticket, it should be one table. if it's many, it should be a
   * stack of tables, like batch_edit stacks single edit diffs in
   * tool-render", under the standing rule that "tool calls should look
   * internally consistent".
   *
   * This replaces a flat `#id · state · title` list. The list was cheap and
   * uniform, but it was also a DIFFERENT shape from every other aidos card
   * body -- a single-ticket read rendered a facts table, and reading the
   * board rendered something else entirely for the same objects. The stack
   * makes N tickets literally N of the one-ticket table.
   */
  const tables = ticketTables(result);
  const body =
    errorText !== null && errorText !== ""
      ? errorBody(errorText)
      : tables.length === 0
        // `result === null`: the text existed but did not parse as JSON --
        // show it rather than nothing. `result !== null` with zero rows is
        // a genuinely empty match; the footer already says so, and dumping
        // the (valid, boring) envelope here would break #71's raw-JSON rule
        // for no reason.
        ? (result === null ? fallbackBody(resultText) : null)
        : (
            <FactsStack
              tables={tables}
              onSelect={
                props.sessionId === undefined
                  ? undefined
                  : (id: string) => {
                      setSelection(props.sessionId as string, asBoardKey(id));
                    }
              }
            />
          );
  return (
    <AidosRow
      icon={<KeyholeIcon />}
      title="Read board"
      summary={summary}
      state={state}
      body={body}
      footer={footer}
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
  const label = ticketLabel(props.sessionId, ticketId);
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
      icon={<AllowlistIcon />}
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
        ? (ticketLabel(props.sessionId, lines[0].ticketId) ?? "#" + lines[0].ticketId)
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
      icon={<AlertCircleIcon />}
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
      icon={<PopOutIcon />}
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
  const { args, state, result, resultText, errorText, errorSummary } = useAidosRow(props);
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
        : result === null
          ? fallbackBody(resultText)
          : null;
  return (
    <AidosRow
      icon={<PopOutIcon />}
      title="Import plan"
      summary={file}
      state={state}
      body={body}
      errorSummary={errorSummary}
    />
  );
}

export function PlanMetaRow(props: AidosViewProps) {
  const { args, state, result, resultText, errorText, errorSummary } = useAidosRow(props);
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
        : result === null
          ? fallbackBody(resultText)
          : null;
  return (
    <AidosRow
      icon={<CompassIcon />}
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
      icon={<PencilIcon />}
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
