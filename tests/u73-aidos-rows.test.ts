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
import { AIDOS_ROWS } from "../src/client/aidos-rows";
import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness } from "./b1-harness";

/**
 * The aidos tool names the host actually REGISTERS, read from the registry
 * rather than from a list. See the parity suite below for why that matters.
 */
function registeredAidosToolNames(): string[] {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const map = (harness as unknown as { tools?: Map<string, { name: string }> }).tools;
  if (map === undefined) return [];
  // The harness registry may also hold fs/bash stubs, which have no aidos row.
  const AIDOS = new Set([
    "get_tickets",
    "get_ticket",
    "set_ticket",
    "attach_evidence",
    "move_ticket",
    "plan",
    "plan_import",
    "plan_meta",
    "plan_meta_set",
    "request_allowlist",
    "suggest_actions",
  ]);
  return [...map.keys()].filter((name) => AIDOS.has(name));
}

const rows = readFileSync(new URL("../src/client/aidos-rows.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
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

/*
 * ── Every registered tool has a row ───────────────────────────────────────
 *
 * User-reported: "I see the tool call card for read_ticket and edit_ticket,
 * but I don't see request_allowlist."
 *
 * Five of the eleven aidos tools had a client row; the other six still
 * rendered a raw JSON envelope. #71's coverage test enumerates the HOST-side
 * presentCall declarations and all eleven have one -- the client rows are a
 * SECOND, separate registration, and nothing compared the two lists.
 *
 * This test compares them, and it enumerates the registry rather than
 * checking a hardcoded list: a new tool is covered the moment it is
 * registered, instead of needing a list update from the same person who
 * forgot the row.
 */
describe("#73 every registered aidos tool has a client row", () => {
  const registered = registeredAidosToolNames();

  it("finds the tools at all", () => {
    // Guards the degenerate pass: a broken registry lookup would make the
    // assertion below vacuously succeed over an empty list.
    expect(registered.length).toBeGreaterThanOrEqual(11);
  });

  it("leaves no tool rendering a raw JSON envelope", () => {
    const missing = registered.filter((name) => !AIDOS_ROWS.some(([key]) => key === name));
    expect(
      missing,
      "these tools have no client row and render as raw JSON; add one to AIDOS_ROWS",
    ).toEqual([]);
  });

  it("registers no row for a tool that does not exist", () => {
    // The other direction: a row keyed on a renamed tool is dead weight that
    // silently never renders.
    const orphans = AIDOS_ROWS.map(([key]) => key).filter((key) => !registered.includes(key));
    expect(orphans).toEqual([]);
  });
});

describe("#73 every row can be expanded", () => {
  /*
   * User-reported: "the expanded view doesn't work". Only attach_evidence
   * supplied a body, so every other row had nothing to expand -- no chevron,
   * and a click that did nothing visible.
   */
  it("gives an errored call a body, so a failure is never a dead end", () => {
    expect(rows).toContain("function errorBody(");
    // Every row must route its error through it, or that row's failure shows
    // one truncated line with nowhere to see the rest.
    const uses = rows.match(/errorBody\(errorText\)/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(9);
  });

  it("expands a ticket read into its facts and its evidence", () => {
    expect(rows).toContain("ticketFacts(result)");
    expect(rows).toContain("ticketEvidence(result)");
  });

  it("expands a board read into the rows it returned", () => {
    expect(rows).toContain("ticketLines(result)");
  });

  it("expands a ticket write into the fields it wrote", () => {
    expect(rows).toContain("writtenFields(args)");
  });

  it("expands an allowlist request into its paths", () => {
    expect(rows).toContain("allowlistPaths(args, result)");
    // #104: which paths approving would CREATE is the informed half of
    // informed consent.
    expect(rows).toContain("will be created");
  });

  it("expands a nomination into its REASONS, not just a count", () => {
    expect(rows).toContain("suggestionLines(args)");
    expect(rows).toContain("line.reason");
  });

  it("shows the plan tool's result as text, since its result IS text", () => {
    expect(rows).toContain("resultTextOf(props.block)");
  });
});

describe("#73 the card bodies match the transcript, not the board", () => {
  it("uses the harness design tokens, with fallbacks", () => {
    /*
     * The --dsw-alias-* tokens are the HARNESS's design system and are global
     * to the page, so using them matches the app rather than depending on
     * another plugin -- the distinction #82 settled. A var() to an undeclared
     * token renders as NOTHING, so each carries a fallback.
     */
    expect(css).toContain("var(--dsw-alias-markdown-code-block, var(--surface-raised))");
    expect(css).toContain("var(--dsw-alias-label-primary, var(--text-primary))");
  });

  it("borrows tool-render's own box metrics", () => {
    // Same radius, padding and clamp as .tool-render-output, so an expanded
    // aidos card sits in the same family as an expanded fs card.
    const facts = css.slice(css.indexOf(".aidos-tool-facts,"));
    expect(facts).toContain("border-radius: 0.625rem");
    expect(facts).toContain("padding: 0.625rem 0.8125rem");
    expect(facts).toContain("max-height: 17.5rem");
  });
});
