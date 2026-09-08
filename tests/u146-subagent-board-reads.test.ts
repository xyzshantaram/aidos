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
import { installAidosMask } from "../src/tools/mask";
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
    expect(boardToolNames("read")).toEqual([
      "get_evidence",
      "get_ticket",
      "get_tickets",
      "plan",
      "plan_meta",
    ]);
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
      /*
       * The three the review caught missing. Each could lose its body
       * re-check with the suite green, because the guard still covered it
       * -- and "both layers hold" is the claim this file exists to prove.
       */
      ["plan_import", { file: "PLAN.md" }],
      ["plan_meta_set", { preamble: "x" }],
      ["request_allowlist", { ticketId: ticket.id, paths: ["src"] }],
    ] as const) {
      const payload = failureJson(await harness.runTool(name, args, { agent: child }));
      expect(payload.ok, `${name} must refuse a subagent`).toBe(false);
      expect(payload.error, `${name} must refuse as orchestrator_only`).toBe("orchestrator_only");
    }
  });

  it("EVERY declared write is body-tested, so the list cannot outgrow its coverage", () => {
    /*
     * The loop above names its tools by hand, and a hand-written list is
     * exactly how the gap survived: three of seven writes were simply not
     * in it. This fails when a newly declared write tool has no body test,
     * naming the omission instead of shipping it uncovered.
     */
    expect(
      [...boardToolNames("write")].sort(),
      "a write tool was declared without a body-refusal test in this file",
    ).toEqual(
      [
        "attach_evidence",
        "move_ticket",
        "plan_import",
        "plan_meta_set",
        "request_allowlist",
        "set_ticket",
        "suggest_actions",
      ].sort(),
    );
  });
});

/*
 * THE MASK — the layer the independent review found entirely untested, and
 * the reason this ticket came back FAIL.
 *
 * Mutation M8 changed one token in mask.ts (`boardToolNames("write")` ->
 * `boardToolNames()`), which re-hides get_tickets/get_ticket/plan/plan_meta
 * from every subagent — the EXACT bug the user filed, twice — and the whole
 * 1128-test suite stayed green.
 *
 * The test that appeared to cover this built its own deny list from
 * `boardToolNames("write")` and applied it by hand, so it exercised the
 * harness's restriction model and never ran the shipped mask. Sharing a
 * symbol with the implementation makes a test agree with it by
 * construction; these fire the real wiring instead and read back what the
 * mask ACTUALLY restricted.
 */
