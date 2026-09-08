/**
 * #100: reading a ticket must survive a board refresh.
 *
 * The detail panel was PURELY derived -- `selectedTicket` was re-resolved on
 * every render, and the instant that lookup missed, the panel unmounted and
 * the reader was back at the grid. The merge re-pulls after ANY board write,
 * including someone else's, so it fired on other people's actions and felt
 * random.
 *
 * It also took every modal with it: the evidence viewer, the allowlist
 * editor, the signoff dialog and the mark-done modal all render INSIDE the
 * detail panel, so a background refresh could vanish a dialog the user was
 * typing into. One fix covers all of them, which is why these tests are
 * about the RESOLUTION rather than about any one modal.
 */

import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { asBoardKey, boardKeyOf, fullTicketId, resolveSelection } from "../src/client/board-logic";
import {
  clearDetailModals,
  getHeldTicket,
  getRunningApproval,
  getSelection,
  getViewedEvidence,
  holdInput,
  isDetailModalOpen,
  recordResolution,
  __resetModalsForTests,
  anyModalOpen,
  isModalOpen,
  reportCount,
  setCountCallback,
  setDetailModalOpen,
  setModalOpen,
  setHeldTicket,
  setRemountSuppressed,
  setRunningApproval,
  setSelection,
  setViewedEvidence,
} from "../src/client/view-state";

interface Row {
  id: number;
  workspaceKey: string;
  slug: string;
  foreign?: boolean;
  sourceSessionId?: string;
}

const WS = "--home-sid-repos-aidos--";

function own(id: number, slug: string): Row {
  return { id, workspaceKey: WS, slug, foreign: false, sourceSessionId: "sess-mine" };
}

function foreign(id: number, slug: string, session: string): Row {
  return { id, workspaceKey: WS, slug, foreign: true, sourceSessionId: session };
}

describe("#100 the detail panel survives a board refresh", () => {
  it("resolves normally when the row is present", () => {
    const row = own(12, "a-ticket");
    const out = resolveSelection([row], boardKeyOf(row), null);
    expect(out.ticket).toBe(row);
    expect(out.reason).toBe("resolved");
    expect(out.reanchorKey).toBeNull();
  });

  it("HOLDS the ticket when a pull transiently omits the selected row", () => {
    /*
     * THE regression this ticket is about. A merge re-pull briefly produces a
     * board without the row; the old code read that as "the ticket is gone"
     * and closed the panel.
     */
    const row = own(12, "a-ticket");
    const out = resolveSelection([], boardKeyOf(row), row);
    expect(out.ticket).toBe(row);
    expect(out.reason).toBe("held");
  });

  it("holds a FOREIGN row through a re-pull, which is the common case", () => {
    // The report came from viewing a foreign ticket: foreign rows come from
    // the merge, so a re-pull is exactly when they vanish.
    const row = foreign(12, "a-ticket", "sess-other");
    const out = resolveSelection([], boardKeyOf(row), row);
    expect(out.ticket).toBe(row);
    expect(out.reason).toBe("held");
  });

  it("HOLDS even when no pull is in flight, and says the row is absent", () => {
    /*
     * THE CORRECTED CONTRACT, and the reason the first fix did not work.
     *
     * That fix held only while a pull was in flight. But the merge pull
     * clears its in-flight flag BEFORE it triggers the re-render, so on
     * exactly the render that lands the new board the flag is already
     * false -- the hold never covered the render that ejected the reader,
     * and the user reported the bug still happening.
     *
     * There is no trustworthy "the board is complete" signal, so the panel
     * no longer pretends to have one. A selection ends when the USER ends
     * it; an absent row is REPORTED, not acted on.
     */
    const row = own(12, "a-ticket");
    const out = resolveSelection([], boardKeyOf(row), row);
    expect(out.ticket).toBe(row);
    expect(out.reason).toBe("held");
    expect(out.absent).toBe(true);
  });

  it("the USER closing it is the only thing that closes it", () => {
    const row = own(12, "a-ticket");
    const out = resolveSelection([row], null, row);
    expect(out.ticket).toBeNull();
    expect(out.reason).toBe("none");
  });
});

