/**
 * #222, the migration front: export the MERGED board into a FRESH store.
 *
 * The enumeration proved the delta plan is blocked (53 fork-newer tickets,
 * 156+5 history rows on store-resident tickets, no update-by-slug path),
 * and that the board merge already computes the forward-ported truth
 * (newest-wins per workspaceKey:slug). So: export the merged board as JSON,
 * auto-resolve the duplicates, load into a fresh store with fresh ids.
 * The 40 refusals die at cutover by owner decision — no refusals table.
 *
 * The duplicate rule, refined: IDENTITY is the stem pair plus an identical
 * `createdAt` (durable identity; `updatedAt` is recency and never gates),
 * RESOLUTION keeps the NEWER `updatedAt` on either side — the #83
 * newest-wins applied where the merge cannot see. 68/150 (the twin newer
 * than the bare row) resolves to the twin; every non-trivial resolution is
 * named in the report with both sides and the reason.
 *
 * The real run certifies BOARD-completeness, not loader fidelity: the live
 * board is compared against the candidate, and the run REFUSES (throws,
 * blessing nothing) when the export could not have been complete —
 * retired rows excluded, unverified source backfill, or a plan the loader
 * would skip. `lossless: true` means the candidate holds every live-board
 * row by slug identity, and never answers a narrower question than that.
 *
 * Criterion map (one `it` per line, in order):
 *   identity is stem pair plus identical createdAt —
 *     differing createdAt is no pair even with a matching stem
 *   resolution keeps the newer updatedAt on either side —
 *     bare-newer keeps bare, twin-newer keeps the twin (68/150)
 *   exact ties keep the bare row by convention and are trivial
 *   chains (S / S-2 / S-3) collapse to the newest, naming every drop
 *   a legitimately-suffixed non-duplicate survives —
 *     same stem shape, differing createdAt (the-one-time-backfill-2)
 *   a suffixed slug with no bare base survives, and a non-numeric
 *     suffix is never a pair
 *   a dropped twin's unique history forwards onto the survivor,
 *     exact row-identity dupes drop
 *   `builtin:imported_state` evidence is dropped at export and counted
 *   winner selection across copies is newest-wins
 *   retired census counts distinct identities, and the file embeds it
 *   dependency refs into a dropped row land on the survivor whichever
 *     side survived (bare-kept and twin-kept directions)
 *   an unresolvable ref is carried verbatim AND reported by name
 *   a dep that would remap onto the ticket itself is carried and reported
 *   a dependency cycle refuses naming the tickets (refs and slugs)
 *   orphan evidence refuses naming the missing ticket
 *   a double import refuses before any allocation, changing nothing
 *   evidence or comments newer than the last edit drag updatedAt,
 *     recorded by name in load.adjustedUpdatedAt
 *   arbitrary evidence payload keys survive verbatim (float `at` exact)
 *   createdAt/updatedAt floats are preserved exactly through JSON
 *   tags absent stays absent (untagged); tags present are kept
 *   states transfer as-is with no re-gating (done, no evidence)
 *   comments and plan/phases land in the fresh store
 *   the loaded store passes its own coverage check with missingCount 0
 *   a dry run writes no store and creates no store file
 *   a storeless dry run reports backfillVerified false and exports nothing
 *   a bare call defaults to dry run; the live path is refused as candidate
 *   the real run refuses a retired-excluding export
 *   the real run refuses an unverified export and a headerless file
 *   the real run refuses an over-cap plan before touching the candidate
 *   the real run refuses board-relative export loss and deletes its file
 *   hand-deleted rows are acknowledged (humanRemoved) without refusal
 *   rows born after the export are drift (named, lossless false)
 *   the quiet-board real run is lossless with every list empty
 *   the live store is untouched by a real run (guard layers, counted)
 */

import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  boardStoreDivergence,
  buildBoardMigrationDocument,
  findBoardMigrationDuplicates,
  type BuildBoardMigrationInput,
  type MigrationExportRow,
} from "../src/host/aidos-core";
import { Store } from "../src/kernel/store";
import type { BoardMigrationDocument } from "../src/kernel/store";
import { MemoryStorage } from "../src/kernel/storage-memory";
import { workspaceKeyFromPath } from "../src/kernel/slug";
import { createHarness } from "./b1-harness";
import { FIXED_NOW, makeConfig, makeStore } from "./helpers";

const WS = "/tmp/mig-ws";
const KEY = workspaceKeyFromPath(WS);
const CREATED = 1788394792.774;
const UPDATED = 1789461192.825;

let rowSeq = 0;

/** One export copy with sane defaults; override what the test pins. */
function makeRow(overrides: Partial<MigrationExportRow> = {}): MigrationExportRow {
  rowSeq += 1;
  return {
    title: `ticket ${rowSeq}`,
    description: `description ${rowSeq}`,
    body: "",
    criteria: `criterion ${rowSeq}`,
    phase: 7,
    order: rowSeq,
    state: "in_progress",
    allowlist: [],
    dependsOn: [],
    tags: [],
    slug: `ticket-${rowSeq}`,
    workspaceKey: KEY,
    createdAt: CREATED,
    updatedAt: UPDATED,
    oldId: rowSeq,
    oldSource: "store",
    ...overrides,
  };
}

const TEST_PLAN = {
  frontmatter: "",
  context: {
    preamble: "live preamble",
    contextSections: [{ heading: "## Vision", text: "see it", index: 0 }],
  },
  rules: "live rules",
};

function makeInput(overrides: Partial<BuildBoardMigrationInput> = {}): BuildBoardMigrationInput {
  return {
    workspaceKey: KEY,
    absPath: WS,
    projectName: "mig-ws",
    exportedAt: UPDATED,
    callerSessionId: "session-1",
    rows: [],
    evidence: [],
    comments: [],
    plan: TEST_PLAN,
    phases: [{ number: 1, title: "aidos core", state: "open" }],
    retiredIdentities: [],
    backfillVerified: true,
    ...overrides,
  };
}

