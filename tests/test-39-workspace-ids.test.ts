/**
 * #39: workspace-unique ids from the database.
 *
 * `Store.createTicket` allocates from the storage port (`allocateTicketId`)
 * before the create event appends, instead of reading the fold's
 * per-session `nextTicketId` counter. Two sessions (two Stores) sharing
 * one workspace port allocate distinct ids even when their folds are
 * stale relative to each other; a fresh workspace starts at 1.
 *
 * The host harness (`aidos-core.ts`) has no store and keeps the fold
 * counter — that fallback is what keeps every existing harness test
 * green, and it is covered by the existing suite, not here.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Store } from "../src/kernel/store";
import { MemoryStorage } from "../src/kernel/storage-memory";
import type { StoragePort } from "../src/kernel/storage";
import { openSqliteStorage } from "../src/host/storage-sqlite";
import { DuplicateSlug } from "../src/kernel/types";
import { FIXED_NOW, makeConfig, storeFromLog } from "./helpers";

/** One store on the given port with the fixed test clock. */
function sessionOn(storage: StoragePort): Store {
  return new Store(makeConfig(), { storage, now: () => FIXED_NOW });
}

/**
 * Two sessions share one workspace port; the second session opens AFTER
 * the project exists but BEFORE the first session's ticket, so its fold
 * is stale. Both create a ticket: the ids must differ. Against the old
 * fold-counter read both would allocate 1.
 */
function twoSessionsDiverge(storage: StoragePort): { first: number; second: number } {
  const first = sessionOn(storage);
  const project = first.createProject("/srv/proj/w", "w");
  const second = sessionOn(storage);
  const firstId = first.createTicket(project, "First session", "d");
  const secondId = second.createTicket(project, "Second session", "d");
  return { first: firstId, second: secondId };
}

describe("two sessions on one workspace port", () => {
  it("allocate differing ids on the shared memory port", () => {
    const storage = new MemoryStorage();
    const { first, second } = twoSessionsDiverge(storage);
    expect(first).toBe(1);
    expect(second).toBe(2);
    storage.close();
  });

  it("allocate differing ids on the shared sqlite port", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidos-39-db-"));
    const storage = openSqliteStorage(join(dir, "board.db"));
    try {
      const { first, second } = twoSessionsDiverge(storage);
      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(second).not.toBe(first);
    } finally {
      storage.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("a fresh workspace starts at 1", () => {
  it("on the memory port", () => {
    const store = sessionOn(new MemoryStorage());
    const project = store.createProject("/srv/proj/w", "w");
    expect(store.createTicket(project, "First", "d")).toBe(1);
  });

  it("on a sqlite port with no store yet", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidos-39-fresh-"));
    const storage = openSqliteStorage(join(dir, "board.db"));
    try {
      const store = sessionOn(storage);
      const project = store.createProject("/srv/proj/w", "w");
      expect(store.createTicket(project, "First", "d")).toBe(1);
    } finally {
      storage.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("allocation bookkeeping", () => {
  it("a refused create consumes no id", () => {
    const store = sessionOn(new MemoryStorage());
    const project = store.createProject("/srv/proj/w", "w");
    expect(store.createTicket(project, "First", "d", { slug: "taken" })).toBe(1);
    expect(() => store.createTicket(project, "Second", "d", { slug: "taken" })).toThrow(
      DuplicateSlug,
    );
    expect(store.createTicket(project, "Third", "d")).toBe(2);
  });

  it("a store seeded with an explicit log never reissues a seeded id", () => {
    const store = sessionOn(new MemoryStorage());
    const project = store.createProject("/srv/proj/w", "w");
    store.createTicket(project, "One", "d");
    store.createTicket(project, "Two", "d");
    // Reopen from the log onto a fresh ephemeral port: the fold floor
    // keeps the next create past every seeded id.
    const reopened = storeFromLog(store.events());
    const reopenedProject = reopened.ticketsFor(project).map((row) => row.projectId)[0];
    expect(reopenedProject).toBe(project);
    expect(reopened.createTicket(project, "Three", "d")).toBe(3);
  });
});
