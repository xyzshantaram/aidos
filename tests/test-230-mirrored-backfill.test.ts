/**
 * #230: the backfill strands every large orchestrator log behind a
 * presence test.
 *
 * `_unimportedSessionIds` (host) excluded every session the store holds
 * ANY ticket for from every future backfill, so a session that
 * live-mirrored even one row while alive was never handed in after it
 * closed — thursday stranded 231 tickets, dotfiles-ai 142. The exclusion
 * guarded the "mirrored then closed" case (re-importing would suffix
 * duplicates), but the kernel scan-match it stood in for was blind to
 * mirrored rows (no localSeq), so the exclusion could never come off.
 *
 * The fix: the scan-match gains a slug (+ createdAt) fallback for
 * seq-less mirrored rows, and the host stops subtracting mirrored
 * sessions wholesale. These tests pin both halves:
 *
 * Kernel (the REQUIRED proof): a store preseeded with mirrored rows
 * carrying origin_session but NULL origin_seq, handed the SAME session's
 * log, must land exactly the log's tickets — preseeded ids kept, zero
 * `-2` slugs.
 *
 * Host: a session the store holds only a FRACTION of must still appear
 * in the resume set — on the v3 resume path and on the v1
 * dropsUnknown path.
 *
 * Log builders: kernel-built logs (the test-41 pattern — a real Store
 * folding real writes, wrapped in inspect envelopes). The source stores
 * run on a TICKING clock, not FIXED_NOW, so every ticket is born at a
 * distinct instant the way production's float clock births them; the
 * slug fallback's createdAt guard is only meaningful when births differ.
 */

import { describe, expect, it } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Store } from "../src/kernel/store";
import type { BackfillReport } from "../src/kernel/store";
import { foldSessionLog } from "../src/kernel/backfill";
import { createInitialState, foldAidosEvents } from "../src/kernel/fold";
import { InvariantError } from "../src/kernel/types";
import { MemoryStorage } from "../src/kernel/storage-memory";
import type { StoragePort, StoredEvent } from "../src/kernel/storage";
import { openSqliteStorage } from "../src/host/storage-sqlite";
import { workspaceKeyFromPath } from "../src/kernel/slug";
import type { AidosEvent } from "../src/kernel/events";
import type { TicketId, TicketSnapshot } from "../src/kernel/types";
import { makeConfig } from "./helpers";
import { createHarness } from "./b1-harness";

const WORKSPACE = "/srv/proj/alpha";
const KEY = workspaceKeyFromPath(WORKSPACE);

/** One ticking wall clock: every stamped instant is distinct. */
function tickingClock(): () => number {
  let tick = 1000;
  return () => {
    tick += 1;
    return tick;
  };
}

type LogEnvelope = { seq: number; type: string; data: AidosEvent };

/**
 * Build one session log the real way (its own Store on its own
 * ephemeral port, the store's log wrapped the way `inspect` wraps it),
 * on a ticking clock so births are distinct.
 */
function sessionLog(
  sessionId: string,
  build: (store: Store) => void,
): { sessionId: string; events: LogEnvelope[] } {
  const store = new Store(makeConfig(), { now: tickingClock(), storage: new MemoryStorage() });
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
  const dir = mkdtempSync(join(tmpdir(), "aidos-230-db-"));
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
  const store = new Store(makeConfig(), { now: tickingClock(), storage });
  const projectId = store.createProject(WORKSPACE, "alpha");
  return { store, projectId };
}

/**
 * Mirror one ticket snapshot into the workspace store the way the live
 * mirror does: the creating session stamped as origin, NO localSeq
 * (unknown at mirror time — the #230 standing mechanism). Returns the
 * workspace id the row landed under.
 */
function mirrorSnapshot(
  store: Store,
  projectId: number,
  sessionId: string,
  snapshot: TicketSnapshot,
): TicketId {
  const newId = store.allocateTicketId();
  store.commitHostMirror(
    {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      ticket: {
        ...snapshot,
        id: newId,
        projectId,
        workspaceKey: KEY,
        state: "open",
        dependsOn: [],
        revision: 1,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.createdAt,
      },
      at: snapshot.createdAt,
    },
    () => undefined,
    // NOTE: no localSeq — this is the legacy production shape the slug
    // fallback exists to match. Passing one would test the seq path,
    // which F4 already covers.
    { sessionId },
  );
  return newId;
}

