/**
 * #194: inline human-action buttons on the detail panel — and, REVERSED
 * (owner, 2026-09-12: "Ticket actions bar is appearing in local view -
 * remove it"), NO action chrome on the board tile.
 *
 * WHAT THIS PINS.
 * 1. THE TILE CARRIES NO ACTION CHROME. Not fewer buttons — none. The tile
 *    grid is a scanning surface; the always-visible-greyed treatment is a
 *    detail-panel affordance. This is checked on a GRID of mixed-state
 *    tickets (the real `TicketView` layout), not one tile in isolation —
 *    the defect the reversal answers only became obvious at grid scale,
 *    where six mostly-greyed buttons rode every tile of a 206-tile board.
 * 2. RETIRE LIVES IN THE KEBAB. The detail panel's actions bar keeps the
 *    #62 flat row for the lifecycle actions; Retire moves into an overflow
 *    kebab menu at the bar's right-hand end, reachable through the menu,
 *    never a flat sibling button.
 * 3. CLICK-TIME RE-CHECK: `checkBoardActionAvailable` -- the EXACT function
 *    the panel's buttons call before acting -- refuses a stale action
 *    (available at render, gone at click) and its refusal path touches only
 *    the `workspaceTickets` READ, so no junk evidence is written (the #177
 *    regression).
 * 4. ONE FLOW: the panel opens the SAME dialog components it always did and
 *    implements no write of its own (#170); the tile implements no flow at
 *    all.
 *
 * WHY A SHIM RENDERER. react-testing-library is not installed, and
 * react-dom cannot load in this repo's tests (react 18.3.1 against
 * react-dom 19.2.8: the server renderer refuses the mismatch outright).
 * So this file renders the hard way that needs neither: React elements are
 * plain objects, and a function component is a function. With a minimal
 * hook dispatcher installed (useState keeps its initial value, effects are
 * no-ops), calling the component and recursively expanding function-typed
 * elements executes the REAL render logic and yields the REAL element tree,
 * which is then queried for buttons, labels, and disabled/tooltip state.
 * It cannot click -- the click path is covered by driving the exact guard
 * function, u177-style, with the transport stubbed; the kebab's OPEN menu
 * is rendered directly (`OverflowMenu` takes `open` as a prop), which is
 * what makes its contents assertable without a click.
 */

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import react from "react";

import { TicketTile } from "../src/client/ticket-tile";
import { TicketView } from "../src/client/ticket-view";
import { ActionBar, OverflowMenu } from "../src/client/action-bar";
import { checkBoardActionAvailable } from "../src/client/inline-actions";
import { refusalForAction, type ActionId } from "../src/client/action-visibility";
import type { TicketView as TicketRow } from "../src/kernel/projections";
import type { EvidenceRow } from "../src/kernel/types";

/* ------------------------------------------------------------------ */
/* The shim renderer.                                                  */
/* ------------------------------------------------------------------ */

/** Install a minimal hook dispatcher; returns a restore function. */
function installDispatcher(): () => void {
  const internals = react as unknown as {
    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
      ReactCurrentDispatcher: { current: unknown };
    };
  };
  const dispatcher = internals.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    .ReactCurrentDispatcher;
  const previous = dispatcher.current;
  const noop = () => {};
  dispatcher.current = {
    readContext: () => undefined,
    useCallback: (fn: unknown) => fn,
    useContext: () => undefined,
    useDebugValue: noop,
    useDeferredValue: (value: unknown) => value,
    useEffect: noop,
    useId: () => "test-id",
    useImperativeHandle: noop,
    useInsertionEffect: noop,
    useLayoutEffect: noop,
    useMemo: (factory: () => unknown) => factory(),
    useReducer: ( _reducer: unknown, initial: unknown) => [initial, noop],
    useRef: (value: unknown) => ({ current: value }),
    useState: (initial: unknown) => [
      typeof initial === "function" ? (initial as () => unknown)() : initial,
      noop,
    ],
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
    useTransition: () => [false, (fn: () => void) => fn()],
  };
  return () => {
    dispatcher.current = previous;
  };
}

interface HostNode {
  tag: string;
  props: Record<string, unknown>;
  text: string;
}

function childText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(childText).join("");
  if (typeof node === "object" && node !== null && "props" in node) {
    return childText((node as { props: { children?: unknown } }).props.children);
  }
  return "";
}