describe("#100 a row whose board key changes keeps the panel open", () => {
  it("re-anchors on the durable identity when foreign becomes own", () => {
    /*
     * A row's board key flips when its owning session loads: it goes from
     * `sess-other:12` to plain `12`. The selection then matches nothing and
     * the panel closed -- even though it is the SAME ticket.
     */
    const before = foreign(12, "a-ticket", "sess-other");
    const after = own(12, "a-ticket");
    const out = resolveSelection([after], boardKeyOf(before), before);
    expect(out.ticket).toBe(after);
    expect(out.reason).toBe("reanchored");
    expect(out.reanchorKey).toBe(boardKeyOf(after));
  });

  it("re-anchors the other way too, own becoming foreign", () => {
    const before = own(12, "a-ticket");
    const after = foreign(12, "a-ticket", "sess-other");
    const out = resolveSelection([after], boardKeyOf(before), before);
    expect(out.ticket).toBe(after);
    expect(out.reanchorKey).toBe(boardKeyOf(after));
  });

  it("re-anchors even mid-pull: identity beats the hold", () => {
    // If the ticket IS on the board under a new key, holding a stale copy
    // would show outdated data. The found row wins.
    const before = foreign(12, "a-ticket", "sess-other");
    const after = own(12, "a-ticket");
    const out = resolveSelection([after], boardKeyOf(before), before);
    expect(out.reason).toBe("reanchored");
    expect(out.ticket).toBe(after);
  });

  it("does NOT re-anchor by numeric id", () => {
    /*
     * The single most important negative test in this file. Matching by id
     * is the confusion behind ELEVEN wrong-ticket bugs in this codebase. Two
     * tickets can share the number 12 across sessions, so an id match would
     * silently swap the reader onto a DIFFERENT ticket -- worse than closing
     * the panel, because it looks like it worked.
     */
    const before = foreign(12, "my-ticket", "sess-other");
    const impostor = own(12, "a-completely-different-ticket");
    const out = resolveSelection([impostor], boardKeyOf(before), before);
    // Held (the reader keeps their place), and crucially NOT swapped onto
    // the impostor -- which is the failure this test exists to prevent.
    expect(out.ticket).toBe(before);
    expect(out.ticket).not.toBe(impostor);
    expect(out.absent).toBe(true);
  });

  it("does not RE-ANCHOR across workspaces on a shared slug", () => {
    // The identity is workspaceKey:slug, not slug alone. Keys are made to
    // differ here so the re-anchor path is the one under test.
    const before = foreign(12, "same-slug", "sess-other");
    const elsewhere: Row = {
      id: 12,
      workspaceKey: "--srv-elsewhere--",
      slug: "same-slug",
      foreign: false,
    };
    const out = resolveSelection([elsewhere], boardKeyOf(before), before);
    expect(out.ticket).toBe(before);
    expect(out.ticket).not.toBe(elsewhere);
  });

  it("documents the KNOWN GAP: a board key is not workspace-qualified", () => {
    /*
     * Written expecting a null and it returned the other workspace's row --
     * a real finding, but NOT a defect in this resolver. Two own-rows with
     * the same numeric id collide on the BOARD KEY itself (`boardKeyOf`
     * yields "12" for both), so the lookup succeeds at step 1 and the
     * identity check is never consulted.
     *
     * That is #45: ticket ids are not workspace-unique, and the board key
     * carries no workspace. Recording it as an executable statement of the
     * current behaviour rather than deleting the case or weakening the
     * assertion -- when #45 lands, this test should FAIL and be rewritten to
     * expect null, which makes it a tripwire rather than a rug.
     */
    const before: Row = { id: 12, workspaceKey: WS, slug: "same-slug", foreign: false };
    const elsewhere: Row = {
      id: 12,
      workspaceKey: "--srv-elsewhere--",
      slug: "same-slug",
      foreign: false,
    };
    const out = resolveSelection([elsewhere], boardKeyOf(before), before);
    expect(out.reason).toBe("resolved");
    expect(out.ticket).toBe(elsewhere);
  });

  it("holds rather than re-anchoring when nothing matches mid-pull", () => {
    const before = own(12, "a-ticket");
    const unrelated = own(99, "something-else");
    const out = resolveSelection([unrelated], boardKeyOf(before), before);
    expect(out.reason).toBe("held");
    expect(out.ticket).toBe(before);
  });

  it("never holds a ticket the user never opened", () => {
    const out = resolveSelection([], asBoardKey("12"), null);
    expect(out.ticket).toBeNull();
    expect(out.reason).toBe("gone");
  });
});

