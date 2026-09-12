/**
 * The workspace board merge and owner routing. The board of one session must
 * show the tickets of every session bound to the same workspace path — live
 * sessions fold from memory, closed ones from a persistence inspect — and a
 * write against a foreign reference must land in the OWNER session's log.
 */
import { describe, expect, it } from "vitest";
import { SessionId } from "@deepseek-ai/dsh-session";

import type { FakeAgent } from "./b1-harness";
import { asContext, createHarness } from "./b1-harness";
import { Store } from "../src/kernel/store";
import { makeConfig } from "./helpers";

/** Two agents of the same workspace; the second carries its own tickets. */
function twoAgentHarness() {
  const harness = createHarness(undefined, { cwd: "/home/sid/repos/aidos" });
  harness.installService();
  const peer = harness.makeAgent({ id: "session-peer" });
  // makeAgent builds a session with the harness default cwd; the workspace
  // key comes from the header cwd, so the peer must share it.
  (peer.session.header as { cwd?: string }).cwd = "/home/sid/repos/aidos";
  return { harness, peer: peer as unknown as FakeAgent };
}

describe("workspaceTickets merge", () => {
  it("shows the peer's live tickets with owner provenance and no foreign marker", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    // Create one ticket in each log.
    service.userSetTicket(harness.asAgent(), { title: "own ticket" });
    service.userSetTicket(harness.asAgent(peer), { title: "peer ticket" });

    const result = await service.workspaceTickets(harness.asAgent());
    const titles = result.tickets.map((row) => row.title).sort();
    expect(titles).toEqual(["own ticket", "peer ticket"]);

    // #45: `foreign` is false for every row the merge produces; the merge
    // distinguishes readers by provenance, not by a composite address.
    const own = result.tickets.find((row) => row.title === "own ticket");
    const foreign = result.tickets.find((row) => row.title === "peer ticket");
    expect(own?.foreign).toBe(false);
    expect(own?.sourceSessionId).toBe(harness.agent.id);
    expect(foreign?.foreign).toBe(false);
    expect(foreign?.sourceSessionId).toBe(peer.id);
  });

  it("keys evidence and comments under the plain ticket id", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "own" });
    // The peer's SECOND ticket is the unambiguous one: the peer's first
    // shares the caller's numeric id 1, the legacy live collision the
    // phase accepts and documents rather than addresses.
    service.userSetTicket(harness.asAgent(peer), { title: "first" });
    const peerTicket = service.userSetTicket(harness.asAgent(peer), { title: "foreign" });
    service.userAddComment(harness.asAgent(peer), { ticketId: peerTicket.id, text: "hello" });

    const result = await service.workspaceTickets(harness.asAgent());
    expect(result.comments[String(peerTicket.id)]?.[0]?.text).toBe("hello");
    // #45: no composite key exists anywhere in the maps.
    for (const key of [...Object.keys(result.evidence), ...Object.keys(result.comments)]) {
      expect(key).not.toContain(":");
    }
  });

  it("includes a closed session's tickets via persistence inspect", async () => {
    const harness = createHarness(undefined, { cwd: "/home/sid/repos/aidos" });
    harness.installService();
    const closedId = "session-closed-1";

    // A persistence backend whose log holds one ticket of this workspace.
    // The log is built WITHOUT the service: a kernel store mints the
    // events and they are raw-appended to the peer session. Creating
    // through the service would mirror the ticket into the shared store
    // (#218), so the log would never be store-unknown and the backfill
    // would import a suffixed second copy of the same ticket.
    const seed = new Store(makeConfig());
    const seedProject = seed.createProject("/home/sid/repos/aidos", "aidos");
    seed.createTicket(seedProject, "closed ticket", "");
    const seedPeer = harness.makeAgent({ id: closedId });
    (seedPeer.session.header as { cwd?: string }).cwd = "/home/sid/repos/aidos";
    for (const event of seed.events()) {
      harness.appendAidosEvent(seedPeer, event);
    }
    const seedEvents = [...seedPeer.session.events];
    harness.agents.splice(harness.agents.indexOf(seedPeer), 1);
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [
        { id: SessionId(closedId), cwd: "/home/sid/repos/aidos" },
        { id: SessionId("session-closed-2"), cwd: "/home/sid/repos/other" },
      ],
      inspect: async (id: string) => {
        if (id !== closedId) throw new Error("not found");
        return { meta: { id: closedId, cwd: "/home/sid/repos/aidos" }, events: seedEvents };
      },
    });

    const result = await harness.service.workspaceTickets(harness.asAgent());
    // #45: closed rows trace to their owning log by provenance, not a flag.
    const closed = result.tickets.filter((row) => row.sourceSessionId === closedId);
    expect(closed.map((row) => row.title)).toEqual(["closed ticket"]);
    for (const row of result.tickets) expect(row.foreign).toBe(false);
  });

  it("routes a user edit on a foreign ticket into the owner's log", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "own" });
    // The peer's second ticket is the addressable foreign row: its first
    // shares the caller's numeric id 1, and own-first resolution (#93)
    // keeps id 1 local. #45 addresses by plain id, unambiguous here.
    service.userSetTicket(harness.asAgent(peer), { title: "before one" });
    const peerTicket = service.userSetTicket(harness.asAgent(peer), { title: "before" });

    const ref = String(peerTicket.id);
    service.userSetTicket(harness.asAgent(), {
      ticketId: ref,
      title: "after",
    } as never);

    /*
     * #207: the agent BOARD reads resolve against the workspace now, so a
     * session's board no longer distinguishes whose log holds a row — the
     * routing assertion lives in the LOGS, where ownership actually is.
     * The edit landed in the peer's log; the caller's log does not hold it.
     */
    const peerEvents = harness.aidosEvents(peer).map((event) => {
      const data = event as unknown as { kind: string; ticket?: { id: number; title: string } };
      return data.kind === "ticket/change" ? data.ticket : undefined;
    });
    expect(peerEvents.some((t) => t?.id === peerTicket.id && t.title === "after")).toBe(true);
    const ownEvents = harness.aidosEvents(harness.agent).map((event) => {
      const data = event as unknown as { kind: string; ticket?: { id: number; title: string } };
      return data.kind === "ticket/change" ? data.ticket : undefined;
    });
    expect(ownEvents.some((t) => t?.title === "after")).toBe(false);
  });

  it("refuses a write for an id no workspace source holds", async () => {
    // #43 changed the closed-origin contract: the write now routes to the
    // workspace store (a store-backed orphan session) instead of refusing
    // outright. #45 deleted the composite address with it, so the stranded
    // ref is a plain id now. The refusal survives for an id the store
    // does not hold either — it just names the missing ticket.
    const { harness } = twoAgentHarness();
    const service = harness.service;
    expect(() =>
      service.userMoveTicket(harness.asAgent(), {
        ticketId: "3",
        to: "in_progress",
      } as never),
    ).toThrow(/no such ticket/);
  });
});

