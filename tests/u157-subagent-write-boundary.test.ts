/**
 * #157 (2026-09-08): a subagent's writes were checked against the wrong
 * board, so no dispatched front could write anything.
 *
 * **Found by hitting it.** A subagent working ticket #86 was refused on a
 * path squarely inside #86's own allowlist, and the refusal named #77 — a
 * different ticket, with a different allowlist, that it had never been
 * asked to touch.
 *
 * **Two faults compounded.** `allowlistUnion` resolved against
 * `agent.session`, which for a subagent is the CHILD's session and holds
 * no tickets, so the union was empty and every workspace write failed
 * regardless of coverage. The message then named `inProgress[0]` — the
 * first in-progress row of whatever board `getTickets` returned, which
 * since #146 is the PARENT's. So the binding was not to "the session's
 * current ticket": it was to nothing, wearing an arbitrary number.
 *
 * That is the shape of the mismatch #146 left behind — it routed the READS
 * to the dispatching board and left this write path on the child.
 *
 * The consequence was that parallel fronts could only read: every write had
 * to funnel back through the orchestrator, which is precisely the
 * serialization the parallel model exists to remove.
 */

import { describe, expect, it } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { writeBoundaryReason } from "../src/tools/allowlist";
import { DSH_TMP_ROOT, WORKTREE_ROOT } from "../src/kernel/worktree";
import { asContext, createHarness, type FakeAgent, type Harness } from "./b1-harness";

function riggedHarness(): Harness {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

/** A child carrying the delegation markers a real dispatch stamps. */
let childSeq = 0;
function childOf(harness: Harness, parent: FakeAgent): FakeAgent {
  const child = harness.makeAgent({ depth: 1, id: `session-child-${++childSeq}` });
  const header = child.session.header as { parentSession?: string; origin?: string };
  header.parentSession = parent.session.id;
  header.origin = "subagent";
  return child;
}

let frontSeq = 0;
/** An in-progress ticket with an approved allowlist: one front. */
function front(harness: Harness, paths: string[]): number {
  const agent = harness.asAgent();
  const ticket = harness.service.setTicket(agent, { title: `Front ${++frontSeq}` });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:user_signoff");
  harness.service.agentMoveTicket(agent, { ticketId: ticket.id, to: "in_progress" });
  harness.seedEvidence(harness.agent, ticket.id, "builtin:file_allowlist", { paths });
  harness.service.userSetTicket(agent, { ticketId: ticket.id, allowlist: paths });
  return ticket.id;
}

describe("#157 the union comes from the dispatching board", () => {
  it("a subagent sees the SAME union as the orchestrator that dispatched it", () => {
    // The whole bug in one assertion: the child's own session has no
    // tickets, so this was [] and every write died.
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    front(harness, ["src/host"]);
    const child = childOf(harness, harness.agent);

    const parentUnion = [...harness.service.allowlistUnion(harness.asAgent())].sort();
    const childUnion = [...harness.service.allowlistUnion(child as never)].sort();
    expect(childUnion).toEqual(parentUnion);
    expect(childUnion).toContain("src/client");
    expect(childUnion).toContain("src/host");
  });

  it("a top-level session with a FORK parent is not rerouted", () => {
    /*
     * The same distinction #146 drew for reads. A forked session is a peer
     * with its own board, not a child working someone else's ticket, and
     * handing it the parent's union would widen a real session's write
     * scope silently.
     */
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const fork = harness.makeAgent({ depth: 0, id: "session-fork" });
    (fork.session.header as { parentSession?: string }).parentSession = harness.agent.session.id;

    expect(harness.service.allowlistUnion(fork as never)).toEqual([]);
  });

  it("an empty parent board still yields an empty union, not a pass", () => {
    // Deny-by-default survives the routing: inheriting the parent's answer
    // must not mean inheriting permission it never had.
    const harness = riggedHarness();
    const child = childOf(harness, harness.agent);
    expect(harness.service.allowlistUnion(child as never)).toEqual([]);
  });
});

describe("#157 /tmp/dsh is writable, so the refusal's own advice can be followed", () => {
  it("allows a write inside the ticket's worktree", () => {
    /*
     * The refusal tells a subagent to work in
     * /tmp/dsh/aidos/<key>/<ticketId>. Until this ticket the boundary then
     * refused exactly that path, because it is outside the workspace and
     * therefore outside every allowlist — so the instruction could not be
     * followed and a front had nowhere to work.
     */
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const child = childOf(harness, harness.agent);
    const reason = writeBoundaryReason(
      asContext(harness.ctx),
      child as never,
      `${WORKTREE_ROOT}/--srv-proj-cli--/86/packages/tokens/src/index.ts`,
    );
    expect(reason).toBeUndefined();
  });

  it("allows the artifact area the refusal also names", () => {
    // "put larger artifacts in /tmp/dsh" — same trap, one directory up.
    const harness = riggedHarness();
    const child = childOf(harness, harness.agent);
    expect(
      writeBoundaryReason(asContext(harness.ctx), child as never, `${DSH_TMP_ROOT}/report.md`),
    ).toBeUndefined();
  });

  it("the orchestrator may write there too, not only subagents", () => {
    const harness = riggedHarness();
    expect(
      writeBoundaryReason(
        asContext(harness.ctx),
        harness.asAgent(),
        `${DSH_TMP_ROOT}/scratch-artifact.json`,
      ),
    ).toBeUndefined();
  });

  it("does NOT exempt a lookalike path outside /tmp/dsh", () => {
    /*
     * The discriminating case: a prefix check that matched "/tmp/dshX"
     * would quietly widen the exemption to any sibling directory an
     * attacker or a typo can name.
     */
    const harness = riggedHarness();
    const reason = writeBoundaryReason(
      asContext(harness.ctx),
      harness.asAgent(),
      "/tmp/dsh-evil/report.md",
    );
    expect(reason).toBeDefined();
  });
});

describe("#157 the boundary still refuses what it always did", () => {
  it("a subagent still cannot write the shared working tree (#101)", () => {
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const child = childOf(harness, harness.agent);
    const cwd = harness.agent.session.header.cwd as string;
    const reason = writeBoundaryReason(
      asContext(harness.ctx),
      child as never,
      `${cwd}/src/client/board.css`,
    );
    // The #101 rule outranks the union: routing the union must not open the
    // shared tree to a subagent, which is the regression this file would be
    // most embarrassed to allow.
    expect(reason).toBeDefined();
    expect(reason).toContain("shared working tree");
  });

  it("a path no in-progress ticket covers is still refused", () => {
    const harness = riggedHarness();
    front(harness, ["src/client"]);
    const cwd = harness.agent.session.header.cwd as string;
    expect(
      writeBoundaryReason(asContext(harness.ctx), harness.asAgent(), `${cwd}/README.md`),
    ).toBeDefined();
  });
});
