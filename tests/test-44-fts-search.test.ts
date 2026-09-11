/**
 * #44: search reads the FTS index.
 *
 * `searchTickets` queries the workspace store's FTS5 table instead of (and,
 * until #42 retires the bridge, alongside) the live-session walk. That buys
 * two things the old title-substring walk could never do: a ticket in a
 * CLOSED session is reachable, and a word from a DESCRIPTION matches. The
 * query itself is token-based with per-token prefix matching — "board"
 * finds "board" but not "dashboard", a deliberate change from the old
 * substring semantics (see the test at the bottom, which pins the change).
 *
 * The store under test lives in a TEMP DSH_HOME, the same override
 * `src/tools/scratch.ts`'s own tests use; nothing here touches ~/.dsh.
 *
 * Criterion map:
 *   1. search finds a ticket that lives in a closed session
 *   2. search finds a ticket by a word from its description, not only
 *      its title
 *   3. the dependency search field in the detail panel still adds a
 *      dependency — covered two ways: the host-side end-to-end flow
 *      (search hit → refOf → userSetTicket adds the ref), and a source
 *      pin on src/client/detail-panel.tsx (the panel calls searchTickets,
 *      renders `workspaceKey:id` refs from the hit shape, and adds via
 *      userSetTicket), the same style the u-suites pin client wiring.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createHarness } from "./b1-harness";
import { Store } from "../src/kernel/store";
import { MemoryStorage } from "../src/kernel/storage-memory";
import { openWorkspaceStorage } from "../src/host/storage-sqlite";
import { ftsMatchExpression } from "../src/host/storage-sqlite";
import { workspaceKeyFromPath } from "../src/kernel/slug";
import { DEFAULT_CONFIG } from "../src/kernel/constants";
import type { AidosEvent } from "../src/kernel/types";
import { FIXED_NOW } from "./helpers";

/** The harness sessions bind to this cwd (b1-harness DEFAULT_CWD). */
const CWD = "/srv/proj/cli";
const WS_KEY = workspaceKeyFromPath(CWD);

/**
 * Run one test body under a throwaway DSH_HOME. dshHomePath reads the
 * variable per call, so every store path inside resolves into the temp
 * home and the real ~/.dsh is never touched.
 */
