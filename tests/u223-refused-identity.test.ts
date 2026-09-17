/**
 * #223: a refused gate move loses the ticket's identity.
 *
 * The owner's report: a `move_ticket` the gate refuses renders a card that
 * says what went wrong and omits WHICH TICKET it went wrong on, so refusals
 * in a multi-move session are indistinguishable from each other.
 *
 * WHAT THIS PINS.
 * 1. IDENTITY: a refused move names its ticket -- id AND title -- alongside
 *    the refusal reason, on the same card.
 * 2. OUTCOME STAYS SUPPRESSED: no destination badge on a refusal (#144's
 *    rule stands -- the ticket did not go there, so a badge would assert
 *    something false). The absence assertion is paired with a success
 *    control rendering the SAME badge, so it cannot pass vacuously.
 * 3. ALTITUDE: the split lives in the shared shell (AidosRow), so every
 *    ticket-scoped row keeps its subject's identity on failure, not only
 *    move_ticket -- driven through the REAL components (the u216 shim).
 * 4. THE REASON KEEPS ITS LINE: the full reason text is intact after the
 *    identity prefix, and the identity itself is bounded (id-first
 *    ellipsis), so a long title costs the reason its tail, never its place.
 * 5. #144 UNCHANGED: a successful move still truncates the title and shows
 *    the destination badge.
 *
 * WHAT THIS DOES NOT PIN. Pixel layout: that the reason still fits beside
 * the identity at a given card width is CSS, and no CSS changed here. The
 * DOM half -- both strings present, identity first and bounded -- is what
 * is asserted.
 *
 * SUBSTRING HYGIENE (the "dupe"/"dupe-2" lesson). The refusal reasons used
 * here never contain a ticket id, so any `#N` in the summary can only be the
 * identity the shell rendered. The primary id assertion additionally uses a
 * digit-boundary match, so `#223` can never pass off `#2234`.
 */

import { describe, expect, it } from "vitest";

import react from "react";

import {
  AttachCommitRow,
  AttachEvidenceRow,
  AttachTagsRow,
  GetEvidenceRow,
  GetTicketRow,
  MoveTicketRow,
  PlanRow,
  RequestAllowlistRow,
  SetTicketRow,
} from "../src/client/aidos-rows";
import { badgeClass } from "../src/client/board-logic";
import { publishTicketTitles } from "../src/client/view-state";

/* ------------------------------------------------------------------ */
/* Blocks in the harness's own shape (tool-block's readers).           */
/* ------------------------------------------------------------------ */

function settledBlock(args: unknown, result: unknown): unknown {
  return {
    kind: "tool_call",
    call: { argsRaw: JSON.stringify(args) },
    content: [{ type: "text", text: JSON.stringify(result) }],
    isError: false,
  };
}

function errorBlock(args: unknown, envelope: Record<string, unknown>): unknown {
  return {
    kind: "tool_call",
    call: { argsRaw: JSON.stringify(args) },
    content: [{ type: "text", text: `Error: ${JSON.stringify(envelope)}` }],
    isError: true,
  };
}

/* ------------------------------------------------------------------ */
/* The shim renderer (u216 pattern, rows held expanded).               */
/* ------------------------------------------------------------------ */

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
    useReducer: (_reducer: unknown, initial: unknown) => [initial, noop],
    useRef: (value: unknown) => ({ current: value }),
    useState: (initial: unknown) => [
      initial === false
        ? true
        : typeof initial === "function"
          ? (initial as () => unknown)()
          : initial,
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
  className: string;
  text: string;
}

