/**
 * #222, last technical criterion: a check that compares board row count
 * against store row count and reports a divergence.
 *
 * The board is `own fold + live folds + store`, deduped (#83). #219 plans
 * to delete the fold inputs and let the store BE the board — run today,
 * that turns a 303-row board into a 165-row board with no warning, because
 * every component behaves as designed. The gap lives in the DRIVER's
 * session selection (#221's mirrored-session skip, which is CORRECT and
 * stays), before the kernel is ever handed anything, so #211's
 * importer-side loss reporting cannot see it.
 *
 * Criterion map (this criterion ONLY):
 *   - a board with rows the store lacks reports the divergence with the
 *     right count — the live-peer test below: the peer's row shares the
 *     store's numeric id 1 yet is still reported missing, because matching
 *     is by `workspaceKey:slug` identity, not by number.
 *   - a board fully covered by the store reports zero rather than silence
 *     — `checked: true, missingCount: 0, lossless: true`, never a bare
 *     absence (the #211 "lost nothing" spirit).
 *   - the log does not fire repeatedly on repeated reads — one line per
 *     divergence per workspace per process; repeats are silent, a changed
 *     set re-fires, and nothing logs mid-import (transient, not signal).
 *
 * Builders: kernel-built peer logs (the test-41 pattern — a real Store
 * folding real writes, raw-appended to the peer session) wherever the test
 * needs store-unknown rows. Creating through the service would mirror the
 * ticket into the shared store (#218) and the row would never diverge.
 */

import { describe, expect, it, vi } from "vitest";

import { boardStoreDivergence } from "../src/host/aidos-core";
import { Store } from "../src/kernel/store";
import { MemoryStorage } from "../src/kernel/storage-memory";
import { workspaceKeyFromPath } from "../src/kernel/slug";
import { createHarness } from "./b1-harness";
import { FIXED_NOW, makeConfig } from "./helpers";

const WS = "/home/sid/repos/aidos";
const KEY = workspaceKeyFromPath(WS);

/** One kernel-built log: its own Store folds real writes on its own port. */
function kernelTickets(titles: string[]): ReturnType<Store["events"]> {
  const source = new Store(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
  const projectId = source.createProject(WS, "aidos");
  for (const title of titles) {
    source.createTicket(projectId, title, `${title} body`);
  }
  return source.events();
}

function provideEmptyPersistence(harness: ReturnType<typeof createHarness>): void {
  // No closed sessions: the backfill verifies immediately (fresh is empty)
  // without touching a log, so later merges are steady-state, not transient.
  harness.ctx.reflect.provide("sessionPersistence", {
    list: async () => [],
    inspect: async () => {
      throw new Error("not found");
    },
  });
}

function setLogger(harness: ReturnType<typeof createHarness>): {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
} {
  const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  (harness.ctx as unknown as { logger: unknown }).logger = logger;
  return logger;
}

/** Every #222 coverage line, info or warn, in call order. */
function coverageLines(logger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> }): string[] {
  const calls = [...logger.info.mock.calls, ...logger.warn.mock.calls];
  return calls.map((call) => String(call[0])).filter((line) => line.includes("#222 store coverage"));
}

describe("#222 boardStoreDivergence is identity-based, not id-based", () => {
  it("a covered board reports zero, not silence", () => {
    const board = [
      { id: 1, title: "A", workspaceKey: KEY, slug: "a" },
      { id: 2, title: "B", workspaceKey: KEY, slug: "b" },
    ];
    const out = boardStoreDivergence(board, new Set([`${KEY}:a`, `${KEY}:b`]));
    expect(out.missingCount).toBe(0);
    expect(out.missing).toEqual([]);
  });

  it("missing rows come back with count and id-ordered identities", () => {
    const board = [
      { id: 9, title: "late", workspaceKey: KEY, slug: "late" },
      { id: 3, title: "early", workspaceKey: KEY, slug: "early" },
      { id: 5, title: "held", workspaceKey: KEY, slug: "held" },
    ];
    const out = boardStoreDivergence(board, new Set([`${KEY}:held`]));
    expect(out.missingCount).toBe(2);
    expect(out.missing).toEqual([
      { id: 3, title: "early" },
      { id: 9, title: "late" },
    ]);
  });

  it("the numeric id is never consulted", () => {
    // A live session's local counter and the store's port counter mint in
    // different spaces: unrelated tickets share numbers routinely. A row
    // whose NUMBER the store holds but whose IDENTITY it lacks is missing.
    const board = [{ id: 1, title: "live only", workspaceKey: KEY, slug: "live-only" }];
    const covered = boardStoreDivergence(board, new Set([`${KEY}:live-only`]));
    expect(covered.missingCount).toBe(0);
    const diverged = boardStoreDivergence(board, new Set([`${KEY}:something-else`]));
    expect(diverged.missingCount).toBe(1);
    expect(diverged.missing).toEqual([{ id: 1, title: "live only" }]);
  });
});

