/**
 * #93: the human work queue.
 *
 * The derived half is pure logic over board state — it must produce the
 * right asks with no agent running, and it must NOT invent asks the gate
 * would refuse. The nominated half is a reason merged onto an ask that
 * already exists, never a new button.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  derivedQueue,
  humanQueue,
  queueCount,
  sortQueue,
  unmatchedNominations,
} from "../src/client/human-queue";
import type { Nomination } from "../src/client/human-queue";
import { makeTicket } from "./u2c-helpers";
import { queueEntriesFor } from "../src/client/queue-panel";
import type { EvidenceRow } from "../src/kernel/types";

const noEvidence = () => [] as string[];

describe("u93 human-queue: the derived half", () => {
  it("an open ticket asks for signoff", () => {
    const entries = derivedQueue([makeTicket({ id: 1, state: "open" })], noEvidence);
    expect(entries.map((e) => e.actionId)).toEqual(["signoff"]);
    expect(entries[0].prompt).toContain("Sign off");
  });

  it("an in_progress ticket asks for nothing — the agent owns it", () => {
    const entries = derivedQueue(
      [makeTicket({ id: 1, state: "in_progress" })],
      noEvidence,
    );
    expect(entries).toEqual([]);
  });

  it("an awaiting ticket asks to be verified, and not yet to be marked done", () => {
    const entries = derivedQueue(
      [makeTicket({ id: 1, state: "awaiting_verification" })],
      noEvidence,
    );
    expect(entries.map((e) => e.actionId)).toEqual(["verify"]);
  });

  it("once user_verified is attached, mark-done REPLACES verify in the queue", () => {
    // #93 follow-up (user ask, 2026-09-03): re-showing Verify next to
    // Mark Done reads as "do this again" on an already-verified ticket.
    // The detail panel's action bar is unaffected — only the queue collapses.
    const entries = derivedQueue(
      [makeTicket({ id: 1, state: "awaiting_verification" })],
      () => ["builtin:user_verified"],
    );
    expect(entries.map((e) => e.actionId)).toEqual(["mark-done"]);
  });

  it("before verifying, only verify shows — mark-done is not yet available", () => {
    const entries = derivedQueue(
      [makeTicket({ id: 1, state: "awaiting_verification" })],
      () => [],
    );
    expect(entries.map((e) => e.actionId)).toEqual(["verify"]);
  });

  it("a done ticket never appears", () => {
    const entries = derivedQueue([makeTicket({ id: 1, state: "done" })], noEvidence);
    expect(entries).toEqual([]);
  });

  it("submit-for-review is the agent's move and never enters the human queue", () => {
    const entries = derivedQueue(
      [makeTicket({ id: 1, state: "in_progress" })],
      () => ["builtin:automated_check", "builtin:review_pass"],
    );
    expect(entries.map((e) => e.actionId)).toEqual([]);
  });

  it("counts what it lists", () => {
    const entries = derivedQueue(
      [
        makeTicket({ id: 1, state: "open" }),
        makeTicket({ id: 2, state: "open" }),
        makeTicket({ id: 3, state: "in_progress" }),
      ],
      noEvidence,
    );
    expect(queueCount(entries)).toBe(2);
  });
});

describe("u93 human-queue: the nominated half", () => {
  const nomination = (over: Partial<Nomination> = {}): Nomination => ({
    id: "n1",
    ticketId: 1,
    actionId: "signoff",
    reason: "so I can start the store phase",
    at: 0,
    ...over,
  });

  it("a nomination attaches its reason to the matching ask", () => {
    const entries = humanQueue(
      [makeTicket({ id: 1, state: "open" })],
      noEvidence,
      [nomination()],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].nominationReason).toBe("so I can start the store phase");
    expect(entries[0].nominationId).toBe("n1");
  });

  it("a nomination for an action the gate refuses is DROPPED, not shown", () => {
    // #1 is open, so mark-done is unavailable. The agent cannot conjure it.
    const entries = humanQueue(
      [makeTicket({ id: 1, state: "open" })],
      noEvidence,
      [nomination({ actionId: "mark-done" })],
    );
    expect(entries.map((e) => e.actionId)).toEqual(["signoff"]);
    expect(entries[0].nominationReason).toBeUndefined();
  });

  it("a nomination naming a ticket that is not on the board is dropped", () => {
    const entries = humanQueue(
      [makeTicket({ id: 1, state: "open" })],
      noEvidence,
      [nomination({ ticketId: 999 })],
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].nominationReason).toBeUndefined();
  });

  it("nominated entries sort ahead of merely derived ones", () => {
    const entries = humanQueue(
      [
        makeTicket({ id: 1, state: "open", phase: 1, order: 1 }),
        makeTicket({ id: 2, state: "open", phase: 1, order: 2 }),
      ],
      noEvidence,
      [nomination({ ticketId: 2 })],
    );
    expect(entries.map((e) => e.ticket.id)).toEqual([2, 1]);
  });

  it("with no nominations the queue is exactly the derived queue", () => {
    const tickets = [
      makeTicket({ id: 1, state: "open" }),
      makeTicket({ id: 2, state: "awaiting_verification" }),
    ];
    expect(humanQueue(tickets, noEvidence)).toEqual(derivedQueue(tickets, noEvidence));
  });
});

describe("u93 human-queue: sorting", () => {
  const tickets = [
    makeTicket({ id: 3, state: "open", phase: 1, order: 1, title: "Zebra", updatedAt: 10 }),
    makeTicket({ id: 1, state: "open", phase: 1, order: 2, title: "Apple", updatedAt: 30 }),
    makeTicket({ id: 2, state: "open", phase: 1, order: 3, title: "Mango", updatedAt: 20 }),
  ];

  it("by id sorts 1..N", () => {
    const rows = humanQueue(tickets, noEvidence, [], "id");
    expect(rows.map((r) => r.ticket.id)).toEqual([1, 2, 3]);
  });

  it("by recent puts the freshest update first", () => {
    const rows = humanQueue(tickets, noEvidence, [], "recent");
    expect(rows.map((r) => r.ticket.id)).toEqual([1, 2, 3].map((n) => n));
    expect(rows.map((r) => r.ticket.updatedAt)).toEqual([30, 20, 10]);
  });

  it("by alpha sorts titles A-Z", () => {
    const rows = humanQueue(tickets, noEvidence, [], "alpha");
    expect(rows.map((r) => r.ticket.title)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("suggested keeps nominations first; an explicit key does NOT", () => {
    const nomination = {
      id: "n1",
      ticketId: 3,
      actionId: "signoff" as const,
      reason: "look here",
      at: 0,
    };
    const suggested = humanQueue(tickets, noEvidence, [nomination], "suggested");
    expect(suggested[0].ticket.id).toBe(3);
    // "by id" means by id: picking a key does what it says.
    const byId = humanQueue(tickets, noEvidence, [nomination], "id");
    expect(byId.map((r) => r.ticket.id)).toEqual([1, 2, 3]);
  });

  it("sorting returns a new array and never mutates the input", () => {
    const rows = humanQueue(tickets, noEvidence, [], "suggested");
    const before = rows.map((r) => r.ticket.id);
    sortQueue(rows, "alpha");
    expect(rows.map((r) => r.ticket.id)).toEqual(before);
  });
});

/**
 * #93 review, finding 1 (CRITICAL): the queue keyed evidence lookups and its
 * write target with a bare String(ticket.id). On a MERGED board a foreign
 * ticket is addressed `sourceSessionId:id`, so a foreign row read the wrong
 * evidence — and an action on it wrote to the own ticket with that number.
 */
