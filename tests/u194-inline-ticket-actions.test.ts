/**
 * #194: inline human-action buttons on the ticket card and the detail panel.
 *
 * WHAT THIS PINS.
 * 1. RENDER: the card shows the action buttons with no agent nomination
 *    involved -- the tile derives them from `actionsFor` (state + gate)
 *    from its own ticket + evidence props. A ticket with no legal action
 *    shows grey buttons with the unlock reason, never hidden ones (the
 *    action bar's treatment, reused, not reinvented).
 * 2. CLICK-TIME RE-CHECK: `checkBoardActionAvailable` -- the EXACT function
 *    the card's and the panel's buttons call before acting -- refuses a
 *    stale action (available at render, gone at click) and its refusal path
 *    touches only the `workspaceTickets` READ, so no junk evidence is
 *    written (the #177 regression).
 * 3. ONE FLOW: the card opens the SAME dialog components the detail panel
 *    opens and implements no write of its own (#170); submit for review has
 *    one writer shared by both surfaces.
 *
 * WHY A SHIM RENDERER. react-testing-library is not installed, and
 * react-dom cannot load in this repo's tests (react 18.3.1 against
 * react-dom 19.2.8: the server renderer refuses the mismatch outright).
 * So this file renders the hard way that needs neither: React elements are
 * plain objects, and a function component is a function. With a minimal
 * hook dispatcher installed (useState keeps its initial value, effects are
 * no-ops -- neither surface under test reads an updated state or an effect
 * during the initial render), calling the component and recursively
 * expanding function-typed elements executes the REAL render logic and
 * yields the REAL element tree, which is then queried for buttons, labels,
 * and disabled/tooltip state. It cannot click -- the click path is covered
 * by driving the exact guard function, u177-style, with the transport
 * stubbed.
 */

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import react from "react";

import { TicketTile } from "../src/client/ticket-tile";
import { ActionBar } from "../src/client/action-bar";
import { checkBoardActionAvailable } from "../src/client/inline-actions";
import { refusalForAction, type ActionId } from "../src/client/action-visibility";
import type { TicketView } from "../src/kernel/projections";
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
}

function buttonsIn(root: unknown): ButtonNode[] {
  return renderNodes(root)
    .filter((node) => node.tag === "button")
    .map((node) => ({
      text: node.text,
      disabled: node.props["disabled"] === true,
      title: typeof node.props["title"] === "string" ? (node.props["title"] as string) : "",
    }));
}

function rootNode(root: unknown): HostNode {
  const nodes = renderNodes(root);
  if (nodes.length === 0) throw new Error("render produced no host nodes");
  return nodes[0];
}

/* ------------------------------------------------------------------ */
/* Fixtures.                                                           */
/* ------------------------------------------------------------------ */

function ticketFixture(state: string, extra?: Record<string, unknown>): TicketView {
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
  } as unknown as TicketView;
}

function evidenceRow(kind: string): EvidenceRow {
  return { kind, author: "user", at: 1, payload: {} } as unknown as EvidenceRow;
}

function tileElement(ticket: TicketView, evidence: EvidenceRow[]) {
  return react.createElement(TicketTile, {
    ticket,
    evidence,
    selected: false,
    agentId: "sess-1",
    ticketIdKey: "7",
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
/* 1. RENDER: the card shows the gate-derived buttons, no nomination.   */
/* ------------------------------------------------------------------ */

describe("#194 the card renders the gate-derived action buttons", () => {
  it("an open ticket offers Sign off and greys the rest with reasons", () => {
    // No nomination, no queue, no agent ask anywhere in the props: the
    // buttons come from the ticket's own state, which is the point.
    const buttons = buttonsIn(tileElement(ticketFixture("open"), []));
    expect(findButton(buttons, "Sign off").disabled).toBe(false);
    expect(findButton(buttons, "Verify").disabled).toBe(true);
    expect(findButton(buttons, "Verify").title).toContain("awaiting verification");
    expect(findButton(buttons, "Submit for review").disabled).toBe(true);
    expect(findButton(buttons, "Send back").disabled).toBe(true);
    expect(findButton(buttons, "Mark done").disabled).toBe(true);
    expect(findButton(buttons, "Allowlist").disabled).toBe(true);
  });

  it("an in-progress ticket with review evidence offers Submit for review, never Sign off", () => {
    const buttons = buttonsIn(
      tileElement(ticketFixture("in_progress"), [
        evidenceRow("builtin:review_pass"),
        evidenceRow("builtin:automated_check"),
      ]),
    );
    expect(findButton(buttons, "Submit for review").disabled).toBe(false);
    const signoff = findButton(buttons, "Sign off");
    expect(signoff.disabled).toBe(true);
    expect(signoff.title).toContain("already signed off");
  });

  it("an awaiting ticket offers Verify; Mark done stays grey until the verified row lands", () => {
    const unverified = buttonsIn(tileElement(ticketFixture("awaiting_verification"), []));
    expect(findButton(unverified, "Verify").disabled).toBe(false);
    expect(findButton(unverified, "Send back").disabled).toBe(false);
    const markDone = findButton(unverified, "Mark done");
    expect(markDone.disabled).toBe(true);
    expect(markDone.title).toContain("user_verified");
    const verified = buttonsIn(
      tileElement(ticketFixture("awaiting_verification"), [
        evidenceRow("builtin:user_verified"),
      ]),
    );
    expect(findButton(verified, "Mark done").disabled).toBe(false);
  });

  it("a ticket with no legal action shows grey buttons, never hidden ones", () => {
    // The action bar's treatment, reused: every action renders; the
    // unavailable ones are disabled with the unlock reason as tooltip.
    const buttons = buttonsIn(tileElement(ticketFixture("done"), []));
    expect(buttons.map((button) => button.text)).toEqual([
      "Sign off",
      "Verify",
      "Submit for review",
      "Send back",
      "Mark done",
      "Allowlist",
    ]);
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
      expect(button.title.length).toBeGreaterThan(button.text.length);
    }
  });

  it("the action buttons are not nested inside a button", () => {
    // The tile root was a <button>; action buttons inside it would nest
    // interactive content (an inner click also selects the tile). The root
    // is a div wearing the button role instead.
    const root = rootNode(tileElement(ticketFixture("open"), []));
    expect(root.tag).toBe("div");
    expect(root.props["role"]).toBe("button");
    expect(root.props["tabIndex"]).toBe(0);
  });
});

describe("#194 the shared action bar always renders every action", () => {
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

describe("#194 a stale card refuses at click time and writes no evidence", () => {
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
/* 4. ONE FLOW: the card launches the board's flows, implements none.   */
/* ------------------------------------------------------------------ */

describe("#194 the card opens the board's flows and implements no write", () => {
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

  it("opens the SAME dialog components the detail panel opens", () => {
    for (const component of [
      "<SignoffDialog",
      "<VerifyModal",
      "<SendBackModal",
      "<MarkDoneModal",
      "AllowlistEditor",
    ]) {
      expect(tile).toContain(component);
      expect(detail).toContain(component);
    }
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

  it("submits for review through the panel's ONE writer, not a move of its own", () => {
    expect(tile).toContain("submitTicketForReview(");
    expect(tile).not.toContain('to: "awaiting_verification"');
    expect(detail).toContain("export async function submitTicketForReview");
  });

  it("checks every click through the board's decider before opening", () => {
    expect(tile).toContain("checkBoardActionAvailable");
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
