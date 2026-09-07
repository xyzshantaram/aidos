/**
 * #141 (2026-09-07): the work queue's action buttons wear the tool-render
 * approval anatomy, and the vendor pin says which upstream commit it came
 * from.
 *
 * **The user's ask, after live-testing the inline tool-call rows:** "steal
 * the aidos tool-card approve/decline button styling for the work queue
 * strips expanded view, it has nicer looking buttons, and update the pin /
 * reconcile changes so everything works."
 *
 * The rule this pins is REUSE, not resemblance. #82's header records why:
 * three hand-ports of tool-render's look failed in a row ("not close
 * enough", "the card looks different"), because approximating a design from
 * memory does not converge. So the queue must carry the vendored CLASSES,
 * and board.css must not re-state the colours, borders, radius, hover,
 * armed or disabled rules those classes already define -- a second copy of
 * a look is a second thing to keep in step, and it is what drifts.
 *
 * These are source assertions on purpose. The alternative is asserting
 * computed styles in a browser this suite does not have; the failure they
 * guard against is a future restyle quietly dropping the shared anatomy,
 * and the class names ARE that anatomy's contract.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { dismissArmStep } from "../src/client/human-queue";

const panel = readFileSync(
  new URL("../src/client/queue-panel.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
const vendored = readFileSync(
  new URL("../src/client/vendor/tool-render/tool-render.css", import.meta.url),
  "utf8",
);

/**
 * The properties aidos may set on these buttons: LAYOUT only.
 *
 * Named "layout" rather than "geometry" because the review pointed out that
 * `align-self` is geometry by any reading and the old message told the
 * author it was not — a guard whose refusal reads as wrong gets argued
 * with, then disabled.
 */
const LAYOUT_ONLY = new Set([
  "display",
  "height",
  "min-height",
  "max-height",
  "width",
  "min-width",
  "max-width",
  "padding",
  "margin",
  "margin-top",
  "gap",
  "font-size",
  "line-height",
  "align-items",
  "align-self",
  "justify-content",
  "order",
  "white-space",
  "flex",
  "flex-direction",
]);

/**
 * Every property declared in a CSS fragment, lower-cased.
 *
 * Case folding is not cosmetic: the review slipped `COLOR:` past the first
 * version of this guard, because CSS property names are case-INSENSITIVE to
 * a browser and the pattern was not. A guard that only sees lowercase is a
 * guard with a documented bypass.
 */
function declaredProperties(fragment: string): string[] {
  // Comments first: prose about colour is not a colour declaration.
  const declarations = fragment.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...declarations.matchAll(/(^|[{;])\s*([A-Za-z-]+)\s*:/g)].map((match) =>
    (match[2] as string).toLowerCase(),
  );
}

/** The action-row block of board.css, where a re-implementation would land. */
function actionRowRules(): string {
  const start = css.indexOf(".aidos-ticket-strip-actionrow");
  expect(start, "the action row must still be styled").toBeGreaterThan(-1);
  return css.slice(start, css.indexOf(".aidos-ticket-strip-idcol", start));
}

describe("#141 the queue's buttons ARE the tool card's buttons", () => {
  it("the primary action uses the vendored approve class", () => {
    expect(panel).toContain(
      '"tool-render-approval-btn tool-render-approval-approve"',
    );
  });

  it("Dismiss uses the vendored reject class", () => {
    expect(panel).toContain('"tool-render-approval-btn tool-render-approval-reject"');
  });

  it("the bespoke queue button classes are gone from the row", () => {
    /*
     * The old markup was `aidos-btn` and `aidos-btn aidos-btn-primary`.
     * They survive elsewhere (the toolbar's Plan/Create/Refresh), so this
     * asserts they left the ACTION ROW rather than the file.
     */
    const actions = panel.slice(panel.indexOf("actions={"));
    const row = actions.slice(0, actions.indexOf("/>"));
    expect(row).not.toContain('className="aidos-btn"');
    expect(row).not.toContain("aidos-btn-primary");
  });

  it("both classes are really defined by the VENDORED sheet, not by us", () => {
    // Without this, the two assertions above could pass against class names
    // nothing styles -- buttons that lost their look AND their anatomy.
    expect(vendored).toContain(".tool-render-approval-btn");
    expect(vendored).toContain(".tool-render-approval-approve");
    expect(vendored).toContain(".tool-render-approval-reject");
    expect(vendored).toContain(".tool-render-approval-reject[data-armed]");
    expect(vendored).toContain(".tool-render-approval-btn:disabled");
  });
});

