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

/** An ephemeral port: the log lives in one array and dies with the handle. */
export class MemoryStorage implements StoragePort {
  private _rows: StoredEvent[] = [];
  private _closed = false;

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

  close(): void {
    this._closed = true;
  }
}
