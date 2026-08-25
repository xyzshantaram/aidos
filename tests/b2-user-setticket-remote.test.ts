/**
 * Ticket U2c host land: the `userSetTicket` Remote surface.
 *
 * The board creates and edits tickets through the typert Remote endpoint
 * `aidos/userSetTicket`. The B2 wire recipe pins the envelope: POST
 * `/api/aidos/userSetTicket` with body `{"type":"client-request","rpcId":…,
 * "method":"aidos/userSetTicket","payload":{"args":{…}}}`. The agent scope
 * rides as a session id under the `agentId` wire field (dsh-agent declares
 * `TypertLookup<Agent, SessionId>` with `wire: "agentId"`), and the host
 * resolves it to the live agent. No author field crosses the wire.
 *
 * The gateway is `dsh-api-gateway`'s `TypertGatewayService`. This test file
 * mirrors its dispatch flow over the real `AidosService` from the harness:
 * the client-request envelope is the input, `invokeRpc` looks the endpoint
 * up through `remoteMethods` (the same WeakMap the `@Remote` decorator
 * writes), resolves the `agentId` lookup against the harness's agent
 * registry, calls the real method, and folds the result into the
 * `server-response` full form. So a missing `@Remote` marker shows up here
 * as `invocation-unavailable` rather than as a green call.
 *
 * The orchestrator-only guard covers the six board tool names, not the
 * Remote endpoints, so a subagent calling this Remote is not refused by
 * that guard. The board UI is the only caller of the Remote endpoints,
 * and the harness cannot mount a subagent that POSTs an HTTP envelope.
 * So no subagent refusal is pinned here; the in-scope agent path is the
 * one the board exercises.
 */

import { describe, expect, it } from "vitest";

import { SessionId } from "@deepseek-ai/dsh-session";

