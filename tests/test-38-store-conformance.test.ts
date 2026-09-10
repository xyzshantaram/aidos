/**
 * #38: the kernel conformance suite — the SAME tests against both ports.
 *
 * The kernel depends on the PORT (StoragePort), never on a concrete class:
 * the in-memory fake and the real SQLite implementation satisfy it, and
 * this file drives an identical Store through each one. A divergence
 * between the two shows up here as a failure, not a judgement call.
 *
 * This is the suite the "full existing kernel suite passes unchanged
 * against the SQLite-backed port" criterion rests on: every behaviour below
 * is Store API the existing tests already pin through the default
 * (memory-backed) construction, replayed here verbatim against SQLite.
 * The existing files themselves are untouched — they keep constructing
 * `new Store(config, { log, now })` with no storage argument.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Store } from "../src/kernel/store";
import { MemoryStorage } from "../src/kernel/storage-memory";
import { openSqliteStorage } from "../src/host/storage-sqlite";
import type { StoragePort, StoredEvent } from "../src/kernel/storage";
import type { AidosConfig } from "../src/kernel/types";
import type { TicketId } from "../src/kernel/types";
import {
  EvidenceAuthorRefused,
  UnknownEvidenceRow,
  UnknownKind,
  UnknownTicket,
} from "../src/kernel/types";
import { FIXED_NOW, expectGateRefused, makeConfig } from "./helpers";

/** One gated config for the move half of the suite. */
function gatedConfig(): AidosConfig {
  return {
    kinds: makeConfig().kinds,
    gates: [
      {
        fromState: "open",
        toState: "in_progress",
        requiredKinds: ["builtin:agent_report"],
        allowedActors: ["user", "agent"],
      },
      {
        fromState: "in_progress",
        toState: "awaiting_verification",
        requiredKinds: ["builtin:agent_report"],
        allowedActors: ["agent"],
      },
    ],
  };
}

const BACKENDS: Record<string, () => { storage: StoragePort; dispose: () => void }> = {
  memory: () => {
    const storage = new MemoryStorage();
    return { storage, dispose: () => storage.close() };
  },
  sqlite: () => {
    const dir = mkdtempSync(join(tmpdir(), "aidos-38-conf-"));
    const storage = openSqliteStorage(join(dir, "t.db"));
    return {
      storage,
      dispose: () => {
        storage.close();
        rmSync(dir, { recursive: true, force: true });
      },
    };
  },
};

