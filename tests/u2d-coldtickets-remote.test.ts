/**
 * Ticket U2d host land: the `coldTickets` Remote surface.
 *
 * The cross-workspace board (the U2d-ui dispatch, built later) reads any
 * session's tickets through the typert Remote endpoint `aidos/coldTickets`.
 * The wire arg carries the target session id, because the board UI reads
 * sessions it does not itself own. The host resolves the id against the
 * LIVE session store, reads the `aidos.tickets` projection snapshot, and
 * returns the rows — optionally narrowed by `states`.
 *
 * Only live sessions are reachable: there is no disk-scan API, so a session
 * that is not open right now gets an empty board (the client treats that as
 * "session not open").
 *
 * The dispatch mirrors the gateway flow over the real `AidosService` from
 * the harness, exactly like `b2-user-setticket-remote.test.ts`: the
 * client-request envelope is the input, the endpoint is resolved through the
 * same `remoteMethods` WeakMap the `@Remote` decorator writes, and the
 * result folds into the `server-response` full form. A missing `@Remote`
 * marker shows up here as a hard throw, not a green call.
 */

import { describe, expect, it } from "vitest";

import { SessionId } from "@deepseek-ai/dsh-session";

import type { Harness } from "./b1-harness";
import { createHarness } from "./b1-harness";

/** The business args slot of one client-request envelope. */
type WireArgs = { agentId: string; args: Record<string, unknown> };

/** One client-request envelope for the aidos Remote surface. */
type ClientRequest = {
  type: "client-request";
  rpcId: string;
  method: string;
  payload: { args: WireArgs };
};

/** One server-response envelope, the gateway's full form. */
type ServerResponse = {
  type: "server-response";
  rpcId: string;
  result: { ok: boolean; value?: unknown; error?: unknown };
};

/** Build one client-request envelope for the aidos Remote surface. */
function clientRequest(method: string, rpcId: string, wireArgs: WireArgs): ClientRequest {
  return {
    type: "client-request",
    rpcId,
    method: `aidos/${method}`,
    payload: { args: wireArgs },
  };
}

/**
 * Dispatch one client-request envelope through the gateway's SRC path:
 * resolve the Remote marker, resolve the agent lookup, call the service,
 * and fold the result into the server-response full form. Business errors
 * become `ok:false` responses, never throws, matching `invokeRpc`.
 */
async function dispatchRpc(harness: Harness, request: ClientRequest): Promise<ServerResponse> {
  const endpoint = request.method;
  const segments = endpoint.split("/");
  if (segments.length !== 2) {
    throw new Error(`invalid Remote endpoint ${JSON.stringify(endpoint)}`);
  }
  const method = segments[1];

  const service = harness.service;
  const marker = (await import("@deepseek-ai/dsh-typert-protocol")).remoteMethods(service).find(
    (candidate) => (candidate.exportName ?? candidate.method) === method,
  );
  if (marker === undefined) {
    throw new Error(`no active Remote method exports this endpoint: ${endpoint}`);
  }
  if (marker.invocation.kind !== "direct") {
    throw new Error(`unexpected invocation mode for ${endpoint}`);
  }

  const args = request.payload.args;
  const agent = harness.ctx.agents.get(SessionId(args.agentId));
  if (agent === undefined) {
    throw new Error("lookup-not-found");
  }

  const implementation = marker.method;
  const methodFn = (service as unknown as Record<string, unknown>)[implementation];
  if (typeof methodFn !== "function") {
    throw new Error(`method-unavailable: ${endpoint}`);
  }

  try {
    const value = (methodFn as (agent: unknown, args: unknown) => unknown).call(
      service,
      agent,
      args.args,
    );
    return { type: "server-response", rpcId: request.rpcId, result: { ok: true, value } };
  } catch (error) {
    return {
      type: "server-response",
      rpcId: request.rpcId,
      result: {
        ok: false,
        error: { code: "internal", message: error instanceof Error ? error.message : String(error) },
      },
    };
  }
}

