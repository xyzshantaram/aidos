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

import {
  argsRawOf,
  errorTextOf,
  firstLineOfError,
  parseArgs,
  pickString,
  relativize,
  resultTextOf,
  rowStateOf,
  unwrapScratchResult,
  type RowState,
} from "./tool-block";

export interface ToolViewProps {
  block: unknown;
  cwd?: string;
}

/**
 * The leading slot, matching tool-render's: a chevron when open, a state dot
 * when the call failed or was stopped, and the tool's own icon otherwise.
 *
 * A STOPPED call gets the warning dot rather than the error dot. The user
 * stopped it; tinting a deliberate stop as a failure teaches people to
 * ignore the tint.
 */
function Leading({ state, open }: { state: RowState; open: boolean }) {
  if (open) return <>▾</>;
  if (state === "error" || state === "stopped") return <>●</>;
  if (state === "running") return <>◌</>;
  return <>▸</>;
}

interface RowOptions {
  title: string;
  summary: string;
  state: RowState;
  body: react.ReactNode | null;
  errorSummary?: string;
}

/**
 * The shared row shell. One shape for every scratch tool, so the rows read
 * as a column rather than as four different widgets.
 */
function ScratchRow({ title, summary, state, body, errorSummary }: RowOptions) {
  const [expanded, setExpanded] = react.useState(false);
  const expandable = body !== null;
  const open = expanded && expandable;
  /*
   * An errored row reports its ERROR where the path would go. The path is
   * already useless information at that point -- what the reader needs is
   * why it failed -- and it is recoverable by expanding.
   */
  const showsError = state === "error" && errorSummary !== undefined;
  const shown = showsError ? errorSummary : summary;
  return (
    <div className="aidos-toolrow">
      <button
        type="button"
        className="aidos-toolrow-line"
        data-state={state}
        data-expandable={expandable ? true : undefined}
        disabled={!expandable}
        aria-expanded={expandable ? open : undefined}
        onClick={() => {
          if (expandable) setExpanded(!expanded);
        }}
      >
        <span className="aidos-toolrow-leading" aria-hidden="true">
          <Leading state={state} open={open} />
        </span>
        <span className="aidos-toolrow-title">{title}</span>
        {/* The dot between the tool name and its argument, as tool-render has. */}
        <span className="aidos-toolrow-sep" aria-hidden="true" />
        <span
          className="aidos-toolrow-summary"
          data-error={showsError ? true : undefined}
          title={shown}
        >
          {shown}
        </span>
      </button>
      {open ? <div className="aidos-toolrow-body">{body}</div> : null}
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
  return { args, state, summary, errorText, errorSummary };
}

/** A body block, or null when there is nothing worth expanding. */
function bodyOf(text: string | null, isError: boolean): react.ReactNode | null {
  if (text === null || text === "") return null;
  // The rounded code block tool-render uses, on the same token.
  return (
    <pre className="aidos-toolrow-code" data-error={isError ? true : undefined}>
      {text}
    </pre>
  );
}

export function ScratchReadRow(props: ToolViewProps) {
  const { state, summary, errorText, errorSummary } = useRow(props, "Read");
  // The envelope's own fields are already on the row, so the body shows the
  // FILE CONTENT rather than the JSON wrapper around it.
  const text = state === "error" ? errorText : unwrapScratchResult(resultTextOf(props.block));
  return (
    <ScratchRow
      title="Scratch read"
      summary={summary}
      state={state}
      body={bodyOf(text, state === "error")}
      errorSummary={errorSummary}
    />
  );
}

export function ScratchWriteRow(props: ToolViewProps) {
  const { args, state, summary, errorText, errorSummary } = useRow(props, "Write");
  // The written CONTENT is the interesting part, and it is in the arguments
  // rather than the result -- the result only reports create-vs-update.
  const written = state === "error" ? errorText : pickString(args, ["content"]) ?? null;
  return (
    <ScratchRow
      title="Scratch write"
      summary={summary}
      state={state}
      body={bodyOf(written, state === "error")}
      errorSummary={errorSummary}
    />
  );
}

export function ScratchEditRow(props: ToolViewProps) {
  const { args, state, summary, errorText, errorSummary } = useRow(props, "Edit");
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
      title="Scratch edit"
      summary={summary}
      state={state}
      body={bodyOf(text, state === "error")}
      errorSummary={errorSummary}
    />
  );
}

export function ScratchMkdirRow(props: ToolViewProps) {
  const { state, summary, errorText, errorSummary } = useRow(props, "Mkdir");
  return (
    <ScratchRow
      title="Scratch mkdir"
      summary={summary}
      state={state}
      body={bodyOf(state === "error" ? errorText : null, state === "error")}
      errorSummary={errorSummary}
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
