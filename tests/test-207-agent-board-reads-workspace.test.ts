/**
 * #207 (with #84): the agent board read resolves against the WORKSPACE, not
 * against one session's fold.
 *
 * The defect, demonstrated by the #42 review: a fresh session with an empty
 * own log in a workspace that holds tickets read `get_tickets -> []` —
 * ok:true, empty, while the workspace held rows — because `getTickets` folded
 * exactly one session and `_ensureProject` handed a fresh session a brand-new
 * EMPTY project. The browser's `workspaceTickets` merge existed, but only the
 * browser called it.
 *
 * The fix: ONE derivation (`_workspaceBoardMerge`), two callers — the browser
 * remote and the agent read path (get_tickets, get_ticket/get_evidence,
 * plan, plan_meta).
 *
 * THE SHORTCUT THAT IS FORBIDDEN HERE: reading one session log twice. Every
 * board-reading test below drives at least TWO DISTINCT session logs in ONE
 * workspace — closed logs imported by the one-time backfill, or a live peer
 * session — and asserts the SECOND session reads the first's board.
 *
 * Criterion map (#207's acceptance, verbatim):
 *   1. a second session opened in a workspace that already holds tickets
 *      reads the same board through get_tickets — both "closed logs +
 *      backfill" and "live peer" variants.
 *   2. get_ticket, get_evidence, plan and plan_meta resolve a ticket that
 *      lives in another session's log — including by composite
 *      `<sourceSessionId>:<id>` when the owner is CLOSED.
 *   3. a board read from a session with an empty log returns the
 *      workspace's tickets, never an ok:true empty list.
 *   4. a board read from a session in a DIFFERENT workspace does not see
 *      this workspace's tickets.
 *
 * Plus the two unpinned shapes the same review found:
 *   - the retire filter on the workspaceTickets store loop (a retired
 *     backfilled closed-session ticket must not appear on the board);
 *   - `_backfillRuns` concurrency sharing (concurrent first-opens import
 *     each log exactly ONCE, counted at the persistence inspect seam).
 */

import { describe, expect, it } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import { createHarness, successJson } from "./b1-harness";
import type { BoardTicketView } from "../src/host/aidos-core";

const WS = "/home/sid/repos/aidos";
const OTHER = "/home/sid/repos/unrelated";

