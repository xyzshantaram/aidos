/**
 * #211: the backfill stops losing data silently.
 *
 * #41's independent review found two losses sharing one root — the import
 * is LOSSY and says nothing about it — and the owner's 2026-09-13 cutover
 * decision turned them from a defect into prospective data loss: under a
 * one-shot migration there is no later importer, so anything not moved is
 * gone, and anything dropped silently is gone without a name.
 *
 * Criterion map (each describes FIRST, so the promise reads before the proof):
 *   1. the marker records the importer version and the kinds it skipped,
 *      so a later importer can tell whether its predecessor left work undone
 *   2. a workspace a v1 importer left behind is COMPLETED by v2 rather than
 *      skipped by the marker, and the completion imports nothing twice
 *   3. plan/change and phase/set events are imported with their references
 *      mapped, or the marker records by name that they were skipped and why
 *   4. every dropped dependency edge is recorded with its source and the ref
 *   5. the recorded drops are readable by the #209 migration script, so its
 *      summary reports real edges rather than a comforting zero
 *   6. a backfill that loses nothing records that it lost nothing
 *
 * Session logs here are built the real way (each its own Store on its own
 * port, the store's log wrapped the way `inspect` wraps it), exactly like
 * the #41 suite's sessionLog helper.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Store } from "../src/kernel/store";
import { foldSessionLog } from "../src/kernel/backfill";
import { MemoryStorage } from "../src/kernel/storage-memory";
import type { StoragePort } from "../src/kernel/storage";
import { openSqliteStorage } from "../src/host/storage-sqlite";
import { workspaceKeyFromPath } from "../src/kernel/slug";
import type { AidosEvent } from "../src/kernel/events";
import { FIXED_NOW, makeConfig } from "./helpers";

const WORKSPACE = "/srv/proj/alpha";
const KEY = workspaceKeyFromPath(WORKSPACE);
const FOREIGN_WORKSPACE = "/srv/proj/beta";

/**
 * Build one session log the real way: its own Store on its own ephemeral
 * port folds real writes, and the store's log becomes the session's log —
 * each event wrapped in the envelope `sessionPersistence.inspect` returns.
 */
