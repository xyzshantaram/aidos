/**
 * #180: tags — freeform workspace labels, an attach-only agent tool, and
 * human-approved deletion and bulk migration.
 *
 * DECIDED BY GRILLING, 2026-09-09 (recorded on the ticket): tags ride the
 * ticket as a FIELD. Reads and the Tags browser are plain queries;
 * migration rewrites the field. The accepted consequence is a stated merge
 * rule for concurrent edits, and this file states it:
 *
 * THE MERGE RULE. A tag write is a DELTA event (`tags/attached` carries
 * names to add, `tags/detached` names to remove), never a whole-list
 * replace. The fold unions / differences the delta into the snapshot's
 * tags. Two writers editing one ticket therefore cannot clobber each
 * other's tags — there is no last-write-wins of a whole list, because no
 * write ever carries the whole list. The one exception is a concurrent
 * add+remove of the SAME name, which resolves by log order; removal is
 * human-only and rare, so that tie-break is accepted rather than hidden.
 * setTicket deliberately accepts no tags argument — that is the rule, not
 * an omission.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { AidosService } from "../src/host/aidos-core";
import { makeConfig, makeStore, expectThrows } from "./helpers";
import { TagDetachRefused } from "../src/kernel/types";
import {
  filterTagRows,
  proposalAction,
  proposalsForTag,
  tagRowsFor,
} from "../src/client/tags-modal";
import {
  asContext,
  createHarness,
  failureJson,
  successJson,
} from "./b1-harness";

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = harness.service;
  const agent = harness.asAgent();
  // runTool takes the FakeAgent; the service methods take the Agent cast.
  const fake = harness.agent;
  return { harness, svc, agent, fake };
}

function create(svc: AidosService, agent: Parameters<AidosService["setTicket"]>[0], title: string) {
  svc.setTicket(agent, { title });
  const found = svc.getTickets(agent).find((row) => row.title === title);
  if (found === undefined) throw new Error(`test setup: ticket ${title} not found`);
  return found;
}

// ---- the store: delta fold and the merge rule ----------------------------------

describe("#180 the store folds tag deltas, never whole lists", () => {
  it("starts every new ticket untagged", () => {
    const store = makeStore();
    store.createProject("/ws", "w");
    const id = store.createTicket(1, "T", "");
    expect(store.getTicket(id).tags).toEqual([]);
  });

  it("attaches by union and reports the workspace-new names", () => {
    const store = makeStore();
    store.createProject("/ws", "w");
    const a = store.createTicket(1, "A", "");
    const b = store.createTicket(1, "B", "");
    const first = store.attachTags(a, ["ui", "perf"]);
    expect(first.attached).toEqual(["ui", "perf"]);
    expect(first.created).toEqual(["ui", "perf"]);
    const second = store.attachTags(b, ["perf", "docs"]);
    expect(second.created).toEqual(["docs"]);
    expect(store.getTicket(a).tags).toEqual(["ui", "perf"]);
    expect(store.getTicket(b).tags).toEqual(["perf", "docs"]);
  });

  it("dedupes and trims one batch", () => {
    const store = makeStore();
    store.createProject("/ws", "w");
    const id = store.createTicket(1, "T", "");
    const result = store.attachTags(id, ["  ui ", "ui", "docs"]);
    expect(result.attached).toEqual(["ui", "docs"]);
  });

  it("refuses empty names, an empty batch, and unknown tickets", () => {
    const store = makeStore();
    store.createProject("/ws", "w");
    const id = store.createTicket(1, "T", "");
    expect(() => store.attachTags(id, ["  "])).toThrow("empty");
    expect(() => store.attachTags(id, [])).toThrow("at least one");
    expect(() => store.attachTags(999, ["ui"])).toThrow("no such ticket");
  });

  it("detaches by difference and refuses what the ticket does not carry", () => {
    const store = makeStore();
    store.createProject("/ws", "w");
    const id = store.createTicket(1, "T", "");
    store.attachTags(id, ["ui", "perf"]);
    expect(store.detachTags(id, ["ui"]).detached).toEqual(["ui"]);
    expect(store.getTicket(id).tags).toEqual(["perf"]);
    expect(() => store.detachTags(id, ["gone"])).toThrow("carries none");
  });

  it("concurrent writers cannot clobber: attach survives a whole-value edit", () => {
    const store = makeStore();
    store.createProject("/ws", "w");
    const id = store.createTicket(1, "T", "");
    // Writer one attaches; writer two edits the title in between carrying
    // the OLD snapshot — the spread keeps the folded tags.
    store.attachTags(id, ["ui"]);
    store.setTicket(id, { title: "T2" });
    expect(store.getTicket(id).tags).toEqual(["ui"]);
    expect(store.getTicket(id).title).toBe("T2");
  });

  it("a whole-value replay of a pre-tag log fills [] rather than corrupting", () => {
    const store = makeStore();
    store.createProject("/ws", "w");
    const id = store.createTicket(1, "T", "");
    const log = store.events();
    // Strip the field the way a pre-#180 record would lack it.
    const legacy = structuredClone(log).map((event) => {
      if (event.kind === "ticket/change") {
        const ticket = event.ticket as unknown as Record<string, unknown>;
        delete ticket.tags;
      }
      return event;
    });
    const replayed = makeStore(makeConfig(), { log: legacy });
    expect(replayed.getTicket(id).tags).toEqual([]);
  });
});

// ---- the service: attach reporting and the agent-only rule ---------------------

describe("#180 the agent attaches and is told what it created", () => {
  it("reports created names on first attach and zero on repeat", () => {
    const { harness, svc, agent, fake } = setup();
    void harness;
    const ticket = create(svc, agent, "Work");
    const first = svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["ui"] });
    expect(first.ok).toBe(true);
    expect(first.createdCount).toBe(1);
    expect(first.createdTags).toEqual(["ui"]);
    expect(first.message).toBe("agent created 1 tag: ui");
    const second = svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["ui", "perf"] });
    expect(second.createdCount).toBe(1);
    expect(second.createdTags).toEqual(["perf"]);
    expect(second.message).toBe("agent created 1 tag: perf");
  });

  it("the creation message names several names when several are new", () => {
    const { svc, agent, fake } = setup();
    const ticket = create(svc, agent, "Work");
    const result = svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["a", "b"] });
    expect(result.message).toBe("agent created 2 tags: a, b");
  });

  it("reads show the tags on the ticket view", () => {
    const { svc, agent, fake } = setup();
    const ticket = create(svc, agent, "Work");
    svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["ui"] });
    const read = svc.getTicket(agent, { ticketId: ticket.id });
    expect(read.ticket.tags).toEqual(["ui"]);
    const board = svc.getTickets(agent);
    expect(board.find((row) => row.id === ticket.id)?.tags).toEqual(["ui"]);
  });

  it("an agent REMOVE is refused — attach is the only agent path", () => {
    const { svc, agent, fake } = setup();
    const ticket = create(svc, agent, "Work");
    svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["ui"] });
    // _applyTags is the one flow; an agent delta carrying a removal is
    // refused with the typed error, whatever entry point tried it.
    const internal = svc as unknown as {
      _applyTags: (
        agent: unknown,
        ticketId: number,
        delta: { add: string[]; remove: string[] },
        actor: string,
      ) => unknown;
    };
    const refused = expectThrows(
      () => internal._applyTags(agent, ticket.id, { add: [], remove: ["ui"] }, "agent"),
      TagDetachRefused,
    );
    expect(refused.actor).toBe("agent");
  });
});

// ---- the tools: attach_tags and suggest_tag_change -----------------------------

describe("#180 the tool surface", () => {
  it("attach_tags reports creation, visibly, in the result", async () => {
    const { harness, svc, agent, fake } = setup();
    const ticket = create(svc, agent, "Work");
    const payload = successJson(
      await harness.runTool("attach_tags", { ticketId: ticket.id, tags: ["spark"] }, { agent: fake }),
    ) as { ok: boolean; createdCount: number; createdTags: string[]; message: string };
    expect(payload.ok).toBe(true);
    expect(payload.createdCount).toBe(1);
    expect(payload.createdTags).toEqual(["spark"]);
    expect(payload.message).toBe("agent created 1 tag: spark");
  });

  it("attach_tags has no detach, delete, or migrate parameter to reach for", async () => {
    const { harness, svc, agent, fake } = setup();
    void svc;
    void agent;
    const def = harness.tools.get("attach_tags");
    expect(def).toBeDefined();
    const params = (def as unknown as { parameters: { properties: Record<string, unknown> } }).parameters;
    expect(Object.keys(params.properties).sort()).toEqual(["tags", "ticketId"]);
  });

  it("suggest_tag_change queues a proposal and never writes", async () => {
    const { harness, svc, agent, fake } = setup();
    const ticket = create(svc, agent, "Work");
    svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["old"] });
    const payload = successJson(
      await harness.runTool(
        "suggest_tag_change",
        { action: "delete", tag: "old", reason: "renamed" },
        { agent: fake },
      ),
    ) as { ok: boolean; status: string; action: string; requestId: string };
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("pending");
    expect(payload.action).toBe("delete");
    // Proposed, not performed: the tag is still there.
    expect(svc.getTicket(agent, { ticketId: ticket.id }).ticket.tags).toEqual(["old"]);
  });

  it("suggest_tag_change refuses a tag nobody carries and a reason-less ask", async () => {
    const { harness, agent, fake } = setup();
    const missing = failureJson(
      await harness.runTool(
        "suggest_tag_change",
        { action: "delete", tag: "ghost", reason: "x" },
        { agent: fake },
      ),
    );
    expect(missing.ok).toBe(false);
    const ticket = create(harness.service, agent, "Work");
    harness.service.agentAttachTags(agent, { ticketId: ticket.id, tags: ["old"] });
    const noReason = failureJson(
      await harness.runTool(
        "suggest_tag_change",
        { action: "delete", tag: "old", reason: "  " },
        { agent: fake },
      ),
    );
    expect(noReason.ok).toBe(false);
  });
});

// ---- the approvals: per-proposal, human-performed --------------------------------

describe("#180 deletion and migration are human-approved proposals", () => {
  it("an approved delete proposal removes the tag everywhere, once", () => {
    const { svc, agent, fake } = setup();
    const a = create(svc, agent, "A");
    const b = create(svc, agent, "B");
    svc.agentAttachTags(agent, { ticketId: a.id, tags: ["old", "keep"] });
    svc.agentAttachTags(agent, { ticketId: b.id, tags: ["old"] });
    const proposal = svc.requestTagChange(agent, { action: "delete", tag: "old", reason: "renamed" });
    const resolved = svc.resolveApproval(agent, { requestId: proposal.requestId, approved: true });
    expect(resolved.resolved).toContain("approved");
    expect(svc.getTicket(agent, { ticketId: a.id }).ticket.tags).toEqual(["keep"]);
    expect(svc.getTicket(agent, { ticketId: b.id }).ticket.tags).toEqual([]);
  });

  it("a rejected proposal changes nothing", () => {
    const { svc, agent, fake } = setup();
    const ticket = create(svc, agent, "A");
    svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["old"] });
    const proposal = svc.requestTagChange(agent, { action: "delete", tag: "old", reason: "x" });
    const resolved = svc.resolveApproval(agent, { requestId: proposal.requestId, approved: false });
    expect(resolved.resolved).toBe("rejected");
    expect(svc.getTicket(agent, { ticketId: ticket.id }).ticket.tags).toEqual(["old"]);
  });

  it("an approved migration replaces A with B on every carrying ticket", () => {
    const { svc, agent, fake } = setup();
    const a = create(svc, agent, "A");
    const b = create(svc, agent, "B");
    svc.agentAttachTags(agent, { ticketId: a.id, tags: ["old", "keep"] });
    svc.agentAttachTags(agent, { ticketId: b.id, tags: ["plain"] });
    const proposal = svc.requestTagChange(agent, {
      action: "migrate",
      tag: "old",
      to: "new",
      reason: "spelling",
    });
    const resolved = svc.resolveApproval(agent, { requestId: proposal.requestId, approved: true });
    expect(resolved.resolved).toContain("approved");
    expect(svc.getTicket(agent, { ticketId: a.id }).ticket.tags).toEqual(["keep", "new"]);
    expect(svc.getTicket(agent, { ticketId: b.id }).ticket.tags).toEqual(["plain"]);
  });

  it("the human may also migrate and delete directly, through one Remote each", async () => {
    const { svc, agent, fake } = setup();
    const ticket = create(svc, agent, "A");
    svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["old"] });
    const migrated = await svc.userMigrateTag(agent, { from: "old", to: "new" });
    expect(migrated.tickets).toEqual([ticket.id]);
    const deleted = await svc.userDeleteTag(agent, { tag: "new" });
    expect(deleted.tickets).toEqual([ticket.id]);
    expect(svc.getTicket(agent, { ticketId: ticket.id }).ticket.tags).toEqual([]);
  });

  it("migration to the same name and work on an unknown tag are refused", async () => {
    const { svc, agent, fake } = setup();
    const ticket = create(svc, agent, "A");
    svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["old"] });
    // The @Remote surface validates synchronously (no await is reached
    // before the refusal), so these throw rather than reject.
    expect(() => svc.userMigrateTag(agent, { from: "old", to: "old" })).toThrow(
      "two different tag names",
    );
    expect(() => svc.userDeleteTag(agent, { tag: "ghost" })).toThrow("no ticket carries");
    expect(() =>
      svc.userDetachTags(agent, { ticketId: ticket.id, tags: ["ghost"] }),
    ).toThrow("carries none");
  });
});

// ---- the browser: workspace listing ----------------------------------------------

describe("#180 the Tags browser lists every workspace tag with counts", () => {
  it("aggregates counts, orders by count then name, and names the tickets", async () => {
    const { svc, agent, fake } = setup();
    const a = create(svc, agent, "A");
    const b = create(svc, agent, "B");
    svc.agentAttachTags(agent, { ticketId: a.id, tags: ["ui", "perf"] });
    svc.agentAttachTags(agent, { ticketId: b.id, tags: ["ui"] });
    const listed = await svc.workspaceTags(agent);
    expect(listed.tags.map((row) => [row.tag, row.count])).toEqual([
      ["ui", 2],
      ["perf", 1],
    ]);
    const ui = listed.tags[0];
    expect(ui.tickets.map((ticket) => ticket.title).sort()).toEqual(["A", "B"]);
    for (const ticket of ui.tickets) {
      expect(typeof ticket.boardKey).toBe("string");
      expect(typeof ticket.id).toBe("number");
      expect(typeof ticket.slug).toBe("string");
      expect(typeof ticket.workspaceKey).toBe("string");
    }
  });

  it("an empty workspace lists no tags", async () => {
    const { svc, agent, fake } = setup();
    create(svc, agent, "Untagged");
    expect((await svc.workspaceTags(agent)).tags).toEqual([]);
  });
});

// ---- the modal: pure parts ---------------------------------------------------------

describe("#180 the tags modal reads what the host wrote", () => {
  const payload = {
    tags: [
      {
        tag: "ui",
        count: 2,
        tickets: [
          { boardKey: "1", id: 1, title: "A", state: "open", slug: "a", workspaceKey: "w" },
          { boardKey: "2", id: 2, title: "B", state: "done", slug: "b", workspaceKey: "w" },
        ],
      },
      { tag: "perf", count: 1, tickets: [] },
    ],
  };

  it("parses the host payload structurally and drops half-formed rows", () => {
    const rows = tagRowsFor(payload);
    expect(rows.map((row) => row.tag)).toEqual(["ui", "perf"]);
    expect(rows[0].tickets).toHaveLength(2);
    expect(tagRowsFor({ tags: [{ tag: "ui" }] })).toEqual([]);
    expect(tagRowsFor(null)).toEqual([]);
  });

  it("filters case-insensitively, and an empty query shows everything", () => {
    const rows = tagRowsFor(payload);
    expect(filterTagRows(rows, "").map((row) => row.tag)).toEqual(["ui", "perf"]);
    expect(filterTagRows(rows, "UI").map((row) => row.tag)).toEqual(["ui"]);
    expect(filterTagRows(rows, "zzz")).toEqual([]);
  });

  it("shows only the proposals ABOUT the selected tag", () => {
    const approvals = [
      { id: "1", kind: "tag-delete", payload: { tag: "ui", reason: "renamed" } },
      { id: "2", kind: "tag-migrate", payload: { tag: "ui", to: "ux", reason: "spelling" } },
      { id: "3", kind: "tag-delete", payload: { tag: "perf", reason: "x" } },
      { id: "4", kind: "allowlist", payload: { tag: "ui" } },
    ];
    const ui = proposalsForTag(approvals, "ui");
    expect(ui.map((proposal) => proposal.id)).toEqual(["1", "2"]);
    expect(proposalAction(ui[0])).toBe("delete ui");
    expect(proposalAction(ui[1])).toBe("ui → ux");
  });
});

// ---- one-flow (#170, extended to tags) -----------------------------------------------

describe("#180 tag writes go through one implementation", () => {
  const read = (name: string): string =>
    readFileSync(new URL("../src/" + name, import.meta.url), "utf8");

  it("aidos-core commits tags/attached and tags/detached exactly once each, in _applyTags", () => {
    const core = read("host/aidos-core.ts");
    expect(core.match(/kind: "tags\/attached"/g) ?? []).toHaveLength(1);
    expect(core.match(/kind: "tags\/detached"/g) ?? []).toHaveLength(1);
    expect(core).toMatch(/private _applyTags\(/);
  });

  it("no other source file commits a tag event", () => {
    for (const name of [
      "tools/aidos-tools.ts",
      "client/tags-modal.tsx",
      "client/ticket-view.tsx",
      "client/local-ticket-view.tsx",
    ]) {
      const text = read(name);
      expect(text, `${name} must not commit a tag event`).not.toMatch(/tags\/(attached|detached)/);
    }
    // The B0 store is the one deliberate second writer: it is the kernel
    // port whose fold the kernel tests prove, and it speaks the same delta
    // vocabulary — one `tags/attached` append, one `tags/detached` append,
    // both inside attachTags/detachTags.
    const store = read("kernel/store.ts");
    expect(store.match(/kind: "tags\/attached"/g) ?? []).toHaveLength(1);
    expect(store.match(/kind: "tags\/detached"/g) ?? []).toHaveLength(1);
  });

  it("setTicket accepts no tags argument — the merge rule, not an omission", () => {
    const core = read("host/aidos-core.ts");
    const iface = /export interface SetTicketArgs \{([\s\S]*?)\n\}/.exec(core);
    expect(iface).not.toBeNull();
    expect(iface![1]).not.toMatch(/tags/);
  });

  it("the modal reaches removal only through the human remotes", () => {
    const modal = read("client/tags-modal.tsx");
    expect(modal).toMatch(/"userMigrateTag"/);
    expect(modal).toMatch(/"userDeleteTag"/);
    expect(modal).toMatch(/"resolveApproval"/);
    // The modal names attach_tags in its empty-state prose; it must never
    // CALL it (no string-literal remote for an agent write).
    expect(modal).not.toMatch(/"attach_tags"/);
  });
});

// ---- the toolbar: the Tags button -----------------------------------------------------

describe("#180 a Tags button sits beside Waiting on you / Plan / Create", () => {
  const read = (name: string): string =>
    readFileSync(new URL("../src/client/" + name, import.meta.url), "utf8");

  it("ticket-view renders a Tags button with a count, between Plan and Create", () => {
    const view = read("ticket-view.tsx");
    expect(view).toMatch(/\{"Tags"\}/);
    expect(view).toMatch(/onTags/);
    expect(view).toMatch(/tagsTotal/);
    // Order on the toolbar: queue, retired, Plan, Tags, Create.
    // (lastIndexOf for Create: the empty-state "Create a ticket" button
    // above the toolbar is an earlier onCreate that is not the toolbar's.)
    const planAt = view.indexOf("onClick={props.onPlan}");
    const tagsAt = view.indexOf("onClick={props.onTags}");
    const createAt = view.lastIndexOf("onClick={props.onCreate}");
    expect(planAt).toBeGreaterThan(-1);
    expect(tagsAt).toBeGreaterThan(planAt);
    expect(createAt).toBeGreaterThan(tagsAt);
  });

  it("local-ticket-view wires the button to the tags modal", () => {
    const local = read("local-ticket-view.tsx");
    expect(local).toMatch(/<TagsModal/);
    expect(local).toMatch(/onTags=\{/);
    expect(local).toMatch(/tagsTotal=\{tagsTotal\}/);
  });
});