/**
 * One CLOSED session's log: a distinct session id, its own events, built by
 * the real service so the log holds exactly what a production log holds,
 * then detached from the live agents. Two calls produce TWO DISTINCT logs —
 * the shape the defect hid behind by never driving.
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

describe("#207 criterion 1+3: two closed logs, one workspace, a fresh session reads the board", () => {
  it("get_tickets in an empty-log session returns the imported tickets of BOTH other logs", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const first = buildClosedLog(harness, "s207-log-a", "ticket from log a");
    const second = buildClosedLog(harness, "s207-log-b", "ticket from log b");
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [
        { id: SessionId("s207-log-a"), cwd: WS },
        { id: SessionId("s207-log-b"), cwd: WS },
      ],
      inspect: async (id: string) => {
        const log = id === "s207-log-a" ? first : id === "s207-log-b" ? second : undefined;
        if (log === undefined) throw new Error("not found");
        return { meta: { id, cwd: WS }, events: log.events };
      },
    });
    const service = harness.service;

    // The backfill lands (the browser open awaits it, as in the review's
    // demonstration — "after the backfill has landed").
    await service.workspaceTickets(harness.asAgent());

    // A fresh session whose OWN log holds nothing reads the workspace board.
    const reader = freshReader(harness, "s207-reader");
    const rows = service.getTickets(harness.asAgent(reader)) as BoardTicketView[];
    const titles = rows.map((row) => row.title).sort();
    expect(titles).toEqual(["ticket from log a", "ticket from log b"]);
    // The rows trace to their OWNING logs, not to the reader.
    const byTitle = new Map(rows.map((row) => [row.title, row]));
    expect(byTitle.get("ticket from log a")?.sourceSessionId).toBe("s207-log-a");
    expect(byTitle.get("ticket from log b")?.sourceSessionId).toBe("s207-log-b");
    expect(byTitle.get("ticket from log a")?.foreign).toBe(true);
  });

  it("the live-peer variant: a fresh session sees a LIVE peer's tickets synchronously", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const peer = harness.makeAgent({ id: "s207-live-peer" });
    (peer.session.header as { cwd?: string }).cwd = WS;
    harness.service.userSetTicket(harness.asAgent(peer), { title: "live peer ticket" });

    const reader = freshReader(harness, "s207-live-reader");
    const rows = harness.service.getTickets(harness.asAgent(reader)) as BoardTicketView[];
    expect(rows.map((row) => row.title)).toContain("live peer ticket");
    const row = rows.find((r) => r.title === "live peer ticket")!;
    expect(row.sourceSessionId).toBe("s207-live-peer");
  });
});

describe("#207 criterion 2: the one-ticket reads resolve a foreign, CLOSED owner", () => {
  it("get_ticket resolves by plain id AND by composite id; get_evidence rides it", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const log = buildClosedLog(harness, "s207-owner", "owned by the closed log");
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId("s207-owner"), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== "s207-owner") throw new Error("not found");
        return { meta: { id, cwd: WS }, events: log.events };
      },
    });
    const service = harness.service;
    await service.workspaceTickets(harness.asAgent());

    const reader = freshReader(harness, "s207-reader2");
    const agent = harness.asAgent(reader);
    const agentCasted = agent;

    // Plain numeric id: the store renumbered the row into the workspace id
    // space, so it resolves with no live owner.
    const plain = service.getTicket(agentCasted, { ticketId: log.ticketId });
    expect(plain.ticket.title).toBe("owned by the closed log");
    expect(plain.evidence).toBeDefined();

    // Composite `<sourceSessionId>:<id>`: the write path's address form.
    // Pre-fix this threw OwnerUnavailable — routing only reached LIVE owners.
    const composite = service.getTicket(agentCasted, {
      ticketId: `s207-owner:${log.ticketId}`,
    });
    expect(composite.ticket.title).toBe("owned by the closed log");

    // get_evidence is getTicket underneath (src/tools/aidos-tools.ts calls
    // ctx.aidos.getTicket and maps result.evidence), so the tool reaches the
    // closed owner's rows through the same fallback; this harness registers
    // the six board tools, so assert the service seam directly.
    const evidenceRead = service.getTicket(agentCasted, {
      ticketId: `s207-owner:${log.ticketId}`,
    });
    expect(evidenceRead.ticket.id).toBe(log.ticketId);
    expect(Array.isArray(evidenceRead.evidence)).toBe(true);
  });

  it("plan and plan_meta resolve the workspace project for an empty-log session", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const log = buildClosedLog(harness, "s207-plan-owner", "planned in another log");
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId("s207-plan-owner"), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== "s207-plan-owner") throw new Error("not found");
        return { meta: { id, cwd: WS }, events: log.events };
      },
    });
    const service = harness.service;
    await service.workspaceTickets(harness.asAgent());

    const reader = freshReader(harness, "s207-plan-reader");
    const agent = harness.asAgent(reader);
    // Absent projectId: the workspace store's project — where the backfill
    // put the tickets — never a freshly minted empty one (#84).
    const planText = service.plan(agent);
    expect(planText).toContain("planned in another log");
    expect(planText).not.toContain("No tickets");

    // plan_meta resolves the same project without refusing.
    const meta = service.planMeta(agent);
    expect(meta).toHaveProperty("preamble");

    // An explicit project that exists NOWHERE still refuses by name (#84).
    expect(() => service.plan(agent, { projectId: 999 })).toThrow(/no such project/);
    expect(() => service.planMeta(agent, { projectId: 999 })).toThrow(/no such project/);
  });
});

describe("#42 review round 2: a COLD host whose first board read is get_ticket", () => {
  /*
   * The asymmetry this pins. The first fix kicked the one-time import inside
   * `_workspaceBoardMerge` only, so `get_tickets` was merely LATE on a cold
   * host — the rows landed from the next read. But `get_ticket`/`get_evidence`
   * and `plan`/`plan_meta` queried the store DIRECTLY and kicked nothing, so
   * on a host whose FIRST board interaction was one of those reads the answer
   * was "no such ticket" — and it STAYED "no such ticket" on every later call,
   * because nothing ever started the import. A wrong answer, not a late one.
   *
   * The discriminator is the SECOND read, not the first: the kick is
   * fire-and-forget, so the first call may legitimately miss. Pre-fix, every
   * later call misses too, forever.
   *
   * Nothing here may call workspaceTickets or get_tickets first — those kick
   * the import and would hide exactly the defect under test.
   */
  it("a repeated get_ticket resolves the closed owner's ticket; it does not refuse forever", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const log = buildClosedLog(harness, "s207-cold-owner", "only reachable after the import");
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId("s207-cold-owner"), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== "s207-cold-owner") throw new Error("not found");
        return { meta: { id, cwd: WS }, events: log.events };
      },
    });
    const service = harness.service;
    const agent = harness.asAgent(freshReader(harness, "s207-cold-reader"));

    const read = (): string | null => {
      try {
        return service.getTicket(agent, { ticketId: log.ticketId }).ticket.title;
      } catch {
        return null;
      }
    };

    // FIRST interaction with the board on this host. Allowed to miss.
    read();

    // Let the fire-and-forget import settle, then read again. Pre-fix this
    // stays null however long we wait, because no read ever kicked it.
    for (let attempt = 0; attempt < 50 && read() === null; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(read()).toBe("only reachable after the import");
  });

  it("plan does not render an empty document on a cold host", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const log = buildClosedLog(harness, "s207-cold-plan-owner", "a ticket the plan must carry");
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId("s207-cold-plan-owner"), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== "s207-cold-plan-owner") throw new Error("not found");
        return { meta: { id, cwd: WS }, events: log.events };
      },
    });
    const service = harness.service;
    const agent = harness.asAgent(freshReader(harness, "s207-cold-plan-reader"));

    // First board interaction is `plan`, never get_tickets.
    service.plan(agent);
    for (
      let attempt = 0;
      attempt < 50 && !service.plan(agent).includes("a ticket the plan must carry");
      attempt += 1
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(service.plan(agent)).toContain("a ticket the plan must carry");
    void log.ticketId;
  });
});

