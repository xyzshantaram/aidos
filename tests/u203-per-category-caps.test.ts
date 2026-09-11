/**
 * #203 (owner ask, 2026-09-11): no more single 20-nomination cap — 10
 * nominations per category (signoff / verify / allowlist families), and the
 * separate pending-allowlist cap goes 5 → 10.
 *
 * Bucket mapping (the queue's own tabs — queueTabOf in
 * src/client/human-queue.ts): signoff counts alone; verify AND mark-done
 * share the verify bucket (both are checks on finished work); the allowlist
 * nomination bucket is empty today (allowlist asks ride pending approvals,
 * capped at requestAllowlist). These tests pin the refusal behavior, the
 * independence of the buckets, and both hard-won semantics PER BUCKET:
 * #93 (re-nominating an existing pair at a full bucket still revises the
 * reason) and #160 (only still-asking nominations count).
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness, type Harness } from "./b1-harness";

function setup(): { harness: Harness; agent: ReturnType<Harness["asAgent"]> } {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return { harness, agent: harness.asAgent() };
}

let seq = 0;
function openTicket(harness: Harness): number {
  return harness.service.setTicket(harness.asAgent(), { title: `Cap ${++seq}` }).id;
}

function nominate(
  harness: Harness,
  agent: ReturnType<Harness["asAgent"]>,
  ticketId: number,
  actionId: string,
): void {
  harness.service.suggestActions(agent, {
    suggestions: [{ ticketId, actionId, reason: `please ${actionId} ${ticketId}` }],
  });
}

describe("#203 a full verify bucket refuses verify but not signoff", () => {
  it("the 11th verify is refused, naming the category and cap", () => {
    const { harness, agent } = setup();
    const ids = Array.from({ length: 11 }, () => openTicket(harness));
    for (const id of ids.slice(0, 10)) nominate(harness, agent, id, "verify");
    expect(() => nominate(harness, agent, ids[10] as number, "verify")).toThrow(
      /too many nominations \(verify cap 10\)/,
    );
  });

  it("signoff still accepts while verify is full", () => {
    const { harness, agent } = setup();
    const ids = Array.from({ length: 11 }, () => openTicket(harness));
    for (const id of ids.slice(0, 10)) nominate(harness, agent, id, "verify");
    expect(() => nominate(harness, agent, ids[10] as number, "signoff")).not.toThrow();
    expect(
      harness.service.actionNominations(agent).filter((n: { actionId: string }) => n.actionId === "signoff"),
    ).toHaveLength(1);
  });

  it("the mirror: a full signoff bucket refuses signoff but not verify", () => {
    const { harness, agent } = setup();
    const ids = Array.from({ length: 11 }, () => openTicket(harness));
    for (const id of ids.slice(0, 10)) nominate(harness, agent, id, "signoff");
    expect(() => nominate(harness, agent, ids[10] as number, "signoff")).toThrow(
      /too many nominations \(signoff cap 10\)/,
    );
    expect(() => nominate(harness, agent, ids[10] as number, "verify")).not.toThrow();
  });
});

describe("#203 mark-done shares the verify bucket (none double-counted)", () => {
  it("9 verify + 1 mark-done fills verify; the next of either is refused", () => {
    const { harness, agent } = setup();
    const ids = Array.from({ length: 12 }, () => openTicket(harness));
    for (const id of ids.slice(0, 9)) nominate(harness, agent, id, "verify");
    nominate(harness, agent, ids[9] as number, "mark-done");
    // Either family member sees the same full bucket...
    expect(() => nominate(harness, agent, ids[10] as number, "mark-done")).toThrow(
      /too many nominations \(verify cap 10\)/,
    );
    expect(() => nominate(harness, agent, ids[10] as number, "verify")).toThrow(
      /too many nominations \(verify cap 10\)/,
    );
    // ...while the signoff bucket is untouched.
    expect(() => nominate(harness, agent, ids[11] as number, "signoff")).not.toThrow();
  });
});

describe("#203 #93 per bucket: a full bucket still takes a reason revision", () => {
  it("re-nominating an existing verify pair at a full verify bucket replaces the reason", () => {
    const { harness, agent } = setup();
    const ids = Array.from({ length: 10 }, () => openTicket(harness));
    for (const id of ids) nominate(harness, agent, id, "verify");
    const revised = harness.service.suggestActions(agent, {
      suggestions: [{ ticketId: ids[0] as number, actionId: "verify", reason: "revised" }],
    });
    expect(revised.accepted).toBe(1);
    expect(harness.service.actionNominations(agent)).toHaveLength(10);
    const row = harness.service
      .actionNominations(agent)
      .find((n: { ticketId: number }) => n.ticketId === (ids[0] as number));
    expect(row).toBeDefined();
    expect(row?.reason).toBe("revised");
  });
});

describe("#203 #160 per bucket: only still-asking nominations count", () => {
  it("acting on a signoff-bucket nomination frees a signoff slot, not a verify one", () => {
    const { harness, agent } = setup();
    const ids = Array.from({ length: 10 }, () => openTicket(harness));
    for (const id of ids) nominate(harness, agent, id, "signoff");
    const overflow = openTicket(harness);
    expect(() => nominate(harness, agent, overflow, "signoff")).toThrow(
      /too many nominations \(signoff cap 10\)/,
    );
    // The human acts on one: the signoff ask is answered, freeing a slot —
    // exactly what the refusal promises.
    harness.seedEvidence(harness.agent, ids[0] as number, "builtin:user_signoff");
    harness.service.agentMoveTicket(harness.asAgent(), {
      ticketId: ids[0] as number,
      to: "in_progress",
    });
    expect(() => nominate(harness, agent, overflow, "signoff")).not.toThrow();
    // The signoff bucket is full again, while verify was never touched.
    const another = openTicket(harness);
    expect(() => nominate(harness, agent, another, "signoff")).toThrow(
      /too many nominations \(signoff cap 10\)/,
    );
    expect(() => nominate(harness, agent, another, "verify")).not.toThrow();
  });
});

describe("#203 pending-allowlist cap is 10", () => {
  function allowlistSetup(): {
    harness: Harness;
    agent: ReturnType<Harness["asAgent"]>;
    ticketId: number;
  } {
    const { harness, agent } = setup();
    const ws = mkdtempSync(join(tmpdir(), "ws203-"));
    mkdirSync(join(ws, "src"), { recursive: true });
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    const ticketId = openTicket(harness);
    return { harness, agent, ticketId };
  }

  it("queues ten pending allowlist requests and refuses the eleventh", () => {
    const { harness, agent, ticketId } = allowlistSetup();
    for (let i = 0; i < 10; i += 1) {
      const proposal = harness.service.requestAllowlist(agent, {
        ticketId,
        paths: ["src/"],
      });
      expect(proposal.status).toBe("pending");
    }
    expect(() =>
      harness.service.requestAllowlist(agent, { ticketId, paths: ["src/"] }),
    ).toThrow(/too many pending allowlist requests \(10\)/);
  });
});
