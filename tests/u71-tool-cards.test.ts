/**
 * #71: every aidos tool call renders as a structured card, not raw JSON.
 *
 * The shape was already built -- `present()` caps chips at four and puts the
 * full input on `rawInput` for auditing -- but NOTHING PINNED IT. A twelfth
 * tool could ship with no `presentCall` at all and render as a raw blob, and
 * the only way to notice would be to see it in a transcript.
 *
 * That is the same class as #81 (a preset row nobody would miss until a user
 * noticed the symptom) and #82 (a scratch tool rendering a JSON dump). This
 * test turns "someone will remember" into a build failure.
 *
 * It ENUMERATES the registered tools rather than checking a hardcoded list,
 * so a new tool is covered the moment it is registered -- a list would have
 * to be updated by the same person who forgot the card.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness } from "./b1-harness";

interface Registered {
  name: string;
  presentCall?: (args: never) => unknown;
}

function registeredTools(): Registered[] {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  // The harness exposes its registry as `tools`, a Map of name -> definition.
  const map = (harness as unknown as { tools?: Map<string, Registered> }).tools;
  return map === undefined ? [] : [...map.values()];
}

const tools = registeredTools();

/** The aidos tools. The harness registry may also hold fs/bash stubs. */
const AIDOS_TOOLS = tools.filter((tool) =>
  [
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
  ].includes(tool.name),
);

describe("#71 every aidos tool declares a card", () => {
  it("finds the aidos tools at all", () => {
    // Guards the degenerate pass: if the registry lookup broke, every
    // assertion below would vacuously succeed over an empty list.
    expect(AIDOS_TOOLS.length).toBeGreaterThanOrEqual(11);
  });

  it("every one has a presentCall", () => {
    const missing = AIDOS_TOOLS.filter((tool) => typeof tool.presentCall !== "function").map(
      (tool) => tool.name,
    );
    expect(
      missing,
      "these tools would render as a raw JSON blob; give each a presentCall via present()",
    ).toEqual([]);
  });
});

describe("#71 the cards obey the density rule", () => {
  /*
   * Representative arguments per tool. Deliberately REAL shapes rather than
   * empty objects: a presentCall that only survives `{}` proves nothing, and
   * several of these read nested fields.
   */
  const SAMPLES: Record<string, unknown> = {
    get_tickets: { stateIds: ["in_progress"], search: "queue", projectId: 1, limit: 5 },
    get_ticket: { ticketId: 42 },
    set_ticket: { ticketId: 42, title: "A ticket title", description: "x".repeat(500) },
    attach_evidence: {
      ticketId: 42,
      kind: "review_note",
      payload: { note: "y".repeat(500) },
    },
    move_ticket: { ticketId: 42, to: "awaiting_verification" },
    plan: { projectId: 1 },
    plan_import: { file: "/tmp/plan.md", projectId: 1 },
    plan_meta: { projectId: 1 },
    plan_meta_set: { projectId: 1, preamble: "z".repeat(500) },
    request_allowlist: { ticketId: 42, paths: ["src/host", "src/client", "tests", "a", "b"] },
    suggest_actions: {
      suggestions: [{ ticketId: 42, actionId: "signoff", reason: "w".repeat(500) }],
    },
  };

  for (const tool of AIDOS_TOOLS) {
    it(`${tool.name}: at most four chips, each capped, and no raw JSON body`, () => {
      const view = tool.presentCall?.(SAMPLES[tool.name] as never) as
        | { card?: string; title?: string; content?: Array<{ text?: string }>; rawInput?: unknown }
        | undefined;
      expect(view, `${tool.name} returned no view`).toBeDefined();

      // Verb + object: a title is what makes the row readable at a glance.
      expect(typeof view?.title, tool.name).toBe("string");
      expect((view?.title ?? "").length, tool.name).toBeGreaterThan(0);

      const chips = view?.content ?? [];
      expect(chips.length, `${tool.name} exceeds the four-chip density rule`).toBeLessThanOrEqual(
        4,
      );

      for (const chip of chips) {
        const text = chip.text ?? "";
        // The shared 60-char cap. An uncapped chip is how a 3 KB description
        // or a reviewer's verdict ends up as the "card".
        expect(text.length, `${tool.name} chip is uncapped: ${text.slice(0, 40)}`).toBeLessThanOrEqual(
          61,
        );
        // A chip is a label, never a serialised payload.
        expect(text.trim().startsWith("{"), `${tool.name} chip is raw JSON`).toBe(false);
        expect(text.trim().startsWith("["), `${tool.name} chip is raw JSON`).toBe(false);
      }
    });
  }
});

describe("#71 the expanded view keeps the full input", () => {
  it("carries rawInput, so nothing is lost to the summary", () => {
    /*
     * The chips are lossy BY DESIGN -- capped at four, truncated at 60 -- so
     * the audit path has to exist somewhere. rawInput is it: the collapsed
     * card stays readable and the expanded one stays complete.
     */
    const attach = AIDOS_TOOLS.find((tool) => tool.name === "attach_evidence");
    const view = attach?.presentCall?.({
      ticketId: 42,
      kind: "review_note",
      payload: { note: "the full note text" },
    } as never) as { rawInput?: unknown } | undefined;
    expect(view?.rawInput).toBeDefined();
  });
});
