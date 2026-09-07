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

const panel = readFileSync(
  new URL("../src/client/queue-panel.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
const vendored = readFileSync(
  new URL("../src/client/vendor/tool-render/tool-render.css", import.meta.url),
  "utf8",
);

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
  it("board.css does not re-implement the approval button's look", () => {
    const rules = actionRowRules();
    // SIZE is aidos's business (a tool card is not a list row). Colour,
    // border, radius and the state rules are the vendored sheet's.
    expect(rules).not.toContain("data-armed");
    expect(rules).not.toContain("border-radius");
    expect(rules).not.toContain("background");
  });

  it("the size override names the vendored class so the row keeps its scale", () => {
    const rules = actionRowRules();
    expect(rules).toContain(".tool-render-approval-btn");
    expect(rules).toContain("height: 22px");
  });
});

describe("#141 the armed reject behaves like the card's, not just like it", () => {
  it("Dismiss arms on the first click and acts on the second", () => {
    // A red button that fires on one click, sitting beside an identical red
    // button elsewhere that asks first, is worse than two different buttons.
    expect(panel).toContain("armedDismiss");
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