function sessionLog(
  sessionId: string,
  build: (store: Store) => void,
): { sessionId: string; events: { seq: number; type: string; data: AidosEvent }[] } {
  const store = new Store(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
  store.createProject(WORKSPACE, "alpha");
  build(store);
  return {
    sessionId,
    events: store.events().map((data, index) => ({
      seq: index + 1,
      type: data.kind,
      data,
    })),
  };
}

/** A throwaway sqlite port for the workspace store under test. */
function withSqlite(fn: (storage: StoragePort) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "aidos-211-db-"));
  const storage = openSqliteStorage(join(dir, "board.db"));
  try {
    fn(storage);
  } finally {
    storage.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The workspace store under test, with its project already in place. */
function targetStore(storage: StoragePort): { store: Store; projectId: number } {
  const store = new Store(makeConfig(), { now: () => FIXED_NOW, storage });
  const projectId = store.createProject(WORKSPACE, "alpha");
  return { store, projectId };
}

/** A source session with plan meta, one phase, and one refusal in it. */
function richLog(sessionId: string): ReturnType<typeof sessionLog> {
  return sessionLog(sessionId, (store) => {
    const project = store.findProject(WORKSPACE)!;
    const ticket = store.createTicket(project, "Kept", "d");
    store.setPlanMeta(project, {
      frontmatter: "owner: sid",
      preamble: "the plan",
      contextSections: [{ heading: "scope", text: "everything", index: 0 }],
      rules: "no shortcuts",
    });
    store.setPhase(project, 2, { title: "Build", state: "open" });
    // open -> done skips states, so the move is refused AND recorded: the
    // refusal history the import must carry across.
    try {
      store.moveTicket(ticket, "done", "agent");
    } catch {
      // The refusal is the fixture; the throw is its echo.
    }
  });
}

describe("#211 criterion 1: the marker versions the importer and its skips", () => {
  it("a v3 marker names the importer version and the unreplayed kinds", () => {
    withSqlite((storage) => {
      const { store, projectId } = targetStore(storage);
      expect(store.backfillReport()).toBeNull();
      store.backfillSessionLogs(projectId, [richLog("session-a")]);

      const marker = store.events().at(-1)!;
      expect(marker.kind).toBe("backfill/completed");
      if (marker.kind !== "backfill/completed" || marker.version !== 3) {
        throw new Error("expected the v3 marker");
      }
      expect(marker.importerVersion).toBe(3);
      // The source-local project records get no direct replay: the import
      // targets the single project it was handed.
      expect(marker.skippedKinds).toContain("project/created");
      expect(marker.ticketMap.length).toBe(1);

      // And the #209-shaped report reads the same record back.
      const report = store.backfillReport()!;
      expect(report.importerVersion).toBe(3);
      expect(report.dropsUnknown).toBe(false);
      expect(report.skippedKinds).toContain("project/created");
    });
  });

  it("a v1 marker reads back as unknown losses, never as success", () => {
    withSqlite((storage) => {
      const { store, projectId } = targetStore(storage);
      // A v1 marker, exactly as #41 wrote it: counts alone.
      store.commitHostMirror(
        {
          kind: "backfill/completed",
          version: 1,
          sessionIds: ["session-a"],
          tickets: 1,
          evidence: 0,
          comments: 0,
          at: FIXED_NOW,
        },
        () => undefined,
      );
      void projectId;
      const report = store.backfillReport()!;
      expect(report.importerVersion).toBe(1);
      expect(report.dropsUnknown).toBe(true);
      expect(report.lossless).toBe(false);
      // The v1 blind spots are known even without the source logs.
      expect(report.skippedKinds).toContain("plan/change");
      expect(report.skippedKinds).toContain("phase/set");
      expect(report.skippedKinds).toContain("aidos/refusal");
    });
  });
});

describe("#211 criterion 2: v2 completes a v1 workspace and imports nothing twice", () => {
  it("plans, phases, refusals and recomputed drops land; tickets do not move", () => {
    withSqlite((storage) => {
      // The source: two tickets (one dangling, one chained), plan meta, a
      // phase, and a refusal on the first ticket.
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        const kept = store.createTicket(project, "Kept", "d", {
          dependsOn: [`${KEY}:99`],
        });
        store.createTicket(project, "Newcomer", "d", {
          dependsOn: [`${KEY}:1`],
        });
        store.setPlanMeta(project, {
          frontmatter: "owner: sid",
          preamble: "the plan",
          contextSections: [{ heading: "scope", text: "everything", index: 0 }],
          rules: "no shortcuts",
        });
        store.setPhase(project, 2, { title: "Build", state: "open" });
        try {
          store.moveTicket(kept, "done", "agent");
        } catch {
          // The refusal is the fixture; the throw is its echo.
        }
      });

      // The v1 aftermath, faithfully: both tickets imported with origins
      // stamped, the dangling edge dropped SILENTLY, plans/phases/refusals
      // never touched, counts-only marker on top. Only "Kept" is staged —
      // "Newcomer" is a ticket no run has imported, and the completion must
      // pick it up like new.
      const { store, projectId } = targetStore(storage);
      const fold = foldSessionLog(logA);
      const keptFinal = fold.state.tickets.get(1)!;
      const keptId = store.allocateTicketId();
      const keptSeq = fold.seqOfTicket.get(1) ?? null;
      store.commitHostMirror(
        {
          kind: "ticket/change",
          version: 1,
          operation: "create",
          ticket: {
            ...keptFinal,
            id: keptId,
            projectId,
            workspaceKey: KEY,
            state: "open",
            dependsOn: [],
            revision: 1,
            createdAt: keptFinal.createdAt,
            updatedAt: keptFinal.createdAt,
          },
          at: keptFinal.createdAt,
        },
        () => undefined,
        { sessionId: "session-a", localSeq: keptSeq },
      );
      store.commitHostMirror(
        {
          kind: "ticket/change",
          version: 1,
          operation: "set",
          ticket: {
            ...keptFinal,
            id: keptId,
            projectId,
            workspaceKey: KEY,
            dependsOn: [],
            revision: 2,
            updatedAt: keptFinal.updatedAt,
          },
          at: keptFinal.updatedAt,
        },
        () => undefined,
      );
      store.commitHostMirror(
        {
          kind: "backfill/completed",
          version: 1,
          sessionIds: ["session-a"],
          tickets: 1,
          evidence: 0,
          comments: 0,
          at: FIXED_NOW,
        },
        () => undefined,
      );
      expect(store.ticketsFor(projectId).length).toBe(1);

      // The completion.
      const result = store.backfillSessionLogs(projectId, [logA]);
      expect(result.alreadyRan).toBe(false);
      // "Newcomer" is new: exactly one ticket lands, chained to Kept.
      expect(result.tickets).toBe(1);
      expect(store.ticketsFor(projectId).length).toBe(2);
      const newcomer = store.ticketsFor(projectId).find((row) => row.title === "Newcomer")!;
      expect(newcomer.dependsOn).toEqual([`${KEY}:${keptId}`]);
      expect(result.edgesRewritten).toBe(1);
      // v1's silent drop is recomputed and NAMED from the source log.
      expect(result.droppedDependencies.length).toBe(1);
      expect(result.droppedDependencies[0]).toMatchObject({
        fromSessionId: "session-a",
        fromLocalId: 1,
        fromNewId: keptId,
        fromTitle: "Kept",
        ref: `${KEY}:99`,
      });
      expect(result.droppedDependencies[0]!.reason).toMatch(/no imported log/);
      // The history v1 never moved now moves, remapped to the kept id.
      expect(result.plans).toBe(1);
      expect(result.phases).toBe(1);
      expect(result.refusals).toBe(1);
      expect(store.getPlanMeta(projectId)).toMatchObject({
        frontmatter: "owner: sid",
        preamble: "the plan",
        rules: "no shortcuts",
      });
      expect(store.phasesFor(projectId)).toContainEqual({
        projectId,
        number: 2,
        title: "Build",
        state: "open",
      });
      const refusals = store
        .events()
        .filter((event) => event.kind === "aidos/refusal");
      expect(refusals.length).toBe(1);
      expect(refusals[0]).toMatchObject({ ticketId: keptId });

      // The completion wrote the v3 marker, so the next call is a no-op —
      // and still a readable report.
      const marker = store.events().at(-1)!;
      if (marker.kind !== "backfill/completed" || marker.version !== 3) {
        throw new Error("expected the v3 marker");
      }
      expect(marker.ticketMap.length).toBe(2);
      expect(marker.droppedDependencies.length).toBe(1);
      const again = store.backfillSessionLogs(projectId, [logA]);
      expect(again.alreadyRan).toBe(true);
      expect(store.ticketsFor(projectId).length).toBe(2);
    });
  });
});

