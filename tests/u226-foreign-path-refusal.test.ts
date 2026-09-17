/**
 * #226 (2026-09-17): cross-repo work has a route that works and nothing said so.
 *
 * THE TRIGGER. The owner approved a sandbox escalation to write a path in
 * ANOTHER repository, and the boundary refused with "Call request_allowlist
 * on the ticket this work belongs to, or write under the scratch root."
 * The first half is IMPOSSIBLE: request_allowlist only admits paths inside
 * the session workspace, so a foreign path can never join any ticket here.
 * The second half was the right answer all along — a detached worktree of
 * the foreign repo hosted under the scratch root, where writes need no
 * allowlist — proven by driving it the same day.
 *
 * WHAT CHANGED. An out-of-workspace path is now its own branch of
 * writeBoundaryReason (after the subagent branch, before the empty-board /
 * none-in-progress / union branches): it names the real reason, teaches the
 * worktree-in-scratch route including its two escalation moments (once to
 * create the worktree, again per commit), states the sharing property that
 * makes a worktree worth choosing over a clone, and lists no ticket ids.
 * AIDOS_GUIDANCE teaches the same recipe before an agent hits the wall.
 *
 * WHAT DID NOT CHANGE. The subagent branch above it is byte-identical
 * (#159): a subagent cannot create the worktree itself — creation needs an
 * escalation, which auto-rejects in a subagent session — so its actionable
 * move is still the report to its parent. The in-workspace orchestrator
 * branches keep #159's settled wording, ticket-id list included.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { writeBoundaryReason } from "../src/tools/allowlist";
import { asContext, createHarness, type FakeAgent, type Harness } from "./b1-harness";

function riggedHarness(): Harness {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

let childSeq = 0;
function childOf(harness: Harness, parent: FakeAgent): FakeAgent {
  const child = harness.makeAgent({ depth: 1, id: `session-226-${++childSeq}` });
  const header = child.session.header as { parentSession?: string; origin?: string };
  header.parentSession = parent.session.id;
  header.origin = "subagent";
  return child;
}

let frontSeq = 0;
function front(harness: Harness, paths: string[]): number {
  const agent = harness.asAgent();
  const ticket = harness.service.setTicket(agent, { title: `Front ${++frontSeq}` });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:user_signoff");
  harness.service.agentMoveTicket(agent, { ticketId: ticket.id, to: "in_progress" });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:file_allowlist", { paths });
  harness.service.userSetTicket(agent, { ticketId: ticket.id, allowlist: paths });
  return ticket.id;
}

/**
 * A refused write to a path in ANOTHER repository, as seen by one actor.
 * Outside the harness workspace (/srv/proj/cli), outside scratch, outside
 * the /tmp/dsh exemption — so no allowlist on this board can cover it.
 */
function foreignRefusal(harness: Harness, agent: FakeAgent | ReturnType<Harness["asAgent"]>): string {
  const reason = writeBoundaryReason(
    asContext(harness.ctx),
    agent as never,
    "/home/elsewhere/not-allowed.md",
  );
  expect(reason, "the write must be refused for this test to mean anything").toBeDefined();
  return reason as string;
}

/**
 * A refused write INSIDE the workspace that no allowlist covers: the
 * in-workspace union case #159 settled. Derives the cwd from the harness
 * rather than hardcoding it, so the path stays inside whatever workspace
 * the harness binds.
 */
function inWorkspaceRefusal(harness: Harness, agent: FakeAgent | ReturnType<Harness["asAgent"]>): string {
  const cwd = harness.agent.session.header.cwd as string;
  const reason = writeBoundaryReason(
    asContext(harness.ctx),
    agent as never,
    `${cwd}/docs/not-allowed.md`,
  );
  expect(reason, "the write must be refused for this test to mean anything").toBeDefined();
  return reason as string;
}