describe("u93 human-queue: foreign rows on a merged board", () => {
  const foreign = {
    ...makeTicket({ id: 12, state: "awaiting_verification", title: "Foreign twelve" }),
    foreign: true,
    sourceSessionId: "session-abc",
  };
  const own = makeTicket({ id: 12, state: "open", title: "Own twelve" });

  it("a foreign entry carries the COMPOSITE board key, not the bare id", () => {
    const rows = derivedQueue([foreign], () => []);
    expect(rows[0].boardKey).toBe("session-abc:12");
  });

  it("an own entry keeps the plain id as its board key", () => {
    const rows = derivedQueue([own], () => []);
    expect(rows[0].boardKey).toBe("12");
  });

  /*
   * This drives queueEntriesFor -- the PRODUCTION lookup in queue-panel.tsx --
   * rather than a lambda the test wrote itself. The re-review correctly
   * failed the earlier version: it supplied its own boardKeyOf keyer, so it
   * passed even with the production code reverted to String(ticket.id).
   */
  it("the production lookup resolves evidence per row, so a foreign row cannot read the own row's", () => {
    const evidence = {
      // The OWN #12 has been verified; the foreign #12 has not.
      "12": [{ kind: "builtin:user_verified" }],
      "session-abc:12": [],
    } as unknown as Record<string, EvidenceRow[]>;
    const rows = queueEntriesFor([foreign] as never, evidence);
    // Reverting queue-panel to String(ticket.id) makes this read the own
    // row's user_verified and offer mark-done on a ticket with no such row.
    expect(rows.map((r) => r.actionId)).toEqual(["verify"]);
  });

  it("the production lookup still finds an OWN row's evidence", () => {
    const evidence = {
      "12": [{ kind: "builtin:user_verified" }],
    } as unknown as Record<string, EvidenceRow[]>;
    const awaitingOwn = makeTicket({ id: 12, state: "awaiting_verification" });
    const rows = queueEntriesFor([awaitingOwn] as never, evidence);
    /*
     * mark-done, not [verify, mark-done]: the queue now collapses the pair
     * once mark-done is ready. This still DISCRIMINATES the bug it guards --
     * if the lookup missed the own row's user_verified, mark-done would not
     * be available and this would read ["verify"] instead.
     */
    expect(rows.map((r) => r.actionId)).toEqual(["mark-done"]);
  });

  it("own and foreign rows with the same number are two distinct entries", () => {
    const rows = derivedQueue([own, foreign], () => []);
    expect(new Set(rows.map((r) => r.boardKey)).size).toBe(rows.length);
  });
});

