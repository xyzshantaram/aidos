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
  it("a v2 marker names the importer version and the unreplayed kinds", () => {
    withSqlite((storage) => {
      const { store, projectId } = targetStore(storage);
      expect(store.backfillReport()).toBeNull();
      store.backfillSessionLogs(projectId, [richLog("session-a")]);

      const marker = store.events().at(-1)!;
      expect(marker.kind).toBe("backfill/completed");
      if (marker.kind !== "backfill/completed" || marker.version !== 2) {
        throw new Error("expected the v2 marker");
      }
      expect(marker.importerVersion).toBe(2);
      // The source-local project records get no direct replay: the import
      // targets the single project it was handed.
      expect(marker.skippedKinds).toContain("project/created");
      expect(marker.ticketMap.length).toBe(1);

      // And the #209-shaped report reads the same record back.
      const report = store.backfillReport()!;
      expect(report.importerVersion).toBe(2);
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

      // The completion wrote the v2 marker, so the next call is a no-op —
      // and still a readable report.
      const marker = store.events().at(-1)!;
      if (marker.kind !== "backfill/completed" || marker.version !== 2) {
        throw new Error("expected the v2 marker");
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
      if (marker.kind !== "backfill/completed" || marker.version !== 2) {
        throw new Error("expected the v2 marker");
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
      const marker = store.events().at(-1)!;
      if (marker.kind !== "backfill/completed" || marker.version !== 2) {
        throw new Error("expected the v2 marker");
      }
      // Recorded empty — present and blank, not absent.
      expect(marker.droppedDependencies).toEqual([]);
      expect(marker.skippedPlans).toEqual([]);
      expect(marker.skippedPhases).toEqual([]);
      expect(marker.droppedRefusals).toEqual([]);
      expect(store.backfillReport()!.lossless).toBe(true);
    });
  });
});

describe("#211/#221: the marker resumes a batched import", () => {
  /**
   * #221's seam: the host driver OOMs accumulating every log before
   * importing, so it must batch — and a marker that can only say "all done"
   * or "never ran" forces the restart that causes the crash. The v2 marker
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
