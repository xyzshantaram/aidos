/**
 * #221: the backfill holds a bounded batch in memory, and resumes per batch.
 *
 * `_ensureWorkspaceBackfill` used to inspect EVERY closed log of the
 * workspace, retain all parsed event arrays in one `logs[]` (plus a `.map()`
 * second copy of each), and hand the whole history to
 * `Store.backfillSessionLogs` in one call — peak memory scaled with the
 * workspace's entire accumulated history (measured: 5.5 GB peak, host OOM,
 * retry forever). Now it inspects a bounded batch, flushes it, releases it,
 * and moves on; #211's cumulative v2 marker makes each flush durable
 * progress the next open resumes from.
 *
 * Criterion map (#221's acceptance, verbatim):
 *   1. the backfill holds a bounded number of session logs in memory at
 *      once, so peak memory does not scale with the workspace's total
 *      accumulated history — the 35-log test below fails if any single
 *      `backfillSessionLogs` call carries more than BACKFILL_BATCH_SESSIONS
 *      (10) logs, or more than half the import's total bytes.
 *   2. the bound is enforced by construction rather than by a comment —
 *      same test: it counts the driver's own handoff sizes, not wall time.
 *   3. progress is durable per session log, so an import interrupted
 *      partway resumes from where it stopped instead of restarting the
 *      whole workspace — the blackout test fails the second batch's
 *      inspects, heals, and asserts only the missing sessions re-inspect.
 *   4. an import that cannot proceed fails with a diagnosable refusal that
 *      leaves the host alive, rather than killing the process — the poison
 *      test refuses one batch (named in the warning), lands the other two,
 *      resolves the read, and heals on retry.
 *   5. the real dotfiles-ai board opens, imports, and lands its marker —
 *      verified against the real store in a capped child process, NOT here
 *      (see the ticket report; driving 1 GB of logs inside the test runner
 *      would be the bug being fixed).
 *   6. opening that board a second time imports nothing and does no
 *      full-history read — lists and inspects freeze after the first open.
 *      (Passes pre-fix too: the marker gate already did this. It locks the
 *      behavior through the new verified-set path.)
 *   7. a cross-workspace read that names N workspaces does not start N
 *      simultaneous full-history imports — two workspaces import
 *      concurrently while global in-flight inspects stay within one batch
 *      (the process-wide batch serializer).
 *
 * CROSS-BATCH DEPENDENCIES (F1/F2, #211 round-2 review): the last describe
 * pins the driver side of the subset-safety defect the review found —
 * `_remapDependency` falls back to the OWN session for a `sessionId:N`
 * prefix outside the handed batch, so a batch importing B before A either
 * refuses (self-edge, F1) or silently rewires B's edge onto B's own ticket
 * and reports `lossless: true` (F2). Measured pre-round-2: B2 lands on
 * `--home-sid-repos-aidos--:1` (B1's id, not A1's `:12`) with
 * `edgesRewritten: 1, droppedDependencies: [], lossless: true`.
 * That test FAILS against the current kernel + this batched driver by
 * design; it PASSES against the old monolithic driver (one call carries
 * every log, so no prefix is ever outside the batch — at unbounded memory
 * cost) and will flip green when #211 round 2 lands (drop-and-record
 * satisfies the `dropped` branch). It is NOT skipped or marked
 * expected-to-fail: a red test documenting a real defect is the deliverable.
 *
 * Log builders: kernel-built logs (`kernelLog`, the test-41 pattern — a
 * real Store folding real writes, wrapped in inspect envelopes) wherever
 * the test needs content control; service-built logs (the test-42 pattern)
 * only where live-mirror behavior is under test.
 */

import { describe, expect, it, vi } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import { Store } from "../src/kernel/store";
import type { BackfillReport } from "../src/kernel/store";
import type { BackfillSessionLog } from "../src/kernel/backfill";
import { MemoryStorage } from "../src/kernel/storage-memory";
import type { AidosEvent } from "../src/kernel/events";
import type { ProjectId } from "../src/kernel/types";
import { workspaceKeyFromPath } from "../src/kernel/slug";
import { createHarness } from "./b1-harness";
import { FIXED_NOW, makeConfig } from "./helpers";