describe("#100 fourth fix: the held ROW survives the remount that wipes the ref", () => {
  /*
   * THE REMOUNT FINGERPRINT from the user's second log: a foreign key
   * selected, the ref null (remount-wiped), the row transiently missing.
   *
   * These tests drive the SHIPPED composition -- holdInput feeding the real
   * resolveSelection -- rather than re-implementing the derivation beside
   * it. The third fix's tests did the latter and the independent review
   * failed them for it: they inlined a copy of the lookup over an array
   * that CONTAINED the row, so they passed while the shipped code ejected
   * the reader, and deleting the entire view-side fix left them green.
   */
  it("the transient miss after a remount is held-absent, not ejected", () => {
    const session = "sess-fingerprint";
    const foreignRow = foreign(12, "a-ticket", "sess-other");
    const key = boardKeyOf(foreignRow);

    // Render 1: the row is on the board. The view resolves and records.
    const first = resolveSelection([foreignRow], key, holdInput(session, null));
    recordResolution(session, first.reason, first.ticket);
    expect(first.reason).toBe("resolved");

    // A remount lands (badge count change): THIS mount's ref is null. The
    // merge re-pull that triggered it transiently omits the row, so the
    // board is empty this render -- the exact case the ticket exists for.
    const out = resolveSelection([], key, holdInput(session, null));
    expect(out.reason).toBe("held");
    expect(out.absent).toBe(true);
    // The reader is still looking at their ticket, not at the grid.
    expect(out.ticket).toBe(foreignRow);
  });

  it("holdInput prefers the live ref and falls back to the store", () => {
    const session = "sess-holdinput";
    const stored = own(12, "stored-row");
    const live = own(13, "live-row");
    setHeldTicket(session, stored);
    // The ref survived: it wins, because it is this render's fresher row.
    expect(holdInput(session, live)).toBe(live);
    // The ref was wiped by a remount: the store carries the hold.
    expect(holdInput(session, null)).toBe(stored);
  });

  it("a miss NEVER clears the store, so a second remount is still covered", () => {
    const session = "sess-nodestroy";
    const row = own(12, "a-ticket");
    const key = boardKeyOf(row);
    const first = resolveSelection([row], key, holdInput(session, null));
    recordResolution(session, first.reason, first.ticket);

    // Two consecutive missing-row renders, each with a wiped ref. The third
    // fix cleared the store on the first one and ejected on the second.
    for (const _ of [1, 2]) {
      const out = resolveSelection([], key, holdInput(session, null));
      recordResolution(session, out.reason, out.ticket);
      expect(out.reason).toBe("held");
    }
    expect(getHeldTicket(session)).toBe(row);
  });

  it("closing the detail panel clears the store, so nothing is resurrected", () => {
    const session = "sess-close";
    const row = own(12, "a-ticket");
    const first = resolveSelection([row], boardKeyOf(row), holdInput(session, null));
    recordResolution(session, first.reason, first.ticket);
    // closeDetail writes a null selection: the resolver reports "none".
    const closed = resolveSelection([row], null, holdInput(session, null));
    recordResolution(session, closed.reason, closed.ticket);
    expect(closed.reason).toBe("none");
    expect(getHeldTicket(session)).toBeNull();
  });

  it("gone is only for NEVER-resolved selections", () => {
    // A selection the reader never had open (a deep link to a ticket that
    // never loaded) has nothing in the store, so holdInput yields null and
    // the resolver correctly reports gone. The store cannot invent a hold.
    const session = "sess-never";
    const out = resolveSelection([], asBoardKey("sess-other:44"), holdInput(session, null));
    expect(out.reason).toBe("gone");
    expect(out.ticket).toBeNull();
  });
});

describe("#100 the held-row store (view-state)", () => {
  it("stores and clears the row per session", () => {
    const row = own(12, "a-ticket");
    setHeldTicket("sess-h1", row);
    expect(getHeldTicket("sess-h1")).toBe(row);
    setHeldTicket("sess-h1", null);
    expect(getHeldTicket("sess-h1")).toBeNull();
  });

  it("keeps sessions separate", () => {
    const one = own(1, "one");
    const two = own(2, "two");
    setHeldTicket("sess-ha", one);
    setHeldTicket("sess-hb", two);
    expect(getHeldTicket("sess-ha")).toBe(one);
    expect(getHeldTicket("sess-hb")).toBe(two);
  });

  it("returns null for a session that never held anything", () => {
    expect(getHeldTicket("sess-hnever")).toBeNull();
  });

  it("records resolved and reanchored, holds through held, clears only on none", () => {
    const session = "sess-rules";
    const row = own(12, "a-ticket");
    const moved = own(12, "a-ticket");

    recordResolution(session, "resolved", row);
    expect(getHeldTicket(session)).toBe(row);

    recordResolution(session, "reanchored", moved);
    expect(getHeldTicket(session)).toBe(moved);

    // held passes the SAME row back; the store must not be disturbed.
    recordResolution(session, "held", moved);
    expect(getHeldTicket(session)).toBe(moved);

    // gone must not destroy the durable row -- the third fix's defect.
    recordResolution(session, "gone", null);
    expect(getHeldTicket(session)).toBe(moved);

    recordResolution(session, "none", null);
    expect(getHeldTicket(session)).toBeNull();
  });
});