/**
 * #93 THIRD review, finding 6: the headline fix of 0dd7cf1 -- removing the
 * `|| String(entry.ticket.id) === key` fallback from the nomination matcher --
 * had ZERO coverage. The reviewer re-added the fallback and all 38 tests still
 * passed. This is the guard that makes that impossible.
 */
describe("u93 human-queue: a numeric nomination never lands on a foreign row", () => {
  it("does not attach its reason to a foreign row with the same number", () => {
    const own = makeTicket({ id: 12, state: "open", title: "Own twelve" });
    const foreign = {
      ...makeTicket({ id: 12, state: "awaiting_verification", title: "Foreign twelve" }),
      foreign: true,
      sourceSessionId: "sess-abc",
    };
    const rows = humanQueue([own, foreign], () => [], [
      { id: "n1", ticketId: 12, actionId: "verify", reason: "look here", at: 0 },
    ]);
    // #12 own is `open`, so its only ask is signoff; the verify ask belongs to
    // the FOREIGN row. With the fallback restored the reason attaches there --
    // putting the agent's ask, and its write button, on the wrong ticket.
    const flagged = rows.filter((r) => r.nominationReason !== undefined);
    expect(flagged).toEqual([]);
  });

  it("still attaches to the OWN row when the action does match", () => {
    const own = makeTicket({ id: 12, state: "open", title: "Own twelve" });
    const foreign = {
      ...makeTicket({ id: 12, state: "open", title: "Foreign twelve" }),
      foreign: true,
      sourceSessionId: "sess-abc",
    };
    const rows = humanQueue([own, foreign], () => [], [
      { id: "n1", ticketId: 12, actionId: "signoff", reason: "this one", at: 0 },
    ]);
    const flagged = rows.filter((r) => r.nominationReason !== undefined);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].boardKey).toBe("12");
  });
});