describe("#207 criterion 4: a different workspace does not see this workspace's tickets", () => {
  it("a session in another cwd reads its own (empty) store, never this board", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const log = buildClosedLog(harness, "s207-isolated", "belongs to the aidos workspace");
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId("s207-isolated"), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== "s207-isolated") throw new Error("not found");
        return { meta: { id, cwd: WS }, events: log.events };
      },
    });
    const service = harness.service;
    await service.workspaceTickets(harness.asAgent());

    const outsider = freshReader(harness, "s207-outsider", OTHER);
    const rows = service.getTickets(harness.asAgent(outsider)) as BoardTicketView[];
    expect(rows.map((row) => row.title)).not.toContain("belongs to the aidos workspace");
    // And the plan export of the outsider resolves the OUTSIDER's project.
    const planText = service.plan(harness.asAgent(outsider));
    expect(planText).not.toContain("belongs to the aidos workspace");
  });
});

describe("#108/unpinned: a RETIRED backfilled closed-session ticket is hidden from the board", () => {
  it("the store loop's retire filter holds on get_tickets and workspaceTickets; includeRetired sweeps it back", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    // A closed log whose ticket was RETIRED before the log closed.
    const peer = harness.makeAgent({ id: "s207-retired-owner" });
    (peer.session.header as { cwd?: string }).cwd = WS;
    const service = harness.service;
    const peerAgent = harness.asAgent(peer);
    const ticket = service.userSetTicket(peerAgent, { title: "retired while closed" });
    service.userRetireTicket(peerAgent, { ticketId: ticket.id, reason: "superseded" });
    const events = [...peer.session.events];
    harness.agents.splice(harness.agents.indexOf(peer), 1);

    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [{ id: SessionId("s207-retired-owner"), cwd: WS }],
      inspect: async (id: string) => {
        if (id !== "s207-retired-owner") throw new Error("not found");
        return { meta: { id, cwd: WS }, events };
      },
    });

    // Default board reads — browser AND agent — hide the retired row.
    const merged = await service.workspaceTickets(harness.asAgent());
    expect(merged.tickets.map((row) => row.title)).not.toContain("retired while closed");
    const reader = freshReader(harness, "s207-retired-reader");
    const rows = service.getTickets(harness.asAgent(reader)) as BoardTicketView[];
    expect(rows.map((row) => row.title)).not.toContain("retired while closed");

    // The deliberate sweep still reaches it, on both surfaces.
    const swept = await service.workspaceTickets(harness.asAgent(), { includeRetired: true });
    expect(swept.tickets.map((row) => row.title)).toContain("retired while closed");
    const sweptAgent = service.getTickets(harness.asAgent(reader), { includeRetired: true });
    expect(sweptAgent.map((row) => row.title)).toContain("retired while closed");
  });
});

describe("unpinned: concurrent first-opens share ONE backfill import", () => {
  it("two simultaneous first opens inspect each closed log exactly once", async () => {
    const harness = createHarness(undefined, { cwd: WS });
    harness.installService();
    const first = buildClosedLog(harness, "s207-race-a", "race ticket a");
    const second = buildClosedLog(harness, "s207-race-b", "race ticket b");
    let inspects = 0;
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [
        { id: SessionId("s207-race-a"), cwd: WS },
        { id: SessionId("s207-race-b"), cwd: WS },
      ],
      inspect: async (id: string) => {
        inspects += 1;
        const log = id === "s207-race-a" ? first : id === "s207-race-b" ? second : undefined;
        if (log === undefined) throw new Error("not found");
        return { meta: { id, cwd: WS }, events: log.events };
      },
    });
    const service = harness.service;
    const openerA = freshReader(harness, "s207-race-reader-a");
    const openerB = freshReader(harness, "s207-race-reader-b");

    // Both first opens in flight together: the single-flight wrapper must
    // share ONE import. Without `_backfillRuns` sharing, each open runs its
    // own `_ensureWorkspaceBackfill` and every log is inspected TWICE.
    const [boardA, boardB] = await Promise.all([
      service.workspaceTickets(harness.asAgent(openerA)),
      service.workspaceTickets(harness.asAgent(openerB)),
    ]);
    expect(inspects).toBe(2);
    for (const board of [boardA, boardB]) {
      const titles = board.tickets.map((row) => row.title).sort();
      expect(titles).toEqual(["race ticket a", "race ticket b"]);
    }
  });
});
