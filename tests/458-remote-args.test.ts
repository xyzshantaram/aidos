/**
 * Ticket #458: two Remotes declared no `args` parameter, so every browser
 * call was refused at the gateway.
 *
 * Live GUI symptom, 2026-09-22: opening the Tags modal showed
 *
 *   typert gateway: aidos/workspaceTags: args fields do not match the
 *   descriptor: unexpected "args"
 *
 * Cause: `callAidosRemote` (src/client/remote.ts) ALWAYS sends
 * `payload.args = { agentId, args }`. The gateway's SRC path derives each
 * Remote's descriptor from the method's PARAMETER NAMES
 * (`methodParameterNames` + `srcDescriptor` + `assertExactArguments` in the
 * dsh-api-gateway package): the first parameter `agent` resolves to the
 * `agentId` lookup wire, and every later parameter becomes a JSON wire
 * field BY NAME. A method declared as `(agent: Agent)` alone therefore
 * declares a descriptor with no `args` field, and the envelope's nested
 * `args` key is refused with `unexpected "args"` before the method runs.
 *
 * Exactly two offenders: `workspaceTags` (the modal renders the refusal
 * instead of the tag list) and `workspaceRoot` (the evidence-attach call
 * site ended in `.catch(() => undefined)`, so every paste upload silently
 * omitted its `x-workspace` header).
 *
 * Why no test caught it: the suite calls the service method directly
 * (`await svc.workspaceTags(agent)`), which never constructs an envelope,
 * so the descriptor is never exercised. The tests below drive both
 * remotes through the gateway's descriptor/envelope validation instead,
 * and a guard enumerates every @Remote so the trap cannot be
 * re-introduced.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createHarness } from "./b1-harness";

// ---- the gateway's SRC-path validation, mirrored verbatim ------------------
//
// dsh-api-gateway keeps `methodParameterNames` and `assertExactArguments`
// module-private (only TypertGatewayService is exported, and the package is
// not a direct dependency), so this file carries exact copies. The reflection
// below runs against the LIVE service method -- removing the `args`
// parameter changes what the reflection returns, which is what makes the
// envelope checks go red. Keep the copies in sync with the gateway's
// lib/index.js if the refusal text ever changes.

/** Verbatim copy of the gateway's `methodParameterNames`. */
function gatewayParameterNames(service: object, method: string, endpoint: string): string[] {
  let prototype: object | null = Object.getPrototypeOf(service);
  let implementation: unknown;
  while (prototype !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
    if (descriptor !== undefined) {
      if ("value" in descriptor && typeof descriptor.value === "function") {
        implementation = descriptor.value;
      }
      break;
    }
    prototype = Object.getPrototypeOf(prototype);
  }
  if (implementation === undefined) {
    throw new Error(`method-unavailable: Remote marker has no prototype method ${JSON.stringify(method)}`);
  }
  const source = Function.prototype.toString.call(implementation);
  const open = source.indexOf("(");
  const close = source.indexOf(")", open + 1);
  if (open < 0 || close < 0) {
    throw new Error(`signature-invalid: SRC method ${JSON.stringify(method)} must use unique identifier parameters`);
  }
  const body = source.slice(open + 1, close).trim();
  if (body.length === 0) return [];
  const parts = body.split(",").map((part) => part.trim());
  const names = new Set<string>();
  for (const part of parts) {
    if (!/^[$A-Z_a-z][$\w]*$/u.test(part) || names.has(part)) {
      throw new Error(
        `signature-invalid: SRC method ${JSON.stringify(method)} must use unique identifier parameters without destructuring, defaults, or rest`,
      );
    }
    names.add(part);
  }
  return [...names];
}

/**
 * Verbatim copy of the gateway's `assertExactArguments` shape: the expected
 * wire fields are the descriptor's parameter wires, and any extra or
 * missing field refuses with the exact live-GUI text.
 */
