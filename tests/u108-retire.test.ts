/**
 * #108: retirement — a reversible hide that gives the board deletes without
 * deleting.
 *
 * KIND, not state. A ticket's STATE is one linear axis; retirement is
 * orthogonal to it (a stale open ticket, an abandoned in_progress one, a
 * done one that turned out wrong can all be retired). The kind costs a
 * filter at each consumer; a fifth state would have cost STATE_ORDER, the
 * gate table, the projections, the queue ordering and ~65 test files.
 *
 * The whole feature is one shape: attach `builtin:retired` to retire, DETACH
 * it to un-retire. Nothing is removed, so the append-only log keeps both
 * directions as history, and un-retiring restores the ticket to exactly the
 * state and evidence it had — because nothing was ever touched.
 *
 * The consumer enumeration lives in the ticket and is asserted here against
 * the REAL derivations: the service methods the agents and remotes call, and
 * the client functions the board renders with. A test that re-implemented
 * "retired means hidden" would pass while the bug shipped — this file does
 * not contain a second definition of retired anywhere.
 */

import { readFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { BUILTIN_KINDS, DEFAULT_GATES } from "../src/kernel/constants";
import {
  RETIRED_KIND,
  followSupersedeChain,
  isRetired,
  parseRetirementPayload,
  retirementOf,
} from "../src/kernel/retirement";
import {
  RetireRefused,
  RetiredTicketWriteRefused,
} from "../src/host/aidos-core";
import { kindColor } from "../src/client/board-logic";
import { hideRetiredTickets } from "../src/client/board-logic";
import { derivedQueue } from "../src/client/human-queue";
import { openCount } from "../src/client/board-logic";
import type { TicketView } from "../src/kernel/projections";
import {
  asContext,
  createHarness,
  failureJson,
  type Harness,
} from "./b1-harness";

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = harness.service;
  const agent = harness.asAgent();
  return { harness, svc, agent };
}

/** Create one ticket through the real service and return its view. */
function create(svc: ReturnType<typeof setup>["svc"], agent: ReturnType<typeof setup>["agent"], title: string, opts?: { dependsOn?: string[] }) {
  svc.setTicket(agent, { title, ...(opts?.dependsOn ? { dependsOn: opts.dependsOn } : {}) });
  const board = svc.getTickets(agent);
  const found = board.find((row) => row.title === title);
  if (found === undefined) throw new Error(`test setup: ticket ${title} not found`);
  return found;
}

// ---- the kind -----------------------------------------------------------------

describe("#108 builtin:retired is a kind that contributes nothing", () => {
  it("is registered with weight 0 and the human as its only author", () => {
    const def = BUILTIN_KINDS.find((kind) => kind.id === RETIRED_KIND);
    expect(def).toBeDefined();
    expect(def?.weight).toBe(0);
    expect([...(def?.allowedAuthors ?? [])]).toEqual(["user"]);
  });

  it("appears in NO gate's requiredKinds and no excuse table", () => {
    for (const gate of DEFAULT_GATES) {
      expect(gate.requiredKinds).not.toContain(RETIRED_KIND);
      for (const excuse of Object.values(gate.excusedBy ?? {})) {
        expect(excuse).not.toBe(RETIRED_KIND);
      }
    }
  });

  it("is not a prefix of any other kind id and no id is a prefix of it", () => {
    for (const kind of BUILTIN_KINDS) {
      if (kind.id === RETIRED_KIND) continue;
      expect(kind.id.startsWith(RETIRED_KIND)).toBe(false);
      expect(RETIRED_KIND.startsWith(kind.id)).toBe(false);
    }
  });
});

// ---- the payload rules ----------------------------------------------------------