describe("#100 the hold cannot be re-gated on a flag the caller gets wrong", () => {
  const logic = readFileSync(
    new URL("../src/client/board-logic.ts", import.meta.url),
    "utf8",
  );
  const view = readFileSync(
    new URL("../src/client/local-ticket-view.tsx", import.meta.url),
    "utf8",
  );

  it("resolveSelection takes no board-settling argument", () => {
    /*
     * THE LESSON of this ticket's first failed fix, encoded.
     *
     * That fix was a correct pure function fed a wrong input: it held only
     * while `boardSettling` was true, and the caller computed that from a
     * flag the merge pull clears BEFORE it triggers the re-render. Every
     * unit test passed, because they all took `boardSettling` as a
     * parameter and therefore asserted the caller's bug into existence
     * rather than catching it.
     *
     * A unit test of a pure function can never catch a wrong argument. The
     * only durable fix was to REMOVE the parameter, so there is no input
     * left to get wrong -- and this guards that removal, because
     * reintroducing the flag would silently restore the bug with the whole
     * suite green.
     */
    const signature = logic.slice(
      logic.indexOf("export function resolveSelection"),
      logic.indexOf("): SelectionResolution<T> {"),
    );
    expect(signature).not.toContain("boardSettling");
    expect(signature).not.toContain("settling");
  });

  it("the view does not pass a settling flag into the selection", () => {
    const call = view.slice(view.indexOf("resolveSelection("));
    const args = call.slice(0, call.indexOf(");"));
    expect(args).not.toContain("isMergePulling");
    expect(args).not.toContain("mergePending");
  });

  it("the panel closes on an explicit close, never on absence", () => {
    // `closeDetail` is the only thing that clears the selection key, and an
    // absent row produces a NOTICE rather than a close.
    expect(view).toContain("resolution.absent");
    expect(view).toContain("aidos-detail-absent");
  });

  it("the view feeds the resolver through holdInput and writes back", () => {
    /*
     * WIRING, asserted as source text, and honest about what that is worth.
     *
     * The independent review of the third fix found its headline tests
     * could not fail under ANY change to the view: they re-implemented the
     * derivation, so reverting the entire view-side change left the suite
     * green. The behavioural tests above now drive the real composition
     * (holdInput -> resolveSelection -> recordResolution), which is the
     * substantive repair; this is the second half, guarding that the VIEW
     * still uses that composition rather than reaching past it.
     *
     * A source-text assertion cannot prove the view renders correctly --
     * only a browser can. It CAN fail when someone deletes the wiring, and
     * that is the mutation the review actually caught.
     */
    const call = view.slice(view.indexOf("resolveSelection("));
    const args = call.slice(0, call.indexOf(");"));
    // The hold's input comes from the store-backed seam, never from the
    // bare ref (which any remount wipes).
    expect(args).toContain("holdInput(sessionId, lastSelected.current)");
    // And every resolution is written back through the rules.
    expect(view).toContain("recordResolution(sessionId, resolution.reason, resolution.ticket)");
    // The third fix's re-derivation from the current board is GONE: it
    // cannot produce a row that is absent from that board, which is the
    // only case the hold exists for.
    expect(view).not.toContain("getHeldIdentity");
  });
});

describe("#100 THE ROOT CAUSE: the selection survives a remount", () => {
  /*
   * Found from instrumented logs after TWO fixes aimed at the wrong layer.
   *
   * A badge-count change disposes and re-registers the Tickets slot entry
   * (src/client/index.ts), and a slot re-registration UNMOUNTS AND REMOUNTS
   * the component -- destroying every useState and useRef in the tree,
   * including the open ticket. The user's log caught it exactly:
   *
   *   #100 select: resolved|sel=9|rows=274|own=110|foreign=164|ref=held
   *   #100 ProjectionReader UNMOUNTING; ticket param present=true -> STRIPPING IT
   *   filter panel mounted / board loaded: 274 / ProjectionReader MOUNTED
   *
   * The selection was still resolving CORRECTLY on the render before it
   * died. Nothing was wrong with the resolver -- which is why hardening it
   * twice changed nothing. A pure function cannot preserve state that no
   * longer exists.
   *
   * The count changes on any board write anywhere in the workspace, which is
   * why it felt random: the trigger was almost never the reader's own
   * action.
   */

  it("remembers the open ticket across a simulated remount", () => {
    // A remount = new component instance reading the module store again.
    setSelection("sess-1", "12");
    expect(getSelection("sess-1")).toBe("12");
  });

  it("keeps sessions separate, so one board cannot open another's ticket", () => {
    setSelection("sess-a", "1");
    setSelection("sess-b", "2");
    expect(getSelection("sess-a")).toBe("1");
    expect(getSelection("sess-b")).toBe("2");
  });

  it("clears cleanly when the reader closes the panel", () => {
    setSelection("sess-close", "7");
    setSelection("sess-close", null);
    expect(getSelection("sess-close")).toBeNull();
  });

  it("reports null for a session that never opened anything", () => {
    expect(getSelection("sess-never")).toBeNull();
  });

  it("stores a FOREIGN board key unchanged", () => {
    // The store is keyed by board key, not by id: a foreign row's key must
    // round-trip intact or the restored selection would open the wrong
    // ticket -- the confusion behind eleven bugs in this file's history.
    setSelection("sess-f", "sess-other:12");
    expect(getSelection("sess-f")).toBe("sess-other:12");
  });
});