function assertEnvelopeArgs(args: Record<string, unknown>, wireFields: string[], endpoint: string): void {
  const expected = new Set(wireFields);
  const extra = Object.keys(args).filter((key) => !expected.has(key));
  // SRC-JSON parameters accept a missing field (the gateway's allowance
  // set); only the lookup wire is required.
  const missing = [...expected].filter((key) => !(key in args) && key === "agentId");
  if (extra.length === 0 && missing.length === 0) return;
  const clauses: string[] = [];
  if (missing.length > 0) clauses.push(`missing ${missing.map((key) => JSON.stringify(key)).join(", ")}`);
  if (extra.length > 0) clauses.push(`unexpected ${extra.map((key) => JSON.stringify(String(key))).join(", ")}`);
  throw new Error(`typert gateway: ${endpoint}: args fields do not match the descriptor: ${clauses.join("; ")}`);
}

/**
 * Mirror of the gateway's `srcDescriptor` wire mapping for the aidos
 * surface: the `agent` parameter is the session lookup (dsh-agent declares
 * `TypertLookup<Agent, SessionId>` with `parameter: "agent", wire:
 * "agentId"`), and every later parameter is a JSON wire field by name.
 */
function gatewayWireFields(service: object, method: string, endpoint: string): string[] {
  const names = gatewayParameterNames(service, method, endpoint);
  const signalIndex = names.indexOf("signal");
  const business = signalIndex >= 0 ? names.slice(0, -1) : names;
  return business.map((name) => (name === "agent" ? "agentId" : name));
}

/** The envelope `callAidosRemote` always sends (src/client/remote.ts). */
function browserEnvelope(agentId: string, businessArgs: Record<string, unknown>): Record<string, unknown> {
  return { agentId, args: businessArgs };
}

// ---- the two remotes through the descriptor/envelope path ------------------

describe("#458 the browser envelope validates against the gateway descriptor", () => {
  it.each(["workspaceTags", "workspaceRoot"])(
    "%s accepts the envelope the browser always sends",
    async (method) => {
      const harness = createHarness();
      const service = harness.installService();
      const endpoint = `aidos/${method}`;

      // The gateway has a route: the @Remote marker is the route.
      const { remoteMethods } = await import("@deepseek-ai/dsh-typert-protocol");
      const marker = remoteMethods(service).find(
        (candidate) => (candidate.exportName ?? candidate.method) === method,
      );
      if (marker === undefined) throw new Error(`${endpoint} must carry a Remote marker`);

      // The descriptor derived from the live method must carry the `args`
      // wire field, or the browser's nested args key is refused with
      // `unexpected "args"` -- the exact live-GUI failure.
      const wires = gatewayWireFields(service, marker.method, endpoint);
      expect(wires).toContain("agentId");
      expect(wires).toContain("args");

      // The full envelope validates: no refusal at the descriptor layer.
      expect(() =>
        assertEnvelopeArgs(browserEnvelope(harness.agent.id, {}), wires, endpoint),
      ).not.toThrow();
    },
  );

  it("workspaceTags returns the tag list for the envelope's empty args", async () => {
    const harness = createHarness();
    const service = harness.installService();
    const agent = harness.asAgent();
    service.setTicket(agent, { title: "A" });
    service.setTicket(agent, { title: "B" });
    const rows = service.getTickets(agent);
    const a = rows.find((row) => row.title === "A");
    const b = rows.find((row) => row.title === "B");
    if (a === undefined || b === undefined) throw new Error("test setup: tickets not found");
    service.agentAttachTags(agent, { ticketId: a.id, tags: ["ui", "perf"] });
    service.agentAttachTags(agent, { ticketId: b.id, tags: ["ui"] });

    // Invoked with the envelope's business args, positionally, as the
    // gateway's resolveParameter would supply them.
    const call = service.workspaceTags as unknown as (agent: unknown, args: unknown) => unknown;
    const listed = (await call.call(service, agent, {})) as {
      tags: Array<{ tag: string; count: number; tickets: unknown[] }>;
    };
    expect(listed.tags.map((row) => [row.tag, row.count])).toEqual([
      ["ui", 2],
      ["perf", 1],
    ]);
  });

  it("workspaceRoot returns the session workspace for the envelope's empty args", async () => {
    const harness = createHarness();
    const service = harness.installService();
    const agent = harness.asAgent();

    const call = service.workspaceRoot as unknown as (agent: unknown, args: unknown) => unknown;
    const root = (await call.call(service, agent, {})) as { workspace: string };
    // The paste upload rides this value as its x-workspace header: it must
    // be a real directory, never null.
    expect(typeof root.workspace).toBe("string");
    expect(root.workspace.length).toBeGreaterThan(0);
  });
});

