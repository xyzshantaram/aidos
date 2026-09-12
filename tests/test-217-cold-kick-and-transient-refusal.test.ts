/**
 * #217: two store reads still miss on a cold host, and the transient refusal
 * reads as definitive.
 *
 * HALF 1 — `coldTickets` and `searchTickets` never kicked the one-time
 * import: the kick lived in `_workspaceStoreForRead`, which `getTickets`,
 * `getTicket`/`get_evidence` and `plan`/`plan_meta` all go through, but
 * `coldTickets` read via `_workspaceStore` and `searchTickets` opened the
 * store directly behind its #44 `existsSync` guard. On a cold host where one
 * of these was the FIRST board interaction, both returned `[]` and stayed
 * `[]` — until any kicking read healed them. The fix routes both through
 * the same seam (`searchTickets` under a GUARDED kick, so a search still
 * never creates a store).
 *
 * HALF 2 — the miss itself must stay synchronous (the write boundary reads
 * `getTickets` synchronously), so "miss once, resolve after" is forced; what
 * was missing is that nothing SAYS so. A plain numeric id read while the
 * import has not completed now refuses as "not loaded yet" (transient),
 * never as the settled "no such ticket" fact — and the `get_tickets` /
 * `get_ticket` descriptions admit the cold case.
 *
 * THE ORDERING DISCIPLINE (from test-207's final describe block, which this
 * mirrors): the defect exists ONLY when the surface under test is the FIRST
 * board interaction on a cold host. Nothing in the cold tests below may
 * call `workspaceTickets` or `get_tickets` before the first surface read —
 * those kick the import and would hide the defect. Discrimination is on the
 * SECOND read throughout: the kick is fire-and-forget, so a first call may
 * legitimately miss; pre-fix, every later call misses too.
 *
 * Criterion map (#217's acceptance, verbatim):
 *   1. a cold host whose first board interaction is coldTickets returns the
 *      workspace's rows on a later read rather than staying empty
 *   2. a cold host whose first board interaction is a search returns hits on
 *      a later read, and a search still never CREATES a store (#44's rule
 *      keeps its test)
 *   3. the two paths reach the import through the same seam the other reads
 *      use, rather than each growing its own kick
 *   4. the refusal an agent sees when a ticket is not yet imported
 *      distinguishes 'not found' from 'not loaded yet', so it cannot be
 *      read as a settled fact
 *   5. the get_tickets and get_ticket tool descriptions state that a board
 *      read on a cold workspace may need a second call, so the agent can
 *      act correctly without guessing
 *   6. (ordering) a test drives each of the two surfaces FIRST on a cold
 *      host, since the defect only exists in that ordering
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { SessionId } from "@deepseek-ai/dsh-session";

import { apply } from "../src/tools/aidos-tools";
import { openWorkspaceStorage, storePathForWorkspace } from "../src/host/storage-sqlite";
import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { Store } from "../src/kernel/store";
import { asContext, createHarness, failureJson } from "./b1-harness";

const WS = "/home/sid/repos/aidos";

/**
 * One CLOSED session's log: a distinct session id, its own events, built by
 * the real service so the log holds exactly what a production log holds,
 * then detached from the live agents. Mirrors test-207's builder — the
 * defect hid behind never driving two distinct logs.
 */
function buildClosedLog(harness: ReturnType<typeof createHarness>, id: string, title: string) {
  const peer = harness.makeAgent({ id });
  (peer.session.header as { cwd?: string }).cwd = WS;
  const peerTicket = harness.service.userSetTicket(harness.asAgent(peer), { title });
  const events = [...peer.session.events];
  harness.agents.splice(harness.agents.indexOf(peer), 1);
  return { events, ticketId: peerTicket.id };
}

/** A fresh reader session: its OWN log is empty; only its cwd binds it. */
function freshReader(harness: ReturnType<typeof createHarness>, id: string, cwd = WS) {
  const reader = harness.makeAgent({ id });
  (reader.session.header as { cwd?: string }).cwd = cwd;
  return reader;
}

