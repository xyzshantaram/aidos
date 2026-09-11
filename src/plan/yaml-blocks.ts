/**
 * The shared YAML-block handler for the aidos literate markdown documents.
 *
 * The plan (#153), the checklist (#134), and the review file (#151) are one
 * family: markdown prose with fenced ```yaml blocks that carry the structured
 * fields. This module is that family's one grammar for a fenced YAML block —
 * where the fence sits, how the block is read, and how a bad block names its
 * line. The per-document parsers own their own schemas; they share this
 * reader rather than re-implementing fence scanning and YAML parsing.
 *
 * Pure functions. Errors are YamlBlockError with a 1-based line number, so a
 * document parser can rethrow them as its own parse error without losing the
 * offending line.
 */

import YAML from "yaml";

/** The fence that opens a YAML block. */
const OPEN_FENCE = /^```yaml\s*$/;
/** The fence that closes any code block. */
const CLOSE_FENCE = /^```\s*$/;

/** A fenced YAML block failed to read or parse. The line is 1-based. */
export class YamlBlockError extends Error {
  readonly line: number;
  constructor(line: number, message: string) {
    super(`line ${line}: ${message}`);
    this.line = line;
  }
}

/** Say whether one line opens a fenced YAML block. */
export function isYamlFence(line: string): boolean {
  return OPEN_FENCE.test(line);
}

/**
 * Take one fenced YAML block starting at `openIndex` (0-based, which must
 * satisfy isYamlFence). Returns the raw YAML text between the fences and the
 * 0-based index of the first line after the closing fence. Throws when the
 * block never closes.
 */
export function takeYamlBlock(
  lines: readonly string[],
  openIndex: number,
): { raw: string; end: number } {
  for (let index = openIndex + 1; index < lines.length; index++) {
    if (CLOSE_FENCE.test(lines[index])) {
      return {
        raw: lines.slice(openIndex + 1, index).join("\n"),
        end: index + 1,
      };
    }
  }
  throw new YamlBlockError(openIndex + 1, "the yaml block never closes");
}

/**
 * Parse the raw text of one fenced YAML block. The block must hold a mapping;
 * an empty block parses as an empty record. A scalar or a list is refused,
 * because every consumer of this grammar carries named fields.
 */
export function parseYamlBlock(
  raw: string,
  startLine: number,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new YamlBlockError(startLine, "the yaml block is not valid YAML: " + message);
  }
  if (parsed === null || parsed === undefined) {
    return {};
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new YamlBlockError(
      startLine,
      "the yaml block must hold a mapping of named fields",
    );
  }
  return parsed as Record<string, unknown>;
}