describe("#211 criterion 3: plans and phases map, or are skipped by name", () => {
  it("a foreign project's plan and phase are reported, never silently left", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Kept", "d");
        store.setPlanMeta(project, {
          frontmatter: "alpha plan",
          preamble: "pre",
          contextSections: [],
          rules: "",
        });
        store.setPhase(project, 2, { title: "Build", state: "open" });
        // A second source project for a DIFFERENT workspace: its history
        // has no equivalent in the target, so it must be named, not moved.
        const beta = store.createProject(FOREIGN_WORKSPACE, "beta");
        store.setPlanMeta(beta, {
          frontmatter: "beta plan",
          preamble: "pre",
          contextSections: [],
          rules: "",
        });
        store.setPhase(beta, 3, { title: "Beta phase", state: "open" });
      });
      const { store, projectId } = targetStore(storage);
      const result = store.backfillSessionLogs(projectId, [logA]);

      // The workspace's own history moves.
      expect(result.plans).toBe(1);
      expect(result.phases).toBe(1);
      expect(store.getPlanMeta(projectId).frontmatter).toBe("alpha plan");
      expect(store.phasesFor(projectId)).toContainEqual({
        projectId,
        number: 2,
        title: "Build",
        state: "open",
      });
      // The foreign history is named with its reason.
      expect(result.skippedPlans.length).toBe(1);
      expect(result.skippedPlans[0]).toMatchObject({
        sessionId: "session-a",
        absPath: FOREIGN_WORKSPACE,
      });
      expect(result.skippedPlans[0]!.reason).toMatch(/no workspace equivalent/);
      expect(result.skippedPhases.length).toBe(1);
      expect(result.skippedPhases[0]).toMatchObject({
        sessionId: "session-a",
        number: 3,
        title: "Beta phase",
      });
      expect(result.skippedPhases[0]!.reason).toMatch(/no workspace equivalent/);
      expect(result.lossless).toBe(false);
      // The marker persists the names for the human deciding on the cutover.
      const report = store.backfillReport()!;
      expect(report.skippedPlans.length).toBe(1);
      expect(report.skippedPhases.length).toBe(1);
    });
  });
});

