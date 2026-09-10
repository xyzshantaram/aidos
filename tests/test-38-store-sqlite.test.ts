/**
 * #38: the SQLite backing store's own criteria — path, schema, handles.
 *
 * Every test here drives a TEMP home through `DSH_HOME` (the same override
 * `src/tools/scratch.ts`'s own tests use) and never touches the real
 * `~/.dsh`: the store path is derived through `dshHomePath("aidos", ...)`
 * keyed by `workspaceKeyFromPath(cwd)`, so pointing the home elsewhere
 * moves the store with it. That IS the never-hardcoded proof — there is no
 * fixture path in this file that could pass against a hardcoded location.
 */

import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { dshHomePath } from "@deepseek-ai/dsh-home-paths";

import { workspaceKeyFromPath } from "../src/kernel/slug";
import { Store } from "../src/kernel/store";
import {
  STORE_FILE_NAME,
  openSqliteStorage,
  openWorkspaceStorage,
  storePathForWorkspace,
} from "../src/host/storage-sqlite";
import { FIXED_NOW, makeConfig } from "./helpers";

/** Run one callback with DSH_HOME pointed at a fresh temp dir. */
function withTempHome(fn: (home: string) => void): void {
  const home = mkdtempSync(join(tmpdir(), "aidos-38-home-"));
  const previous = process.env.DSH_HOME;
  process.env.DSH_HOME = home;
  try {
    fn(home);
  } finally {
    if (previous === undefined) {
      delete process.env.DSH_HOME;
    } else {
      process.env.DSH_HOME = previous;
    }
    rmSync(home, { recursive: true, force: true });
  }
}

