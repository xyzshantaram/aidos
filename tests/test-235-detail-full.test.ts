/**
 * #235: get_tickets detail:full was refused for EVERY row.
 *
 * The full branch returned the raw merge row (`BoardTicketView`) while its
 * declared output schema (`TICKET_VIEW_SCHEMA`) is closed and enumerates
 * only the `TicketView` fields — so each merge-only field (`sourceSessionId`,
 * `foreign`, `supersededCopies`, and since #233 `createdAt`) failed the
 * branch, the oneOf matched zero branches, and the registry refused the
 * whole call. The fix narrows the full branch to an explicit object
 * (`presentFullTicket`), the way the summary branch already does.
 *
 * These tests run the REAL registered tool definitions and gate their raw
 * return values through the SAME validator the live registry gates them
 * with (`validateJsonSchemaValue` over the definition's OWN output.schema —
 * the declaration itself, never a re-listed copy), so a test that passes
 * here passes live, and one that fails here is refused live.
 */

import { describe, expect, it } from "vitest";
import { validateJsonSchemaValue } from "@deepseek-ai/dsh-tools";

import { apply } from "../src/tools/aidos-tools";
import {
  asContext,
  createHarness,
  successJson,
  type Harness,
} from "./b1-harness";
import type { AidosService } from "../src/host/aidos-core";
import type { TicketView } from "../src/kernel/projections";

/**
 * The live registry's output gate (dsh-tools `createSuccessResult`): detach
 * to lossless JSON, then validate against the tool's declared output schema
 * with the root labelled "value". Returns the violation strings; empty
 * means the live call succeeds.
 */
function liveOutputViolations(
  harness: Harness,
  toolName: string,
  value: unknown,
): string[] {
  const definition = harness.tools.get(toolName);
  expect(definition, `${toolName} must be registered`).toBeDefined();
  const schema = (
    definition as unknown as { output: { schema: Parameters<typeof validateJsonSchemaValue>[0] } }
  ).output.schema;
  // The registry snapshots the body value to detached lossless JSON before
  // validating; the round-trip below is that detach (our values are JSON).
  const detached = JSON.parse(JSON.stringify(value)) as unknown;
  return validateJsonSchemaValue(schema, detached, "value");
}

/**
 * Compiler-checked probe of the full-row contract. If `TicketView` gains a
 * REQUIRED field, this literal fails to compile — the author must update
 * the tool surface deliberately rather than drifting past it. The runtime
 * key-set comparisons below tie the tool output to this probe, so neither
 * side can add or drop a key without the other noticing.
 */
const VIEW_PROBE: TicketView = {
  id: 1,
  projectId: 1,
  title: "probe",
  description: "probe description",
  body: "probe body",
  criteria: "probe criteria",
  phase: 1,
  order: 1,
  state: "open",
  dependsOn: [],
  allowlist: [],
  tags: [],
  confidenceScore: 0,
  gateFraction: null,
  gatePresent: null,
  gateTotal: null,
  updatedAt: 1,
  workspaceKey: "probe",
  slug: "probe",
};
const VIEW_KEYS = Object.keys(VIEW_PROBE).sort();

/** The merge-only fields that must never reach an agent-facing full row. */
const MERGE_ONLY_KEYS = ["sourceSessionId", "foreign", "supersededCopies", "createdAt"];

/** A harness with the real service, the real tools, and two tagged tickets. */
async function setupBoard(): Promise<{ harness: Harness; firstId: number; secondId: number }> {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const first = successJson(await harness.runTool("set_ticket", { title: "First ticket" }));
  const second = successJson(await harness.runTool("set_ticket", { title: "Second ticket" }));
  const firstId = first.ticketId as number;
  const secondId = second.ticketId as number;
  const tagged = successJson(
    await harness.runTool("attach_tags", { ticketId: firstId, tags: ["urgent"] }),
  );
  expect(tagged.ok).toBe(true);
  return { harness, firstId, secondId };
}

