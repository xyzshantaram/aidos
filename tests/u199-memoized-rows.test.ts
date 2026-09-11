/**
 * #199: stop re-rendering the whole board on every tick.
 *
 * WHAT THIS PINS.
 *
 * 1. RENDER COUNT. The tile/strip markup caches return the SAME element
 *    when nothing that shapes the markup changed, so a tick that touches
 *    one ticket rebuilds exactly one row instead of every row. The first
 *    block measures it directly: N rows, one changed -- N rebuilds before
 *    (fresh row identities, which is what the caller used to produce) vs
 *    1 rebuild after (stabilized identities, which is what
 *    local-ticket-view now produces).
 * 2. LIVE UPDATES PROPAGATE. A tick carrying new data hands the row a new
 *    content hash / new ticket object; the cache must MISS and the new
 *    markup must show the new data -- never a stale card.
 * 3. THE STRIP IS CONTENT-KEYED. #73's tool cards rebuild their ticket
 *    objects every render; the strip must still hit the cache when the
 *    CONTENT is unchanged, and miss when it changed.
 *
 * Rendering works through the same shim dispatcher the #194 test uses
 * (react-dom cannot load in this repo's tests): TicketTile's hooks are
 * real useState calls, so a minimal dispatcher is installed around every
 * invocation. Cache hits are detected by ELEMENT IDENTITY -- the whole
 * point of the cache is returning the identical element reference, which
 * is also what makes React bail out of the subtree.
 */

import { describe, expect, it } from "vitest";

import react from "react";

import { TicketTile } from "../src/client/ticket-tile";
import { TicketStrip } from "../src/client/ticket-strip";
import type { TicketView } from "../src/kernel/projections";
import type { EvidenceRow } from "../src/kernel/types";

/* ------------------------------------------------------------------ */
/* The shim dispatcher (same shape as u194's).                         */
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
      typeof initial === "function" ? (initial as () => unknown)() : initial,
      noop,
    ],
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
    useTransition: () => [false, noop],
  };
  return () => {
    dispatcher.current = previous;
  };
}

/* ------------------------------------------------------------------ */
/* Fixtures.                                                           */
/* ------------------------------------------------------------------ */

let nextId = 1000;

function ticketFixture(title: string, extra?: Record<string, unknown>): TicketView {
  nextId += 1;
  return {
    id: nextId,
    title,
    description: "A #199 fixture ticket.",
    criteria: "",
    state: "open",
    phase: 1,
    order: 1,
    slug: "fixture-" + String(nextId),
    workspaceKey: "ws",
    confidenceScore: 50,
    gatePresent: 0,
    gateTotal: 0,
    dependsOn: [],
    tags: [],
    ...extra,
  } as unknown as TicketView;
}

const evidenceFixture: EvidenceRow[] = [];

interface TileRow {
  ticket: TicketView;
  evidence: EvidenceRow[];
}

function tileProps(row: TileRow) {
  return {
    ticket: row.ticket,
    evidence: row.evidence,
    selected: false,
    onSelect: () => {},
  };
}

/** Render every row; REBUILDS is how many returned root elements are NEW
 *  (differ by identity) versus the previous render's elements. */
function renderBoard(
  rows: TileRow[],
  previous: unknown[],
): { elements: react.ReactElement[]; rebuilds: number } {
  const restore = installDispatcher();
  const elements: react.ReactElement[] = [];
  try {
    for (const row of rows) {
      elements.push(TicketTile(tileProps(row)) as react.ReactElement);
    }
  } finally {
    restore();
  }
  let rebuilds = 0;
  for (let index = 0; index < elements.length; index += 1) {
    if (previous[index] !== elements[index]) rebuilds += 1;
  }
  previous.length = 0;
  previous.push(...elements);
  return { elements, rebuilds };
}

/* ------------------------------------------------------------------ */
/* The measurements.                                                   */
/* ------------------------------------------------------------------ */

