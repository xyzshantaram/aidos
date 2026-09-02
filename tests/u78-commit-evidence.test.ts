/**
 * #78: the git-commit evidence flow. _recentCommits lists the workspace's
 * real git history through execFile; _attachCommitEvidence resolves the
 * hash server-side (client metadata never trusted) and attaches a
 * builtin:user_commit row. The tests run in a throwaway git repo so the
 * execFile path is exercised for real — including the reviewer's findings:
 * no NUL byte may reach argv, and the kind id must be the full
 * builtin:user_commit (the internal attach resolves by exact id).
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createHarness, asContext } from "./b1-harness";
import { apply } from "../src/tools/aidos-tools";

function makeGitWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "aidos-git-"));
  const git = (args: string[]) =>
    execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
  git(["init", "-q"]);
  git(["config", "user.email", "test@aidos.local"]);
  git(["config", "user.name", "Aidos Test"]);
  writeFileSync(join(dir, "a.txt"), "one\n");
  git(["add", "a.txt"]);
  git(["commit", "-q", "-m", "first commit"]);
  writeFileSync(join(dir, "a.txt"), "two\n");
  git(["add", "a.txt"]);
  git(["commit", "-q", "-m", "second commit"]);
  return dir;
}

function makeHarnessIn(cwd: string) {
  const harness = createHarness(undefined, { cwd });
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = (harness as unknown as { service: any }).service;
  const agent = (harness as unknown as { asAgent(): unknown }).asAgent();
  return { harness, svc, agent };
}

describe("git-commit evidence (#78)", () => {
  it("userRecentCommits lists the workspace's commits, newest first", async () => {
    const dir = makeGitWorkspace();
    try {
      const { svc, agent } = makeHarnessIn(dir);
      const ticket = svc.setTicket(agent, { title: "Commit probe" });
      const out = await svc.userRecentCommits(agent, { ticketId: ticket.id });
      expect(out.ticketId).toBe(ticket.id);
      expect(out.commits.length).toBe(2);
      expect(out.commits[0]!.subject).toBe("second commit");
      expect(out.commits[1]!.subject).toBe("first commit");
      expect(out.commits[0]!.author).toBe("Aidos Test");
      // Short hashes are 7+ hex.
      expect(out.commits[0]!.hash).toMatch(/^[0-9a-f]{7,64}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("userAttachCommitEvidence resolves the commit server-side and attaches builtin:user_commit", async () => {
    const dir = makeGitWorkspace();
    try {
      const { harness, svc, agent } = makeHarnessIn(dir);
      const ticket = svc.setTicket(agent, { title: "Commit probe" });
      const listing = await svc.userRecentCommits(agent, { ticketId: ticket.id });
      const shortHash = listing.commits[1]!.hash;

      // Attach by SHORT hash: the row must carry the FULL resolved hash and
      // the subject from git show — not from the client.
      const out = await svc.userAttachCommitEvidence(agent, {
        ticketId: ticket.id,
        hash: shortHash,
        note: "this is the change",
      });
      expect(out.payload.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(out.payload.subject).toBe("first commit");
      expect(out.payload.author).toBe("Aidos Test");
      expect(out.payload.note).toBe("this is the change");

      // The row is really in the session log, with the host-resolved subject.
      const rows = harness
        .aidosEvents(harness.agent)
        .filter((event: { kind: string }) => event.kind === "evidence/attached")
        .map((event: { row: { kind: string; payload: Record<string, unknown> } }) => event.row);
      const row = rows.find((r: { kind: string }) => r.kind === "builtin:user_commit");
      expect(row).toBeDefined();
      expect(row!.payload.subject).toBe("first commit");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a non-hash token before any git call", async () => {
    const dir = makeGitWorkspace();
    try {
      const { svc, agent } = makeHarnessIn(dir);
      const ticket = svc.setTicket(agent, { title: "Commit probe" });
      await expect(
        svc.userAttachCommitEvidence(agent, { ticketId: ticket.id, hash: "HEAD; rm -rf /" }),
      ).rejects.toThrow(/7-64 character hex/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a hash that git does not know with a clean error", async () => {
    const dir = makeGitWorkspace();
    try {
      const { svc, agent } = makeHarnessIn(dir);
      const ticket = svc.setTicket(agent, { title: "Commit probe" });
      await expect(
        svc.userAttachCommitEvidence(agent, { ticketId: ticket.id, hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }),
      ).rejects.toThrow(/git show failed/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