import { ForeignWorkspace } from "../src/kernel/types";
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
async function dispatchRpc(
  harness: Harness,
  request: ClientRequest,
): Promise<ServerResponse> {
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

/** The TicketRow JSON the response carries. */
type TicketRowJson = {
  id: number;
  title: string;
  description: string;
  criteria: string;
  state: string;
};

describe("the userSetTicket Remote surface", () => {
  it("creates a ticket through the client-request envelope", async () => {
    const harness = createHarness();
    const service = harness.installService();

    const response = await dispatchRpc(
      harness,
      clientRequest("userSetTicket", "rpc-1", {
        agentId: harness.agent.id,
        args: { title: "wire test", criteria: "The first rule." },
      }),
    );

    expect(response.type).toBe("server-response");
    expect(response.rpcId).toBe("rpc-1");
    expect(response.result.ok).toBe(true);
    const row = response.result.value as TicketRowJson;
    expect(row.title).toBe("wire test");
    expect(row.criteria).toBe("The first rule.");
    expect(row.state).toBe("open");
    expect(typeof row.id).toBe("number");

    const view = service.getTickets(harness.asAgent());
    expect(view.map((ticket) => ticket.title)).toEqual(["wire test"]);
  });

  it("edits the named fields of a ticket through the envelope", async () => {
    const harness = createHarness();
    const service = harness.installService();

    const create = await dispatchRpc(
      harness,
      clientRequest("userSetTicket", "rpc-1", {
        agentId: harness.agent.id,
        args: { title: "wire test", criteria: "The first rule." },
      }),
    );
    const created = create.result.value as { id: number };

    const edit = await dispatchRpc(
      harness,
      clientRequest("userSetTicket", "rpc-2", {
        agentId: harness.agent.id,
        args: { ticketId: created.id, description: "edited" },
      }),
    );

    expect(edit.result.ok).toBe(true);
    const row = edit.result.value as TicketRowJson;
    expect(row.description).toBe("edited");
    expect(row.title).toBe("wire test");

    const view = service.getTickets(harness.asAgent());
    expect(view[0].description).toBe("edited");
  });

  it("never changes state through the envelope", async () => {
    const harness = createHarness();

    const create = await dispatchRpc(
      harness,
      clientRequest("userSetTicket", "rpc-1", {
        agentId: harness.agent.id,
        args: { title: "wire test" },
      }),
    );
    const created = create.result.value as { id: number };

    const edit = await dispatchRpc(
      harness,
      clientRequest("userSetTicket", "rpc-2", {
        agentId: harness.agent.id,
        args: { ticketId: created.id, description: "edited" },
      }),
    );

    expect((edit.result.value as TicketRowJson).state).toBe("open");
  });

  it("refuses a cross-workspace write and names the workspace to open", async () => {
    const harness = createHarness(undefined, { cwd: "/ws/b" });
    // Seed the log with a project and ticket from another workspace before
    // the service folds, so the injected record validates cleanly.
    harness.appendAidosEvent(harness.agent, {
      kind: "project/created",
      version: 1,
      projectId: 1,
      absPath: "/ws/a",
      name: "a",
      at: 1000,
    });
    harness.appendAidosEvent(harness.agent, {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      at: 1000,
      ticket: {
        id: 1,
        projectId: 1,
        title: "Foreign",
        description: "",
        body: "",
        criteria: "",
        phase: 1,
        order: 1,
        state: "open",
        allowlist: [],
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
        slug: "foreign",
        workspaceKey: "--ws-a--",
        dependsOn: [],
      },
    });
    harness.installService();

    // A prefixed reference resolves to the foreign ticket's number, but the
    // write against that foreign workspace is refused, naming the workspace.
    const response = await dispatchRpc(
      harness,
      clientRequest("userSetTicket", "rpc-1", {
        agentId: harness.agent.id,
        args: { ticketId: "--ws-a--:foreign", description: "edited" },
      }),
    );
    expect(response.result.ok).toBe(false);
    const error = response.result.error as { message: string };
    expect(error.message).toMatch(/--ws-a--/);
  });

  it("the unknown agent id is refused at the boundary", async () => {
    const harness = createHarness();
    harness.installService();

    let caught: unknown;
    try {
      await dispatchRpc(
        harness,
        clientRequest("userSetTicket", "rpc-1", {
          agentId: "no-such-session",
          args: { title: "wire test" },
        }),
      );
    } catch (error) {
      caught = error;
    }
    expect((caught as Error).message).toMatch(/lookup-not-found/);
  });

  it("create plus edit plus get round-trips through the Remote path", async () => {
    const harness = createHarness();
    const service = harness.installService();

    const create = await dispatchRpc(
      harness,
      clientRequest("userSetTicket", "rpc-1", {
        agentId: harness.agent.id,
        args: { title: "round trip", criteria: "The rule." },
      }),
    );
    const created = create.result.value as { id: number };

    await dispatchRpc(
      harness,
      clientRequest("userSetTicket", "rpc-2", {
        agentId: harness.agent.id,
        args: { ticketId: created.id, description: "edited" },
      }),
    );

    const view = service.getTickets(harness.asAgent());
    expect(view).toHaveLength(1);
    expect(view[0].title).toBe("round trip");
    expect(view[0].description).toBe("edited");
    expect(view[0].criteria).toBe("The rule.");
  });
});

describe("the Remote marker", () => {
  it("the userSetTicket method carries the userSetTicket marker", async () => {
    const harness = createHarness();
    const service = harness.installService();

    const markers = (await import("@deepseek-ai/dsh-typert-protocol")).remoteMethods(service);
    const marker = markers.find((candidate) => candidate.method === "userSetTicket");
    expect(marker?.method).toBe("userSetTicket");
    expect(marker?.invocation).toEqual({ kind: "direct" });
  });

  it("the marker table keeps the four user Remotes", async () => {
    const harness = createHarness();
    const service = harness.installService();

    const methods = (await import("@deepseek-ai/dsh-typert-protocol"))
      .remoteMethods(service)
      .map((candidate) => candidate.method);
    expect(methods).toContain("userSetTicket");
    expect(methods).toContain("userAttachEvidence");
    expect(methods).toContain("userMoveTicket");
    expect(methods).toContain("userAddComment");
  });
});

