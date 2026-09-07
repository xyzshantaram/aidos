/**
 * #146 (2026-09-07): a subagent READS the board and never WRITES it.
 *
 * **The user's report, restated once more:** "Subagents should have
 * read-only access to board, i've said this a billion times, now subagents
 * are blocked from board." The deny-by-default fix for #67 (board tools
 * failing OPEN for subagents) overshot into deny-everything, and the cost
 * showed up in this very session: two reviewer subagents each wrote, in
 * their reports, that board tools returned `orchestrator_only`, "so I
 * reviewed against the brief's criteria summary". A review of a paraphrase
 * of the criteria is not a review of the criteria.
 *
 * Three things must hold, and each is tested against the SHIPPED wiring
 * rather than a restated list:
 *
 *  1. the class of every board tool comes from its own registration
 *     (`registerBoardTool(ctx, "read"|"write", defineTool({...}))`), so the
 *     guard, the mask and the tool bodies cannot drift from each other;
 *  2. a subagent's reads resolve against the board that DISPATCHED it —
 *     without that, an unblocked read hands a reviewer an empty board,
 *     which is worse than a refusal because it looks like an answer;
 *  3. every write still refuses, at the guard AND in the tool body.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { boardAccessOf, boardToolNames, declareBoardTool } from "../src/tools/board-access";
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

/**
 * A depth-1 child of the harness's own agent: the header carries the
 * delegation markers AND the durable parent id, which is what production
 * children get from `childSessionMeta`.
 */
let childSeq = 0;
function childOf(harness: Harness, parent: FakeAgent): FakeAgent {
  // An explicit id: the harness's own counter can collide with the default
  // agent's id, and a child that shares its parent's session id is not a
  // child at all.
  const child = harness.makeAgent({ depth: 1, id: `session-child-${++childSeq}` });
  const header = child.session.header as {
    parentSession?: string;
    origin?: string;
  };
  header.parentSession = parent.session.id;
  header.origin = "subagent";
  return child;
}

describe("#146 the access class is declared by each tool, not by a list", () => {
  it("every board tool the plugin registers declares an access class", () => {
    const harness = riggedHarness();
    /*
     * The anti-drift check the deleted `BOARD_TOOLS` array used to provide,
     * made real: a NEW board tool that forgets to declare its class fails
     * here instead of shipping ungoverned. Scratch tools are not board
     * tools and are excluded by name, which is the only place that
     * distinction is hardcoded.
     */
    const registered = [...harness.tools.keys()].filter(
      (name) => !name.startsWith("scratch_"),
    );
    for (const name of registered) {
      expect(boardAccessOf(name), `tool ${name} declares no board access`).toBeDefined();
    }
  });

  it("classifies the reads and the writes the way the guidance promises", () => {
    riggedHarness();
    expect(boardToolNames("read")).toEqual(["get_ticket", "get_tickets", "plan", "plan_meta"]);
    expect(boardToolNames("write")).toEqual([
      "attach_evidence",
      "move_ticket",
      "plan_import",
      "plan_meta_set",
      "request_allowlist",
      "set_ticket",
      "suggest_actions",
    ]);
  });

  it("refuses a CONFLICTING redeclaration instead of taking the last one", () => {
    riggedHarness();
    // Same class: idempotent, because every harness re-applies the plugin.
    expect(() => declareBoardTool("get_tickets", "read")).not.toThrow();
    // Different class: two definitions disagreeing about whether a tool
    // writes the board is a bug, and last-one-wins would hide it.
    expect(() => declareBoardTool("get_tickets", "write")).toThrow(/declared both/);
    // Put it back, since the store is module scope.
    declareBoardTool("get_tickets", "read");
  });

  it("a tool that declares nothing is not a board tool at all", () => {
    riggedHarness();
    expect(boardAccessOf("read")).toBeUndefined();
    expect(boardAccessOf("bash")).toBeUndefined();
  });
});

