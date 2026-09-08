/**
 * #178: a git commit is required evidence for in_progress ->
 * awaiting_verification.
 *
 * Work that cannot name the commit it landed in is work nobody can verify:
 * the reviewer has no diff to read, the human has nothing to check out, and
 * the ticket's claim to be finished rests entirely on the agent's say-so.
 * The commit is the one required kind that is MECHANICALLY VERIFIED rather
 * than asserted: the host resolves the hash through git show and refuses
 * what it cannot find, so unlike automated_check it cannot be satisfied by
 * a confident sentence.
 *
 * These tests prove the requirement LIVE, through the resolving path in a
 * throwaway git repo -- not through seeded rows. (The lifecycle files seed
 * the commit row as setup scaffolding; that scaffolding is honest only
 * because THIS file proves the real path it stands in for.)
 */

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DEFAULT_GATES } from "../src/kernel/constants";
import { GateRefused } from "../src/kernel/types";
import type { AidosEvent } from "../src/kernel/events";
import { apply } from "../src/tools/aidos-tools";
import {
  asContext,
  createHarness,
  failureJson,
  successJson,
  type Harness,
} from "./b1-harness";

const COMMIT = "builtin:user_commit";

function makeGitWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "aidos-u178-"));
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
  git(["init", "-q"]);
  git(["config", "user.email", "test@aidos.local"]);
  git(["config", "user.name", "Aidos Test"]);
  writeFileSync(join(dir, "work.txt"), "the change\n");
  git(["add", "work.txt"]);
  git(["commit", "-q", "-m", "the landed change"]);
  return dir;
}

function headHash(dir: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: dir,
    stdio: ["ignore", "pipe", "pipe"],
  })
    .toString()
    .trim();
}

/** A harness whose workspace IS the git repo, with the board tools applied. */
function makeHarnessIn(dir: string): Harness {
  const harness = createHarness(undefined, { cwd: dir });
  harness.installService();
  apply(asContext(harness.ctx), {});
  return harness;
}

/** One ticket in in_progress with a review and a check, but no commit. */
async function readyWithoutCommit(harness: Harness): Promise<number> {
  const created = successJson(
    await harness.runTool("set_ticket", { title: "Needs a commit", body: "A body." }),
  );
  const ticketId = created.ticketId as number;
  harness.seedEvidence(harness.agent, ticketId, "builtin:user_signoff");
  successJson(await harness.runTool("move_ticket", { ticketId, to: "in_progress" }));
  successJson(
    await harness.runTool("attach_evidence", { ticketId, kind: "builtin:automated_check" }),
  );
  successJson(
    await harness.runTool("attach_evidence", { ticketId, kind: "builtin:review_pass" }),
  );
  return ticketId;
}

function commitRows(harness: Harness, ticketId: number): AidosEvent[] {
  return harness
    .aidosEvents(harness.agent)
    .filter(
      (event): event is Extract<AidosEvent, { kind: "evidence/attached" }> =>
        event.kind === "evidence/attached" &&
        event.ticketId === ticketId &&
        event.row.kind === COMMIT,
    );
}

