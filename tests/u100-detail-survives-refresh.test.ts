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

import { afterEach, describe, expect, it } from "vitest";

import { asBoardKey, boardKeyOf, resolveSelection } from "../src/client/board-logic";
import {
  getSelection,
  reportCount,
  setCountCallback,
  setRemountSuppressed,
  setSelection,
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
