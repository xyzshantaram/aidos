/**
 * #41: the one-time backfill.
 *
 * The store imports the workspace's existing session logs. Every imported
 * ticket is renumbered into the workspace id space through the same port
 * counter every create uses, keeps its origin `(sessionId, localSeq)`, and
 * has its dependency references and evidence rows rewritten through the
 * renumbering map. The import lands inside ONE storage bracket and ends
 * with a `backfill/completed` marker event — the marker in the log IS the
 * record that the backfill ran, so a second open imports nothing, and a
 * crash midway leaves nothing half-imported for the next open to trip on.
 *
 * The two session logs here are TWO GENUINELY DISTINCT LOGS — each built
 * by its own Store on its own ephemeral port, so both hold a local ticket
 * 1 and a local ticket 2 and their ids genuinely collide before the
 * renumbering. That collision is the defect this ticket exists to prevent.
 *
 * Criterion map:
 *   1. a workspace with two logs of tickets imports every ticket with
 *      unique ids
 *   2. a second open does not import again
 *   3. a ticket that depended on another still names the right ticket
 *      after renumbering
 *   4. the origin columns trace any ticket back to the log it came from
 *
 * MECHANISM NOTE (per #38's recorded re-scope): the description's
 * `ctx.get("sessionPersistence").inspect` is the host's read API; the
 * kernel has no `ctx`. The importer takes already-inspected logs — the
 * exact `{ sessionId, events }` shape one `inspect(id)` resolves to — and
 * the host wiring is #42's thin-wrapper work.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Store } from "../src/kernel/store";
import type { BackfillResult } from "../src/kernel/store";
import { MemoryStorage } from "../src/kernel/storage-memory";
import type { StoragePort, StoredEvent } from "../src/kernel/storage";
import { openSqliteStorage } from "../src/host/storage-sqlite";
import { workspaceKeyFromPath } from "../src/kernel/slug";
import { StoreWriteRefused } from "../src/kernel/types";
import type { AidosEvent, TicketId } from "../src/kernel/types";
import { FIXED_NOW, makeConfig } from "./helpers";

const WORKSPACE = "/srv/proj/alpha";
const KEY = workspaceKeyFromPath(WORKSPACE);

/**
 * Build one session log the real way: its own Store on its own ephemeral
 * port folds real writes, and the store's log becomes the session's log —
 * each event wrapped in the envelope `sessionPersistence.inspect` returns
 * (the session's own seq, the envelope type, the event as data).
 */
function sessionLog(
  sessionId: string,
  build: (store: Store) => void,
): { sessionId: string; events: { seq: number; type: string; data: AidosEvent }[] } {
  const store = new Store(makeConfig(), { now: () => FIXED_NOW, storage: new MemoryStorage() });
  store.createProject(WORKSPACE, "alpha");
  build(store);
  return {
    sessionId,
    events: store.events().map((data, index) => ({
      seq: index + 1,
      type: data.kind,
      data,
    })),
  };
}

