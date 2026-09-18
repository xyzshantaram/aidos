/**
 * #232: the first restart after #230 inspects four multi-megabyte session
 * logs concurrently and can exhaust memory before any workspace finishes
 * importing.
 *
 * CLOSED_INSPECT_CONCURRENCY is 4 and BACKFILL_BATCH_BYTES (64 MiB) is only
 * consulted AFTER a take, so the first four takes of a batch are unbounded
 * by design. Measured: thursday's 29 MB compressed log decodes to 615,336
 * events / ~525 MB RSS (inspect unit: text + dsh's own decodeStorageRecord
 * expansion, no surface fold); aidos's 52 MB log to 1,484,033 events /
 * ~1.3 GB; dotfiles-ai's four giants (39/25/21/18 MB) retained together to
 * ~1.55 GB heap / ~1.7 GB RSS — before the surface fold and the store
 * overlay production adds on top (the ~41x/4 GB arithmetic in the ticket).
 *
 * The fix: consult the artifact size BEFORE inspecting — stat, never
 * decode — and take every log at or above BACKFILL_LARGE_LOG_BYTES (8 MiB
 * compressed) as a batch of one, so it inspects alone and flushes alone.
 * Small logs keep the 4-up path untouched.
 *
 * The tests stage REAL artifact files under a throwaway DSH_HOME, so the
 * production stat path runs unmocked. The decisive trick: the giant's
 * CONTENT is one tiny ticket while its ARTIFACT is 9 MiB. A code path
 * that sizes by decoding would never solo it; soloing proves the size
 * came from stat. (Pre-fix red runs below confirm the contrapositive.)
 *
 * Map:
 *   1. one oversized log is inspected ALONE, never concurrently with
 *      three others — RED pre-fix (giant shares the window).
 *   2. small logs with known-small artifacts still batch at 4-up in one
 *      flush — lock-in, passes pre-fix too (no blanket serialization).
 *   3. the oversized log is still inspected and still imported, never
 *      skipped, and the next open re-reads nothing — lock-in for the
 *      never-skip invariant through the new partition.
 *   4. a failed giant inspect still leaves the session unmarked and the
 *      next open retries exactly it — lock-in for the failure path
 *      through a solo batch.
 */

import { describe, expect, it, vi } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Store } from "../src/kernel/store";
import type { BackfillSessionLog } from "../src/kernel/backfill";
import { MemoryStorage } from "../src/kernel/storage-memory";
import type { AidosEvent } from "../src/kernel/events";
import { workspaceKeyFromPath } from "../src/kernel/slug";
import { createHarness } from "./b1-harness";
import { FIXED_NOW, makeConfig } from "./helpers";

const WS = "/home/sid/repos/aidos";
const KEY = workspaceKeyFromPath(WS);

/** 9 MiB: over the 8 MiB solo threshold, cheap to write. */
const GIANT_ARTIFACT_BYTES = 9 * 1024 * 1024;
/** 1 KiB: known-small, stays on the 4-up path. */
const SMALL_ARTIFACT_BYTES = 1024;

type LogEvents = { seq: number; type: string; data: AidosEvent }[];

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

function kernelTicket(store: Store, projectId: number, title: string): void {
  store.createTicket(projectId, title, `${title} body`);
}

/**
 * A throwaway DSH_HOME holding staged artifacts: `id -> artifact bytes`.
 * Ids absent from the map have NO artifact (the unknown-size path).
 * Returns a remover; the caller owns save/restore of process.env.DSH_HOME.
 */
function stageArtifacts(home: string, sizes: Map<string, number>): void {
  for (const [id, bytes] of sizes) {
    const dir = join(home, "sessions", KEY, id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "session.jsonl.zstd"), Buffer.alloc(bytes));
  }
}

function withStagedHome(
  sizes: Map<string, number>,
  body: (home: string) => Promise<void>,
): Promise<void> {
  return (async () => {
    const savedHome = process.env.DSH_HOME;
    const home = mkdtempSync(join(tmpdir(), "t232-home-"));
    process.env.DSH_HOME = home;
    try {
      stageArtifacts(home, sizes);
      await body(home);
    } finally {
      if (savedHome === undefined) {
        delete process.env.DSH_HOME;
      } else {
        process.env.DSH_HOME = savedHome;
      }
      rmSync(home, { recursive: true, force: true });
    }
  })();
}