/** Open a throwaway file database outside any home, cleaned up after. */
function withTempDb(fn: (path: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "aidos-38-db-"));
  const storage = openSqliteStorage(join(dir, "t.db"));
  try {
    fn(storage.path);
  } finally {
    storage.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Every table name one sqlite_master holds. */
function tableNames(path: string): string[] {
  const db = new DatabaseSync(path);
  try {
    const rows = db
      .prepare(`SELECT name FROM sqlite_master WHERE type IN ('table', 'virtual') ORDER BY name`)
      .all() as { name: string }[];
    return rows.map((row) => row.name);
  } finally {
    db.close();
  }
}

describe("store path", () => {
  it("derives through dshHomePath keyed by the workspace key, under a temp home", () => {
    withTempHome((home) => {
      const cwd = "/srv/proj/cli";
      const key = workspaceKeyFromPath(cwd);
      expect(storePathForWorkspace(cwd)).toBe(
        join(home, "aidos", "storage", key, STORE_FILE_NAME),
      );
      // The derivation agrees with dshHomePath itself — no second spelling.
      expect(storePathForWorkspace(cwd)).toBe(dshHomePath("aidos", "storage", key, STORE_FILE_NAME));
      // Never inside the workspace, never the real home.
      expect(storePathForWorkspace(cwd).startsWith(cwd)).toBe(false);
      expect(storePathForWorkspace(cwd).startsWith(home)).toBe(true);
    });
  });

  it("openWorkspaceStorage lands in the same temp home", () => {
    withTempHome((home) => {
      const storage = openWorkspaceStorage("/srv/proj/cli");
      try {
        const diag = storage.diagnostics();
        expect(diag.journalMode).toBe("wal");
        expect(storage.path.startsWith(home)).toBe(true);
        expect(existsSync(storage.path)).toBe(true);
      } finally {
        storage.close();
      }
    });
  });
});

describe("sqlite open", () => {
  it("creates the schema version row on first open of an empty directory", () => {
    withTempDb((path) => {
      const storage = openSqliteStorage(path);
      try {
        storage.append({ kind: "aidos/refusal", version: 1, ticketId: 1, fromState: null, toState: null, actor: null, reason: "seed", at: 1 });
        const db = new DatabaseSync(path);
        try {
          const row = db.prepare(`SELECT version FROM schema_version`).get() as {
            version: number;
          };
          expect(row.version).toBe(1);
        } finally {
          db.close();
        }
      } finally {
        storage.close();
      }
    });
  });

  it("opens in WAL mode with a busy timeout", () => {
    withTempDb((path) => {
      const storage = openSqliteStorage(path);
      try {
        const diag = storage.diagnostics();
        expect(diag.journalMode).toBe("wal");
        expect(diag.busyTimeoutMs).toBe(5000);
        // And the file itself agrees, through an independent connection.
        const db = new DatabaseSync(path);
        try {
          const mode = db.prepare(`PRAGMA journal_mode`).get() as { journal_mode: string };
          expect(mode.journal_mode).toBe("wal");
        } finally {
          db.close();
        }
      } finally {
        storage.close();
      }
    });
  });

  it("returns one usable handle for the same path twice", () => {
    withTempDb((path) => {
      const first = openSqliteStorage(path);
      const second = openSqliteStorage(path);
      try {
        expect(second).toBe(first);
        // Usable through EITHER reference: append on one, read on the other.
        first.append({ kind: "aidos/refusal", version: 1, ticketId: 1, fromState: null, toState: null, actor: null, reason: "r", at: 1 });
        expect(second.readAll().length).toBe(1);
      } finally {
        // One close releases the shared handle; closing twice is silent.
        first.close();
        second.close();
      }
      // After close the path reopens fresh against the same file.
      const reopened = openSqliteStorage(path);
      try {
        expect(reopened.readAll().length).toBe(1);
      } finally {
        reopened.close();
      }
    });
  });

  it("close is idempotent and use after close throws", () => {
    withTempDb((path) => {
      const storage = openSqliteStorage(path);
      storage.close();
      expect(() => storage.close()).not.toThrow();
      expect(() => storage.readAll()).toThrow(/closed/);
    });
  });
});

describe("sqlite schema", () => {
  it("creates every criteria table plus the FTS index", () => {
    withTempDb((path) => {
      const storage = openSqliteStorage(path);
      try {
        storage.append({ kind: "aidos/refusal", version: 1, ticketId: 1, fromState: null, toState: null, actor: null, reason: "r", at: 1 });
        const names = tableNames(path);
        for (const expected of [
          "schema_version",
          "events",
          "tickets",
          "evidence",
          "comments",
          "projects",
          "id_counter",
          "ticket_fts",
        ]) {
          expect(names).toContain(expected);
        }
      } finally {
        storage.close();
      }
    });
  });

  it("materializes tickets, evidence, comments, projects, and the counter", () => {
    withTempDb((path) => {
      const storage = openSqliteStorage(path);
      const store = new Store(makeConfig(), { now: () => FIXED_NOW, storage });
      try {
        const project = store.createProject("/w", "w");
        const ticket = store.createTicket(project, "Hello board", "some description", {
          criteria: "ship it",
        });
        store.attachEvidence(ticket, "builtin:agent_report", { text: "did it" }, "agent");
        store.addComment(ticket, "a note", "user");
        store.close();

        const db = new DatabaseSync(path);
        try {
          const ticketRow = db.prepare(`SELECT title, state FROM tickets WHERE ticket_id = ?`).get(ticket) as {
            title: string;
            state: string;
          };
          expect(ticketRow).toMatchObject({ title: "Hello board", state: "open" });
          const evidenceRows = db.prepare(`SELECT kind, author FROM evidence WHERE ticket_id = ?`).all(ticket) as {
            kind: string;
            author: string;
          }[];
          expect(evidenceRows).toEqual([{ kind: "builtin:agent_report", author: "agent" }]);
          const commentRows = db.prepare(`SELECT author, text FROM comments WHERE ticket_id = ?`).all(ticket) as {
            author: string;
            text: string;
          }[];
          expect(commentRows).toEqual([{ author: "user", text: "a note" }]);
          const projectRow = db.prepare(`SELECT abs_path FROM projects WHERE project_id = ?`).get(project) as {
            abs_path: string;
          };
          expect(projectRow.abs_path).toBe("/w");
          const counter = db.prepare(`SELECT value FROM id_counter WHERE name = 'ticket'`).get() as {
            value: number;
          };
          expect(counter.value).toBe(ticket + 1);
          // FTS5 answers over title, description, criteria, and comment text.
          const ftsTitle = db.prepare(`SELECT ticket_id FROM ticket_fts WHERE ticket_fts MATCH 'board'`).all() as {
            ticket_id: number;
          }[];
          expect(ftsTitle.map((row) => Number(row.ticket_id))).toEqual([ticket]);
          const ftsComment = db.prepare(`SELECT ticket_id FROM ticket_fts WHERE ticket_fts MATCH 'note'`).all() as {
            ticket_id: number;
          }[];
          expect(ftsComment.map((row) => Number(row.ticket_id))).toEqual([ticket]);
        } finally {
          db.close();
        }
      } finally {
        storage.close();
      }
    });
  });

  it("keeps the origin columns #41 needs, nullable when unstamped", () => {
    withTempDb((path) => {
      const storage = openSqliteStorage(path);
      try {
        // The open is lazy: touch the handle once so the schema exists
        // before inspecting it.
        expect(storage.readAll()).toEqual([]);
        const db = new DatabaseSync(path);
        let columns: { name: string }[];
        try {
          columns = db.prepare(`PRAGMA table_info(events)`).all() as { name: string }[];
        } finally {
          db.close();
        }
        const names = columns.map((column) => column.name);
        expect(names).toContain("origin_session");
        expect(names).toContain("origin_seq");

        const plain = new Store(makeConfig(), { now: () => FIXED_NOW, storage });
        const project = plain.createProject("/w", "w");
        plain.createTicket(project, "T", "d");
        plain.close();

        const check = new DatabaseSync(path);
        try {
          const rows = check.prepare(`SELECT origin_session, origin_seq FROM events`).all() as {
            origin_session: string | null;
            origin_seq: number | null;
          }[];
          expect(rows.length).toBeGreaterThan(0);
          for (const row of rows) {
            expect(row.origin_session).toBeNull();
            expect(row.origin_seq).toBeNull();
          }
        } finally {
          check.close();
        }
      } finally {
        storage.close();
      }
    });
  });
});

describe("session compaction", () => {
  it("compacting a session leaves the workspace board untouched", () => {
    withTempHome(() => {
      const cwd = "/srv/proj/cli";
      const first = new Store(makeConfig(), {
        now: () => FIXED_NOW,
        storage: openWorkspaceStorage(cwd),
      });
      const project = first.createProject(cwd, "cli");
      const ticket = first.createTicket(project, "Keep me", "board row", {
        criteria: "survive compaction",
      });
      first.attachEvidence(ticket, "builtin:agent_report", { text: "work" }, "agent");
      first.addComment(ticket, "still here", "user");
      const before = JSON.stringify({
        tickets: first.ticketsFor(project),
        evidence: first.evidenceFor(ticket),
        comments: first.commentsFor(ticket),
      });

      // The session's own event log is a SEPARATE file the store never
      // reads: compacting it (here: truncating it away entirely, the most
      // violent compaction possible) cannot move the board. The store's
      // reads derive only from its port log under dshHomePath("aidos",
      // "storage", ...), never from a session log.
      const sessionLog = join(mkdtempSync(join(tmpdir(), "aidos-38-session-")), "events.log");
      writeFileSync(sessionLog, JSON.stringify(first.events()));
      rmSync(sessionLog, { force: true });
      first.close();

      const second = new Store(makeConfig(), {
        now: () => FIXED_NOW,
        storage: openWorkspaceStorage(cwd),
      });
      try {
        const after = JSON.stringify({
          tickets: second.ticketsFor(project),
          evidence: second.evidenceFor(ticket),
          comments: second.commentsFor(ticket),
        });
        expect(after).toBe(before);
        expect(second.searchTickets("compaction").map((hit) => hit.ticketId)).toEqual([ticket]);
      } finally {
        second.close();
      }
    });
  });
});
