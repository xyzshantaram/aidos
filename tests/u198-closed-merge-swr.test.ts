/**
 * RETIRED BY #42 ("the board reads the store").
 *
 * #198's stale-while-revalidate merge tested the machinery that kept a cold
 * scan of every closed session log tolerable (the `_closedFolds` cache, the
 * bounded-concurrency pool, the background refreshes). #42 deletes that
 * machinery outright — closed sessions are answered by the workspace store
 * after a one-time backfill, and no board read inspects a log — so every
 * test this file held pins behavior that no longer exists.
 *
 * Coverage moves to:
 *  - tests/test-42-board-reads-store.test.ts (the three #42 criteria, by
 *    inspect/list counts, plus backfill failure and retry behavior);
 *  - tests/merge-closed-fold-cache.test.ts (rewritten: the store answers
 *    closed rows, the cache is gone, the reopen-close gap stated).
 *
 * This file is kept as a labeled empty suite because the worktree's sandbox
 * does not permit deleting it; it holds no tests.
 */
import { describe, it } from "vitest";

describe.skip("#198 closed-merge SWR — retired by #42, see test-42-board-reads-store.test.ts", () => {
  it("retired", () => {});
});
