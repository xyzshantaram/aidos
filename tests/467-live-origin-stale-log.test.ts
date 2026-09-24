/**
 * Ticket #467: a board write for a ticket that lives ONLY in the workspace
 * store, whose backfill-stamped origin session is LIVE in the same process
 * with a log that predates the store renumbering.
 *
 * This is the production shape of the thursday-board failure: the one-time
 * reimport renumbered 206->446 IN THE STORE ONLY, stamping the imported
 * rows' origin with the session that authored them — a session that is
 * still open, still live in `ctx.agents.list()`, and whose own session log
 * therefore still folds the OLD id space. Reads escaped via getTicket's
 * #207 store fallback; the four write tools had no such fallback, so
 * `_ownerSession`'s live-preference routed every write into a fold that
 * cannot contain the id, and the refusal read as a settled "no such
 * ticket" for a ticket the board was displaying the whole time.
 *
 * The seeded scenario below reproduces it end to end: a workspace store
 * seeded by a real `backfillSessionLogs` import (so the row carries the
 * renumbered id and the origin stamp), plus a LIVE agent under that same
 * origin session id whose log is empty — the honest minimal model of "the
 * log predates the renumbering".
 *
 * Against the pre-fix code this suite is RED: attach_evidence and
 * set_ticket-edit refuse with `no such ticket`, suggest_actions and
 * request_allowlist refuse with `unknown ticket`, and digest_recent
 * returns zero rows rather than erroring.
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createHarness } from "./b1-harness";
import { Store } from "../src/kernel/store";
import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { openWorkspaceStorage } from "../src/host/storage-sqlite";

type Harness = ReturnType<typeof createHarness>;

/** The origin session id the backfill stamps — the LIVE owner's id. */
const LIVE_OWNER = "s467-live-owner";

/**
 * One workspace whose store holds exactly one imported ticket, plus a LIVE
 * agent under the imported row's origin id whose log folds nothing.
 *
 * Order matters (see the #217 harness notes): the harness installs its
 * service FIRST so the throwaway DSH_HOME is pinned, and only then is the
 * store seeded — `openWorkspaceStorage(WS)` must resolve under the reading
 * harness's own home or the rows are invisible to it.
 */
function staleOwnerSetup(): {
  harness: Harness;
  owner: ReturnType<Harness["makeAgent"]>;
  stranger: ReturnType<Harness["makeAgent"]>;
  ticketId: number;
} {
  const ws = mkdtempSync(join(tmpdir(), "ws467-"));
  const harness = createHarness(undefined, { cwd: ws });
  harness.installService();

  /*
   * Seed the store with a REAL backfill import, not a hand-written row:
   * the import is what renumbers the id into the workspace space and
   * stamps the origin the merge will read. A bare Store builds the source
   * log's events (it takes no storage, so nothing leaks to disk).
   */
  const source = new Store(DEFAULT_CONFIG);
  const sourceProject = source.createProject(ws, "aidos");
  source.createTicket(sourceProject, "Reimported ticket", "");
  const log = {
    sessionId: LIVE_OWNER,
    events: source.events().map((data, index) => ({
      seq: index + 1,
      type: data.kind,
      data,
    })),
  };
  const seed = new Store(DEFAULT_CONFIG, { storage: openWorkspaceStorage(ws) });
  const project = seed.createProject(ws, "aidos");
  const result = seed.backfillSessionLogs(project, [log]);
  expect(result.alreadyRan).toBe(false);
  expect(result.tickets).toBe(1);
  const seeded = [...seed.state.tickets.values()];
  expect(seeded).toHaveLength(1);
  const ticketId = seeded[0]!.id;

  /*
   * The LIVE owner: same session id the import stamped, empty log. Its
   * fold cannot contain the renumbered id — the exact production state of
   * a session whose log predates the reimport.
   */
  const owner = harness.makeAgent({ id: LIVE_OWNER });
  (owner.session.header as { cwd?: string }).cwd = ws;
  const stranger = harness.makeAgent({ id: "s467-stranger" });
  (stranger.session.header as { cwd?: string }).cwd = ws;
  return { harness, owner, stranger, ticketId };
}