describe("#199 memoized rows", () => {
  it("a tick changing one ticket rebuilds one row, not the whole board", () => {
    const ROWS = 12;
    const board: TileRow[] = [];
    for (let index = 0; index < ROWS; index += 1) {
      board.push({ ticket: ticketFixture("Ticket " + String(index)), evidence: evidenceFixture });
    }

    // BEFORE (the old caller behaviour): every row object is a fresh clone
    // every tick, as local-ticket-view's inline spread used to produce.
    const beforePrevious: unknown[] = [];
    const beforeFirst = renderBoard(board, beforePrevious);
    expect(beforeFirst.elements.length).toBe(ROWS);
    const beforeTick: TileRow[] = board.map((row, index) =>
      index === 3
        ? { ticket: { ...row.ticket, title: "Ticket 3 (moved)" } as TicketView, evidence: row.evidence }
        : { ticket: { ...row.ticket }, evidence: row.evidence },
    );
    const beforeSecond = renderBoard(beforeTick, beforePrevious);
    // Every single row rebuilt: that is the bug being measured.
    expect(beforeSecond.rebuilds).toBe(ROWS);

    // AFTER (stabilized identities, what stabilizeBoardRows now delivers):
    // the same render with the SAME row objects hits the cache for every
    // unchanged row and rebuilds only the one whose content changed.
    const afterPrevious: unknown[] = [];
    renderBoard(board, afterPrevious);
    const afterTick: TileRow[] = board.map((row, index) =>
      index === 3
        ? { ticket: { ...row.ticket, title: "Ticket 3 (moved again)" } as TicketView, evidence: row.evidence }
        : row,
    );
    const afterSecond = renderBoard(afterTick, afterPrevious);
    expect(afterSecond.rebuilds).toBe(1);
  });

  it("a tick carrying new data invalidates the affected row's cache", () => {
    const ticket = ticketFixture("Live ticket");
    const previous: unknown[] = [];
    renderBoard([{ ticket, evidence: evidenceFixture }], previous);

    // Unchanged tick: cache hit, identical element.
    const same = renderBoard([{ ticket, evidence: evidenceFixture }], previous);
    expect(same.rebuilds).toBe(0);

    // New data for the SAME ticket id: the cache must MISS and the markup
    // must carry the new title -- never a stale card.
    const updated = { ...ticket, title: "Live ticket (updated)", state: "in_progress" } as TicketView;
    const next = renderBoard([{ ticket: updated, evidence: evidenceFixture }], previous);
    expect(next.rebuilds).toBe(1);
    expect(next.elements[0]).not.toBe(same.elements[0]);

    const restore = installDispatcher();
    try {
      const text = JSON.stringify(next.elements[0]);
      expect(text).toContain("Live ticket (updated)");
    } finally {
      restore();
    }
  });

  it("a second identical render returns the identical element (cache hit)", () => {
    const ticket = ticketFixture("Cache hit ticket");
    const props = tileProps({ ticket, evidence: evidenceFixture });
    const restore = installDispatcher();
    let first: unknown;
    let second: unknown;
    try {
      first = TicketTile(props);
      second = TicketTile(props);
    } finally {
      restore();
    }
    expect(second).toBe(first);
  });
});

describe("#199 content-keyed strip cache", () => {
  function stripTicket(title: string): TicketView {
    return ticketFixture(title);
  }

  it("fresh-but-content-equal props hit the cache; changed content misses", () => {
    const ticket = stripTicket("Strip ticket");
    const restore = installDispatcher();
    try {
      const first = TicketStrip({ ticket }) as react.ReactElement;
      // A NEW object with the SAME content -- the #73 tool-card shape.
      const clone = { ...ticket };
      const second = TicketStrip({ ticket: clone }) as react.ReactElement;
      expect(second).toBe(first);

      const changed = TicketStrip({
        ticket: { ...ticket, title: "Strip ticket (renamed)" },
      }) as react.ReactElement;
      expect(changed).not.toBe(first);
      expect(JSON.stringify(changed)).toContain("renamed");
    } finally {
      restore();
    }
  });
});