function subtreeText(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(subtreeText).join("");
  if (typeof node !== "object" || !("props" in node)) return "";
  const props = (node as { props: Record<string, unknown> }).props;
  const html = props.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
  const rendered = typeof html?.__html === "string" ? html.__html : "";
  return rendered + subtreeText(props.children);
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
    expand((element.type as (props: Record<string, unknown>) => unknown)(element.props), out);
    return;
  }
  if (typeof element.type === "symbol") {
    expand(element.props.children, out);
    return;
  }
  if (typeof element.type === "string") {
    out.push({
      tag: element.type,
      className: typeof element.props.className === "string" ? element.props.className : "",
      text: subtreeText(element.props.children),
    });
    expand(element.props.children, out);
  }
}

type RowComponent = (props: { block: unknown; sessionId?: string }) => unknown;

/** Render one row component over one block; return every host element. */
function renderRow(Row: RowComponent, block: unknown, sessionId?: string): HostNode[] {
  const restore = installDispatcher();
  try {
    const out: HostNode[] = [];
    expand(Row({ block, sessionId }), out);
    return out;
  } finally {
    restore();
  }
}

function summaryText(nodes: HostNode[]): string {
  const found = nodes.find(
    (node) =>
      node.className.includes("tool-render-summary") || node.className.includes("tool-render-path"),
  );
  return found?.text ?? "";
}

function hasClass(nodes: HostNode[], token: string): boolean {
  return nodes.some((node) => node.className.split(" ").includes(token));
}

/* ------------------------------------------------------------------ */
/* Fixtures.                                                           */
/* ------------------------------------------------------------------ */

const SESSION = "u223-session";
const TITLE_223 = "Refused moves keep their names";
const TITLE_224 = "A second ticket in the same session";
const LONG_TITLE =
  "#226 — a title long enough that the move card must cut it, because the whole point of #144 " +
  "is that the destination badge survives whatever the title does beside it";

publishTicketTitles(SESSION, [
  { id: 223, title: TITLE_223 },
  { id: 224, title: TITLE_224 },
  { id: 226, title: LONG_TITLE },
]);

const MOVE_ARGS = { ticketId: 223, to: "awaiting_verification" };
const GATE_REFUSAL = {
  ok: false,
  error: "tool_error",
  message:
    "Gate refused for in_progress -> awaiting_verification by actor agent: " +
    "missing evidence kinds: builtin:review_pass",
};
const REASON = GATE_REFUSAL.message;

/** `#223` as a standalone ticket reference -- never `#2234`, never prose. */
function namesTicket(summary: string, id: number): boolean {
  return new RegExp(`(^|[^\\d])#${id}([^\\d]|$)`).test(summary);
}

const BADGE = "aidos-chip-state-awaiting-verification";
const SUCCESS_RESULT = {
  ok: true,
  ticketId: 223,
  fromState: "in_progress",
  toState: "awaiting_verification",
};

describe("#223 a refused move names its ticket alongside the reason", () => {
  it("renders id, title and reason on the one card", () => {
    const summary = summaryText(renderRow(MoveTicketRow, errorBlock(MOVE_ARGS, GATE_REFUSAL), SESSION));
    // The identity: id (digit-bounded, so #2234 could never satisfy this)
    // and the board's title for it.
    expect(namesTicket(summary, 223)).toBe(true);
    expect(summary).toContain(TITLE_223);
    // The reason keeps its line, whole: the identity is a prefix, not a swap.
    expect(summary).toContain(REASON);
    expect(summary.indexOf("#223")).toBe(0);
  });

  it("two refusals in a row are distinguishable from each other", () => {
    // The owner's complaint, literally: consecutive refused moves whose
    // cards cannot be told apart.
    const first = summaryText(
      renderRow(MoveTicketRow, errorBlock(MOVE_ARGS, GATE_REFUSAL), SESSION),
    );
    const second = summaryText(
      renderRow(
        MoveTicketRow,
        errorBlock({ ticketId: 224, to: "awaiting_verification" }, GATE_REFUSAL),
        SESSION,
      ),
    );
    expect(namesTicket(first, 223)).toBe(true);
    expect(first).not.toContain("#224");
    expect(namesTicket(second, 224)).toBe(true);
    expect(second).not.toContain("#223");
  });

  it("renders no destination badge on a refusal", () => {
    const nodes = renderRow(MoveTicketRow, errorBlock(MOVE_ARGS, GATE_REFUSAL), SESSION);
    expect(hasClass(nodes, BADGE)).toBe(false);
    expect(hasClass(nodes, "aidos-move-arrow")).toBe(false);
    // The control: the SAME renderer shows the SAME badge on a success, so
    // the absence above is the suppression working, not an empty render.
    const settled = renderRow(MoveTicketRow, settledBlock(MOVE_ARGS, SUCCESS_RESULT), SESSION);
    expect(hasClass(settled, BADGE)).toBe(true);
    expect(badgeClass("awaiting_verification")).toContain(BADGE);
  });
});

