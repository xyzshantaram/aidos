/**
 * #73: the aidos tools' conversation cards.
 *
 * #71 took the host side as far as it goes -- each tool declares up to four
 * TEXT chips. Text cannot show a ticket's title, render an evidence strip,
 * or carry a button, which is why the client half exists.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { publishTicketTitles, ticketTitle, getSelection, setSelection } from "../src/client/view-state";

const rows = readFileSync(new URL("../src/client/aidos-rows.tsx", import.meta.url), "utf8");
const index = readFileSync(new URL("../src/client/index.ts", import.meta.url), "utf8");
const view = readFileSync(
  new URL("../src/client/local-ticket-view.tsx", import.meta.url),
  "utf8",
);

describe("#73 a ticket-bearing call names the ticket", () => {
  it("resolves an id to its title once the board has published", () => {
    publishTicketTitles([{ id: 14, title: "A real ticket title" }]);
    expect(ticketTitle(14)).toBe("A real ticket title");
    expect(ticketTitle("14")).toBe("A real ticket title");
  });

  it("returns null for an unknown id rather than inventing one", () => {
    /*
     * The card must never DEPEND on the board having been opened, or it
     * degrades exactly where it is most useful -- a fresh session reading
     * back what an agent did earlier. A bare id is a worse card, not a
     * broken one.
     */
    expect(ticketTitle(999999)).toBeNull();
  });

  it("falls back to the bare id in the card, never to blank", () => {
    expect(rows).toContain("`#${ticketId}`");
    expect(rows).toContain("`#${ticketId} — ${title}`");
  });

  it("the board publishes the titles it renders", () => {
    expect(view).toContain("publishTicketTitles(rawTickets)");
  });
});

describe("#73 an evidence call renders a real EvidenceStrip", () => {
  it("imports the shared component rather than a lookalike", () => {
    /*
     * The criterion's whole point: one evidence row must look identical in
     * the tool card, the evidence panel, the criteria panel and the
     * mark-done modal -- which only holds if it is literally the same
     * component. #82 proved the alternative when three hand-written
     * approximations of tool-render all failed.
     */
    expect(rows).toContain('from "./evidence-strip"');
    expect(rows).toContain("<EvidenceStrip");
  });

  it("normalises a short kind to its builtin id", () => {
    // The tool accepts "review_pass"; the strip colours and labels by the
    // full "builtin:review_pass". Passing the short form would render an
    // unknown kind.
    expect(rows).toContain('kind.startsWith("builtin:") ? kind : "builtin:" + kind');
  });
});

describe("#73 click-through uses the settled fallback", () => {
  it("writes the selection to the board's module store", () => {
    /*
     * No API in the conversation contract activates a tab programmatically,
     * so the decided fallback is: the card SELECTS the ticket and the board
     * opens there when the user switches tabs. That store exists because of
     * #100 -- the selection had to live outside React state to survive the
     * slot remount a badge change causes.
     */
    expect(rows).toContain("setSelection(");
    setSelection("sess-73", "14");
    expect(getSelection("sess-73")).toBe("14");
  });

  it("keys the selection with a BOARD KEY, never a bare id string", () => {
    // The address-space confusion behind eleven bugs in this codebase.
    expect(rows).toContain("asBoardKey(");
  });

  it("does not offer a click when there is no ticket or no session", () => {
    expect(rows).toContain("props.ticketId !== null && props.ticketId !== undefined");
    expect(rows).toContain("props.sessionId !== undefined");
  });
});

describe("#73 the board read leads with its count", () => {
  it("prefers the #71 summary field over re-deriving it", () => {
    // "Showing 30 of 42 matching tickets" -- a truncated read used to look
    // exactly like a complete one.
    expect(rows).toContain('typeof result?.summary === "string"');
  });
});

describe("#73 registration survives a dsh client update", () => {
  it("shadows BELOW the shipped rows", () => {
    expect(index).toContain("priority: -100");
  });

  it("registers every aidos row through the same seam as the scratch rows", () => {
    expect(index).toContain("AIDOS_ROWS");
    expect(rows).toContain('["attach_evidence", AttachEvidenceRow]');
    expect(rows).toContain('["move_ticket", MoveTicketRow]');
  });
});