/** A throwaway sqlite port for the workspace store under test. */
function withSqlite(fn: (storage: StoragePort) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "aidos-41-db-"));
  const storage = openSqliteStorage(join(dir, "board.db"));
  try {
    fn(storage);
  } finally {
    storage.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The workspace store under test, with its project already in place. */
function targetStore(storage: StoragePort): { store: Store; projectId: number } {
  const store = new Store(makeConfig(), { now: () => FIXED_NOW, storage });
  const projectId = store.createProject(WORKSPACE, "alpha");
  return { store, projectId };
}

describe("#41 criterion 1: two logs import every ticket with unique ids", () => {
  it("two distinct session logs with colliding local ids land as four unique tickets", () => {
    withSqlite((storage) => {
      // Two GENUINELY DISTINCT logs. Each source store allocates its own
      // local ids 1..2, so both logs hold a ticket 1 and a ticket 2 — the
      // pre-renumbering collision this ticket exists to prevent.
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Fix board", "from session a", {
          slug: "fix-board",
        });
        store.createTicket(project, "Add tests", "from session a");
      });
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Fix board", "from session b", {
          slug: "fix-board",
        });
        store.createTicket(project, "Write docs", "from session b");
      });

      const { store, projectId } = targetStore(storage);
      const result = store.backfillSessionLogs(projectId, [logA, logB]);
      expect(result.alreadyRan).toBe(false);
      expect(result.tickets).toBe(4);
      expect(result.sessionIds).toEqual(["session-a", "session-b"]);

      // Every ticket imported, under workspace-unique ids.
      const rows = store.ticketsFor(projectId);
      expect(rows.length).toBe(4);
      expect(new Set(rows.map((row) => row.id)).size).toBe(4);
      expect(rows.map((row) => row.title).sort()).toEqual([
        "Add tests",
        "Fix board",
        "Fix board",
        "Write docs",
      ]);
      // The colliding slugs were made workspace-unique, deterministically.
      // (TicketRow does not expose slug; read it off the create events.)
      const createEvents = store.events().filter(
        (event) =>
          event.kind === "ticket/change" && event.operation === "create",
      ) as { ticket: { id: TicketId; slug: string } }[];
      const slugs = createEvents
        .filter((event) => rows.some((row) => row.id === event.ticket.id))
        .map((event) => event.ticket.slug)
        .sort();
      expect(new Set(slugs).size).toBe(4);
      expect(slugs).toContain("fix-board");
      expect(slugs).toContain("fix-board-2");

      // Evidence and comments ride along, rewritten to the new ids.
      expect(result.evidence).toBe(0);
      expect(result.comments).toBe(0);
    });
  });

  it("evidence rows and comments are rewritten through the mapping", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        const ticket = store.createTicket(project, "Reviewed", "d");
        store.attachEvidence(ticket, "builtin:user_signoff", { note: "looks right" }, "user");
        store.addComment(ticket, "please re-run", "user");
      });
      const { store, projectId } = targetStore(storage);
      const result = store.backfillSessionLogs(projectId, [logA]);
      expect(result.evidence).toBe(1);
      expect(result.comments).toBe(1);
      const row = store.ticketsFor(projectId).find((t) => t.title === "Reviewed")!;
      expect(store.evidenceFor(row.id).map((e) => e.kind)).toEqual([
        "builtin:user_signoff",
      ]);
      expect(store.evidenceFor(row.id)[0]!.payload).toEqual({ note: "looks right" });
      expect(store.commentsFor(row.id).map((c) => c.text)).toEqual(["please re-run"]);
    });
  });
});

describe("#41 criterion 2: a second open does not import again", () => {
  it("a second call on the live store is a no-op", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Only", "d");
      });
      const { store, projectId } = targetStore(storage);
      const first = store.backfillSessionLogs(projectId, [logA]);
      expect(first.tickets).toBe(1);
      const rowsAfterFirst = storage.readAll().length;
      // The marker is the record that the backfill ran.
      const marker = store.events().at(-1)!;
      expect(marker.kind).toBe("backfill/completed");
      expect(marker).toMatchObject({ sessionIds: ["session-a"], tickets: 1 });

      const second: BackfillResult = store.backfillSessionLogs(projectId, [logA]);
      expect(second).toEqual({
        alreadyRan: true,
        sessionIds: [],
        tickets: 0,
        evidence: 0,
        comments: 0,
      });
      expect(storage.readAll().length).toBe(rowsAfterFirst);
      expect(store.ticketsFor(projectId).length).toBe(1);
    });
  });

  it("a REOPENED store (second open) replays the marker and imports nothing", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Only", "d");
      });
      const first = targetStore(storage);
      first.store.backfillSessionLogs(first.projectId, [logA]);
      const rowsAfterFirst = storage.readAll().length;
      const log = first.store.events();

      // Second open: a fresh Store replaying the durable store's rows.
      const reopened = new Store(makeConfig(), { now: () => FIXED_NOW, storage });
      expect(reopened.events().length).toBe(log.length);
      const result = reopened.backfillSessionLogs(
        reopened.findProject(WORKSPACE)!,
        [logA],
      );
      expect(result.alreadyRan).toBe(true);
      expect(result.tickets).toBe(0);
      expect(storage.readAll().length).toBe(rowsAfterFirst);
      expect(reopened.ticketsFor(reopened.findProject(WORKSPACE)!).length).toBe(1);
    });
  });
});