describe("#108 the retirement payload is validated, not trusted", () => {
  it("accepts a reason, a supersededBy list, and nothing else", () => {
    const parsed = parseRetirementPayload({
      reason: " superseded by #123 ",
      supersededBy: ["--ws--:12", "--ws--:12", "--ws--:7"],
    });
    expect(parsed.reason).toBe("superseded by #123");
    expect(parsed.supersededBy).toEqual(["--ws--:12", "--ws--:7"]);
  });

  it("refuses an unknown key, so a misspelt supersededBy fails loudly", () => {
    expect(() =>
      parseRetirementPayload({ superseededBy: ["--ws--:12"] }),
    ).toThrow(/unknown retirement payload key/);
  });

  it("refuses a non-string reason and a non-array supersededBy", () => {
    expect(() => parseRetirementPayload({ reason: 7 })).toThrow(/reason must be a string/);
    expect(() => parseRetirementPayload({ supersededBy: "--ws--:12" })).toThrow(
      /supersededBy must be an array/,
    );
  });

  it("refuses an empty supersededBy entry", () => {
    expect(() => parseRetirementPayload({ supersededBy: ["  "] })).toThrow(
      /non-empty ticket reference/,
    );
  });

  it("tolerates a legacy or hand-written row on display", () => {
    expect(retirementOf([{ kind: RETIRED_KIND, at: 5, author: "user", payload: "nonsense" as never }]))
      .toMatchObject({ reason: null, supersededBy: [], at: 5, author: "user" });
  });
});

// ---- retire and un-retire --------------------------------------------------------

describe("#108 retire and un-retire are one reversible write", () => {
  let harness: Harness;
  let svc: Harness["service"];
  // setup() hands back harness.asAgent(), which is an Agent — not the
  // harness's FakeAgent field. Typing it from setup keeps the two in step.
  let agent: ReturnType<typeof setup>["agent"];
  let ticketId: number;

  beforeEach(() => {
    ({ harness, svc, agent } = setup());
    svc.setTicket(agent, { title: "Superseded work", body: "was a good idea once" });
    ticketId = svc.getTickets(agent)[0]?.id ?? -1;
  });

  it("retiring attaches the row; the ticket stays in the log", () => {
    const result = svc.userRetireTicket(agent, { ticketId, reason: "moved to #2" });
    expect(result.retired).toBe(true);
    const read = svc.getTicket(agent, { ticketId });
    const row = read.evidence.find((r) => r.kind === RETIRED_KIND);
    expect(row).toBeDefined();
    expect(row?.payload).toMatchObject({ reason: "moved to #2" });
    expect(row?.author).toBe("user");
    // The ticket itself is untouched: same state, same fields.
    expect(read.ticket.state).toBe("open");
    expect(read.ticket.title).toBe("Superseded work");
  });

  it("un-retiring detaches the row and restores the ticket exactly", () => {
    svc.userRetireTicket(agent, { ticketId, reason: "gone", supersededBy: [] });
    const before = svc.getTicket(agent, { ticketId });
    svc.userUnretireTicket(agent, { ticketId });
    const after = svc.getTicket(agent, { ticketId });
    expect(after.evidence.find((r) => r.kind === RETIRED_KIND)).toBeUndefined();
    // Nothing else moved: same state, same title, same other evidence.
    expect(after.ticket.state).toBe(before.ticket.state);
    expect(after.ticket.title).toBe(before.ticket.title);
    expect(after.evidence.length).toBe(before.evidence.length - 1);
  });

  it("the append-only log keeps BOTH directions as history", () => {
    svc.userRetireTicket(agent, { ticketId, reason: "gone" });
    svc.userUnretireTicket(agent, { ticketId });
    // One attach and one detach of the retirement row, both in the log.
    const attached = harness
      .aidosEvents(harness.agent)
      .filter((event) => event.kind === "evidence/attached")
      .map((event) => (event as unknown as { row: { kind: string } }).row.kind);
    expect(attached).toContain(RETIRED_KIND);
    const detached = harness
      .aidosEvents(harness.agent)
      .filter((event) => event.kind === "evidence/detached")
      .map((event) => (event as unknown as { rowKind: string }).rowKind);
    expect(detached).toContain(RETIRED_KIND);
  });

  it("retiring an already-retired ticket refuses", () => {
    svc.userRetireTicket(agent, { ticketId, reason: "gone" });
    expect(() => svc.userRetireTicket(agent, { ticketId })).toThrow(/already retired/);
  });

  it("un-retiring a live ticket refuses", () => {
    expect(() => svc.userUnretireTicket(agent, { ticketId })).toThrow(/not retired/);
  });

  it("a supersededBy reference to an unknown ticket is refused", () => {
    const failure = (() => {
      try {
        svc.userRetireTicket(agent, { ticketId, supersededBy: ["--srv-proj-cli--:999"] });
        return null;
      } catch (error) {
        return error as Error;
      }
    })();
    expect(failure?.message).toContain("supersededBy reference");
    expect(failure?.message).toContain("names no ticket");
  });

  it("a supersededBy reference to the ticket itself is refused", () => {
    expect(() =>
      svc.userRetireTicket(agent, {
        ticketId,
        supersededBy: [`--srv-proj-cli--:${ticketId}`],
      }),
    ).toThrow(/names the ticket being retired/);
  });

  it("a supersededBy reference to a retired ticket is refused: chains must land live", () => {
    const other = create(svc, agent, "Other work");
    svc.userRetireTicket(agent, { ticketId: other.id, reason: "gone first" });
    expect(() =>
      svc.userRetireTicket(agent, {
        ticketId,
        supersededBy: [`--srv-proj-cli--:${other.id}`],
      }),
    ).toThrow(/itself retired/);
  });

  it("a slug reference resolves and is normalized to workspaceKey:id", () => {
    const target = create(svc, agent, "Split work target");
    svc.userRetireTicket(agent, {
      ticketId,
      supersededBy: [`${target.workspaceKey}:${target.slug}`],
    });
    const read = svc.getTicket(agent, { ticketId });
    const row = read.evidence.find((r) => r.kind === RETIRED_KIND);
    expect(row?.payload.supersededBy).toEqual([`${target.workspaceKey}:${target.id}`]);
  });
});