describe("#211 criteria 4+5: every dropped edge is named and readable", () => {
  it("dangling and malformed refs are recorded; good edges are counted", () => {
    withSqlite((storage) => {
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Foundation", "d");
      });
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Dependent", "d", {
          dependsOn: ["session-b:1", `${KEY}:99`, "no-colon-here"],
        });
      });
      const { store, projectId } = targetStore(storage);
      expect(store.backfillReport()).toBeNull();
      const result = store.backfillSessionLogs(projectId, [logB, logA]);

      const rows = store.ticketsFor(projectId);
      const foundation = rows.find((row) => row.title === "Foundation")!;
      const dependent = rows.find((row) => row.title === "Dependent")!;
      // The good edge followed the renumbering; the bad ones did not.
      expect(dependent.dependsOn).toEqual([`${KEY}:${foundation.id}`]);
      expect(result.edgesRewritten).toBe(1);
      expect(result.droppedDependencies.length).toBe(2);
      const refs = result.droppedDependencies.map((drop) => drop.ref).sort();
      expect(refs).toEqual([`${KEY}:99`, "no-colon-here"]);
      for (const drop of result.droppedDependencies) {
        expect(drop.fromTitle).toBe("Dependent");
        expect(drop.fromNewId).toBe(dependent.id);
        expect(drop.reason.length).toBeGreaterThan(0);
      }
      expect(result.lossless).toBe(false);

      // #209's consumer: the marker — not a predicted fold — carries the
      // real lists, and the report reads them back.
      const marker = store.events().at(-1)!;
      if (marker.kind !== "backfill/completed" || marker.version !== 3) {
        throw new Error("expected the v3 marker");
      }
      expect(marker.edgesRewritten).toBe(1);
      expect(marker.droppedDependencies.length).toBe(2);
      const report = store.backfillReport()!;
      expect(report.dropsUnknown).toBe(false);
      expect(report.edgesRewritten).toBe(1);
      expect(report.droppedDependencies.length).toBe(2);
      expect(report.ticketMap.length).toBe(2);
    });
  });
});

