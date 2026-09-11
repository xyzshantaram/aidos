/**
 * #40: the mirrored write path.
 *
 * `_append` (the kernel Store's commit, the write path the port sits
 * behind) writes BOTH sides in the ticket's order: open the store's
 * transaction, append to the session log, then commit the transaction.
 * A failure at any step refuses the whole write — the hard-fail rule,
 * matching the host _commit's unregistered-event-type precedent — so the
 * log and the store can never disagree. The repair half covers the one
 * surviving window: a commit that fails AFTER a successful log append
 * leaves log events with no store row, repaired on the next open.
 *
 * Criterion map:
 *   1. a normal write lands one log event and one `events` row with the
 *      same payload
 *   2. a write against a read-only database file refuses, and the session
 *      log gains no event
 *   3. the refusal message names the store
 *   4. a log event with no store row is repaired on the next open
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Store } from "../src/kernel/store";
import { MemoryStorage } from "../src/kernel/storage-memory";
import type { StoragePort, StoredEvent } from "../src/kernel/storage";
import type { AidosEvent, TicketId } from "../src/kernel/types";
import { StoreWriteRefused } from "../src/kernel/types";
import { openSqliteStorage } from "../src/host/storage-sqlite";
import { FIXED_NOW, makeConfig } from "./helpers";

/** One sqlite port in a throwaway temp dir. */
function withSqlite(fn: (storage: StoragePort, path: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "aidos-40-db-"));
  const storage = openSqliteStorage(join(dir, "board.db"));
  try {
    fn(storage, storage.path);
  } finally {
    storage.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A store on the given port with the fixed test clock. */
function storeOn(storage: StoragePort): Store {
  return new Store(makeConfig(), { now: () => FIXED_NOW, storage });
}

/** Reach the live connection — the read-only pragma is per-connection. */
function execRaw(storage: StoragePort, sql: string): void {
  (storage as unknown as { _db: { exec: (sql: string) => void } })._db.exec(sql);
}

describe("#40 criterion 1: a normal write lands both, with the same payload", () => {
  it("on the sqlite port: one log event, one events row, identical payload", () => {
    withSqlite((storage) => {
      const store = storeOn(storage);
      const project = store.createProject("/srv/proj/cli", "cli");
      const ticket = store.createTicket(project, "Mirrored", "both sides", {
        criteria: "one event, one row",
      });
      // One event per write, log and store, and the payloads agree byte
      // for byte through their canonical JSON.
      const log = store.events();
      const rows = storage.readAll();
      expect(log.length).toBe(rows.length);
      expect(log.length).toBe(2); // project + ticket
      for (const [index, event] of log.entries()) {
        expect(JSON.stringify(rows[index]!.event)).toBe(JSON.stringify(event));
        expect(rows[index]!.seq).toBe(index + 1);
      }
      // The ticket id from the port (#39) and the board agree.
      expect(store.getTicket(ticket).title).toBe("Mirrored");
      void ticket;
    });
  });

  it("on the memory port: the same bracket runs and agrees", () => {
    const storage = new MemoryStorage();
    const store = storeOn(storage);
    const project = store.createProject("/w", "w");
    store.addComment(store.createTicket(project, "T", "d"), "note", "user");
    const log = store.events();
    const rows = storage.readAll();
    expect(log.length).toBe(rows.length);
    for (const [index, event] of log.entries()) {
      expect(JSON.stringify(rows[index]!.event)).toBe(JSON.stringify(event));
    }
    storage.close();
  });
});

describe("#40 criteria 2+3: a read-only store refuses, log untouched, message names the store", () => {
  it("a write against a read-only database refuses whole", () => {
    withSqlite((storage) => {
      const store = storeOn(storage);
      const project = store.createProject("/srv/proj/cli", "cli");
      // Touch the handle so the connection exists, then make THIS
      // connection refuse every write — the same SQLITE_READONLY
      // condition an unwritable database file produces.
      execRaw(storage, `PRAGMA query_only = 1`);
      const before = store.events().length;
      let refused: unknown;
      try {
        store.createTicket(project, "Doomed", "never lands");
      } catch (error) {
        refused = error;
      }
      expect(refused).toBeInstanceOf(StoreWriteRefused);
      // The session log gained no event, and the fold did not move.
      expect(store.events().length).toBe(before);
      expect(store.ticketsFor(project)).toEqual([]);
      // The store gained no row either: the two still agree.
      expect(storage.readAll().length).toBe(before);
      // Criterion 3: the message names the store AND carries the cause.
      expect((refused as Error).message).toMatch(/store refused the write/);
      expect((refused as Error).message).toMatch(/readonly/);
    });
  });

  it("after a refused write the store stays usable for good writes", () => {
    withSqlite((storage) => {
      const store = storeOn(storage);
      const project = store.createProject("/srv/proj/cli", "cli");
      execRaw(storage, `PRAGMA query_only = 1`);
      expect(() => store.createTicket(project, "Doomed", "never lands")).toThrow(
        StoreWriteRefused,
      );
      execRaw(storage, `PRAGMA query_only = 0`);
      // The bracket is released and the fold is whole: the next write
      // lands on both sides normally.
      const ticket = store.createTicket(project, "Recovered", "lands fine");
      expect(store.getTicket(ticket).title).toBe("Recovered");
      expect(storage.readAll().at(-1)).toMatchObject({ seq: 2 });
    });
  });
});

describe("#40: a failure AT the commit step refuses the whole write", () => {
  it("a throwing commit leaves the log and the fold untouched", () => {
    const calls: string[] = [];
    class CommitFails implements StoragePort {
      private rows: StoredEvent[] = [];
      private staged: StoredEvent[] | null = null;
      private nextId: TicketId = 1;
      append(event: AidosEvent, origin?: Partial<StoredEvent>): StoredEvent {
        calls.push("append");
        // Inside the bracket nothing is committed yet: stage it.
        const stored: StoredEvent = {
          seq: this.rows.length + (this.staged?.length ?? 0) + 1,
          sessionId: origin?.sessionId ?? null,
          localSeq: origin?.localSeq ?? null,
          event,
        };
        (this.staged ?? this.rows).push(stored);
        return stored;
      }
      allocateTicketId(): TicketId {
        return this.nextId++;
      }
      readAll(): StoredEvent[] {
        return [...this.rows];
      }
      beginTransaction(): void {
        calls.push("begin");
        if (this.staged !== null) {
          throw new Error("a storage transaction is already open");
        }
        this.staged = [];
      }
      commitTransaction(): void {
        calls.push("commit");
        throw new Error("disk full on commit");
      }
      rollbackTransaction(): void {
        calls.push("rollback");
        this.staged = null;
      }
      close(): void {}
    }
    const storage = new CommitFails();
    const store = storeOn(storage);
    expect(() => store.createProject("/w", "w")).toThrow(StoreWriteRefused);
    // The order is the ticket's: begin, then the log append, then commit.
    expect(calls).toEqual(["begin", "append", "commit", "rollback"]);
    // The whole write is refused: no log event, no row, no fold.
    expect(store.events()).toEqual([]);
    expect(storage.readAll()).toEqual([]);
    expect(store.projects()).toEqual([]);
    // And the message names the store with the commit's own cause.
    let message = "";
    try {
      store.createProject("/w", "w");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/store refused the write/);
    expect(message).toMatch(/disk full on commit/);
  });
});

describe("#40 criterion 4: a log event with no store row is repaired on the next open", () => {
  it("a log ahead of the store catches the store up on open", () => {
    withSqlite((storage) => {
      // Build a real log on the memory port...
      const source = storeOn(new MemoryStorage());
      const project = source.createProject("/srv/proj/cli", "cli");
      const ticket = source.createTicket(project, "Crash window", "commit failed");
      source.addComment(ticket, "repaired", "user");
      const log = source.events();
      // ...then simulate the surviving window: the first append committed,
      // the rest did not (a commit that failed after a successful append).
      for (const event of log.slice(0, 1)) {
        storage.append(event);
      }
      expect(storage.readAll().length).toBe(1);
      // The NEXT OPEN repairs: the store gains the missing rows.
      const reopened = new Store(makeConfig(), {
        now: () => FIXED_NOW,
        log: [...log],
        storage,
      });
      const rows = storage.readAll();
      expect(rows.length).toBe(log.length);
      for (const [index, event] of log.entries()) {
        expect(JSON.stringify(rows[index]!.event)).toBe(JSON.stringify(event));
      }
      // And the reopened board folds the whole repaired log.
      expect(reopened.getTicket(ticket).title).toBe("Crash window");
      expect(reopened.commentsFor(ticket).map((c) => c.text)).toEqual(["repaired"]);
    });
  });

  it("a repair that cannot land refuses the open instead of papering over", () => {
    withSqlite((storage) => {
      const source = storeOn(new MemoryStorage());
      source.createProject("/w", "w");
      const log = source.events();
      // Touch the handle so the live connection exists, then make it
      // refuse writes: the repair itself cannot land.
      storage.readAll();
      execRaw(storage, `PRAGMA query_only = 1`);
      // The repair itself hits the read-only store: the open refuses,
      // naming the store — no half-repaired board is served.
      expect(
        () => new Store(makeConfig(), { now: () => FIXED_NOW, log: [...log], storage }),
      ).toThrow(StoreWriteRefused);
      // Nothing was repaired: the store still holds nothing.
      expect(storage.readAll()).toEqual([]);
    });
  });

  it("a genuine disagreement refuses the open rather than repairing blind", () => {
    withSqlite((storage) => {
      const source = storeOn(new MemoryStorage());
      source.createProject("/srv/proj/one", "one");
      const log = source.events();
      // The store holds a DIFFERENT event where the log holds its first.
      storage.append({ kind: "aidos/refusal", version: 1, ticketId: 1, fromState: null, toState: null, actor: null, reason: "foreign", at: 1 });
      expect(
        () => new Store(makeConfig(), { now: () => FIXED_NOW, log: [...log], storage }),
      ).toThrow(/disagree at event 1/);
    });
  });

  it("a store ahead of the log refuses the open", () => {
    withSqlite((storage) => {
      storage.append({ kind: "project/created", version: 1, projectId: 1, absPath: "/w", name: "w", at: 1 });
      // An EMPTY log over a non-empty store is a store-ahead disagreement.
      expect(
        () => new Store(makeConfig(), { now: () => FIXED_NOW, log: [], storage }),
      ).toThrow(/store holds 1 events but the log holds 0/);
    });
  });

  it("a matching log and store open with no repair and no writes", () => {
    withSqlite((storage) => {
      const first = storeOn(storage);
      const project = first.createProject("/w", "w");
      first.createTicket(project, "Settled", "d");
      const log = first.events();
      const before = storage.readAll().length;
      // Same log, same store: prefix matches, lengths match, nothing to do.
      const reopened = new Store(makeConfig(), {
        now: () => FIXED_NOW,
        log: [...log],
        storage,
      });
      expect(storage.readAll().length).toBe(before);
      expect(reopened.events().length).toBe(before);
    });
  });
});