describe("get_tickets detail:full survives the live output gate", () => {
  it("a full board read validates, carries every view field, and leaks no merge provenance", async () => {
    const { harness } = await setupBoard();

    // The service-level rows really do carry the merge-only shape the bug
    // report names: without that, this test would prove nothing. (Measured:
    // 22 keys — the 19 view fields plus sourceSessionId, foreign, and
    // supersededCopies from the live+store dedupe.)
    const serviceRows = harness.service.getTickets(harness.asAgent());
    expect(serviceRows.length).toBe(2);
    for (const row of serviceRows) {
      const keys = Object.keys(row);
      expect(keys).toContain("sourceSessionId");
      expect(keys).toContain("foreign");
      expect(keys).toContain("tags");
      expect(keys).toContain("supersededCopies");
    }

    const outcome = await harness.runTool("get_tickets", { detail: "full", limit: 2 });
    const payload = successJson(outcome);
    expect(payload.returned).toBe(2);

    // THE gate: the exact validator the live registry runs, over the
    // tool's own declared schema. Pre-fix this is the oneOf refusal for
    // every row ("must match exactly one oneOf branch (matched 0)").
    const violations = liveOutputViolations(harness, "get_tickets", outcome.value);
    expect(violations).toEqual([]);

    const tickets = payload.tickets as Record<string, unknown>[];
    expect(tickets.length).toBe(2);
    for (const ticket of tickets) {
      // The full row is the complete TicketView contract ...
      expect(Object.keys(ticket).sort()).toEqual(VIEW_KEYS);
      // ... and the merge internals stay host-side.
      for (const leaked of MERGE_ONLY_KEYS) {
        expect(ticket, `full row must not leak ${leaked}`).not.toHaveProperty(leaked);
      }
    }
    // Tags (#180) flow end to end on the full row.
    const tagged = tickets.find((ticket) => (ticket.tags as string[]).includes("urgent"));
    expect(tagged, "one full row must carry the attached tag").toBeDefined();
  });

  it("the summary default still validates (the fix must not move the common path)", async () => {
    const { harness } = await setupBoard();
    const outcome = await harness.runTool("get_tickets", {});
    successJson(outcome);
    expect(liveOutputViolations(harness, "get_tickets", outcome.value)).toEqual([]);
  });

  it("a full board read at a limit covering the whole board validates", async () => {
    const { harness } = await setupBoard();
    const outcome = await harness.runTool("get_tickets", { detail: "full", limit: 400 });
    const payload = successJson(outcome);
    expect(payload.returned).toBe(2);
    expect(payload.hasMore).toBe(false);
    expect(liveOutputViolations(harness, "get_tickets", outcome.value)).toEqual([]);
  });
});

describe("get_ticket shares the closed schema and stays safe", () => {
  it("a single-ticket read validates and returns the same full-row contract", async () => {
    const { harness, firstId } = await setupBoard();
    const outcome = await harness.runTool("get_ticket", { ticketId: firstId });
    const payload = successJson(outcome);
    expect(liveOutputViolations(harness, "get_ticket", outcome.value)).toEqual([]);

    // get_ticket reads the kernel projection (never the merge), so its
    // ticket already matched the closed schema before this fix — by
    // construction, not by accident. Pin that, and pin that both tools now
    // speak the same row shape.
    const ticket = payload.ticket as Record<string, unknown>;
    expect(Object.keys(ticket).sort()).toEqual(VIEW_KEYS);
    for (const leaked of MERGE_ONLY_KEYS) {
      expect(ticket, `get_ticket must not leak ${leaked}`).not.toHaveProperty(leaked);
    }
    expect(ticket.tags).toContain("urgent");
  });
});

describe("drift guard: fields the merge gains tomorrow", () => {
  it("a merge row carrying createdAt (#233) and an unknown future field still validates and leaks neither", async () => {
    const { harness } = await setupBoard();

    // This tree predates #233's `createdAt` on BoardTicketView, so simulate
    // the 9a8cc92-and-later merge shape by spreading a REAL merge row and
    // adding the fields a future merge may carry. The tool path stays real:
    // the registered definition, its real execute body, its own schema.
    const realRow = harness.service.getTickets(harness.asAgent())[0] as unknown as Record<
      string,
      unknown
    >;
    expect(Object.keys(realRow)).toContain("sourceSessionId");
    const futureRow = {
      ...realRow,
      createdAt: 1000,
      futurePlumbedField: "a field some later ticket adds to the merge",
    };
    const stubService = {
      getTickets: () => [futureRow],
    };
    (harness.ctx as unknown as Record<string, unknown>).aidos =
      stubService as unknown as AidosService;

    const outcome = await harness.runTool("get_tickets", { detail: "full", limit: 2 });
    const payload = successJson(outcome);
    expect(payload.returned).toBe(1);
    expect(liveOutputViolations(harness, "get_tickets", outcome.value)).toEqual([]);

    const tickets = payload.tickets as Record<string, unknown>[];
    expect(Object.keys(tickets[0]).sort()).toEqual(VIEW_KEYS);
    expect(tickets[0]).not.toHaveProperty("createdAt");
    expect(tickets[0]).not.toHaveProperty("futurePlumbedField");
    expect(tickets[0]).not.toHaveProperty("sourceSessionId");
    expect(tickets[0]).not.toHaveProperty("foreign");
  });
});