describe("#222 the queryable check", () => {
  it("a board fully covered by the store reports zero with lossless true", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "First" });
    service.userSetTicket(harness.asAgent(), { title: "Second" });

    await service.workspaceTickets(harness.asAgent());
    const coverage = await service.storeCoverage(harness.asAgent());

    expect(coverage.checked).toBe(true);
    expect(coverage.backfillVerified).toBe(true);
    expect(coverage.boardRows).toBe(2);
    expect(coverage.storeRows).toBe(2);
    expect(coverage.missingCount).toBe(0);
    expect(coverage.missing).toEqual([]);
    expect(coverage.lossless).toBe(true);
    expect(coverage.reason).toBeNull();
  });

  it("a live-only row the store lacks diverges, even when its number collides", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const logger = setLogger(harness);
    const service = harness.service;
    // Mirrored (#218): the store holds this identity under the port id 1.
    service.userSetTicket(harness.asAgent(), { title: "Own ticket" });
    // Store-unknown: raw-appended, never mirrored — and the peer fold's
    // local counter ALSO mints id 1, the legacy collision. Matching by
    // number would call this row covered; matching by identity does not.
    const peer = harness.makeAgent({ id: "session-peer" });
    (peer.session.header as { cwd?: string }).cwd = WS;
    for (const event of kernelTickets(["Peer-only ticket"])) {
      harness.appendAidosEvent(peer, event);
    }

    const board = await service.workspaceTickets(harness.asAgent());
    const ids = board.tickets.map((row) => row.id);
    expect(new Set(ids).size).toBe(1);
    const coverage = await service.storeCoverage(harness.asAgent());

    expect(coverage.checked).toBe(true);
    expect(coverage.backfillVerified).toBe(true);
    expect(coverage.boardRows).toBe(2);
    expect(coverage.storeRows).toBe(1);
    expect(coverage.missingCount).toBe(1);
    expect(coverage.missing).toEqual([{ id: ids[0], title: "Peer-only ticket" }]);
    expect(coverage.lossless).toBe(false);
    const warns = logger.warn.mock.calls.map((call) => String(call[0]));
    expect(warns.some((line) => line.includes("#222 store coverage DIVERGED") && line.includes("Peer-only ticket"))).toBe(
      true,
    );
  });
});

describe("#222 the log fires once per divergence, never per read", () => {
  it("a clean board logs complete once and stays silent on repeat reads", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const logger = setLogger(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "Only" });

    await service.workspaceTickets(harness.asAgent());
    service.getTickets(harness.asAgent());
    service.getTickets(harness.asAgent());

    const lines = coverageLines(logger);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("coverage complete");
  });

  it("nothing logs before the backfill verifies", async () => {
    // No persistence provided: the import can never verify, so any
    // divergence is transient mid-import noise, not signal. The read still
    // answers — the check stays out of its way.
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const logger = setLogger(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "Only" });

    const rows = service.getTickets(harness.asAgent());
    expect(rows).toHaveLength(1);
    expect(coverageLines(logger)).toHaveLength(0);

    // Let the kicked run settle: the sync read above single-flights a run
    // started while no persistence existed, and an awaited read inherits
    // the in-flight run rather than starting a second one (#221's
    // documented choice). Providing persistence only takes effect on the
    // NEXT run, after the stale one resolves and deletes itself.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    provideEmptyPersistence(harness);
    await service.workspaceTickets(harness.asAgent());
    expect(coverageLines(logger)).toHaveLength(1);
  });

  it("a changed set re-fires, and a long tail is sampled, not printed", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    provideEmptyPersistence(harness);
    const logger = setLogger(harness);
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "Own ticket" });
    await service.workspaceTickets(harness.asAgent());
    expect(coverageLines(logger)).toHaveLength(1);

    const peer = harness.makeAgent({ id: "session-peer" });
    (peer.session.header as { cwd?: string }).cwd = WS;
    const titles = Array.from({ length: 12 }, (_, index) => `tail ticket ${index}`);
    for (const event of kernelTickets(titles)) {
      harness.appendAidosEvent(peer, event);
    }
    service.getTickets(harness.asAgent());
    service.getTickets(harness.asAgent());

    const lines = coverageLines(logger);
    expect(lines).toHaveLength(2);
    const diverged = lines[1];
    expect(diverged).toContain("DIVERGED");
    expect(diverged).toContain("12 of 13 board rows");
    expect(diverged).toContain("tail ticket 0");
    expect(diverged).toContain("…and 2 more");
    expect(diverged).not.toContain("tail ticket 11");
  });
});

describe("#222 storeCoverage wire envelope", () => {
  it("carries a Remote marker with the gateway envelope", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    const service = harness.installService();
    const typert = await import("@deepseek-ai/dsh-typert-protocol");
    const marker = typert.remoteMethods(service).find(
      (candidate) => (candidate.exportName ?? candidate.method) === "storeCoverage",
    );
    expect(marker, "storeCoverage must carry a Remote marker").toBeDefined();
    // Same contract the gateway derives from parameter names: the first
    // param `agent` is the lookup (wire agentId), the second is the JSON
    // args object under the name `args`.
    const source = service.storeCoverage.toString();
    const open = source.indexOf("(");
    const close = source.indexOf(")", open + 1);
    const params = source
      .slice(open + 1, close)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    expect(params[0]).toBe("agent");
    expect(params[1].startsWith("args")).toBe(true);
  });
});