describe("#226 a path outside the workspace names the real reason", () => {
  it("says the path is outside the session workspace, so no ticket here can cover it", () => {
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const message = foreignRefusal(harness, harness.asAgent());
    expect(message).toMatch(/outside the session workspace/);
    expect(message).toMatch(/no ticket on this board can cover it/);
  });

  it("never advises request_allowlist, which cannot succeed for a foreign path", () => {
    // The headline defect: the old orchestrator branch printed
    // "Call request_allowlist on the ticket this work belongs to", and
    // request_allowlist only admits paths inside the workspace. Remove the
    // foreign branch and this path falls back to that branch, which prints
    // the token — so this fails without the mechanism, not alongside it.
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    front(harness, ["src/host"]);
    expect(foreignRefusal(harness, harness.asAgent())).not.toMatch(/request_allowlist/);
  });

  it("names the route that works: a detached worktree under the scratch root", () => {
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const message = foreignRefusal(harness, harness.asAgent());
    expect(message).toMatch(/worktree/);
    expect(message).toMatch(/scratch/);
    expect(message).toMatch(/git worktree add --detach/);
    expect(message).toMatch(/need no allowlist/);
    expect(message).toMatch(/no board or ticket/);
  });

  it("teaches both escalation moments: once to create, again per commit", () => {
    // Creating the worktree writes .git/worktrees/<name> inside the source
    // repo; committing from inside it writes objects and refs into the
    // source repo's .git. Until the reader knows both, each one arrives as
    // a surprise failure at the most expensive moment.
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const message = foreignRefusal(harness, harness.asAgent());
    expect(message).toMatch(/one-time sandbox escalation/);
    expect(message).toMatch(/edit freely, escalate per commit/);
  });

  it("states the worktree-versus-clone property that makes it worth choosing", () => {
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const message = foreignRefusal(harness, harness.asAgent());
    expect(message).toMatch(/shares the origin's object store/);
    expect(message).toMatch(/no push or fetch/);
  });

  it("lists no ticket ids — a refusal names the decision and the route, not the inventory", () => {
    /*
     * The reported refusal enumerated roughly seventy in-progress ids,
     * burying the one sentence that mattered. The foreign branch prints
     * none: which ticket should own cross-repo work is not even a question
     * the caller can answer, since no ticket here can cover it. The message
     * deliberately contains no `#<digits>` at all, so re-adding
     * "In progress right now: #.." fails this rather than hiding inside it.
     */
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    front(harness, ["src/host"]);
    const message = foreignRefusal(harness, harness.asAgent());
    expect(message).not.toMatch(/#\d+/);
    expect(message).not.toMatch(/ticket \d+/);
  });

  it("wins over the empty-board branch: an empty board does not change the reason", () => {
    // Creating and signing off a ticket would not help — its allowlist
    // still could not admit a foreign path — so the foreign truth outranks
    // the "board is empty" advice.
    const harness = riggedHarness();
    const message = foreignRefusal(harness, harness.asAgent());
    expect(message).toMatch(/outside the session workspace/);
    expect(message).not.toMatch(/board is empty/);
  });

  it("wins over the none-in-progress branch: moving a ticket would not help either", () => {
    const harness = riggedHarness();
    const agent = harness.asAgent();
    const ticket = harness.service.setTicket(agent, { title: "Parked" });
    harness.seedEvidence(harness.agent, ticket.id, "builtin:user_signoff");
    const message = foreignRefusal(harness, harness.asAgent());
    expect(message).toMatch(/outside the session workspace/);
    expect(message).not.toMatch(/none is in progress/);
  });

  it("an in-workspace refusal is a different message and keeps #159's route", () => {
    /*
     * The two-way discrimination: the foreign markers appear ONLY on the
     * foreign branch, and the union branch keeps advising request_allowlist
     * with its candidate list. If the foreign check ever swallowed
     * in-workspace paths, the first assertion catches it; if a later edit
     * drops #159's list from the union branch, the rest do.
     */
    const harness = riggedHarness();
    const a = front(harness, ["src/client"]);
    const b = front(harness, ["src/host"]);
    const message = inWorkspaceRefusal(harness, harness.asAgent());
    expect(message).not.toMatch(/outside the session workspace/);
    expect(message).toMatch(/request_allowlist/);
    expect(message).toContain(`#${a}`);
    expect(message).toContain(`#${b}`);
  });

  it("a subagent refusal is unchanged: it still reports to its parent", () => {
    // Deliberate ordering, pinned: the foreign branch sits AFTER the
    // subagent branch because a subagent cannot create the worktree itself
    // (creation needs an escalation, which auto-rejects here). Its
    // actionable move is still the report, not the worktree command.
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const message = foreignRefusal(harness, childOf(harness, harness.agent));
    expect(message).toMatch(/PARENT must request the allowlist/i);
    expect(message).not.toMatch(/outside the session workspace/);
  });
});

describe("#226 the guidance teaches the recipe before the wall", () => {
  it("the tool:aidos prompt section carries the cross-repo recipe", () => {
    // Asserted against the REGISTERED section — the text the model really
    // sees — not the source spelling, per the #117 precedent: a grep would
    // pass while the section stayed unwired.
    const harness = riggedHarness();
    const text = harness.promptSections.find((s) => s.name === "tool:aidos")?.text ?? "";
    expect(text).toContain("git worktree add --detach");
    expect(text).toContain("scratch root");
    expect(text).toContain("need no allowlist");
    expect(text).toContain("needs no board or ticket");
    expect(text).toContain("one-time sandbox escalation");
    expect(text).toContain("shares the origin's object store");
    expect(text).toContain("no push or fetch");
    expect(text).toContain("edit freely, escalate per commit");
  });
});