describe("#211 criterion 6: a clean backfill records that it lost nothing", () => {
  it("empty loss lists on the marker distinguish success from silence", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Clean", "d");
      });
      const { store, projectId } = targetStore(storage);
      const result = store.backfillSessionLogs(projectId, [logA]);

      expect(result.lossless).toBe(true);
      expect(result.droppedDependencies).toEqual([]);
      expect(result.skippedPlans).toEqual([]);
      expect(result.skippedPhases).toEqual([]);
      expect(result.droppedRefusals).toEqual([]);
      expect(result.pendingEdges).toEqual([]);
      expect(result.repairedEdges).toEqual([]);
      expect(result.slugRenames).toEqual([]);
      const marker = store.events().at(-1)!;
      if (marker.kind !== "backfill/completed" || marker.version !== 3) {
        throw new Error("expected the v3 marker");
      }
      // Recorded empty — present and blank, not absent.
      expect(marker.droppedDependencies).toEqual([]);
      expect(marker.skippedPlans).toEqual([]);
      expect(marker.skippedPhases).toEqual([]);
      expect(marker.droppedRefusals).toEqual([]);
      expect(marker.pendingEdges).toEqual([]);
      expect(marker.repairedEdges).toEqual([]);
      expect(marker.slugRenames).toEqual([]);
      expect(store.backfillReport()!.lossless).toBe(true);
    });
  });
});

describe("#211/#221: the marker resumes a batched import", () => {
  /**
   * #221's seam: the host driver OOMs accumulating every log before
   * importing, so it must batch — and a marker that can only say "all done"
   * or "never ran" forces the restart that causes the crash. The v3 marker
   * instead names every imported session plus the whole ticket map, so a
   * later call flushes only its fresh sessions and accumulates the marker.
   */
  it("a second batch imports only fresh sessions and the marker accumulates", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        const ticket = store.createTicket(project, "Alpha", "d", {
          dependsOn: [`${KEY}:99`],
        });
        store.setPlanMeta(project, {
          frontmatter: "alpha plan",
          preamble: "pre",
          contextSections: [],
          rules: "",
        });
        store.setPhase(project, 2, { title: "Build", state: "open" });
        try {
          store.moveTicket(ticket, "done", "agent");
        } catch {
          // The refusal is the fixture; the throw is its echo.
        }
      });
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Beta", "d", {
          dependsOn: [`${KEY}:98`],
        });
        store.setPlanMeta(project, {
          frontmatter: "beta plan",
          preamble: "pre",
          contextSections: [],
          rules: "",
        });
        store.setPhase(project, 3, { title: "Beta phase", state: "open" });
      });
      const { store, projectId } = targetStore(storage);

      // Batch one: session-a alone.
      const first = store.backfillSessionLogs(projectId, [logA]);
      expect(first.alreadyRan).toBe(false);
      expect(first.tickets).toBe(1);
      expect(first.plans).toBe(1);
      expect(first.phases).toBe(1);
      expect(first.refusals).toBe(1);
      expect(first.droppedDependencies.length).toBe(1);
      expect(store.backfillReport()!.sessionIds).toEqual(["session-a"]);

      // Batch two: session-a re-handed (idempotent) plus fresh session-b.
      const second = store.backfillSessionLogs(projectId, [logA, logB]);
      expect(second.alreadyRan).toBe(false);
      // Only the fresh session flushes: one ticket, its history, its drop.
      expect(second.tickets).toBe(1);
      expect(second.plans).toBe(1);
      expect(second.phases).toBe(1);
      expect(second.refusals).toBe(0);
      expect(second.droppedDependencies.length).toBe(1);
      expect(second.droppedDependencies[0]).toMatchObject({
        fromSessionId: "session-b",
        fromTitle: "Beta",
        ref: `${KEY}:98`,
      });
      expect(store.ticketsFor(projectId).length).toBe(2);
      // No duplication: one refusal (a's), both phases, last plan wins.
      expect(
        store.events().filter((event) => event.kind === "aidos/refusal").length,
      ).toBe(1);
      expect(store.phasesFor(projectId).length).toBe(2);
      expect(store.getPlanMeta(projectId).frontmatter).toBe("beta plan");

      // The marker accumulated: every session, every ticket, every loss.
      const report = store.backfillReport()!;
      expect(report.sessionIds).toEqual(["session-a", "session-b"]);
      expect(report.ticketMap.length).toBe(2);
      expect(report.tickets).toBe(2);
      expect(report.plans).toBe(2);
      expect(report.phases).toBe(2);
      expect(report.refusals).toBe(1);
      expect(report.droppedDependencies.length).toBe(2);
      expect(report.lossless).toBe(false);

      // Re-handing only imported sessions is a no-op that writes nothing.
      const markersBefore = store
        .events()
        .filter((event) => event.kind === "backfill/completed").length;
      const third = store.backfillSessionLogs(projectId, [logA, logB]);
      expect(third.alreadyRan).toBe(true);
      expect(store.ticketsFor(projectId).length).toBe(2);
      expect(
        store.events().filter((event) => event.kind === "backfill/completed").length,
      ).toBe(markersBefore);
    });
  });
});