describe("#178 the commit is required to reach verification", () => {
  it("a review and a check without a commit are refused, naming the commit", async () => {
    const dir = makeGitWorkspace();
    try {
      const harness = makeHarnessIn(dir);
      const ticketId = await readyWithoutCommit(harness);

      const refusal = failureJson(
        await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
      );
      expect(refusal.error).toBe("gate_refused");
      // The check is excused by the review (#107); the ONLY thing missing is
      // the commit. Neither the review nor the check excuses it: judgement
      // and a run prove nothing about whether a diff exists to read.
      expect(refusal.missingKinds).toEqual([COMMIT]);
      expect(String(refusal.message)).toContain(COMMIT);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the agent satisfies the gate unaided: attach_commit with a resolvable hash, then the move succeeds", async () => {
    const dir = makeGitWorkspace();
    try {
      const harness = makeHarnessIn(dir);
      const ticketId = await readyWithoutCommit(harness);

      // Everything here runs through the AGENT's tools -- no human actor, no
      // seeded commit row. The hash resolves through git show in the ticket's
      // workspace, the same path the human's commit picker uses.
      const attached = successJson(
        await harness.runTool("attach_commit", { ticketId, hash: headHash(dir) }),
      );
      expect(attached.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(attached.subject).toBe("the landed change");
      expect(attached.gateSatisfied).toBe(true);

      successJson(
        await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
      );
      const listed = successJson(await harness.runTool("get_tickets", {}));
      const tickets = listed.tickets as Record<string, unknown>[];
      expect(tickets[0].state).toBe("awaiting_verification");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("an unresolvable hash is refused and attaches nothing", async () => {
    const dir = makeGitWorkspace();
    try {
      const harness = makeHarnessIn(dir);
      const ticketId = await readyWithoutCommit(harness);

      const outcome = await harness.runTool("attach_commit", {
        ticketId,
        hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
      expect(outcome.isError).toBe(true);

      // The refusal must leave NO row: a failed resolution that still
      // recorded a claim would let fabrication accumulate until something
      // counted it.
      expect(commitRows(harness, ticketId)).toHaveLength(0);

      // And the gate still refuses, naming the commit.
      const refusal = failureJson(
        await harness.runTool("move_ticket", { ticketId, to: "awaiting_verification" }),
      );
      expect(refusal.error).toBe("gate_refused");
      expect(refusal.missingKinds).toEqual([COMMIT]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("#178 a fabricated commit satisfies nothing", () => {
  /*
   * The generic attach path -- agentAttachEvidence, userAttachEvidence, and
   * the attach_evidence tool built on them -- takes a COMPOSED payload. A
   * commit row carrying a composed payload would be a confident sentence,
   * which is exactly what the commit requirement exists to reject. So the
   * generic path refuses builtin:user_commit for every actor, and the only
   * producer is the resolving commit flow.
   */
  it("the agent cannot compose a commit row through the generic service path", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const ticket = harness.service.setTicket(agent, { title: "Fabrication probe", body: "B." }).id;

    expect(() =>
      harness.service.agentAttachEvidence(agent, {
        ticketId: ticket,
        kind: COMMIT,
        payload: { commit: "fabricated", subject: "trust me" },
      }),
    ).toThrow(/commit flow/);
    expect(commitRows(harness, ticket)).toHaveLength(0);
  });

  it("the human cannot compose one either -- the picker resolves, the generic path refuses", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const ticket = harness.service.setTicket(agent, { title: "Fabrication probe", body: "B." }).id;

    expect(() =>
      harness.service.userAttachEvidence(agent, {
        ticketId: ticket,
        kind: COMMIT,
        payload: { commit: "fabricated" },
      }),
    ).toThrow(/commit flow/);
    expect(commitRows(harness, ticket)).toHaveLength(0);
  });

  it("the attach_evidence tool refuses the commit kind and names the commit flow", async () => {
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const created = successJson(
      await harness.runTool("set_ticket", { title: "Fabrication probe", body: "B." }),
    );
    const ticketId = created.ticketId as number;

    const outcome = await harness.runTool("attach_evidence", {
      ticketId,
      kind: COMMIT,
      payload: { commit: "fabricated" },
    });
    expect(outcome.isError).toBe(true);
    const refusal = failureJson(outcome);
    expect(refusal.error).toBe("bad_payload");
    expect(String(refusal.message)).toContain("attach_commit");
    expect(commitRows(harness, ticketId)).toHaveLength(0);
  });
});

describe("#178 tickets already past the gate are undisturbed", () => {
  /*
   * Gates bind at TRANSITION time: a ticket that reached
   * awaiting_verification before the requirement landed never re-crosses
   * the in_progress -> awaiting_verification gate. The forge below replays
   * exactly that history -- a move record with no commit row, which is what
   * the log of such a ticket looks like -- and proves both exits still work.
   */
  function forgeAwaitingWithoutCommit(harness: Harness): number {
    const agent = harness.asAgent();
    const ticket = harness.service.setTicket(agent, { title: "Grandfathered", body: "B." }).id;
    harness.service.userAttachEvidence(agent, {
      ticketId: ticket,
      kind: "builtin:user_signoff",
      payload: { ok: true },
    });
    harness.service.userMoveTicket(agent, { ticketId: ticket, to: "in_progress" });
    expect(commitRows(harness, ticket)).toHaveLength(0);

    const at = harness.ticketAt(harness.agent, ticket);
    /*
     * The forge replays the ticket's OWN create record: the session log
     * holds the genuine TicketSnapshot (the getTicket view is a projection
     * -- confidenceScore, gate fraction -- and spreading it trips the fold's
     * snapshot validation). Only state/revision/updatedAt advance, exactly
     * as a pre-#178 move record would have written them.
     */
    const changes = harness
      .aidosEvents(harness.agent)
      .filter(
        (event): event is Extract<AidosEvent, { kind: "ticket/change" }> =>
          event.kind === "ticket/change" && event.ticket.id === ticket,
      );
    const latest = changes[changes.length - 1];
    if (latest === undefined) throw new Error("the ticket has no change records");
    harness.appendAidosEvent(harness.agent, {
      kind: "ticket/change",
      version: 1,
      operation: "move",
      ticket: {
        ...latest.ticket,
        state: "awaiting_verification",
        revision: latest.ticket.revision + 1,
        updatedAt: at,
      },
      at,
    });
    return ticket;
  }

  it("a commit-less ticket in awaiting_verification still reaches done", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const ticket = forgeAwaitingWithoutCommit(harness);

    harness.service.userAttachEvidence(agent, {
      ticketId: ticket,
      kind: "builtin:user_verified",
      payload: { ok: true },
    });
    // Must NOT throw: the done gate wants user_verified only.
    harness.service.userMoveTicket(agent, { ticketId: ticket, to: "done" });
    const state = harness.service
      .getTickets(agent)
      .find((row) => row.id === ticket)?.state;
    expect(state).toBe("done");
  });

  it("a commit-less ticket in awaiting_verification can still be sent back", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const ticket = forgeAwaitingWithoutCommit(harness);

    // Must NOT throw: the send-back gate requires nothing.
    harness.service.userMoveTicket(agent, { ticketId: ticket, to: "in_progress" });
    const state = harness.service
      .getTickets(agent)
      .find((row) => row.id === ticket)?.state;
    expect(state).toBe("in_progress");
  });

  it("no gate OUT of awaiting_verification requires the commit", () => {
    for (const gate of DEFAULT_GATES) {
      if (gate.fromState !== "awaiting_verification") continue;
      expect(gate.requiredKinds).not.toContain(COMMIT);
    }
  });

  it("the agent still has no path to done, commit or no commit", () => {
    const harness = createHarness();
    harness.installService();
    const agent = harness.asAgent();
    const ticket = forgeAwaitingWithoutCommit(harness);

    expect(() =>
      harness.service.agentMoveTicket(agent, { ticketId: ticket, to: "done" }),
    ).toThrow(GateRefused);
  });
});
