/**
 * The canonical id, audited (user, 2026-09-08): *"the entire idea of the
 * canonical id system was cross-workspace and session correctness: every
 * ticket always has exactly one id everywhere"* — with the boundary drawn
 * in the same breath: *"for display purposes using the short id is fine in
 * a local (single-workspace) context, only for display."*
 *
 * So there are two rules and this file pins both:
 *
 * 1. ONE derivation. Not "two copies that agree today" — the client called
 *    its version the single implementation while the host carried an inline
 *    copy in the workspace merge's dedupe. The host WRITES the evidence and
 *    comment maps that key indexes and the client READS them back, so a
 *    divergence orphans a row's evidence while the board keeps rendering
 *    the ticket. They agreed by coincidence, which is not a property.
 *
 * 2. A bare id addresses nothing. It is a display form for a local,
 *    single-workspace context. Every lookup, write, route and map key uses
 *    the board key.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { boardKeyText, parseBoardKey } from "../src/kernel/board-key";
import { boardKeyOf } from "../src/client/board-logic";

const read = (path: string): string =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8");

describe("one ticket, one address", () => {
  it("derives a foreign row's key from its owning session", () => {
    expect(
      boardKeyText({ id: 12, foreign: true, sourceSessionId: "sess-abc" }),
    ).toBe("sess-abc:12");
  });

  it("leaves a local row on its bare id — the local address AND the display form", () => {
    expect(boardKeyText({ id: 12 })).toBe("12");
    expect(boardKeyText({ id: 12, foreign: false, sourceSessionId: "sess-abc" })).toBe("12");
  });

  it("a foreign row is never confused with the same-numbered local one", () => {
    /*
     * The #93 bug, as a property: the queue keyed evidence with a bare
     * String(ticket.id), so foreign #12 read own #12's rows and an action
     * on it WROTE to own #12.
     */
    const foreign = boardKeyText({ id: 12, foreign: true, sourceSessionId: "sess-abc" });
    const own = boardKeyText({ id: 12 });
    expect(foreign).not.toBe(own);
  });

  it("round-trips through parseBoardKey, and a session id containing a colon survives", () => {
    for (const row of [
      { id: 3 },
      { id: 3, foreign: true, sourceSessionId: "sess-abc" },
      { id: 41, foreign: true, sourceSessionId: "oc:9:weird" },
    ]) {
      const parsed = parseBoardKey(boardKeyText(row));
      expect(parsed.id).toBe(row.id);
      expect(parsed.foreign).toBe(row.foreign === true);
      if (row.foreign === true) expect(parsed.sourceSessionId).toBe(row.sourceSessionId);
    }
  });

  it("only a fully NUMERIC tail is an id: a slug-shaped tail is not a composite", () => {
    expect(parseBoardKey("--home-sid-repos-aidos--:some-slug").foreign).toBe(false);
  });

  it("the client's branded helper is the kernel rule, not a second copy of it", () => {
    const row = { id: 7, foreign: true, sourceSessionId: "sess-z" };
    expect(String(boardKeyOf(row))).toBe(boardKeyText(row));
  });
});

describe("no second implementation of the rule", () => {
  /*
   * The literal shape of every copy this codebase has grown:
   * `foreign ? sourceSessionId + ":" + id : String(id)`. If it appears
   * anywhere but the kernel module, the planes can drift again.
   */
  const CONCATENATION = /sourceSessionId\s*\+\s*["']:["']\s*\+/;

  for (const file of [
    "src/host/aidos-core.ts",
    "src/client/board-logic.ts",
    "src/client/queue-panel.tsx",
    "src/client/local-ticket-view.tsx",
    "src/client/ticket-view.tsx",
    "src/kernel/projections.ts",
  ]) {
    it(`${file} derives the key rather than rebuilding it`, () => {
      const text = read(file);
      expect(
        CONCATENATION.test(text),
        `${file} builds a board key by hand; call boardKeyText/boardKeyOf`,
      ).toBe(false);
    });
  }

  it("the kernel module is where the rule actually lives", () => {
    expect(CONCATENATION.test(read("src/kernel/board-key.ts"))).toBe(true);
  });
});

describe("a bare id is display-only", () => {
  it("the surviving String(ticket.id) call sites are SEARCH, not addressing", () => {
    /*
     * Two remain, both matching a typed query against the visible number
     * ("12" finds #12). That is the local display context the rule allows.
     * If either ever became a lookup key it would be the #93 bug again, so
     * the assertion names them: a new occurrence has to be justified here.
     */
    const projections = read("src/kernel/projections.ts");
    const logic = read("src/client/board-logic.ts");
    for (const [name, text] of [
      ["projections", projections],
      ["board-logic", logic],
    ] as const) {
      /*
       * CODE lines only: the prose above boardKeyOf quotes the old bad
       * call on purpose, and a test that counts its own documentation
       * teaches people to delete the documentation.
       */
      const codeUses = text
        .split("\n")
        .filter((line) => line.includes("String(ticket.id)"))
        .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line));
      for (const line of codeUses) {
        expect(
          line,
          `${name}: a bare id may only be MATCHED against a query, never used as an address`,
        ).toMatch(/String\(ticket\.id\)\.includes\(query\)/);
      }
    }
  });
});
