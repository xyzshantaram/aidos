/**
 * #214: the clickthrough shows one header, never a peek.
 *
 * WHAT THIS PINS (all source-level, the u114/u73 convention -- AidosRow
 * owns hooks, so no renderer; the live modal itself is human-verify).
 *
 * 1. ONE TITLE, ONE CLOSE BUTTON. The clickthrough mounts DetailView in a
 *    BARE ModalShell: the shell contributes no title row, and DetailView
 *    keeps its own header. So each context has exactly one header --
 *    the modal's from the panel, the board sidebar's from the panel --
 *    and the doubled chrome (two <h3>s, two close buttons doing
 *    different things) cannot come back.
 * 2. NO PEEK. The strip-and-excerpt fallback is deleted: no TicketStrip,
 *    no projection `peeked`, no peek description body in the modal path.
 * 3. EXPLICIT UNRESOLVED. When the ticket does not resolve, the modal
 *    names why (no session / board not loaded / absent-or-foreign) in a
 *    status paragraph instead of degrading silently.
 * 4. CLOSE PATHS. Escape and the mask click still close, exactly once
 *    each -- they live outside the gated head, so bare changes nothing.
 *
 * What this does NOT prove (owner's eye in the browser): that one header
 * LOOKS right -- spacing, alignment, the editable title in a wide dialog.
 * Structure is pinned here; appearance is not.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const rows = readFileSync(new URL("../src/client/aidos-rows.tsx", import.meta.url), "utf8");
const ui = readFileSync(new URL("../src/client/ui.tsx", import.meta.url), "utf8");
const panel = readFileSync(new URL("../src/client/detail-panel.tsx", import.meta.url), "utf8");
const board = readFileSync(new URL("../src/client/local-ticket-view.tsx", import.meta.url), "utf8");

/** The clickthrough's <ModalShell ...> opening tag, bare prop included. */
function clickthroughShell(): string {
  const open = rows.indexOf("<ModalShell");
  expect(open, "the clickthrough mounts a ModalShell").toBeGreaterThan(-1);
  const close = rows.indexOf(">", open);
  return rows.slice(open, close);
}

describe("#214 the clickthrough mounts DetailView in a bare shell", () => {
  it("the shell is bare and carries no title of its own", () => {
    const tag = clickthroughShell();
    expect(tag).toContain("bare");
    expect(tag).not.toContain("title=");
  });

  it("a bare ModalShell renders no title row at all", () => {
    // The head (title + close button) exists exactly once in ui.tsx and
    // sits inside the non-bare arm -- bare renders nothing in its place.
    expect(ui.match(/aidos-modal-head/g)).toHaveLength(1);
    expect(ui.match(/aidos-modal-title/g)).toHaveLength(1);
    const bareAt = ui.indexOf("props.bare === true ? null : (");
    expect(bareAt).toBeGreaterThan(-1);
    const headAt = ui.indexOf("aidos-modal-head");
    expect(headAt).toBeGreaterThan(bareAt);
    // The children render outside the gated head, so bare keeps the body.
    const formAt = ui.indexOf("aidos-modal-form");
    expect(formAt).toBeGreaterThan(headAt);
  });

  it("DetailView keeps its own header, so each context has exactly one", () => {
    // The panel's header: one head, one close button -- the modal's only
    // header, and the board sidebar's only header (the board never wraps
    // the panel in a ModalShell -- pinned below).
    expect(panel.match(/aidos-detail-head/g)).toHaveLength(1);
    expect(panel.match(/aidos-close-btn/g)).toHaveLength(1);
    const shellCloses = ui.match(/aidos-close-btn/g) ?? [];
    expect(shellCloses).toHaveLength(1);
    // ...and that one shell close button is the gated one, so a bare
    // shell contributes zero close buttons to the dialog.
    expect(ui.indexOf("aidos-close-btn")).toBeGreaterThan(ui.indexOf("props.bare"));
  });

  it("the board sidebar is not wrapped in a modal shell", () => {
    // The board's OTHER modals (queue, retired) keep their titled shells;
    // only the detail fragment matters here: no shell around the panel,
    // so the sidebar's header is the panel's own.
    const start = board.indexOf("const detailPanel =");
    expect(start).toBeGreaterThan(-1);
    const end = board.indexOf("const createModal =", start);
    expect(end).toBeGreaterThan(start);
    expect(board.slice(start, end)).not.toContain("<ModalShell");
  });
});

describe("#214 the strip-and-excerpt peek is deleted", () => {
  it("the modal path renders no strip, no projection ticket, no peek body", () => {
    expect(rows).not.toContain("<TicketStrip ticket={peeked}");
    expect(rows).not.toContain("ticketFromProjection(");
    expect(rows).not.toContain("peeked.descriptionFull");
    expect(rows).not.toContain("aidos-ticket-peek-description");
    expect(rows).not.toContain('import { TicketStrip }');
  });

  it("no second-class branch: any resolved ticket gets the real panel", () => {
    // The DetailView arm's predicate distinguishes only "resolved" from
    // "not resolved" -- own and foreign tickets take the same view, so
    // the same ticket can no longer open full from one session and thin
    // from another. (Resolution itself is modalTicketFor, pinned by u114.)
    const arm = rows.indexOf("{modalTicket !== null && props.sessionId !== undefined ? (");
    expect(arm).toBeGreaterThan(-1);
    const view = rows.indexOf("<DetailView", arm);
    expect(view).toBeGreaterThan(arm);
    expect(rows.slice(arm, view)).not.toContain("foreign");
  });
});

describe("#214 an unresolvable clickthrough names its reason", () => {
  it("the modal renders an explicit status, never a degraded view", () => {
    const arm = rows.indexOf("{unresolvedReason}");
    expect(arm, "the unresolved state renders its reason").toBeGreaterThan(-1);
    const para = rows.indexOf('className="aidos-ticket-peek-empty"');
    expect(para).toBeGreaterThan(-1);
    expect(rows.slice(para, para + 200)).toContain('role="status"');
  });

  it("the reason distinguishes the three ways to land here", () => {
    expect(rows).toContain("this card carries no session");
    expect(rows).toContain("this session's board has not loaded yet");
    expect(rows).toContain("belongs to another session");
  });
});

describe("#214 escape and the mask click still close exactly once", () => {
  it("ModalShell keeps one Escape listener and one mask close outside the gated head", () => {
    expect(ui.match(/addEventListener\("keydown"/g)).toHaveLength(1);
    expect(ui).toContain('event.key === "Escape"');
    // The mask's onClose sits before the gated head, so bare keeps it.
    const maskAt = ui.indexOf("aidos-modal-mask");
    const bareAt = ui.indexOf("props.bare");
    expect(maskAt).toBeGreaterThan(-1);
    expect(bareAt).toBeGreaterThan(maskAt);
    // One close prop on the clickthrough's shell tag: no double wiring.
    // (DetailView's own onClose lives deeper in the tree -- the tag slice
    // stops before it.)
    expect(clickthroughShell().match(/onClose=\{/g)).toHaveLength(1);
  });
});
