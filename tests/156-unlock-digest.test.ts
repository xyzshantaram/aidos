/**
 * Ticket #156: the board digest names the tickets a change just UNLOCKED.
 *
 * The satisfied-definition is the board's own (#108): a dependency is
 * satisfied when the ticket it resolves to is `done` — the same rule by
 * which a DONE dependent stops blocking a retirement. The pure scan
 * (`unlockedTicketIds`) computes the currently-unblocked set; the digest
 * plumbing announces only the DIFFERENCE across one change, so an already
 * unblocked ticket is never re-announced.
 */
import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { Store } from "../src/kernel/store";
import type { AidosEvent } from "../src/kernel/events";
import { createHarness } from "./b1-harness";
import {
  resolveDependencyRef,
  unlockedTicketIds,
  type DependencyScanEntry,
} from "../src/host/aidos-core";

const WK = "--srv-proj-cli--";

/** One full post-D1 snapshot with controllable state and dependencies. */
function snapshot(opts: {
  id: number;
  state?: DependencyScanEntry["state"];
  dependsOn?: string[];
  workspaceKey?: string;
  slug?: string;
}) {
  return {
    id: opts.id,
    projectId: 1,
    title: `T${opts.id}`,
    description: "",
    body: "",
    criteria: "",
    phase: 1,
    order: opts.id,
    state: opts.state ?? ("open" as const),
    allowlist: [],
    slug: opts.slug ?? `ticket-${opts.id}`,
    workspaceKey: opts.workspaceKey ?? WK,
    revision: 1,
    createdAt: 1000,
    updatedAt: 1000,
    ...(opts.dependsOn === undefined ? {} : { dependsOn: opts.dependsOn }),
  };
}

function entry(opts: Parameters<typeof snapshot>[0]): DependencyScanEntry {
  const s = snapshot(opts);
  return {
    id: s.id,
    workspaceKey: s.workspaceKey,
    slug: s.slug,
    state: s.state,
    dependsOn: s.dependsOn ?? [],
  };
}

describe("#156 pure scan: unlockedTicketIds", () => {
  it("a dependency clears at done, not before (transition)", () => {
    const dep = { id: 2, workspaceKey: WK, slug: "ticket-2", state: "open" as const, dependsOn: [`${WK}:1`] };
    // Root in_progress: not satisfied, nothing unlocked.
    expect(unlockedTicketIds([entry({ id: 1, state: "in_progress" }), dep])).toEqual([]);
    // Root awaiting_verification: STILL not satisfied — the board's rule is done.
    expect(unlockedTicketIds([entry({ id: 1, state: "awaiting_verification" }), dep])).toEqual([]);
    // Root done: #2 just unlocked.
    expect(unlockedTicketIds([entry({ id: 1, state: "done" }), dep])).toEqual([2]);
  });

  it("several satisfied dependents are named all together, sorted", () => {
    const entries = [
      entry({ id: 1, state: "done" }),
      entry({ id: 3, dependsOn: [`${WK}:1`] }),
      entry({ id: 2, dependsOn: [`${WK}:1`] }),
    ];
    expect(unlockedTicketIds(entries)).toEqual([2, 3]);
  });

  it("a change unlocking nothing says nothing (silence)", () => {
    // No dependents at all.
    expect(unlockedTicketIds([entry({ id: 1, state: "done" })])).toEqual([]);
    // Dependents exist but their deps are not satisfied (open root, dangling ref).
    expect(
      unlockedTicketIds([
        entry({ id: 1, state: "open" }),
        entry({ id: 2, dependsOn: [`${WK}:1`] }),
        entry({ id: 3, dependsOn: [`${WK}:99`] }),
      ]),
    ).toEqual([]);
  });

  it("an already-clear ticket stays in the set — the digest diff, not the scan, prevents re-announcing", () => {
    const before = [entry({ id: 1, state: "done" }), entry({ id: 2, dependsOn: [`${WK}:1`] })];
    // An unrelated change (ticket 9 moves) leaves #2 in the after-set;
    // announcing must diff before against after, so #2 is never re-named.
    const after = [...before, entry({ id: 9, state: "in_progress" })];
    expect(unlockedTicketIds(before)).toEqual([2]);
    expect(unlockedTicketIds(after)).toEqual([2]);
    // The diff the digest computes: fresh = after minus before = none.
    const fresh = unlockedTicketIds(after).filter((id) => !unlockedTicketIds(before).includes(id));
    expect(fresh).toEqual([]);
  });

  it("a done dependent is never named, and empty dependsOn is never 'newly unlocked'", () => {
    const entries = [
      entry({ id: 1, state: "done" }),
      entry({ id: 2, state: "done", dependsOn: [`${WK}:1`] }),
      entry({ id: 3 }),
    ];
    expect(unlockedTicketIds(entries)).toEqual([]);
  });

  it("references resolve as dependsOn does: wk:id, wk:slug, bare number/slug in the own workspace", () => {
    const entries = [
      entry({ id: 1, state: "done" }),
      entry({ id: 5, state: "done", workspaceKey: "--other-ws--", slug: "shared-slug" }),
      entry({ id: 2, dependsOn: [`${WK}:1`, "1", "ticket-1", "--other-ws--:5"] }),
    ];
    expect(resolveDependencyRef(`${WK}:1`, entries, WK)).toBe(`${WK}:1`);
    expect(resolveDependencyRef("1", entries, WK)).toBe(`${WK}:1`);
    expect(resolveDependencyRef("ticket-1", entries, WK)).toBe(`${WK}:1`);
    expect(resolveDependencyRef("--other-ws--:5", entries, WK)).toBe("--other-ws--:5");
    // A bare number/slug resolves ONLY against the own workspace, so a
    // foreign id named bare is a dangling — unsatisfied — reference.
    expect(resolveDependencyRef("5", entries, WK)).toBeUndefined();
    expect(resolveDependencyRef("99", entries, WK)).toBeUndefined();
    // Every reference satisfied, including the cross-workspace one.
    expect(unlockedTicketIds(entries)).toEqual([2]);
    // One outstanding dependency blocks, even with the rest done.
    expect(
      unlockedTicketIds([
        entry({ id: 1, state: "done" }),
        entry({ id: 3, state: "open" }),
        entry({ id: 2, dependsOn: [`${WK}:1`, `${WK}:3`] }),
      ]),
    ).toEqual([]);
  });
});

