/**
 * #82: the scratch tools' conversation rows.
 *
 * They rendered as a raw JSON dump (`renderJson`), so a scratch read looked
 * like `{"ok":true,"path":"/home/...","scratch_root":"/home/...","content":
 * "..."}` while the builtin fs tools rendered a clean row. That is the gap
 * this ticket exists to close.
 *
 * The SHAPE is ported from dotfiles-ai's tool-render -- leading indicator,
 * tool name, path summary, collapsible body, error on the row -- because a
 * user should not be able to tell which family a call came from. The CODE is
 * aidos's own and uses aidos's own tokens: #72 requires that aidos depend on
 * nothing external, and tool-render is a separate plugin that may or may not
 * be mounted.
 *
 * All parsing lives in tool-block.ts and is unit tested. Keeping it out of
 * the components is deliberate: logic inside a component is logic no test
 * can reach, which is how the allowlist union and the backward-gate guard
 * both shipped unverified.
 */

import react from "react";

import { gutterWidth, highlightCode, languageFor } from "./highlight";
import { numberedReadRows, readStartLine } from "./vendor/tool-render/text";
import { CompassIcon, ForkIcon, InspectIcon, PencilIcon, ToolRenderChevron } from "./icons";

import {
  argsRawOf,
  errorTextOf,
  firstLineOfError,
  parseArgs,
  pickString,
  relativize,
  resultTextOf,
  rowStateOf,
  nameBadgeColors,
  unwrapScratchResult,
  type RowState,
} from "./tool-block";

/**
 * The slot's own currency (`ToolCallOwnerProps` on `tool.call.toolview`).
 *
 * `openFile` and `inspect` are the two affordances a review found MISSING
 * from these rows while the builtin fs rows had them: the summary was inert
 * text where the builtin's is a link that opens the file, and the expanded
 * card had no way back to the call in the trajectory view. Both are handed
 * to every registered view; the rows simply were not reading them.
 *
 * Both are declared OPTIONAL even though the slot always supplies
 * `openFile`. A row is a rendering nicety that must never cost the page, and
 * a props shape that hard-requires a callback turns any caller that omits it
 * (a test, a future host, a compaction node) into a crash instead of a row
 * without a link.
 */
export interface ToolViewProps {
  block: unknown;
  cwd?: string;
  /** Open a tool-argument path through the host. */
  openFile?: (path: string) => void;
  /** Show this call in the trajectory view, when the host offers it. */
  inspect?: () => void;
}

/*
 * The leading slot, matching tool-render's row anatomy: the chevron leads on
 * every expandable row -- errored ones included -- and the old state DOTS
 * are gone, matching the base card ("the old state dots are gone"): a failed
 * card is announced by its red badge and its data-error outline instead. The
 * chevron is the shell's own primitive in the todo panel's rotation style
 * (user, 2026-09-05).
 */
function Leading({ state, open }: { state: RowState; open: boolean }) {
  void state;
  return <ToolRenderChevron open={open} />;
}

interface RowOptions {
  title: string;
  /** The badge's leading glyph, exactly as the base card's badge carries one. */
  icon?: react.ReactNode;
  summary: string;
  state: RowState;
  body: react.ReactNode | null;
  errorSummary?: string;
  /** The absolute path the summary stands for, when the call names one. */
  path?: string;
  openFile?: (path: string) => void;
  inspect?: () => void;
}

/**
 * The shared row shell. One shape for every scratch tool, so the rows read
 * as a column rather than as four different widgets.
 */