// ---- the guard: every @Remote must declare an args parameter ---------------

/** Split a parameter list on top-level commas only (types may nest (){}[]<>). */
function splitTopLevel(params: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of params) {
    if (char === "(" || char === "{" || char === "[" || char === "<") depth += 1;
    if (char === ")" || char === "}" || char === "]" || char === ">") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim() !== "") parts.push(current);
  return parts;
}

/** Every @Remote export name with the parameter names of its method. */
function remoteParameters(source: string): Array<{ name: string; line: number; params: string[] }> {
  const lines = source.split("\n");
  const found: Array<{ name: string; line: number; params: string[] }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const decorator = lines[i].match(/@Remote\("([^"]+)"\)/);
    if (decorator === null) continue;
    // The signature follows the decorator, possibly after comments and
    // blank lines, and possibly across lines: accumulate until the outer
    // parens balance.
    let j = i + 1;
    while (j < lines.length && (/^\s*(\/\/|\/\*|\*)/.test(lines[j]) || lines[j].trim() === "")) {
      j += 1;
    }
    let depth = 0;
    let started = false;
    let text = "";
    for (let k = j; k < Math.min(j + 25, lines.length); k += 1) {
      const line = lines[k];
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
      for (const char of line) {
        if (char === "(") {
          depth += 1;
          started = true;
        }
        if (char === ")") depth -= 1;
      }
      text += line + "\n";
      if (started && depth === 0) break;
    }
    const open = text.indexOf("(");
    if (open < 0) {
      found.push({ name: decorator[1], line: j + 1, params: [] });
      continue;
    }
    // Match the outer close paren from the first open one.
    let level = 0;
    let close = -1;
    for (let c = open; c < text.length; c += 1) {
      if (text[c] === "(") level += 1;
      if (text[c] === ")") level -= 1;
      if (level === 0) {
        close = c;
        break;
      }
    }
    const raw = close < 0 ? "" : text.slice(open + 1, close);
    const params = splitTopLevel(raw)
      .map((part) => part.trim())
      .filter((part) => part !== "")
      .map((part) => {
        const name = part.match(/^([A-Za-z_$][\w$]*)/);
        return name === null ? part : name[1];
      });
    found.push({ name: decorator[1], line: j + 1, params });
  }
  return found;
}

describe("#458 guard: every @Remote declares an args parameter", () => {
  it("no @Remote method takes only the agent lookup", () => {
    const source = readFileSync(join(__dirname, "..", "src", "host", "aidos-core.ts"), "utf8");
    const offenders = remoteParameters(source)
      .filter(({ params }) => !params.includes("args"))
      .map(({ name, line, params }) => `${name} (line ${line}): (${params.join(", ")})`);
    expect(offenders).toEqual([]);
  });

  it("the two remotes that hit this declare optional empty args", () => {
    const source = readFileSync(join(__dirname, "..", "src", "host", "aidos-core.ts"), "utf8");
    expect(source).toContain("workspaceTags(agent: Agent, args?: Record<string, never>)");
    expect(source).toContain("workspaceRoot(agent: Agent, args?: Record<string, never>)");
  });
});

// ---- the paste-upload failure must surface, never degrade to null ----------

describe("#458 the paste upload does not swallow a workspaceRoot refusal", () => {
  it("evidence-attach.tsx lets a refused workspaceRoot call reject", () => {
    const source = readFileSync(join(__dirname, "..", "src", "client", "evidence-attach.tsx"), "utf8");
    const lines = source.split("\n");
    const callSites = lines.filter((line) => line.includes('callAidosRemote("workspaceRoot"'));
    expect(callSites.length).toBeGreaterThan(0);
    for (const site of callSites) {
      // handleFile surfaces an uploadImagePaste rejection as pasteError in
      // the modal; a `.catch(() => undefined)` here would degrade a
      // refusal to a null workspaceDir and silently drop the header.
      expect(site).not.toMatch(/\.catch\(\(\) => undefined\)/);
    }
  });
});