/**
 * Mirror one session-log ticket (as the log's FINAL fold holds it) into
 * the workspace store. Only valid when the ticket was never renamed
 * after its create — otherwise the staged slug is the post-rename one,
 * not the at-mirror-time one production would have stamped.
 */
function mirrorLiveCreate(
  store: Store,
  projectId: number,
  log: { sessionId: string; events: LogEnvelope[] },
  localId: number,
): TicketId {
  const fold = foldSessionLog(log);
  return mirrorSnapshot(store, projectId, log.sessionId, fold.state.tickets.get(localId)!);
}

/** Slug per workspace ticket id, read off the stored create events. */
function slugsById(storage: StoragePort, ids: readonly TicketId[]): Map<TicketId, string> {
  const out = new Map<TicketId, string>();
  for (const stored of storage.readAll()) {
    if (
      stored.event.kind === "ticket/change" &&
      stored.event.operation === "create" &&
      (ids as readonly number[]).includes(stored.event.ticket.id)
    ) {
      out.set(stored.event.ticket.id, stored.event.ticket.slug);
    }
  }
  return out;
}

describe("#230 kernel: mirrored NULL-seq rows scan-match instead of duplicating", () => {
  it("a partially mirrored log replays post-mirror history under the mirrored ids", () => {
    withSqlite((storage) => {
      // Four tickets; the live mirror owned two of them (a fraction of
      // the log — the thursday shape: 6 mirrored of 237). Gamma is
      // touched again AFTER its mirror landed — description revised, a
      // signoff attached, a comment added — and Alpha gets a post-mirror
      // comment too, so its last-touch seq also advanced past anything
      // storage holds: only the slug fallback can pair either of them,
      // and the replay must carry everything the mirror never did.
      const source = new Store(makeConfig(), {
        now: tickingClock(),
        storage: new MemoryStorage(),
      });
      const sourceProject = source.createProject(WORKSPACE, "alpha");
      source.createTicket(sourceProject, "Alpha task", "d-alpha");
      source.createTicket(sourceProject, "Beta task", "d-beta");
      source.createTicket(sourceProject, "Gamma task", "d-gamma");
      source.createTicket(sourceProject, "Delta task", "d-delta");

      const { store, projectId } = targetStore(storage);
      const snapshotOf = (localId: number) => source.state.tickets.get(localId)!;
      const alphaId = mirrorSnapshot(store, projectId, "session-big", snapshotOf(1));
      const gammaId = mirrorSnapshot(store, projectId, "session-big", snapshotOf(3));
      // Post-mirror life, in the session log after the mirror landed.
      // Birth and slug are untouched, so the slug fallback still pairs
      // both tickets — and every row below must survive the import.
      source.setTicket(3, { description: "d-gamma-revised" });
      source.attachEvidence(3, "builtin:user_signoff", { ok: true }, "user");
      source.addComment(3, "gamma post-mirror note", "user");
      source.addComment(1, "alpha post-mirror note", "agent");

      const log = {
        sessionId: "session-big",
        events: source.events().map((data, index) => ({
          seq: index + 1,
          type: data.kind,
          data,
        })),
      };

      const result = store.backfillSessionLogs(projectId, [log]);
      expect(result.alreadyRan).toBe(false);
      // Two fresh tickets flushed (beta, delta) plus two mirror-stale
      // replays (alpha, gamma) — every row the mirror never carried is
      // counted in the run deltas, so the numbers are truthful.
      expect(result.tickets).toBe(4);
      expect(result.evidence).toBe(1);
      expect(result.comments).toBe(2);
      expect(result.slugRenames).toEqual([]);
      expect(result.slugMatchConflicts).toEqual([]);
      expect(result.lossless).toBe(true);

      const rows = store.ticketsFor(projectId);
      expect(rows.length).toBe(4);
      const ids = new Set(rows.map((row) => row.id));
      expect(ids.size).toBe(4);
      // The preseeded tickets KEEP their original ids.
      expect(ids.has(alphaId)).toBe(true);
      expect(ids.has(gammaId)).toBe(true);

      // The post-mirror history survived under the mirrored ids: the
      // description revision, the signoff, and both comments.
      expect(rows.find((row) => row.id === gammaId)!.description).toBe("d-gamma-revised");
      expect(store.evidenceFor(gammaId).map((row) => row.kind)).toEqual([
        "builtin:user_signoff",
      ]);
      expect(store.evidenceFor(gammaId)[0]!.payload).toEqual({ ok: true });
      expect(store.commentsFor(gammaId).map((comment) => comment.text)).toEqual([
        "gamma post-mirror note",
      ]);
      expect(store.commentsFor(alphaId).map((comment) => comment.text)).toEqual([
        "alpha post-mirror note",
      ]);

      // Zero suffixed slugs: every stored create kept its source slug.
      const slugs = [...slugsById(storage, [...ids]).values()].sort();
      expect(slugs).toEqual(["alpha-task", "beta-task", "delta-task", "gamma-task"]);

      // Every ticket traces back to the session it came from — mirrored
      // and imported rows alike.
      for (const row of rows) {
        expect(store.originSessionOf(row.id)).toBe("session-big");
      }
      // The origin columns tell the two generations apart: mirrored rows
      // carry no seq, imported rows do.
      const origins = new Map<TicketId, StoredEvent | undefined>();
      for (const row of rows) {
        origins.set(
          row.id,
          storage
            .readAll()
            .find(
              (stored) =>
                stored.event.kind === "ticket/change" &&
                stored.event.operation === "create" &&
                stored.event.ticket.id === row.id,
            ),
        );
      }
      expect(origins.get(alphaId)!.localSeq).toBeNull();
      expect(origins.get(gammaId)!.localSeq).toBeNull();
      for (const row of rows) {
        if (row.id === alphaId || row.id === gammaId) continue;
        expect(origins.get(row.id)!.localSeq).not.toBeNull();
      }
    });
  });

  it("re-handing the same log is a genuine no-op: nothing duplicated, nothing lost", () => {
    withSqlite((storage) => {
      const source = new Store(makeConfig(), {
        now: tickingClock(),
        storage: new MemoryStorage(),
      });
      const sourceProject = source.createProject(WORKSPACE, "alpha");
      source.createTicket(sourceProject, "Alpha task", "d-alpha");
      source.createTicket(sourceProject, "Beta task", "d-beta");

      const { store, projectId } = targetStore(storage);
      const alphaId = mirrorSnapshot(
        store,
        projectId,
        "session-repeat",
        source.state.tickets.get(1)!,
      );
      source.setTicket(1, { description: "d-alpha-revised" });
      source.attachEvidence(1, "builtin:user_signoff", { ok: true }, "user");
      source.addComment(1, "alpha note", "user");

      const log = {
        sessionId: "session-repeat",
        events: source.events().map((data, index) => ({
          seq: index + 1,
          type: data.kind,
          data,
        })),
      };

      const first = store.backfillSessionLogs(projectId, [log]);
      expect(first.alreadyRan).toBe(false);
      expect(first.tickets).toBe(2);
      expect(first.evidence).toBe(1);
      expect(first.comments).toBe(1);

      // The identical hand again: the marker already finished the
      // session, so the call is a no-op — and the replayed history is
      // NOT emitted a second time.
      const second = store.backfillSessionLogs(projectId, [log]);
      expect(second.alreadyRan).toBe(true);
      expect(second.tickets).toBe(0);
      expect(second.evidence).toBe(0);
      expect(second.comments).toBe(0);
      expect(store.ticketsFor(projectId).length).toBe(2);
      expect(store.evidenceFor(alphaId).length).toBe(1);
      expect(store.commentsFor(alphaId).length).toBe(1);
      expect(store.ticketsFor(projectId).find((row) => row.id === alphaId)!.description).toBe(
        "d-alpha-revised",
      );

      // The resume shape: the same session handed again ALONGSIDE a new
      // one. The replayed ticket skips through the marker's ticket map
      // (no second replay, no duplicated rows) while the new session's
      // ticket imports normally.
      const other = new Store(makeConfig(), {
        now: tickingClock(),
        storage: new MemoryStorage(),
      });
      const otherProject = other.createProject(WORKSPACE, "alpha");
      other.createTicket(otherProject, "Gamma task", "d-gamma");
      const otherLog = {
        sessionId: "session-new",
        events: other.events().map((data, index) => ({
          seq: index + 1,
          type: data.kind,
          data,
        })),
      };
      const third = store.backfillSessionLogs(projectId, [log, otherLog]);
      expect(third.alreadyRan).toBe(false);
      expect(third.tickets).toBe(1);
      expect(third.evidence).toBe(0);
      expect(third.comments).toBe(0);
      expect(store.ticketsFor(projectId).length).toBe(3);
      expect(store.evidenceFor(alphaId).length).toBe(1);
      expect(store.commentsFor(alphaId).length).toBe(1);
    });
  });

  it("preseeded production shape: mirrored fraction plus log yields the log's full count", () => {
    withSqlite((storage) => {
      // The shape production actually holds: the store carries a
      // FRACTION of one session's tickets as seq-less mirrored rows
      // (origin_session stamped, origin_seq NULL), and the session's own
      // log is handed in. The import must land every ticket of the log —
      // total equals the log's count, mirrored ids kept, every history
      // row present — not the fraction plus the strangers.
      const source = new Store(makeConfig(), {
        now: tickingClock(),
        storage: new MemoryStorage(),
      });
      const sourceProject = source.createProject(WORKSPACE, "alpha");
      const titles = ["One", "Two", "Three", "Four", "Five", "Six"];
      for (const title of titles) {
        source.createTicket(sourceProject, `${title} task`, `d-${title.toLowerCase()}`);
      }

      const { store, projectId } = targetStore(storage);
      const snapshotOf = (localId: number) => source.state.tickets.get(localId)!;
      // Two of six mirrored, one of them touched afterwards.
      const oneId = mirrorSnapshot(store, projectId, "session-prod", snapshotOf(1));
      const threeId = mirrorSnapshot(store, projectId, "session-prod", snapshotOf(3));
      source.setTicket(3, { description: "d-three-revised" });
      source.attachEvidence(3, "builtin:user_signoff", { ok: true }, "user");
      source.addComment(3, "three note", "user");
      source.attachEvidence(5, "builtin:agent_report", { lines: 7 }, "agent");

      const log = {
        sessionId: "session-prod",
        events: source.events().map((data, index) => ({
          seq: index + 1,
          type: data.kind,
          data,
        })),
      };

      const result = store.backfillSessionLogs(projectId, [log]);
      expect(result.alreadyRan).toBe(false);
      // Four fresh plus one mirror-stale replay (ticket 3); ticket 1's
      // mirror was already current, so its replay lands the set with no
      // new rows — counted as a ticket, with nothing to count beneath.
      expect(result.tickets).toBe(6);
      expect(result.evidence).toBe(2);
      expect(result.comments).toBe(1);
      expect(result.lossless).toBe(true);

      const rows = store.ticketsFor(projectId);
      expect(rows.length).toBe(6);
      const ids = new Set(rows.map((row) => row.id));
      expect(ids.size).toBe(6);
      expect(ids.has(oneId)).toBe(true);
      expect(ids.has(threeId)).toBe(true);
      expect(rows.find((row) => row.id === threeId)!.description).toBe("d-three-revised");
      expect(store.evidenceFor(threeId).map((row) => row.kind)).toEqual([
        "builtin:user_signoff",
      ]);
      expect(store.commentsFor(threeId).map((comment) => comment.text)).toEqual(["three note"]);
      const five = rows.find((row) => row.title === "Five task")!;
      expect(store.evidenceFor(five.id).map((row) => row.kind)).toEqual([
        "builtin:agent_report",
      ]);
      // No suffixed duplicates anywhere.
      const slugs = [...slugsById(storage, [...ids]).values()].sort();
      expect(slugs).toEqual([
        "five-task",
        "four-task",
        "one-task",
        "six-task",
        "three-task",
        "two-task",
      ]);
    });
  });

  it("a non-create that rewrites createdAt is refused", () => {
    // #230 round 2: the slug fallback pairs mirrored rows by (slug,
    // createdAt). If a future or hand-written event could rewrite
    // createdAt on a set, matches would silently flip into duplicates —
    // so the invariant pins birth on every non-create.
    const source = new Store(makeConfig(), {
      now: tickingClock(),
      storage: new MemoryStorage(),
    });
    const project = source.createProject(WORKSPACE, "alpha");
    const id = source.createTicket(project, "T", "d");
    const snap = source.state.tickets.get(id)!;
    const at = snap.updatedAt + 1;
    const honestSet: AidosEvent = {
      kind: "ticket/change",
      version: 1,
      operation: "set",
      ticket: { ...snap, description: "revised", revision: 2, updatedAt: at },
      at,
    };
    const forgedSet: AidosEvent = {
      kind: "ticket/change",
      version: 1,
      operation: "set",
      ticket: {
        ...snap,
        description: "revised",
        revision: 2,
        createdAt: snap.createdAt + 100,
        updatedAt: at,
      },
      at,
    };
    const honestState = createInitialState();
    for (const event of source.events()) {
      foldAidosEvents(honestState, event);
    }
    expect(() => foldAidosEvents(honestState, honestSet)).not.toThrow();
    const forgedState = createInitialState();
    for (const event of source.events()) {
      foldAidosEvents(forgedState, event);
    }
    expect(() => foldAidosEvents(forgedState, forgedSet)).toThrow(InvariantError);
  });

  it("a ticket that reuses a renamed sibling's slug is imported fresh, never fused", () => {
    withSqlite((storage) => {
      // T1 mirrored under slug "shared", then renamed in-session to
      // "shared-v2", freeing "shared" for T2. Same slug, DIFFERENT
      // births — the createdAt guard must decline the match, or T2
      // would fuse onto T1's mirrored id and its content would vanish.
      // The mirror stages T1's create BEFORE the rename, exactly as the
      // live mirror would have.
      const source = new Store(makeConfig(), {
        now: tickingClock(),
        storage: new MemoryStorage(),
      });
      const sourceProject = source.createProject(WORKSPACE, "alpha");
      const first = source.createTicket(sourceProject, "First shared", "d1", { slug: "shared" });
      const { store, projectId } = targetStore(storage);
      const mirroredId = mirrorSnapshot(
        store,
        projectId,
        "session-reuse",
        source.state.tickets.get(first)!,
      );
      source.setTicket(first, { slug: "shared-v2" });
      source.createTicket(sourceProject, "Second shared", "d2", { slug: "shared" });
      const log = {
        sessionId: "session-reuse",
        events: source.events().map((data, index) => ({
          seq: index + 1,
          type: data.kind,
          data,
        })),
      };

      const result = store.backfillSessionLogs(projectId, [log]);
      expect(result.alreadyRan).toBe(false);
      expect(result.slugMatchConflicts).toEqual([]);

      const rows = store.ticketsFor(projectId);
      const slugs = slugsById(
        storage,
        rows.map((row) => row.id),
      );
      // No fusion: the reusing ticket holds its own id under a suffixed
      // slug, and the rename is recorded, not hidden.
      const second = rows.find((row) => row.title === "Second shared")!;
      expect(second.id).not.toBe(mirroredId);
      expect(slugs.get(second.id)).toBe("shared-2");
      expect(result.slugRenames.map((rename) => [rename.fromSlug, rename.toSlug])).toContainEqual([
        "shared",
        "shared-2",
      ]);
      // Known residual, pinned so no future change trades it silently:
      // T1 renamed AFTER its mirrored create, so storage holds the OLD
      // slug while the fold carries the NEW one — the fallback misses
      // and T1 lands fresh beside its mirrored row. Visible (two rows
      // titled "First shared": the untouched mirror under "shared" plus
      // the fresh import under "shared-v2"), never a silent fusion, and
      // narrower than the stranding it replaces.
      expect(rows.length).toBe(3);
      const firsts = rows.filter((row) => row.title === "First shared");
      expect(firsts.map((row) => row.id).sort()).toEqual(
        [mirroredId, firsts.find((row) => row.id !== mirroredId)!.id].sort(),
      );
      expect(slugs.get(mirroredId)).toBe("shared");
      expect(slugs.get(firsts.find((row) => row.id !== mirroredId)!.id)).toBe("shared-v2");
    });
  });

  it("a seq-vs-slug disagreement prefers the seq match and records it", () => {
    withSqlite((storage) => {
      // Forged, contradictory storage: a seq-stamped row claims (S, k)
      // for a decoy ticket while a seq-less mirror claims (S, slug,
      // birth) for the log's real ticket — and the fold ticket answers
      // BOTH descriptions. The exact match wins; the overruled slug
      // candidate is named on the result, never silently dropped.
      const log = sessionLog("session-clash", (store) => {
        const project = store.findProject(WORKSPACE)!;
        store.createTicket(project, "Clash ticket", "d");
      });
      const fold = foldSessionLog(log);
      const lastTouch = fold.seqOfTicket.get(1)!;
      const final = fold.state.tickets.get(1)!;

      const { store, projectId } = targetStore(storage);
      // The decoy: a real store ticket whose stored create FORGES a
      // seq origin pointing at the log's last-touch seq.
      const decoyId = store.allocateTicketId();
      store.commitHostMirror(
        {
          kind: "ticket/change",
          version: 1,
          operation: "create",
          ticket: {
            ...final,
            id: decoyId,
            projectId,
            title: "Decoy ticket",
            slug: "decoy-ticket",
            workspaceKey: KEY,
            state: "open",
            dependsOn: [],
            revision: 1,
            createdAt: final.createdAt,
            updatedAt: final.createdAt,
          },
          at: final.createdAt,
        },
        () => undefined,
        { sessionId: log.sessionId, localSeq: lastTouch },
      );
      // The honest mirror of the log's real ticket: seq-less.
      const mirroredId = mirrorLiveCreate(store, projectId, log, 1);

      const result = store.backfillSessionLogs(projectId, [log]);
      expect(result.alreadyRan).toBe(false);
      // The seq id won, and the conflict is on the record.
      expect(result.slugMatchConflicts).toEqual([
        {
          sessionId: "session-clash",
          localId: 1,
          seqMatchedId: decoyId,
          slugMatchedId: mirroredId,
        },
      ]);
      expect(result.lossless).toBe(false);
      // The folded ticket followed the seq match (skipped as the
      // decoy's identity); the mirror row stands untouched.
      const rows = store.ticketsFor(projectId);
      expect(rows.length).toBe(2);
      expect(new Set(rows.map((row) => row.title)).size).toBe(2);
    });
  });
});