describe("#222 identity is the stem pair plus an identical createdAt", () => {
  it("differing createdAt is no pair even with a matching stem", () => {
    const bare = makeRow({ slug: "stem-ticket", createdAt: CREATED, updatedAt: UPDATED });
    const other = makeRow({ slug: "stem-ticket-2", createdAt: CREATED + 5000, updatedAt: UPDATED });
    const { pairs, droppedSlugs } = findBoardMigrationDuplicates([bare, other]);
    expect(pairs).toHaveLength(0);
    expect(droppedSlugs.size).toBe(0);
  });

  it("a suffixed slug with no bare base survives", () => {
    const lone = makeRow({ slug: "lonely-3", createdAt: CREATED, updatedAt: UPDATED });
    expect(findBoardMigrationDuplicates([lone]).pairs).toHaveLength(0);
  });

  it("a non-numeric suffix is never a pair, and a legit suffixed ticket survives", () => {
    const base = makeRow({ slug: "the-one-time-backfill", createdAt: CREATED, updatedAt: UPDATED });
    const legit = makeRow({
      slug: "the-one-time-backfill-2",
      createdAt: CREATED + 5000,
      updatedAt: UPDATED + 5000,
    });
    const wordy = makeRow({ slug: "release-notes", createdAt: CREATED, updatedAt: UPDATED });
    expect(findBoardMigrationDuplicates([base, legit, wordy]).pairs).toHaveLength(0);
  });
});

describe("#222 resolution keeps the newer updatedAt on either side", () => {
  it("bare-newer keeps the bare row and drops the twin", () => {
    const bare = makeRow({ slug: "some-ticket", createdAt: CREATED, updatedAt: UPDATED + 100 });
    const twin = makeRow({ slug: "some-ticket-2", createdAt: CREATED, updatedAt: UPDATED });
    const { pairs, droppedSlugs } = findBoardMigrationDuplicates([bare, twin]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ keptSlug: "some-ticket", droppedSlug: "some-ticket-2" });
    expect(pairs[0]!.reason).toContain("bare newer");
    expect(droppedSlugs.size).toBe(1);
  });

  it("68/150 resolves to the twin: the suffixed row moved further", () => {
    // Real store rows: bare id 68 (open, updated 1788261011.35) and twin
    // id 150 (in_progress, updated 1788435566.145), same createdAt.
    // Keeping the bare row would regress in_progress back to open.
    const bare = makeRow({
      slug: "evidence-ux",
      createdAt: 1788259295.299,
      updatedAt: 1788261011.35,
      state: "open",
      title: "Evidence UX",
    });
    const twin = makeRow({
      slug: "evidence-ux-2",
      createdAt: 1788259295.299,
      updatedAt: 1788435566.145,
      state: "in_progress",
      title: "Evidence UX",
    });
    const { pairs, droppedSlugs } = findBoardMigrationDuplicates([bare, twin]);
    expect(pairs).toHaveLength(1);
    const pair = pairs[0]!;
    expect(pair.keptSlug).toBe("evidence-ux-2");
    expect(pair.droppedSlug).toBe("evidence-ux");
    expect(pair.nontrivial).toBe(true);
    expect(pair.keptState).toBe("in_progress");
    expect(pair.droppedState).toBe("open");
    expect(pair.reason).toContain("twin newer");
    expect(droppedSlugs.size).toBe(1);
  });

  it("exact ties keep the bare row by convention and are trivial", () => {
    const bare = makeRow({ slug: "tied", title: "Same", state: "open", createdAt: CREATED, updatedAt: UPDATED });
    const twin = makeRow({ slug: "tied-2", title: "Same", state: "open", createdAt: CREATED, updatedAt: UPDATED });
    const { pairs } = findBoardMigrationDuplicates([bare, twin]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ keptSlug: "tied", droppedSlug: "tied-2", nontrivial: false });
    expect(pairs[0]!.reason).toContain("tie → bare by convention");
  });

  it("a tie the twin wins names the twin, not the bare convention", () => {
    // Same clocks, but #83 order prefers the twin's source (lowest
    // session id): the winner is the twin, so the label must say so.
    const bare = makeRow({ slug: "tied", title: "Same", state: "open", createdAt: CREATED, updatedAt: UPDATED, oldSource: "session-z" });
    const twin = makeRow({ slug: "tied-2", title: "Same", state: "open", createdAt: CREATED, updatedAt: UPDATED, oldSource: "session-a" });
    const { pairs } = findBoardMigrationDuplicates([bare, twin]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ keptSlug: "tied-2", droppedSlug: "tied", nontrivial: false });
    expect(pairs[0]!.reason).toContain("tie → twin");
  });

  it("chains (S / S-2 / S-3) collapse to the newest, naming every drop", () => {
    const base = makeRow({ slug: "chain", createdAt: CREATED, updatedAt: UPDATED, state: "open" });
    const mid = makeRow({ slug: "chain-2", createdAt: CREATED, updatedAt: UPDATED + 10, state: "in_progress" });
    const tip = makeRow({ slug: "chain-3", createdAt: CREATED, updatedAt: UPDATED + 20, state: "done" });
    const { pairs, droppedSlugs } = findBoardMigrationDuplicates([base, mid, tip]);
    expect(pairs).toHaveLength(2);
    expect(pairs.map((pair) => pair.keptSlug)).toEqual(["chain-3", "chain-3"]);
    expect(pairs.map((pair) => pair.droppedSlug).sort()).toEqual(["chain", "chain-2"]);
    expect(droppedSlugs.size).toBe(2);
    expect(pairs.every((pair) => pair.nontrivial)).toBe(true);
  });
});