describe("#141 the states come from the vendored sheet, not a local copy", () => {
  it("board.css declares ONLY geometry for these buttons — an allowlist, not a denylist", () => {
    /*
     * This replaces a three-word denylist (data-armed / border-radius /
     * background) that the independent review walked straight through: a
     * re-implementation using `color:` or `border:` passed the entire
     * suite (M7b). A denylist protects against the examples someone
     * thought of; the property set is small and knowable, so the honest
     * shape is the other way round.
     *
     * The failure this prevents is the one #82's header is about — three
     * hand-ports of this look died of "close enough", and a colour quietly
     * re-stated here is the first step back to that.
     */
    const rules = actionRowRules();
    for (const property of declaredProperties(rules)) {
      expect(
        LAYOUT_ONLY.has(property),
        `#141: board.css sets "${property}" on the queue's approval buttons. Only LAYOUT ` +
          `belongs here — colour, border, radius and the armed/disabled/hover states come ` +
          `from the vendored tool-render sheet, and a second copy of them is what drifts.`,
      ).toBe(true);
    }
  });

  it("declares no look ANYWHERE in board.css for the vendored approval classes", () => {
    /*
     * Round 2 review, M7c-out: the check above only reads the slice between
     * two markers, so the same colour rule placed elsewhere in board.css
     * passed. A guard whose coverage depends on WHERE the offending rule is
     * written protects nothing from someone who adds a rule at the bottom
     * of the file, which is where rules usually get added.
     *
     * This one is position-independent: every rule block whose selector
     * mentions a tool-render approval class must be layout-only, wherever
     * it lives.
     */
    const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    let checked = 0;
    for (const block of blocks) {
      const selector = (block[1] ?? "").trim();
      if (!selector.includes("tool-render-approval")) continue;
      checked += 1;
      for (const property of declaredProperties(block[2] ?? "")) {
        expect(
          LAYOUT_ONLY.has(property),
          `#141: board.css rule "${selector.replace(/\s+/g, " ")}" sets "${property}" on a ` +
            `vendored approval class. The look is the vendored sheet's; aidos may only ` +
            `adjust layout.`,
        ).toBe(true);
      }
    }
    // The scan must actually reach something, or it passes by finding none.
    expect(checked, "no board.css rule targets the vendored approval classes").toBeGreaterThan(0);
  });

  it("the size override names the vendored class so the row keeps its scale", () => {
    const rules = actionRowRules();
    expect(rules).toContain(".tool-render-approval-btn");
    expect(rules).toContain("height: 22px");
  });
});

describe("#141 the armed reject behaves like the card's, not just like it", () => {
  /*
   * This block replaces a test that carried this same name and proved
   * nothing. It asserted that the strings "armedDismiss" and "? Confirm
   * dismiss" appeared in the file — both of which survive a handler that
   * never reaches them, so the independent review shipped a ONE-CLICK
   * Dismiss with the entire suite green (M4).
   *
   * The rule now lives in dismissArmStep, so it can be exercised as
   * behaviour, and the handler is pinned to route through it.
   */
  it("the first click arms and dismisses NOTHING", () => {
    // The whole point: a misclick on a red button must not act. Dismissal
    // is not free — the host deletes the nomination and records it as
    // dismissed, telling the agent not to re-propose it.
    expect(dismissArmStep(null, "nom-1")).toEqual({ armed: "nom-1", dismiss: false });
  });

  it("the second click on the SAME row dismisses and disarms", () => {
    expect(dismissArmStep("nom-1", "nom-1")).toEqual({ armed: null, dismiss: true });
  });

  it("clicking a DIFFERENT row re-arms instead of dismissing it", () => {
    /*
     * The dangerous case: armed on row A, click row B. Firing B here would
     * be a dismissal the human never confirmed — they were mid-decision on
     * a different row.
     */
    expect(dismissArmStep("nom-1", "nom-2")).toEqual({ armed: "nom-2", dismiss: false });
  });

  it("three clicks on one row arm, dismiss, then arm again — never twice in a row", () => {
    let armed: string | null = null;
    const fired: number[] = [];
    for (const click of [1, 2, 3]) {
      const step = dismissArmStep(armed, "nom-1");
      armed = step.armed;
      if (step.dismiss) fired.push(click);
    }
    expect(fired).toEqual([2]);
  });

  it("the handler ROUTES through the step function, so the rule cannot be bypassed", () => {
    /*
     * The wiring half. A pure function nobody calls is decoration: M4
     * deleted the branch from the JSX, and only an assertion about the
     * handler itself can see that. It pins the ORDER too — onDismiss must
     * be conditional on the step, not called beside it.
     */
    const handler = panel.slice(panel.indexOf("tool-render-approval-reject"));
    const body = handler.slice(0, handler.indexOf("</button>"));

    // Tolerant of renames and brace-vs-inline formatting, because a
    // prettier pass must not turn this into a false failure -- a guard that
    // cries wolf on innocent refactors gets deleted by the next person.
    expect(body).toMatch(/dismissArmStep\(\s*armedDismiss\s*,\s*\w+\s*\)/);
    expect(body).toMatch(/setArmedDismiss\(\s*step\.armed\s*\)/);
    expect(body).toContain("step.dismiss");

    /*
     * EXACTLY ONE dismissal call. The previous form forbade a bare
     * `props.onDismiss?.(id);` line, and the review walked past it by
     * writing `void props.onDismiss?.(id);` before the step -- every
     * required string still present, the button firing on the first click.
     * Counting the calls is what no prefix token escapes.
     */
    expect(
      body.match(/onDismiss/g)?.length,
      "the handler must call onDismiss exactly once, guarded by the step",
    ).toBe(1);
  });

  it("the armed state still reaches the DOM as the vendored sheet's attribute", () => {
    expect(panel).toContain("data-armed={armedDismiss === entry.nominationId ? true : undefined}");
    expect(panel).toContain('"? Confirm dismiss"');
  });

  it("acting on the row disarms it, so no armed button is left on a dead ask", () => {
    const primary = panel.slice(panel.indexOf("tool-render-approval-approve"));
    const handler = primary.slice(0, primary.indexOf("</button>"));
    expect(handler).toContain("setArmedDismiss(null)");
  });

  it("both buttons disable while an action is running", () => {
    const actions = panel.slice(panel.indexOf("tool-render-approval-reject"));
    const row = actions.slice(0, actions.indexOf("</>"));
    expect(row.match(/disabled=\{working\}/g)?.length).toBe(2);
  });
});
