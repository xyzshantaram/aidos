/**
 * #38: the real SQLite implementation behind the kernel's storage port.
 *
 * NO FS-SANDBOX PATCH IS REQUESTED FOR THIS STORE — deliberately, not by
 * omission. The scratch root needed one because `scratch_write` /
 * `scratch_edit` are model-facing TOOLS and dsh's fs-sandbox intercepts
 * tool calls. This store is written by aidos's own host-plane plugin code
 * doing plain Node fs/driver I/O through `node:sqlite` — never a tool call
 * — so it is not subject to that sandbox. If a future Thursday build
 * sandboxes host-plane file I/O itself, that is a new constraint to design
 * against then, not a patch to request now.
 *
 * NO UNINSTALL/REVERSAL LOGIC LIVES HERE, also deliberately. The store file
 * lives ONLY under `dshHomePath("aidos", ...)` (see `storePathForWorkspace`
 * below), and Thursday's uninstall deletes the entire `$THURSDAY_HOME`
 * (which contains `DSH_HOME`) wholesale — so one deletion already removes
 * the store. There is nothing to reverse and no second path to clean up.
 *
 * PATH (binding per the 2026-09-10 review note, overriding the body's
 * looser wording): `$DSH_HOME/aidos/storage/<canonical-workspace-key>/board.db`,
 * resolved through `dshHomePath("aidos", ...)` — the same override
 * `src/tools/scratch.ts` uses — keyed by `workspaceKeyFromPath(cwd)`. Never
 * hardcoded, never Thursday-specific, never inside the workspace. Thursday's
 * launcher sets `DSH_HOME` to `$THURSDAY_HOME/dsh` for the whole process
 * lifetime, so following this convention lands the store inside the Thursday
 * home automatically with zero Thursday-specific code. The per-project
 * keying is the existing absolute-path-derived key; a portable identity
 * that survives cloning to another machine is MP1's job, explicitly not
 * v0.1.0 (and a different question from #111 row authorship — see
 * `src/kernel/storage.ts`).
 */

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { SqliteDatabase } from "node:sqlite";

import { dshHomePath } from "@deepseek-ai/dsh-home-paths";

import { workspaceKeyFromPath } from "../kernel/slug";
import { STORE_SCHEMA_VERSION } from "../kernel/storage";
import type { AidosEvent } from "../kernel/events";
import type { EventOrigin, StoredEvent, StoragePort } from "../kernel/storage";

/** The store file name inside one workspace's storage directory. */
export const STORE_FILE_NAME = "board.db";

/**
 * The database file for one workspace checkout. Directory part is
 * `$DSH_HOME/aidos/storage/<canonical-workspace-key>`; the file itself is
 * `board.db` inside it (the directory form leaves room for sibling files —
 * lock sidecars, future indexes — without a second key derivation).
 */
export function storePathForWorkspace(cwd: string): string {
  return dshHomePath("aidos", "storage", workspaceKeyFromPath(cwd), STORE_FILE_NAME);
}

/** The `at` of one event for the events table's indexed column. */
function eventAt(event: AidosEvent): number {
  if (event.kind === "evidence/attached") {
    return event.row.at;
  }
  return event.at;
}