describe("#222 the export drops losers, forwards unique history, names resolutions", () => {
  it("drops the twin snapshot; its unique history forwards, exact dupes drop", () => {
    const bare = makeRow({ slug: "dup", oldId: 1, createdAt: CREATED, updatedAt: UPDATED });
    const twin = makeRow({ slug: "dup-2", oldId: 83, createdAt: CREATED, updatedAt: UPDATED });
    const { doc, report } = buildBoardMigrationDocument(
      makeInput({
        rows: [bare, twin],
        evidence: [
          { oldSource: "store", oldId: 1, kind: "builtin:agent_report", author: "agent", at: UPDATED, payload: { kept: true } },
          // Same (kind, at) on both copies: the inherited prefix, dropped.
          { oldSource: "store", oldId: 83, kind: "builtin:agent_report", author: "agent", at: UPDATED, payload: { twin: true } },
          // Unique to the twin: forwarded onto the survivor.
          { oldSource: "store", oldId: 83, kind: "builtin:review_note", author: "agent", at: UPDATED + 10, payload: { unique: true } },
        ],
        comments: [
          { oldSource: "store", oldId: 1, text: "bare comment", author: "agent", at: UPDATED },
          { oldSource: "store", oldId: 83, text: "bare comment", author: "agent", at: UPDATED },
          { oldSource: "store", oldId: 83, text: "twin-only", author: "agent", at: UPDATED + 5 },
        ],
      }),
    );
    expect(report.duplicatesMatched).toBe(1);
    expect(report.duplicatesDropped).toEqual(["dup-2"]);
    expect(doc.tickets.map((ticket) => ticket.slug)).toEqual(["dup"]);
    expect(doc.evidence).toHaveLength(2);
    expect(doc.evidence.map((entry) => entry.kind)).toEqual(["builtin:agent_report", "builtin:review_note"]);
    expect(doc.evidence.every((entry) => entry.ticketSlug === "dup")).toBe(true);
    expect(report.evidenceDroppedDuplicate).toBe(1);
    expect(report.evidenceForwardedFromCopies).toBe(1);
    expect(doc.comments.map((comment) => comment.text).sort()).toEqual(["bare comment", "twin-only"]);
    expect(report.commentsDroppedDuplicate).toBe(1);
    expect(report.commentsForwardedFromCopies).toBe(1);
  });

  it("stem pairs with differing createdAt are both kept and named for hand triage", () => {
    const first = makeRow({ slug: "stem", oldId: 2, createdAt: CREATED, updatedAt: UPDATED });
    const second = makeRow({ slug: "stem-2", oldId: 84, createdAt: CREATED + 9000, updatedAt: UPDATED });
    const { doc, report } = buildBoardMigrationDocument(makeInput({ rows: [first, second] }));
    expect(report.duplicatesMatched).toBe(0);
    expect(doc.tickets).toHaveLength(2);
    expect(report.nearDuplicates).toEqual([{ workspaceKey: KEY, keptSlug: "stem", otherSlug: "stem-2" }]);
  });

  it("imported_state evidence is dropped and counted, never loaded", () => {
    const row = makeRow({ slug: "bookkept", oldId: 3 });
    const { doc, report } = buildBoardMigrationDocument(
      makeInput({
        rows: [row],
        evidence: [
          { oldSource: "store", oldId: 3, kind: "builtin:imported_state", author: "system", at: CREATED, payload: { sessionId: "s" } },
          { oldSource: "store", oldId: 3, kind: "builtin:review_pass", author: "agent", at: UPDATED, payload: { verdict: "ok" } },
        ],
      }),
    );
    expect(report.evidenceDroppedImportedState).toBe(1);
    expect(report.evidenceKept).toBe(1);
    expect(doc.evidence.map((entry) => entry.kind)).toEqual(["builtin:review_pass"]);
  });

  it("winner selection is newest-wins across copies of one identity", () => {
    const oldCopy = makeRow({ slug: "shared", oldId: 5, oldSource: "store", title: "stale", updatedAt: UPDATED });
    const newCopy = makeRow({ slug: "shared", oldId: 5, oldSource: "session-live", title: "live", updatedAt: UPDATED + 50 });
    const { doc } = buildBoardMigrationDocument(makeInput({ rows: [oldCopy, newCopy] }));
    expect(doc.tickets).toHaveLength(1);
    expect(doc.tickets[0]!.title).toBe("live");
    expect(doc.tickets[0]!.oldSource).toBe("session-live");
  });

  it("the retired census counts distinct identities, and the file embeds it", () => {
    const { doc, report } = buildBoardMigrationDocument(
      makeInput({ retiredIdentities: [`${KEY}:gone`, `${KEY}:gone`, `${KEY}:also-gone`], backfillVerified: false }),
    );
    expect(report.retiredExcluded).toBe(2);
    expect(doc.exportReport).toMatchObject({ retiredExcluded: 2, backfillVerified: false, exportedSlugs: [] });
  });

  it("the 68/150 export keeps the twin and records the non-trivial resolution", () => {
    const bare = makeRow({
      slug: "evidence-ux",
      oldId: 68,
      oldSource: "store",
      createdAt: 1788259295.299,
      updatedAt: 1788261011.35,
      state: "open",
      title: "Evidence UX",
    });
    const twin = makeRow({
      slug: "evidence-ux-2",
      oldId: 150,
      oldSource: "store",
      createdAt: 1788259295.299,
      updatedAt: 1788435566.145,
      state: "in_progress",
      title: "Evidence UX",
    });
    const { doc, report } = buildBoardMigrationDocument(makeInput({ rows: [bare, twin] }));
    expect(doc.tickets.map((ticket) => ticket.slug)).toEqual(["evidence-ux-2"]);
    expect(report.duplicatesMatched).toBe(1);
    expect(report.duplicateResolutions).toHaveLength(1);
    expect(report.duplicateResolutions[0]).toMatchObject({
      keptSlug: "evidence-ux-2",
      droppedSlug: "evidence-ux",
      keptState: "in_progress",
      droppedState: "open",
      nontrivial: true,
    });
    expect(report.nearDuplicates).toEqual([]);
  });
});

