/**
 * #73: the aidos tools' conversation cards.
 *
 * #71 took the host side as far as it goes -- each tool declares up to four
 * TEXT chips. Text cannot show a ticket's title, render an evidence strip,
 * or carry a button, which is why the client half exists.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  getSelection,
  onSelectionChanged,
  publishTicketTitles,
  setSelection,
  ticketTitle,
} from "../src/client/view-state";
import { AIDOS_ROWS, errorBody } from "../src/client/aidos-rows";
import { parseErrorEnvelope, rowSummary, unwrapErrorEnvelope } from "../src/client/tool-block";
import { boardQuerySummary, ticketFromProjection } from "../src/client/aidos-row-data";
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

/*
 * ── The board read describes its QUERY, and counts under the answer ──────
 *
 * User direction, 2026-09-05: the collapsed summary should be a one-line
 * summary of the ARGUMENTS, and the result count moves to after the body.
 *
 * The test this replaces asserted the source substring
 * `typeof result?.summary === "string"` under the name "the board read leads
 * with its count". That substring SURVIVES this change -- the count still
 * exists, it just feeds the footer now -- so the old test would have gone on
 * passing while its named subject became false. Behaviour, not source text.
 */
describe("the board read's collapsed summary describes the query", () => {
  it("names the filters that were asked for", () => {
    expect(boardQuerySummary({ stateIds: ["in_progress"] })).toBe("in_progress");
    expect(boardQuerySummary({ stateIds: ["open", "done"] })).toBe("open|done");
    expect(boardQuerySummary({ search: "allowlist" })).toBe('"allowlist"');
    expect(boardQuerySummary({ stateIds: ["open"], search: "gate" })).toBe('open · "gate"');
  });

  it("DISTINGUISHES two reads that return the same count", () => {
    /*
     * The whole point of the change. Under the old rule both of these
     * rendered as the result's own "Showing 7 of 7 matching tickets" and
     * were indistinguishable in a transcript.
     */
    const a = boardQuerySummary({ stateIds: ["in_progress"] });
    const b = boardQuerySummary({ search: "vendor", sortKey: "alpha" });
    expect(a).not.toBe(b);
  });

  it("carries the direction WITH the sort key, never alone", () => {
    expect(boardQuerySummary({ sortKey: "confidence" })).toBe("confidence ↓");
    expect(boardQuerySummary({ sortKey: "alpha", descending: false })).toBe("alpha ↑");
    // A direction with nothing to apply to says nothing and is dropped.
    expect(boardQuerySummary({ descending: false })).toBe("all tickets");
  });

  it("says so when nothing was filtered, instead of rendering blank", () => {
    expect(boardQuerySummary({})).toBe("all tickets");
    expect(boardQuerySummary(null)).toBe("all tickets");
    // An empty stateIds array is not a filter.
    expect(boardQuerySummary({ stateIds: [] })).toBe("all tickets");
  });

  it("shows a real page but not the default offset", () => {
    expect(boardQuerySummary({ limit: 30 })).toBe("limit 30");
    expect(boardQuerySummary({ limit: 30, offset: 0 })).toBe("limit 30");
    expect(boardQuerySummary({ limit: 30, offset: 30 })).toBe("limit 30 · offset 30");
  });

  it("prefers projectIds over projectId when both are present", () => {
    expect(boardQuerySummary({ projectId: 1 })).toBe("project 1");
    expect(boardQuerySummary({ projectIds: [1, 2] })).toBe("projects 1,2");
    expect(boardQuerySummary({ projectId: 1, projectIds: [2, 3] })).toBe("projects 2,3");
  });

  it("SHOWS a malformed filter rather than swallowing it", () => {
    /*
     * Arguments arrive as whatever the model emitted, and the tempting
     * defensive move -- drop anything off-shape -- makes the row LIE: a call
     * that passed `stateIds: "open"` would render "all tickets", which is
     * the one thing it certainly did not ask for. A row that hides a filter
     * is worse than one that shows an odd-looking filter, because only the
     * odd-looking one prompts anybody to look.
     *
     * This expectation was originally written the other way round and the
     * test caught the code being inconsistent with itself: a numeric
     * `search` was shown while a string `stateIds` vanished.
     */
    expect(boardQuerySummary({ stateIds: "open" })).toBe("open");
    expect(boardQuerySummary({ search: 42 })).toBe('"42"');
    expect(boardQuerySummary({ stateIds: [null, "open"] })).toBe("open");
  });

  it("never throws on a shape it cannot read", () => {
    // A row must never take down the transcript.
    expect(() => boardQuerySummary({ stateIds: {} })).not.toThrow();
    expect(() => boardQuerySummary({ search: {} })).not.toThrow();
    expect(() => boardQuerySummary({ projectIds: "x" })).not.toThrow();
    expect(boardQuerySummary({ stateIds: {} })).toBe("all tickets");
  });
});