function provideLogs(
  harness: ReturnType<typeof createHarness>,
  logs: Map<string, { cwd: string; events: LogEvents }>,
  opts?: {
    failIds?: Set<string>;
    /** id -> sorted ids in flight when its inspect body ran. */
    snapshots?: Map<string, string[]>;
    active?: { n: number; max: number };
    inspected?: string[];
  },
): void {
  const inflight = new Set<string>();
  harness.ctx.reflect.provide("sessionPersistence", {
    list: async () => [...logs.keys()].map((id) => ({ id: SessionId(id), cwd: logs.get(id)!.cwd })),
    inspect: async (id: string) => {
      inflight.add(id);
      if (opts?.active !== undefined) {
        opts.active.n += 1;
        opts.active.max = Math.max(opts.active.max, opts.active.n);
      }
      // Yield so concurrent workers genuinely overlap before snapshotting.
      await Promise.resolve();
      try {
        if (opts?.failIds?.has(id) === true) throw new Error(`t232 sabotage: ${id} unreadable`);
        opts?.snapshots?.set(id, [...inflight].sort());
        opts?.inspected?.push(id);
        const found = logs.get(id);
        if (found === undefined) throw new Error(`not found: ${id}`);
        return { meta: { id, cwd: found.cwd }, events: found.events as never[] };
      } finally {
        inflight.delete(id);
        if (opts?.active !== undefined) opts.active.n -= 1;
      }
    },
  });
}

describe("#232: a large log is inspected alone", () => {
  it("one oversized log inspects solo while small neighbours batch around it", async () => {
    await withStagedHome(
      new Map([["t232-giant", GIANT_ARTIFACT_BYTES]]),
      async () => {
        const harness = createHarness(undefined, { cwd: WS });
        harness.installService();
        // Order pins the partition AND the never-skip: [small, GIANT, small, small].
        const ids = ["t232-s0", "t232-giant", "t232-s1", "t232-s2"];
        const logs = new Map<string, { cwd: string; events: LogEvents }>();
        for (const id of ids) {
          const log = kernelLog(id, WS, (store, projectId) => {
            kernelTicket(store, projectId, `solo ticket ${id}`);
          });
          logs.set(id, { cwd: WS, events: log.events });
        }
        const snapshots = new Map<string, string[]>();
        provideLogs(harness, logs, { snapshots });

        const spy = vi.spyOn(Store.prototype, "backfillSessionLogs");
        try {
          const result = await harness.service.workspaceTickets(harness.asAgent());
          expect(result.tickets.filter((row) => row.title.startsWith("solo ticket ")).length).toBe(4);
          // The giant never shared an in-flight window: its content is one
          // tiny ticket, so soloing proves the 9 MiB ARTIFACT was consulted.
          expect(snapshots.get("t232-giant")).toEqual(["t232-giant"]);
          // Order preserved, nothing skipped: [s0] flushes, [giant] flushes
          // alone, [s1, s2] flush together.
          const sizes = spy.mock.calls.map((call) => (call[1] as readonly BackfillSessionLog[]).length);
          expect(sizes).toEqual([1, 1, 2]);
          const landed = spy.mock.calls.flatMap(
            (call) => (call[1] as readonly BackfillSessionLog[]).map((log) => String(log.sessionId)),
          );
          expect([...landed].sort()).toEqual([...ids].sort());
        } finally {
          spy.mockRestore();
        }
      },
    );
  });
});

describe("#232: small logs still batch at the existing concurrency", () => {
  it("ten known-small logs land in one flush with four workers in flight", async () => {
    const sizes = new Map<string, number>();
    for (let index = 0; index < 10; index += 1) sizes.set(`t232-batch-${index}`, SMALL_ARTIFACT_BYTES);
    await withStagedHome(sizes, async () => {
      const harness = createHarness(undefined, { cwd: WS });
      harness.installService();
      const logs = new Map<string, { cwd: string; events: LogEvents }>();
      for (let index = 0; index < 10; index += 1) {
        const id = `t232-batch-${index}`;
        const log = kernelLog(id, WS, (store, projectId) => {
          kernelTicket(store, projectId, `batch ticket ${index}`);
        });
        logs.set(id, { cwd: WS, events: log.events });
      }
      const active = { n: 0, max: 0 };
      provideLogs(harness, logs, { active });

      const spy = vi.spyOn(Store.prototype, "backfillSessionLogs");
      try {
        const result = await harness.service.workspaceTickets(harness.asAgent());
        expect(result.tickets.filter((row) => row.title.startsWith("batch ticket ")).length).toBe(10);
        // One flush of ten: no serialization split for small logs.
        expect(spy.mock.calls.length).toBe(1);
        expect((spy.mock.calls[0]![1] as readonly BackfillSessionLog[]).length).toBe(10);
        // And the 4-up concurrency survived: four workers genuinely overlap.
        expect(active.max).toBe(4);
      } finally {
        spy.mockRestore();
      }
    });
  });
});