describe("#100 the tab no longer remounts for an unchanged label", () => {
  const index = readFileSync(new URL("../src/client/index.ts", import.meta.url), "utf8");

  it("compares the rendered label before re-registering", () => {
    /*
     * The second half of the fix. reportCount already skips an unchanged
     * COUNT, but one label covers many counts -- every count of zero renders
     * "Tickets" -- so changes that did not alter the text still remounted
     * the whole tree for no visible benefit.
     */
    expect(index).toContain("if (next === lastLabel) return;");
  });

  it("still re-registers when the label DOES change", () => {
    // The guard must not disable the badge; a stale tab count is its own bug.
    const at = index.indexOf("setCountCallback(function ()");
    const body = index.slice(at, index.indexOf("});", at));
    expect(body).toContain("registration()");
    expect(body).toContain("registerTicketsTab(slots)");
  });
});

describe("#100 follow-up: a remount does not fire while a modal holds the tree open", () => {
  // User-reported 2026-09-05: "opening the queue makes the board vanish."
  // queueOpen is plain useState with no module backing (unlike selectedKey),
  // so a remount landing while it is open resets it to false -- the modal
  // itself disappears, not just a stale badge.
  afterEach(() => {
    setCountCallback(null);
    setRemountSuppressed(false);
  });

  it("does not bump the tab while suppressed, even though the count changed", () => {
    let bumps = 0;
    setCountCallback(() => {
      bumps += 1;
    });
    setRemountSuppressed(true);
    reportCount("sess-suppress", 3);
    reportCount("sess-suppress", 3); // repeat: unchanged, must not bump either way
    expect(bumps).toBe(0);
  });

  it("applies the deferred bump the instant suppression releases", () => {
    let bumps = 0;
    setCountCallback(() => {
      bumps += 1;
    });
    setRemountSuppressed(true);
    reportCount("sess-suppress2", 5);
    expect(bumps).toBe(0);
    setRemountSuppressed(false);
    expect(bumps).toBe(1);
  });

  it("releasing with no pending change bumps nothing", () => {
    let bumps = 0;
    setCountCallback(() => {
      bumps += 1;
    });
    setRemountSuppressed(true);
    setRemountSuppressed(false);
    expect(bumps).toBe(0);
  });

  it("an UNCHANGED count while suppressed leaves nothing pending to apply", () => {
    let bumps = 0;
    setCountCallback(() => {
      bumps += 1;
    });
    reportCount("sess-suppress3", 7); // baseline, unsuppressed
    bumps = 0;
    setRemountSuppressed(true);
    reportCount("sess-suppress3", 7); // same count: nothing changed
    setRemountSuppressed(false);
    expect(bumps).toBe(0);
  });
});

/*
 * ROUND 2 — the user reported it twice more: "board still unmounts if it
 * updates while the queue is open", then "still broken".
 *
 * The suppression above is not wrong, it is INCOMPLETE by construction: it
 * can only cover the remount paths it is wired into, and the independent
 * diagnosis found a third one it never was — index.ts's visibility effect
 * calls reconcile() straight from the sessions-store subscription with no
 * check at all. Adding a fourth guard is the band-aid the module's own
 * comment argues against, one path at a time, forever.
 *
 * So the modal flags moved OUT of React, exactly as `selectedKey` did
 * above. These tests assert the property that makes the cause irrelevant:
 * whatever remounts the tree, the modal state is still there to read back.
 */
describe("#100 round 2: a modal survives the remount, whatever caused it", () => {
  const view = readFileSync(
    new URL("../src/client/local-ticket-view.tsx", import.meta.url),
    "utf8",
  );

  beforeEach(() => {
    __resetModalsForTests();
  });

  it("a fresh mount reads the queue back OPEN", () => {
    // The bug, in one assertion: this is what a remounted component sees.
    setModalOpen("sess-modal", "queue", true);
    expect(isModalOpen("sess-modal", "queue")).toBe(true);
  });

  it("closing is remembered too, so a modal cannot resurrect itself", () => {
    setModalOpen("sess-modal", "queue", true);
    setModalOpen("sess-modal", "queue", false);
    expect(isModalOpen("sess-modal", "queue")).toBe(false);
  });

  it("keeps each modal separate: closing one does not close another", () => {
    setModalOpen("sess-modal", "queue", true);
    setModalOpen("sess-modal", "plan", true);
    setModalOpen("sess-modal", "plan", false);
    expect(isModalOpen("sess-modal", "queue")).toBe(true);
    expect(isModalOpen("sess-modal", "plan")).toBe(false);
  });

  it("keeps each SESSION separate: two boards do not share a modal", () => {
    // The #114 lesson applied here: anything keyed globally eventually
    // shows one session's state on another's screen.
    setModalOpen("sess-a", "queue", true);
    expect(isModalOpen("sess-b", "queue")).toBe(false);
  });

  it("anyModalOpen is the suppression input, and follows the same store", () => {
    expect(anyModalOpen("sess-modal")).toBe(false);
    setModalOpen("sess-modal", "create", true);
    expect(anyModalOpen("sess-modal")).toBe(true);
    setModalOpen("sess-modal", "create", false);
    expect(anyModalOpen("sess-modal")).toBe(false);
  });

  it("the view INITIALISES from the store rather than from false", () => {
    /*
     * The wiring half. A store nothing reads on mount is a store that does
     * not fix the bug — the component would still start closed after every
     * remount, which is precisely the reported symptom.
     */
    expect(view).toContain("react.useState(() => isModalOpen(sessionId, modal))");
    expect(view).toContain('useStoredModal("queue")');
    expect(view).toContain('useStoredModal("create")');
    expect(view).toContain('useStoredModal("plan")');
    // And none of the three may fall back to a plain useState(false).
    expect(view).not.toContain("react.useState(false);\n  const [planOpen");
  });

  it("writes the STORE before the React state, so a lost render still records it", () => {
    const setter = view.slice(view.indexOf("const set = function (open: boolean)"));
    const body = setter.slice(0, setter.indexOf("};"));
    expect(body.indexOf("setModalOpen(")).toBeLessThan(body.indexOf("setValue("));
  });
});