describe("#222 dependency refs survive the renumbering whichever side wins", () => {
  it("a ref into a dropped twin lands on the surviving twin", () => {
    const bare = makeRow({ slug: "twin", oldId: 1, oldSource: "session-fork", createdAt: CREATED, updatedAt: UPDATED });
    const dropped = makeRow({ slug: "twin-2", oldId: 83, oldSource: "session-fork", createdAt: CREATED, updatedAt: UPDATED });
    const dependent = makeRow({
      slug: "dependent",
      oldId: 9,
      oldSource: "session-fork",
      dependsOn: [`${KEY}:83`],
    });
    const input = makeInput({ rows: [bare, dropped, dependent] });
    const built = buildBoardMigrationDocument(input);
    expect(built.doc.tickets.find((ticket) => ticket.slug === "dependent")!.depTargets).toEqual({
      [`${KEY}:83`]: "twin",
    });
    const store = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    const load = store.importBoardDocument(built.doc);
    expect(load.edgesRewritten).toBe(1);
    expect(load.unresolvedDependencies).toEqual([]);
    const survivorId = load.newIds["twin"]!;
    const depId = load.newIds["dependent"]!;
    expect(store.getTicket(depId).dependsOn).toEqual([`${KEY}:${survivorId}`]);
  });

  it("a ref into a dropped bare lands on the surviving twin", () => {
    // 68/150 direction: the bare row lost, so a ref naming the bare id
    // must rewrite onto the suffixed survivor — direction-agnostic.
    const bare = makeRow({
      slug: "evidence-ux",
      oldId: 68,
      oldSource: "store",
      createdAt: 1788259295.299,
      updatedAt: 1788261011.35,
      state: "open",
    });
    const twin = makeRow({
      slug: "evidence-ux-2",
      oldId: 150,
      oldSource: "store",
      createdAt: 1788259295.299,
      updatedAt: 1788435566.145,
      state: "in_progress",
    });
    const dependent = makeRow({
      slug: "watcher",
      oldId: 200,
      oldSource: "store",
      dependsOn: [`${KEY}:68`],
    });
    const built = buildBoardMigrationDocument(makeInput({ rows: [bare, twin, dependent] }));
    expect(built.doc.tickets.find((ticket) => ticket.slug === "watcher")!.depTargets).toEqual({
      [`${KEY}:68`]: "evidence-ux-2",
    });
    const store = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    const load = store.importBoardDocument(built.doc);
    expect(load.edgesRewritten).toBe(1);
    expect(load.unresolvedDependencies).toEqual([]);
    expect(store.getTicket(load.newIds["watcher"]!).dependsOn).toEqual([`${KEY}:${load.newIds["evidence-ux-2"]!}`]);
    expect(store.getTicket(load.newIds["evidence-ux-2"]!).state).toBe("in_progress");
  });

  it("an unresolvable ref is carried verbatim and reported by name", () => {
    const row = makeRow({ slug: "lonely-dep", oldId: 7, oldSource: "session-fork", dependsOn: [`${KEY}:999`, "bare-12"] });
    const built = buildBoardMigrationDocument(makeInput({ rows: [row] }));
    expect(built.report.depsUnresolved).toBe(2);
    const store = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    const load = store.importBoardDocument(built.doc);
    expect(load.edgesRewritten).toBe(0);
    expect(load.unresolvedDependencies).toEqual([
      { ticketSlug: "lonely-dep", ticketTitle: row.title, ref: `${KEY}:999` },
      { ticketSlug: "lonely-dep", ticketTitle: row.title, ref: "bare-12" },
    ]);
    const depId = load.newIds["lonely-dep"]!;
    expect(store.getTicket(depId).dependsOn).toEqual([`${KEY}:999`, "bare-12"]);
  });

  it("a dep that would remap onto the ticket itself is carried and reported", () => {
    // Ticket 1's own dropped twin is id 83 in the same session: the export
    // resolves the ref to the ticket's own slug, and the loader must not
    // emit the self-edge the validator refuses.
    const bare = makeRow({
      slug: "selfish",
      oldId: 1,
      oldSource: "session-fork",
      createdAt: CREATED,
      updatedAt: UPDATED,
      dependsOn: [`${KEY}:83`],
    });
    const twin = makeRow({ slug: "selfish-2", oldId: 83, oldSource: "session-fork", createdAt: CREATED, updatedAt: UPDATED });
    const built = buildBoardMigrationDocument(makeInput({ rows: [bare, twin] }));
    const store = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    const load = store.importBoardDocument(built.doc);
    expect(load.unresolvedDependencies).toEqual([
      { ticketSlug: "selfish", ticketTitle: bare.title, ref: `${KEY}:83` },
    ]);
    const depId = load.newIds["selfish"]!;
    expect(store.getTicket(depId).dependsOn).toEqual([`${KEY}:83`]);
  });

  it("a dependency cycle refuses naming the tickets", () => {
    const a = makeRow({ slug: "cycle-a", oldId: 1, oldSource: "s", dependsOn: [`${KEY}:2`] });
    const b = makeRow({ slug: "cycle-b", oldId: 2, oldSource: "s", dependsOn: [`${KEY}:1`] });
    const { doc } = buildBoardMigrationDocument(makeInput({ rows: [a, b] }));
    const store = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    let message = "";
    try {
      store.importBoardDocument(doc);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("board migration dependency cycle");
    expect(message).toContain("(cycle-a)");
    expect(message).toContain("(cycle-b)");
    expect(store.ticketsFor(1)).toHaveLength(0);
  });

  it("orphan evidence refuses naming the missing ticket", () => {
    const row = makeRow({ slug: "orphan-host", oldId: 21, oldSource: "s" });
    const { doc } = buildBoardMigrationDocument(makeInput({ rows: [row] }));
    doc.evidence.push({ ticketSlug: "no-such-ticket", kind: "builtin:agent_report", author: "agent", at: UPDATED, payload: {} });
    const store = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    let message = "";
    try {
      store.importBoardDocument(doc);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("no-such-ticket");
    expect(store.ticketsFor(1)).toHaveLength(0);
  });

  it("a double import refuses before any allocation, changing nothing", () => {
    const row = makeRow({ slug: "once", oldId: 31, oldSource: "s" });
    const { doc } = buildBoardMigrationDocument(makeInput({ rows: [row] }));
    const store = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    const first = store.importBoardDocument(doc);
    expect(first.tickets).toBe(1);
    let message = "";
    try {
      store.importBoardDocument(doc);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("once");
    expect(store.ticketsFor(first.projectId)).toHaveLength(1);
  });
});

describe("#222 the load is a faithful round trip", () => {
  function roundTrip(doc: BoardMigrationDocument): { store: Store; load: ReturnType<Store["importBoardDocument"]> } {
    const store = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    const load = store.importBoardDocument(doc);
    return { store, load };
  }

  it("evidence newer than the last edit drags updatedAt, recorded by name", () => {
    const row = makeRow({ slug: "dragged", oldId: 41, oldSource: "s", updatedAt: UPDATED });
    const { doc } = buildBoardMigrationDocument(
      makeInput({
        rows: [row],
        evidence: [
          { oldSource: "s", oldId: 41, kind: "builtin:review_note", author: "agent", at: UPDATED + 100, payload: { late: true } },
        ],
      }),
    );
    const { store, load } = roundTrip(doc);
    expect(load.adjustedUpdatedAt).toEqual([{ slug: "dragged", from: UPDATED, to: UPDATED + 100 }]);
    expect(store.state.tickets.get(load.newIds["dragged"]!)!.updatedAt).toBe(UPDATED + 100);
  });

  it("arbitrary evidence payload keys survive verbatim with the float at exact", () => {
    const row = makeRow({ slug: "weird", oldId: 11, oldSource: "session-fork" });
    const payload = {
      SCREAMING_SINGLE_USE_KEY: { nested: [1, "two", null] },
      another_ad_hoc_key: "free text",
      count: 3,
      ratio: 0.1 + 0.2,
    };
    const at = 1789461285.24;
    const { doc } = buildBoardMigrationDocument(
      makeInput({
        rows: [row],
        evidence: [
          { oldSource: "session-fork", oldId: 11, kind: "custom:unregistered_kind", author: "user", at, payload },
        ],
      }),
    );
    // Through real JSON, as the file round trip does.
    const fileDoc = JSON.parse(JSON.stringify(doc)) as BoardMigrationDocument;
    const { store } = roundTrip(fileDoc);
    const rows = store.evidenceFor(store.ticketsFor(1)[0]!.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.payload).toEqual(payload);
    expect(rows[0]!.createdAt).toBe(at);
    expect(rows[0]!.kind).toBe("custom:unregistered_kind");
  });

  it("createdAt/updatedAt floats are preserved exactly, criteria stays a string", () => {
    const row = makeRow({ slug: "floats", oldId: 12, oldSource: "store", criteria: "line one\nline two" });
    const fileDoc = JSON.parse(JSON.stringify(buildBoardMigrationDocument(makeInput({ rows: [row] })).doc)) as BoardMigrationDocument;
    const { store, load } = roundTrip(fileDoc);
    const snapshot = store.state.tickets.get(load.newIds["floats"]!)!;
    expect(snapshot.createdAt).toBe(CREATED);
    expect(snapshot.updatedAt).toBe(UPDATED);
    expect(snapshot.criteria).toBe("line one\nline two");
  });

  it("tags absent stays absent (untagged); tags present are kept", () => {
    const untagged = makeRow({ slug: "plain", oldId: 13, tags: [] });
    const tagged = makeRow({ slug: "labelled", oldId: 14, tags: ["data-loss", "cutover-blocker"] });
    const { doc } = buildBoardMigrationDocument(makeInput({ rows: [untagged, tagged] }));
    expect(doc.tickets.find((ticket) => ticket.slug === "plain")!.tags).toBeUndefined();
    const fileDoc = JSON.parse(JSON.stringify(doc)) as BoardMigrationDocument;
    const { store, load } = roundTrip(fileDoc);
    expect(store.state.tickets.get(load.newIds["plain"]!)!.tags).toEqual([]);
    expect(store.state.tickets.get(load.newIds["labelled"]!)!.tags).toEqual(["data-loss", "cutover-blocker"]);
  });

  it("states transfer as-is with no re-gating, comments land", () => {
    const done = makeRow({ slug: "already-done", oldId: 15, state: "done" });
    const { doc } = buildBoardMigrationDocument(
      makeInput({
        rows: [done],
        comments: [{ oldSource: "store", oldId: 15, text: "shipped", author: "user", at: UPDATED }],
      }),
    );
    const { store, load } = roundTrip(doc);
    expect(load.comments).toBe(1);
    const snapshot = store.state.tickets.get(load.newIds["already-done"]!)!;
    expect(snapshot.state).toBe("done");
    expect(store.commentsFor(load.newIds["already-done"]!)).toMatchObject([{ text: "shipped", author: "user", at: UPDATED }]);
  });

  it("plan and phases land whole-value from the live source", () => {
    const row = makeRow({ slug: "only", oldId: 16 });
    const { doc } = buildBoardMigrationDocument(makeInput({ rows: [row] }));
    const { store, load } = roundTrip(doc);
    expect(load.plans).toBe(1);
    expect(load.phases).toBe(1);
    const plan = store.getPlanMeta(load.projectId);
    expect(plan.preamble).toBe("live preamble");
    expect(plan.rules).toBe("live rules");
    expect(plan.contextSections).toHaveLength(1);
    expect(store.phasesFor(load.projectId)).toEqual([{ projectId: load.projectId, number: 1, title: "aidos core", state: "open" }]);
  });

  it("fresh ids come from the store counter and the coverage check passes", () => {
    const rows = [makeRow({ slug: "a", oldId: 40 }), makeRow({ slug: "b", oldId: 41 })];
    const { doc } = buildBoardMigrationDocument(makeInput({ rows }));
    const { store, load } = roundTrip(doc);
    expect(Object.values(load.newIds).sort((x, y) => x - y)).toEqual([1, 2]);
    const boardRows = doc.tickets.map((ticket) => ({
      id: load.newIds[ticket.slug]!,
      title: ticket.title,
      workspaceKey: KEY,
      slug: ticket.slug,
    }));
    const identities = new Set(
      [...store.state.tickets.values()].map((snapshot) => snapshot.workspaceKey + ":" + snapshot.slug),
    );
    const { missingCount, missing } = boardStoreDivergence(boardRows, identities);
    expect(store.ticketsFor(load.projectId)).toHaveLength(doc.tickets.length);
    expect(missingCount).toBe(0);
    expect(missing).toEqual([]);
  });
});

describe("#222 the Remote never runs automatically and writes new paths only", () => {
  const HARNESS_WS = "/home/sid/repos/aidos";

  function tmpJson(): string {
    return join(mkdtempSync(join(tmpdir(), "mig-")), "board-migration.json");
  }

  function provideEmptyPersistence(harness: ReturnType<typeof createHarness>): void {
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [],
      inspect: async () => {
        throw new Error("not found");
      },
    });
  }

  it("a bare call defaults to dry run and writes no store", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    await service.workspaceTickets(harness.asAgent());

    const jsonPath = tmpJson();
    const out = await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    expect(out.dryRun).toBe(true);
    if (!out.dryRun) throw new Error("expected a dry run");
    expect(out.jsonPath).toBe(jsonPath);
    expect(existsSync(jsonPath)).toBe(true);
    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument;
    expect(doc.version).toBe(1);
    expect(doc.tickets.length).toBeGreaterThanOrEqual(1);
    expect(doc.exportReport).toMatchObject({ retiredExcluded: 0, backfillVerified: true });
    expect(doc.exportReport.exportedSlugs).toHaveLength(doc.tickets.length);
    // No candidate store anywhere near the JSON, and no default-path file.
    expect(existsSync(join(jsonPath, "..", "board.migrated.db"))).toBe(false);
    expect(existsSync(out.defaultStorePath)).toBe(false);
    expect(out.report.ticketsExported).toBe(doc.tickets.length);
  });

  it("a storeless dry run creates no store file and reports unverified", async () => {
    // No persistence, no tickets: nothing to verify against and nothing to
    // create. The old plan-source path opened the store here (an empty file
    // with a project row); the migration must not.
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    const service = harness.service;
    const jsonPath = tmpJson();
    const out = await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    expect(out.dryRun).toBe(true);
    if (!out.dryRun) throw new Error("expected a dry run");
    expect(out.backfillVerified).toBe(false);
    const { storePathForWorkspace } = await import("../src/host/storage-sqlite");
    expect(existsSync(storePathForWorkspace(HARNESS_WS))).toBe(false);
    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument;
    expect(doc.tickets).toEqual([]);
    expect(doc.exportReport.backfillVerified).toBe(false);
  });

  it("one retired ticket in two folds counts once, and the real run refuses it", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    const ticket = service.userSetTicket(harness.asAgent(), { title: "Doomed" });
    service.userRetireTicket(harness.asAgent(), { ticketId: ticket.id, reason: "stale" });
    // A second fold holding the same identity, retired there too.
    const peer = harness.makeAgent({ id: "session-peer" });
    (peer.session.header as { cwd?: string }).cwd = HARNESS_WS;
    const peerStore = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    const peerProject = peerStore.createProject(HARNESS_WS, "aidos");
    peerStore.createTicket(peerProject, "Doomed", "Doomed body");
    for (const event of peerStore.events()) {
      harness.appendAidosEvent(peer, event);
    }
    harness.appendAidosEvent(peer, {
      kind: "evidence/attached",
      version: 1,
      ticketId: 1,
      row: { kind: "builtin:retired", author: "user", at: FIXED_NOW + 1, payload: { reason: "stale" } },
    } as never);
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    const dry = await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    expect(dry.dryRun).toBe(true);
    if (!dry.dryRun) throw new Error("expected a dry run");
    // Two retired copies, one distinct identity.
    expect(dry.report.retiredExcluded).toBe(1);
    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument;
    expect(doc.exportReport.retiredExcluded).toBe(1);
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath: join(dir, "board.migrated.db") }),
    ).rejects.toThrow("retired");
  });

  it("the live path is refused as a candidate, and the real run verifies itself", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    const first = service.userSetTicket(harness.asAgent(), { title: "First" });
    service.userSetTicket(harness.asAgent(), { title: "Second", dependsOn: [`${workspaceKeyFromPath(HARNESS_WS)}:${first.id}`] });
    service.userAttachEvidence(harness.asAgent(), { ticketId: first.id, kind: "builtin:agent_report", payload: { note: "kept" } });
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    const dry = await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    expect(dry.dryRun).toBe(true);

    // The live store path is never a legal candidate.
    const { storePathForWorkspace } = await import("../src/host/storage-sqlite");
    const livePath = storePathForWorkspace(HARNESS_WS);
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath: livePath }),
    ).rejects.toThrow("refusing to write the candidate over the live store");

    const storePath = join(dir, "board.migrated.db");
    const before = await service.storeCoverage(harness.asAgent());
    const real = await service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath });
    expect(real.dryRun).toBe(false);
    if (real.dryRun) throw new Error("expected a real run");
    expect(real.storePath).toBe(storePath);
    expect(real.verification.ticketCountMatches).toBe(true);
    expect(real.verification.exportLoss).toEqual([]);
    expect(real.verification.drift).toEqual([]);
    expect(real.verification.humanRemoved).toEqual([]);
    expect(real.verification.lossless).toBe(true);
    expect(real.load.edgesRewritten).toBe(1);
    // The evidence attached after the last edit may drag updatedAt forward
    // (Rule 6) — recorded by name when it does, and it never gates
    // lossless. Same-millisecond runs drag nothing; either outcome is
    // honest, so the test pins the shape, not the count.
    for (const entry of real.verification.adjustedUpdatedAt) {
      expect(entry.slug).toBe("first");
      expect(entry.to).toBeGreaterThanOrEqual(entry.from);
    }
    // The live store is untouched: same rows before and after. Real-live
    // safety rests on the guard layers (path, workspace, slug, fresh-file
    // refusal — each pinned above or in the loader tests), which the
    // reviewer verified manually; the count is the in-harness tripwire.
    const after = await service.storeCoverage(harness.asAgent());
    expect(after.storeRows).toBe(before.storeRows);
    expect(existsSync(storePath)).toBe(true);
  });

  it("a headerless file refuses: unknown provenance cannot certify", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as Record<string, unknown>;
    delete doc["exportReport"];
    writeFileSync(jsonPath, JSON.stringify(doc));
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath: join(dir, "board.migrated.db") }),
    ).rejects.toThrow("no export report");
  });

  it("an unverified export refuses before the candidate is touched", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument;
    doc.exportReport.backfillVerified = false;
    writeFileSync(jsonPath, JSON.stringify(doc));
    const storePath = join(dir, "board.migrated.db");
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath }),
    ).rejects.toThrow("unverified");
    expect(existsSync(storePath)).toBe(false);
  });

  it("an over-cap plan refuses before the candidate is touched", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument;
    doc.plan.context.preamble = "line\n".repeat(3000);
    writeFileSync(jsonPath, JSON.stringify(doc));
    const storePath = join(dir, "board.migrated.db");
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath }),
    ).rejects.toThrow("over the 2000-line cap");
    expect(existsSync(storePath)).toBe(false);
  });

  it("the pre-check fires before any load: a pre-existing candidate is untouched", async () => {
    // Without the pre-check, this run would reach the loader and die on
    // the slug guard (double import) instead — a different error, and the
    // candidate would have been opened. The pre-check refuses first.
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    const storePath = join(dir, "board.migrated.db");
    const first = await service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath });
    expect(first.dryRun).toBe(false);
    if (first.dryRun) throw new Error("expected a real run");
    expect(first.verification.lossless).toBe(true);
    const blessed = readFileSync(storePath, "utf8");

    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument;
    doc.plan.context.preamble = "line\n".repeat(3000);
    writeFileSync(jsonPath, JSON.stringify(doc));
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath }),
    ).rejects.toThrow("over the 2000-line cap");
    expect(readFileSync(storePath, "utf8")).toBe(blessed);
  });

  it("export loss refuses board-relative and deletes its own file", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    service.userSetTicket(harness.asAgent(), { title: "Vanishes" });
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    // Simulate a walk that missed a row: strip it from the tickets AND
    // from the export header, so it is loss rather than hand-removal.
    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument;
    const slug = doc.tickets.find((ticket) => ticket.title === "Vanishes")!.slug;
    doc.tickets = doc.tickets.filter((ticket) => ticket.slug !== slug);
    doc.exportReport.exportedSlugs = doc.exportReport.exportedSlugs.filter((entry) => entry !== slug);
    writeFileSync(jsonPath, JSON.stringify(doc));
    const storePath = join(dir, "board.migrated.db");
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath }),
    ).rejects.toThrow(new RegExp(slug));
    expect(existsSync(storePath)).toBe(false);
  });

  it("hand-deleted rows are acknowledged, not refused", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    service.userSetTicket(harness.asAgent(), { title: "Cut by hand" });
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    // The EDIT step: delete from the tickets, leave the header intact.
    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument;
    const cutSlug = doc.tickets.find((ticket) => ticket.title === "Cut by hand")!.slug;
    doc.tickets = doc.tickets.filter((ticket) => ticket.slug !== cutSlug);
    writeFileSync(jsonPath, JSON.stringify(doc));
    const real = await service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath: join(dir, "board.migrated.db") });
    expect(real.dryRun).toBe(false);
    if (real.dryRun) throw new Error("expected a real run");
    expect(real.verification.humanRemoved.map((entry) => entry.slug)).toEqual([cutSlug]);
    expect(real.verification.exportLoss).toEqual([]);
    expect(real.verification.lossless).toBe(false);
  });

  it("rows born after the export are drift: named, never refused", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    const exportedAt = (JSON.parse(readFileSync(jsonPath, "utf8")) as BoardMigrationDocument).exportedAt;
    // The board moves on: a row born after exportedAt cannot be exported.
    // A controlled clock (not wall time) keeps the partition deterministic.
    const peer = harness.makeAgent({ id: "session-peer" });
    (peer.session.header as { cwd?: string }).cwd = HARNESS_WS;
    const peerStore = makeStore(makeConfig(), { now: () => exportedAt + 100, storage: new MemoryStorage() });
    const peerProject = peerStore.createProject(HARNESS_WS, "aidos");
    peerStore.createTicket(peerProject, "Born late", "Born late body");
    for (const event of peerStore.events()) {
      harness.appendAidosEvent(peer, event);
    }
    const real = await service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath: join(dir, "board.migrated.db") });
    expect(real.dryRun).toBe(false);
    if (real.dryRun) throw new Error("expected a real run");
    expect(real.verification.drift.map((entry) => entry.slug)).toEqual(["born-late"]);
    expect(real.verification.exportLoss).toEqual([]);
    expect(real.verification.lossless).toBe(false);
  });
});