describe("#211 round 2: subset batches never misresolve (F1/F2)", () => {
  /**
   * F1: a batch naming a session it was not handed must NOT refuse. Before
   * the fix, `session-b:1` fell back to the own log, misresolved to the
   * depending ticket itself, and the self-edge refused the whole bracket —
   * retrying the identical batch failed identically (STUCK, not skipped).
   */
  it("a batch with an unhanded session ref succeeds and names the drop", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Lone", "d", {
          dependsOn: ["session-b:1"],
        });
      });
      const { store, projectId } = targetStore(storage);
      // No throw: the batch lands.
      const result = store.backfillSessionLogs(projectId, [logA]);
      expect(result.alreadyRan).toBe(false);
      expect(result.tickets).toBe(1);
      // Never counted as rewired: nothing was wired anywhere.
      expect(result.edgesRewritten).toBe(0);
      expect(result.droppedDependencies.length).toBe(1);
      expect(result.droppedDependencies[0]).toMatchObject({
        fromSessionId: "session-a",
        fromTitle: "Lone",
        ref: "session-b:1",
      });
      expect(result.droppedDependencies[0]!.reason).toMatch(/not handed to this import/);
      expect(result.lossless).toBe(false);
      const lone = store.ticketsFor(projectId).find((row) => row.title === "Lone")!;
      expect(lone.dependsOn).toEqual([]);
    });
  });

  /**
   * F2: the critical one. Awaiting session, claimed up front, must PEND —
   * left out of the set, reported as waiting — and rewire on arrival. Before
   * the fix, `Top` silently inherited `Base`'s id, reported
   * `edgesRewritten: 1, lossless: true`, and nothing repaired it later.
   */
  it("an expected-but-absent session pends the edge and repairs it on arrival", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Base", "d");
        store.createTicket(project, "Top", "d", {
          dependsOn: ["session-b:1"],
        });
      });
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "FarBase", "d");
      });
      const expected = ["session-a", "session-b"];
      const { store, projectId } = targetStore(storage);

      const first = store.backfillSessionLogs(projectId, [logA], {
        expectedSessionIds: expected,
      });
      expect(first.tickets).toBe(2);
      const top = store.ticketsFor(projectId).find((row) => row.title === "Top")!;
      const base = store.ticketsFor(projectId).find((row) => row.title === "Base")!;
      // NOT wired to Base: the edge waits, out loud.
      expect(top.dependsOn).toEqual([]);
      expect(first.edgesRewritten).toBe(0);
      expect(first.droppedDependencies).toEqual([]);
      expect(first.pendingEdges.length).toBe(1);
      expect(first.pendingEdges[0]).toMatchObject({
        fromSessionId: "session-a",
        fromLocalId: 2,
        fromNewId: top.id,
        fromTitle: "Top",
        ref: "session-b:1",
        targetSessionId: "session-b",
        targetLocalId: 1,
      });
      expect(first.lossless).toBe(false);
      expect(base.dependsOn).toEqual([]);

      // The target session arrives: the corrective set rewires Top.
      const second = store.backfillSessionLogs(projectId, [logB], {
        expectedSessionIds: expected,
      });
      expect(second.alreadyRan).toBe(false);
      expect(second.tickets).toBe(1);
      const farBase = store.ticketsFor(projectId).find((row) => row.title === "FarBase")!;
      expect(store.getTicket(top.id).dependsOn).toEqual([`${KEY}:${farBase.id}`]);
      expect(second.repairedEdges.length).toBe(1);
      expect(second.repairedEdges[0]).toMatchObject({
        fromTitle: "Top",
        ref: "session-b:1",
        resolvedTo: `${KEY}:${farBase.id}`,
      });
      expect(second.edgesRewritten).toBe(1);
      expect(second.lossless).toBe(true);

      // The marker tells the whole story cumulatively.
      const report = store.backfillReport()!;
      expect(report.pendingEdges).toEqual([]);
      expect(report.repairedEdges.length).toBe(1);
      expect(report.edgesRewritten).toBe(1);
      expect(report.droppedDependencies).toEqual([]);
      expect(report.lossless).toBe(true);
    });
  });
});