function provideClosedLog(
  harness: ReturnType<typeof createHarness>,
  sessionId: string,
  events: readonly never[] | readonly { seq: number; type: string; data: unknown }[],
): void {
  harness.ctx.reflect.provide("sessionPersistence", {
    list: async () => [{ id: SessionId(sessionId), cwd: WS }],
    inspect: async (id: string) => {
      if (id !== sessionId) throw new Error("not found");
      return { meta: { id, cwd: WS }, events: events as never[] };
    },
  });
}

const sleep10 = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));

describe("#217 criterion 1: a cold host whose first board interaction is coldTickets", () => {
  it("returns the workspace rows on a later read rather than staying empty", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const log = buildClosedLog(harness, "s217-cold-owner", "only reachable after the import");
    provideClosedLog(harness, "s217-cold-owner", log.events);
    const service = harness.service;
    const agent = harness.asAgent(freshReader(harness, "s217-cold-reader"));

    // FIRST board interaction on this host is coldTickets — never
    // workspaceTickets or get_tickets first. Allowed to miss.
    service.coldTickets(agent, { sessionId: "s217-cold-owner" });

    // Pre-fix this stays empty however long we wait, because no read ever
    // kicked the import.
    for (
      let attempt = 0;
      attempt < 50 && service.coldTickets(agent, { sessionId: "s217-cold-owner" }).length === 0;
      attempt += 1
    ) {
      await sleep10();
    }
    const titles = service
      .coldTickets(agent, { sessionId: "s217-cold-owner" })
      .map((row) => row.title);
    expect(titles).toContain("only reachable after the import");
  });
});

describe("#217 criterion 2: a cold host whose first board interaction is a search", () => {
  it("returns hits on a later read once the guarded kick has run", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const log = buildClosedLog(harness, "s217-search-owner", "payment ledger reconciliation");
    /*
     * The store file EXISTS (opened by an earlier process) but the one-time
     * import never ran — seeded with a project row and NO backfill marker,
     * never with backfilled logs (those would land the marker and the first
     * search would hit immediately, hiding the defect). This is the state
     * the GUARDED kick exists for: `existsSync` passes, so the search may
     * start the import; with no file at all it must not.
     */
    const seed = new Store(DEFAULT_CONFIG, { storage: openWorkspaceStorage(WS) });
    seed.createProject(WS, "aidos");
    provideClosedLog(harness, "s217-search-owner", log.events);
    const service = harness.service;
    const agent = harness.asAgent(freshReader(harness, "s217-search-reader"));

    // FIRST board interaction on this host is the search. Allowed to miss.
    service.searchTickets(agent, { query: "reconciliation" });

    // Pre-fix this stays empty however long we wait.
    for (
      let attempt = 0;
      attempt < 50 && service.searchTickets(agent, { query: "reconciliation" }).length === 0;
      attempt += 1
    ) {
      await sleep10();
    }
    expect(
      service.searchTickets(agent, { query: "reconciliation" }).map((hit) => hit.title),
    ).toEqual(["payment ledger reconciliation"]);
  });

  it("a search still never CREATES a store (#44's rule, with the file assertion)", () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const peer = harness.makeAgent({ id: "s217-live-only" });
    (peer.session.header as { cwd?: string }).cwd = WS;
    harness.service.userSetTicket(harness.asAgent(peer), { title: "Live payment ticket" });

    // Precondition: this workspace has no store file at all.
    expect(existsSync(storePathForWorkspace(WS))).toBe(false);

    const hits = harness.service.searchTickets(
      harness.asAgent(freshReader(harness, "s217-nocreate-reader")),
      { query: "payment" },
    );
    expect(hits.map((hit) => hit.title)).toEqual(["Live payment ticket"]);

    // The guarded kick saw no file and fired nothing: still no store.
    expect(existsSync(storePathForWorkspace(WS))).toBe(false);
  });
});

