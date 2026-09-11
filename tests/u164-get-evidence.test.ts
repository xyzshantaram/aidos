/**
 * #164 (2026-09-08): agents could not fetch evidence records.
 *
 * get_ticket ships bounded excerpts (#92) — correct as a DEFAULT — but no
 * tool returned the full payload, so a review's findings, an agent report,
 * a verdict's detail were all write-only for exactly the agents that must
 * act on them. The live proof: review_fail payloads excerpt as a bare
 * "FAIL", so a fix-up coder told to "read the review findings" could not.
 *
 * These tests pin the deep read: complete payloads, an index shared with
 * get_ticket's excerpt rows, comment bodies behind an explicit ask, and
 * the read class that lets a subagent use it.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { boardAccessOf } from "../src/tools/board-access";
import {
  asContext,
  createHarness,
  failureJson,
  successJson,
  type FakeAgent,
  type Harness,
} from "./b1-harness";

function riggedHarness(): Harness {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

let childSeq = 0;
function childOf(harness: Harness, parent: FakeAgent): FakeAgent {
  const child = harness.makeAgent({ depth: 1, id: `session-evidence-${++childSeq}` });
  const header = child.session.header as { parentSession?: string; origin?: string };
  header.parentSession = parent.session.id;
  header.origin = "subagent";
  return child;
}

/** Longer than every #92 bound, so truncation cannot pass by accident. */
const LONG_NOTE = "n".repeat(400);

function ticketWithEvidence(harness: Harness): number {
  const agent = harness.asAgent();
  const ticket = harness.service.setTicket(agent, { title: "evidence source" });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:automated_check", { note: LONG_NOTE });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:review_fail", {
    verdict: "FAIL",
    findings: ["severity: minor | src/client/x.ts:1 | the claim"],
  });
  harness.service.agentAddComment(harness.asAgent(), {
    ticketId: ticket.id,
    text: "the comment body",
  });
  return ticket.id;
}

interface EvidenceRowOut {
  index: number;
  kind: string;
  author: string;
  at: number;
  payload: Record<string, unknown> | null;
}

describe("#164 get_evidence returns what get_ticket cannot", () => {
  it("get_ticket rows carry a stable index and stay excerpted", async () => {
    const harness = riggedHarness();
    const id = ticketWithEvidence(harness);
    const payload = successJson(
      await harness.runTool("get_ticket", { ticketId: id }, { agent: harness.agent }),
    ) as { evidence: Array<{ index: number; kind: string; excerpt: string }>; commentCount: number };
    expect(payload.evidence.map((row) => row.index)).toEqual([0, 1]);
    // #92's bound still holds on the excerpt path.
    expect(payload.evidence[0].excerpt.length).toBeLessThanOrEqual(160);
    expect(payload.evidence[1].excerpt).toBe("FAIL");
    expect(payload.commentCount).toBe(1);
  });

  it("without index: every row, complete payloads, same order", async () => {
    const harness = riggedHarness();
    const id = ticketWithEvidence(harness);
    const payload = successJson(
      await harness.runTool("get_evidence", { ticketId: id }, { agent: harness.agent }),
    ) as { ticketId: number; evidence: EvidenceRowOut[] };
    expect(payload.ticketId).toBe(id);
    expect(payload.evidence.map((row) => row.index)).toEqual([0, 1]);
    // The untruncated payload — the whole point of #164.
    expect((payload.evidence[0].payload as { note: string }).note).toBe(LONG_NOTE);
    expect((payload.evidence[1].payload as { verdict: string }).verdict).toBe("FAIL");
    expect((payload.evidence[1].payload as { findings: string[] }).findings).toHaveLength(1);
  });

  it("with index: exactly that row", async () => {
    const harness = riggedHarness();
    const id = ticketWithEvidence(harness);
    const payload = successJson(
      await harness.runTool(
        "get_evidence",
        { ticketId: id, index: 1 },
        { agent: harness.agent },
      ),
    ) as { evidence: EvidenceRowOut[] };
    expect(payload.evidence).toHaveLength(1);
    expect(payload.evidence[0].index).toBe(1);
    expect((payload.evidence[0].payload as { verdict: string }).verdict).toBe("FAIL");
  });

  it("an out-of-range index refuses with a message that names the range", async () => {
    const harness = riggedHarness();
    const id = ticketWithEvidence(harness);
    const failure = failureJson(
      await harness.runTool(
        "get_evidence",
        { ticketId: id, index: 9 },
        { agent: harness.agent },
      ),
    );
    // #159's rule: the refusal tells the reader what exists and what to do.
    expect(failure.message).toMatch(/index 9 does not exist/);
    expect(failure.message).toMatch(/2 evidence row/);
    expect(failure.message).toMatch(/0-1/);
  });

  it("comment bodies arrive only behind the explicit ask", async () => {
    const harness = riggedHarness();
    const id = ticketWithEvidence(harness);
    const without = successJson(
      await harness.runTool("get_evidence", { ticketId: id }, { agent: harness.agent }),
    ) as { comments?: unknown };
    expect(without.comments).toBeUndefined();
    const withComments = successJson(
      await harness.runTool(
        "get_evidence",
        { ticketId: id, comments: true },
        { agent: harness.agent },
      ),
    ) as { comments: Array<{ author: string; at: number; body: string }> };
    expect(withComments.comments).toHaveLength(1);
    expect(withComments.comments[0].body).toBe("the comment body");
  });

  it("a composite id resolves exactly like get_ticket", async () => {
    const harness = riggedHarness();
    const id = ticketWithEvidence(harness);
    const composite = `${String(harness.agent.session.id)}:${id}`;
    const viaComposite = successJson(
      await harness.runTool("get_evidence", { ticketId: composite }, { agent: harness.agent }),
    ) as { evidence: EvidenceRowOut[] };
    expect(viaComposite.evidence).toHaveLength(2);
    expect((viaComposite.evidence[0].payload as { note: string }).note).toBe(LONG_NOTE);
  });

  it("is a declared READ a dispatched subagent can call", async () => {
    const harness = riggedHarness();
    const id = ticketWithEvidence(harness);
    expect(boardAccessOf("get_evidence")).toBe("read");
    // #146: the read resolves against the board that DISPATCHED the child.
    const child = childOf(harness, harness.agent);
    const payload = successJson(
      await harness.runTool("get_evidence", { ticketId: id, index: 0 }, { agent: child }),
    ) as { evidence: EvidenceRowOut[] };
    expect((payload.evidence[0].payload as { note: string }).note).toBe(LONG_NOTE);
  });
});