const WS = "/home/sid/repos/aidos";
const KEY = workspaceKeyFromPath(WS);
const WS_A = "/srv/proj/alpha";
const WS_B = "/srv/proj/beta";

type LogEvents = { seq: number; type: string; data: AidosEvent }[];

/**
 * One closed session's log, kernel-built: its own Store on its own
 * ephemeral port folds real writes, and the store's log becomes the
 * session's inspect envelope. Project path matches the reading workspace
 * so plan/phase mapping (where present) resolves.
 */
function kernelLog(
  sessionId: string,
  workspace: string,
  build: (store: Store, projectId: number) => void,
): { sessionId: string; events: LogEvents } {
  const source = new Store(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
  const projectId = source.createProject(workspace, "aidos");
  build(source, projectId);
  return {
    sessionId,
    events: source.events().map((data, index) => ({
      seq: index + 1,
      type: data.kind,
      data,
    })),
  };
}

function kernelTicket(store: Store, projectId: number, title: string, extra?: { dependsOn?: string[] }): void {
  store.createTicket(projectId, title, `${title} body padding ${"x".repeat(64)}`, extra ?? {});
}

function provideLogs(
  harness: ReturnType<typeof createHarness>,
  logs: Map<string, { cwd: string; events: LogEvents }>,
  counters?: { lists?: { n: number }; inspects?: { ids: string[] }; active?: { n: number; max: number } },
): void {
  harness.ctx.reflect.provide("sessionPersistence", {
    list: async () => {
      if (counters?.lists !== undefined) counters.lists.n += 1;
      return [...logs.keys()].map((id) => ({ id: SessionId(id), cwd: logs.get(id)!.cwd }));
    },
    inspect: async (id: string) => {
      if (counters?.active !== undefined) {
        counters.active.n += 1;
        counters.active.max = Math.max(counters.active.max, counters.active.n);
      }
      // Yield before touching the log so concurrent workers genuinely
      // overlap: without this the async boundary sits in the worker and
      // in-flight counts never exceed one per tick.
      await Promise.resolve();
      try {
        const found = logs.get(id);
        if (found === undefined) throw new Error(`not found: ${id}`);
        counters?.inspects?.ids.push(id);
        return { meta: { id, cwd: found.cwd }, events: found.events as never[] };
      } finally {
        if (counters?.active !== undefined) counters.active.n -= 1;
      }
    },
  });
}

function workspaceEntry(harness: ReturnType<typeof createHarness>, path: string): { store: Store; projectId: number } {
  const service = harness.service as unknown as {
    _workspaceStores: Map<string, { store: Store; projectId: number }>;
  };
  const entry = service._workspaceStores.get(path);
  if (entry === undefined) throw new Error(`no workspace store for ${path}`);
  return entry;
}

function setLogger(harness: ReturnType<typeof createHarness>): {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
} {
  const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  (harness.ctx as unknown as { logger: unknown }).logger = logger;
  return logger;
}

describe("#221 criteria 1+2: the handoff is bounded by construction", () => {
  it("35 logs land in 4 calls of at most 10, each a fraction of the total bytes", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const N = 35;
    const PER = 8;
    const logs = new Map<string, { cwd: string; events: LogEvents }>();
    for (let index = 0; index < N; index += 1) {
      const id = `t221-big-${index}`;
      // 8 tickets of ~20 KB each: large enough that a whole-history
      // retention would show, small enough to run in milliseconds.
      const log = kernelLog(id, WS, (store, projectId) => {
        for (let ticket = 0; ticket < PER; ticket += 1) {
          store.createTicket(
            projectId,
            `big ticket ${index}-${ticket}`,
            `body ${"y".repeat(20_000)}`,
          );
        }
      });
      logs.set(id, { cwd: WS, events: log.events });
    }
    const counters = { lists: { n: 0 }, inspects: { ids: [] as string[] }, active: { n: 0, max: 0 } };
    provideLogs(harness, logs, counters);

    const spy = vi.spyOn(Store.prototype, "backfillSessionLogs");
    try {
      const result = await harness.service.workspaceTickets(harness.asAgent());
      // Every ticket of every log landed.
      expect(result.tickets.filter((row) => row.title.startsWith("big ticket ")).length).toBe(N * PER);

      // The bound, by construction: no single call carries the history.
      expect(counters.inspects.ids.length).toBe(N);
      expect(counters.active.max).toBeLessThanOrEqual(4);
      const sizes = spy.mock.calls.map((call) => (call[1] as readonly BackfillSessionLog[]).length);
      expect(sizes.length).toBe(4);
      for (const size of sizes) expect(size).toBeLessThanOrEqual(10);
      const totalBytes = [...logs.values()].reduce(
        (sum, log) => sum + JSON.stringify(log.events).length,
        0,
      );
      for (const call of spy.mock.calls) {
        const bytes = JSON.stringify(call[1]).length;
        expect(bytes).toBeLessThan(totalBytes / 2);
      }
      // And the marker accumulated the whole workspace, not just one batch.
      expect(workspaceEntry(harness, WS).store.backfillReport()?.sessionIds.length).toBe(N);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("#221 criterion 3: progress is durable per session log", () => {
  it("a blacked-out batch is skipped, then resumes alone on the next open", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const N = 25;
    const logs = new Map<string, { cwd: string; events: LogEvents }>();
    for (let index = 0; index < N; index += 1) {
      const id = `t221-resume-${index}`;
      const log = kernelLog(id, WS, (store, projectId) => {
        kernelTicket(store, projectId, `resume ticket ${index}`);
      });
      logs.set(id, { cwd: WS, events: log.events });
    }
    // Batch 2 (ids 10-19) is unreadable on the first open.
    let blackout = true;
    const inspected: string[] = [];
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [...logs.keys()].map((id) => ({ id: SessionId(id), cwd: WS })),
      inspect: async (id: string) => {
        await Promise.resolve();
        const index = Number(id.slice("t221-resume-".length));
        if (blackout && index >= 10 && index < 20) throw new Error(`log unreadable: ${id}`);
        inspected.push(id);
        const found = logs.get(id)!;
        return { meta: { id, cwd: WS }, events: found.events as never[] };
      },
    });

    const first = await harness.service.workspaceTickets(harness.asAgent());
    expect(first.tickets.filter((row) => row.title.startsWith("resume ticket ")).length).toBe(15);

    // Heal: the next open hands ONLY the missing sessions — no full-history
    // re-read, no re-import of the fifteen that landed.
    blackout = false;
    inspected.length = 0;
    const second = await harness.service.workspaceTickets(harness.asAgent());
    expect(second.tickets.filter((row) => row.title.startsWith("resume ticket ")).length).toBe(N);
    expect([...inspected].sort()).toEqual(
      Array.from({ length: 10 }, (_, offset) => `t221-resume-${10 + offset}`).sort(),
    );
    expect(workspaceEntry(harness, WS).store.backfillReport()?.sessionIds.length).toBe(N);
  });
});

describe("#221 criterion 4: a refused batch names itself and the host lives", () => {
  it("one poison batch refuses diagnosably while the others land, then heals", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const logger = setLogger(harness);
    const N = 25;
    const logs = new Map<string, { cwd: string; events: LogEvents }>();
    for (let index = 0; index < N; index += 1) {
      const id = `t221-poison-${index}`;
      const log = kernelLog(id, WS, (store, projectId) => {
        kernelTicket(store, projectId, `poison ticket ${index}`);
      });
      logs.set(id, { cwd: WS, events: log.events });
    }
    provideLogs(harness, logs);

    const proto = Store.prototype;
    const orig = proto.backfillSessionLogs;
    const spy = vi.spyOn(proto, "backfillSessionLogs");
    let calls = 0;
    let sabotageArmed = true;
    spy.mockImplementation(function (this: Store, projectId: ProjectId, batch: readonly BackfillSessionLog[]) {
      calls += 1;
      if (sabotageArmed && calls === 2) throw new Error("t221 sabotage: poison batch");
      return orig.call(this, projectId, batch);
    } as unknown as typeof orig);
    try {
      // The read resolves — the host is alive — with batches 1 and 3 landed.
      const first = await harness.service.workspaceTickets(harness.asAgent());
      expect(first.tickets.filter((row) => row.title.startsWith("poison ticket ")).length).toBe(15);
      // Diagnosable: the warning names the refusal AND the batch's sessions.
      const warnings = logger.warn.mock.calls.map((call) => String(call[0]));
      expect(warnings.some((line) => /batch refused/.test(line))).toBe(true);
      expect(warnings.some((line) => line.includes("t221-poison-10"))).toBe(true);

      // Heal: the next open retries exactly the refused batch.
      sabotageArmed = false;
      const second = await harness.service.workspaceTickets(harness.asAgent());
      expect(second.tickets.filter((row) => row.title.startsWith("poison ticket ")).length).toBe(N);
      expect(calls).toBe(4);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("#221 criterion 6: the second open reads no history", () => {
  it("lists and inspects freeze after the first open", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const logs = new Map<string, { cwd: string; events: LogEvents }>();
    for (let index = 0; index < 12; index += 1) {
      const id = `t221-quiet-${index}`;
      const log = kernelLog(id, WS, (store, projectId) => {
        kernelTicket(store, projectId, `quiet ticket ${index}`);
      });
      logs.set(id, { cwd: WS, events: log.events });
    }
    const counters = { lists: { n: 0 }, inspects: { ids: [] as string[] } };
    provideLogs(harness, logs, counters);

    const first = await harness.service.workspaceTickets(harness.asAgent());
    expect(first.tickets.filter((row) => row.title.startsWith("quiet ticket ")).length).toBe(12);
    expect(counters.lists.n).toBe(1);
    expect(counters.inspects.ids.length).toBe(12);

    const second = await harness.service.workspaceTickets(harness.asAgent());
    expect(second.tickets.filter((row) => row.title.startsWith("quiet ticket ")).length).toBe(12);
    expect(counters.lists.n).toBe(1);
    expect(counters.inspects.ids.length).toBe(12);
  });
});

describe("#221 criterion 7: concurrent workspace imports stay within one batch", () => {
  it("two workspaces importing at once never exceed one batch in flight", async () => {
    const harness = createHarness(undefined, { cwd: WS_A });
    harness.installService();
    const logs = new Map<string, { cwd: string; events: LogEvents }>();
    for (const [workspace, prefix] of [
      [WS_A, "t221-xa"],
      [WS_B, "t221-xb"],
    ] as const) {
      for (let index = 0; index < 20; index += 1) {
        const id = `${prefix}-${index}`;
        const log = kernelLog(id, workspace, (store, projectId) => {
          kernelTicket(store, projectId, `${prefix} ticket ${index}`);
        });
        logs.set(id, { cwd: workspace, events: log.events });
      }
    }
    const counters = { active: { n: 0, max: 0 } };
    provideLogs(harness, logs, counters);
    const peerB = harness.makeAgent({ id: "t221-reader-b" });
    (peerB.session.header as { cwd?: string }).cwd = WS_B;

    const spy = vi.spyOn(Store.prototype, "backfillSessionLogs");
    try {
      const [resultA, resultB] = await Promise.all([
        harness.service.workspaceTickets(harness.asAgent()),
        harness.service.workspaceTickets(harness.asAgent(peerB)),
      ]);
      expect(resultA.tickets.filter((row) => row.title.startsWith("t221-xa ticket ")).length).toBe(20);
      expect(resultB.tickets.filter((row) => row.title.startsWith("t221-xb ticket ")).length).toBe(20);
      // One batch in flight GLOBALLY: the serializer held, not per-workspace luck.
      expect(counters.active.max).toBeLessThanOrEqual(4);
      expect(spy.mock.calls.length).toBe(4);
      for (const call of spy.mock.calls) {
        expect((call[1] as readonly BackfillSessionLog[]).length).toBeLessThanOrEqual(10);
      }
    } finally {
      spy.mockRestore();
    }
  });
});

describe("#221 resume skips sessions the live mirror already owns", () => {
  it("after a restart, a mirrored-then-closed session is not re-imported while a fresh legacy log is", async () => {
    // One shared home for two harnesses: the second harness is a new
    // PROCESS (empty verified set, same store file with its marker).
    // A harness-minted home would NOT be shared (installService treats a
    // leftover minted home as another harness's, never as a pin), so the
    // home is pinned explicitly and restored afterwards.
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const savedHome = process.env.DSH_HOME;
    const sharedHome = mkdtempSync(join(tmpdir(), "t221-restart-home-"));
    process.env.DSH_HOME = sharedHome;
    try {
      const first = createHarness(undefined, { cwd: WS });
      first.installService();
      const service = first.service;

      // Two ordinary closed logs import first, landing a v2 marker.
      const seedLogs = new Map<string, { cwd: string; events: LogEvents }>();
      for (const id of ["t221-seed-0", "t221-seed-1"]) {
        const log = kernelLog(id, WS, (store, projectId) => {
          kernelTicket(store, projectId, `seed ticket ${id}`);
        });
        seedLogs.set(id, { cwd: WS, events: log.events });
      }
      provideLogs(first, seedLogs);
      const seeded = await service.workspaceTickets(first.asAgent());
      expect(seeded.tickets.filter((row) => row.title.startsWith("seed ticket ")).length).toBe(2);

      // A live session creates through the service: the ticket mirrors into
      // the workspace store with this session as origin (#218).
      const peer = first.makeAgent({ id: "t221-mirrored" });
      (peer.session.header as { cwd?: string }).cwd = WS;
      service.userSetTicket(first.asAgent(peer), { title: "mirrored live ticket" });
      const mirroredEvents = [...peer.session.events];
      // The session closes: it leaves the live set.
      first.agents.splice(first.agents.indexOf(peer), 1);

      // A legacy log that never mirrored (built straight on the kernel).
      const freshLog = kernelLog("t221-fresh", WS, (store, projectId) => {
        kernelTicket(store, projectId, "fresh legacy ticket");
      });

      // RESTART: a new service over the same store file. Its verified set
      // is empty, so it re-lists and resumes — the crash-recovery path.
      const second = createHarness(undefined, { cwd: WS });
      second.installService();
      const inspected: string[] = [];
      second.ctx.reflect.provide("sessionPersistence", {
        list: async () =>
          ["t221-seed-0", "t221-seed-1", "t221-mirrored", "t221-fresh"].map((id) => ({
            id: SessionId(id),
            cwd: WS,
          })),
        inspect: async (id: string) => {
          await Promise.resolve();
          inspected.push(id);
          if (id === "t221-mirrored") return { meta: { id, cwd: WS }, events: mirroredEvents as never[] };
          if (id === "t221-fresh") return { meta: { id, cwd: WS }, events: freshLog.events as never[] };
          throw new Error(`already imported: ${id}`);
        },
      });

      const spy = vi.spyOn(Store.prototype, "backfillSessionLogs");
      try {
        const result = await second.service.workspaceTickets(second.asAgent());
        const titles = result.tickets.map((row) => row.title);
        expect(titles).toContain("fresh legacy ticket");
        // The mirrored session was never inspected — its rows were already
        // owned — and its ticket appears exactly once (no suffixed duplicate).
        expect(inspected).toEqual(["t221-fresh"]);
        expect(titles.filter((title) => title === "mirrored live ticket").length).toBe(1);
        expect(spy.mock.calls.length).toBe(1);
      } finally {
        spy.mockRestore();
      }
    } finally {
      if (savedHome === undefined) {
        delete process.env.DSH_HOME;
      } else {
        process.env.DSH_HOME = savedHome;
      }
    }
  });
});

describe("#221 v1 marker: the driver defers subset completion (F4 gate)", () => {
  it("hands nothing to a v1-marked store and leaves the marker intact", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const logger = setLogger(harness);
    const logs = new Map<string, { cwd: string; events: LogEvents }>();
    for (let index = 0; index < 3; index += 1) {
      const id = `t221-v1fresh-${index}`;
      const log = kernelLog(id, WS, (store, projectId) => {
        kernelTicket(store, projectId, `v1fresh ticket ${index}`);
      });
      logs.set(id, { cwd: WS, events: log.events });
    }
    provideLogs(harness, logs);

    // A v1 marker cannot be produced through any current writer (v2-only),
    // so the gate is driven through the seam it reads: backfillReport.
    const v1: BackfillReport = {
      importerVersion: 1,
      sessionIds: ["t221-v1-old-0"],
      tickets: 1,
      evidence: 0,
      comments: 0,
      plans: 0,
      phases: 0,
      refusals: 0,
      edgesRewritten: 0,
      droppedDependencies: [],
      skippedPlans: [],
      skippedPhases: [],
      droppedRefusals: [],
      skippedKinds: ["plan/change", "phase/set", "aidos/refusal"],
      ticketMap: [],
      // #211 round 2 added these three. A v1 marker records none of them --
      // it predates the concepts -- which is precisely why dropsUnknown is
      // true: empty here means "never recorded", not "nothing happened".
      pendingEdges: [],
      repairedEdges: [],
      slugRenames: [],
      dropsUnknown: true,
      lossless: false,
      at: FIXED_NOW,
    };
    const reportSpy = vi.spyOn(Store.prototype, "backfillReport").mockReturnValue(v1);
    const backfillSpy = vi.spyOn(Store.prototype, "backfillSessionLogs");
    try {
      const result = await harness.service.workspaceTickets(harness.asAgent());
      expect(result.tickets).toBeDefined();
      // Nothing handed over: the buggy v1-upgrade path never fires.
      expect(backfillSpy.mock.calls.length).toBe(0);
      expect(logger.info.mock.calls.map((call) => String(call[0])).some((line) => /v1 import marker/.test(line))).toBe(true);
    } finally {
      reportSpy.mockRestore();
      backfillSpy.mockRestore();
    }
  });
});

describe("#221 cross-batch dependency: never silently rewired (F1/F2 catcher)", () => {
  it("an edge split across batches is correctly wired or explicitly dropped", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    // Session B (imports FIRST) holds B1/B2; B2 depends on A1, which lives
    // in session A (imports in the NEXT batch). Nine fillers force the split:
    // batch 1 = [B + 9 fillers], batch 2 = [A].
    const logs = new Map<string, { cwd: string; events: LogEvents }>();
    const logB = kernelLog("x221-dep-b", WS, (store, projectId) => {
      kernelTicket(store, projectId, "B one");
      store.createTicket(projectId, "B two", "depends across the batch boundary", {
        dependsOn: ["x221-dep-a:1"],
      });
    });
    logs.set("x221-dep-b", { cwd: WS, events: logB.events });
    for (let index = 0; index < 9; index += 1) {
      const id = `x221-dep-f${index}`;
      const filler = kernelLog(id, WS, (store, projectId) => {
        kernelTicket(store, projectId, `filler ${index}`);
      });
      logs.set(id, { cwd: WS, events: filler.events });
    }
    const logA = kernelLog("x221-dep-a", WS, (store, projectId) => {
      kernelTicket(store, projectId, "A one");
      kernelTicket(store, projectId, "A two");
    });
    logs.set("x221-dep-a", { cwd: WS, events: logA.events });
    provideLogs(harness, logs);

    await harness.service.workspaceTickets(harness.asAgent());
    const { store, projectId } = workspaceEntry(harness, WS);
    const rows = store.ticketsFor(projectId);
    const byTitle = new Map(rows.map((row) => [row.title, row]));
    const a1 = byTitle.get("A one")!;
    const b1 = byTitle.get("B one")!;
    const b2 = byTitle.get("B two")!;
    const report = store.backfillReport()!;
    const dropped = report.droppedDependencies.some((edge) => edge.ref === "x221-dep-a:1");
    const correctlyWired = b2.dependsOn.includes(`${KEY}:${a1.id}`);
    // Either outcome is honest: the edge followed A across the boundary, or
    // the import said so and recorded the drop by name.
    expect(correctlyWired || dropped).toBe(true);
    // The forbidden outcome: rewired onto B's own ticket wearing lossless.
    expect(b2.dependsOn.includes(`${KEY}:${b1.id}`) && report.lossless).toBe(false);
  });
});
