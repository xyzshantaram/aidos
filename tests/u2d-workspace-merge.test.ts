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
  it("shows the peer's live tickets with sourceSessionId and foreign marker", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    // Create one ticket in each log.
    service.userSetTicket(harness.asAgent(), { title: "own ticket" });
    service.userSetTicket(harness.asAgent(peer), { title: "peer ticket" });

    const result = await service.workspaceTickets(harness.asAgent());
    const titles = result.tickets.map((row) => row.title).sort();
    expect(titles).toEqual(["own ticket", "peer ticket"]);

    const own = result.tickets.find((row) => row.title === "own ticket");
    const foreign = result.tickets.find((row) => row.title === "peer ticket");
    expect(own?.foreign).toBe(false);
    expect(own?.sourceSessionId).toBe(harness.agent.id);
    expect(foreign?.foreign).toBe(true);
    expect(foreign?.sourceSessionId).toBe(peer.id);
  });

  it("keys foreign evidence and comments under sessionId:ticketId", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "own" });
    const peerTicket = service.userSetTicket(harness.asAgent(peer), { title: "foreign" });
    service.userAddComment(harness.asAgent(peer), { ticketId: peerTicket.id, text: "hello" });

    const result = await service.workspaceTickets(harness.asAgent());
    expect(result.comments[peer.id + ":" + peerTicket.id]?.[0]?.text).toBe("hello");
    // Own ticket 1 and the peer's ticket 1 share the numeric id; only the
    // foreign row is keyed under the peer's session id.
    expect(result.comments[peer.id + ":" + peerTicket.id]).toHaveLength(1);
  });

  it("includes a closed session's tickets via persistence inspect", async () => {
    const harness = createHarness(undefined, { cwd: "/home/sid/repos/aidos" });
    harness.installService();
    const closedId = "session-closed-1";

    // A persistence backend whose log holds one ticket of this workspace.
    harness.ctx.reflect.provide("sessionPersistence", {
      list: async () => [
        { id: SessionId(closedId), cwd: "/home/sid/repos/aidos" },
        { id: SessionId("session-closed-2"), cwd: "/home/sid/repos/other" },
      ],
      inspect: async (id: string) => {
        if (id !== closedId) throw new Error("not found");
        // Build a tiny log: project/created + ticket/change create.
        const peer = harness.makeAgent({ id: closedId });
        (peer.session.header as { cwd?: string }).cwd = "/home/sid/repos/aidos";
        const service = harness.service;
        service.userSetTicket(harness.asAgent(peer), { title: "closed ticket" });
        const events = [...peer.session.events];
        // Drop the synthetic agent again so it stays "closed" for the merge.
        harness.agents.pop();
        harness.agents.splice(harness.agents.indexOf(peer), 1);
        return { meta: { id: closedId, cwd: "/home/sid/repos/aidos" }, events };
      },
    });

    const result = await harness.service.workspaceTickets(harness.asAgent());
    const foreign = result.tickets.filter((row) => row.foreign);
    expect(foreign.map((row) => row.title)).toEqual(["closed ticket"]);
    expect(foreign[0]?.sourceSessionId).toBe(closedId);
  });

  it("routes a user edit on a foreign ticket into the owner's log", async () => {
    const { harness, peer } = twoAgentHarness();
    const service = harness.service;
    service.userSetTicket(harness.asAgent(), { title: "own" });
    const peerTicket = service.userSetTicket(harness.asAgent(peer), { title: "before" });

    const ref = peer.id + ":" + peerTicket.id;
    service.userSetTicket(harness.asAgent(), {
      ticketId: ref,
      title: "after",
    } as never);

    // The peer's log holds the edit; the caller's does not.
    const peerRow = service.getTickets(harness.asAgent(peer)).find((row) => row.id === peerTicket.id);
    expect(peerRow?.title).toBe("after");
    const ownRow = service.getTickets(harness.asAgent()).find((row) => row.title === "after");
    expect(ownRow).toBeUndefined();
  });

  it("refuses a foreign write when the owner session is not live", async () => {
    const { harness } = twoAgentHarness();
    const service = harness.service;
    expect(() =>
      service.userMoveTicket(harness.asAgent(), {
        ticketId: "session-gone:3",
        to: "in_progress",
      } as never),
    ).toThrow(/not open/);
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
