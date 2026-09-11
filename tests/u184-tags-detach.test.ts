/**
 * #184: per-ticket detach in the tags modal + a detach proposal type on
 * suggest_tag_change.
 *
 * The modal could migrate or delete a tag but never remove ONE tag from ONE
 * ticket, even though the host `userDetachTags` Remote already exists — it
 * had zero callers. And the agent could propose deletion or migration but
 * never a detach. This file pins both halves:
 *
 * - the modal detaches per ticket through the EXISTING `userDetachTags`
 *   Remote, called as-is — it commits no tag event itself (the #180
 *   one-flow rule still holds);
 * - `suggest_tag_change` accepts a third action, `detach`, which names the
 *   ticket. The tool owns that contract (detach without a ticketId is a
 *   bad_payload refusal) and forwards the proposal to the service queue.
 *
 * The seam this file also records honestly: the host queue
 * (`requestTagChange`) still only executes delete|migrate, so a detach
 * proposal forwarded to the REAL service is refused there as a structured
 * tool_error — never a traceback. The stub-service tests below prove the
 * tool accepts and forwards the type; the real-service test proves the
 * refusal at the seam stays structured.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { AidosService } from "../src/host/aidos-core";
import {
  proposalAction,
  proposalsForTag,
} from "../src/client/tags-modal";
import {
  asContext,
  createHarness,
  failureJson,
} from "./b1-harness";

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = harness.service;
  const agent = harness.asAgent();
  const fake = harness.agent;
  return { harness, svc, agent, fake };
}

function create(svc: AidosService, agent: Parameters<AidosService["setTicket"]>[0], title: string) {
  svc.setTicket(agent, { title });
  const found = svc.getTickets(agent).find((row) => row.title === title);
  if (found === undefined) throw new Error(`test setup: ticket ${title} not found`);
  return found;
}

// ---- the modal: per-ticket detach through userDetachTags -------------------------

describe("#184 the modal detaches one tag from one ticket", () => {
  const read = (name: string): string =>
    readFileSync(new URL("../src/" + name, import.meta.url), "utf8");

  it("calls the existing userDetachTags Remote, per ticket", () => {
    const modal = read("client/tags-modal.tsx");
    expect(modal).toMatch(/"userDetachTags"/);
    // Per ticket: the detached ticket is the row's own id, and the removed
    // tag is the selected one — never a whole-tag bulk call.
    expect(modal).toMatch(/ticketId: ticket\.id/);
    expect(modal).toMatch(/tags: \[selectedRow\.tag\]/);
  });

  it("commits no tag event itself — the #180 one-flow rule still holds", () => {
    const modal = read("client/tags-modal.tsx");
    expect(modal).not.toMatch(/tags\/(attached|detached)/);
    // The modal names attach_tags in its empty-state prose; it must never
    // CALL it (no string-literal remote for an agent write).
    expect(modal).not.toMatch(/"attach_tags"/);
  });

  it("keeps the migrate, delete, and approval remotes alongside detach", () => {
    const modal = read("client/tags-modal.tsx");
    expect(modal).toMatch(/"userMigrateTag"/);
    expect(modal).toMatch(/"userDeleteTag"/);
    expect(modal).toMatch(/"resolveApproval"/);
  });

  it("shows detach proposals on the tag's card, like delete and migrate", () => {
    const approvals = [
      { id: "1", kind: "tag-delete", payload: { tag: "ui", reason: "renamed" } },
      { id: "2", kind: "tag-migrate", payload: { tag: "ui", to: "ux", reason: "spelling" } },
      { id: "3", kind: "tag-detach", payload: { tag: "ui", ticketId: 7, reason: "off-topic" } },
      { id: "4", kind: "tag-detach", payload: { tag: "perf", ticketId: 7, reason: "x" } },
      { id: "5", kind: "allowlist", payload: { tag: "ui" } },
    ];
    expect(proposalsForTag(approvals, "ui").map((proposal) => proposal.id)).toEqual(["1", "2", "3"]);
    expect(proposalsForTag(approvals, "perf").map((proposal) => proposal.id)).toEqual(["4"]);
  });

  it("renders a detach proposal as 'detach TAG from #N'", () => {
    expect(
      proposalAction({ id: "3", kind: "tag-detach", payload: { tag: "ui", ticketId: 7 } }),
    ).toBe("detach ui from #7");
    // A proposal without a ticket still names the tag rather than crashing.
    expect(proposalAction({ id: "4", kind: "tag-detach", payload: { tag: "ui" } })).toBe(
      "detach ui",
    );
  });
});

// ---- the tool: suggest_tag_change accepts detach ----------------------------------

describe("#184 suggest_tag_change proposes a per-ticket detach", () => {
  it("declares detach alongside delete and migrate, with a ticketId", () => {
    const { harness } = setup();
    const def = harness.tools.get("suggest_tag_change");
    expect(def).toBeDefined();
    const params = (def as unknown as { parameters: { properties: Record<string, unknown> } }).parameters;
    const action = params.properties.action as { enum: string[] };
    expect(action.enum.sort()).toEqual(["delete", "detach", "migrate"]);
    expect(params.properties.ticketId).toBeDefined();
  });

  it("forwards a detach proposal to the service queue with the ticket", async () => {
    const { harness, fake } = setup();
    let forwarded: unknown;
    (harness.ctx as unknown as { aidos: unknown }).aidos = {
      requestTagChange: (_agent: unknown, args: unknown) => {
        forwarded = args;
        const ask = args as { action: string; tag: string };
        return { ok: true, status: "pending", requestId: "req-1", action: ask.action, tag: ask.tag, to: null };
      },
    };
    const def = harness.tools.get("suggest_tag_change");
    expect(def).toBeDefined();
    const value = (await (def as unknown as {
      execute: (args: unknown, exec: unknown) => Promise<unknown>;
    }).execute(
      { action: "detach", tag: "ui", ticketId: 7, reason: "off-topic here" },
      harness.makeExec("suggest_tag_change", {}, fake),
    )) as { ok: boolean; status: string; action: string };
    expect(value.ok).toBe(true);
    expect(value.status).toBe("pending");
    expect(value.action).toBe("detach");
    expect(forwarded).toMatchObject({ action: "detach", tag: "ui", ticketId: 7 });
  });

  it("refuses a detach proposal that names no ticket", async () => {
    const { harness, fake } = setup();
    const def = harness.tools.get("suggest_tag_change");
    expect(def).toBeDefined();
    let thrown: unknown;
    try {
      await (def as unknown as {
        execute: (args: unknown, exec: unknown) => Promise<unknown>;
      }).execute(
        { action: "detach", tag: "ui", reason: "off-topic here" },
        harness.makeExec("suggest_tag_change", {}, fake),
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();
    const parsed = JSON.parse((thrown as Error).message) as { ok: boolean; error: string };
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe("bad_payload");
  });

  it("names the detach on the call card", () => {
    const { harness } = setup();
    const def = harness.tools.get("suggest_tag_change");
    expect(def).toBeDefined();
    const view = (def as unknown as {
      presentCall: (args: unknown) => { title: string; content?: Array<{ text: string }> };
    }).presentCall({ action: "detach", tag: "ui", ticketId: 7, reason: "off-topic here" });
    expect(view.title).toBe("Suggest tag change");
    expect(JSON.stringify(view.content)).toContain("detach ui from #7");
  });

  it("delete and migrate proposals still queue through the real service", async () => {
    const { harness, svc, agent, fake } = setup();
    const ticket = create(svc, agent, "Work");
    svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["old"] });
    const outcome = await harness.runTool(
      "suggest_tag_change",
      { action: "migrate", tag: "old", to: "new", reason: "spelling" },
      { agent: fake },
    );
    expect(outcome.isError).toBe(false);
  });

  it("a detach forwarded to the real service is refused, structurally", async () => {
    // The seam marker: the tool accepts the detach type, but the host queue
    // still only executes delete|migrate — so the real service refuses with
    // a structured tool_error, never a traceback. When the host learns
    // tag-detach, this test is the one that changes.
    const { harness, svc, agent, fake } = setup();
    const ticket = create(svc, agent, "Work");
    svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["ui"] });
    const outcome = await harness.runTool(
      "suggest_tag_change",
      { action: "detach", tag: "ui", ticketId: ticket.id, reason: "off-topic here" },
      { agent: fake },
    );
    expect(outcome.isError).toBe(true);
    const parsed = failureJson(outcome);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe("tool_error");
    expect(String(parsed.message)).toContain("unknown tag action");
  });
});
