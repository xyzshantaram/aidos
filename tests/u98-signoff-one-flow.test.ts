/**
 * #98 + #123: ONE FLOW PER USER ACTION.
 *
 * The bug this pins, in the owner's words after testing two builds: "still
 * no signoff-carries-allowlist". #98 was implemented, landed and green --
 * in the QUEUE. The detail panel's Sign off button ran a different
 * implementation that attached a note and moved the ticket, with no
 * allowlist step at all, so the feature was true from one entry point and
 * false from the other. #123 was the identical failure on verify, reported
 * the same way, fixed the same way, and did not generalise.
 *
 * There were FOUR implementations of "sign off" in the client at the point
 * this test was written:
 *
 *   1. signoff-dialog.tsx     -- attach + move (no allowlist)
 *   2. queue-panel.tsx        -- a two-step runner that collected paths
 *   3. local-ticket-view.tsx  -- the writes behind that runner, incl. grant
 *   4. evidence-attach.tsx    -- the generic form, which offers the
 *                                human-only kinds and can attach a
 *                                user_signoff ROW with no move and no files
 *
 * Copies 2 and 3 are gone: the queue opens the same SignoffDialog the
 * detail panel opens. Copy 4 is a DIFFERENT act (attach a bare row) and is
 * covered by its own finding rather than by this file.
 *
 * WHY SOURCE ASSERTIONS. The rule is about call-site UNIQUENESS -- "there
 * is exactly one place that writes this" -- which is a property of the
 * codebase, not of a value any function returns. A behavioural test cannot
 * see a second implementation; that is precisely how three of them
 * survived. Each assertion below is mutation-tested by re-adding the write
 * it forbids.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const CLIENT = new URL("../src/client/", import.meta.url).pathname;

const read = (name: string): string => readFileSync(CLIENT + name, "utf8");

const signoffDialog = read("signoff-dialog.tsx");
const queuePanel = read("queue-panel.tsx");
const localTicketView = read("local-ticket-view.tsx");
const evidenceAttach = read("evidence-attach.tsx");
const markDoneModal = read("mark-done-modal.tsx");

/** Every client module that could plausibly hold a duplicate. */
const SURFACES: ReadonlyArray<[string, string]> = [
  ["signoff-dialog.tsx", signoffDialog],
  ["queue-panel.tsx", queuePanel],
  ["local-ticket-view.tsx", localTicketView],
  ["evidence-attach.tsx", evidenceAttach],
  ["mark-done-modal.tsx", markDoneModal],
  ["detail-panel.tsx", read("detail-panel.tsx")],
  ["allowlist-editor.tsx", read("allowlist-editor.tsx")],
  ["send-back-modal.tsx", read("send-back-modal.tsx")],
  ["allowlist-request-card.tsx", read("allowlist-request-card.tsx")],
  ["inline-actions.tsx", read("inline-actions.tsx")],
];

const inlineActions = read("inline-actions.tsx");

/**
 * The files that WRITE one evidence kind, named rather than counted.
 *
 * Matched on the attach argument (`kind: "builtin:..."`), not on any
 * mention: a module may legitimately NAME a kind to filter it out of a
 * list, to colour a chip, or to ask whether it is present. Counting
 * mentions would flag `evidence-attach.tsx`'s filter -- which is the line
 * that KEEPS the generic form from offering signoff and verify, i.e. the
 * opposite of a duplicate -- and a test that cries wolf gets deleted.
 */
function filesAttaching(kind: string): string[] {
  return SURFACES.filter(([, text]) => text.includes(`kind: "${kind}"`)).map(
    ([name]) => name,
  );
}

describe("#98 signoff has ONE implementation", () => {
  it("only the signoff dialog attaches a user_signoff row", () => {
    expect(filesAttaching("builtin:user_signoff")).toEqual(["signoff-dialog.tsx"]);
  });

  it("only the signoff dialog grants the allowlist that signoff carries", () => {
    /*
     * The half that kept going missing. A grant living anywhere else is a
     * second answer to "what does signing off give the agent", and the
     * board has already been burned by two answers to one question (#112:
     * an approval REPLACED the allowlist while an evidence row said
     * otherwise).
     */
    const granting = SURFACES.filter(([, text]) =>
      text.includes('"userGrantAllowlist"'),
    ).map(([name]) => name);
    expect(granting).toEqual(["signoff-dialog.tsx"]);
  });

  it("the queue holds no signoff write of its own", () => {
    // It opens the dialog instead; these are the two writes it used to do.
    expect(queuePanel).not.toContain("builtin:user_signoff");
    expect(localTicketView).not.toContain("builtin:user_signoff");
    expect(localTicketView).not.toContain("userGrantAllowlist");
  });

  it("signs off in the order the gate requires, with the grant in the middle", () => {
    /*
     * attach -> grant -> move. The gate needs the row BEFORE the move, and
     * the grant must land before the move too: an agent that reaches
     * in_progress with an empty union is refused every write, which is the
     * exact round-trip #98 exists to remove.
     */
    const attach = signoffDialog.indexOf('"userAttachEvidence"');
    const grant = signoffDialog.indexOf('"userGrantAllowlist"');
    const move = signoffDialog.indexOf('"userMoveTicket"');
    expect(attach).toBeGreaterThan(-1);
    expect(grant).toBeGreaterThan(attach);
    expect(move).toBeGreaterThan(grant);
  });

  it("offers the paths pre-filled, and lets them be left empty", () => {
    // "Sign off now, scope the files later" stays available: the point was
    // to remove a forced round-trip, not to make the allowlist mandatory.
    expect(signoffDialog).toContain("proposedPaths");
    expect(signoffDialog).toContain("if (paths.length > 0)");
    expect(queuePanel).toContain("proposedPaths={");
  });
});