/**
 * ROUND 3, and the gap round 2 left standing.
 *
 * Round 2 moved the BOARD's modals (queue, create, plan) out of React. The
 * modals this ticket's criterion actually names -- mark-done, the evidence
 * viewer, the approval runner -- are one level down and were untouched: all
 * six of DetailView's dialogs were still plain `useState`, so the remount
 * that used to close the queue still emptied the dialog the reader was
 * typing into, and QueuePanel still lost the runner even after the queue
 * modal around it learned to survive.
 *
 * DetailView also had a remount all of its own, which no board-level store
 * could ever have covered: `key={selectedBoardKey}`. A row's board key flips
 * when it goes foreign -> own, React rebuilds a subtree whose key changed,
 * and the panel's own comment said so while shipping it.
 */
describe("#100 round 3: the detail panel's own dialogs survive the remount", () => {
  const TICKET = WS + ":reading-a-ticket";
  const OTHER = WS + ":some-other-ticket";

  beforeEach(() => {
    __resetModalsForTests();
  });

  it("a fresh mount reads MARK-DONE back open", () => {
    // The bug in one assertion: this is what a remounted DetailView sees.
    setDetailModalOpen("sess-detail", TICKET, "markDone", true);
    expect(isDetailModalOpen("sess-detail", TICKET, "markDone")).toBe(true);
  });

  it("the evidence viewer restores the ROW, not merely a flag", () => {
    // It renders a row, so a boolean would bring back an empty dialog --
    // which is a different bug wearing the fix's clothes.
    const row = { kind: "builtin:review_pass", author: "agent", at: 1 };
    setViewedEvidence("sess-detail", TICKET, row);
    expect(getViewedEvidence("sess-detail", TICKET)).toEqual(row);
  });

  it("closing is remembered too, so a dialog cannot resurrect itself", () => {
    setDetailModalOpen("sess-detail", TICKET, "signoff", true);
    setDetailModalOpen("sess-detail", TICKET, "signoff", false);
    expect(isDetailModalOpen("sess-detail", TICKET, "signoff")).toBe(false);
  });

  it("keeps each dialog separate: closing one does not close another", () => {
    setDetailModalOpen("sess-detail", TICKET, "markDone", true);
    setDetailModalOpen("sess-detail", TICKET, "allowlist", true);
    setDetailModalOpen("sess-detail", TICKET, "allowlist", false);
    expect(isDetailModalOpen("sess-detail", TICKET, "markDone")).toBe(true);
    expect(isDetailModalOpen("sess-detail", TICKET, "allowlist")).toBe(false);
  });

  it("keeps each TICKET separate: one ticket's dialog is not another's", () => {
    setDetailModalOpen("sess-detail", TICKET, "verify", true);
    expect(isDetailModalOpen("sess-detail", OTHER, "verify")).toBe(false);
  });

  it("keeps each SESSION separate: two boards do not share a dialog", () => {
    setDetailModalOpen("sess-a", TICKET, "sendBack", true);
    expect(isDetailModalOpen("sess-b", TICKET, "sendBack")).toBe(false);
  });

  it("clearDetailModals forgets ONE ticket, and leaves the rest alone", () => {
    setDetailModalOpen("sess-detail", TICKET, "markDone", true);
    setViewedEvidence("sess-detail", TICKET, { kind: "builtin:automated_check" });
    setDetailModalOpen("sess-detail", OTHER, "markDone", true);
    clearDetailModals("sess-detail", TICKET);
    expect(isDetailModalOpen("sess-detail", TICKET, "markDone")).toBe(false);
    expect(getViewedEvidence("sess-detail", TICKET)).toBeNull();
    expect(isDetailModalOpen("sess-detail", OTHER, "markDone")).toBe(true);
  });

  it("anyModalOpen counts a DETAIL dialog, so suppression can see it", () => {
    expect(anyModalOpen("sess-detail")).toBe(false);
    setDetailModalOpen("sess-detail", TICKET, "markDone", true);
    expect(anyModalOpen("sess-detail")).toBe(true);
    setDetailModalOpen("sess-detail", TICKET, "markDone", false);
    expect(anyModalOpen("sess-detail")).toBe(false);
  });

  it("an open evidence viewer alone keeps anyModalOpen true", () => {
    // The viewer has no boolean of its own; a store that only counted flags
    // would report a quiet board while a dialog was on screen.
    setViewedEvidence("sess-detail", TICKET, { kind: "builtin:review_note" });
    expect(anyModalOpen("sess-detail")).toBe(true);
    setViewedEvidence("sess-detail", TICKET, null);
    expect(anyModalOpen("sess-detail")).toBe(false);
  });

  it("returns false for a ticket whose dialogs were never touched", () => {
    expect(isDetailModalOpen("sess-detail", TICKET, "markDone")).toBe(false);
    expect(getViewedEvidence("sess-detail", TICKET)).toBeNull();
  });

  /**
   * THE KEY CHOICE, tested as behaviour rather than asserted as a string.
   *
   * Storing the dialogs under the BOARD key would lose them on the flip
   * foreign -> own, which is one of the two events #100 exists to survive.
   * The durable identity does not move.
   */
  it("the durable identity survives the board-key flip that the board key does not", () => {
    const asForeign = foreign(9, "reading-a-ticket", "sess-owner");
    const asOwn = own(9, "reading-a-ticket");
    expect(boardKeyOf(asForeign)).not.toBe(boardKeyOf(asOwn));
    expect(fullTicketId(asForeign)).toBe(fullTicketId(asOwn));

    // Opened while the row was foreign...
    setDetailModalOpen("sess-detail", fullTicketId(asForeign), "markDone", true);
    // ...and still open once its owner session loads and the key flips.
    expect(isDetailModalOpen("sess-detail", fullTicketId(asOwn), "markDone")).toBe(true);

    // The rejected alternative, for contrast: keyed by the board key, the
    // same dialog is simply gone after the flip.
    setDetailModalOpen("sess-board-key", boardKeyOf(asForeign), "markDone", true);
    expect(isDetailModalOpen("sess-board-key", boardKeyOf(asOwn), "markDone")).toBe(false);
  });

  it("the re-anchor these dialogs must survive is a real resolution, not a hypothetical", () => {
    // Ties the key choice to the resolver: this IS the flip, resolved.
    const before = foreign(9, "reading-a-ticket", "sess-owner");
    const after = own(9, "reading-a-ticket");
    const resolution = resolveSelection([after], boardKeyOf(before), before);
    expect(resolution.reason).toBe("reanchored");
    expect(resolution.ticket).not.toBeNull();
    expect(fullTicketId(resolution.ticket as Row)).toBe(fullTicketId(before));
  });
});