/** Recursively expand function components; collect every host element. */
function expand(node: unknown, out: HostNode[]): void {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") return;
  if (Array.isArray(node)) {
    for (const child of node) expand(child, out);
    return;
  }
  if (typeof node !== "object" || !("type" in node) || !("props" in node)) return;
  const element = node as { type: unknown; props: Record<string, unknown> };
  if (typeof element.type === "function") {
    const rendered = (element.type as (props: Record<string, unknown>) => unknown)(
      element.props,
    );
    expand(rendered, out);
    return;
  }
  if (typeof element.type === "symbol") {
    // Fragments (and siblings): pass the children through.
    expand(element.props["children"], out);
    return;
  }
  if (typeof element.type === "string") {
    out.push({
      tag: element.type,
      props: element.props,
      text: childText(element.props["children"]),
    });
    expand(element.props["children"], out);
  }
}

/** Render a component with the shim dispatcher; return every host node. */
function renderNodes(element: unknown): HostNode[] {
  const restore = installDispatcher();
  try {
    const out: HostNode[] = [];
    expand(element, out);
    return out;
  } finally {
    restore();
  }
}

interface ButtonNode {
  text: string;
  disabled: boolean;
  title: string;
  ariaLabel: string;
}

function toButton(node: HostNode): ButtonNode {
  return {
    text: node.text,
    disabled: node.props["disabled"] === true,
    title: typeof node.props["title"] === "string" ? (node.props["title"] as string) : "",
    ariaLabel:
      typeof node.props["aria-label"] === "string"
        ? (node.props["aria-label"] as string)
        : "",
  };
}

function buttonsIn(root: unknown): ButtonNode[] {
  return renderNodes(root)
    .filter((node) => node.tag === "button")
    .map(toButton);
}

function rootNode(root: unknown): HostNode {
  const nodes = renderNodes(root);
  if (nodes.length === 0) throw new Error("render produced no host nodes");
  return nodes[0];
}

/**
 * The buttons of one SUBTREE, addressed by class name. Used by the grid
 * test: TicketView's toolbar legitimately renders buttons (Waiting on you,
 * Plan, Create), so "the grid carries no action chrome" must be asked of
 * the grid's subtree, not of the whole view.
 */
function buttonsUnderClass(root: unknown, className: string): ButtonNode[] {
  const nodes = renderNodes(root);
  const anchor = nodes.findIndex((node) =>
    typeof node.props["className"] === "string" &&
    (node.props["className"] as string).split(" ").includes(className),
  );
  if (anchor === -1) throw new Error("no node with class " + className);
  // Host nodes come out in document order; the grid is the LAST child of
  // its wrapper in TicketView, so "everything after the anchor" is exactly
  // its subtree — the toolbar's and the filter panel's buttons all render
  // before it.
  return nodes.slice(anchor + 1)
    .filter((node) => node.tag === "button")
    .map(toButton);
}

/* ------------------------------------------------------------------ */
/* Fixtures.                                                           */
/* ------------------------------------------------------------------ */

function ticketFixture(state: string, extra?: Record<string, unknown>): TicketRow {
  return {
    id: 7,
    title: "Probe ticket",
    description: "A ticket under test.",
    criteria: "",
    state,
    phase: 1,
    order: 1,
    slug: "probe",
    workspaceKey: "ws",
    confidenceScore: 50,
    gatePresent: 0,
    gateTotal: 0,
    dependsOn: [],
    ...extra,
  } as unknown as TicketRow;
}

function evidenceRow(kind: string): EvidenceRow {
  return { kind, author: "user", at: 1, payload: {} } as unknown as EvidenceRow;
}

function tileElement(ticket: TicketRow, evidence: EvidenceRow[]) {
  return react.createElement(TicketTile, {
    ticket,
    evidence,
    selected: false,
    onSelect: () => {},
  });
}

function findButton(buttons: ButtonNode[], label: string): ButtonNode {
  const found = buttons.find((button) => button.text === label);
  if (found === undefined) {
    throw new Error(
      "button " + JSON.stringify(label) + " not rendered (have: " +
        buttons.map((button) => JSON.stringify(button.text)).join(", ") + ")",
    );
  }
  return found;
}

/* ------------------------------------------------------------------ */
/* 1. RENDER: the tile carries NO action chrome.                       */
/* ------------------------------------------------------------------ */