describe("#222 the dry-to-real seam with stem pairs on the board", () => {
  const HARNESS_WS = "/home/sid/repos/aidos";

  function provideEmptyPersistence(harness: ReturnType<typeof createHarness>): void {
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [],
      inspect: async () => {
        throw new Error("not found");
      },
    });
  }

  function seedPeerPair(now: () => number, harness: ReturnType<typeof createHarness>): void {
    // Two folds holding dupe and dupe-2 with identical createdAt — the
    // exact shape of all 82 live pairs. The fixed clock makes the pair
    // deterministic; the direction depends on the passed clock.
    const peer = harness.makeAgent({ id: "session-peer" });
    (peer.session.header as { cwd?: string }).cwd = HARNESS_WS;
    const peerStore = makeStore(makeConfig(), { now, storage: new MemoryStorage() });
    const peerProject = peerStore.createProject(HARNESS_WS, "aidos");
    peerStore.createTicket(peerProject, "dupe", "dupe body");
    peerStore.createTicket(peerProject, "dupe-2", "dupe-2 body");
    for (const event of peerStore.events()) {
      harness.appendAidosEvent(peer, event);
    }
  }

  it("bare survives: the dropped twin exonerates, lossless holds", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    seedPeerPair(() => FIXED_NOW, harness);
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    const dry = await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    expect(dry.dryRun).toBe(true);
    if (!dry.dryRun) throw new Error("expected a dry run");
    expect(dry.report.duplicatesMatched).toBe(1);
    expect(dry.report.duplicatesDropped).toEqual(["dupe-2"]);

    const real = await service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath: join(dir, "board.migrated.db") });
    expect(real.dryRun).toBe(false);
    if (real.dryRun) throw new Error("expected a real run");
    expect(real.verification.exportLoss).toEqual([]);
    expect(real.verification.exoneratedDuplicates).toEqual([{ droppedSlug: "dupe-2", keptSlug: "dupe" }]);
    expect(real.verification.lossless).toBe(true);
  });

  it("suffixed survives: the dropped bare exonerates, lossless holds", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    // The twin moves further after the shared birth: same createdAt,
    // newer updatedAt — the 68/150 direction. One clock for the birth,
    // a later set for the move (a set bumps updatedAt, never createdAt).
    let now = FIXED_NOW;
    const peer = harness.makeAgent({ id: "session-peer" });
    (peer.session.header as { cwd?: string }).cwd = HARNESS_WS;
    const peerStore = makeStore(makeConfig(), { now: () => now, storage: new MemoryStorage() });
    const peerProject = peerStore.createProject(HARNESS_WS, "aidos");
    peerStore.createTicket(peerProject, "dupe", "dupe body");
    peerStore.createTicket(peerProject, "dupe-2", "dupe-2 body");
    now = FIXED_NOW + 100;
    peerStore.setTicket(2, { description: "moved further" });
    for (const event of peerStore.events()) {
      harness.appendAidosEvent(peer, event);
    }
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    const dry = await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    expect(dry.dryRun).toBe(true);
    if (!dry.dryRun) throw new Error("expected a dry run");
    expect(dry.report.duplicatesMatched).toBe(1);
    expect(dry.report.duplicatesDropped).toEqual(["dupe"]);

    const real = await service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath: join(dir, "board.migrated.db") });
    expect(real.dryRun).toBe(false);
    if (real.dryRun) throw new Error("expected a real run");
    expect(real.verification.exportLoss).toEqual([]);
    expect(real.verification.exoneratedDuplicates).toEqual([{ droppedSlug: "dupe", keptSlug: "dupe-2" }]);
    expect(real.verification.lossless).toBe(true);
  });

  it("loading into a pre-existing non-empty file refuses before any write", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });
    const storePath = join(dir, "board.migrated.db");
    const first = await service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath });
    expect(first.dryRun).toBe(false);
    if (first.dryRun) throw new Error("expected a real run");
    const blessed = readFileSync(storePath, "utf8");

    // The board moves on; the second document differs — but the refusal
    // must fire before the loader opens the file, not after growing it.
    service.userSetTicket(harness.asAgent(), { title: "Other" });
    const jsonPath2 = join(dir, "board-migration-2.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath: jsonPath2 });
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath: jsonPath2, storePath }),
    ).rejects.toThrow("non-empty");
    expect(readFileSync(storePath, "utf8")).toBe(blessed);
  });
});

