/**
 * Ticket U2c: the one Remote caller for the board.
 *
 * The board writes tickets through the typert Remote endpoints. One browser
 * POST helper serves every method. The wire recipe is pinned by B2: POST
 * `/api/aidos/<method>` with the client-request envelope, and the gateway
 * answers with the server-response envelope. This module is the only place
 * that knows the endpoint path. Components import callAidosRemote from here.
 *
 * The response shape is the gateway's real full form (mirrored by
 * tests/b2-user-setticket-remote.test.ts):
 *
 *   { "type": "server-response", "rpcId": "<id>",
 *     "result": { "ok": true, "value": <json> } }
 *   { "type": "server-response", "rpcId": "<id>",
 *     "result": { "ok": false, "error": { "code": "<code>",
 *       "message": "<text>", "details": { ... } } } }
 *
 * There is no retry, no queue, and no cache in this module. One call, one
 * response.
 */

import type { JsonValue } from "@deepseek-ai/dsh-session";

import { logDebug, logError, logInfo, logWarn } from "./log";

/** One client-request envelope for the aidos Remote surface. */
interface ClientRequestEnvelope {
  type: "client-request";
  rpcId: string;
  method: string;
  payload: {
    args: {
      agentId: string;
      args: Record<string, unknown>;
    };
  };
}

/** The gateway's error object inside a refused response. */
interface GatewayErrorBody {
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

/** The parsed server-response envelope. */
interface ServerResponseEnvelope {
  type?: unknown;
  rpcId?: unknown;
  result?: {
    ok?: unknown;
    value?: unknown;
    error?: GatewayErrorBody;
  };
}

/**
 * One refused or failed Remote call. The message is the text the toast
 * displays verbatim per the U2c contract.
 */
export class AidosRemoteError extends Error {
  readonly code: string;
  /** The refusal text, ready for the toast. */
  readonly message: string;
  /** Extra refusal fields, for example missingKinds or allowedActors. */
  readonly extra: Record<string, unknown>;

  constructor(code: string, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.name = "AidosRemoteError";
    this.code = code;
    this.message = message;
    this.extra = extra;
  }
}

/** A fresh rpc id. */
function makeRpcId(): string {
  return crypto.randomUUID();
}

/** Read one string field from the error body. Empty string when absent. */
function errorText(body: GatewayErrorBody | undefined): string {
  if (body === undefined) return "";
  if (typeof body.message === "string") return body.message;
  return "";
}

/** Read the extra fields from the error body. Empty object when absent. */
function errorExtra(body: GatewayErrorBody | undefined): Record<string, unknown> {
  if (body === undefined) return {};
  if (typeof body.details !== "object" || body.details === null) return {};
  return body.details as Record<string, unknown>;
}

/** One-line summary of one argument value for the trace log. Long strings
 * truncate; arrays and objects collapse to their shape, never their payload.
 */
function summarizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") {
    return value.length > 60 ? value.slice(0, 57) + "..." : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return "[" + value.length + " items]";
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    const shown = keys.slice(0, 4);
    return "{" + shown.join(",") + (keys.length > 4 ? ",..." : "") + "}";
  }
  return String(value);
}

/** One-line args summary for the trace log. Never dumps payload blobs. */
function summarizeArgs(args: Record<string, unknown>): string {
  const parts = Object.keys(args).map(function (key) {
    return key + "=" + summarizeValue(args[key]);
  });
  return parts.length === 0 ? "{}" : parts.join(" ");
}

/**
 * Log an error-level transport failure and return the thrown error. One
 * place so every transport path reaches the error log.
 */
function transportFailure(message: string): AidosRemoteError {
  logError("remote failed: " + message);
  return new AidosRemoteError("transport_error", message);
}

/**
 * Call one aidos Remote method and resolve with the business result.
 * A refusal or a transport problem rejects with AidosRemoteError.
 * Times out after 15s so a hung gateway does not hang the UI.
 */
export async function callAidosRemote(
  method: string,
  args: Record<string, unknown>,
  agentId: string,
): Promise<JsonValue> {
  logDebug("remote " + method + " args: " + summarizeArgs(args));
  const envelope: ClientRequestEnvelope = {
    type: "client-request",
    rpcId: makeRpcId(),
    method: `aidos/${method}`,
    payload: {
      args: {
        agentId,
        args,
      },
    },
  };

  const timeoutMs = 15000;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
  const timeout = controller ? setTimeout(() => controller.abort(new Error("Remote call timed out after " + timeoutMs + "ms")), timeoutMs) : undefined;

  let response: Response;
  try {
    // URL is derived from method so envelope.method and path cannot drift.
    response = await fetch(`/api/${envelope.method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelope),
      signal: controller?.signal,
    });
    if (timeout !== undefined) clearTimeout(timeout);
  } catch (error) {
    if (timeout !== undefined) clearTimeout(timeout);
    throw transportFailure(
      `The request to the aidos Remote failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw transportFailure(`The aidos Remote answered with HTTP ${response.status}.`);
  }

  let body: ServerResponseEnvelope;
  try {
    body = (await response.json()) as ServerResponseEnvelope;
  } catch {
    throw transportFailure("The aidos Remote answered with a body that is not JSON.");
  }

  if (body.type !== "server-response") {
    throw transportFailure("The aidos Remote answered with an unexpected response shape.");
  }

  const result = body.result;
  if (result === undefined) {
    throw transportFailure("The aidos Remote answered without a result.");
  }

  if (result.ok === true) {
    const value = result.value;
    logInfo("remote " + method + " ok");
    if (value === undefined) return null;
    logDebug("remote " + method + " result: " + summarizeValue(value));
    return value as JsonValue;
  }

  if (result.ok === false) {
    const errorBody = result.error;
    const code = typeof errorBody?.code === "string" ? errorBody.code : "refused";
    const message = errorText(errorBody) || `The aidos Remote refused the request (${code}).`;
    logWarn("remote " + method + " refused " + code + ": " + message);
    throw new AidosRemoteError(code, message, errorExtra(errorBody));
  }

  throw transportFailure("The aidos Remote answered with an unrecognized result.");
}
