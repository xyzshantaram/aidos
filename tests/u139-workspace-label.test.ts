/**
 * #139 (2026-09-07): a workspace whose directory name contains a hyphen
 * rendered as its last fragment — `dotfiles-ai` showed as `ai`.
 *
 * **Why the old code could not be "fixed" in place.** The key is dsh's own
 * `projectKey` transform: `/` becomes `-`, and a literal `-` in a directory
 * name passes through UNCHANGED (`src/kernel/slug.ts:40` keeps `-` in the
 * safe set). So `/home/sid/repos/dotfiles-ai` and a hypothetical
 * `/home/sid/repos/dotfiles/ai` produce the SAME key. Splitting on `-` was
 * not a buggy heuristic; it was being asked to invert a function that is
 * not injective. No amount of cleverness on the client recovers the name.
 *
 * So the host — the only side that holds each session's real cwd — sends
 * the label with the merge, and the client remembers it. The guess stays as
 * the fallback for a key nobody has told us about, because a short
 * wrong-ish label still beats printing the whole encoded path.
 */

import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it } from "vitest";

import {
  __resetWorkspaceLabelsForTests,
  displayDep,
  rememberWorkspaceLabel,
  workspaceLabel,
} from "../src/client/board-logic";
import { workspaceKeyFromPath } from "../src/kernel/slug";

const board = readFileSync(
  new URL("../src/client/local-ticket-view.tsx", import.meta.url),
  "utf8",
);
const host = readFileSync(
  new URL("../src/host/aidos-core.ts", import.meta.url),
  "utf8",
);

describe("#139 the key is genuinely ambiguous", () => {
  it("a hyphenated directory and a nested one encode IDENTICALLY", () => {
    /*
     * The proof that the client cannot fix this alone. If these two ever
     * stop matching, the encoding changed and this whole design should be
     * revisited — so the test is a tripwire on the premise, not decoration.
     */
    expect(workspaceKeyFromPath("/home/sid/repos/dotfiles-ai")).toBe(
      workspaceKeyFromPath("/home/sid/repos/dotfiles/ai"),
    );
  });
});

describe("#139 a learned label beats the guess", () => {
  beforeEach(() => {
    __resetWorkspaceLabelsForTests();
  });

  it("renders the REAL directory name once the host has sent it", () => {
    const key = workspaceKeyFromPath("/home/sid/repos/dotfiles-ai");
    // The reported bug, verbatim: without the label, the tail wins.
    expect(workspaceLabel(key)).toBe("ai");
    rememberWorkspaceLabel(key, "dotfiles-ai");
    expect(workspaceLabel(key)).toBe("dotfiles-ai");
  });

  it("still guesses for a workspace nobody has told us about", () => {
    // A closed session on another machine, or an old row: a short label is
    // better than the entire encoded path.
    expect(workspaceLabel(workspaceKeyFromPath("/home/sid/repos/aidos"))).toBe("aidos");
  });

  it("carries the learned label into dependency chips", () => {
    const key = workspaceKeyFromPath("/home/sid/repos/dotfiles-ai");
    rememberWorkspaceLabel(key, "dotfiles-ai");
    expect(displayDep(key + ":42")).toBe("dotfiles-ai#42");
  });

  it("ignores an empty or blank label rather than replacing a usable guess", () => {
    const key = workspaceKeyFromPath("/home/sid/repos/dotfiles-ai");
    rememberWorkspaceLabel(key, "   ");
    expect(workspaceLabel(key)).toBe("ai");
  });

  it("a later label wins, so a renamed directory corrects itself", () => {
    const key = workspaceKeyFromPath("/home/sid/repos/dotfiles-ai");
    rememberWorkspaceLabel(key, "dotfiles-ai");
    rememberWorkspaceLabel(key, "dotfiles-ai-renamed");
    expect(workspaceLabel(key)).toBe("dotfiles-ai-renamed");
  });

  it("one workspace's label never leaks onto another key", () => {
    const ai = workspaceKeyFromPath("/home/sid/repos/dotfiles-ai");
    const aidos = workspaceKeyFromPath("/home/sid/repos/aidos");
    rememberWorkspaceLabel(ai, "dotfiles-ai");
    expect(workspaceLabel(aidos)).toBe("aidos");
  });
});

describe("#139 the host sends what only it can know", () => {
  it("the merge result carries a workspaceLabels map", () => {
    expect(host).toContain("workspaceLabels: Record<string, string>");
    expect(host).toContain("workspaceLabels[workspaceKeyFromPath(cwd)] = label");
  });

  it("the label is the cwd's BASENAME, not another guess at the key", () => {
    expect(host).toContain("const label = basename(cwd);");
  });

  it("the client learns every label BEFORE the rows render", () => {
    expect(board).toContain("rememberWorkspaceLabel(key, label)");
    // Learned from the merge payload, not re-derived client-side.
    expect(board).toContain("workspaceLabels");
  });
});
