/**
 * The per-ticket allowlist guard (SPEC-B1.md sections 4 and 9, decisions 12
 * and 13).
 *
 * The write boundary enforces the union of the in-progress tickets'
 * allowlists: a write inside the union passes, a write outside refuses and
 * names the in-progress ticket whose allowlist would need to cover it. Two
 * in-progress tickets union their allowlists. Subagents get the same path
 * predicate as a child-scope guard: `childPathScope(allowed)` refuses a
 * read/write/edit outside the allowed root and a bash workdir outside the
 * scope, naming the root.
 */

import { describe, expect, it } from "vitest";

import { installAllowlistGuard, childPathScope } from "../src/tools/allowlist";
import { Store } from "../src/kernel/store";
import { DEFAULT_CONFIG } from "../src/kernel/constants";
import { FIXED_NOW } from "./helpers";
import {
  asContext,
  createHarness,
  type Harness,
} from "./b1-harness";

/**
 * A harness whose session holds one in-progress ticket with the given
 * allowlist, seeded through the kernel Store (the board supplies the
 * signoff).
 */
function harnessWithInProgress(allowlist: string[], title = "Scope the allowlist") {
  const harness = createHarness();
  const store = new Store(DEFAULT_CONFIG, { now: () => FIXED_NOW });
  const project = store.createProject("/srv/proj/cli", "cli");
  const ticket = store.createTicket(project, title, "d", { actor: "agent", allowlist });
  store.attachEvidence(ticket, "builtin:user_signoff", {}, "user");
  store.moveTicket(ticket, "in_progress", "user");
  harness.seedFromStore(store);
  harness.installService();
  installAllowlistGuard(asContext(harness.ctx));
  return { harness, ticketId: ticket };
}

function writeGuard(harness: Harness) {
  const guard = harness.guards[harness.guards.length - 1];
  expect(guard).toBeDefined();
  return guard;
}

describe("the write union", () => {
  it("a write inside the in-progress allowlist passes", () => {
    const { harness } = harnessWithInProgress(["src/"]);
    const guard = writeGuard(harness);
    const reason = guard(harness.makeExec("write", { file_path: "src/a.ts" }, harness.agent));
    expect(reason).toBeUndefined();
  });

  it("a write outside the union refuses and names the ticket", () => {
    const { harness } = harnessWithInProgress(["src/"]);
    const guard = writeGuard(harness);
    const reason = guard(harness.makeExec("write", { file_path: "docs/b.md" }, harness.agent));
    expect(typeof reason).toBe("string");
    expect(reason).toMatch(/in-progress ticket 1/);
  });

  it("an edit outside the union refuses the same way", () => {
    const { harness } = harnessWithInProgress(["src/"]);
    const guard = writeGuard(harness);
    const reason = guard(harness.makeExec("edit", { file_path: "docs/b.md" }, harness.agent));
    expect(typeof reason).toBe("string");
    expect(reason).toMatch(/in-progress ticket 1/);
  });

  it("two in-progress tickets union their allowlists", () => {
    const harness = createHarness();
    const store = new Store(DEFAULT_CONFIG, { now: () => FIXED_NOW });
    const project = store.createProject("/srv/proj/cli", "cli");
    const first = store.createTicket(project, "First scope", "d", {
      actor: "agent",
      allowlist: ["src/"],
    });
    store.attachEvidence(first, "builtin:user_signoff", {}, "user");
    store.moveTicket(first, "in_progress", "user");
    const second = store.createTicket(project, "Second scope", "d", {
      actor: "agent",
      allowlist: ["docs/"],
    });
    store.attachEvidence(second, "builtin:user_signoff", {}, "user");
    store.moveTicket(second, "in_progress", "user");
    harness.seedFromStore(store);
    harness.installService();
    installAllowlistGuard(asContext(harness.ctx));

    const guard = writeGuard(harness);
    const agent = harness.agent;
    expect(guard(harness.makeExec("write", { file_path: "src/a.ts" }, agent))).toBeUndefined();
    expect(guard(harness.makeExec("write", { file_path: "docs/b.md" }, agent))).toBeUndefined();
    const outside = guard(harness.makeExec("write", { file_path: "lib/c.ts" }, agent));
    expect(typeof outside).toBe("string");
  });

  it("the union is read from the service, not the payload", () => {
    const { harness } = harnessWithInProgress(["src/"]);
    const union = harness.service.allowlistUnion(harness.asAgent());
    expect(union).toEqual(["src/"]);
  });
});

describe("childPathScope", () => {
  it("allows read, write, and edit inside the allowed root", () => {
    const scope = childPathScope(["src/"]);
    const exec = createHarness().makeExec;
    for (const name of ["read", "write", "edit"]) {
      expect(scope(exec(name, { file_path: "src/a.ts" })), `tool ${name}`).toBeUndefined();
    }
  });

  it("refuses a path outside the allowed root, naming the root", () => {
    const scope = childPathScope(["src/"]);
    const exec = createHarness().makeExec;
    for (const name of ["read", "write", "edit"]) {
      const reason = scope(exec(name, { file_path: "docs/b.md" }));
      expect(typeof reason, `tool ${name}`).toBe("string");
      expect(reason).toMatch(/src\//);
    }
  });

  it("a file allowlist admits only that file", () => {
    const scope = childPathScope(["README.md"]);
    const exec = createHarness().makeExec;
    expect(scope(exec("read", { file_path: "README.md" }))).toBeUndefined();
    const reason = scope(exec("read", { file_path: "src/a.ts" }));
    expect(typeof reason).toBe("string");
    expect(reason).toMatch(/README\.md/);
  });

  it("an unrelated tool is not policed", () => {
    const scope = childPathScope(["src/"]);
    const exec = createHarness().makeExec;
    expect(scope(exec("get_tickets", {}))).toBeUndefined();
  });

  it("an explicit bash workdir inside the scope is allowed", () => {
    const harness = createHarness();
    const scope = childPathScope(["src/"]);
    expect(scope(harness.makeExec("bash", { command: "ls", workdir: "src" }, harness.agent))).toBeUndefined();
  });

  it("a bash workdir outside the scope is refused, naming the scope", () => {
    const harness = createHarness();
    const scope = childPathScope(["src/"]);
    const reason = scope(harness.makeExec("bash", { command: "ls", workdir: "docs" }, harness.agent));
    expect(typeof reason).toBe("string");
    expect(reason).toMatch(/src\//);
  });

  it("a bash call with no workdir is refused for a narrow scope (runs at the session cwd)", () => {
    const harness = createHarness();
    const scope = childPathScope(["src/"]);
    const reason = scope(harness.makeExec("bash", { command: "ls" }, harness.agent));
    expect(typeof reason).toBe("string");
    expect(reason).toMatch(/src\//);
  });

  it("a bash call with no agent context cannot be clamped and is allowed", () => {
    const scope = childPathScope(["src/"]);
    const exec = createHarness().makeExec;
    expect(scope(exec("bash", { command: "ls" }))).toBeUndefined();
  });
});