describe("#41 criterion 3: dependencies still name the right ticket", () => {
  it("a renumbered dependency points at the renumbered target", () => {
    withSqlite((storage) => {
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        const first = store.createTicket(project, "Foundation", "d");
        void first;
        store.createTicket(project, "Dependent", "d", {
          // Session-local reference format: workspaceKey:localId.
          dependsOn: [`${KEY}:1`],
        });
      });
      // A second log so the renumbering actually moves ids: session-a's
      // ticket claims workspace id 1, pushing session-b's off their local
      // numbers.
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Earlier import", "d");
      });
      const { store, projectId } = targetStore(storage);
      store.backfillSessionLogs(projectId, [logA, logB]);

      const rows = store.ticketsFor(projectId);
      const foundation = rows.find((row) => row.title === "Foundation")!;
      const dependent = rows.find((row) => row.title === "Dependent")!;
      // The ids moved off the local numbers...
      expect(dependent.id).not.toBe(2);
      expect(foundation.id).not.toBe(1);
      // ...and the dependency followed the mapping exactly.
      expect(dependent.dependsOn).toEqual([`${KEY}:${foundation.id}`]);
      expect(store.getTicket(dependent.id).dependsOn).toEqual([
        `${KEY}:${foundation.id}`,
      ]);
    });
  });

  it("a dependency whose target no imported log holds is dropped, not left pointing at a stranger", () => {
    withSqlite((storage) => {
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Dangling", "d", {
          dependsOn: [`${KEY}:99`],
        });
      });
      const { store, projectId } = targetStore(storage);
      store.backfillSessionLogs(projectId, [logB]);
      const dangling = store.ticketsFor(projectId).find((row) => row.title === "Dangling")!;
      expect(dangling.dependsOn).toEqual([]);
    });
  });
});

describe("#41 criterion 4: the origin columns trace back to the log", () => {
  it("every imported row carries its source (sessionId, localSeq)", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        const ticket = store.createTicket(project, "Traced A", "d");
        store.addComment(ticket, "from a", "user");
      });
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Traced B", "d");
      });
      const { store, projectId } = targetStore(storage);
      store.backfillSessionLogs(projectId, [logA, logB]);

      const rows = store.ticketsFor(projectId);
      const traceOf = new Map<string, string>();
      for (const row of rows) {
        // Walk the store rows for this ticket's create event and read the
        // origin columns the port stamped.
        const createRow = storage
          .readAll()
          .find(
            (stored: StoredEvent) =>
              stored.event.kind === "ticket/change" &&
              (stored.event as { operation: string }).operation === "create" &&
              (stored.event as { ticket: { id: TicketId } }).ticket.id === row.id,
          );
        expect(createRow).toBeDefined();
        expect(createRow!.sessionId).not.toBeNull();
        expect(createRow!.localSeq).not.toBeNull();
        traceOf.set(row.title, createRow!.sessionId!);
      }
      // Each ticket traces back to the log it actually came from.
      expect(traceOf.get("Traced A")).toBe("session-a");
      expect(traceOf.get("Traced B")).toBe("session-b");
      // The comment row traces too.
      const tracedA = rows.find((row) => row.title === "Traced A")!;
      const commentRow = storage.readAll().find(
        (stored) =>
          stored.event.kind === "comment/added" &&
          (stored.event as { ticketId: TicketId }).ticketId === tracedA.id,
      )!;
      expect(commentRow.sessionId).toBe("session-a");
    });
  });
});

describe("#41: a crash midway leaves nothing behind", () => {
  it("a bracket that fails on commit rolls the WHOLE import back; the retry lands", () => {
    withSqlite((storage) => {
      const logA = sessionLog("session-a", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Survivor", "d");
      });
      const logB = sessionLog("session-b", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Also imported", "d");
      });
      const { store, projectId } = targetStore(storage);
      const rowsBefore = storage.readAll().length;
      const ticketsBefore = store.ticketsFor(projectId).length;

      // One-shot failure: the FIRST bracket's commit dies (the crash
      // midway), every later commit succeeds.
      let failedOnce = false;
      const realCommit = storage.commitTransaction.bind(storage);
      storage.commitTransaction = () => {
        if (!failedOnce) {
          failedOnce = true;
          throw new Error("crash midway through the backfill");
        }
        realCommit();
      };

      let refused: unknown;
      try {
        store.backfillSessionLogs(projectId, [logA, logB]);
      } catch (error) {
        refused = error;
      }
      expect(refused).toBeInstanceOf(StoreWriteRefused);
      expect((refused as Error).message).toMatch(/crash midway/);
      // Nothing half-imported: no rows, no marker, no fold movement.
      expect(storage.readAll().length).toBe(rowsBefore);
      expect(store.ticketsFor(projectId).length).toBe(ticketsBefore);
      expect(
        store.events().some((event) => event.kind === "backfill/completed"),
      ).toBe(false);

      // The next open retries — and the whole import lands exactly once.
      const retry = store.backfillSessionLogs(projectId, [logA, logB]);
      expect(retry.alreadyRan).toBe(false);
      expect(retry.tickets).toBe(2);
      expect(store.ticketsFor(projectId).length).toBe(ticketsBefore + 2);
      expect(
        store.events().filter((event) => event.kind === "backfill/completed").length,
      ).toBe(1);
    });
  });
});