/** Digest-level fixture: #1 at awaiting_verification (verified), dependents open. */
function makeFixture(dependsOnFor: Record<number, string[]>) {
  const events: AidosEvent[] = [
    {
      kind: "project/created",
      version: 1,
      projectId: 1,
      absPath: "/srv/proj/cli",
      name: "cli",
      at: 1000,
    } as unknown as AidosEvent,
    {
      kind: "ticket/change",
      version: 1,
      operation: "create",
      at: 1000,
      ticket: snapshot({ id: 1 }),
    } as unknown as AidosEvent,
    {
      kind: "ticket/change",
      version: 1,
      operation: "move",
      at: 1001,
      ticket: { ...snapshot({ id: 1, state: "in_progress" }), revision: 2 },
    } as unknown as AidosEvent,
    {
      kind: "ticket/change",
      version: 1,
      operation: "move",
      at: 1002,
      ticket: { ...snapshot({ id: 1, state: "awaiting_verification" }), revision: 3 },
    } as unknown as AidosEvent,
  ];
  for (const [idStr, deps] of Object.entries(dependsOnFor)) {
    events.push({
      kind: "ticket/change",
      version: 1,
      operation: "create",
      at: 1000,
      ticket: snapshot({ id: Number(idStr), dependsOn: deps }),
    } as unknown as AidosEvent);
  }
  const store = new Store(DEFAULT_CONFIG, { now: () => 1788196000, log: events });
  const harness = createHarness();
  harness.seedFromStore(store);
  harness.installService();
  const internal = harness.service as unknown as {
    _resolvedConfig: { injectDebounceMs: number; injectEnabled: boolean };
  };
  internal._resolvedConfig.injectDebounceMs = 0;
  internal._resolvedConfig.injectEnabled = true;
  const injected: string[] = [];
  const live = harness.asAgent() as unknown as { steer: (m: unknown) => void };
  live.steer = (message: unknown) => {
    const blocks = (message as { content: Array<{ type: string; text?: string }> }).content;
    injected.push(
      blocks
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join(" "),
    );
  };
  // The gate to done needs a user_verified row on #1.
  harness.seedEvidence(harness.agent, 1, "builtin:user_verified");
  return { harness, injected };
}

describe("#156 digest names what a change just unlocked", () => {
  it("a user move to done appends 'this unlocks #2'", () => {
    const { harness, injected } = makeFixture({ 2: [`${WK}:1`] });
    harness.service.userMoveTicket(harness.asAgent(), { ticketId: 1, to: "done" });
    expect(injected.length).toBe(1);
    expect(injected[0]).toContain("`awaiting_verification` \u2192 `done`");
    expect(injected[0]).toContain("this unlocks #2");
  });

  it("a move unlocking several names all of them", () => {
    const { harness, injected } = makeFixture({ 2: [`${WK}:1`], 3: [`${WK}:1`] });
    harness.service.userMoveTicket(harness.asAgent(), { ticketId: 1, to: "done" });
    expect(injected.length).toBe(1);
    expect(injected[0]).toContain("this unlocks #2, #3");
  });

  it("a move satisfying nothing adds no unlock text (silence)", () => {
    // #2 depends on #3 (open): finishing #1 unlocks nobody.
    const { harness, injected } = makeFixture({ 2: [`${WK}:3`] });
    harness.service.userMoveTicket(harness.asAgent(), { ticketId: 1, to: "done" });
    expect(injected.length).toBe(1);
    expect(injected[0]).not.toContain("unlocks");
  });

  it("the transition only: an already-unlocked ticket is never re-announced", () => {
    const { harness, injected } = makeFixture({ 2: [`${WK}:1`] });
    harness.service.userMoveTicket(harness.asAgent(), { ticketId: 1, to: "done" });
    expect(injected[0]).toContain("this unlocks #2");
    // A later, unrelated edit re-reports the edit — and NOT the unlock.
    harness.service.userSetTicket(harness.asAgent(), { ticketId: 2, title: "Renamed" });
    expect(injected.length).toBe(2);
    expect(injected[1]).toContain("edited");
    expect(injected[1]).not.toContain("unlocks");
  });
});