describe("#146 the SHIPPED mask leaves a subagent its reads", () => {
  function maskedHarness(): { harness: Harness; child: FakeAgent } {
    const harness = riggedHarness();
    // Without the tier tools registered the mask has nothing to mask, and
    // every assertion below would pass vacuously.
    harness.registerTierTools();
    installAidosMask(asContext(harness.ctx));
    harness.service.setTicket(harness.asAgent(), { title: "Anything" });
    const child = childOf(harness, harness.agent);
    harness.fireSessionStart(child);
    return { harness, child };
  }

  it("does NOT hide the read tools from a depth-1 agent", () => {
    const { harness } = maskedHarness();
    const reads = boardToolNames("read");
    expect(reads.length).toBeGreaterThan(0);
    const visible = harness.effectiveToolSet([...reads, ...boardToolNames("write"), "read"]);
    for (const name of reads) {
      expect(
        visible,
        `#146: the shipped mask hid ${name} from a subagent — that IS the reported bug`,
      ).toContain(name);
    }
  });

  it("still hides every write tool from a depth-1 agent", () => {
    const { harness } = maskedHarness();
    const writes = boardToolNames("write");
    expect(writes.length).toBeGreaterThan(0);
    const visible = harness.effectiveToolSet([...boardToolNames("read"), ...writes, "read"]);
    for (const name of writes) {
      expect(visible, `the mask must hide ${name} from a subagent`).not.toContain(name);
    }
  });

  it("strips the same set from the system prompt, so schema and runtime agree", () => {
    /*
     * The mask has two halves. A tool left visible at runtime but stripped
     * from the prompt is one the model never calls — indistinguishable
     * from being blocked, and twice as confusing to diagnose.
     */
    const { harness, child } = maskedHarness();
    const assembly = {
      tools: [...boardToolNames("read"), ...boardToolNames("write")].map((name) => ({ name })),
    };
    for (const record of harness.listeners["system-prompt/assemble"] ?? []) {
      record.listener(assembly, { agent: child }, () => undefined);
    }
    const names = assembly.tools.map((tool) => tool.name);
    for (const name of boardToolNames("read")) {
      expect(names, `${name} must survive the prompt strip for a subagent`).toContain(name);
    }
    for (const name of boardToolNames("write")) {
      expect(names, `${name} must be stripped from a subagent's prompt`).not.toContain(name);
    }
  });

  it("leaves the ORCHESTRATOR every board tool, reads and writes alike", () => {
    // The mask's depth branch must not leak into the depth-0 path: an
    // orchestrator that lost set_ticket would be a far louder bug, but the
    // same one-token edit could cause it.
    const harness = riggedHarness();
    harness.registerTierTools();
    installAidosMask(asContext(harness.ctx));
    const ticket = harness.service.setTicket(harness.asAgent(), { title: "Anything" });
    harness.seedEvidence(harness.agent, ticket.id, "builtin:user_signoff");
    harness.service.agentMoveTicket(harness.asAgent(), { ticketId: ticket.id, to: "in_progress" });
    harness.fireSessionStart(harness.agent);

    const all = [...boardToolNames("read"), ...boardToolNames("write")];
    const visible = harness.effectiveToolSet([...all, "read"]);
    for (const name of all) {
      expect(visible, `the orchestrator must keep ${name}`).toContain(name);
    }
  });
});

/*
 * THE GUIDANCE — pinned the way #117 and #133 pin theirs.
 *
 * The review's M10 reverted the paragraph to the old deny-everything
 * sentence and the suite stayed green, which means a future edit can
 * silently re-instruct every orchestrator to strip the reads from its
 * subagents. That would restore the user's original complaint through the
 * prompt rather than the code, and prompt text is the tier where this
 * project has been burned before.
 */
describe("#146 the guidance tells the orchestrator the truth", () => {
  function guidanceText(): string {
    const harness = riggedHarness();
    return harness.promptSections.find((section) => section.name === "tool:aidos")?.text ?? "";
  }

  it("names the permitted reads in ONE verbatim clause", () => {
    /*
     * Pinned as a whole sentence, because the re-review walked past the
     * per-name version (M18'): every read tool's name appears elsewhere in
     * this long paragraph -- "get_tickets reads the board", "plan_meta
     * reads the stored plan blocks" -- so dropping a name from the sentence
     * that GRANTS the reads left every substring assertion satisfied.
     *
     * A substring check on a name proves the paragraph mentions it, which
     * is not the claim. The claim is the permission, and the permission is
     * this clause.
     */
    expect(guidanceText()).toContain(
      "a subagent may call get_tickets, get_ticket, get_evidence, plan and plan_meta",
    );
  });

  it("says where a subagent's reads RESOLVE, not just that they are allowed", () => {
    // An unblocked read against the child's own empty session hands a
    // reviewer an empty board, which is worse than a refusal because it
    // looks like an answer.
    expect(guidanceText()).toContain("resolve against the board that DISPATCHED it");
  });

  it("tells the orchestrator to deny only the WRITE tools when it spawns", () => {
    const text = guidanceText();
    expect(text).toContain("WRITE");
    // The retired instruction must be gone: it named the read tools in the
    // deny list, which is the bug in prose form.
    expect(text).not.toContain(
      "denies get_tickets, set_ticket, attach_evidence, move_ticket, plan, plan_import, plan_meta, and plan_meta_set",
    );
  });

  it("every declared read tool is named in the guidance", () => {
    // So a newly declared read cannot be omitted from the text that tells
    // the orchestrator what to leave alone.
    const text = guidanceText();
    for (const name of boardToolNames("read")) {
      expect(text, `the guidance must name the read tool ${name}`).toContain(name);
    }
  });
});