describe("#217 criterion 3: both paths reach the import through the same seam", () => {
  const core = readFileSync(new URL("../src/host/aidos-core.ts", import.meta.url), "utf8");
  const searchBody = core.slice(
    core.indexOf("searchTickets(agent"),
    core.indexOf('@Remote("coldTickets")'),
  );
  const coldBody = core.slice(
    core.indexOf("coldTickets(agent"),
    core.indexOf("private _liveWorkspaceSessions"),
  );

  it("coldTickets reads the store through _workspaceStoreForRead, not a second kick", () => {
    expect(coldBody).toContain("_workspaceStoreForRead");
    expect(coldBody).not.toContain("_workspaceStore(");
  });

  it("searchTickets kicks through _workspaceStoreForRead without dropping its existsSync guard", () => {
    expect(searchBody).toContain("_workspaceStoreForRead");
    expect(searchBody).toContain("existsSync(storePathForWorkspace(cwd))");
  });
});

describe("#217 criterion 4: the transient refusal cannot be read as a settled fact", () => {
  it("a first get_ticket on a cold host refuses transiently, then resolves", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const log = buildClosedLog(harness, "s217-transient-owner", "only reachable after the import");
    provideClosedLog(harness, "s217-transient-owner", log.events);
    const service = harness.service;
    const agent = harness.asAgent(freshReader(harness, "s217-transient-reader"));

    // FIRST board interaction: get_ticket for the closed owner's numeric id.
    let firstMessage = "";
    try {
      service.getTicket(agent, { ticketId: log.ticketId });
    } catch (error) {
      firstMessage = error instanceof Error ? error.message : String(error);
    }
    // Pre-fix this is the settled "no such ticket: 1" — actionable as fact.
    expect(firstMessage).toMatch(/not loaded yet/);
    expect(firstMessage).toMatch(/get_tickets/);

    // The composite form stays settled even on a cold host: no retry ever
    // resolves it (#45).
    expect(() =>
      service.getTicket(agent, { ticketId: `s217-transient-owner:${log.ticketId}` }),
    ).toThrow(/no such ticket/);

    // Discrimination is on the later read: the kick was fire-and-forget.
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        if (service.getTicket(agent, { ticketId: log.ticketId }).ticket.title === "only reachable after the import") break;
      } catch {
        await sleep10();
      }
    }
    expect(service.getTicket(agent, { ticketId: log.ticketId }).ticket.title).toBe(
      "only reachable after the import",
    );
  });

  it("a genuinely unknown id settles to the definitive refusal after the import", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const log = buildClosedLog(harness, "s217-settled-owner", "settles the import");
    provideClosedLog(harness, "s217-settled-owner", log.events);
    const service = harness.service;
    const agent = harness.asAgent(freshReader(harness, "s217-settled-reader"));

    const readUnknown = (): string => {
      try {
        service.getTicket(agent, { ticketId: 999 });
        return "resolved";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    };

    // Cold: transient — the id may simply not be loaded.
    expect(readUnknown()).toMatch(/not loaded yet/);

    // Let the import settle (the board now carries the closed ticket)...
    for (
      let attempt = 0;
      attempt < 50 && !service.getTickets(agent).some((row) => row.title === "settles the import");
      attempt += 1
    ) {
      await sleep10();
    }
    expect(
      service.getTickets(agent).some((row) => row.title === "settles the import"),
    ).toBe(true);

    // ...and the same id now refuses as settled fact: no "yet".
    const settled = readUnknown();
    expect(settled).toContain("no such ticket: 999");
    expect(settled).not.toContain("yet");
  });

  it("the get_ticket tool marks the transient refusal so the agent can act on it", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    apply(asContext(harness.ctx), {});
    // No persistence, no prior reads: the import cannot have completed.
    const refusal = failureJson(await harness.runTool("get_ticket", { ticketId: 999 }));
    expect(refusal.error).toBe("unknown_ticket");
    expect(refusal.transient).toBe(true);
    expect(refusal.ticketId).toBe(999);
    expect(String(refusal.message)).toMatch(/not loaded yet/);
  });
});

describe("#217 criterion 5: the tool descriptions admit the cold case", () => {
  const tools = readFileSync(new URL("../src/tools/aidos-tools.ts", import.meta.url), "utf8");

  it("get_tickets says a first read on a cold workspace may miss and needs a second call", () => {
    expect(tools).toContain("call get_tickets again for the settled board");
  });

  it("get_ticket distinguishes the transient refusal from a settled one", () => {
    expect(tools).toContain("with transient true means the import is still running");
    expect(tools).toContain("a repeat refusal means the ticket does not exist");
  });
});