describe("#467 writes resolve when the origin session is live but its log predates the store", () => {
  it("the board agrees first: the stranger reads the store-only ticket", () => {
    const { harness, stranger, ticketId } = staleOwnerSetup();
    const svc = harness.service;
    const board = svc.getTickets(harness.asAgent(stranger));
    expect(board.some((row) => row.id === ticketId)).toBe(true);
    const read = svc.getTicket(harness.asAgent(stranger), { ticketId });
    expect(read.ticket.id).toBe(ticketId);
  });

  it("attach_evidence from the stranger lands on the store-only ticket, durably in the store", () => {
    const { harness, stranger, ticketId } = staleOwnerSetup();
    const svc = harness.service;
    const attached = svc.agentAttachEvidence(harness.asAgent(stranger), {
      ticketId,
      kind: "builtin:test_run",
      payload: { ok: true },
    });
    expect(attached.ticketId).toBe(ticketId);
    const read = svc.getTicket(harness.asAgent(stranger), { ticketId });
    expect(read.evidence.some((row) => row.kind === "builtin:test_run")).toBe(true);
    /*
     * Durability: the write must have committed to the store's own log —
     * the row's only durable home. A fresh open of the same storage sees
     * the evidence without any session fold involved.
     */
    const reopened = new Store(DEFAULT_CONFIG, { storage: openWorkspaceStorage(readWorkspaceOf(stranger)) });
    expect([...(reopened.state.evidence.get(ticketId as never) ?? [])]).not.toHaveLength(0);
  });

  it("attach_evidence from the LIVE OWNER ITSELF lands too (own fold misses, owner is the caller)", () => {
    const { harness, owner, ticketId } = staleOwnerSetup();
    const svc = harness.service;
    const attached = svc.agentAttachEvidence(harness.asAgent(owner), {
      ticketId,
      kind: "builtin:test_run",
      payload: { ok: true },
    });
    expect(attached.ticketId).toBe(ticketId);
  });

  it("suggest_actions accepts a nomination for the store-only ticket", () => {
    const { harness, stranger, ticketId } = staleOwnerSetup();
    const svc = harness.service;
    const result = svc.suggestActions(harness.asAgent(stranger), {
      suggestions: [{ ticketId, actionId: "verify", reason: "please verify this" }],
    });
    expect(result.accepted).toBe(1);
    expect(result.nominations.some((nomination) => nomination.ticketId === ticketId)).toBe(true);
  });

  it("request_allowlist queues a card for the store-only ticket", () => {
    const { harness, stranger, ticketId } = staleOwnerSetup();
    const svc = harness.service;
    const result = svc.requestAllowlist(harness.asAgent(stranger), {
      ticketId,
      paths: ["src"],
    });
    expect(result.status).toBe("pending");
    expect(result.ticketId).toBe(ticketId);
  });

  it("set_ticket in edit mode edits the store-only ticket", () => {
    const { harness, stranger, ticketId } = staleOwnerSetup();
    const svc = harness.service;
    const row = svc.setTicket(harness.asAgent(stranger), {
      ticketId,
      description: "edited through the store-backed route",
    });
    expect(row.id).toBe(ticketId);
    const read = svc.getTicket(harness.asAgent(stranger), { ticketId });
    expect(read.ticket.description).toBe("edited through the store-backed route");
  });

  it("digest_recent returns the store's changes for the store-only ticket, not zero rows", () => {
    const { harness, stranger, ticketId } = staleOwnerSetup();
    const svc = harness.service;
    svc.agentAttachEvidence(harness.asAgent(stranger), {
      ticketId,
      kind: "builtin:test_run",
      payload: { ok: true },
    });
    const digest = svc.recentChanges(harness.asAgent(stranger), { ticketId });
    expect(digest.changes.length).toBeGreaterThan(0);
    expect(digest.changes.every((change) => change.ticketId === ticketId)).toBe(true);
  });

  it("control: a ticket the live owner's fold DOES hold still routes to the live session", () => {
    const { harness, owner, stranger } = staleOwnerSetup();
    const svc = harness.service;
    const live = svc.setTicket(harness.asAgent(owner), { title: "Live ticket in the owner's log" });
    const attached = svc.agentAttachEvidence(harness.asAgent(stranger), {
      ticketId: live.id,
      kind: "builtin:test_run",
      payload: { ok: true },
    });
    expect(attached.ticketId).toBe(live.id);
    // The evidence is in the OWNER's own fold — the live row kept precedence.
    const ownerRead = svc.getTicket(harness.asAgent(owner), { ticketId: live.id });
    expect(ownerRead.evidence.some((row) => row.kind === "builtin:test_run")).toBe(true);
  });
});

/** The workspace path of a harness agent, as the store resolves it. */
function readWorkspaceOf(agent: ReturnType<Harness["makeAgent"]>): string {
  const cwd = (agent.session.header as { cwd?: string }).cwd;
  if (typeof cwd !== "string" || cwd === "") throw new Error("agent has no cwd");
  return cwd;
}