// ---- the dependency gate ---------------------------------------------------------

describe("#108 retiring a ticket others depend on is refused, by name", () => {
  it("a live open dependent blocks the retirement and is named", () => {
    const { svc, agent } = setup();
    const target = create(svc, agent, "Target");
    const dependent = create(svc, agent, "Dependent", {
      dependsOn: [`${target.workspaceKey}:${target.id}`],
    });
    let refused: RetireRefused | null = null;
    try {
      svc.userRetireTicket(agent, { ticketId: target.id, reason: "gone" });
    } catch (error) {
      refused = error as RetireRefused;
    }
    expect(refused).toBeInstanceOf(RetireRefused);
    expect(refused?.dependents).toEqual([
      { id: dependent.id, title: "Dependent", state: "open" },
    ]);
    expect(refused?.message).toContain(`#${dependent.id}`);
    // Nothing was written: the target is not retired.
    expect(svc.getTicket(agent, { ticketId: target.id }).evidence.some((r) => r.kind === RETIRED_KIND)).toBe(false);
  });

  it("a DONE dependent does not block: its reference is history", () => {
    const { harness, svc, agent } = setup();
    const target = create(svc, agent, "Target");
    const doneDependent = create(svc, agent, "Finished dependent", {
      dependsOn: [`${target.workspaceKey}:${target.id}`],
    });
    // Walk the real gates: signoff opens the work, an accepted review
    // (excusing the machine check) submits it, the human verifies it done.
    harness.seedEvidence(harness.agent, doneDependent.id, "builtin:user_signoff");
    svc.agentMoveTicket(agent, { ticketId: doneDependent.id, to: "in_progress" });
    harness.seedEvidence(harness.agent, doneDependent.id, "builtin:review_pass", { verdict: "REVIEW PASS" });
    /*
     * #178 landed between this test being written and being merged: a commit
     * is now required to reach verification, and it is excused by nothing.
     * SEEDED rather than resolved, because this test is about retirement --
     * the real git-show path is proven once, live, in u178.
     */
    harness.seedEvidence(harness.agent, doneDependent.id, "builtin:user_commit", { commit: "abc1234" });
    svc.agentMoveTicket(agent, { ticketId: doneDependent.id, to: "awaiting_verification" });
    harness.seedEvidence(harness.agent, doneDependent.id, "builtin:user_verified");
    svc.userMoveTicket(agent, { ticketId: doneDependent.id, to: "done" });
    expect(() =>
      svc.userRetireTicket(agent, { ticketId: target.id, reason: "gone" }),
    ).not.toThrow();
  });

  it("a RETIRED dependent does not block: it is hidden itself", () => {
    const { svc, agent } = setup();
    const target = create(svc, agent, "Target");
    const retiredDependent = create(svc, agent, "Hidden dependent", {
      dependsOn: [`${target.workspaceKey}:${target.id}`],
    });
    svc.userRetireTicket(agent, { ticketId: retiredDependent.id, reason: "hidden first" });
    expect(() =>
      svc.userRetireTicket(agent, { ticketId: target.id, reason: "gone" }),
    ).not.toThrow();
  });
});

