/**
 * #38: the in-memory fake behind the storage port.
 *
 * One half of the port contract: this fake and the real SQLite
 * implementation (`src/host/storage-sqlite.ts`) satisfy the SAME
 * `StoragePort`, and the SAME kernel conformance suite runs against both
 * from day one. Behaviour here is deliberately the plain log the `Store`
 * has always folded — append assigns the next seq, reads return oldest
 * first — so a divergence between the two implementations shows up as a
 * conformance failure, not as a judgement call.
 */

import type { AidosEvent } from "./events";
import type { EventOrigin, StoredEvent, StoragePort } from "./storage";
import type { TicketId } from "./types";

/** An ephemeral port: the log lives in one array and dies with the handle. */
export class MemoryStorage implements StoragePort {
  private _rows: StoredEvent[] = [];
  private _closed = false;
  /**
   * #39: the workspace-unique id counter. Lives on the PORT, not on any
   * one Store's fold, so two Stores sharing this handle allocate
   * distinct ids. Starts at 1: a fresh workspace's first create is 1.
   */
  private _nextTicketId: TicketId = 1;

  append(event: AidosEvent, origin?: Partial<EventOrigin>): StoredEvent {
    if (this._closed) {
      throw new Error("storage is closed");
    }
    const stored: StoredEvent = {
      seq: this._rows.length + 1,
      sessionId: origin?.sessionId ?? null,
      localSeq: origin?.localSeq ?? null,
      event,
    };
    this._rows.push(stored);
    return stored;
  }

  readAll(): StoredEvent[] {
    return [...this._rows];
  }

  allocateTicketId(): TicketId {
    if (this._closed) {
      throw new Error("storage is closed");
    }
    const id = this._nextTicketId;
    this._nextTicketId += 1;
    return id;
  }

  close(): void {
    this._closed = true;
  }

  // ---- #40: the transaction bracket (no-ops — the fake is always
  // consistent with itself — but the nesting guard keeps the bracket
  // contract honest, so the same Store path runs against both ports) ----

  private _inTransaction = false;

  beginTransaction(): void {
    if (this._closed) {
      throw new Error("storage is closed");
    }
    if (this._inTransaction) {
      throw new Error("a storage transaction is already open");
    }
    this._inTransaction = true;
  }

  commitTransaction(): void {
    if (this._closed) {
      throw new Error("storage is closed");
    }
    if (!this._inTransaction) {
      throw new Error("no storage transaction is open");
    }
    this._inTransaction = false;
  }

  rollbackTransaction(): void {
    this._inTransaction = false;
  }
}