describe("#232: an oversized log is still inspected and imported, never skipped", () => {
  it("a giant trailing ten smalls lands whole, then the next open reads nothing", async () => {
    await withStagedHome(
      new Map([["t232-keep-giant", GIANT_ARTIFACT_BYTES]]),
      async () => {
        const harness = createHarness(undefined, { cwd: WS });
        harness.installService();
        const logs = new Map<string, { cwd: string; events: LogEvents }>();
        for (let index = 0; index < 10; index += 1) {
          const id = `t232-keep-${index}`;
          const log = kernelLog(id, WS, (store, projectId) => {
            kernelTicket(store, projectId, `keep ticket ${index}`);
          });
          logs.set(id, { cwd: WS, events: log.events });
        }
        const giantLog = kernelLog("t232-keep-giant", WS, (store, projectId) => {
          kernelTicket(store, projectId, "keep giant ticket");
        });
        logs.set("t232-keep-giant", { cwd: WS, events: giantLog.events });
        const inspected: string[] = [];
        provideLogs(harness, logs, { inspected });

        const first = await harness.service.workspaceTickets(harness.asAgent());
        expect(first.tickets.filter((row) => row.title.startsWith("keep ticket ")).length).toBe(10);
        expect(first.tickets.filter((row) => row.title === "keep giant ticket").length).toBe(1);
        // The giant WAS inspected (never skipped for being large)...
        expect(inspected).toContain("t232-keep-giant");
        // ...and the marker accounts for every session including it...
        const service = harness.service as unknown as {
          _workspaceStores: Map<string, { store: Store; projectId: number }>;
        };
        expect(service._workspaceStores.get(WS)!.store.backfillReport()?.sessionIds.length).toBe(11);
        // ...so the next open re-inspects nothing.
        inspected.length = 0;
        const second = await harness.service.workspaceTickets(harness.asAgent());
        expect(second.tickets.filter((row) => row.title.startsWith("keep ticket ")).length).toBe(10);
        expect(second.tickets.filter((row) => row.title === "keep giant ticket").length).toBe(1);
        expect(inspected).toEqual([]);
      },
    );
  });
});

describe("#232: a failed giant inspect still leaves the session unmarked for retry", () => {
  it("an unreadable giant warns, lands nothing twice, and heals alone on retry", async () => {
    await withStagedHome(
      new Map([["t232-fail-giant", GIANT_ARTIFACT_BYTES]]),
      async () => {
        const harness = createHarness(undefined, { cwd: WS });
        harness.installService();
        const logs = new Map<string, { cwd: string; events: LogEvents }>();
        for (const id of ["t232-fail-0", "t232-fail-1"]) {
          const log = kernelLog(id, WS, (store, projectId) => {
            kernelTicket(store, projectId, `fail ticket ${id}`);
          });
          logs.set(id, { cwd: WS, events: log.events });
        }
        const giantLog = kernelLog("t232-fail-giant", WS, (store, projectId) => {
          kernelTicket(store, projectId, "fail giant ticket");
        });
        logs.set("t232-fail-giant", { cwd: WS, events: giantLog.events });
        const failIds = new Set(["t232-fail-giant"]);
        const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
        (harness.ctx as unknown as { logger: unknown }).logger = logger;
        provideLogs(harness, logs, { failIds });

        const first = await harness.service.workspaceTickets(harness.asAgent());
        // Smalls landed; the giant did not.
        expect(first.tickets.filter((row) => row.title.startsWith("fail ticket ")).length).toBe(2);
        expect(first.tickets.filter((row) => row.title === "fail giant ticket").length).toBe(0);
        // Diagnosable: the warning names the giant and promises a retry.
        const warnings = logger.warn.mock.calls.map((call) => String(call[0]));
        expect(warnings.some((line) => line.includes("t232-fail-giant"))).toBe(true);
        // Unmarked: the marker does not account for the giant...
        const service = harness.service as unknown as {
          _workspaceStores: Map<string, { store: Store; projectId: number }>;
        };
        const report = service._workspaceStores.get(WS)!.store.backfillReport();
        expect(report === null || !report.sessionIds.includes("t232-fail-giant")).toBe(true);

        // Heal: the next open retries exactly the giant — inspected solo —
        // and lands it with nothing duplicated.
        failIds.clear();
        const snapshots = new Map<string, string[]>();
        provideLogs(harness, logs, { snapshots });
        const second = await harness.service.workspaceTickets(harness.asAgent());
        expect(second.tickets.filter((row) => row.title === "fail giant ticket").length).toBe(1);
        expect(second.tickets.filter((row) => row.title.startsWith("fail ticket ")).length).toBe(2);
        expect(snapshots.get("t232-fail-giant")).toEqual(["t232-fail-giant"]);
        expect(
          service._workspaceStores.get(WS)!.store.backfillReport()?.sessionIds.includes("t232-fail-giant"),
        ).toBe(true);
      },
    );
  });
});
