/**
 * Item 21 (tool layer). The attach_evidence tool refuses the two kinds that
 * only a human gives.
 *
 * SPEC-B1.md decision 3: the refusal is `human_only_kind`, names the kind,
 * and states that a human must supply it; an unregistered kind refuses with
 * `unknown_kind` naming the kind (P29). A refused kind stores no evidence.
 * The agent-authorable list is the B0 constant table's five-kind set that the
 * CLI may author (the B0 test-21 mirror).
 */

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import {
  AGENT_AUTHORABLE_KINDS,
  asContext,
  createHarness,
  failureJson,
  failureWithCode,
  successJson,
  type Harness,
} from "./b1-harness";

describe("attach_evidence refuses human only kinds", () => {
  let harness: Harness;
  let ticketId: number;

  beforeEach(async () => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const created = successJson(await harness.runTool("set_ticket", { title: "T" }));
    ticketId = (created.ticket as Record<string, unknown>).id as number;
  });

  it("user signoff is refused with the human_only_kind shape", async () => {
    const refusal = failureJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "builtin:user_signoff",
      }),
    );
    expect(refusal.error).toBe("human_only_kind");
    expect(refusal.kind).toBe("builtin:user_signoff");
  });

  it("user verified is refused with the human_only_kind shape", async () => {
    const refusal = failureJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "builtin:user_verified",
      }),
    );
    expect(refusal.error).toBe("human_only_kind");
    expect(refusal.kind).toBe("builtin:user_verified");
  });

  it("the refusal names the kind", async () => {
    for (const kind of ["builtin:user_signoff", "builtin:user_verified"]) {
      const refusal = failureJson(
        await harness.runTool("attach_evidence", { ticketId, kind }),
      );
      expect(refusal.kind).toBe(kind);
      expect(String(refusal.message)).toContain(kind);
    }
  });

  it("the refusal says a human must supply the kind", async () => {
    for (const kind of ["builtin:user_signoff", "builtin:user_verified"]) {
      const refusal = failureJson(
        await harness.runTool("attach_evidence", { ticketId, kind }),
      );
      const message = String(refusal.message).toLowerCase();
      expect(message).toContain("human");
      expect(message).toContain("must");
    }
  });

  it("a refused kind stores no evidence", async () => {
    for (const kind of ["builtin:user_signoff", "builtin:user_verified"]) {
      failureWithCode(
        await harness.runTool("attach_evidence", { ticketId, kind }),
        "human_only_kind",
      );
    }
    const attached = harness
      .aidosEvents(harness.agent)
      .filter((event) => event.kind === "evidence/attached");
    expect(attached.length).toBe(0);
  });

  it("the other builtin kinds are accepted", async () => {
    for (const kind of AGENT_AUTHORABLE_KINDS) {
      successJson(await harness.runTool("attach_evidence", { ticketId, kind }));
    }
    const attached = harness
      .aidosEvents(harness.agent)
      .filter((event) => event.kind === "evidence/attached")
      .map((event) => (event as { row: { kind: string } }).row.kind);
    expect([...attached].sort()).toEqual([...AGENT_AUTHORABLE_KINDS].sort());
  });

  it("an unregistered kind refuses with unknown_kind naming the kind", async () => {
    const refusal = failureJson(
      await harness.runTool("attach_evidence", {
        ticketId,
        kind: "builtin:no_such_kind",
      }),
    );
    expect(refusal.error).toBe("unknown_kind");
    expect(refusal.kind).toBe("builtin:no_such_kind");
    expect(String(refusal.message)).toContain("builtin:no_such_kind");
  });
});