function ScratchRow({
  title,
  icon,
  summary,
  state,
  body,
  errorSummary,
  path,
  openFile,
  inspect,
}: RowOptions) {
  const [expanded, setExpanded] = react.useState(false);
  const expandable = body !== null || inspect !== undefined;
  const open = expanded && expandable;
  /*
   * An errored row reports its ERROR where the path would go. The path is
   * already useless information at that point -- what the reader needs is
   * why it failed -- and it is recoverable by expanding.
   */
  const showsError = state === "error" && errorSummary !== undefined;
  const shown = showsError ? errorSummary : summary;
  /*
   * The path becomes a LINK, exactly where the base card puts one -- and,
   * exactly as the base card does, only when there is no error to report.
   * On a failed call the row's one line belongs to the reason; a link to the
   * file the call did not manage to touch is the wrong thing to offer.
   */
  const linked = !showsError && path !== undefined && openFile !== undefined;
  const openIt = () => {
    if (path !== undefined && openFile !== undefined) openFile(path);
  };
  return (
    <div
      className="tool-render-card"
      data-error={state === "error" || undefined}
      /*
       * STOPPED is not ERROR. An interrupted call takes the dimmer outline
       * the vendored stylesheet already draws for it
       * (`.tool-render-card[data-stopped]`), instead of sharing the crash-red
       * of a call that actually failed. The attribute was simply never set,
       * so every stopped scratch call rendered as an untinted success while
       * the builtin's rendered as stopped.
       */
      data-stopped={state === "stopped" || undefined}
    >
      {/*
        * A DIV with role="button", not a <button> element.
        *
        * A real button carries the browser's default chrome -- a grey
        * rounded background -- which rendered as a PILL behind every row
        * header (user-reported: "odd highlight shadow artifact"). It also
        * fought the vendored stylesheet's sizing, which is why long error
        * text overflowed the card's right edge.
        *
        * tool-render uses a div with role/tabIndex for exactly this reason,
        * and its CSS is written for that element. Matching the element is
        * part of matching the design.
        */}
      <div
        className="tool-render-row"
        data-state={state}
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
        {expandable ? <Leading state={state} open={open} /> : null}
        <span className="tool-render-name-badge" style={nameBadgeColors(title, state === "error")}>
          <span className="tool-render-name-badge-icon">{icon}</span>
          <span className="tool-render-name-badge-text" title={title} data-dsh-tip="">
            {title}
          </span>
        </span>
        {/* The dot between the tool name and its argument, as tool-render has. */}
        <span className="tool-render-sep" aria-hidden="true" />
        {linked ? (
          <span
            className="tool-render-path"
            role="link"
            tabIndex={0}
            title={path}
            data-dsh-tip=""
            /*
             * stopPropagation, or opening the file also toggles the card.
             * The row's own click handler sits on the ancestor, so without
             * it every path click expands or collapses as a side effect.
             */
            onClick={(event: react.MouseEvent<HTMLSpanElement>) => {
              event.stopPropagation();
              openIt();
            }}
            onKeyDown={(event: react.KeyboardEvent<HTMLSpanElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                openIt();
              }
            }}
          >
            {shown}
          </span>
        ) : (
          <span
            className="tool-render-summary"
            tool-render-error={showsError ? true : undefined}
            title={shown}
            data-dsh-tip=""
          >
            {shown}
          </span>
        )}
      </div>
      {open ? (
        <div className="tool-render-body">
          {body}
          {/* The base card's way back to the call in the trajectory view. */}
          {inspect !== undefined ? (
            <button type="button" className="tool-render-inspect" onClick={inspect}>
              {/* No leading space: `.tool-render-inspect` sets `gap`. */}
              <InspectIcon />
              Inspect
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Everything the four rows share: parse once, decide once. */
function useRow(props: ToolViewProps, label: string) {
  const args = parseArgs(argsRawOf(props.block));
  const state = rowStateOf(props.block);
  const rawPath = pickString(args, ["path", "file_path"]);
  const errorText = state === "error" ? errorTextOf(props.block) : null;
  const summary = rawPath !== undefined ? relativize(rawPath, props.cwd) : label;
  const errorSummary =
    errorText !== null && errorText !== "" ? firstLineOfError(errorText) : undefined;
  /*
   * The link carries the ABSOLUTE path, while the row SHOWS the relativised
   * one. `openFile` is a host call, and handing it the display string would
   * ask the host to open a path relative to a cwd it was never told about.
   */
  return {
    args,
    state,
    summary,
    errorText,
    errorSummary,
    path: rawPath,
    openFile: props.openFile,
    inspect: props.inspect,
  };
}

/** A body block, or null when there is nothing worth expanding. */
function bodyOf(text: string | null, isError: boolean): react.ReactNode | null {
  if (text === null || text === "") return null;
  // The rounded code block tool-render uses, on the same token.
  return (
    <pre className="tool-render-output" tool-render-error={isError ? true : undefined}>
      {text}
    </pre>
  );
}

/**
 * A read body: numbered, syntax-highlighted lines, exactly as tool-render
 * renders one.
 *
 * The numbering and envelope-stripping come from the VENDORED text helpers
 * rather than a reimplementation, and the highlighting uses the same
 * extension map and grammars. Three hand-ports failed to match by
 * resemblance; this matches by using the same code.
 */
function readBody(text: string, path: string | undefined): react.ReactNode {
  return codeBlock(numberedReadRows(text, readStartLine(null, text)), path);
}

/**
 * The numbered, highlighted code block both the read and the write body use.
 *
 * Shared because they must not drift: a write whose content rendered as a
 * raw `<pre>` while a read of the SAME FILE rendered as numbered, highlighted
 * lines is exactly the "you can tell which family it came from" tell this
 * ticket exists to remove.
 */
function codeBlock(
  rows: ReadonlyArray<{ number: number | null; text: string }>,
  path: string | undefined,
): react.ReactNode {
  const language = languageFor(path ?? "");
  const width = gutterWidth(rows.map((row) => row.number));
  return (
    <div className="tool-render-code">
      {rows.map((row, index) => (
        <div className="tool-render-code-row" key={index}>
          <span className="tool-render-gutter" aria-hidden="true" style={{ width }}>
            {row.number === null ? "" : String(row.number)}
          </span>
          {/*
            * dangerouslySetInnerHTML is how highlight.js output is rendered,
            * and it is safe HERE because highlightCode never returns raw
            * input: an unknown language or a grammar failure falls back to
            * ESCAPED text. That fallback is the security boundary, not a
            * convenience.
            */}
          <code
            className="tool-render-line-cell hljs"
            data-highlighted="yes"
            dangerouslySetInnerHTML={{ __html: highlightCode(row.text, language) }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * A write body, matching the base card's.
 *
 * The base card diffs the new content against the LAST READ of the same path
 * and falls back to "no earlier version on record" plus the new content
 * when it has no earlier text. Aidos takes that fallback branch ALWAYS, and
 * that is a real difference, named rather than papered over: the earlier
 * text comes from a session snapshot the base card reads through its own
 * `useSession` prop, which is tool-render's, not part of the
 * `tool.call.toolview` owner currency every registered view receives
 * (`callId`, `toolName`, `block`, `cwd`, `home`, `openFile`, `inspect`).
 * Aidos cannot reach it without depending on tool-render, which #72 forbids.
 *
 * What IS matched is everything the fallback branch renders: the same note,
 * the same numbered and highlighted lines, the same containers -- so the
 * write body stops being a raw `<pre>` dump beside a highlighted read.
 */
function writeBody(content: string, path: string | undefined): react.ReactNode {
  return (
    <div className="tool-render-write">
      <div className="tool-render-write-note">No earlier version on record; new content below</div>
      {codeBlock(numberedReadRows(content, 1), path)}
    </div>
  );
}

export function ScratchReadRow(props: ToolViewProps) {
  const row = useRow(props, "Read");
  const { args, state, errorText } = row;
  // The envelope's own fields are already on the row, so the body shows the
  // FILE CONTENT rather than the JSON wrapper around it.
  const text = state === "error" ? errorText : unwrapScratchResult(resultTextOf(props.block));
  const path = pickString(args, ["path", "file_path"]);
  const body =
    state === "error" || text === null || text === ""
      ? bodyOf(text, state === "error")
      : readBody(text, path);
  return <ScratchRow {...row} icon={<CompassIcon />} title="Scratch read" body={body} />;
}

export function ScratchWriteRow(props: ToolViewProps) {
  const row = useRow(props, "Write");
  const { args, state, errorText } = row;
  // The written CONTENT is the interesting part, and it is in the arguments
  // rather than the result -- the result only reports create-vs-update.
  const written = state === "error" ? errorText : (pickString(args, ["content"]) ?? null);
  const body =
    state === "error" || written === null || written === ""
      ? bodyOf(written, state === "error")
      : writeBody(written, row.path);
  return <ScratchRow {...row} icon={<PencilIcon />} title="Scratch write" body={body} />;
}

export function ScratchEditRow(props: ToolViewProps) {
  const row = useRow(props, "Edit");
  const { args, state, errorText } = row;
  let text: string | null;
  if (state === "error") {
    text = errorText;
  } else {
    /*
     * Show the replacement as a two-part diff. Deliberately not a rendered
     * diff widget: this row exists to say WHAT changed at a glance, and a
     * full diff view is #72's job for the modal surfaces.
     */
    const oldText = pickString(args, ["old_string"]);
    const newText = pickString(args, ["new_string"]);
    text =
      oldText !== undefined || newText !== undefined
        ? `- ${oldText ?? ""}\n+ ${newText ?? ""}`
        : unwrapScratchResult(resultTextOf(props.block));
  }
  return (
    <ScratchRow
      {...row}
      icon={<PencilIcon />}
      title="Scratch edit"
      body={bodyOf(text, state === "error")}
    />
  );
}

export function ScratchMkdirRow(props: ToolViewProps) {
  const row = useRow(props, "Mkdir");
  const { state, errorText } = row;
  return (
    <ScratchRow
      {...row}
      icon={<ForkIcon />}
      title="Scratch mkdir"
      body={bodyOf(state === "error" ? errorText : null, state === "error")}
    />
  );
}

/** Tool name -> row, for the slot registrations in index.ts. */
export const SCRATCH_ROWS: ReadonlyArray<[string, (props: ToolViewProps) => react.ReactElement]> = [
  ["scratch_read", ScratchReadRow],
  ["scratch_write", ScratchWriteRow],
  ["scratch_edit", ScratchEditRow],
  ["scratch_mkdir", ScratchMkdirRow],
];