/**
 * The wiring half. A store nothing reads on mount does not fix the bug, and
 * a panel still keyed on the board key still remounts on the flip -- the
 * component would come back with its dialogs closed either way, which is
 * exactly the reported symptom. A mount harness that could drive this
 * behaviourally is ticketed as #149; until it exists these guard the seams
 * the stores hang from, and they are named as guards rather than dressed up
 * as behaviour.
 */
describe("#100 round 3: the view and the panel are wired to the stores", () => {
  const view = readFileSync(
    new URL("../src/client/local-ticket-view.tsx", import.meta.url),
    "utf8",
  );
  const panel = readFileSync(
    new URL("../src/client/detail-panel.tsx", import.meta.url),
    "utf8",
  );

  it("DetailView is keyed on the durable identity, never on the board key", () => {
    expect(view).toContain("const panelKey = selectedTicket === null ? null : fullTicketId(selectedTicket)");
    expect(view).toContain("key={panelKey}");
    // The revert this pins: the board key is the value that flips.
    expect(view).not.toContain("key={selectedBoardKey}");
  });

  it("the panel INITIALISES every dialog from the store rather than from false", () => {
    expect(panel).toContain("react.useState(() => isDetailModalOpen(agentId, ticketKey, modal))");
    expect(panel).toContain('useStoredModal("markDone")');
    expect(panel).toContain('useStoredModal("allowlist")');
    expect(panel).toContain('useStoredModal("signoff")');
    expect(panel).toContain('useStoredModal("verify")');
    expect(panel).toContain('useStoredModal("sendBack")');
    expect(panel).toContain("getViewedEvidence<EvidenceRowLike>(agentId, ticketKey)");
    // None of them may fall back to a plain useState(false).
    expect(panel).not.toContain("const [markDoneOpen, setMarkDoneOpen] = react.useState(false)");
  });

  it("the panel keys the store on the DURABLE identity, not on ticketIdKey", () => {
    // ticketIdKey IS the board key, i.e. the value that flips.
    expect(panel).toContain("const ticketKey = fullTicketId(ticket)");
  });

  it("the panel writes the STORE before the React state", () => {
    const setter = panel.slice(panel.indexOf("const set = function (open: boolean)"));
    const body = setter.slice(0, setter.indexOf("};"));
    expect(body.indexOf("setDetailModalOpen(")).toBeLessThan(body.indexOf("setValue("));
  });

  it("the view forgets a ticket's dialogs when the READER moves, not on unmount", () => {
    // Clearing from an unmount cleanup is the third fix's defect in a new
    // place: a remount and a close look identical to a component.
    const setter = view.slice(view.indexOf("const setSelectedKey = react.useCallback"));
    const body = setter.slice(0, setter.indexOf("[sessionId],"));
    // The WHOLE statement, not just the call: a mutation that guards the
    // call out (`&& false`) leaves the call text sitting there intact, and a
    // substring check would happily pass over a clear that never runs.
    expect(body).toContain(
      "if (leaving !== null) clearDetailModals(sessionId, fullTicketId(leaving));",
    );
    expect(body.indexOf("clearDetailModals(")).toBeLessThan(body.indexOf("setSelection("));
  });
});