describe("#223 the split lives in the shell: every ticket-scoped row keeps its subject", () => {
  const cases: Array<{ name: string; row: RowComponent; args: Record<string, unknown> }> = [
    { name: "set_ticket", row: SetTicketRow, args: { ticketId: 223, title: "renamed" } },
    {
      name: "attach_evidence",
      row: AttachEvidenceRow,
      args: { ticketId: 223, kind: "note", payload: { note: "hi" } },
    },
    {
      name: "attach_commit",
      row: AttachCommitRow,
      args: { ticketId: 223, hash: "deadbee", note: "unresolvable" },
    },
    { name: "attach_tags", row: AttachTagsRow, args: { ticketId: 223, tags: ["ui"] } },
    { name: "move_ticket", row: MoveTicketRow, args: { ticketId: 223, to: "in_progress" } },
    { name: "get_ticket", row: GetTicketRow, args: { ticketId: 223 } },
    { name: "get_evidence", row: GetEvidenceRow, args: { ticketId: 223 } },
    {
      name: "request_allowlist",
      row: RequestAllowlistRow,
      args: { ticketId: 223, paths: ["src/extra"] },
    },
  ];

  for (const { name, row, args } of cases) {
    it(`${name} refused still names its ticket beside the reason`, () => {
      // No session here: the board has published no title, so the identity
      // degrades to the bare id -- never blank, never another ticket's.
      const summary = summaryText(renderRow(row, errorBlock(args, GATE_REFUSAL)));
      expect(namesTicket(summary, 223)).toBe(true);
      expect(summary).toContain(REASON);
    });
  }

  it("a row with no subject renders the reason alone, exactly as before", () => {
    const summary = summaryText(
      renderRow(PlanRow, errorBlock({ file: "PLAN.md" }, GATE_REFUSAL)),
    );
    expect(summary).toBe(REASON);
  });
});

describe("#223 the reason keeps its line under a long title", () => {
  it("bounds the identity with an id-first ellipsis and keeps the whole reason", () => {
    const summary = summaryText(
      renderRow(
        MoveTicketRow,
        errorBlock({ ticketId: 226, to: "awaiting_verification" }, GATE_REFUSAL),
        SESSION,
      ),
    );
    // The address survives the cut (#144's id-first rule); the cut itself
    // is marked, and the full label is one hover away on the identity span.
    expect(namesTicket(summary, 226)).toBe(true);
    expect(summary).toContain("…");
    expect(summary).toContain(REASON);
  });
});

describe("#223 #144's success shape is unchanged", () => {
  it("a successful move still truncates the title and badges the destination", () => {
    const nodes = renderRow(
      MoveTicketRow,
      settledBlock(
        { ticketId: 226, to: "awaiting_verification" },
        { ok: true, ticketId: 226, fromState: "in_progress", toState: "awaiting_verification" },
      ),
      SESSION,
    );
    const summary = summaryText(nodes);
    expect(hasClass(nodes, BADGE)).toBe(true);
    expect(summary).toContain("…");
    expect(summary).toContain("→");
    expect(namesTicket(summary, 226)).toBe(true);
  });
});
