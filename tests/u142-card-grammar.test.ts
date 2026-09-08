/**
 * #142: the tool result UI consistency pass -- every card, one grammar.
 *
 * The user's ruling, verbatim: "not everything should become tables - just
 * want everything that does use a table to be consistent, make the pending
 * list a table, add expandableFact everywhere so the tool call card isn't
 * just a dumb summary, and inline actions and stuff" (inline actions are
 * #115's, and follow this pass).
 *
 * So the pass has four assertable halves, and this suite is one describe per
 * half:
 *
 *  1. every card that ALREADY renders a facts table renders it the same way
 *     -- through `Facts`, from a reader in aidos-row-data, with every value
 *     built by `expandableFact`;
 *  2. the PENDING LIST (the pending allowlist request card) becomes one of
 *     those tables instead of a bespoke <ul>;
 *  3. show-more defaults COLLAPSED, with exactly one exception -- a field
 *     this CALL changed -- decided in exactly one place;
 *  4. every ACTION ROW is right-aligned.
 *
 * Plus the negative half, which matters just as much: the cards that are NOT
 * tables stay as they are.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  allowlistFacts,
  expandableFact,
  factText,
  moveFacts,
  planImportFacts,
  planMetaFacts,
  ticketFacts,
  writtenFields,
} from "../src/client/aidos-row-data";

const rows = readFileSync(new URL("../src/client/aidos-rows.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
const scratch = readFileSync(new URL("../src/client/scratch-rows.tsx", import.meta.url), "utf8");

/** One CSS rule's body, by selector. */
function rule(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `${selector} is not in board.css`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

const LONG = "x".repeat(400);

describe("#142 every card that renders a table renders the same table", () => {
  it("the edit card's fields go through expandableFact, like its siblings", () => {
    /*
     * THE OUTLIER THE PASS WAS REPORTED FOR (user, 2026-09-07: "edit ticket
     * should have the same table-styling with show more rows").
     * `writtenFields` called `oneLine` directly, so a written description
     * was cut at 120 characters with no way to see the rest -- on the card
     * whose only job is to show what an otherwise invisible edit wrote.
     */
    const [fact] = writtenFields({ ticketId: 7, description: LONG });
    expect(fact.label).toBe("description");
    expect(fact.value.endsWith("…")).toBe(true);
    expect(fact.full).toBe(LONG);
  });

  it("addressing fields are still excluded: they name the ticket, not the edit", () => {
    expect(writtenFields({ ticketId: 7, projectId: 1, title: "T" }).map((f) => f.label)).toEqual([
      "title",
    ]);
  });

  it("a structure-flattened value offers the structure back", () => {
    /*
     * "a truncated or structure-flattened value always offers its full
     * form". An allowlist arrives as an array; the one-line form is the
     * squashed JSON, and the expander has to reveal the structure that
     * flattening destroyed rather than the same squashed string again.
     */
    const [fact] = writtenFields({ allowlist: ["src/client", "tests", "docs"] });
    expect(fact.value).not.toContain("\n");
    expect(fact.full).toContain("\n");
    expect(fact.full).toContain("src/client");
  });

  it("factText pretty-prints anything that is not already text", () => {
    expect(factText("plain")).toBe("plain");
    expect(factText({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(factText(undefined)).toBe("");
    // Never throws inside a render: a circular argument degrades to String().
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => factText(circular)).not.toThrow();
  });

  it("a joined list expands, instead of losing its tail at 120 characters", () => {
    const allowlist = Array.from({ length: 40 }, (_, i) => `packages/plugin-${i}`);
    const fact = ticketFacts({ ticket: { allowlist } })
      .find((f) => f.label === "Allowlist");
    expect(fact?.full).toContain("packages/plugin-39");
  });

  it("the plan-blocks card no longer drops a raw document into a cell", () => {
    /*
     * plan_meta pushed `{ label: block, value }` with the RAW string --
     * neither one-lined nor expandable, the only value on any aidos card
     * that skipped both. A frontmatter block is a multi-line document.
     */
    const [fact] = planMetaFacts({ frontmatter: "id: 1\nname: aidos\n" + LONG });
    expect(fact.value).not.toContain("\n");
    expect(fact.full).toContain("name: aidos");
    // An empty block still reads as empty rather than as a blank cell.
    expect(planMetaFacts({ preamble: "" })[0]).toEqual({ label: "preamble", value: "(empty)" });
    expect(planMetaFacts({ contextSections: [1, 2, 3] })[0].value).toBe("3");
  });

  it("an import's deletion error expands (#120's fact that matters most)", () => {
    const facts = planImportFacts({ imported: 4, deleted: false, deletionError: LONG });
    expect(facts.map((f) => f.label)).toEqual(["Imported", "Plan file", "Deletion error"]);
    expect(facts[1].value).toBe("KEPT");
    expect(facts[2].full).toBe(LONG);
  });

  it("a successful move is no longer an empty table with an inert chevron", () => {
    /*
     * move_ticket is one of the seven table cards, but its table read
     * `result.ticket` -- a field the tool does not return -- so a
     * SUCCESSFUL move had nothing to expand at all while a refused one
     * expanded into its reason.
     */
    expect(ticketFacts({ ok: true, fromState: "open", toState: "in_progress" })).toEqual([]);
    expect(moveFacts({ ok: true, fromState: "open", toState: "in_progress" })).toEqual([
      { label: "From", value: "open" },
      { label: "To", value: "in_progress" },
    ]);
    // A result that carries neither is not invented into facts.
    expect(moveFacts({ ok: true })).toEqual([]);
    expect(moveFacts(null)).toEqual([]);
    expect(rows).toContain("moveFacts(result)");
  });

  it("every table card builds its facts in the data module, not inline", () => {
    /*
     * The rule that keeps this pass from decaying: a component that builds
     * its own facts is a component whose grammar no test can reach, which
     * is how the edit card drifted in the first place. Each of the seven
     * table cards names its reader.
     */
    for (const reader of [
      "ticketTables(result)",
      "ticketFacts(result)",
      "writtenFields(args)",
      "moveFacts(result)",
      "planImportFacts(result)",
      "planMetaFacts(result)",
      "allowlistFacts(args, result)",
    ]) {
      expect(rows, `${reader} is not called by any row`).toContain(reader);
    }
    // And nothing in the components reaches past the expander to oneLine.
    expect(rows).not.toContain("oneLine(");
  });

  it("a refusal's extra fields expand too", () => {
    // The missing evidence kinds and the union a write was checked against
    // are structured values, and structure is what flattening destroys.
    expect(rows).toContain("expandableFact(key, factText(value))");
  });

  it("the caption stays on a single-fact table: it is the data's ADDRESS", () => {
    /*
     * The grill question was whether a lone table should render without the
     * caption chrome. Settled: no. With only a gate fraction on screen the
     * reader still needs to know whose it is, and the caption is the one
     * thing that says so.
     */
    expect(rows).toContain("ticketCaption(result)");
    expect(rows).toContain("function TicketCaption");
    const single = ticketFacts({ ticket: { gatePresent: 1, gateTotal: 2 } });
    expect(single).toHaveLength(1);
  });
});

describe("#142 the pending list is a table", () => {
  it("renders through the shared facts table, not a bespoke <ul>", () => {
    expect(rows).toContain("allowlistFacts(args, result)");
    expect(rows).toContain("<Facts facts={paths} />");
  });

  it("keeps #104's informed consent as the fact's label", () => {
    const facts = allowlistFacts(
      { paths: ["packages/new", "src/client"] },
      { created: ["packages/new"] },
    );
    expect(facts).toEqual([
      { label: "will be created", value: "packages/new" },
      { label: "exists", value: "src/client" },
    ]);
  });

  it("a path too long for the line can be opened, which the <ul> never allowed", () => {
    const path = "packages/" + LONG;
    const [fact] = allowlistFacts({ paths: [path] }, null);
    expect(fact.value.endsWith("…")).toBe(true);
    expect(fact.full).toBe(path);
  });

  it("repeated labels do not collide as React keys", () => {
    /*
     * The table repeats "will be created" once per path, and a duplicate
     * key silently drops rows -- on an approval card that would HIDE a path
     * the user is about to grant.
     */
    expect(rows).toContain('key={fact.label + ":" + index}');
  });
});

describe("#142 show-more defaults collapsed, with one stated exception", () => {
  it("a field this CALL changed opens by default", () => {
    expect(writtenFields({ description: LONG })[0].open).toBe(true);
  });

  it("untouched context stays collapsed", () => {
    const description = ticketFacts({ ticket: { description: LONG } })
      .find((f) => f.label === "Description");
    expect(description?.full).toBe(LONG);
    expect(description?.open).toBeUndefined();
    expect(allowlistFacts({ paths: ["packages/" + LONG] }, null)[0].open).toBeUndefined();
  });

  it("a fact with nothing more to show is never marked open", () => {
    // There is no expanded state to start in, and claiming one would make
    // the rule look like it acted where it cannot.
    expect(expandableFact("title", "short", { open: true }).open).toBeUndefined();
  });

  it("the default is decided in ONE place, and the rule is stated there", () => {
    const at = rows.indexOf("react.useState(fact.open === true)");
    expect(at).toBeGreaterThan(-1);
    // Exactly one expander component: a second one is how two grammars
    // start again.
    expect(rows.match(/useState\(fact\.open === true\)/g)).toHaveLength(1);
    const preamble = rows.slice(Math.max(0, at - 1400), at);
    expect(preamble).toContain("COLLAPSED");
    expect(preamble).toContain("this CALL changed");
  });

  it("one expander serves every body shape, so a list value expands too", () => {
    expect(rows).toContain("function ExpandableValue");
    expect(rows).toContain('<ExpandableValue fact={fact} as="dd" />');
    expect(rows).toContain('<ExpandableValue fact={fact} as="span" />');
    // suggest_actions stays a LIST (not everything becomes a table); only
    // its value joins the shared grammar.
    expect(rows).toContain('<ListValue fact={expandableFact("reason", line.reason)} />');
    expect(rule(".aidos-tool-list-value {")).toContain("overflow: visible");
  });
});

describe("#142 every action row is right-aligned", () => {
  it("the peek modal's OPEN ON BOARD row packs right, like the others", () => {
    // The #135 review's note ("works, button should be right-aligned"),
    // settled as a rule rather than as a nudge to one button.
    expect(rule(".aidos-ticket-peek-actions {")).toContain("justify-content: flex-end");
    expect(rule(".aidos-ticket-strip-actionrow {")).toContain("justify-content: flex-end");
  });

  it("states the rule where it is implemented", () => {
    const at = css.indexOf(".aidos-ticket-peek-actions {");
    const preamble = css.slice(Math.max(0, at - 1000), at);
    expect(preamble).toContain("ACTION-ROW RULE");
    expect(preamble).toContain("flex-end");
  });

  it("a status line is not an action, so it does not sit in the action row", () => {
    const actions = rows.indexOf('className="aidos-ticket-peek-actions"');
    const note = rows.indexOf('className="aidos-ticket-peek-note"');
    expect(actions).toBeGreaterThan(-1);
    expect(note).toBeGreaterThan(actions);
    // The notice is a sibling of the action row, after its closing tag.
    expect(rows.slice(actions, note)).toContain("</div>");
  });
});

describe("#142 the cards that are NOT tables stay as they are", () => {
  it("attach_evidence keeps its evidence strip", () => {
    // The same component the evidence panel, the criteria panel and the
    // mark-done modal render: forking it here is exactly what #73 forbade.
    expect(rows).toContain("<EvidenceStrip");
    expect(rows).toContain('className="aidos-evidence-list"');
  });

  it("plan keeps its raw markdown, since its result IS text", () => {
    expect(rows).toContain("resultTextOf(props.block)");
  });

  it("the scratch rows keep the vendored tool-render grammar from #82", () => {
    // Forking those from upstream would undo a deliberate decision.
    expect(scratch).not.toContain("aidos-tool-facts");
    expect(scratch).not.toContain("aidos-tool-list");
  });
});