// ---- the gateway envelope: callAidosRemote always sends { agentId, args }.

// The gateway's SRC path derives parameters from the method's parameter
// NAMES (api-gateway methodParameterNames + srcDescriptor): the first param
// `agent` is the lookup (wire agentId), later params become JSON wire
// fields by name. assertExactArguments then rejects unknown keys. These
// checks pin the wire contract the client's callAidosRemote depends on:
// the envelope's args object carries the second parameter under the name
// `args`, and an empty business-args call must pass validation.
describe("workspaceTickets wire envelope", () => {
  it("declares agent (lookup) plus an optional args JSON parameter", async () => {
    const { harness } = twoAgentHarness();
    const service = harness.service;
    const typert = await import("@deepseek-ai/dsh-typert-protocol");
    const marker = typert.remoteMethods(service).find(
      (candidate) => (candidate.exportName ?? candidate.method) === "workspaceTickets",
    );
    expect(marker, "workspaceTickets must carry a Remote marker").toBeDefined();
    // The signature check the gateway performs: parameter names must be
    // unique identifiers; our second parameter must be exactly "args" so
    // the shared envelope's nested args key validates.
    const source = service.workspaceTickets.toString();
    const open = source.indexOf("(");
    const close = source.indexOf(")", open + 1);
    const params = source.slice(open + 1, close).split(",").map((part) => part.trim()).filter(Boolean);
    expect(params[0]).toBe("agent");
    expect(params[1]).toBe("args");
  });

  it("accepts a direct call with undefined business args", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "own" });
    service.userSetTicket(harness.asAgent(peer), { title: "peer" });
    const result = await service.workspaceTickets(harness.asAgent());
    expect(result.tickets.map((row) => row.title).sort()).toEqual(["own", "peer"]);
  });
});
