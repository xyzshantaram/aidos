/**
 * #465: the merge's dedupe log fires on the DECISION CHANGING, not on every
 * read.
 *
 * Measured on the live machine before this fix: 94,014 of dsh-web's 96,546
 * journal lines in 24 hours (97.4%) were the `aidos: #83 dedupe` statement.
 * The board merges on every board read and the aidos workspace holds 82 twin
 * families, so one read emitted well over a hundred lines — and 97% of them
 * were byte-identical to the merge before, because the same families resolve
 * the same way every time.
 *
 * The throttle mirrors `_reportStoreCoverage`'s `_lastCoverageSignature`
 * (#222) rather than introducing a second mechanism for the same job. The
 * tests below pin the three properties that make it a throttle rather than a
 * mute:
 *
 *   1. repeated reads of an unchanged board log the detail ONCE;
 *   2. a board whose dedupe DECISION changes logs again, in full;
 *   3. editing a ticket does NOT re-fire it — an earlier draft folded
 *      `updatedAt` into the signature, which traded "noisy on every read"
 *      for "noisy on every write", re-logging all 82 families whenever any
 *      one ticket was touched. `updatedAt` is not a dedupe outcome.
 *
 * Harness idiom follows tests/test-222-store-coverage.test.ts: a real Store
 * folding real writes on its own port, raw-appended to a peer session, so the
 * peer row shares an IDENTITY (`workspaceKey:slug`) with the caller's row and
 * the merge genuinely has something to dedupe.
 */

import { describe, expect, it, vi } from "vitest";

import { Store } from "../src/kernel/store";
import { MemoryStorage } from "../src/kernel/storage-memory";
import { createHarness } from "./b1-harness";
import { FIXED_NOW, makeConfig } from "./helpers";

const WS = "/home/sid/repos/aidos";

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
  harness.ctx.reflect.provide("sessionPersistence", {
    list: async () => [],
    inspect: async () => {
      throw new Error("not found");
    },
  });
}

function setLogger(harness: ReturnType<typeof createHarness>): { info: ReturnType<typeof vi.fn> } {
  const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  (harness.ctx as unknown as { logger: unknown }).logger = logger;
  return logger;
}

/** Every per-report dedupe line, in call order. */
function dedupeLines(logger: { info: ReturnType<typeof vi.fn> }): string[] {
  return logger.info.mock.calls.map((call) => String(call[0])).filter((line) => line.includes("#83 dedupe"));
}

/** The one-line merge summary, which rides the same gate. */
function summaryLines(logger: { info: ReturnType<typeof vi.fn> }): string[] {
  return logger.info.mock.calls
    .map((call) => String(call[0]))
    .filter((line) => line.includes("#83 workspace merge"));
}

/** A board with a genuine duplicate identity: caller's row + a peer's row. */
async function boardWithADuplicate(title = "Shared ticket") {
  const harness = createHarness(undefined, { cwd: WS });
  harness.installService();
  provideEmptyPersistence(harness);
  const service = harness.service;
  service.userSetTicket(harness.asAgent(), { title });
  const peer = harness.makeAgent({ id: "session-peer" });
  (peer.session.header as { cwd?: string }).cwd = WS;
  for (const event of kernelTickets([title])) {
    harness.appendAidosEvent(peer, event);
  }
  return { harness, service, peer };
}

describe("#465 the dedupe log is throttled on the decision, not the read", () => {
  it("logs the per-report detail once, then stays silent across repeated reads", async () => {
    const { harness, service } = await boardWithADuplicate();
    const logger = setLogger(harness);

    await service.workspaceTickets(harness.asAgent());
    const afterFirst = dedupeLines(logger).length;
    // The fixture must actually exercise dedupe, or this test proves nothing.
    expect(afterFirst).toBeGreaterThan(0);
    expect(summaryLines(logger)).toHaveLength(1);

    for (let i = 0; i < 5; i += 1) {
      await service.workspaceTickets(harness.asAgent());
    }

    // Five further merges, no further lines: the volume is gone, not reduced.
    expect(dedupeLines(logger)).toHaveLength(afterFirst);
    expect(summaryLines(logger)).toHaveLength(1);
  });

  it("logs again, in full, when the dedupe decision changes", async () => {
    const { harness, service } = await boardWithADuplicate();
    const logger = setLogger(harness);

    await service.workspaceTickets(harness.asAgent());
    const afterFirst = dedupeLines(logger).length;
    await service.workspaceTickets(harness.asAgent());
    expect(dedupeLines(logger)).toHaveLength(afterFirst);

    // A second duplicated identity: the outcome is genuinely different now.
    const other = "Second shared ticket";
    service.userSetTicket(harness.asAgent(), { title: other });
    const peer2 = harness.makeAgent({ id: "session-peer-two" });
    (peer2.session.header as { cwd?: string }).cwd = WS;
    for (const event of kernelTickets([other])) {
      harness.appendAidosEvent(peer2, event);
    }

    await service.workspaceTickets(harness.asAgent());

    // Changed decision re-fires immediately — a throttle, not a mute.
    expect(dedupeLines(logger).length).toBeGreaterThan(afterFirst);
    expect(summaryLines(logger).length).toBeGreaterThan(1);
  });

  it("does NOT re-fire when a ticket is merely edited", async () => {
    // The regression this test exists for: folding updatedAt into the
    // signature would re-log every family on every write. Editing changes a
    // timestamp, never which row wins.
    const { harness, service } = await boardWithADuplicate();
    const logger = setLogger(harness);

    await service.workspaceTickets(harness.asAgent());
    const afterFirst = dedupeLines(logger).length;
    expect(afterFirst).toBeGreaterThan(0);

    const board = await service.workspaceTickets(harness.asAgent());
    const row = board.tickets[0];
    service.userSetTicket(harness.asAgent(), {
      ticketId: row.id,
      description: "edited, which moves updatedAt and nothing else that matters",
    });

    await service.workspaceTickets(harness.asAgent());

    expect(dedupeLines(logger)).toHaveLength(afterFirst);
  });
});