/**
 * #93: a PENDING APPROVAL is an ask in its own right. Nothing surfaced these —
 * `pendingApproval` is per-ticket, so a queued card was invisible unless the
 * human already had that ticket open. Five stacked up unseen in one session.
 */
describe("u93 human-queue: pending approvals are asks", () => {
  const ticket = makeTicket({ id: 7, state: "in_progress", title: "In flight" });
  const approval = {
    id: "req-1",
    ticketId: 7,
    kind: "allowlist",
    prompt: "Approve write access for ticket #7",
    payload: { paths: ["src/host", "tests"] },
    at: 5,
  };

  it("an in_progress ticket with a pending approval enters the queue", () => {
    // Without the approval it has NO human action at all.
    expect(humanQueue([ticket], () => [])).toEqual([]);
    const rows = humanQueue([ticket], () => [], [], "suggested", [approval]);
    expect(rows).toHaveLength(1);
    expect(rows[0].approvalId).toBe("req-1");
    expect(rows[0].approvalPaths).toEqual(["src/host", "tests"]);
  });

  it("the prompt names how many paths are proposed", () => {
    const rows = humanQueue([ticket], () => [], [], "suggested", [approval]);
    expect(rows[0].prompt).toContain("2 path(s)");
  });

  it("an approval outranks a nomination, because the agent is BLOCKED on it", () => {
    const open = makeTicket({ id: 8, state: "open", title: "Waiting" });
    const rows = humanQueue(
      [open, ticket],
      () => [],
      [{ id: "n1", ticketId: 8, actionId: "signoff", reason: "please", at: 0 }],
      "suggested",
      [approval],
    );
    expect(rows[0].approvalId).toBe("req-1");
  });

  it("an approval naming a ticket not on the board is dropped", () => {
    const rows = humanQueue([ticket], () => [], [], "suggested", [
      { ...approval, id: "req-2", ticketId: 999 },
    ]);
    expect(rows.filter((r) => r.approvalId === "req-2")).toEqual([]);
  });
});

/**
 * #93: an unmatched nomination must be VISIBLE, not silently dropped.
 * A real report ("suggestions aren't working") was undiagnosable because the
 * queue dropped a nomination with no trace of why.
 */