describe("#211 round 2: slug and bare refs resolve like the host (F3)", () => {
  /**
   * F3: `KEY:slug` and bare legacy refs resolve through source slugs instead
   * of dropping as "malformed". The host's own `resolveDependencyRef`
   * handles all three shapes; the importer now matches it.
   */
  it("workspace slug, bare number and bare slug refs all resolve", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Real Base", "d", { slug: "real-base" });
        store.createTicket(project, "Alias", "d", {
          dependsOn: [`${KEY}:real-base`],
        });
        store.createTicket(project, "BareNum", "d", { dependsOn: ["1"] });
        store.createTicket(project, "BareSlug", "d", {
          dependsOn: ["real-base"],
        });
        store.createTicket(project, "Lost", "d", {
          dependsOn: [`${KEY}:no-such-slug`],
        });
      });
      const { store, projectId } = targetStore(storage);
      const result = store.backfillSessionLogs(projectId, [logA]);

      const rows = store.ticketsFor(projectId);
      const base = rows.find((row) => row.title === "Real Base")!;
      // All three shapes land on the same edge.
      for (const title of ["Alias", "BareNum", "BareSlug"]) {
        expect(rows.find((row) => row.title === title)!.dependsOn).toEqual([
          `${KEY}:${base.id}`,
        ]);
      }
      expect(result.edgesRewritten).toBe(3);
      // The unresolvable slug drops — accurately labeled, not "malformed".
      expect(result.droppedDependencies.length).toBe(1);
      expect(result.droppedDependencies[0]).toMatchObject({
        fromTitle: "Lost",
        ref: `${KEY}:no-such-slug`,
      });
      expect(result.droppedDependencies[0]!.reason).toMatch(/matches no ticket slug/);
      expect(result.droppedDependencies[0]!.reason).not.toMatch(/malformed/);
      expect(result.lossless).toBe(false);
    });
  });

  it("a session-scoped slug ref resolves against that session", () => {
    withSqlite((storage) => {
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Far Base", "d", { slug: "far-base" });
      });
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Seeker", "d", {
          dependsOn: ["session-b:far-base"],
        });
      });
      const { store, projectId } = targetStore(storage);
      const result = store.backfillSessionLogs(projectId, [logA, logB]);
      const rows = store.ticketsFor(projectId);
      const farBase = rows.find((row) => row.title === "Far Base")!;
      expect(rows.find((row) => row.title === "Seeker")!.dependsOn).toEqual([
        `${KEY}:${farBase.id}`,
      ]);
      expect(result.edgesRewritten).toBe(1);
      expect(result.droppedDependencies).toEqual([]);
    });
  });
});