describe("#222 exoneration requires the keeper in the candidate", () => {
  const HARNESS_WS = "/home/sid/repos/aidos";

  function provideEmptyPersistence(harness: ReturnType<typeof createHarness>): void {
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [],
      inspect: async () => {
        throw new Error("not found");
      },
    });
  }

  it("hand-trimming the keeper refuses, naming the keeper and the unexonerated drop", async () => {
    const harness = createHarness(undefined, { cwd: HARNESS_WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    // Tie pair: bare dupe kept, dupe-2 dropped by convention.
    const peer = harness.makeAgent({ id: "session-peer" });
    (peer.session.header as { cwd?: string }).cwd = HARNESS_WS;
    const peerStore = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    const peerProject = peerStore.createProject(HARNESS_WS, "aidos");
    peerStore.createTicket(peerProject, "dupe", "dupe body");
    peerStore.createTicket(peerProject, "dupe-2", "dupe-2 body");
    for (const event of peerStore.events()) {
      harness.appendAidosEvent(peer, event);
    }
    await service.workspaceTickets(harness.asAgent());

    const dir = mkdtempSync(join(tmpdir(), "mig-"));
    const jsonPath = join(dir, "board-migration.json");
    await service.migrateBoardToFreshStore(harness.asAgent(), { jsonPath });

    // The EDIT step: trim the keeper, its evidence and its comments —
    // the drop's exoneration dies with the keeper it names.
    const doc = JSON.parse(readFileSync(jsonPath, "utf8")) as {
      tickets: Array<{ slug: string }>;
      evidence: Array<{ ticketSlug: string }>;
      comments: Array<{ ticketSlug: string }>;
    };
    doc.tickets = doc.tickets.filter((ticket) => ticket.slug !== "dupe");
    doc.evidence = doc.evidence.filter((row) => row.ticketSlug !== "dupe");
    doc.comments = doc.comments.filter((row) => row.ticketSlug !== "dupe");
    writeFileSync(jsonPath, JSON.stringify(doc, null, 2) + "\n");

    const storePath = join(dir, "board.migrated.db");
    const attempt = service.migrateBoardToFreshStore(harness.asAgent(), {
      dryRun: false,
      jsonPath,
      storePath,
    });
    // Exact phrases, quoted: a bare "dupe" must never pass as a substring
    // of its twin "dupe-2" — the quotes make each name a whole name.
    await expect(attempt).rejects.toThrow('"dupe" (named keeper of drop "dupe-2")');
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath }),
    ).rejects.toThrow('drop "dupe-2"');
    // Nothing blessed: no candidate on disk.
    expect(existsSync(storePath)).toBe(false);
  });
});
