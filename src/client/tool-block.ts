/**
 * #82: reading a tool-call block, for the scratch tools' rendered rows.
 *
 * PORTED from dotfiles-ai's tool-render (its `client.tsx` helpers), not
 * imported: aidos must not depend on anything external (#72), and the scratch
 * tools are aidos's own so their rendering is aidos's to own. The SHAPES here
 * are dictated by the harness's block format, so they are copied faithfully
 * rather than reinvented -- a divergent reader would render subtly wrong
 * rows, which is worse than rendering none.
 *
 * Pure and free of React on purpose. tool-render keeps this logic inline in
 * its components, which is exactly the pattern this project keeps paying for:
 * logic inside a component is logic no test can reach. Every rule here is
 * unit tested.
 */

/** A settled block carries `kind`; an in-flight one does not. */
export function isDone(block: unknown): boolean {
  return block !== null && typeof block === "object" && "kind" in (block as object);
}

/** The raw JSON argument string, from either the settled or in-flight shape. */
export function argsRawOf(block: unknown): string {
  if (block === null || typeof block !== "object") return "";
  const b = block as Record<string, unknown>;
  if (isDone(block)) {
    const call = b.call as Record<string, unknown> | undefined;
    return call !== undefined && typeof call.argsRaw === "string" ? call.argsRaw : "";
  }
  return typeof b.argsRaw === "string" ? b.argsRaw : "";
}

/** Parse the argument JSON. Returns null rather than throwing on garbage. */
export function parseArgs(raw: string): Record<string, unknown> | null {
  if (raw === "") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The first of `keys` present as a non-empty string. */
export function pickString(
  value: Record<string, unknown> | null,
  keys: readonly string[],
): string | undefined {
  if (value === null) return undefined;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate !== "") return candidate;
  }
  return undefined;
}

export type RowState = "running" | "ok" | "error" | "stopped";

/**
 * The row's state.
 *
 * An INTERRUPTED call is "stopped" rather than "error": the user stopped it,
 * which is not a failure and must not be tinted like one.
 */
export function rowStateOf(block: unknown): RowState {
  if (!isDone(block)) return "running";
  const b = block as Record<string, unknown>;
  const error = b.error as Record<string, unknown> | undefined;
  if (error !== undefined && error.code === "interrupted") return "stopped";
  return b.isError === true ? "error" : "ok";
}

/** Every text block joined; non-text content is shown as pretty JSON. */
export function resultTextOf(block: unknown): string | null {
  if (!isDone(block)) return null;
  const content = (block as Record<string, unknown>).content;
  const items = Array.isArray(content) ? content : [];
  const parts: string[] = [];
  for (const item of items) {
    if (item !== null && typeof item === "object") {
      const entry = item as Record<string, unknown>;
      if (entry.type === "text" && typeof entry.text === "string") {
        parts.push(entry.text);
        continue;
      }
      try {
        parts.push(JSON.stringify(entry, null, 2));
      } catch {
        /* a circular payload is skipped rather than crashing the row */
      }
    }
  }
  return parts.join("\n");
}

/** The error text: the body if there is one, else the error's own fields. */
export function errorTextOf(block: unknown): string | null {
  if (!isDone(block)) return null;
  const text = resultTextOf(block);
  if (text !== null && text !== "") return text;
  const error = (block as Record<string, unknown>).error as Record<string, unknown> | undefined;
  if (error !== undefined && typeof error.message === "string") return error.message;
  if (error !== undefined && typeof error.code === "string") return error.code;
  return null;
}

export function firstLine(text: string): string {
  const at = text.indexOf("\n");
  return at === -1 ? text : text.slice(0, at);
}

/**
 * The line of an error worth putting on the row.
 *
 * Prefers a line carrying a NAMED failure token over the first line, which
 * is often an unhelpful wrapper like "Error:". The scratch tools' own
 * refusals are in this family -- FS_NOT_OBSERVED, FS_AMBIGUOUS_EDIT,
 * AIDOS_EDIT_GRAMMAR_UNSUPPORTED -- so the row names the actual problem
 * instead of the wrapper.
 */
const ERROR_TOKEN = /\[(?:E_|exit code:|sandbox:)|FS_[A-Z_]+|AIDOS_[A-Z_]+/;

export function firstLineOfError(text: string): string {
  if (text === "") return text;
  for (const line of text.split("\n")) {
    if (ERROR_TOKEN.test(line)) return line;
  }
  return firstLine(text);
}

/**
 * A path shortened against the workspace root, for the row summary.
 *
 * The scratch root is long and identical on every row
 * (`/home/.../.dsh/aidos/scratch/--workspace--/`), so showing it in full
 * would push the part that differs off the end of the line.
 */
export function relativize(path: string, root: string | undefined): string {
  if (root === undefined || root === "") return path;
  const base = root.endsWith("/") ? root : root + "/";
  return path.startsWith(base) ? path.slice(base.length) : path;
}

/**
 * The scratch tools return a JSON envelope as their only text block. The row
 * shows the FILE CONTENT rather than the envelope, since the envelope's
 * fields (path, scratch_root) are already on the row.
 */
export function unwrapScratchResult(text: string | null): string | null {
  if (text === null || text === "") return text;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object") return text;
    const value = parsed as Record<string, unknown>;
    if (typeof value.content === "string") return value.content;
    if (typeof value.message === "string") return value.message;
    return text;
  } catch {
    return text;
  }
}