describe("#230 host: a partially mirrored session stays in the resume set", () => {
  type ResumeProbe = {
    _unimportedSessionIds: (
      report: BackfillReport | null,
      closedIds: SessionId[],
    ) => SessionId[];
  };

  function probe(): ResumeProbe {
    const harness = createHarness(undefined, { cwd: "/srv/proj/alpha" });
    harness.installService();
    return harness.service as unknown as ResumeProbe;
  }

  function v3Report(sessionIds: string[]): BackfillReport {
    return { sessionIds, dropsUnknown: false } as unknown as BackfillReport;
  }

  function v1Report(sessionIds: string[]): BackfillReport {
    return { sessionIds, dropsUnknown: true } as unknown as BackfillReport;
  }

  it("v3 resume: the session the store holds a fraction of is handed in; finished ones are not", () => {
    // The production shape: the store holds ONE ticket stamped
    // session-big (a fraction of its five-ticket log) and the marker
    // names only session-small. The old code subtracted the mirrored
    // session here and stranded the other four tickets forever.
    const resume = probe()._unimportedSessionIds(
      v3Report(["session-small"]),
      [SessionId("session-big"), SessionId("session-small"), SessionId("session-new")],
    );
    expect(resume.map(String).sort()).toEqual(["session-big", "session-new"]);
  });

  it("v1 dropsUnknown: every closed session is handed in, mirrored or not", () => {
    // A v1 marker means no session finished history under the new
    // importer yet: v1-listed sessions need completion, unlisted ones
    // need the full import, and mirrored sessions are no exception —
    // the scan-match (not an exclusion) is the dedupe guard.
    const resume = probe()._unimportedSessionIds(
      v1Report(["session-small"]),
      [SessionId("session-big"), SessionId("session-small")],
    );
    expect(resume.map(String).sort()).toEqual(["session-big", "session-small"]);
  });

  it("first import (no marker): the set is exactly the closed set", () => {
    const resume = probe()._unimportedSessionIds(null, [
      SessionId("session-big"),
      SessionId("session-small"),
    ]);
    expect(resume.map(String).sort()).toEqual(["session-big", "session-small"]);
  });
});