describe("the board read's count moves under the rows it counts", () => {
  it("feeds the #71 summary field to the FOOTER, not the row", () => {
    // A truncated read must still be visible as truncated -- the count is
    // moved, not dropped.
    expect(rows).toContain("footer={footer}");
    expect(rows).toContain('const footer = typeof result?.summary === "string"');
    // And the collapsed summary no longer reads the result at all.
    expect(rows).toContain("const summary = boardQuerySummary(args)");
  });

  it("renders the footer after the body inside the expanded card", () => {
    const body = rows.indexOf("{body}\n          {footer !== null");
    expect(body).toBeGreaterThan(-1);
  });

  it("expands for a footer even when there are no rows to list", () => {
    // "Showing 0 of 42" is the whole answer for a read that matched nothing.
    expect(rows).toContain("const expandable = body !== null || footer !== null");
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

describe("#73 click-through reaches a board that is already mounted", () => {
  /*
   * User-reported: "clickthrough does not work". The store was written for
   * #100, where it is read once on MOUNT to restore a selection that a
   * remount destroyed -- and a read-on-mount store is enough for that. A
   * tool card writes to a board that is ALREADY mounted and never remounts,
   * so nothing ever re-read it.
   *
   * My own note in aidos-rows.tsx claimed the board "opens there when you
   * switch tabs". That was wrong on its own terms: switching tabs does not
   * remount the view either.
   */
  it("notifies a subscriber when the selection changes", () => {
    const seen: string[] = [];
    const stop = onSelectionChanged((sessionId) => seen.push(sessionId));
    setSelection("s-click", "aidos#7");
    expect(seen).toEqual(["s-click"]);
    expect(getSelection("s-click")).toBe("aidos#7");
    stop();
    setSelection("s-click", "aidos#8");
    expect(seen, "an unsubscribed listener must not be called").toEqual(["s-click"]);
  });

  it("does not notify when the selection is unchanged", () => {
    // The board writes the store on every selection, so an unconditional
    // notify would loop through the board's own subscriber.
    setSelection("s-same", "aidos#1");
    const seen: string[] = [];
    const stop = onSelectionChanged((sessionId) => seen.push(sessionId));
    setSelection("s-same", "aidos#1");
    expect(seen).toEqual([]);
    stop();
  });

  it("a throwing subscriber cannot break the write or the other subscribers", () => {
    const seen: string[] = [];
    const stopBad = onSelectionChanged(() => {
      throw new Error("subscriber blew up");
    });
    const stopGood = onSelectionChanged((sessionId) => seen.push(sessionId));
    expect(() => setSelection("s-throw", "aidos#3")).not.toThrow();
    expect(seen).toEqual(["s-throw"]);
    expect(getSelection("s-throw")).toBe("aidos#3");
    stopBad();
    stopGood();
  });

  it("the board adopts a selection written from outside its tree", () => {
    expect(view).toContain("onSelectionChanged");
    // Scoped to this session: another session's selection must not steal it.
    expect(view).toContain("if (changed !== sessionId) return;");
  });
});

describe("#73 a tool row can never take down the transcript", () => {
  /*
   * A toolview renders arbitrarily-shaped data off the wire -- truncated
   * mid-flight, absent while running, or from an older build. An unhandled
   * throw inside a slot takes the whole surface with it, and the user
   * reported a transient crash "about frontend toolcall slots".
   *
   * This is the invariant, not a claimed diagnosis of that crash: rendering
   * a card is cosmetic, and cosmetic code must not crash the page.
   */
  it("isolates each registration, so one failure cannot cost the others", () => {
    /*
     * The loop registers fifteen rows. A throw partway used to abandon every
     * row after it -- silent, and indistinguishable from "some tool cards
     * have no UI", with registration ORDER deciding which tools work.
     */
    expect(index).toContain("the other rows continue");
    const loop = index.slice(index.indexOf("for (const [key, Row] of"));
    expect(loop.slice(0, loop.indexOf("}\n  return"))).toContain("try {");
  });

  it("degrades a throwing row to a plain line that still names the tool", () => {
    expect(index).toContain("function guardRow(");
    expect(index).toContain("guardRow(key, Row)");
    expect(index).toContain("this card could not render");
  });
});

describe("#73 a failed call renders, it does not dump JSON", () => {
  /*
   * User-reported, with the exact envelopes. Expanding a failed call showed
   * the raw envelope, which merely REPEATED the summary already on the row
   * and buried it in punctuation -- breaking the "no raw JSON as a card
   * body" rule inside the code that enforces it everywhere else.
   */
  const GATE_REFUSAL =
    'Error: {"ok":false,"error":"tool_error","message":"Gate refused for in_progress -> ' +
    'awaiting_verification by actor agent: missing evidence kinds: builtin:review_pass ' +
    'allowed actors: user, agent"}';
  const CRITERION_REFUSAL =
    'Error: {"ok":false,"error":"tool_error","message":"evidence criterion \\"PLAN.md exists\\" ' +
    'is not one of the ticket\'s criteria"}';
  const PLAIN = 'Error: {"ok":false,"error":"tool_error","message":"the payload.criteria must be a string"}';

  it("drops the generic tool_error code, which is on every refusal", () => {
    // It is a constant, so prefixing the message with it spends the most
    // valuable part of the line saying nothing.
    const envelope = parseErrorEnvelope(GATE_REFUSAL);
    expect(envelope?.code).toBeNull();
    expect(unwrapErrorEnvelope(GATE_REFUSAL)).toBe(
      "Gate refused for in_progress -> awaiting_verification by actor agent: " +
        "missing evidence kinds: builtin:review_pass allowed actors: user, agent",
    );
  });

  it("keeps a SPECIFIC code, which earns its place", () => {
    const specific = 'Error: {"ok":false,"error":"edit_ambiguous","message":"old_string matched 5 times"}';
    expect(parseErrorEnvelope(specific)?.code).toBe("edit_ambiguous");
    expect(unwrapErrorEnvelope(specific)).toBe("edit_ambiguous — old_string matched 5 times");
  });

  it("recognises a REFUSAL as distinct from a failure", () => {
    /*
     * A gate declining a move is the system WORKING -- the call did exactly
     * what it should and the answer was no. Painting it the same red as a
     * crash teaches a reader to ignore the colour, and on this board a
     * refusal is the most common unsuccessful outcome.
     */
    expect(parseErrorEnvelope(GATE_REFUSAL)?.refusal).toBe(true);
    expect(parseErrorEnvelope(CRITERION_REFUSAL)?.refusal).toBe(true);
    // A genuine argument mistake is NOT a refusal: nothing declined it.
    expect(parseErrorEnvelope(PLAIN)?.refusal).toBe(false);
    // And the row acts on it.
    expect(rows).toContain('envelope?.refusal === true ? "stopped" : state');
  });

  it("a REFUSAL's summary line shows the reason (#73 review blocker)", () => {
    /*
     * A refusal is retinted to "stopped" so it does not wear crash red --
     * and that retint used to SUPPRESS the reason too, because the summary
     * only swapped in the error text when state was "error". A gate refusal
     * then rendered the plain ticket label ("evidence") while the computed
     * reason was thrown away. The decision now lives in rowSummary, called
     * for its RESULT, so the refusal case is asserted behaviourally: the
     * text is the reason and it is NOT red.
     */
    const reason = unwrapErrorEnvelope(GATE_REFUSAL) as string;
    const refusal = rowSummary("stopped", "#12 — some ticket", reason);
    expect(refusal.text).toBe(reason);
    expect(refusal.isError).toBe(false);
    // A true failure swaps the reason in AND wears red.
    const failure = rowSummary("error", "#12 — some ticket", reason);
    expect(failure.text).toBe(reason);
    expect(failure.isError).toBe(true);
    // A healthy row is untouched.
    expect(rowSummary("ok", "#12 — some ticket")).toEqual({
      text: "#12 — some ticket",
      isError: false,
    });
    // The component actually consults it, and the old coupling is gone.
    expect(rows).toContain("rowSummary(props.state, props.summary, props.errorSummary)");
    expect(rows).not.toContain('props.state === "error" && props.errorSummary !== undefined');
  });

  it("a refusal's reason stays readable under the stopped tint", () => {
    // The stopped state mutes summaries; the refusal's reason is the one
    // thing its row exists to say, so board.css restores full weight when
    // the row carries an error summary. Red is deliberately NOT restored:
    // a gate refusal is the system working.
    const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
    const rule = css.slice(css.indexOf('[data-state="stopped"] .tool-render-summary[tool-render-error]'));
    expect(rule).toContain("}");
    expect(rule.slice(0, rule.indexOf("}"))).toContain("var(--dsw-alias-label-primary)");
  });

  it("renders the message as prose and never the envelope", () => {
    /*
     * BEHAVIOURAL, not a source grep. The first version of this test
     * asserted that the source CONTAINED "parseErrorEnvelope(errorText)",
     * and a mutation that made the parse always return null kept that string
     * and survived -- the exact failure mode two earlier reviews caught in
     * this project. It calls the function now.
     */
    const classesIn = (node: unknown, found: string[] = []): string[] => {
      if (node === null || typeof node !== "object") return found;
      if (Array.isArray(node)) {
        for (const child of node) classesIn(child, found);
        return found;
      }
      const element = node as { type?: unknown; props?: Record<string, unknown> };
      if (typeof element.type === "string") found.push(element.type);
      // A function component carries its class INSIDE itself, so record the
      // component by name -- TextBody is the raw-dump path.
      if (typeof element.type === "function") {
        found.push((element.type as { name?: string }).name ?? "anonymous");
      }
      const className = element.props?.className;
      if (typeof className === "string") found.push(className);
      if (element.props?.children !== undefined) classesIn(element.props.children, found);
      return found;
    };

    const rendered = classesIn(errorBody(GATE_REFUSAL));
    expect(rendered, "the message must render as prose").toContain("aidos-tool-message");
    expect(rendered, "a parseable envelope must NOT fall back to the raw dump").not.toContain(
      "TextBody",
    );

    // The raw dump survives ONLY as the unparseable fallback: without it a
    // malformed error would render as nothing at all.
    const garbage = classesIn(errorBody("something exploded, not JSON at all"));
    expect(garbage, "unparseable text must still reach the reader").toContain("TextBody");
    expect(errorBody(null)).toBeNull();
  });

  it("promotes structured fields instead of hiding them in the blob", () => {
    const withExtra =
      'Error: {"ok":false,"error":"path_escape","message":"stay under the root","root":"/x","given":"/y"}';
    const envelope = parseErrorEnvelope(withExtra);
    expect(Object.keys(envelope?.extra ?? {})).toEqual(["root", "given"]);
    // ok/error/code/message are already shown, so they are not repeated.
    expect(envelope?.extra.ok).toBeUndefined();
    expect(envelope?.extra.message).toBeUndefined();
  });

  it("uses the REAL evidence list class, not an invented one", () => {
    /*
     * `aidos-evidence-strips` existed nowhere in the stylesheet -- I invented
     * the name instead of using `aidos-evidence-list`, so the list fell back
     * to the browser default padding-left and bullets. User-reported as "a
     * weird indent beside the strip": a phantom class, not a missing rule.
     */
    expect(rows).not.toContain("aidos-evidence-strips");
    expect(rows).toContain('className="aidos-evidence-list"');
    expect(css).toContain(".aidos-evidence-list,");
  });
});

describe("ticketFromProjection (the click-through peek's data source)", () => {
  const projection = {
    "ws:12": {
      id: 12,
      title: "Some ticket",
      state: "in_progress",
      slug: "some-ticket",
      workspaceKey: "ws",
      gatePresent: 1,
      gateTotal: 2,
      criteria: "ship it",
      description: "the body text",
    },
  };

  it("carries the fields TicketStrip renders, criteria included", async () => {
    const hit = ticketFromProjection(projection, "ws:12");
    expect(hit).not.toBeNull();
    expect(hit?.gatePresent).toBe(1);
    expect(hit?.gateTotal).toBe(2);
    // THE REGRESSION: criteria used to be dropped by the copy step, and the
    // peek's gate chip crashed on `criteria.trim()` the moment a projected
    // ticket had a gate fraction to show.
    expect(hit?.criteria).toBe("ship it");
  });

  it("returns null for missing or malformed entries instead of throwing", () => {
    expect(ticketFromProjection(projection, "ws:99")).toBeNull();
    expect(ticketFromProjection(projection, null)).toBeNull();
    expect(ticketFromProjection("not a record", "ws:12")).toBeNull();
    expect(ticketFromProjection({ "ws:12": { title: 3 } }, "ws:12")).toBeNull();
  });
});