for (const [label, makeBackend] of Object.entries(BACKENDS)) {
  describe(`store conformance (${label})`, () => {
    function freshStore(
      config?: AidosConfig,
      opts?: { originSessionId?: string },
    ): { store: Store; dispose: () => void } {
      const backend = makeBackend();
      const store = new Store(config ?? makeConfig(), {
        now: () => FIXED_NOW,
        storage: backend.storage,
        originSessionId: opts?.originSessionId,
      });
      return { store, dispose: backend.dispose };
    }

    function withStore(
      fn: (store: Store) => void,
      config?: AidosConfig,
      opts?: { originSessionId?: string },
    ): void {
      const { store, dispose } = freshStore(config, opts);
      try {
        fn(store);
      } finally {
        dispose();
      }
    }

    function seedProject(store: Store): number {
      return store.createProject("/srv/proj/cli", "cli");
    }

    it("creates, reads, moves, and finds projects", () => {
      withStore((store) => {
        const id = seedProject(store);
        expect(store.getProject(id)).toEqual({ id, absPath: "/srv/proj/cli", name: "cli" });
        expect(store.findProject("/srv/proj/cli")).toBe(id);
        expect(store.findProject("/nowhere")).toBeNull();
        store.moveProject(id, "/srv/proj/renamed");
        expect(store.getProject(id).absPath).toBe("/srv/proj/renamed");
        expect(store.projects()).toEqual([{ id, absPath: "/srv/proj/renamed", name: "cli" }]);
      });
    });

    it("round-trips phases", () => {
      withStore((store) => {
        const project = seedProject(store);
        store.setPhase(project, 1, { title: "One" });
        store.setPhase(project, 2, { title: "Two", state: "done" });
        expect(store.getPhase(project, 1)).toEqual({ projectId: project, number: 1, title: "One", state: "open" });
        expect(store.phasesFor(project).map((phase) => phase.number)).toEqual([1, 2]);
      });
    });

    it("round-trips plan meta and rules", () => {
      withStore((store) => {
        const project = seedProject(store);
        store.setPlanMeta(project, {
          frontmatter: "fm",
          preamble: "pre",
          contextSections: [{ heading: "## A", text: "t", index: 0 }],
          rules: "r",
        });
        expect(store.getPlanMeta(project)).toEqual({
          frontmatter: "fm",
          preamble: "pre",
          contextSections: [{ heading: "## A", text: "t", index: 0 }],
          rules: "r",
        });
        store.setRules(project, "r2");
        expect(store.getPlanMeta(project).rules).toBe("r2");
      });
    });

    it("creates, sets, pages, and searches tickets", () => {
      withStore((store) => {
        const project = seedProject(store);
        const first = store.createTicket(project, "Alpha", "first ticket", {
          body: "b",
          criteria: "ship it",
        });
        const second = store.createTicket(project, "Beta", "second ticket", {
          criteria: "other line",
        });
        expect(second).toBe(first + 1);
        expect(store.getTicket(first).title).toBe("Alpha");
        store.setTicket(first, { title: "Alpha 2" });
        expect(store.getTicket(first).title).toBe("Alpha 2");
        expect(store.ticketsFor(project).map((row) => row.id)).toEqual([first, second]);
        const page = store.ticketsPage({ projectId: project, sort: "id" });
        expect(page.total).toBe(2);
        expect(page.page.map((row) => row.id)).toEqual([first, second]);
        expect(store.searchTickets("alpha 2").map((hit) => hit.ticketId)).toEqual([first]);
        expect(store.searchTickets("OTHER").map((hit) => hit.ticketId)).toEqual([second]);
        expect(store.searchTickets("")).toEqual([]);
        expect(store.searchTickets("nothing like this")).toEqual([]);
      });
    });

    it("refuses a duplicate slug in one workspace", () => {
      withStore((store) => {
        const project = seedProject(store);
        store.createTicket(project, "Same", "one", { slug: "same" });
        expect(() => store.createTicket(project, "Same", "two", { slug: "same" })).toThrow(
          /already used/,
        );
      });
    });

    it("attaches evidence and scores it", () => {
      withStore((store) => {
        const project = seedProject(store);
        const ticket = store.createTicket(project, "T", "d");
        store.attachEvidence(ticket, "builtin:agent_report", { text: "did it" }, "agent");
        const rows = store.evidenceFor(ticket);
        expect(rows.length).toBe(1);
        expect(rows[0]).toMatchObject({ kind: "builtin:agent_report", author: "agent" });
        expect(store.confidenceScore(ticket)).toBeGreaterThan(0);
        expect(() => store.attachEvidence(ticket, "builtin:nope", {}, "agent")).toThrow(
          UnknownKind,
        );
        expect(() => store.attachEvidence(ticket, "builtin:user_signoff", {}, "agent")).toThrow(
          EvidenceAuthorRefused,
        );
      });
    });

    it("detaches evidence by at and kind", () => {
      withStore((store) => {
        const project = seedProject(store);
        const ticket = store.createTicket(project, "T", "d");
        store.attachEvidence(ticket, "builtin:agent_report", { n: 1 }, "agent");
        store.attachEvidence(ticket, "builtin:comment", { n: 2 }, "agent");
        const [first] = store.evidenceFor(ticket);
        store.detachEvidence(ticket, first!.createdAt, first!.kind);
        expect(store.evidenceFor(ticket).map((row) => row.kind)).toEqual(["builtin:comment"]);
        // The log keeps the history: attachment AND detachment both replay.
        const kinds = store.events().map((event) => event.kind);
        expect(kinds).toContain("evidence/attached");
        expect(kinds).toContain("evidence/detached");
        expect(() => store.detachEvidence(ticket, 0.5, "builtin:comment")).toThrow(
          UnknownEvidenceRow,
        );
        expect(() => store.detachEvidence(9999, 1, "builtin:comment")).toThrow(UnknownTicket);
      });
    });

    it("links and unlinks evidence to criteria", () => {
      withStore((store) => {
        const project = seedProject(store);
        const ticket = store.createTicket(project, "T", "d", { criteria: "ship it\npolish it" });
        store.attachEvidence(ticket, "builtin:agent_report", {}, "agent");
        const [row] = store.evidenceFor(ticket);
        const at = row!.createdAt;
        store.linkEvidence(ticket, at, "builtin:agent_report", "ship it");
        expect(store.evidenceFor(ticket)[0]!.payload).toMatchObject({ criteria: "ship it" });
        store.linkEvidence(ticket, at, "builtin:agent_report", null);
        expect(store.evidenceFor(ticket)[0]!.payload).toMatchObject({ criteria: "" });
        expect(() => store.linkEvidence(ticket, at, "builtin:agent_report", "not a criterion")).toThrow(
          /not one of the ticket's criteria/,
        );
        expect(() => store.linkEvidence(ticket, 0.5, "builtin:agent_report", "ship it")).toThrow(
          UnknownEvidenceRow,
        );
      });
    });

    it("round-trips comments", () => {
      withStore((store) => {
        const project = seedProject(store);
        const ticket = store.createTicket(project, "T", "d");
        store.addComment(ticket, "first", "agent");
        store.addComment(ticket, "second", "user");
        expect(store.commentsFor(ticket).map((comment) => comment.text)).toEqual([
          "first",
          "second",
        ]);
        expect(() => store.commentsFor(9999)).toThrow(UnknownTicket);
      });
    });

    it("gates moves and logs refusals", () => {
      withStore(
        (store) => {
          const project = seedProject(store);
          const ticket = store.createTicket(project, "T", "d");
          const refusal = expectGateRefused(() =>
            store.moveTicket(ticket, "in_progress", "agent"),
          );
          expect(refusal.missingKinds).toEqual(["builtin:agent_report"]);
          store.attachEvidence(ticket, "builtin:agent_report", {}, "agent");
          store.moveTicket(ticket, "in_progress", "agent");
          expect(store.getTicket(ticket).state).toBe("in_progress");
          expect(
            store.events().filter((event) => event.kind === "aidos/refusal").length,
          ).toBe(1);
        },
        gatedConfig(),
      );
    });

    it("stamps the origin session on every write when one is given", () => {
      const backend = makeBackend();
      try {
        const store = new Store(makeConfig(), {
          now: () => FIXED_NOW,
          storage: backend.storage,
          originSessionId: "sess-1",
        });
        const project = store.createProject("/w", "w");
        const ticket = store.createTicket(project, "T", "d");
        store.attachEvidence(ticket, "builtin:agent_report", {}, "agent");
        const rows = backend.storage.readAll();
        expect(rows.length).toBeGreaterThan(0);
        for (const [index, row] of rows.entries()) {
          expect(row.sessionId).toBe("sess-1");
          expect(row.localSeq).toBe(index + 1);
        }
        store.close();
      } finally {
        backend.dispose();
      }
    });

    it("leaves the origin empty when no session is given", () => {
      const backend = makeBackend();
      try {
        const store = new Store(makeConfig(), {
          now: () => FIXED_NOW,
          storage: backend.storage,
        });
        const project = store.createProject("/w", "w");
        store.createTicket(project, "T", "d");
        for (const row of backend.storage.readAll()) {
          expect(row.sessionId).toBeNull();
          expect(row.localSeq).toBeNull();
        }
        store.close();
      } finally {
        backend.dispose();
      }
    });

    it("replays the same storage into a second store with an identical board", () => {
      const backend = makeBackend();
      try {
        const first = new Store(makeConfig(), {
          now: () => FIXED_NOW,
          storage: backend.storage,
        });
        const project = first.createProject("/w", "w");
        const ticket = first.createTicket(project, "T", "d", { criteria: "ship it" });
        first.attachEvidence(ticket, "builtin:agent_report", {}, "agent");
        first.addComment(ticket, "note", "user");
        const second = new Store(makeConfig(), {
          now: () => FIXED_NOW,
          storage: backend.storage,
        });
        expect(second.getTicket(ticket)).toEqual(first.getTicket(ticket));
        expect(second.evidenceFor(ticket)).toEqual(first.evidenceFor(ticket));
        expect(second.commentsFor(ticket)).toEqual(first.commentsFor(ticket));
        first.close();
      } finally {
        backend.dispose();
      }
    });

    it("assigns port seq values 1..N in append order", () => {
      const backend = makeBackend();
      try {
        const store = new Store(makeConfig(), {
          now: () => FIXED_NOW,
          storage: backend.storage,
        });
        const project = store.createProject("/w", "w");
        const ticket = store.createTicket(project, "T", "d");
        store.attachEvidence(ticket, "builtin:agent_report", {}, "agent");
        // The port assigns seq, 1-based and strictly increasing: the
        // envelope is the migration chain's (#41) ordering, not a counter
        // any fold recomputes.
        expect(backend.storage.readAll().map((row) => row.seq)).toEqual([1, 2, 3]);
        store.close();
      } finally {
        backend.dispose();
      }
    });
  });
}