/**
 * The ticket's body asks, as the second half of its fix, whether the slot API
 * can re-read a label WITHOUT a dispose/re-register cycle. Round 3 answered
 * it from the package's own types, and the answer is no -- but not for the
 * reason index.ts used to give.
 *
 * `SlotLabel = string | (() => string)` is documented as "re-evaluated per
 * read ... WITHOUT RE-REGISTRATION", so the label was never what needed the
 * cycle. What needs it is the READ: `entries()` returns a reference-stable
 * array between mutations and `subscribe` only fires on mutations, so with
 * no mutation the header never re-renders and never calls the thunk. The
 * public surface offers no non-mutating invalidation, and for a list entry
 * the only mutations are register and dispose.
 *
 * These pin the half of that finding that lives in OUR code: the label must
 * stay a thunk. Passing `badgeLabel()` would freeze the text at registration
 * time -- it would keep working only because we re-register, which is
 * precisely the dependency the body wants removed rather than deepened.
 */
describe("#100 round 3: the tab label is a thunk, so the churn is the API's and not ours", () => {
  const entry = readFileSync(new URL("../src/client/index.ts", import.meta.url), "utf8");

  it("registers the label as a FUNCTION REFERENCE, never a computed string", () => {
    expect(entry).toContain("label: badgeLabel,");
    expect(entry).not.toContain("label: badgeLabel(),");
  });

  it("still guards the re-register on the rendered label STRING", () => {
    // Half (2) of the body's fix: re-register only when the text differs.
    // Many counts share one label ("Tickets" for every zero), so comparing
    // the string and not the count is what removes the churn.
    const bump = entry.slice(entry.indexOf("setCountCallback(function ()"));
    const body = bump.slice(0, bump.indexOf("const slots ="));
    expect(body).toContain("const next = badgeLabel();");
    expect(body).toContain("if (next === lastLabel) return;");
  });

  it("advances lastLabel only on a SUCCESSFUL re-register, so a failure retries", () => {
    const bump = entry.slice(entry.indexOf("setCountCallback(function ()"));
    const tryBlock = bump.slice(bump.indexOf("try {"), bump.indexOf("} catch"));
    expect(tryBlock.indexOf("registration = registerTicketsTab(slots);")).toBeLessThan(
      tryBlock.indexOf("lastLabel = next;"),
    );
  });
});

describe("#100 round 3: the approval runner survives the remount", () => {
  beforeEach(() => {
    __resetModalsForTests();
  });

  it("a fresh mount reads the running approval back", () => {
    setRunningApproval("sess-queue", "12\u0000allowlist\u0000req-1");
    expect(getRunningApproval("sess-queue")).toBe("12\u0000allowlist\u0000req-1");
  });

  it("clearing it is remembered, so a closed runner cannot reopen itself", () => {
    setRunningApproval("sess-queue", "12\u0000signoff");
    setRunningApproval("sess-queue", null);
    expect(getRunningApproval("sess-queue")).toBeNull();
  });

  it("keeps sessions separate: one board's runner is not another's", () => {
    setRunningApproval("sess-a", "12\u0000signoff");
    expect(getRunningApproval("sess-b")).toBeNull();
  });

  it("reports null for a session that never opened one", () => {
    expect(getRunningApproval("sess-never")).toBeNull();
  });

  it("the panel restores it on mount and re-derives the ENTRY from the board", () => {
    const queue = readFileSync(
      new URL("../src/client/queue-panel.tsx", import.meta.url),
      "utf8",
    );
    expect(queue).toContain("react.useState<string | null>(() =>\n    getRunningApproval(props.sessionId),\n  )");
    expect(queue).toContain("entries.find((entry) => entryKey(entry) === runningKey)");
    // The revert this pins: the entry OBJECT held in React state.
    expect(queue).not.toContain("react.useState<QueueEntry | null>(null)");
    const setter = queue.slice(queue.indexOf("const setRunning = function (entry: QueueEntry | null)"));
    const body = setter.slice(0, setter.indexOf("};"));
    expect(body.indexOf("setRunningApproval(")).toBeLessThan(body.indexOf("setRunningKey("));
  });
});