describe("u93 human-queue: unmatched nominations are reported", () => {
  const nom = (over: Partial<Nomination> = {}): Nomination => ({
    id: "n1",
    ticketId: 1,
    actionId: "signoff",
    reason: "please",
    at: 0,
    ...over,
  });

  it("reports a nomination whose ticket is not on the board, and says so", () => {
    const rows = unmatchedNominations(
      [makeTicket({ id: 1, state: "open" })],
      noEvidence,
      [nom({ ticketId: 999 })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toContain("not on this board");
  });

  it("reports a nomination whose action is unavailable, and says which", () => {
    const rows = unmatchedNominations(
      [makeTicket({ id: 1, state: "open" })],
      noEvidence,
      [nom({ actionId: "mark-done" })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toContain("no available mark-done");
    expect(rows[0].kind).toBe("unavailable");
  });

  it("reports nothing when the nomination matches", () => {
    expect(
      unmatchedNominations([makeTicket({ id: 1, state: "open" })], noEvidence, [nom()]),
    ).toEqual([]);
  });
});

describe("u93 human-queue: a fulfilled ask is not a complaint", () => {
  const nom = (over: Partial<Nomination> = {}): Nomination => ({
    id: "n1",
    ticketId: 1,
    actionId: "signoff",
    reason: "please",
    at: 0,
    ...over,
  });

  it("signing off retires the signoff ask as FULFILLED, not unavailable", () => {
    // The exact case that produced the nagging message: the human did the
    // thing that was asked, and was told the action was unavailable.
    const rows = unmatchedNominations(
      [makeTicket({ id: 1, state: "in_progress" })],
      noEvidence,
      [nom()],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("fulfilled");
  });

  it("an ask the ticket has not REACHED yet stays unavailable, not fulfilled", () => {
    const rows = unmatchedNominations(
      [makeTicket({ id: 1, state: "open" })],
      noEvidence,
      [nom({ actionId: "mark-done" })],
    );
    expect(rows[0].kind).toBe("unavailable");
    expect(rows[0].reason).toContain("no available mark-done");
  });

  it("a ticket that reached done fulfils a verify ask", () => {
    const rows = unmatchedNominations(
      [makeTicket({ id: 1, state: "done" })],
      noEvidence,
      [nom({ actionId: "verify" })],
    );
    expect(rows[0].kind).toBe("fulfilled");
  });
});

describe("#93 the queue collapses each row to a coloured action icon", () => {
  /*
   * The user's design, and it DISSOLVES the alignment problem rather than
   * solving it. Five attempts failed to align an inline button row because a
   * row's action set VARIES -- one action or two, a Dismiss or none -- so
   * any fixed layout either reserved dead space (the gap beside "Sign off")
   * or went ragged.
   *
   * With nothing inline there is nothing to align until a row is opened, and
   * an opened row is alone. It also gives the title and the agent's reason
   * back the width the buttons were taking, which was the other half of the
   * report.
   */
  const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
  const strip = readFileSync(
    new URL("../src/client/ticket-strip.tsx", import.meta.url),
    "utf8",
  );
  const panel = readFileSync(
    new URL("../src/client/queue-panel.tsx", import.meta.url),
    "utf8",
  );

  function rule(selector: string): string {
    const at = css.indexOf(selector);
    expect(at, selector).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf("}", at));
  }

  it("renders no inline action buttons while collapsed", () => {
    // The actions render ONLY on the revealed row, so a collapsed queue is a
    // clean column of one-line rows with nothing to misalign.
    expect(strip).toContain("props.expanded === true && props.actions !== undefined");
    expect(strip).not.toContain("aidos-ticket-strip-action-group");
  });

  it("shows a toggle icon that says what the ask is", () => {
    expect(strip).toContain("aidos-strip-action-toggle");
    expect(strip).toContain("props.actionHint");
    // The hint is both the tooltip AND the accessible name: an icon that
    // only explains itself on hover excludes anyone who cannot hover.
    expect(strip).toContain("aria-label={props.actionHint");
  });

  it("gives each action its own icon and meaning", () => {
    for (const key of ["signoff", "verify", "mark-done", "allowlist"]) {
      expect(panel, key).toContain(`${key.includes("-") ? '"' + key + '"' : key}:`);
    }
    expect(panel).toContain("SignoffIcon");
    expect(panel).toContain("VerifyIcon");
    expect(panel).toContain("MarkDoneIcon");
    expect(panel).toContain("AllowlistIcon");
  });

  it("colours the icon by the state the action leads TO", () => {
    expect(css).toContain("--tone: var(--state-in-progress)");
    expect(css).toContain("--tone: var(--state-awaiting)");
    expect(css).toContain("--tone: var(--state-done)");
  });

  it("an open toggle reads as SELECTED, not merely hovered", () => {
    /*
     * The revealed row belongs to that icon, so the icon must keep saying so
     * once the pointer moves down to the buttons. The old design filled the
     * button box white; the toggle is a bare ICON now (user: "these should
     * be icons not buttons"), so selection is a tone ring instead.
     *
     * The property that matters is that open DIFFERS from hover -- a
     * selected state that looks like a hover is not a state.
     */
    const open = rule(".aidos-strip-action-toggle.is-open {");
    const hover = rule(".aidos-strip-action-toggle:hover:not(:disabled) {");
    expect(open).toContain("box-shadow: inset 0 0 0 1px var(--tone)");
    expect(hover).not.toContain("box-shadow");
    expect(open).not.toEqual(hover);
  });

  it("the toggle is an icon, not a button box", () => {
    // A filled box makes the collapsed marker look like the action itself,
    // which is the thing that now lives on the revealed row.
    const toggle = rule(".aidos-strip-action-toggle {");
    expect(toggle).toContain("border: 0");
    expect(toggle).toContain("background: none");
  });

  it("opens ONE row at a time", () => {
    // The queue is a list to work through, not a dashboard to leave sprawled.
    expect(panel).toContain("setOpenRow(openRow === id ? null : id)");
  });

  it("reveals the actions on a second row beneath", () => {
    expect(strip).toContain("aidos-ticket-strip-actionrow");
    const row = rule(".aidos-ticket-strip-actionrow {");
    expect(row).toContain("justify-content: flex-end");
  });

  it("shows the state CENTERED under the id chip and in parens", () => {
    /*
     * The user's design. Two separate problems with the plain coloured
     * text: left-aligned it sat under the chip's first letter and read as a
     * caption that had slipped, and with no chip border "thursday#2 Open"
     * scans as a two-word name. Parens restore a boundary at no visual
     * weight, which is the point of taking it out of a chip.
     */
    expect(strip).toContain("({stateLabel(ticket.state)})");
    // The tooltip keeps the BARE label: "(Open)" quotes the punctuation
    // rather than naming the state.
    expect(strip).toContain("title={stateLabel(ticket.state)}");
    const idcol = rule(".aidos-ticket-strip-idcol {");
    expect(idcol).toContain("align-items: center");
  });

  it("the strip is a COLUMN, so the revealed row lands below and not beside", () => {
    /*
     * The reported bug: clicking the icon appeared to do nothing. The state
     * was updating and the element was in the DOM the whole time -- the
     * strip was a flex ROW, so the action row rendered as a second COLUMN
     * beside the content and was squeezed to nothing by `-main`'s `flex: 1`.
     *
     * The two rules must agree: wrapper column, content row.
     */
    const wrapper = rule(".aidos-ticket-strip {");
    expect(wrapper).toContain("flex-direction: column");
    const main = rule(".aidos-ticket-strip-main {");
    expect(main).toContain("display: flex");
    expect(main).not.toContain("flex-direction: column");
  });
});

describe("#93 the state reads as text, and badges are one size", () => {
  const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
  const strip = readFileSync(
    new URL("../src/client/ticket-strip.tsx", import.meta.url),
    "utf8",
  );

  it("puts the state under the id as coloured text", () => {
    /*
     * A state is a PROPERTY of the ticket, not an ask. As a badge it carried
     * the same weight as the things needing attention; as text it still
     * reads instantly by colour while giving back horizontal space.
     */
    expect(strip).toContain("aidos-ticket-strip-idcol");
    expect(strip).toContain("aidos-ticket-strip-state");
    const state = css.slice(css.indexOf(".aidos-ticket-strip-state {"));
    expect(state.slice(0, state.indexOf("}"))).toContain("background: none");
  });

  it("keeps a distinct colour per state", () => {
    for (const cls of [
      ".aidos-ticket-strip-state.aidos-chip-state-open",
      ".aidos-ticket-strip-state.aidos-chip-state-in-progress",
      ".aidos-ticket-strip-state.aidos-chip-state-awaiting-verification",
      ".aidos-ticket-strip-state.aidos-chip-state-done",
    ]) {
      expect(css, cls).toContain(cls);
    }
  });

  it("does NOT render the state twice", () => {
    // It moved out of the chip row; leaving both would be worse than either.
    const chips = strip.slice(strip.indexOf("aidos-ticket-strip-chips"));
    expect(chips.slice(0, chips.indexOf("aidos-ticket-strip-actions"))).not.toContain(
      "badgeClass(ticket.state)",
    );
  });

  it("sizes every chip in the modal consistently", () => {
    // Chips inherited slightly different heights from their variants, so a
    // row read as ragged even when it was aligned.
    const sized = css.slice(css.indexOf(".aidos-queue .aidos-chip {"));
    expect(sized.slice(0, sized.indexOf("}"))).toContain("height: 20px");
  });
});