// ---- the consumer enumeration (host half) ----------------------------------------

describe("#108 every agent-facing surface ignores a retired ticket", () => {
  let harness: Harness;
  let svc: Harness["service"];
  // setup() hands back harness.asAgent(), which is an Agent — not the
  // harness's FakeAgent field. Typing it from setup keeps the two in step.
  let agent: ReturnType<typeof setup>["agent"];
  let liveId: number;
  let retiredId: number;

  beforeEach(() => {
    ({ harness, svc, agent } = setup());
    create(svc, agent, "Live work");
    const retired = create(svc, agent, "Retired work");
    retiredId = retired.id;
    liveId = svc.getTickets(agent).find((row) => row.title === "Live work")?.id ?? -1;
    svc.userRetireTicket(agent, { ticketId: retiredId, reason: "superseded by the live one" });
  });

  it("get_tickets (the agent's board read) returns it in no listing", () => {
    const titles = svc.getTickets(agent).map((row) => row.title);
    expect(titles).toContain("Live work");
    expect(titles).not.toContain("Retired work");
    // Under every filter too: the hiding is not a sort artifact.
    const searched = svc.getTickets(agent, { search: "Retired" });
    expect(searched).toEqual([]);
    const allStates = svc.getTickets(agent, { stateIds: ["open", "in_progress", "awaiting_verification", "done"] });
    expect(allStates.map((row) => row.title)).not.toContain("Retired work");
  });

  it("get_ticket still resolves it: the agent must be able to read one deliberately", () => {
    const read = svc.getTicket(agent, { ticketId: retiredId });
    expect(read.ticket.title).toBe("Retired work");
    expect(read.evidence.some((row) => row.kind === RETIRED_KIND)).toBe(true);
  });

  it("ticketStates does not report the retired ticket's state", () => {
    // Move a second ticket to in_progress and retire it: the mask must not
    // keep seeing in_progress through it.
    const second = create(svc, agent, "Hidden in progress");
    harness.seedEvidence(harness.agent, second.id, "builtin:user_signoff");
    svc.agentMoveTicket(agent, { ticketId: second.id, to: "in_progress" });
    expect(svc.ticketStates(agent)).toContain("in_progress");
    svc.userRetireTicket(agent, { ticketId: second.id, reason: "gone" });
    expect(svc.ticketStates(agent)).not.toContain("in_progress");
  });

  it("the write boundary (allowlistUnion) grants nothing for a retired ticket", () => {
    const hidden = create(svc, agent, "Hidden writer");
    harness.seedEvidence(harness.agent, hidden.id, "builtin:user_signoff");
    svc.agentMoveTicket(agent, { ticketId: hidden.id, to: "in_progress" });
    harness.seedEvidence(harness.agent, hidden.id, "builtin:file_allowlist", {
      paths: ["/srv/proj/cli/src/secret.ts"],
    });
    svc.userSetTicket(agent, {
      ticketId: hidden.id,
      allowlist: ["/srv/proj/cli/src/secret.ts"],
    });
    expect(svc.allowlistUnion(agent)).toContain("/srv/proj/cli/src/secret.ts");
    svc.userRetireTicket(agent, { ticketId: hidden.id, reason: "gone" });
    expect(svc.allowlistUnion(agent)).not.toContain("/srv/proj/cli/src/secret.ts");
  });

  it("the plan render leaves it out", () => {
    const rendered = svc.plan(agent);
    expect(rendered).toContain("Live work");
    expect(rendered).not.toContain("Retired work");
  });

  it("searchTickets (the dependency picker) finds nothing", () => {
    const hits = svc.searchTickets(agent, { query: "Retired work" });
    expect(hits).toEqual([]);
    const liveHits = svc.searchTickets(agent, { query: "Live work" });
    expect(liveHits.length).toBe(1);
  });

  it("coldTickets hides it, like the live merge", () => {
    const rows = svc.coldTickets(agent, { sessionId: String(agent.session.id) });
    expect(rows.map((row) => row.title)).toContain("Live work");
    expect(rows.map((row) => row.title)).not.toContain("Retired work");
  });

  it("the workspace merge hides it by default and the panel asks for it by name", async () => {
    const merged = await svc.workspaceTickets(agent);
    expect(merged.tickets.map((row) => row.title)).not.toContain("Retired work");
    // And the evidence map never orphans a key for a hidden row.
    expect(Object.keys(merged.evidence).some((key) => key.endsWith(String(retiredId)))).toBe(false);

    const withRetired = await svc.workspaceTickets(agent, { includeRetired: true });
    expect(withRetired.tickets.map((row) => row.title)).toContain("Retired work");
  });

  it("the Retired panel read lists it with reason, author, time and resolved targets", async () => {
    const target = create(svc, agent, "Where the work went");
    // Re-retire with a supersede target so the resolution has something to resolve.
    svc.userUnretireTicket(agent, { ticketId: retiredId });
    svc.userRetireTicket(agent, {
      ticketId: retiredId,
      reason: "split",
      supersededBy: [`${target.workspaceKey}:${target.id}`],
    });
    const panel = await svc.retiredTickets(agent);
    const row = panel.tickets.find((entry) => entry.id === retiredId);
    expect(row).toBeDefined();
    expect(row?.retirement.reason).toBe("split");
    expect(row?.retirement.author).toBe("user");
    expect(typeof row?.retirement.at).toBe("number");
    expect(row?.retirement.supersededByTickets).toHaveLength(1);
    const resolved = row?.retirement.supersededByTickets[0];
    expect(resolved?.known).toBe(true);
    expect(resolved?.title).toBe("Where the work went");
    // The chain terminates on the live target.
    expect(row?.retirement.chainTerminals).toEqual([`${target.workspaceKey}:${target.id}`]);
    expect(row?.retirement.chainCycle).toBe(false);
  });

  it("suggest_actions refuses a nomination naming a retired ticket", () => {
    expect(() =>
      svc.suggestActions(agent, {
        suggestions: [{ ticketId: retiredId, actionId: "signoff", reason: "please" }],
      }),
    ).toThrow(/is retired/);
  });

  it("a nomination made BEFORE the retirement is pruned, not left dangling", () => {
    // A fresh ticket, nominated while live; the describe's own ticket is
    // already retired, so this one isolates the ordering.
    const fresh = create(svc, agent, "Nominated then hidden");
    svc.suggestActions(agent, {
      suggestions: [{ ticketId: fresh.id, actionId: "signoff", reason: "please" }],
    });
    expect(svc.actionNominations(agent)).toHaveLength(1);
    svc.userRetireTicket(agent, { ticketId: fresh.id, reason: "gone" });
    // The live nomination read is the same function the cap counts.
    expect(svc.actionNominations(agent)).toHaveLength(0);
  });
});