function withTempHome(fn: () => void): void {
  const dir = mkdtempSync(join(tmpdir(), "aidos-44-home-"));
  const prev = process.env.DSH_HOME;
  process.env.DSH_HOME = dir;
  try {
    fn();
  } finally {
    if (prev === undefined) {
      delete process.env.DSH_HOME;
    } else {
      process.env.DSH_HOME = prev;
    }
    openWorkspaceStorage(CWD).close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Build one session log the real way (a Store on its own ephemeral port),
 * shaped exactly like one `sessionPersistence.inspect` result — the same
 * builder test-41 uses. The log's owning session is NOT installed into the
 * harness: it is closed.
 */
function closedSessionLog(
  sessionId: string,
  build: (store: Store) => void,
): { sessionId: string; events: { seq: number; type: string; data: AidosEvent }[] } {
  const store = new Store(DEFAULT_CONFIG, { now: () => FIXED_NOW, storage: new MemoryStorage() });
  store.createProject(CWD, "cli");
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

/**
 * Seed the workspace store: the project, plus the given closed logs
 * imported through #41's backfill (the ONLY writer stores have until #42
 * lands the mirrored write path).
 */
function seedStore(logs: Parameters<Store["backfillSessionLogs"]>[1]): void {
  const storage = openWorkspaceStorage(CWD);
  const store = new Store(DEFAULT_CONFIG, { now: () => FIXED_NOW, storage });
  const projectId = store.createProject(CWD, "cli");
  store.backfillSessionLogs(projectId, logs);
}

describe("#44 criterion 1: a ticket in a closed session is found", () => {
  it("a query matches a ticket whose owning session is not open", () => {
    withTempHome(() => {
      const closed = closedSessionLog("session-closed", (store) => {
        const project = store.findProject(CWD)!;
        store.createTicket(project, "Fix the payment gateway", "charge retries");
      });
      seedStore([closed]);

      const harness = createHarness();
      const service = harness.installService();
      // The only live session holds a different ticket entirely.
      service.setTicket(harness.asAgent(), { title: "Unrelated live ticket" });

      const results = service.searchTickets(harness.asAgent(), { query: "payment" });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Fix the payment gateway");
      expect(results[0].sessionId).toBe("session-closed");
      expect(results[0].workspaceKey).toBe(WS_KEY);
      expect(results[0].state).toBe("open");
      expect(results[0].dependsOn).toEqual([]);
    });
  });
});

describe("#44 criterion 2: a description word matches, not only the title", () => {
  it("a token appearing only in the description finds the ticket", () => {
    withTempHome(() => {
      const closed = closedSessionLog("session-closed", (store) => {
        const project = store.findProject(CWD)!;
        store.createTicket(
          project,
          "Add tests",
          "cover the ledger reconciliation path end to end",
        );
      });
      seedStore([closed]);

      const harness = createHarness();
      const service = harness.installService();

      const results = service.searchTickets(harness.asAgent(), { query: "reconciliation" });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Add tests");
    });
  });

  it("a title query still works, and comment text matches too", () => {
    withTempHome(() => {
      const closed = closedSessionLog("session-closed", (store) => {
        const project = store.findProject(CWD)!;
        const ticket = store.createTicket(project, "Add tests", "d");
        store.addComment(ticket, "re-run the fixture before merge", "user");
      });
      seedStore([closed]);

      const harness = createHarness();
      const service = harness.installService();

      expect(service.searchTickets(harness.asAgent(), { query: "tests" }).length).toBe(1);
      expect(
        service.searchTickets(harness.asAgent(), { query: "fixture" }).map((hit) => hit.title),
      ).toEqual(["Add tests"]);
    });
  });

  it("a prefix of a word matches; a word inside another word does not", () => {
    withTempHome(() => {
      const closed = closedSessionLog("session-closed", (store) => {
        const project = store.findProject(CWD)!;
        store.createTicket(project, "Wire the dashboard", "d");
      });
      seedStore([closed]);

      const harness = createHarness();
      const service = harness.installService();

      // Token match: "dashboard" answers to its own prefix...
      expect(
        service.searchTickets(harness.asAgent(), { query: "dash" }).map((hit) => hit.title),
      ).toEqual(["Wire the dashboard"]);
      // ...but the old substring behavior ("board" inside "dashboard")
      // is gone, deliberately.
      expect(service.searchTickets(harness.asAgent(), { query: "board" })).toEqual([]);
    });
  });

  it("a query with FTS5 syntax characters matches instead of throwing", () => {
    withTempHome(() => {
      const closed = closedSessionLog("session-closed", (store) => {
        const project = store.findProject(CWD)!;
        store.createTicket(project, "Fix the payment gateway", "d");
      });
      seedStore([closed]);

      const harness = createHarness();
      const service = harness.installService();

      // Quotes, parens, and column filters would otherwise be parsed as
      // FTS5 query syntax; the tokenizer quotes every token away.
      const results = service.searchTickets(harness.asAgent(), { query: 'payment" (' });
      expect(results.map((hit) => hit.title)).toEqual(["Fix the payment gateway"]);
    });
  });

  it("the expression builder quotes tokens and prefix-matches", () => {
    expect(ftsMatchExpression("Fix the PAYMENT gateway")).toBe(
      '"fix"* "the"* "payment"* "gateway"*',
    );
    expect(ftsMatchExpression('a"b (c')).toBe('"a"* "b"* "c"*');
    expect(ftsMatchExpression("   ")).toBe("");
  });
});

describe("#44 criterion 3: the detail panel still adds a dependency", () => {
  it("a store hit feeds refOf and userSetTicket adds the reference", () => {
    withTempHome(() => {
      const closed = closedSessionLog("session-closed", (store) => {
        const project = store.findProject(CWD)!;
        store.createTicket(project, "Foundation work", "d");
      });
      seedStore([closed]);

      const harness = createHarness();
      const service = harness.installService();
      // Live session-local ids start at 1, the same number the store's id
      // space starts at — the collision #45 exists to remove. Give the
      // dependent live ticket its own id so the added ref cannot be
      // self-referential.
      service.setTicket(harness.asAgent(), { title: "Unrelated live ticket" });
      const live = service.setTicket(harness.asAgent(), { title: "Dependent live ticket" });

      // The client flow, host-side: the panel searches...
      const hits = service.searchTickets(harness.asAgent(), { query: "foundation" });
      expect(hits).toHaveLength(1);
      // ...renders the hit as `workspaceKey:id` (detail-panel's refOf)...
      const hit = hits[0];
      const ref = `${hit.workspaceKey}:${hit.ticketId}`;
      // ...and adds the ref to the current dependsOn via userSetTicket.
      service.userSetTicket(harness.asAgent(), {
        ticketId: live.id,
        dependsOn: [ref],
      });

      const row = service.getTicket(harness.asAgent(), { ticketId: live.id });
      expect(row.ticket.dependsOn).toEqual([ref]);
    });
  });

  it("the detail panel still wires searchTickets → userSetTicket (source pin)", () => {
    // The client suite style (u98/u123): pin the client wiring by source,
    // since there is no DOM renderer under test. The panel must keep
    // calling the searchTickets Remote from the dependency search box and
    // keep adding through userSetTicket with the union list — the exact
    // consumption the result shape above feeds.
    const source = readFileSync(
      new URL("../src/client/detail-panel.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain('callAidosRemote(\n        "searchTickets",');
    expect(source).toContain('callAidosRemote(\n        "userSetTicket",');
    expect(source).toContain("dependsOn: [...new Set([...current, ref])]");
    // The hit shape the Remote returns is the shape refOf consumes.
    expect(source).toContain("hit.workspaceKey + \":\" + hit.ticketId");
  });
});

describe("#44: search never creates a store and never returns retired rows", () => {
  it("a search with no store on disk returns live hits only", () => {
    withTempHome(() => {
      // No seedStore: the workspace has no store yet. The search must not
      // CREATE one as a side effect.
      const harness = createHarness();
      const service = harness.installService();
      service.setTicket(harness.asAgent(), { title: "Live payment ticket" });

      expect(service.searchTickets(harness.asAgent(), { query: "payment" }).length).toBe(1);
    });
  });

  it("a retired ticket in the store is not a hit", () => {
    withTempHome(() => {
      const closed = closedSessionLog("session-closed", (store) => {
        const project = store.findProject(CWD)!;
        const retired = store.createTicket(project, "Retired work", "d");
        const live = store.createTicket(project, "Live work", "d");
        void live;
        store.attachEvidence(retired, "builtin:retired", {}, "user");
      });
      seedStore([closed]);

      const harness = createHarness();
      const service = harness.installService();

      const retiredHits = service.searchTickets(harness.asAgent(), { query: "retired work" });
      expect(retiredHits).toEqual([]);
      expect(
        service.searchTickets(harness.asAgent(), { query: "live work" }).map((hit) => hit.title),
      ).toEqual(["Live work"]);
    });
  });
});
