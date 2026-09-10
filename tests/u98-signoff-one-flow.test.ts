/**
 * #98 + #123 + #170: ONE FLOW PER USER ACTION.
 *
 * The bug this pins, in the owner's words after testing two builds: "still
 * no signoff-carries-allowlist". #98 was implemented, landed and green --
 * in the QUEUE. The detail panel's Sign off button ran a different
 * implementation that attached a note and moved the ticket, with no
 * allowlist step at all, so the feature was true from one entry point and
 * false from the other. #123 was the identical failure on verify, reported
 * the same way, fixed the same way, and did not generalise.
 *
 * #170 is the generalisation: EVERY user-facing board action has exactly
 * one implementation, audited all at once because the copies drift and the
 * drift reads as "you said you fixed this and you didn't":
 *
 *   signoff   signoff-dialog.tsx (the queue opens the same dialog)
 *   verify    evidence-attach.tsx's VerifyModal (mark-done routes INTO it)
 *   mark-done mark-done-modal.tsx (the queue opens the same modal; the bare
 *             queue move is deleted, and the modal's own empty-payload
 *             verified row is deleted -- verify has one meaning)
 *   approval  approval-resolution.ts (card and queue both call it)
 *   grant     host userGrantAllowlist (resolveApproval CALLS it; the
 *             editor and the evidence form route through it; no client
 *             userSetTicket allowlist write remains)
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
  // #170: the audit widened to every surface that names a board write.
  // approval-resolution.ts is the OWNER of resolveApproval (its one
  // occurrence is the implementation, not a duplicate); approval-runner,
  // action-bar, field-editor and create-ticket-modal are pinned clean.
  ["approval-resolution.ts", read("approval-resolution.ts")],
  ["approval-runner.tsx", read("approval-runner.tsx")],
  ["action-bar.tsx", read("action-bar.tsx")],
  ["field-editor.tsx", read("field-editor.tsx")],
  ["create-ticket-modal.tsx", read("create-ticket-modal.tsx")],
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
     * #170: the grant ENTRY POINTS, not the implementation. The
     * implementation is host-side userGrantAllowlist (one path: validate,
     * attach, merge); these are the client surfaces allowed to reach it,
     * each for a different act -- signoff carries paths, the editor grants
     * on an in-progress ticket, the evidence form's file_allowlist branch
     * grants instead of attaching a bare row. A FOURTH file naming the
     * remote is a new grant path and fails here.
     *
     * (SURFACES order, not alpha: the filter preserves it.)
     */
    const granting = SURFACES.filter(([, text]) =>
      text.includes('"userGrantAllowlist"'),
    ).map(([name]) => name);
    expect(granting).toEqual([
      "signoff-dialog.tsx",
      "evidence-attach.tsx",
      "allowlist-editor.tsx",
    ]);
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
  it("only the shared verify modal attaches a user_verified row", () => {
    /*
     * #170 DECIDED (grilled 2026-09-09, verify half): mark done is GATED
     * by the verified row -- neither old behaviour survives. The modal's
     * empty-payload attach is deleted (it gave one kind two meanings) and
     * the queue's bare move gained the same gate by opening the same
     * modal, so VerifyModal is the only writer and this list has ONE
     * entry. A second entry is a new meaning for verification.
     */
    expect(filesAttaching("builtin:user_verified")).toEqual([
      "evidence-attach.tsx",
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

/**
 * #108: RETIREMENT HAS ONE WRITE IMPLEMENTATION, and the rule that produced
 * this file is why. Retiring from the ticket and un-retiring from the panel
 * are two entry points to the SAME host remotes (`userRetireTicket`,
 * `userUnretireTicket`) — which validate the supersede references, run the
 * dependent gate, and detach by the row's own stamp. A surface that attached
 * or detached a `builtin:retired` row directly would bypass all of that, and
 * the board would carry a retirement with no reason, no dependent check, and
 * possibly a dangling supersede.
 *
 * The permitted shape, pinned here:
 *  - retired-panel.tsx is the ONLY module that CALLS either remote;
 *  - detail-panel.tsx opens the shared RetireDialog (it does not call);
 *  - the queue and the evidence-attach form write nothing of the kind;
 *  - the panel renders rows through the SHARED TicketStrip (#93), never a
 *    second ticket-row implementation.
 */
describe("#108 retirement has ONE implementation, reached from two places", () => {
  const retiredPanel = read("retired-panel.tsx");

  it("only the retired panel calls the retire and un-retire remotes", () => {
    const calling = SURFACES.filter(
      ([, text]) =>
        text.includes('"userRetireTicket"') || text.includes('"userUnretireTicket"'),
    ).map(([name]) => name);
    // The panel file itself is not in SURFACES; assert the known surfaces
    // are clean AND the panel is the one module that calls.
    expect(calling).toEqual([]);
    expect(retiredPanel).toContain('"userRetireTicket"');
    expect(retiredPanel).toContain('"userUnretireTicket"');
  });

  it("no client module attaches or detaches a retirement row directly", () => {
    // Matched on the WRITE argument, not on mentions: board-logic and
    // human-queue legitimately NAME the kind to filter it out.
    const writing = SURFACES.filter(
      ([, text]) =>
        text.includes('kind: "builtin:retired"') ||
        text.includes('"userDetachEvidence"'),
    ).map(([name]) => name);
    // The detail panel's own evidence delete is the one legitimate
    // userDetachEvidence caller (it deletes whatever row the human points
    // at, including a retirement row — the same act, by another road, on a
    // row the human is looking at). Everything else writes nothing.
    expect(writing).toEqual(["detail-panel.tsx"]);
  });

  it("the detail panel opens the shared dialog and implements nothing", () => {
    const detail = read("detail-panel.tsx");
    expect(detail).toContain("<RetireDialog");
    expect(detail).not.toContain('"userRetireTicket"');
    expect(retiredPanel).toContain("export function RetireDialog");
  });

  it("the queue grows no retirement surface of its own", () => {
    expect(queuePanel).not.toContain("builtin:retired");
    expect(queuePanel).not.toContain("userRetireTicket");
    expect(queuePanel).not.toContain("userUnretireTicket");
  });

  it("the panel renders rows through the SHARED TicketStrip", () => {
    expect(retiredPanel).toContain("<TicketStrip");
  });
});

/**
 * #170: MARK DONE HAS ONE IMPLEMENTATION, AND IT IS GATED.
 *
 * Was two: the modal attached an empty-payload user_verified row and moved,
 * while the queue's performQueueAction moved bare. Same label, different
 * consequence -- and the grilled decision keeps NEITHER: mark done is gated
 * on the verified row, the modal never writes the kind, and the queue opens
 * the same modal. The gate teaches (routes into the verify flow) rather
 * than just refusing, and the override is an explicit force, never a bare
 * confirm that secretly forces.
 */
describe("#170 mark done does the same thing from every entry point", () => {
  const markDone = read("mark-done-modal.tsx");

  it("only the mark-done modal moves a ticket to done", () => {
    const movers = SURFACES.filter(([, text]) =>
      text.includes('to: "done"'),
    ).map(([name]) => name);
    expect(movers).toEqual(["mark-done-modal.tsx"]);
  });

  it("every other move is named too, so a new destination fails loudly", () => {
    // signoff and send-back both land in_progress through DIFFERENT gates
    // (different actions, different states); submit-for-review lands
    // awaiting_verification. Each pair below is the complete writer list
    // for that destination.
    const to = (dest: string): string[] =>
      SURFACES.filter(([, text]) => text.includes(`to: "${dest}"`)).map(
        ([name]) => name,
      );
    expect(to("in_progress")).toEqual([
      "signoff-dialog.tsx",
      "send-back-modal.tsx",
    ]);
    expect(to("awaiting_verification")).toEqual(["detail-panel.tsx"]);
  });

  it("the queue opens that modal rather than moving", () => {
    expect(queuePanel).toContain("<MarkDoneModal");
    expect(queuePanel).toMatch(/running\.actionId === "mark-done"/);
    expect(localTicketView).not.toContain('to: "done"');
    expect(localTicketView).not.toContain('"userMoveTicket", { ticketId');
  });

  it("the modal never attaches a user_verified row", () => {
    // Verify keeps one meaning: only VerifyModal writes the kind.
    expect(markDone).not.toContain('kind: "builtin:user_verified"');
  });

  it("the gate is an explicit verify|force choice, never a bare confirm", () => {
    // promptToVerify starts null (no silent force) and leaves null only by
    // an explicit click; verify routes into the shared flow, force moves
    // with no row and says so on its button.
    expect(markDone).toContain('export type PromptToVerify = "verify" | "force"');
    expect(markDone).toContain("useState<PromptToVerify | null>(null)");
    expect(markDone).toContain('setPromptToVerify("verify")');
    expect(markDone).toContain('setPromptToVerify("force")');
    expect(markDone).toContain("<VerifyModal");
    expect(markDone).toContain("Force mark done");
  });
});

/**
 * #170: APPROVAL RESOLUTION HAS ONE IMPLEMENTATION.
 *
 * Was two: allowlist-request-card.tsx and local-ticket-view.tsx both called
 * resolveApproval with their own surrounding logic. Both now call
 * approval-resolution.ts, which owns the remote, the toasts and the refusal
 * handling; the callers only refresh. Host-side, resolveApproval itself
 * became a CALLER of userGrantAllowlist rather than a second merge, with
 * the #112-round-2 coverage filter preserved inside the one merge.
 */
describe("#170 approval resolution is shared by the card and the queue", () => {
  it("only the shared module names the resolveApproval remote", () => {
    const calling = SURFACES.filter(([, text]) =>
      text.includes('"resolveApproval"'),
    ).map(([name]) => name);
    expect(calling).toEqual(["approval-resolution.ts"]);
  });

  it("the card and the queue route through it and implement nothing", () => {
    const card = read("allowlist-request-card.tsx");
    expect(card).toContain('from "./approval-resolution"');
    expect(card).toContain("resolveApprovalRequest(");
    expect(localTicketView).toContain('from "./approval-resolution"');
    expect(localTicketView).toContain("resolveApprovalRequest(");
  });
});

/**
 * #170: ALLOWLIST GRANTING HAS ONE PATH, AND IT MERGES.
 *
 * Was three: host userGrantAllowlist, host resolveApproval with its own
 * merge, and allowlist-editor.tsx attaching the row + writing the field
 * through userSetTicket -- where the field write REPLACED rather than
 * merged, the replace-not-merge split that caused #112's silent data loss.
 * Now resolveApproval calls userGrantAllowlist, the editor grants through
 * it, the evidence form's file_allowlist branch grants through it, and the
 * client's direct field write is deleted, not deprecated.
 */
describe("#170 the allowlist field is never written directly from the client", () => {
  it("no client module attaches a file_allowlist row itself", () => {
    // Every grant lands through the userGrantAllowlist remote (owned
    // host-side); a bare row without the field write grants nothing, which
    // would be a second shape of grant beside the merged one.
    expect(filesAttaching("builtin:file_allowlist")).toEqual([]);
  });

  it("the two deleted userSetTicket call sites stay deleted", () => {
    // These are the exact writes #112 burned on: the editor's replace and
    // the evidence form's row-without-field. Either coming back fails here.
    expect(read("allowlist-editor.tsx")).not.toContain('"userSetTicket"');
    expect(read("allowlist-editor.tsx")).not.toContain("allowlist: paths");
    expect(evidenceAttach).not.toContain('"userSetTicket"');
  });

  it("the remaining userSetTicket callers are the legitimate set", () => {
    // field-editor (type-closed: EditableField has no allowlist member),
    // create-ticket-modal (title/description on a new ticket, which cannot
    // carry an allowlist by host rule), detail-panel
    // (description/criteria/dependsOn). A fourth caller fails here.
    const setting = SURFACES.filter(([, text]) =>
      text.includes('"userSetTicket"'),
    ).map(([name]) => name);
    expect(setting).toEqual([
      "detail-panel.tsx",
      "field-editor.tsx",
      "create-ticket-modal.tsx",
    ]);
  });

  it("the generic field editor cannot address the allowlist by construction", () => {
    // The EditableField union names every field the editor can write. If
    // "allowlist" ever joins it, this fails -- the replace path would be
    // back behind a generic input.
    const fieldEditor = read("field-editor.tsx");
    expect(fieldEditor).not.toContain("allowlist");
  });

  it("the detail panel's three field writes stay allowlist-free", () => {
    // Description, criteria, dependency edges -- none of them the boundary.
    // Counted, not just scanned: a fourth userSetTicket call (the shape a
    // re-added direct grant would take) fails even without the word.
    const detail = read("detail-panel.tsx");
    expect(detail.match(/"userSetTicket"/g)).toHaveLength(3);
    expect(detail).not.toContain("allowlist: paths");
  });
});

/**
 * #170: the listed exceptions -- similar-looking writes that are DIFFERENT
 * acts, named with their reasons rather than excluded silently.
 */
describe("#170 exceptions, listed with reasons", () => {
  it("userAddComment from the ticket and from mark-done are different acts", () => {
    // comments-section.tsx posts standalone discussion; mark-done-modal's
    // final comment rides the close the way signoff's note rides the
    // signoff row. Same remote, different acts -- not two implementations
    // of one action.
    expect(read("mark-done-modal.tsx")).toContain('"userAddComment"');
  });

  it("the approval runner performs no write of its own", () => {
    // It collects and returns; the caller decides. A write remote here
    // would make the runner a competing implementation of every flow it
    // serves, which is exactly what the queue-panel branches above exist
    // to prevent.
    const runner = read("approval-runner.tsx");
    expect(runner).not.toContain('"userAttachEvidence"');
    expect(runner).not.toContain('"userMoveTicket"');
    expect(runner).not.toContain('"resolveApproval"');
    expect(runner).not.toContain('"userGrantAllowlist"');
    expect(runner).not.toContain('"userSetTicket"');
  });
});