describe("#146 a subagent's reads resolve against the dispatching board", () => {
  it("returns the PARENT's tickets, not its own empty session", async () => {
    const harness = riggedHarness();
    harness.service.setTicket(harness.asAgent(), { title: "Parent ticket" });
    const child = childOf(harness, harness.agent);

    const payload = successJson(await harness.runTool("get_tickets", {}, { agent: child })) as {
      ok: boolean;
      tickets: { title: string }[];
    };
    expect(payload.ok).toBe(true);
    /*
     * THE WHOLE POINT. Before the routing, this was `[]`: the child's own
     * session log holds no aidos events, so an unblocked read answered
     * "there are no tickets" to a reviewer whose ticket was right there.
     */
    expect(payload.tickets.map((t) => t.title)).toContain("Parent ticket");
  });

  it("reads ONE ticket in full from the parent's board", async () => {
    const harness = riggedHarness();
    const ticket = harness.service.setTicket(harness.asAgent(), {
      title: "Reviewable",
      criteria: "the criteria the reviewer must read",
    });
    const child = childOf(harness, harness.agent);

    const payload = successJson(
      await harness.runTool("get_ticket", { ticketId: ticket.id }, { agent: child }),
    ) as { ok: boolean; ticket: { criteria: string } };
    expect(payload.ok).toBe(true);
    // The criteria reach the reviewer from the BOARD, which is the thing
    // the pasted-summary failure mode replaced.
    expect(payload.ticket.criteria).toContain("the criteria the reviewer must read");
  });

  it("does NOT reroute a top-level session that merely has a fork parent", async () => {
    const harness = riggedHarness();
    harness.service.setTicket(harness.asAgent(), { title: "Parent ticket" });
    // A FORK carries `parentSession` too, and its board is its own (#83 is
    // the standing proof that fork lineage != board ownership). No
    // delegation markers, so the walk must not happen.
    const fork = harness.makeAgent({ depth: 0, id: "session-fork" });
    (fork.session.header as { parentSession?: string }).parentSession = harness.agent.session.id;

    const payload = successJson(await harness.runTool("get_tickets", {}, { agent: fork })) as {
      tickets: { title: string }[];
    };
    expect(payload.tickets.map((t) => t.title)).not.toContain("Parent ticket");
  });

  it("walks a nested child all the way to the orchestrator", async () => {
    const harness = riggedHarness();
    harness.service.setTicket(harness.asAgent(), { title: "Parent ticket" });
    const child = childOf(harness, harness.agent);
    const grandchild = harness.makeAgent({ depth: 2, id: "session-grandchild" });
    const header = grandchild.session.header as { parentSession?: string; origin?: string };
    header.parentSession = child.session.id;
    header.origin = "subagent";

    const payload = successJson(
      await harness.runTool("get_tickets", {}, { agent: grandchild }),
    ) as { tickets: { title: string }[] };
    expect(payload.tickets.map((t) => t.title)).toContain("Parent ticket");
  });
});

describe("#146 the writes still refuse", () => {
  it("the tool BODY refuses a subagent's set_ticket even without the guard", async () => {
    const harness = riggedHarness();
    const child = childOf(harness, harness.agent);

    const payload = failureJson(
      await harness.runTool("set_ticket", { title: "Nope" }, { agent: child }),
    );
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("orchestrator_only");
  });

  it("a subagent cannot attach evidence or move a ticket on the parent's board", async () => {
    const harness = riggedHarness();
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "Held" });
    const child = childOf(harness, harness.agent);

    for (const [name, args] of [
      ["attach_evidence", { ticketId: ticket.id, kind: "review_pass" }],
      ["move_ticket", { ticketId: ticket.id, to: "in_progress" }],
      ["suggest_actions", { suggestions: [{ ticketId: ticket.id, actionId: "signoff", reason: "x" }] }],
    ] as const) {
      const payload = failureJson(await harness.runTool(name, args, { agent: child }));
      expect(payload.ok, `${name} must refuse a subagent`).toBe(false);
      expect(payload.error).toBe("orchestrator_only");
    }
  });
});
