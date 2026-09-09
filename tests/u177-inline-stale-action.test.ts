/**
 * #177: a stale inline card must REFUSE, not write.
 *
 * Found live, minutes after the inline actions shipped: clicking Sign off
 * on a `suggest_actions` card for #172 -- already signed off and moved --
 * attached a DUPLICATE `builtin:user_signoff` row and THEN failed the move
 * with "Gate refused for in_progress -> in_progress". Two defects: the
 * action was offered after it stopped applying, and the write happened
 * before anything checked.
 *
 * WHY THIS TEST DRIVES `checkInlineActionAvailable` RATHER THAN THE STATE
 * RULE. The verdict lives in `actionsFor`, which already has its own suite
 * (u2c-action-visibility). A test here that re-states "in_progress means no
 * signoff" would pass beside a button that never calls it -- precisely how
 * duplicated write paths survived before (#98). So this test calls the
 * EXACT function the card's button calls, with the transport stubbed, and
 * asserts two things: the refusal, and that the only remote the refusal
 * path touches is the `workspaceTickets` READ. A regression that re-adds a
 * write-before-check fails on the captured method list, not on prose.
 */

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkInlineActionAvailable,
  type InlineActionId,
} from "../src/client/inline-actions";

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
 * (`aidos/<method>`). Returns the captured list.
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

/** The reported board: #172 already signed off and moved. */
function reportedBoard(): FakeBoard {
  return {
    tickets: [{ id: 172, foreign: false, state: "in_progress" }],
    evidence: { "172": [{ kind: "builtin:user_signoff" }] },
  };
}

async function check(
  board: FakeBoard,
  boardKey: string,
  actionId: InlineActionId,
): Promise<{ refusal: string | null; methods: string[] }> {
  const methods = stubBoard(board);
  const refusal = await checkInlineActionAvailable("sess-1", boardKey, actionId);
  return { refusal, methods };
}

describe("#177 stale inline actions refuse without writing", () => {
  it("Sign off on a ticket already in_progress refuses and calls no write remote", async () => {
    const { refusal, methods } = await check(reportedBoard(), "172", "signoff");
    expect(refusal).not.toBeNull();
    expect(refusal ?? "").toContain("already signed off");
    // The whole point: the refusal path is READ-only. Any write remote
    // here -- attach, move, grant -- is the bug back.
    expect(methods).toEqual(["aidos/workspaceTickets"]);
  });

  it("Sign off on an open ticket is still offered", async () => {
    const { refusal, methods } = await check(
      { tickets: [{ id: 9, foreign: false, state: "open" }], evidence: {} },
      "9",
      "signoff",
    );
    expect(refusal).toBeNull();
    expect(methods).toEqual(["aidos/workspaceTickets"]);
  });

  it("verify follows the same decider: awaiting passes, in_progress refuses", async () => {
    const awaiting = await check(
      {
        tickets: [{ id: 3, foreign: false, state: "awaiting_verification" }],
        evidence: {},
      },
      "3",
      "verify",
    );
    expect(awaiting.refusal).toBeNull();
    const moved = await check(reportedBoard(), "172", "verify");
    expect(moved.refusal).not.toBeNull();
    expect(moved.refusal ?? "").toContain("awaiting verification");
    expect(moved.methods).toEqual(["aidos/workspaceTickets"]);
  });

  it("a card for a ticket that is not on this board refuses without writing", async () => {
    const { refusal, methods } = await check(reportedBoard(), "999", "signoff");
    expect(refusal).not.toBeNull();
    expect(refusal ?? "").toContain("not on this board");
    expect(methods).toEqual(["aidos/workspaceTickets"]);
  });

  it("a foreign card addresses the foreign row, not a same-numbered own one (#93)", async () => {
    const { refusal, methods } = await check(
      {
        tickets: [
          { id: 5, foreign: false, state: "in_progress" },
          {
            id: 5,
            foreign: true,
            sourceSessionId: "other-sess",
            state: "open",
          },
        ],
        evidence: { "5": [{ kind: "builtin:user_signoff" }] },
      },
      "other-sess:5",
      "signoff",
    );
    // The FOREIGN #5 is open, so signoff applies -- resolving by board key
    // rather than by bare id. A bare-id lookup would have read the own
    // in_progress row and refused (or worse, written to the wrong ticket).
    expect(refusal).toBeNull();
    expect(methods).toEqual(["aidos/workspaceTickets"]);
  });
});

/**
 * USER-REPORTED, 2026-09-08: the inline "Open on board" action "does not
 * actually open the ticket's detail view - it just opens the board".
 *
 * The first cut wrote only the selection STORE, which is in-memory: enough
 * when the board is already mounted for that session, and nothing at all
 * when it mounts later — which is the normal case from a transcript, where
 * the board is usually not on screen. #100 round 4 had already established
 * which channel survives that gap: the `?ticket=` deep link a board reads on
 * mount. The card must write it too.
 */
describe("#177 opening a ticket from a card uses the channel a board can read", () => {
  const inline = readFileSync(
    new URL("../src/client/inline-actions.tsx", import.meta.url).pathname,
    "utf8",
  );
  const view = readFileSync(
    new URL("../src/client/view-state.ts", import.meta.url).pathname,
    "utf8",
  );
  const board = readFileSync(
    new URL("../src/client/local-ticket-view.tsx", import.meta.url).pathname,
    "utf8",
  );

  it("writes the deep link, not only the in-memory selection", () => {
    const branch = inline.slice(inline.indexOf('props.actionId === "mark-done"'));
    expect(branch.slice(0, 1400)).toContain("setSelection(props.sessionId, props.boardKey)");
    expect(branch.slice(0, 1400)).toContain("setTicketParam(props.boardKey)");
  });

  it("shares ONE param writer with the board, rather than agreeing by luck", () => {
    /*
     * #170's rule applied to a one-line function: two copies of "what does
     * the URL say is open" is two answers, and the board's copy is the one
     * #100 spent four rounds getting right.
     */
    expect(view).toContain("export function setTicketParam");
    expect(board).not.toContain("function setTicketParam(");
    expect(board).toContain("setTicketParam,");
  });

  it("still writes no board evidence on this path", () => {
    // Opening a ticket is navigation, not a write. The #170 guard in u98
    // covers the module; this pins the specific branch.
    const branch = inline.slice(
      inline.indexOf('props.actionId === "mark-done"'),
      inline.indexOf("#177: ASK before acting"),
    );
    expect(branch).not.toContain("callAidosRemote(");
  });
});
