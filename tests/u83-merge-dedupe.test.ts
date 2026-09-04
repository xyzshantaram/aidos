/**
 * #83: a forked session must not multiply the board.
 *
 * `workspaceTickets` assembles three groups with no dedupe between them --
 * the caller's own rows, every live workspace session's rows, and every
 * closed session's rows from a persistence inspect. A fork's log contains
 * the SAME tickets as its parent, so every fork added another full copy of
 * the board.
 *
 * Measured live from #100's instrumented log: `own=110, foreign=164` on a
 * 274-row board -- about 60% duplicates. It also made every board read cost
 * ~2.5x what it should.
 *
 * Identity is `workspaceKey:slug` (the durable id from #35), stable across a
 * fork because a copy keeps both parts. Deliberately NOT the numeric id,
 * which collides across sessions and is the confusion behind eleven bugs in
 * this codebase.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { dedupeBoardRows } from "../src/host/aidos-core";
import type { BoardTicketView } from "../src/host/aidos-core";

const WS = "--home-sid-repos-aidos--";

function row(
  over: Partial<BoardTicketView> & { slug: string; updatedAt: number; sourceSessionId: string },
): BoardTicketView {
  return {
    id: 1,
    projectId: 1,
    title: "T",
    description: "",
    body: "",
    criteria: "",
    state: "open",
    phase: 1,
    order: 1,
    dependsOn: [],
    allowlist: [],
    confidenceScore: 0,
    gateFraction: null,
    gatePresent: null,
    gateTotal: null,
    updatedAt: 0,
    workspaceKey: WS,
    foreign: true,
    ...over,
  } as BoardTicketView;
}

describe("#83 one row per ticket identity", () => {
  it("collapses copies of the same ticket", () => {
    const out = dedupeBoardRows([
      row({ slug: "a", updatedAt: 100, sourceSessionId: "s1" }),
      row({ slug: "a", updatedAt: 200, sourceSessionId: "s2" }),
      row({ slug: "a", updatedAt: 150, sourceSessionId: "s3" }),
    ]);
    expect(out.rows).toHaveLength(1);
  });

  it("keeps the MOST RECENTLY UPDATED copy", () => {
    // The user's decision: a fork's copy is a snapshot that stopped moving,
    // so the newest updatedAt is the live one.
    const out = dedupeBoardRows([
      row({ slug: "a", updatedAt: 100, sourceSessionId: "old" }),
      row({ slug: "a", updatedAt: 900, sourceSessionId: "new" }),
    ]);
    expect(out.rows[0].sourceSessionId).toBe("new");
  });

  it("groups by workspaceKey:slug, NOT by numeric id", () => {
    /*
     * The single most important negative test here. Two different tickets
     * routinely share an id across sessions -- that collision is why the
     * composite board key exists. Grouping by id would MERGE UNRELATED
     * TICKETS and hide one of them.
     */
    const out = dedupeBoardRows([
      row({ id: 12, slug: "one-thing", updatedAt: 100, sourceSessionId: "s1" }),
      row({ id: 12, slug: "a-totally-different-thing", updatedAt: 200, sourceSessionId: "s2" }),
    ]);
    expect(out.rows).toHaveLength(2);
  });

  it("does not merge the same slug across DIFFERENT workspaces", () => {
    const out = dedupeBoardRows([
      row({ slug: "a", updatedAt: 100, sourceSessionId: "s1" }),
      row({ slug: "a", updatedAt: 200, sourceSessionId: "s2", workspaceKey: "--srv-other--" }),
    ]);
    expect(out.rows).toHaveLength(2);
  });
});

describe("#83 ties break deterministically", () => {
  it("the caller's OWN row wins a tie", () => {
    // It is the log the caller can write to directly; preferring it avoids
    // handing them a row whose writes must route to another session.
    const out = dedupeBoardRows([
      row({ slug: "a", updatedAt: 500, sourceSessionId: "aaa-foreign", foreign: true }),
      row({ slug: "a", updatedAt: 500, sourceSessionId: "zzz-own", foreign: false }),
    ]);
    expect(out.rows[0].sourceSessionId).toBe("zzz-own");
  });

  it("falls back to the lowest session id, so two reads agree", () => {
    const out = dedupeBoardRows([
      row({ slug: "a", updatedAt: 500, sourceSessionId: "s9" }),
      row({ slug: "a", updatedAt: 500, sourceSessionId: "s2" }),
    ]);
    expect(out.rows[0].sourceSessionId).toBe("s2");
  });

  it("is order-independent: shuffling the input does not change the winner", () => {
    const rows = [
      row({ slug: "a", updatedAt: 300, sourceSessionId: "s3" }),
      row({ slug: "a", updatedAt: 700, sourceSessionId: "s1" }),
      row({ slug: "a", updatedAt: 500, sourceSessionId: "s2" }),
    ];
    const forward = dedupeBoardRows(rows).rows[0].sourceSessionId;
    const backward = dedupeBoardRows([...rows].reverse()).rows[0].sourceSessionId;
    expect(forward).toBe("s1");
    expect(backward).toBe("s1");
  });
});

