/**
 * Ticket U2e: the allowlist editor's text-area parsing. One path per line,
 * trimmed, empties dropped, duplicates collapsed, order kept.
 */
import { describe, expect, it } from "vitest";

import { parseAllowlistText } from "../src/client/allowlist-editor";

describe("parseAllowlistText", () => {
  it("parses one path per line and drops empties", () => {
    expect(parseAllowlistText("src/\n\ntests/\n")).toEqual(["src/", "tests/"]);
  });

  it("trims surrounding whitespace", () => {
    expect(parseAllowlistText("  src/client/  \n\tdocs\n")).toEqual([
      "src/client/",
      "docs",
    ]);
  });

  it("deduplicates while keeping first-seen order", () => {
    expect(parseAllowlistText("b\na\nb\na\nc")).toEqual(["b", "a", "c"]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseAllowlistText("\n \n")).toEqual([]);
  });
});
