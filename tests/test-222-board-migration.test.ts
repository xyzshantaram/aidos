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
 * Criterion map (one `it` per line, in order):
 *   identity is stem pair plus identical createdAt —
 *     differing createdAt is no pair even with a matching stem
 *   resolution keeps the newer updatedAt on either side —
 *     bare-newer keeps bare, twin-newer keeps the twin (68/150)
 *   exact ties keep the bare row by convention and are trivial
 *   a legitimately-suffixed non-duplicate survives —
 *     same stem shape, differing createdAt (the-one-time-backfill-2)
 *   a suffixed slug with no bare base survives, and a non-numeric
 *     suffix is never a pair
 *   a dropped twin's unique history forwards onto the survivor,
 *     exact row-identity dupes drop
 *   `builtin:imported_state` evidence is dropped at export and counted
 *   winner selection across copies is newest-wins
 *   dependency refs into a dropped row land on the survivor whichever
 *     side survived (bare-kept and twin-kept directions)
 *   an unresolvable ref is carried verbatim AND reported by name
 *   a dep that would remap onto the ticket itself is carried and reported
 *   arbitrary evidence payload keys survive verbatim (float `at` exact)
 *   createdAt/updatedAt floats are preserved exactly through JSON
 *   tags absent stays absent (untagged); tags present are kept
 *   states transfer as-is with no re-gating (done, no evidence)
 *   comments and plan/phases land in the fresh store
 *   the loaded store passes its own coverage check with missingCount 0
 *   a dry run writes no store (candidate absent, live bytes identical)
 *   a bare call defaults to dry run; the live path is refused as candidate
 *   the real run loads the (edited) JSON and verifies itself
 */

import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
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
    retiredExcluded: 0,
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
    expect(pairs[0]!.reason).toContain("newer updatedAt wins");
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
    expect(pair.reason).toContain("newer updatedAt wins");
    expect(droppedSlugs.size).toBe(1);
  });

  it("exact ties keep the bare row by convention and are trivial", () => {
    const bare = makeRow({ slug: "tied", title: "Same", state: "open", createdAt: CREATED, updatedAt: UPDATED });
    const twin = makeRow({ slug: "tied-2", title: "Same", state: "open", createdAt: CREATED, updatedAt: UPDATED });
    const { pairs } = findBoardMigrationDuplicates([bare, twin]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ keptSlug: "tied", droppedSlug: "tied-2", nontrivial: false });
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
});

describe("#222 the load is a faithful round trip", () => {
  function roundTrip(doc: BoardMigrationDocument): { store: Store; load: ReturnType<Store["importBoardDocument"]> } {
    const store = makeStore(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
    const load = store.importBoardDocument(doc);
    return { store, load };
  }

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
    // No candidate store anywhere near the JSON, and no default-path file.
    expect(existsSync(join(jsonPath, "..", "board.migrated.db"))).toBe(false);
    expect(existsSync(out.defaultStorePath)).toBe(false);
    expect(out.report.ticketsExported).toBe(doc.tickets.length);
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
    const liveText = existsSync(livePath) ? readFileSync(livePath, "utf8") : null;
    await expect(
      service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath: livePath }),
    ).rejects.toThrow("refusing to write the candidate over the live store");

    const storePath = join(dir, "board.migrated.db");
    const real = await service.migrateBoardToFreshStore(harness.asAgent(), { dryRun: false, jsonPath, storePath });
    expect(real.dryRun).toBe(false);
    if (real.dryRun) throw new Error("expected a real run");
    expect(real.storePath).toBe(storePath);
    expect(real.verification.ticketCountMatches).toBe(true);
    expect(real.verification.missingCount).toBe(0);
    expect(real.verification.lossless).toBe(true);
    expect(real.load.edgesRewritten).toBe(1);
    // The live store is byte-identical: the candidate is a NEW path.
    if (liveText !== null) {
      expect(readFileSync(livePath, "utf8")).toBe(liveText);
    }
    expect(existsSync(storePath)).toBe(true);
  });
});
