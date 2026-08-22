/**
 * Ticket A7: the allowlist proposal and its approval.
 *
 * The allowlist field writes are user-only, and each proposed path must be
 * covered by an approved `builtin:file_allowlist` evidence row on the same
 * ticket. The kind is user-authorable only since A7, so the agent tool path
 * cannot create the covering row and cannot set the allowlist. Any agent or
 * legacy user-authored row still carries the approved paths in its payload
 * `paths` key, so the coverage check reads existence only.
 */

import { describe, expect, it } from "vitest";

import { createHarness } from "./b1-harness";
import {
  AllowlistActorRefused,
  AllowlistCoverageRefused,
  EvidenceAuthorRefused,
} from "../src/kernel/types";

/** The allowlist of the latest committed snapshot for one ticket. */
function allowlistOfTicket(harness: ReturnType<typeof createHarness>, ticketId: number): string[] | undefined {
  const change = [...harness.aidosEvents(harness.agent)]
    .reverse()
    .find((event) => event.kind === "ticket/change" && event.ticket.id === ticketId);
  if (!change || change.kind !== "ticket/change") return undefined;
  return change.ticket.allowlist;
}

describe("the approval-gated allowlist write path", () => {
  it("an agent set_ticket call cannot set the allowlist", () => {
    const harness = createHarness();
    harness.installService();
    const ticketId = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    expect(() =>
      harness.service.setTicket(harness.asAgent(), { ticketId, allowlist: ["src/"] }),
    ).toThrow(AllowlistActorRefused);
  });

  it("a user call with a covering evidence row writes the allowlist", () => {
    const harness = createHarness();
    harness.installService();
    const ticketId = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    harness.seedEvidence(harness.agent, ticketId, "builtin:file_allowlist", {
      paths: ["src/", "docs/"],
    });
    const row = harness.service.userSetTicket(harness.asAgent(), {
      ticketId,
      allowlist: ["src/", "src/", "docs/"],
    });
    expect(row.id).toBe(ticketId);
    // Deduplicated, requested order kept.
    expect(allowlistOfTicket(harness, ticketId)).toEqual(["src/", "docs/"]);
  });

  it("a user call naming an uncovered path refuses and names it", () => {
    const harness = createHarness();
    harness.installService();
    const ticketId = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    harness.seedEvidence(harness.agent, ticketId, "builtin:file_allowlist", {
      paths: ["src/"],
    });
    let caught: unknown;
    try {
      harness.service.userSetTicket(harness.asAgent(), {
        ticketId,
        allowlist: ["src/", "docs/b.md"],
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AllowlistCoverageRefused);
    expect((caught as Error).message).toMatch(/docs\/b\.md/);
  });

  it("a user call with no covering evidence refuses", () => {
    const harness = createHarness();
    harness.installService();
    const ticketId = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    expect(() =>
      harness.service.userSetTicket(harness.asAgent(), { ticketId, allowlist: ["lib/c.ts"] }),
    ).toThrow(AllowlistCoverageRefused);
  });
});

describe("the narrowed file_allowlist authoring", () => {
  it("an agent attach_evidence call for file_allowlist refuses", () => {
    const harness = createHarness();
    harness.installService();
    const ticketId = harness.service.setTicket(harness.asAgent(), { title: "T" }).id;
    expect(() =>
      harness.service.agentAttachEvidence(harness.asAgent(), {
        ticketId,
        kind: "builtin:file_allowlist",
        payload: { paths: ["src/"] },
      }),
    ).toThrow(EvidenceAuthorRefused);
  });
});