/**
 * #38 follow-up (mutation run mut38-*): eight suite gaps the surviving
 * mutants proved. The port-parity half lives in the loop above (including
 * the seq test); these are the Store-level behaviours both ports share,
 * driven here through the memory port. The SQLite-only materialized-table
 * half lives in test-38-store-sqlite.test.ts.
 */

/** A port whose persist always fails: disk full, locked file, dead handle. */
class ThrowingStorage implements StoragePort {
  append(): StoredEvent {
    throw new Error("disk full");
  }
  allocateTicketId(): TicketId {
    return 1;
  }
  readAll(): StoredEvent[] {
    return [];
  }
  close(): void {}
}

function gapStore(): { store: Store; storage: MemoryStorage } {
  const storage = new MemoryStorage();
  const store = new Store(makeConfig(), { now: () => FIXED_NOW, storage });
  return { store, storage };
}

describe("#38 a failing port never moves the fold", () => {
  it("a throwing append leaves the log and the fold untouched", () => {
    const store = new Store(makeConfig(), {
      now: () => FIXED_NOW,
      storage: new ThrowingStorage(),
    });
    // Persist runs BEFORE the in-memory push: the write throws with the
    // fold untouched, so the store never believes a write the log lacks.
    expect(() => store.createProject("/w", "w")).toThrow(/disk full/);
    expect(store.events()).toEqual([]);
    expect(store.projects()).toEqual([]);
  });
});