describe("#83 nothing vanishes silently", () => {
  it("records every superseded copy on the winner", () => {
    const out = dedupeBoardRows([
      row({ slug: "a", updatedAt: 900, sourceSessionId: "win" }),
      row({ slug: "a", updatedAt: 100, sourceSessionId: "lose-1" }),
      row({ slug: "a", updatedAt: 200, sourceSessionId: "lose-2" }),
    ]);
    const copies = out.rows[0].supersededCopies ?? [];
    expect(copies.map((c) => c.sessionId).sort()).toEqual(["lose-1", "lose-2"]);
  });

  it("reports each override so the caller can log it", () => {
    const out = dedupeBoardRows([
      row({ slug: "a", updatedAt: 900, sourceSessionId: "win" }),
      row({ slug: "a", updatedAt: 100, sourceSessionId: "lose" }),
    ]);
    expect(out.reports).toHaveLength(1);
    expect(out.reports[0].identity).toBe(WS + ":a");
    expect(out.reports[0].winner.sessionId).toBe("win");
    expect(out.reports[0].losers[0].sessionId).toBe("lose");
  });

  it("adds NO supersede marker when there was only one copy", () => {
    // The common case must stay clean: a marker on every row would make the
    // field meaningless and bloat every board read.
    const out = dedupeBoardRows([row({ slug: "a", updatedAt: 1, sourceSessionId: "s1" })]);
    expect(out.rows[0].supersededCopies).toBeUndefined();
    expect(out.reports).toHaveLength(0);
  });
});

describe("#83 a board without duplicates is untouched", () => {
  it("passes distinct tickets through unchanged, in order", () => {
    const input = [
      row({ slug: "a", updatedAt: 1, sourceSessionId: "s1" }),
      row({ slug: "b", updatedAt: 2, sourceSessionId: "s1" }),
      row({ slug: "c", updatedAt: 3, sourceSessionId: "s1" }),
    ];
    const out = dedupeBoardRows(input);
    expect(out.rows.map((r) => r.slug)).toEqual(["a", "b", "c"]);
    expect(out.reports).toHaveLength(0);
  });

  it("handles an empty board", () => {
    expect(dedupeBoardRows([]).rows).toEqual([]);
  });

  it("never invents or loses a ticket identity", () => {
    const input = [
      row({ slug: "a", updatedAt: 1, sourceSessionId: "s1" }),
      row({ slug: "a", updatedAt: 2, sourceSessionId: "s2" }),
      row({ slug: "b", updatedAt: 3, sourceSessionId: "s1" }),
    ];
    const out = dedupeBoardRows(input);
    expect(new Set(out.rows.map((r) => r.slug))).toEqual(new Set(["a", "b"]));
  });
});

describe("#83 review finding: the supersede record is actually SURFACED", () => {
  /*
   * The #83 review passed the logic and then found the honest gap: the field
   * was populated by the host, shipped to the client, and read by NOTHING.
   *
   * "The board can say '3 other copies' and a reader can still reach them"
   * was therefore theoretical. Duplicates stopped being shown, and nothing
   * said they had ever existed -- which is the invisible-stale-row failure
   * the design was written to avoid, arrived at by a different route.
   *
   * A dead field is worse than an absent one: it lets a claim look
   * implemented in review.
   */
  const tile = readFileSync(
    new URL("../src/client/ticket-tile.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");

  it("the tile reads supersededCopies", () => {
    expect(tile).toContain("supersededCopies");
  });

  it("shows the COUNT, so a merged row is distinguishable at a glance", () => {
    expect(tile).toContain("aidos-chip-copies");
    expect(tile).toContain('"+" + superseded.length');
  });

  it("names the losing sessions and their times on hover", () => {
    // The count alone says a merge happened; the tooltip is what makes the
    // copies REACHABLE, which is the part the claim rests on.
    expect(tile).toContain("copy.sessionId");
    expect(tile).toContain("copy.updatedAt");
  });

  it("is announced to assistive tech, not only on hover", () => {
    expect(tile).toContain("aria-label");
  });

  it("shows nothing when there was only one copy", () => {
    // The common case must stay clean, or the marker becomes noise and the
    // signal is lost -- #21's whole argument.
    expect(tile).toContain("superseded.length > 0 ?");
  });

  it("is styled QUIETLY, since a merge is routine context and not an ask", () => {
    const at = css.indexOf(".aidos-chip-copies {");
    expect(at).toBeGreaterThan(-1);
    const body = css.slice(at, css.indexOf("}", at));
    // Same tinted treatment as the other quiet chips, not the warning tone
    // reserved for things that block the human.
    expect(body).toContain("color-mix");
    expect(body).not.toContain("--state-awaiting");
  });
});