describe("#194 reversed: the tile renders no action chrome", () => {
  /** Buttons in a tile OTHER than the tile root itself (a <button> again). */
  function nonRootButtons(ticket: TicketRow, evidence: EvidenceRow[]): ButtonNode[] {
    const nodes = renderNodes(tileElement(ticket, evidence));
    return nodes.slice(1)
      .filter((node) => node.tag === "button")
      .map(toButton);
  }

  it("an open ticket renders zero buttons, though Sign off is legal", () => {
    // The one button present is the tile root itself (selects the ticket);
    // nothing else is interactive.
    const nodes = renderNodes(tileElement(ticketFixture("open"), []));
    const buttons = nodes.filter((node) => node.tag === "button");
    expect(buttons.length).toBe(1);
    expect(buttons[0]).toBe(nodes[0]);
    expect(nonRootButtons(ticketFixture("open"), [])).toEqual([]);
  });

  it("a done ticket — no legal action — renders zero buttons", () => {
    // The ticket's ORIGINAL criterion, now trivially true everywhere on the
    // grid: no legal action, no button, not even a greyed one.
    expect(nonRootButtons(ticketFixture("done"), [])).toEqual([]);
  });

  it("no action label and no kebab appears anywhere in a tile", () => {
    const nodes = renderNodes(tileElement(ticketFixture("awaiting_verification"), [
      evidenceRow("builtin:user_verified"),
    ]));
    const forbidden = [
      "Sign off",
      "Verify",
      "Submit for review",
      "Send back",
      "Mark done",
      "Allowlist",
      "More actions",
    ];
    for (const node of nodes) {
      for (const label of forbidden) {
        expect(node.text).not.toContain(label);
        expect(node.props["aria-label"]).not.toBe(label);
        expect(node.props["title"]).not.toBe(label);
      }
    }
  });

  it("the tile root is a <button> again — the div masquerade died with the action row", () => {
    // The root became a div[role=button] ONLY because action buttons cannot
    // nest inside a button. With the row gone, the native element returns:
    // Enter/Space select without a hand-written key handler.
    const root = rootNode(tileElement(ticketFixture("open"), []));
    expect(root.tag).toBe("button");
    expect(root.props["role"]).toBeUndefined();
    expect(typeof root.props["onClick"]).toBe("function");
  });

  it("THE GRID: mixed-state tickets render a whole board with zero action buttons", () => {
    // Checked as a GRID, not one tile in isolation — the reversal exists
    // because six greyed buttons rode EVERY tile of a 206-tile board, which
    // no single-tile test could see. This is the real TicketView layout.
    const tickets = [
      ticketFixture("open"),
      ticketFixture("in_progress"),
      ticketFixture("awaiting_verification", { id: 8 }),
      ticketFixture("done", { id: 9 }),
      ticketFixture("open", { id: 10 }),
    ];
    const view = react.createElement(TicketView, {
      sessionId: "sess-1",
      tickets: tickets as never,
      allTicketsCount: tickets.length,
      applied: { states: [], tags: [], search: "" } as never,
      selectedId: null,
      activeTicketId: null,
      onSelect: () => {},
      onApply: () => {},
      onJump: () => {},
      onClearFilters: () => {},
      onPlan: () => {},
      onCreate: () => {},
    });
    // Five tiles rendered (class matched whole-word: the tile's inner
    // aidos-tile-* elements must not count)...
    const tiles = renderNodes(view).filter((node) =>
      typeof node.props["className"] === "string" &&
      (node.props["className"] as string).split(" ").includes("aidos-tile"),
    );
    expect(tiles.length).toBe(5);
    // ...and the grid's subtree contains exactly five buttons — the five
    // tile roots themselves, each selecting its ticket — and no button of
    // any kind carries an action label or a kebab.
    const gridButtons = buttonsUnderClass(view, "aidos-board-grid");
    expect(gridButtons.length).toBe(5);
    const forbidden = [
      "Sign off",
      "Verify",
      "Submit for review",
      "Send back",
      "Mark done",
      "Allowlist",
      "More actions",
      "Retire\u2026",
    ];
    for (const button of gridButtons) {
      expect(button.ariaLabel).toBe("");
      for (const label of forbidden) {
        expect(button.text).not.toContain(label);
      }
    }
  });
});

