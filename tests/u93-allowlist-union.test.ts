/**
 * #93 review 5: the allowlist union had NO COVERAGE, and that gap had teeth.
 *
 * The reviewer mutated this exact line to prove it was untested. My next
 * `git add -A` swept the mutation into the repo, and the pre-commit suite
 * passed 585/585 WITH the bug in place -- because nothing tested it. An
 * uncovered line is not merely unverified; it is a line that can silently
 * regress through the normal workflow.
 *
 * The reviewer called it "structurally untestable without jsdom". It was not:
 * the logic was trapped inside a useEffect. Extracted, it needs no DOM.
 */
import { describe, expect, it } from "vitest";

import { otherAllowlistUnion } from "../src/client/allowlist-editor";

const own = (id: number, state: string, allowlist: string[]) => ({
  id,
  state,
  allowlist,
  foreign: false,
  sourceSessionId: "sess-me",
});

const foreign = (id: number, state: string, allowlist: string[]) => ({
  id,
  state,
  allowlist,
  foreign: true,
  sourceSessionId: "sess-other",
});

describe("#93 otherAllowlistUnion", () => {
  it("collects paths from other in-progress tickets", () => {
    const union = otherAllowlistUnion(
      [own(1, "in_progress", ["src/a"]), own(2, "in_progress", ["src/b"])],
      "1",
    );
    expect(union).toEqual(["src/b"]);
  });

  it("excludes the ticket being edited, by BOARD KEY", () => {
    const union = otherAllowlistUnion([own(1, "in_progress", ["src/a"])], "1");
    expect(union).toEqual([]);
  });

  it("does NOT exclude a foreign ticket that merely shares the number", () => {
    // The regression this pins: comparing bare ids dropped sess-other:1's
    // paths from the union, because it happens to also be numbered 1.
    const union = otherAllowlistUnion(
      [own(1, "in_progress", ["src/a"]), foreign(1, "in_progress", ["src/foreign"])],
      "1",
    );
    expect(union).toEqual(["src/foreign"]);
  });

  it("ignores tickets that are not in progress", () => {
    const union = otherAllowlistUnion(
      [own(2, "open", ["src/b"]), own(3, "done", ["src/c"])],
      "1",
    );
    expect(union).toEqual([]);
  });

  it("dedupes paths shared by several tickets, keeping first-seen order", () => {
    const union = otherAllowlistUnion(
      [
        own(2, "in_progress", ["src/shared", "src/b"]),
        own(3, "in_progress", ["src/shared", "src/c"]),
      ],
      "1",
    );
    expect(union).toEqual(["src/shared", "src/b", "src/c"]);
  });

  it("tolerates a row with no allowlist", () => {
    expect(
      otherAllowlistUnion([{ id: 2, state: "in_progress" }], "1"),
    ).toEqual([]);
  });
});
