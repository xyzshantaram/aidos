/**
 * Item 25. Every subcommand prints JSON, on success and on failure.
 *
 * The claim is a B1 tool test. The kernel has no CLI, no subprocess, and
 * no JSON rendering. Plan export prints markdown, which is the one
 * exception to the JSON rule. This file holds the comment and no
 * assertion.
 */

import { describe, expect, it } from "vitest";

describe("every subcommand prints JSON", () => {
  it("is a B1 tool test", () => {
    // Every subcommand must write one JSON object to stdout on success
    // and one JSON object with ok false on a detected failure, and it
    // must exit with the documented code. Plan export is the one
    // exception and writes markdown. The kernel surface returns typed
    // values and typed errors; JSON rendering, the exit codes, and the
    // stderr guarantees belong to the B1 tool.
  });
});