/** The whole schema, applied idempotently on every open. */
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS schema_version(
    version INTEGER PRIMARY KEY,
    applied_at REAL NOT NULL
  )`,
  // The raw aidos/* rows. origin_session/origin_seq stay NULLABLE on
  // purpose: direct store writes have no session origin, and #41's importer
  // backfills them for flushed session-log rows.
  `CREATE TABLE IF NOT EXISTS events(
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    origin_session TEXT NULL,
    origin_seq INTEGER NULL,
    at REAL NOT NULL,
    payload TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS events_kind_idx ON events(kind)`,
  `CREATE TABLE IF NOT EXISTS projects(
    project_id INTEGER PRIMARY KEY,
    abs_path TEXT NOT NULL,
    name TEXT NOT NULL,
    at REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tickets(
    ticket_id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    criteria TEXT NOT NULL DEFAULT '',
    phase INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    state TEXT NOT NULL,
    slug TEXT NOT NULL,
    workspace_key TEXT NOT NULL,
    depends_on TEXT NOT NULL DEFAULT '[]',
    allowlist TEXT NOT NULL DEFAULT '[]',
    revision INTEGER NOT NULL,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    snapshot TEXT NOT NULL
  )`,
  // author is the ASSERTED bare Actor value ("agent" | "user" | "system"),
  // stamped at the entry point — never verified, never proof of identity.
  // See src/kernel/storage.ts (#111) for the recorded decision.
  `CREATE TABLE IF NOT EXISTS evidence(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    author TEXT NOT NULL,
    at REAL NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE INDEX IF NOT EXISTS evidence_ticket_idx ON evidence(ticket_id)`,
  `CREATE TABLE IF NOT EXISTS comments(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    at REAL NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS comments_ticket_idx ON comments(ticket_id)`,
  // One row per counter; 'ticket' mirrors the fold's nextTicketId so an
  // external reader (#41) can allocate without replaying.
  `CREATE TABLE IF NOT EXISTS id_counter(
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  )`,
  // Full text over title, description, criteria, and comment text.
  // ticket_id is stored UNINDEXED: it names the ticket, never a query term.
  `CREATE VIRTUAL TABLE IF NOT EXISTS ticket_fts USING fts5(
    ticket_id UNINDEXED,
    title,
    description,
    criteria,
    comment_text
  )`,
];

/**
 * A SQLite-backed port. Open is LAZY (first append/read, not construction)
 * and IDEMPOTENT: `openSqliteStorage` returns one shared handle per resolved
 * path per process, so opening the same path twice yields one usable handle
 * with no error. WAL mode plus a busy timeout let two dsh processes hold
 * one workspace's database.
 */
export class SqliteStorage implements StoragePort {
  private readonly _path: string;
  private _db: SqliteDatabase | null = null;
  private _closed = false;

  constructor(path: string) {
    this._path = resolve(path);
  }

  /** The resolved database file this handle writes. */
  get path(): string {
    return this._path;
  }

  /**
   * The live connection's answers: journal mode (WAL after open) and the
   * busy-timeout milliseconds. A health check the tests also read — both
   * are criteria on this ticket, so both stay assertable without a second
   * connection guessing at per-connection state.
   */
  diagnostics(): { journalMode: string; busyTimeoutMs: number } {
    const db = this._ensure();
    const mode = db.prepare(`PRAGMA journal_mode`).get() as { journal_mode: string };
    // The read-back column is `timeout`, not `busy_timeout` (probed
    // against node:sqlite directly — the pragma sets by one name and
    // reports by the other).
    const timeout = db.prepare(`PRAGMA busy_timeout`).get() as { timeout: number };
    return { journalMode: mode.journal_mode, busyTimeoutMs: timeout.timeout };
  }

  private _ensure(): SqliteDatabase {
    if (this._closed) {
      throw new Error("storage is closed");
    }
    if (this._db === null) {
      mkdirSync(dirname(this._path), { recursive: true });
      const db = new DatabaseSync(this._path);
      // Two processes can hold one workspace: WAL for concurrent readers,
      // a busy timeout instead of an instant SQLITE_BUSY on a locked writer.
      db.exec(`PRAGMA journal_mode = WAL;`);
      db.exec(`PRAGMA busy_timeout = 5000;`);
      for (const statement of SCHEMA_STATEMENTS) {
        db.exec(statement);
      }
      db.exec(
        `INSERT OR IGNORE INTO schema_version(version, applied_at) VALUES (${STORE_SCHEMA_VERSION}, ${Date.now() / 1000})`,
      );
      db.exec(`INSERT OR IGNORE INTO id_counter(name, value) VALUES ('ticket', 1)`);
      this._db = db;
    }
    return this._db;
  }

  append(event: AidosEvent, origin?: Partial<EventOrigin>): StoredEvent {
    const db = this._ensure();
    const sessionId = origin?.sessionId ?? null;
    const localSeq = origin?.localSeq ?? null;
    const payload = JSON.stringify(event);
    const insert = db.prepare(
      `INSERT INTO events(kind, origin_session, origin_seq, at, payload) VALUES (?, ?, ?, ?, ?)`,
    );
    const outcome = insert.run(event.kind, sessionId, localSeq, eventAt(event), payload);
    const seq = Number(outcome.lastInsertRowid);
    this._materialize(db, event);
    return { seq, sessionId, localSeq, event };
  }

  readAll(): StoredEvent[] {
    const db = this._ensure();
    const rows = db
      .prepare(
        `SELECT seq, origin_session, origin_seq, payload FROM events ORDER BY seq ASC`,
      )
      .all() as {
      seq: number;
      origin_session: string | null;
      origin_seq: number | null;
      payload: string;
    }[];
    return rows.map((row) => ({
      seq: Number(row.seq),
      sessionId: row.origin_session,
      localSeq: row.origin_seq,
      event: JSON.parse(row.payload) as AidosEvent,
    }));
  }

  close(): void {
    if (this._closed) {
      return;
    }
    this._closed = true;
    if (this._db !== null) {
      this._db.close();
      this._db = null;
    }
    if (_registry.get(this._path) === this) {
      _registry.delete(this._path);
    }
  }

  /**
   * Maintain the materialized projections one append at a time. The log
   * stays the authority (the kernel folds it); these tables are what an
   * external reader — #41's importer, a future board-read — queries without
   * replaying.
   */
  private _materialize(db: SqliteDatabase, event: AidosEvent): void {
    switch (event.kind) {
      case "ticket/change": {
        const ticket = event.ticket;
        db.prepare(
          `INSERT OR REPLACE INTO tickets(
            ticket_id, project_id, title, description, body, criteria,
            phase, "order", state, slug, workspace_key,
            depends_on, allowlist, revision, created_at, updated_at, snapshot
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          ticket.id,
          ticket.projectId,
          ticket.title,
          ticket.description,
          ticket.body,
          ticket.criteria,
          ticket.phase,
          ticket.order,
          ticket.state,
          ticket.slug,
          ticket.workspaceKey,
          JSON.stringify(ticket.dependsOn ?? []),
          JSON.stringify(ticket.allowlist ?? []),
          ticket.revision,
          ticket.createdAt,
          ticket.updatedAt,
          JSON.stringify(ticket),
        );
        if (event.operation === "create") {
          const current = (
            db.prepare(`SELECT value FROM id_counter WHERE name = 'ticket'`).get() as {
              value: number;
            } | undefined
          )?.value ?? 1;
          db.prepare(`UPDATE id_counter SET value = ? WHERE name = 'ticket'`).run(
            Math.max(current, ticket.id + 1),
          );
        }
        this._reindexTicket(db, ticket.id);
        break;
      }
      case "evidence/attached": {
        db.prepare(
          `INSERT INTO evidence(ticket_id, kind, author, at, payload) VALUES (?, ?, ?, ?, ?)`,
        ).run(
          event.ticketId,
          event.row.kind,
          event.row.author,
          event.row.at,
          JSON.stringify(event.row.payload ?? {}),
        );
        break;
      }
      case "evidence/detached": {
        db.prepare(
          `DELETE FROM evidence WHERE ticket_id = ? AND at = ? AND kind = ?`,
        ).run(event.ticketId, event.at, event.rowKind);
        break;
      }
      case "evidence/linked": {
        const row = db.prepare(
          `SELECT id, payload FROM evidence WHERE ticket_id = ? AND at = ? AND kind = ?`,
        ).get(event.ticketId, event.at, event.rowKind) as
          | { id: number; payload: string }
          | undefined;
        if (row !== undefined) {
          const payload = JSON.parse(row.payload) as Record<string, unknown>;
          payload.criteria = event.criterion;
          db.prepare(`UPDATE evidence SET payload = ? WHERE id = ?`).run(
            JSON.stringify(payload),
            row.id,
          );
        }
        break;
      }
      case "comment/added": {
        db.prepare(
          `INSERT INTO comments(ticket_id, author, text, at) VALUES (?, ?, ?, ?)`,
        ).run(event.ticketId, event.author, event.text, event.at);
        this._reindexTicket(db, event.ticketId);
        break;
      }
      case "project/created":
      case "project/moved": {
        db.prepare(
          `INSERT OR REPLACE INTO projects(project_id, abs_path, name, at) VALUES (?, ?, ?, ?)`,
        ).run(event.projectId, event.absPath, event.name, event.at);
        break;
      }
      case "plan/change":
      case "phase/set":
      case "aidos/refusal": {
        // Log-only for the materialized views: plan and phase state fold
        // from the events rows; refusals are history, never projection.
        break;
      }
    }
  }

  /** Rebuild one ticket's FTS row from its materialized row + comments. */
  private _reindexTicket(db: SqliteDatabase, ticketId: number): void {
    const ticket = db.prepare(
      `SELECT title, description, criteria FROM tickets WHERE ticket_id = ?`,
    ).get(ticketId) as
      | { title: string; description: string; criteria: string }
      | undefined;
    if (ticket === undefined) {
      return;
    }
    const comments = db.prepare(`SELECT text FROM comments WHERE ticket_id = ? ORDER BY id ASC`).all(
      ticketId,
    ) as { text: string }[];
    db.prepare(`DELETE FROM ticket_fts WHERE ticket_id = ?`).run(ticketId);
    db.prepare(
      `INSERT INTO ticket_fts(ticket_id, title, description, criteria, comment_text) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      ticketId,
      ticket.title,
      ticket.description,
      ticket.criteria,
      comments.map((comment) => comment.text).join("\n"),
    );
  }
}

const _registry = new Map<string, SqliteStorage>();

/**
 * Open (lazily — the file is touched on first use, not here) the shared
 * handle for one database path. Same resolved path twice in one process is
 * the SAME handle: idempotent, no error, both references usable.
 */
export function openSqliteStorage(path: string): SqliteStorage {
  const resolved = resolve(path);
  const live = _registry.get(resolved);
  if (live !== undefined) {
    return live;
  }
  const storage = new SqliteStorage(resolved);
  _registry.set(resolved, storage);
  return storage;
}

/**
 * Open the workspace key's store: path resolution plus the shared handle in
 * one call. The host wrapper (#42) will own one `Store` per workspace
 * through this; #40 owns the port's write path it implies.
 */
export function openWorkspaceStorage(cwd: string): SqliteStorage {
  return openSqliteStorage(storePathForWorkspace(cwd));
}
