/**
 * #185: migrate/delete are workspace-wide, and creation is measured
 * against the workspace.
 *
 * `workspaceTags` aggregates the workspace merge and the modal promises
 * workspace-wide behavior ("on every ticket carrying it"), but
 * `userMigrateTag`/`userDeleteTag` iterated only the caller's own session
 * log — so a tag carried solely by another session's tickets was LISTED
 * yet Delete threw "no ticket carries the tag". Both remotes now iterate
 * the live workspace (own log plus live siblings, each written through
 * its owning session), and `_workspaceTagSet` is the same live-workspace
 * union, so `agentAttachTags` ("new to the workspace") and the
 * `requestTagChange` existence check agree with the listing.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import type { AidosService } from "../src/host/aidos-core";
import { asContext, createHarness } from "./b1-harness";

type Agent = Parameters<AidosService["setTicket"]>[0];

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = harness.service;
  const agentA = harness.asAgent();
  const peer = harness.makeAgent({ id: "session-peer" });
  const agentB = harness.asAgent(peer);
  return { harness, svc, agentA, agentB };
}

function create(svc: AidosService, agent: Agent, title: string) {
  svc.setTicket(agent, { title });
  const found = svc.getTickets(agent).find((row) => row.title === title);
  if (found === undefined) throw new Error(`test setup: ticket ${title} not found`);
  return found;
}

function tagsOf(svc: AidosService, agent: Agent, id: number): string[] {
  return svc.getTicket(agent, { ticketId: id }).ticket.tags;
}

describe("#185 migrate and delete reach another session's tickets", () => {
  it("deletes a tag carried only by a sibling session's tickets", async () => {
    const { svc, agentA, agentB } = setup();
    const a = create(svc, agentA, "A");
    const b = create(svc, agentB, "B");
    svc.agentAttachTags(agentB, { ticketId: b.id, tags: ["solo"] });
    // Listed workspace-wide, so the delete must not throw "no ticket carries".
    const listed = await svc.workspaceTags(agentA);
    expect(listed.tags.map((row) => row.tag)).toContain("solo");
    const deleted = await svc.userDeleteTag(agentA, { tag: "solo" });
    expect(deleted.tickets).toHaveLength(1);
    expect(tagsOf(svc, agentB, b.id)).toEqual([]);
    expect(tagsOf(svc, agentA, a.id)).toEqual([]);
  });

  it("migrates a tag carried only by a sibling session's tickets", async () => {
    const { svc, agentA, agentB } = setup();
    create(svc, agentA, "A");
    const b = create(svc, agentB, "B");
    svc.agentAttachTags(agentB, { ticketId: b.id, tags: ["old"] });
    const migrated = await svc.userMigrateTag(agentA, { from: "old", to: "new" });
    expect(migrated.tickets).toHaveLength(1);
    expect(tagsOf(svc, agentB, b.id)).toEqual(["new"]);
  });

  it("migrates across both sessions at once", async () => {
    const { svc, agentA, agentB } = setup();
    const a = create(svc, agentA, "A");
    const b = create(svc, agentB, "B");
    svc.agentAttachTags(agentA, { ticketId: a.id, tags: ["old"] });
    svc.agentAttachTags(agentB, { ticketId: b.id, tags: ["old"] });
    const migrated = await svc.userMigrateTag(agentA, { from: "old", to: "new" });
    expect(migrated.tickets).toHaveLength(2);
    expect(tagsOf(svc, agentA, a.id)).toEqual(["new"]);
    expect(tagsOf(svc, agentB, b.id)).toEqual(["new"]);
  });

  it("an approved delete proposal for a sibling-only tag executes", async () => {
    const { svc, agentA, agentB } = setup();
    create(svc, agentA, "A");
    const b = create(svc, agentB, "B");
    svc.agentAttachTags(agentB, { ticketId: b.id, tags: ["old"] });
    // The existence check is workspace-wide too: this used to throw.
    const proposal = svc.requestTagChange(agentA, { action: "delete", tag: "old", reason: "renamed" });
    expect(proposal.status).toBe("pending");
    const resolved = svc.resolveApproval(agentA, { requestId: proposal.requestId, approved: true });
    expect(resolved.resolved).toContain("approved");
    expect(tagsOf(svc, agentB, b.id)).toEqual([]);
  });
});

describe("#185 creation is measured against the workspace", () => {
  it("an attach of a sibling session's tag creates nothing", () => {
    const { svc, agentA, agentB } = setup();
    const a = create(svc, agentA, "A");
    const b = create(svc, agentB, "B");
    svc.agentAttachTags(agentB, { ticketId: b.id, tags: ["shared"] });
    const result = svc.agentAttachTags(agentA, { ticketId: a.id, tags: ["shared"] });
    expect(result.createdCount).toBe(0);
    expect(result.createdTags).toEqual([]);
    expect(result.message).toBe("agent created 0 tags");
  });
});
