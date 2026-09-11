/**
 * #126: evidence stamping — harness-supplied model, chain, and session id on
 * every evidence row.
 *
 * The contract under test:
 *
 *  - every NEW row carries a host-written `stamp` sourced from harness
 *    session state, never from the agent's payload;
 *  - where chainProvenance exists the stamp records chain + rungsUsed, so a
 *    run that started at the chain head and finished several rungs down is
 *    recorded truthfully; where it is absent the stamp degrades to the
 *    available facts and never throws;
 *  - a payload-crafted stamp (or model/chain/sessionId key) is data, never
 *    provenance: the forged key does not survive as the stamp;
 *  - user-attached rows stamp the actor as the user;
 *  - the stamp is host-side only: no tool result exposes it to a model.
 */

import { describe, expect, it } from "vitest";

import { createHarness, asContext, successJson, type Harness } from "./b1-harness";
import type { EvidenceAttachedEvent } from "../src/kernel/events";
import type { EvidenceRow } from "../src/kernel/types";
import { apply as applyTools } from "../src/tools/aidos-tools";

/** The chainProvenance record shape the harness would hand back. */
const record = (over: Record<string, unknown> = {}) => ({
  type: "partner_review",
  chain: "frontier",
  rungsDeclared: [{ provider: "zai", model: "glm-5.3" }],
  rungsUsed: [{ provider: "zai", model: "glm-5.3" }],
  contained: true,
  ...over,
});

/** Install the service and the tools over one harness. */
function setup(harness: Harness, provenance?: unknown) {
  if (provenance !== undefined) {
    harness.ctx.reflect.provide("chainProvenance", provenance);
  }
  harness.installService();
  applyTools(asContext(harness.ctx), {});
}

/** The evidence rows in the harness session log, oldest first. */
function rows(harness: Harness): EvidenceRow[] {
  return harness
    .aidosEvents(harness.agent)
    .filter((event): event is EvidenceAttachedEvent => event.kind === "evidence/attached")
    .map((event) => event.row);
}

describe("#126 every new evidence row carries a host-written stamp", () => {
  it("an agent-attached row stamps the session id and the actor, from harness state", () => {
    const harness = createHarness();
    setup(harness); // no chainProvenance service — the degrade path
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    harness.service.agentAttachEvidence(harness.asAgent(), {
      ticketId: ticket,
      kind: "builtin:automated_check",
      payload: { note: "ran" },
    });
    const row = rows(harness)[0];
    expect(row.stamp).toBeDefined();
    expect(row.stamp?.sessionId).toBe(harness.agent.id);
    expect(row.stamp?.actor).toBe("agent");
  });

  it("with chainProvenance, the stamp records chain + rungsUsed + models truthfully", () => {
    const harness = createHarness();
    const calls: string[] = [];
    setup(harness, {
      forSession(sessionId: string) {
        calls.push(sessionId);
        // A FAILED-OVER run: started at the head, finished two rungs down.
        return record({
          rungsUsed: [
            { provider: "zai", model: "glm-5.3" },
            { provider: "google", model: "gemini-3-flash" },
          ],
          contained: false,
        });
      },
    });
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    harness.service.agentAttachEvidence(harness.asAgent(), {
      ticketId: ticket,
      kind: "builtin:review_pass",
      payload: { verdict: "pass" },
    });
    const row = rows(harness)[0];
    expect(calls).toEqual([harness.agent.id]);
    expect(row.stamp?.chain).toBe("frontier");
    expect(row.stamp?.rungsUsed).toEqual([
      { provider: "zai", model: "glm-5.3" },
      { provider: "google", model: "gemini-3-flash" },
    ]);
    expect(row.stamp?.models).toEqual(["glm-5.3", "gemini-3-flash"]);
  });

  it("an absent service, a throwing reader, or a malformed record degrade without throwing", () => {
    const noService = createHarness();
    setup(noService);
    const throwing = createHarness();
    setup(throwing, {
      forSession() {
        throw new Error("provenance store is down");
      },
    });
    const malformed = createHarness();
    setup(malformed, { forSession: () => "not-a-record" });
    for (const harness of [noService, throwing, malformed]) {
      const ticket = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
      expect(() =>
        harness.service.agentAttachEvidence(harness.asAgent(), {
          ticketId: ticket,
          kind: "builtin:test_run",
          payload: {},
        }),
      ).not.toThrow();
      const row = rows(harness)[0];
      expect(row.stamp?.sessionId).toBe(harness.agent.id);
      expect(row.stamp?.chain).toBeUndefined();
    }
  });

  it("a payload-crafted stamp does not survive: the harness value wins", () => {
    const harness = createHarness();
    setup(harness, { forSession: () => record() });
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    harness.service.agentAttachEvidence(harness.asAgent(), {
      ticketId: ticket,
      kind: "builtin:review_pass",
      payload: {
        stamp: { sessionId: "attacker-session", chain: "flash", model: "cheap-9b" },
        model: "cheap-9b",
        chain: "flash",
        sessionId: "attacker-session",
      },
    });
    const row = rows(harness)[0];
    // Provenance cannot be forged through the payload.
    expect(row.stamp?.sessionId).toBe(harness.agent.id);
    expect(row.stamp?.chain).toBe("frontier");
    // The forged key is dropped outright; lookalike keys stay as inert data.
    expect(row.payload.stamp).toBeUndefined();
    expect(row.payload.chain).toBe("flash");
    expect(row.payload.model).toBe("cheap-9b");
  });

  it("a user-attached row stamps the actor as the user", () => {
    const harness = createHarness();
    setup(harness, { forSession: () => record() });
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    harness.service.userAttachEvidence(harness.asAgent(), {
      ticketId: ticket,
      kind: "builtin:user_signoff",
      payload: { note: "verified by hand" },
    });
    const row = rows(harness).at(-1);
    expect(row?.author).toBe("user");
    expect(row?.stamp?.actor).toBe("user");
    expect(row?.stamp?.sessionId).toBe(harness.agent.id);
  });
});

describe("#126 the stamp never reaches model context", () => {
  it("get_ticket and get_evidence return no stamp — the payload only", async () => {
    const harness = createHarness();
    setup(harness, { forSession: () => record() });
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    harness.service.agentAttachEvidence(harness.asAgent(), {
      ticketId: ticket,
      kind: "builtin:review_pass",
      payload: { verdict: "pass" },
    });

    const detail = successJson(await harness.runTool("get_ticket", { ticketId: ticket }));
    const evidence = detail.evidence as Array<Record<string, unknown>>;
    expect(evidence.length).toBe(1);
    expect(JSON.stringify(evidence[0])).not.toContain("stamp");
    expect(JSON.stringify(evidence[0])).not.toContain(harness.agent.id);

    const full = successJson(await harness.runTool("get_evidence", { ticketId: ticket }));
    const rowsOut = full.evidence as Array<Record<string, unknown>>;
    expect(rowsOut[0].payload).toEqual({ verdict: "pass" });
    expect(JSON.stringify(full)).not.toContain('"stamp"');
    expect(JSON.stringify(full)).not.toContain(harness.agent.id);
  });

  it("attach_evidence's own tool result echoes no stamp", async () => {
    const harness = createHarness();
    setup(harness, { forSession: () => record() });
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    const out = successJson(
      await harness.runTool("attach_evidence", {
        ticketId: ticket,
        kind: "builtin:automated_check",
        payload: { note: "ran" },
      }),
    );
    expect(JSON.stringify(out)).not.toContain('"stamp"');
    expect(JSON.stringify(out)).not.toContain(harness.agent.id);
  });
});