// ---- the agent cannot retire, and cannot write to a retired ticket ---------------

describe("#108 the agent can neither hide a ticket nor write to a hidden one", () => {
  let harness: Harness;
  let svc: Harness["service"];
  // setup() hands back harness.asAgent(), which is an Agent — not the
  // harness's FakeAgent field. Typing it from setup keeps the two in step.
  let agent: ReturnType<typeof setup>["agent"];
  let ticketId: number;

  beforeEach(() => {
    ({ harness, svc, agent } = setup());
    svc.setTicket(agent, { title: "Target of writes" });
    ticketId = svc.getTickets(agent)[0]?.id ?? -1;
    svc.userRetireTicket(agent, { ticketId, reason: "gone" });
  });

  it("attach_evidence with the retired kind refuses: human-only", async () => {
    const refused = failureJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "retired", payload: {} }),
    );
    expect(refused.error).toBe("human_only_kind");
  });

  it("no board tool offers retirement", () => {
    const names = [...harness.tools.keys()];
    for (const name of names) {
      expect(name.toLowerCase()).not.toContain("retire");
    }
  });

  it("set_ticket on a retired ticket refuses for the agent", async () => {
    const refused = failureJson(
      await harness.runTool("set_ticket", { ticketId, title: "Renamed while hidden" }),
    );
    expect(refused.error).toBe("retired_ticket");
  });

  it("attach_evidence on a retired ticket refuses for the agent", async () => {
    const refused = failureJson(
      await harness.runTool("attach_evidence", { ticketId, kind: "review_note", payload: {} }),
    );
    expect(refused.error).toBe("retired_ticket");
  });

  it("move_ticket on a retired ticket refuses for the agent, and the refusal is logged", async () => {
    const refused = failureJson(
      await harness.runTool("move_ticket", { ticketId, to: "in_progress" }),
    );
    expect(refused.error).toBe("retired_ticket");
    const refusals = harness
      .aidosEvents(harness.agent)
      .filter((event) => event.kind === "aidos/refusal");
    expect(refusals.length).toBeGreaterThan(0);
    expect(JSON.stringify(refusals[refusals.length - 1])).toContain("is retired");
  });

  it("comments on a retired ticket refuse for the agent", () => {
    expect(() =>
      svc.agentAddComment(agent, { ticketId, text: "still here" }),
    ).toThrow(RetiredTicketWriteRefused);
  });

  it("the human keeps every write: edits, rows and moves all pass", () => {
    expect(() =>
      svc.userSetTicket(agent, { ticketId, title: "Renamed while hidden" }),
    ).not.toThrow();
    expect(() =>
      svc.userAttachEvidence(agent, { ticketId, kind: "builtin:review_note", payload: {} }),
    ).not.toThrow();
    expect(() =>
      svc.userMoveTicket(agent, { ticketId, to: "in_progress" }),
    ).toThrow(/missing evidence kinds/); // the GATE refuses, not retirement
  });
});

