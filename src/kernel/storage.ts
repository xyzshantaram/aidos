/**
 * #38: the storage PORT the kernel depends on.
 *
 * The kernel (`Store`) never touches SQLite, the filesystem, or any other
 * concrete persistence: it appends `AidosEvent` values through this
 * interface and replays them back from it. A real SQLite implementation
 * (`src/host/storage-sqlite.ts`) and an in-memory fake
 * (`src/kernel/storage-memory.ts`) both satisfy it, and the SAME kernel
 * conformance suite runs against both from day one — so the port
 * abstraction, not a test rewrite, is what proves the SQLite backing
 * behaves like the log the suite was written against.
 *
 * The envelope carries the ORIGIN every row needs for the migration chain:
 * `sessionId` names the dsh session whose log the event was flushed from
 * (null when the write originated directly in the store, which is the
 * normal case until #41's importer exists), and `localSeq` is that
 * session's own sequence number for the event (null when unknown). Both
 * stay NULLABLE in every implementation's schema on purpose: #41 backfills
 * them for imported rows, and a future shared-board design (#111) may add
 * identity columns alongside them without touching existing rows.
 *
 * #111 (identity/authorship), recorded here so #38's author columns are
 * final without a second schema redesign: the `author` on an evidence or
 * comment row is ASSERTED, never verified — today it is one of the bare
 * `"agent" | "user" | "system"` values stamped at the entry point, exactly
 * as the session-log fold does now. Nothing in this schema mistakes that
 * for proof of who wrote the row: a shared board (git forge, nostr-git)
 * will need an additive identity/provenance column with its own
 * refused-vs-marked-vs-escalated rule, and that column can land later
 * without rewriting a single existing row. A single-human workspace behaves
 * exactly as before until such a column exists and a workspace opts in.
 */

import type { AidosEvent } from "./events";
import type { TicketId } from "./types";

/** The schema version the implementations create on first open. */
export const STORE_SCHEMA_VERSION = 1;

/**
 * Where one stored event came from. Both fields are null when the write
 * originated directly in the store rather than as a flush of a session's
 * own event log — the normal case until #41's importer exists.
 */
export interface EventOrigin {
  /** The dsh session id the event was flushed from, or null. */
  sessionId: string | null;
  /** That session's own sequence number for the event, or null. */
  localSeq: number | null;
}

/** One event as the port holds it: the value plus its assigned envelope. */
export interface StoredEvent extends EventOrigin {
  /** Port-assigned, 1-based, strictly increasing in append order. */
  seq: number;
  /** The event value itself. */
  event: AidosEvent;
}

/**
 * The persistence contract. Append-only: there is no update and no delete,
 * because the log is the authority and state is always a fold of it.
 */
export interface StoragePort {
  /**
   * Persist one event and return its envelope. The port assigns `seq`;
   * the origin rides along for the migration chain (#41) and stays
   * nullable. Throwing leaves nothing persisted.
   */
  append(event: AidosEvent, origin?: Partial<EventOrigin>): StoredEvent;
  /**
   * #39: claim the next workspace-unique ticket id and advance the
   * counter past it. The Store calls this BEFORE appending the create
   * event, because the id goes into the event payload. One call claims
   * exactly one id: two Stores sharing one port (two sessions, one
   * workspace) never receive the same id, even when their in-memory
   * folds are stale relative to each other. A fresh port starts at 1.
   *
   * A refused create consumes nothing — the Store validates (unknown
   * project, duplicate slug) BEFORE allocating, so only a create that
   * will actually append claims an id.
   */
  allocateTicketId(): TicketId;
  /** Every stored event, oldest first. */
  readAll(): StoredEvent[];
  /**
   * #40: the transaction bracket of the mirrored write path. The Store
   * opens the store's transaction, appends to the log, then commits; a
   * failure at any step refuses the whole write, so the log and the store
   * can never disagree. OPTIONAL on the port: a port without these
   * methods keeps the pre-#40 persist-first order (persist, then fold),
   * which is still all-or-nothing from the fold's side; both shipped
   * implementations implement the bracket, so the mirrored order is what
   * runs everywhere in production and in the conformance suite.
   *
   * beginTransaction throws if the bracket is already open (no nesting);
   * rollbackTransaction is best-effort — it may itself fail when the
   * failed statement already rolled the transaction back, and the caller
   * treats either outcome as "nothing persisted".
   */
  beginTransaction?(): void;
  /** #40: commit the bracket opened by beginTransaction. Throws to refuse. */
  commitTransaction?(): void;
  /** #40: best-effort rollback of the open bracket. */
  rollbackTransaction?(): void;
  /** Release the underlying handle. Idempotent: closing twice is silent. */
  close(): void;
}