describe("#211 round 2: subset v1-completion remembers every session (F4)", () => {
  /**
   * F4: a v1 marker covering A+B, completed one batch at a time, must
   * neither forget sessions nor duplicate tickets. Before the fix, handing
   * [A] wrote sessionIds ["session-a"], and handing [B] next re-imported
   * Beta alongside itself.
   */
  it("completing one v1 session at a time imports nothing twice", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Alpha", "d");
      });
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Beta", "d");
      });

      // The v1 aftermath for BOTH sessions: tickets flushed with origins,
      // counts-only marker on top — the faithful pre-2340247 shape.
      const { store, projectId } = targetStore(storage);
      const stageV1Ticket = (
        log: ReturnType<typeof sessionLog>,
        localId: number,
      ): number => {
        const fold = foldSessionLog(log);
        const final = fold.state.tickets.get(localId)!;
        const newId = store.allocateTicketId();
        store.commitHostMirror(
          {
            kind: "ticket/change",
            version: 1,
            operation: "create",
            ticket: {
              ...final,
              id: newId,
              projectId,
              workspaceKey: KEY,
              state: "open",
              dependsOn: [],
              revision: 1,
              createdAt: final.createdAt,
              updatedAt: final.createdAt,
            },
            at: final.createdAt,
          },
          () => undefined,
          { sessionId: log.sessionId, localSeq: fold.seqOfTicket.get(localId) ?? null },
        );
        store.commitHostMirror(
          {
            kind: "ticket/change",
            version: 1,
            operation: "set",
            ticket: {
              ...final,
              id: newId,
              projectId,
              workspaceKey: KEY,
              dependsOn: [],
              revision: 2,
              updatedAt: final.updatedAt,
            },
            at: final.updatedAt,
          },
          () => undefined,
        );
        return newId;
      };
      stageV1Ticket(logA, 1);
      stageV1Ticket(logB, 1);
      store.commitHostMirror(
        {
          kind: "backfill/completed",
          version: 1,
          sessionIds: ["session-a", "session-b"],
          tickets: 2,
          evidence: 0,
          comments: 0,
          at: FIXED_NOW,
        },
        () => undefined,
      );
      const titles = (): string[] =>
        store.ticketsFor(projectId).map((row) => row.title);

      // Complete with [A] alone: nothing re-imported. The marker lists only
      // the session this importer actually finished — B's tickets are in the
      // store (v1 put them there) but B's history is still pending, so B
      // stays unlisted rather than skipped-as-done. Counts still account
      // for v1's flushed tickets.
      const first = store.backfillSessionLogs(projectId, [logA]);
      expect(first.alreadyRan).toBe(false);
      expect(first.tickets).toBe(0);
      expect(titles().sort()).toEqual(["Alpha", "Beta"]);
      expect(store.backfillReport()!.sessionIds).toEqual(["session-a"]);
      expect(store.backfillReport()!.tickets).toBe(2);

      // Complete with [B]: still nothing re-imported — Beta appears once —
      // and now both sessions are finished.
      const second = store.backfillSessionLogs(projectId, [logB]);
      expect(second.alreadyRan).toBe(false);
      expect(second.tickets).toBe(0);
      expect(titles().sort()).toEqual(["Alpha", "Beta"]);
      expect(store.backfillReport()!.sessionIds).toEqual([
        "session-a",
        "session-b",
      ]);
      expect(store.backfillReport()!.ticketMap.length).toBe(2);

      // Now everything is finished: a full re-hand is a no-op.
      const third = store.backfillSessionLogs(projectId, [logA, logB]);
      expect(third.alreadyRan).toBe(true);
      expect(titles().sort()).toEqual(["Alpha", "Beta"]);
    });
  });
});

describe("#211 round 2: slug renames are recorded", () => {
  it("a collision rename lands on the marker and clears lossless", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Clash A", "d", { slug: "clash" });
      });
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Clash B", "d", { slug: "clash" });
      });
      const { store, projectId } = targetStore(storage);
      const result = store.backfillSessionLogs(projectId, [logA, logB]);
      expect(result.tickets).toBe(2);
      expect(result.slugRenames.length).toBe(1);
      expect(result.slugRenames[0]).toMatchObject({
        fromSlug: "clash",
        toSlug: "clash-2",
      });
      expect(result.lossless).toBe(false);
      const report = store.backfillReport()!;
      expect(report.slugRenames.length).toBe(1);
      expect(report.lossless).toBe(false);
    });
  });
});