// ---- the supersede chain walk ----------------------------------------------------

describe("#108 following a supersede chain terminates on something live", () => {
  it("walks retired nodes to their live targets", () => {
    const chains = followSupersedeChain(
      ["a:1"],
      (ref) =>
        ref === "a:1"
          ? { retired: true, supersededBy: ["a:2"] }
          : ref === "a:2"
            ? { retired: true, supersededBy: ["a:3"] }
            : { retired: false, supersededBy: [] },
    );
    expect(chains).toEqual([{ start: "a:1", terminals: ["a:3"], cycle: false }]);
  });

  it("a cycle is cut, not followed forever", () => {
    // A true two-node cycle: 1 retires into 2, 2 retires into 1. Neither is
    // live, so there is nothing to land on — the cycle flag is the honest
    // answer, and an empty terminal list says "nowhere live" rather than
    // pointing a reader at a mid-chain node.
    const chains = followSupersedeChain(
      ["a:1"],
      (ref) =>
        ref === "a:1"
          ? { retired: true, supersededBy: ["a:2"] }
          : { retired: true, supersededBy: ["a:1"] },
    );
    expect(chains[0]?.cycle).toBe(true);
    expect(chains[0]?.terminals).toEqual([]);
  });

  it("an unknown reference is a terminal, not an error", () => {
    const chains = followSupersedeChain(["nowhere:1"], () => null);
    expect(chains).toEqual([{ start: "nowhere:1", terminals: ["nowhere:1"], cycle: false }]);
  });
});

// ---- the payload-is-retired derivation -------------------------------------------