describe("#123 verify has ONE implementation, and the queue reuses it", () => {
  it("names every place that attaches a user_verified row", () => {
    /*
     * TWO, and the second is a FINDING this audit surfaced rather than a
     * blessing: `mark-done-modal.tsx` attaches a `user_verified` row of its
     * own, with an empty payload -- no note, no criterion link, no
     * screenshot. So "verify" means one thing from the Verify button and a
     * quieter thing from Mark done, which is the same divergence #123 was
     * filed for, one surface along.
     *
     * It is listed rather than forbidden because collapsing it changes what
     * Mark done DOES (it would have to open the verify flow, or stop
     * attesting at all), and that is the owner's call, not a refactor to
     * slip into a bug fix. The test's job is to make sure the list does not
     * grow a third entry while that decision is pending.
     */
    expect(filesAttaching("builtin:user_verified")).toEqual([
      "evidence-attach.tsx",
      "mark-done-modal.tsx",
    ]);
  });

  it("the queue opens that modal rather than a lookalike step", () => {
    expect(queuePanel).toContain("<VerifyModal");
    expect(queuePanel).toContain("<SignoffDialog");
  });
});

/**
 * The inline tool-call actions (user, 2026-09-08) are a THIRD ENTRY POINT
 * to the same flows, which is precisely the shape that has now cost four
 * rounds. They are safe only because they launch and never write.
 */
describe("inline chat actions launch the board's flows and implement none", () => {
  it("performs no board write of its own", () => {
    /*
     * The load-bearing assertion of the whole feature. A write remote here
     * would make chat a competing implementation of signoff/verify/approve
     * -- the exact way "signoff carries the allowlist" became true in one
     * place and false in another.
     *
     * #177: matched on the WRITE remotes BY NAME, not on every remote call.
     * The first cut forbade `callAidosRemote(` outright, which was the right
     * rule for writes and too strong for reads: a tool card is a receipt
     * for arguments the agent gave hours ago, so it must ASK the board
     * whether its action still applies (via the `workspaceTickets` READ and
     * the shared `actionsFor`) before opening a flow -- otherwise a stale
     * Sign off writes a duplicate user_signoff row and only then discovers
     * the move is refused. Forbidding all remotes would force the choice
     * between deleting this guard and leaving that bug; naming the writes
     * keeps the guard AND lets the legitimate read land.
     */
    // Matched on QUOTED names, not on mentions: the header names these
    // remotes to explain why it must not call them, and a test that cannot
    // tell prose from code cries wolf and gets deleted.
    expect(inlineActions).not.toContain('"userAttachEvidence"');
    expect(inlineActions).not.toContain('"userMoveTicket"');
    expect(inlineActions).not.toContain('"resolveApproval"');
    expect(inlineActions).not.toContain('"userGrantAllowlist"');
  });

  it("asks the board before it acts, through the board's own decider", () => {
    /*
     * #177: the READ half of the rule above. The card resolves its ticket
     * from the board and checks availability with the SAME `actionsFor`
     * the action bar and the queue derive from, so card and queue agree by
     * construction rather than by coincidence -- and the refusal path
     * writes nothing, because no write remote is reachable from this file.
     */
    expect(inlineActions).toContain('"workspaceTickets"');
    expect(inlineActions).toContain("actionsFor");
  });

  it("opens the SAME components the board opens", () => {
    expect(inlineActions).toContain("<SignoffDialog");
    expect(inlineActions).toContain("<VerifyModal");
    expect(inlineActions).toContain("<AllowlistRequestCard");
  });

  it("refuses to grow a mark-done modal it cannot honestly show", () => {
    /*
     * MarkDoneModal needs the ticket row and its evidence to show what is
     * being closed; a tool card has neither. The alternative -- a bare move
     * from the chat card -- would be the third implementation. Opening the
     * ticket is the honest answer, and this pins it.
     */
    expect(inlineActions).toContain('"mark-done": "Open on board"');
    expect(inlineActions).toContain("setSelection(props.sessionId, props.boardKey)");
    expect(inlineActions).not.toContain("<MarkDoneModal");
  });

  it("addresses tickets by BOARD KEY, not by a bare id", () => {
    // #93: a bare number makes a foreign ticket resolve to the caller's own
    // row with that id, so an action in chat would write to the wrong board.
    expect(inlineActions).toContain("boardKey");
    expect(inlineActions).not.toContain("ticketId: props.ticketId");
  });
});