/** The TicketView JSON the response carries (the fields the board reads). */
type TicketViewJson = {
  id: number;
  title: string;
  state: string;
  workspaceKey: string;
  dependsOn: string[];
};

/** Create one ticket through the user Remote path and return its id. */
async function createTicket(harness: Harness, title: string): Promise<number> {
  const response = await dispatchRpc(
    harness,
    clientRequest("userSetTicket", "rpc-create", {
      agentId: harness.agent.id,
      args: { title },
    }),
  );
  expect(response.result.ok).toBe(true);
  return (response.result.value as { id: number }).id;
}

describe("the coldTickets Remote surface", () => {
  it("returns a live session's tickets through the envelope", async () => {
    const harness = createHarness();
    harness.installService();

    await createTicket(harness, "first");
    await createTicket(harness, "second");

    const response = await dispatchRpc(
      harness,
      clientRequest("coldTickets", "rpc-1", {
        agentId: harness.agent.id,
        args: { sessionId: harness.agent.id },
      }),
    );

    expect(response.type).toBe("server-response");
    expect(response.result.ok).toBe(true);
    const rows = response.result.value as TicketViewJson[];
    expect(rows.map((row) => row.title).sort()).toEqual(["first", "second"]);
    for (const row of rows) {
      expect(row.state).toBe("open");
      expect(typeof row.workspaceKey).toBe("string");
      expect(Array.isArray(row.dependsOn)).toBe(true);
    }
  });

  it("returns an empty board for a session id that is not live", async () => {
    const harness = createHarness();
    harness.installService();

    const response = await dispatchRpc(
      harness,
      clientRequest("coldTickets", "rpc-1", {
        agentId: harness.agent.id,
        args: { sessionId: "session-does-not-exist" },
      }),
    );

    expect(response.result.ok).toBe(true);
    expect(response.result.value).toEqual([]);
  });

  it("the states filter narrows the result", async () => {
    const harness = createHarness();
    harness.installService();

    const openId = await createTicket(harness, "open one");
    await dispatchRpc(
      harness,
      clientRequest("userAttachEvidence", "rpc-ev", {
        agentId: harness.agent.id,
        args: { ticketId: openId, kind: "builtin:user_signoff" },
      }),
    );
    const move = await dispatchRpc(
      harness,
      clientRequest("userMoveTicket", "rpc-move", {
        agentId: harness.agent.id,
        args: { ticketId: openId, to: "in_progress" },
      }),
    );
    expect(move.result.ok).toBe(true);
    await createTicket(harness, "stays open");

    const response = await dispatchRpc(
      harness,
      clientRequest("coldTickets", "rpc-1", {
        agentId: harness.agent.id,
        args: { sessionId: harness.agent.id, states: ["open"] },
      }),
    );

    expect(response.result.ok).toBe(true);
    const rows = response.result.value as TicketViewJson[];
    expect(rows.map((row) => row.title)).toEqual(["stays open"]);
    for (const row of rows) {
      expect(row.state).toBe("open");
    }
  });

  it("an empty states list returns every ticket", async () => {
    const harness = createHarness();
    harness.installService();

    await createTicket(harness, "only");

    const response = await dispatchRpc(
      harness,
      clientRequest("coldTickets", "rpc-1", {
        agentId: harness.agent.id,
        args: { sessionId: harness.agent.id, states: [] },
      }),
    );

    expect(response.result.ok).toBe(true);
    const rows = response.result.value as TicketViewJson[];
    expect(rows.map((row) => row.title)).toEqual(["only"]);
  });
});

describe("the coldTickets Remote marker", () => {
  it("the marker table carries the coldTickets Remote", async () => {
    const harness = createHarness();
    const service = harness.installService();

    const methods = (await import("@deepseek-ai/dsh-typert-protocol"))
      .remoteMethods(service)
      .map((candidate) => candidate.method);
    expect(methods).toContain("coldTickets");
  });
});