describe("#38 search limits, filters, and order", () => {
  it("caps substring search at 50 hits", () => {
    const { store } = gapStore();
    try {
      const project = store.createProject("/w", "w");
      for (let i = 0; i < 55; i++) {
        store.createTicket(project, `Cap ticket ${i}`, "a shared needle");
      }
      expect(store.searchTickets("needle")).toHaveLength(50);
    } finally {
      store.close();
    }
  });

  it("honours the projectId filter", () => {
    const { store } = gapStore();
    try {
      const first = store.createProject("/one", "one");
      const second = store.createProject("/two", "two");
      const inFirst = store.createTicket(first, "Scoped work", "a shared needle");
      const inSecond = store.createTicket(second, "Scoped work", "a shared needle");
      expect(
        store.searchTickets("needle", { projectId: first }).map((hit) => hit.ticketId),
      ).toEqual([inFirst]);
      expect(
        store.searchTickets("needle", { projectId: second }).map((hit) => hit.ticketId),
      ).toEqual([inSecond]);
      expect(store.searchTickets("needle")).toHaveLength(2);
    } finally {
      store.close();
    }
  });

  it("returns hits in ascending ticket id order", () => {
    const { store } = gapStore();
    try {
      const project = store.createProject("/w", "w");
      const ids = [
        store.createTicket(project, "Order one", "a sortable needle"),
        store.createTicket(project, "Order two", "a sortable needle"),
        store.createTicket(project, "Order three", "a sortable needle"),
      ];
      expect(store.searchTickets("sortable needle").map((hit) => hit.ticketId)).toEqual(ids);
    } finally {
      store.close();
    }
  });
});

describe("#38 linking to an empty criterion refuses", () => {
  it("an empty or blank criterion names the non-empty-line rule", () => {
    const { store } = gapStore();
    try {
      const project = store.createProject("/w", "w");
      const ticket = store.createTicket(project, "T", "d", { criteria: "ship it" });
      store.attachEvidence(ticket, "builtin:agent_report", {}, "agent");
      const [row] = store.evidenceFor(ticket);
      const at = row!.createdAt;
      // Without the empty check these still throw, but with the WRONG
      // message ("not one of the ticket's criteria") — the pin is the
      // rule, not the refusal.
      expect(() => store.linkEvidence(ticket, at, "builtin:agent_report", "")).toThrow(
        /non-empty/,
      );
      expect(() => store.linkEvidence(ticket, at, "builtin:agent_report", "   ")).toThrow(
        /non-empty/,
      );
    } finally {
      store.close();
    }
  });
});

describe("#38 MemoryStorage honours close", () => {
  it("refuses appends and id claims after close, and close stays idempotent", () => {
    const storage = new MemoryStorage();
    storage.close();
    expect(() => storage.close()).not.toThrow();
    expect(() =>
      storage.append({
        kind: "aidos/refusal",
        version: 1,
        ticketId: 1,
        fromState: null,
        toState: null,
        actor: null,
        reason: "r",
        at: 1,
      }),
    ).toThrow(/closed/);
    expect(() => storage.allocateTicketId()).toThrow(/closed/);
  });
});