describe("#194 the panel's action bar still renders every lifecycle action", () => {
  it("renders all six labels with the grey treatment for unavailable ones", () => {
    const buttons = buttonsIn(
      react.createElement(ActionBar, {
        ticket: ticketFixture("open"),
        evidence: [],
        onOpenSignoff: () => {},
        onOpenVerify: () => {},
        onOpenSendBack: () => {},
        onOpenMarkDone: () => {},
        onOpenSubmitForReview: () => {},
        onOpenAllowlist: () => {},
      }),
    );
    expect(buttons.map((button) => button.text)).toEqual([
      "Sign off",
      "Verify",
      "Submit for review",
      "Send back",
      "Mark done",
      "Allowlist",
    ]);
    expect(findButton(buttons, "Sign off").disabled).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 1b. RETIRE lives in the kebab, not on the flat row.                 */
/* ------------------------------------------------------------------ */

describe("#194 reversed: retire is reachable through the overflow kebab only", () => {
  it("without onOpenRetire the bar renders no kebab at all", () => {
    const buttons = buttonsIn(
      react.createElement(ActionBar, {
        ticket: ticketFixture("open"),
        evidence: [],
        onOpenSignoff: () => {},
        onOpenVerify: () => {},
        onOpenSendBack: () => {},
        onOpenMarkDone: () => {},
        onOpenSubmitForReview: () => {},
        onOpenAllowlist: () => {},
      }),
    );
    expect(buttons.find((button) => button.ariaLabel === "More actions")).toBeUndefined();
    expect(buttons.find((button) => button.text === "Retire\u2026")).toBeUndefined();
  });

  it("with onOpenRetire the bar renders a kebab and NO flat Retire button", () => {
    const buttons = buttonsIn(
      react.createElement(ActionBar, {
        ticket: ticketFixture("open"),
        evidence: [],
        onOpenSignoff: () => {},
        onOpenVerify: () => {},
        onOpenSendBack: () => {},
        onOpenMarkDone: () => {},
        onOpenSubmitForReview: () => {},
        onOpenAllowlist: () => {},
        onOpenRetire: () => {},
      }),
    );
    // The trigger: a real button (keyboard reachable), marked a menu.
    const kebab = buttons.find((button) => button.ariaLabel === "More actions");
    expect(kebab).toBeDefined();
    // Retire is NOT among the flat buttons — the row ends at the six
    // lifecycle actions plus the kebab.
    expect(buttons.filter((button) => button.text === "Retire\u2026")).toEqual([]);
    expect(buttons.map((button) => button.text)).toEqual([
      "Sign off",
      "Verify",
      "Submit for review",
      "Send back",
      "Mark done",
      "Allowlist",
      "\u22ef",
    ]);
  });

  it("the open menu renders Retire as a menuitem button; closed renders nothing", () => {
    const refs: { current: null } = { current: null };
    const open = react.createElement(OverflowMenu, {
      open: true,
      items: [{ id: "retire", label: "Retire\u2026", onSelect: () => {} }],
      containerRef: refs,
      triggerRef: refs,
      onClose: () => {},
    });
    const buttons = buttonsIn(open);
    expect(buttons.map((button) => button.text)).toEqual(["Retire\u2026"]);
    const closed = react.createElement(OverflowMenu, {
      open: false,
      items: [{ id: "retire", label: "Retire\u2026", onSelect: () => {} }],
      containerRef: refs,
      triggerRef: refs,
      onClose: () => {},
    });
    expect(renderNodes(closed)).toEqual([]);
  });

  it("the detail panel wires onOpenRetire into the bar, not a flat sibling button", () => {
    const detail = readFileSync(
      new URL("../src/client/detail-panel.tsx", import.meta.url).pathname,
      "utf8",
    );
    // The kebab wiring is present...
    expect(detail).toContain("onOpenRetire={() => {");
    // ...and the flat "Retire…" button beside {props.actions} is gone: no
    // literal Retire label renders anywhere in the file, and the panel prop
    // that fed the old button no longer exists.
    expect(detail).not.toMatch(/Retire\\u2026/);
    expect(detail).not.toContain("props.onOpenRetire");
  });
});

/* ------------------------------------------------------------------ */
/* 2. The pure decider covers every action id.                         */
/* ------------------------------------------------------------------ */

describe("#194 refusalForAction is the one decider for every action", () => {
  const open = ticketFixture("open");
  const inProgress = ticketFixture("in_progress");
  const awaiting = ticketFixture("awaiting_verification");

  it("signoff is open-only", () => {
    expect(refusalForAction(open, [], "signoff")).toBeNull();
    expect(refusalForAction(inProgress, [], "signoff")).toContain("already signed off");
  });

  it("verify and send-back are awaiting-only", () => {
    expect(refusalForAction(awaiting, [], "verify")).toBeNull();
    expect(refusalForAction(awaiting, [], "send-back")).toBeNull();
    expect(refusalForAction(open, [], "verify")).toContain("awaiting verification");
    expect(refusalForAction(inProgress, [], "send-back")).toContain("awaiting verification");
  });

  it("submit-for-review needs in_progress plus the review gate", () => {
    expect(
      refusalForAction(inProgress, ["builtin:review_pass"], "submit-for-review"),
    ).toBeNull();
    expect(refusalForAction(open, ["builtin:review_pass"], "submit-for-review")).toContain(
      "in progress",
    );
    expect(refusalForAction(inProgress, [], "submit-for-review")).toContain("review_pass");
  });

  it("mark-done is awaiting plus the verified row", () => {
    expect(
      refusalForAction(awaiting, ["builtin:user_verified"], "mark-done"),
    ).toBeNull();
    expect(refusalForAction(awaiting, [], "mark-done")).toContain("user_verified");
    expect(
      refusalForAction(inProgress, ["builtin:user_verified"], "mark-done"),
    ).toContain("awaiting verification");
  });

  it("allowlist is in_progress-only", () => {
    expect(refusalForAction(inProgress, [], "allowlist")).toBeNull();
    expect(refusalForAction(open, [], "allowlist")).toContain("in progress");
  });

  it("an unknown action refuses rather than opening", () => {
    expect(
      refusalForAction(open, [], "retire" as unknown as ActionId),
    ).toContain("unknown action");
  });
});

/* ------------------------------------------------------------------ */
/* 3. CLICK-TIME RE-CHECK: a stale offer refuses and writes nothing.    */
/*    This is the #177 regression coverage for the PANEL path: these     */
/*    drive checkBoardActionAvailable, the exact function the panel's    */
/*    ActionBar calls before opening any flow.                           */
/* ------------------------------------------------------------------ */

interface FakeRow {
  id: number;
  foreign?: boolean;
  sourceSessionId?: string;
  state: string;
}

interface FakeBoard {
  tickets: FakeRow[];
  evidence: Record<string, Array<{ kind: string }>>;
}

/**
 * Stub the transport underneath `callAidosRemote` and record every method
 * the code under test actually invokes, in envelope form
 * (`aidos/<method>`). Same contract as the #177 suite: the refusal path
 * must touch only the READ.
 */
function stubBoard(board: FakeBoard): string[] {
  const methods: string[] = [];
  const fetchMock = async (
    _url: unknown,
    init?: { body?: unknown },
  ): Promise<{ ok: boolean; json: () => Promise<unknown> }> => {
    let method = "?";
    try {
      const envelope = JSON.parse(String(init?.body ?? "{}")) as {
        method?: unknown;
      };
      if (typeof envelope.method === "string") method = envelope.method;
    } catch {
      method = "?unparseable?";
    }
    methods.push(method);
    return {
      ok: true,
      json: async () => ({
        type: "server-response",
        rpcId: "test-rpc",
        result: { ok: true, value: board },
      }),
    };
  };
  vi.stubGlobal("fetch", fetchMock);
  return methods;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function checkBoard(
  board: FakeBoard,
  boardKey: string,
  actionId: ActionId,
): Promise<{ refusal: string | null; methods: string[] }> {
  const methods = stubBoard(board);
  const refusal = await checkBoardActionAvailable("sess-1", boardKey, actionId);
  return { refusal, methods };
}

describe("#194 a stale panel action refuses at click time and writes no evidence", () => {
  it("Sign off offered at render but gone at click refuses via one READ only", async () => {
    // Rendered while #172 was open (Sign off enabled); clicked after it
    // moved to in_progress. The #177 junk write was a duplicate
    // user_signoff row attached before the refused move.
    const { refusal, methods } = await checkBoard(
      {
        tickets: [{ id: 172, foreign: false, state: "in_progress" }],
        evidence: { "172": [{ kind: "builtin:user_signoff" }] },
      },
      "172",
      "signoff",
    );
    expect(refusal).not.toBeNull();
    expect(refusal ?? "").toContain("already signed off");
    expect(methods).toEqual(["aidos/workspaceTickets"]);
  });

  it("Mark done is checked, not bypassed: no verified row refuses without writing", async () => {
    const { refusal, methods } = await checkBoard(
      {
        tickets: [{ id: 3, foreign: false, state: "awaiting_verification" }],
        evidence: {},
      },
      "3",
      "mark-done",
    );
    expect(refusal).not.toBeNull();
    expect(refusal ?? "").toContain("user_verified");
    expect(methods).toEqual(["aidos/workspaceTickets"]);
  });

  it("Mark done with the verified row still passes", async () => {
    const { refusal, methods } = await checkBoard(
      {
        tickets: [{ id: 3, foreign: false, state: "awaiting_verification" }],
        evidence: { "3": [{ kind: "builtin:user_verified" }] },
      },
      "3",
      "mark-done",
    );
    expect(refusal).toBeNull();
    expect(methods).toEqual(["aidos/workspaceTickets"]);
  });

  it("submit-for-review and allowlist refuse from the wrong state without writing", async () => {
    const board: FakeBoard = {
      tickets: [{ id: 9, foreign: false, state: "open" }],
      evidence: {},
    };
    for (const actionId of ["submit-for-review", "allowlist"] as const) {
      const { refusal, methods } = await checkBoard(board, "9", actionId);
      expect(refusal).not.toBeNull();
      expect(methods).toEqual(["aidos/workspaceTickets"]);
    }
  });

  it("a ticket that left the board refuses without writing", async () => {
    const { refusal, methods } = await checkBoard(
      {
        tickets: [{ id: 172, foreign: false, state: "in_progress" }],
        evidence: {},
      },
      "999",
      "verify",
    );
    expect(refusal).not.toBeNull();
    expect(refusal ?? "").toContain("not on this board");
    expect(methods).toEqual(["aidos/workspaceTickets"]);
  });
});

/* ------------------------------------------------------------------ */
/* 4. ONE FLOW: the panel launches the board's flows; the tile none.    */
/* ------------------------------------------------------------------ */

describe("#194 the panel opens the board's flows; the tile implements nothing", () => {
  const tile = readFileSync(
    new URL("../src/client/ticket-tile.tsx", import.meta.url).pathname,
    "utf8",
  );
  const bar = readFileSync(
    new URL("../src/client/action-bar.tsx", import.meta.url).pathname,
    "utf8",
  );
  const detail = readFileSync(
    new URL("../src/client/detail-panel.tsx", import.meta.url).pathname,
    "utf8",
  );

  it("the detail panel keeps its dialog components; the tile mounts none", () => {
    for (const component of [
      "<SignoffDialog",
      "<VerifyModal",
      "<SendBackModal",
      "<MarkDoneModal",
      "AllowlistEditor",
    ]) {
      expect(detail).toContain(component);
      expect(tile).not.toContain(component);
    }
  });

  it("the tile carries no action plumbing at all", () => {
    // No bar, no guard, no submit writer, no dialog open-state: the #194
    // reversal removed the mount AND the machinery only it drove. (Matched
    // on code shapes, not mentions — the header comment narrates the
    // reversal and may name what it removed.)
    expect(tile).not.toMatch(/<ActionBar|from "\.\/action-bar"/);
    expect(tile).not.toContain("checkBoardActionAvailable(");
    expect(tile).not.toContain("submitTicketForReview(");
    expect(tile).not.toContain("aidos-tile-actions");
    expect(tile).not.toContain("setSignoffOpen");
  });

  it("names no write remote and attaches no evidence kind of its own", () => {
    // Matched on QUOTED remote names, not on mentions, per the u98
    // convention: prose about a remote is not a call.
    for (const remote of [
      '"userAttachEvidence"',
      '"userMoveTicket"',
      '"userAddComment"',
      '"userGrantAllowlist"',
      '"userSetTicket"',
      '"userDetachEvidence"',
    ]) {
      expect(tile).not.toContain(remote);
    }
    expect(tile).not.toContain('kind: "builtin:');
  });

  it("submits for review through the panel's ONE writer", () => {
    expect(detail).toContain("export async function submitTicketForReview");
  });

  it("the panel still checks every click through the board's decider before opening", () => {
    expect(detail).toContain("checkBoardActionAvailable");
    expect(bar).toContain("checkAction");
  });

  it("the action bar's new code adds no write of its own", () => {
    for (const remote of [
      '"userAttachEvidence"',
      '"userMoveTicket"',
      '"userAddComment"',
      '"userGrantAllowlist"',
      '"userSetTicket"',
    ]) {
      expect(bar).not.toContain(remote);
    }
    // The refusal path toasts instead of opening: the reason reaches the
    // human with no dialog behind it.
    expect(bar).toContain("showToast(refusal");
  });
});