describe("#108 retirement is derived from live rows, nothing else", () => {
  it("isRetired reads only live rows", () => {
    expect(isRetired(undefined)).toBe(false);
    expect(isRetired([])).toBe(false);
    expect(isRetired([{ kind: "builtin:review_fail" }])).toBe(false);
    expect(isRetired([{ kind: RETIRED_KIND }])).toBe(true);
  });

  it("retirementOf returns the latest row and its details", () => {
    const info = retirementOf([
      { kind: RETIRED_KIND, at: 10, author: "user", payload: { reason: "first" } },
      { kind: RETIRED_KIND, at: 20, author: "user", payload: { reason: "second", supersededBy: ["--w--:3"] } },
    ]);
    expect(info?.reason).toBe("second");
    expect(info?.supersededBy).toEqual(["--w--:3"]);
    expect(info?.at).toBe(20);
    expect(retirementOf([{ kind: "builtin:review_pass", at: 1 }])).toBeNull();
  });
});

// ---- the consumer enumeration (client half) ----------------------------------------

describe("#108 the client surfaces ignore a retired ticket", () => {
  const makeRow = (id: number, title: string, slug: string): TicketView & { foreign: false } => ({
    id,
    title,
    state: "open",
    projectId: 1,
    workspaceKey: "--w--",
    slug,
    description: "",
    body: "",
    criteria: "",
    phase: 1,
    order: 1,
    dependsOn: [],
    allowlist: [],
    tags: [],
    confidenceScore: 0,
    gateFraction: null,
    gatePresent: null,
    gateTotal: null,
    updatedAt: id * 2,
    foreign: false,
  });
  const liveRow = makeRow(1, "Live", "live");
  const retiredRow = makeRow(2, "Retired", "retired");
  const evidence: Record<string, Array<{ kind: string; at?: number; author?: string; payload: Record<string, unknown> }>> = {
    "1": [{ kind: "builtin:review_note", payload: {} }],
    "2": [
      { kind: "builtin:review_note", payload: {} },
      { kind: RETIRED_KIND, at: 10, author: "user", payload: {} },
    ],
  };

  it("hideRetiredTickets (the one client hiding) filters the retired row", () => {
    const live = hideRetiredTickets([liveRow, retiredRow], evidence);
    expect(live.map((row) => row.id)).toEqual([1]);
    // The full merge still carries it, for the panel and the detail holder.
    expect([liveRow, retiredRow]).toHaveLength(2);
  });

  it("the queue (derivedQueue) raises no ask for a retired ticket", () => {
    const entries = derivedQueue([liveRow, retiredRow], (ticket) =>
      (evidence[String(ticket.id)] ?? []).map((row) => row.kind),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.ticket.id).toBe(1);
  });

  it("the tab badge (openCount over the live rows) does not count it", () => {
    const live = hideRetiredTickets([liveRow, retiredRow], evidence);
    expect(openCount(live)).toBe(1);
    // And the red flag: the count over the RAW rows would have been 2.
    expect(openCount([liveRow, retiredRow])).toBe(2);
  });

  it("the retirement chip gets its own declared token, not a state colour", () => {
    const color = kindColor(RETIRED_KIND);
    expect(color).toBe("var(--verdict-retired)");
    expect(color).not.toContain("--state-");
    const css = readFileSync(
      new URL("../src/client/board.css", import.meta.url),
      "utf8",
    );
    expect(css).toContain("--verdict-retired:");
  });
});

// ---- the requestAllowlist refusal (a retired ticket takes no approval cards) ------

describe("#108 a retired ticket takes no allowlist requests", () => {
  it("requestAllowlist refuses, so no unanswerable card is queued", () => {
    const ws = mkdtempSync(join(tmpdir(), "ws108-"));
    mkdirSync(join(ws, "src"));
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const svc = harness.service;
    const agent = harness.asAgent();
    (agent as { session: { header: { cwd: string } } }).session.header.cwd = ws;
    svc.setTicket(agent, { title: "Hidden request" });
    const ticketId = svc.getTickets(agent)[0]?.id ?? -1;
    svc.userRetireTicket(agent, { ticketId, reason: "gone" });
    expect(() =>
      svc.requestAllowlist(agent, { ticketId, paths: ["src"] }),
    ).toThrow(/is retired/);
  });
});
