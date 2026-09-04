/**
 * Types for the VENDORED tool-render text helpers (#82).
 *
 * This file is aidos's own and is NOT vendored -- the drift check ignores
 * it. Upstream's `text.ts` is untyped (plain JS in a .ts file), which fails
 * aidos's strict typecheck, and a vendored file must never be edited: the
 * fix belongs upstream, and a local edit would be silently destroyed by the
 * next re-vendor. So the implementation is vendored verbatim as `text.js`
 * and typed from the outside, here.
 *
 * Only the helpers aidos actually uses are declared. Declaring the rest
 * would be asserting shapes nobody checks.
 */

/** One numbered line of a read result. */
export interface ReadRow {
  /** The file line number, or null for a row that has no position. */
  number: number | null;
  text: string;
}

/**
 * The first line number a read result represents. Reads the offset from the
 * call's arguments when present, else infers it from the output envelope.
 */
export function readStartLine(args: unknown, output: string): number;

/**
 * Split a read result into numbered rows, stripping the builtin read
 * envelope (the `<path>`/`<content>` wrapper and the `N: ` line prefixes)
 * so the body shows the file, not the transport.
 */
export function numberedReadRows(output: string, startLine: number): ReadRow[];

/** Whether these lines are the builtin read envelope rather than raw content. */
export function isBuiltinReadEnvelope(lines: readonly string[]): boolean;
