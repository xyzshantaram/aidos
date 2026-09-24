/**
 * Ticket #466: the #459 guard enforced a spelling, not the invariant.
 *
 * The reviewer's probe: in `setTicket`, keep the `_routeWriteToTicket` call
 * but discard its result and rebuild an unrouted handle through a session
 * alias —
 *
 *   const { routed: _unused } = this._routeWriteToTicket(...);
 *   const sess = agent.session;
 *   const routed = { ...agent, session: sess };   // the defect, reintroduced
 *
 * — and the pre-#466 guard passed 23/23 on the tree carrying the live
 * defect, while the behavioural suite went 8/10 red.
 *
 * What this file proves, every run, without touching src/:
 *
 * 1. FAITHFULNESS: the route-then-ignore transformation derived here from the
 *    shipped source applies at exactly the four `_routeWriteToTicket`
 *    destructuring sites (setTicket, agentAttachEvidence, agentMoveTicket,
 *    agentAddComment). If the source shape changes, the site count fails
 *    loudly instead of proving nothing.
 * 2. BLINDNESS of the old bar: "each entry contains a routing call" is TRUE
 *    on the mutant — the old guard passes it, as the ticket reports.
 * 3. KILL, both directions: the hardened guard predicates (mirrored here
 *    from tests/459-write-path-guard.test.ts — enforcement lives there) are
 *    GREEN on the shipped source and RED on the mutant. Two complementary
 *    shapes, each killed by a different half:
 *      - shadow rebuild (`const routed = { ...agent, session: sess }`) keeps
 *        the `this._editTicket(routed,` spelling, so the use-check still
 *        passes on it — the no-alias-rebuild ban (`agent.session`,
 *        `...agent`) kills it;
 *      - raw-agent ignore (`return this._editTicket(agent, ...)`) keeps no
 *        alias, so the alias ban passes on it — the use-check kills it.
 *    Asserting both directions keeps either half from silently weakening:
 *    drop the kill and the test goes red.
 * 4. The seam is LIVE (behavioural anchor): on the real service a stranger
 *    session's edit of a foreign ticket lands, while a write to a truly
 *    unknown id still refuses. Loading the transformed module in-process
 *    would need its relative imports to resolve, so per the ticket the
 *    in-memory kill proof above stands in for driving the mutant live; the
 *    anchor here proves the setup this file reasons about is the real one.
 *
 * Criterion 5 record — the same question (#149's: invariant or spelling?)
 * asked of every other source-text guard in the repo:
 *
 * - tests/u158-worktree-prepare.test.ts: SPELLING of the seam (bans
 *   `_runDeclaredPrepare`/`PREPARE_TIMEOUT_MS`, requires `_refreshWorktree`/
 *   `nodeModulesLinkPlan`/…), backstopped behaviourally in-file. Makes no
 *   universal claim — honest as written.
 * - tests/u101-worktrees.test.ts: SPELLING + placement (the ensure/remove
 *   calls inside their `toState` branches), backstopped by pure-function
 *   behaviour in-file. No universal claim — honest as written.
 * - tests/test-217-cold-kick-and-transient-refusal.test.ts: SPELLING of the
 *   read-vs-write store seam (`_workspaceStoreForRead` present,
 *   `_workspaceStore(` absent in the cold bodies), backstopped behaviourally
 *   in-file. No universal claim — honest as written.
 * - tests/u174-next-step.test.ts: SPELLING of the single-derivation wiring
 *   (`ctx.aidos.nextStepFor(`, no direct kernel import), heavily backstopped
 *   behaviourally in-file. Honest as written.
 * - tests/u136-partner-review-chain.test.ts: SPELLING of the Remote exposure
 *   surface (present/absent Remote names), backstopped behaviourally in-file.
 *   Honest as written.
 * - tests/u139-workspace-label.test.ts, tests/u175-digest-recent.test.ts:
 *   exact-line/coverage-string SPELLINGs, backstopped behaviourally in-file.
 *   Honest as written.
 * - tests/u108-retire-remotes-exposed.test.ts: reads the host source to
 *   enumerate Remotes — a surface inventory, not a semantic claim. Honest.
 *
 * The outlier was only ever the #459 guard: its header claimed the build
 * fails if ANY write entry resolves through the caller fold, which the
 * route-then-ignore mutant disproved. Its header now states what it proves
 * and names the behavioural suite as the backstop.
 */

import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createHarness } from "./b1-harness";

const CORE = readFileSync(
  new URL("../src/host/aidos-core.ts", import.meta.url).pathname,
  "utf8",
);

/**
 * A mirror of the guard's extractor (tests/459-write-path-guard.test.ts).
 * Enforcement lives there; this copy exists so the kill proof evaluates the
 * mutant string with the same windows. If the source shape changes, the
 * marker self-check throws here too — drift fails safe, never silent.
 */
function decommented(src: string): string {
  let out = "";
  let i = 0;
  const stack: string[] = [];
  while (i < src.length) {
    const top = stack[stack.length - 1];
    const two = src.slice(i, i + 2);
    if (top === "//") {
      if (src[i] === "\n") {
        stack.pop();
        out += "\n";
      }
      i += 1;
      continue;
    }
    if (top === "/*") {
      if (two === "*/") {
        stack.pop();
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    if (top === "'" || top === '"') {
      out += src[i];
      if (src[i] === "\\") {
        out += src[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (src[i] === top) stack.pop();
      i += 1;
      continue;
    }
    if (top === "`") {
      if (two === "${") {
        stack.push("${");
        out += two;
        i += 2;
        continue;
      }
      out += src[i];
      if (src[i] === "\\") {
        out += src[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (src[i] === "`") stack.pop();
      i += 1;
      continue;
    }
    if (top === "${") {
      if (src[i] === "}") {
        stack.pop();
        out += "}";
        i += 1;
        continue;
      }
    }
    if (two === "//") {
      stack.push("//");
      i += 2;
      continue;
    }
    if (two === "/*") {
      stack.push("/*");
      i += 2;
      continue;
    }
    if (src[i] === "'" || src[i] === '"' || src[i] === "`") {
      stack.push(src[i]);
      out += src[i];
      i += 1;
      continue;
    }
    if (two === "${" && stack[stack.length - 1] === "`") {
      stack.push("${");
      out += two;
      i += 2;
      continue;
    }
    out += src[i];
    i += 1;
  }
  return out;
}

/** The balanced body of one class member, from its definition line. */
function methodBody(src: string, name: string, marker: string): string {
  const start = src.search(new RegExp(`\n  (?:private |async )*${name}\\s*\\(`));
  if (start < 0) throw new Error(`mutant-proof: member ${name} not found`);
  let i = start;
  let depth = 0;
  let seen = false;
  let inStr: string | null = null;
  const scanString = (): void => {
    if (inStr === null && (src[i] === "'" || src[i] === '"' || src[i] === "`")) {
      inStr = src[i];
    } else if (inStr !== null && src[i] === inStr && src[i - 1] !== "\\") {
      inStr = null;
    }
  };
  for (; i < src.length; i += 1) {
    scanString();
    if (inStr !== null) continue;
    if (src[i] === "(") {
      depth += 1;
      seen = true;
    } else if (src[i] === ")") {
      depth -= 1;
      if (seen && depth === 0) break;
    }
  }
  let open = -1;
  let s: string | null = null;
  const prevNonSpace = (pos: number): { prev: string; prevPrev: string } => {
    let k = pos - 1;
    while (k > i && /\s/.test(src[k]!)) k -= 1;
    return { prev: src[k] ?? "", prevPrev: src[k - 1] ?? "" };
  };
  const isIdent = (c: string): boolean => /[_$a-zA-Z0-9]/.test(c);
  let j = i;
  while (j < src.length) {
    while (j < src.length) {
      const c = src[j]!;
      if (s !== null) {
        if (c === s && src[j - 1] !== "\\") s = null;
        j += 1;
        continue;
      }
      if (c === "'" || c === '"' || c === "`") {
        s = c;
        j += 1;
        continue;
      }
      if (c === "{") break;
      j += 1;
    }
    if (j >= src.length) break;
    const { prev, prevPrev } = prevNonSpace(j);
    if (
      prev === ")" ||
      prev === "}" ||
      (prev === ">" && prevPrev !== "=") ||
      isIdent(prev)
    ) {
      open = j;
      break;
    }
    let brace = 0;
    for (; j < src.length; j += 1) {
      const c = src[j]!;
      if (s !== null) {
        if (c === s && src[j - 1] !== "\\") s = null;
        continue;
      }
      if (c === "'" || c === '"' || c === "`") {
        s = c;
        continue;
      }
      if (c === "{") brace += 1;
      else if (c === "}") {
        brace -= 1;
        if (brace === 0) break;
      }
    }
    j += 1;
  }
  if (open < 0) throw new Error(`mutant-proof: body open for ${name} not found`);
  let brace = 0;
  s = null;
  for (let k = open; k < src.length; k += 1) {
    const c = src[k]!;
    if (s !== null) {
      if (c === s && src[k - 1] !== "\\") s = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      s = c;
      continue;
    }
    if (c === "{") brace += 1;
    else if (c === "}") {
      brace -= 1;
      if (brace === 0) {
        const body = src.slice(start, k + 1);
        if (!body.includes(marker)) {
          throw new Error(
            `mutant-proof: window for ${name} misses its marker ${JSON.stringify(marker)}`,
          );
        }
        return body;
      }
    }
  }
  throw new Error(`mutant-proof: body close for ${name} not found`);
}

/** Entry → the marker proving the window is right (mirrors the guard). */
const ENTRIES: [string, string][] = [
  ["requestAllowlist", "too many pending allowlist requests"],
  ["suggestActions", "previouslyDismissed"],
  ["setTicket", "this._createTicket(agent, args"],
  ["agentAttachEvidence", "this._attachEvidence(routed"],
  ["agentMoveTicket", "this._moveTicket(routed"],
  ["agentAddComment", "this._addComment(routed"],
  ["attachCommit", "this._attachCommitEvidence("],
  ["agentAttachTags", "createdTags"],
  ["recentChanges", "NOT recoverable here"],
  ["userSetTicket", "this._createTicket(agent, args"],
  ["userMoveTicket", "this._moveTicket(this._routedAgent"],
];

function markerOf(name: string): string {
  const found = ENTRIES.find((row) => row[0] === name);
  if (found === undefined) throw new Error(`mutant-proof: no marker for ${name}`);
  return found[1];
}

/** Mirrors ROUTED_USE in the guard: [entry, required fragments, banned raw-agent call]. */
const ROUTED_USE: [string, string[], string][] = [
  ["setTicket", ["this._editTicket(routed,"], "this._editTicket(agent,"],
  ["agentAttachEvidence", ["this._attachEvidence(routed,"], "this._attachEvidence(agent,"],
  ["agentMoveTicket", ["this._moveTicket(routed,"], "this._moveTicket(agent,"],
  ["agentAddComment", ["this._addComment(routed,"], "this._addComment(agent,"],
  ["userSetTicket", ["this._editTicket(this._routedAgent("], "this._editTicket(agent,"],
  ["userMoveTicket", ["this._moveTicket(this._routedAgent("], "this._moveTicket(agent,"],
  ["attachCommit", ["this._attachCommitEvidence(", "this._routedAgent(agent, args.ticketId)"], "this._attachCommitEvidence(agent,"],
  ["agentAttachTags", ["this._applyTags(routed,"], "this._applyTags(agent,"],
  ["requestAllowlist", ["this._cache(routed.session)"], "this._cache(agent.session)"],
  ["suggestActions", ["this._cache(routed.session)"], "this._cache(agent.session)"],
  ["recentChanges", ["this._routedAgent(reader, args.ticketId)"], "this._cache(agent.session)"],
];

/** Mirrors DESTRUCTURED_ROUTED in the guard. */
const DESTRUCTURED_ROUTED = [
  "setTicket",
  "agentAttachEvidence",
  "agentMoveTicket",
  "agentAddComment",
];

const RAW_AGENT_WRITE =
  /this\._(?:editTicket|attachEvidence|moveTicket|addComment|applyTags|attachCommitEvidence)\(\s*agent\s*,/;

/** The hardened guard's three predicates, evaluated against any source string. */
function routedUseHolds(src: string): boolean {
  try {
    const code = decommented(src);
    return ROUTED_USE.every(([name, mustAll, mustNot]) => {
      const body = methodBody(code, name, markerOf(name));
      return mustAll.every((m) => body.includes(m)) && !body.includes(mustNot);
    });
  } catch {
    // A mutant that deletes the marker text itself breaks the window — the
    // guard errors red on it rather than passing silently, which is still a
    // kill. Report it as not-holding here.
    return false;
  }
}

function noAliasRebuildHolds(src: string): boolean {
  try {
    const code = decommented(src);
    return DESTRUCTURED_ROUTED.every((name) => {
      const body = methodBody(code, name, markerOf(name));
      return !body.includes("agent.session") && !body.includes("...agent");
    });
  } catch {
    return false;
  }
}

function noRawAgentWriteHolds(src: string): boolean {
  return !RAW_AGENT_WRITE.test(decommented(src));
}

function oldSpellingHolds(src: string): boolean {
  const code = decommented(src);
  return ENTRIES.every(([name, marker]) => {
    const body = methodBody(code, name, marker);
    return body.includes("_routedAgent(") || body.includes("_routeWriteToTicket(");
  });
}

// ---- the mutants ----

/**
 * The reviewer's probe, derived from the shipped source in memory: keep the
 * routing call, discard its result, rebuild an unrouted handle through a
 * session alias. The destructured route line is identical at all four agent
 * write entries, so one replace-all carries the defect into every one.
 */
const ROUTE_LINE =
  "const { routed } = this._routeWriteToTicket(agent, args.ticketId);";
const ALIAS_REBUILD =
  "const { routed: _unused } = this._routeWriteToTicket(agent, args.ticketId);\n" +
  "      const sess = agent.session;\n" +
  "      const routed = { ...agent, session: sess };";

function applyShadowMutant(src: string): { mutant: string; sites: number } {
  const sites = src.split(ROUTE_LINE).length - 1;
  return { mutant: src.split(ROUTE_LINE).join(ALIAS_REBUILD), sites };
}

/**
 * The cruder sibling: route, then pass the raw caller handle to the write
 * anyway. No alias to ban — this is the shape the use-check exists for.
 */
const RAW_SWAPS: [string, string][] = [
  ["this._editTicket(routed, args, \"agent\")", "this._editTicket(agent, args, \"agent\")"],
  ["this._attachEvidence(routed, args, \"agent\")", "this._attachEvidence(agent, args, \"agent\")"],
  ["this._moveTicket(routed, args, \"agent\")", "this._moveTicket(agent, args, \"agent\")"],
  ["this._addComment(routed, args, \"agent\")", "this._addComment(agent, args, \"agent\")"],
];

function applyRawMutant(src: string): { mutant: string; sites: number } {
  let mutant = src;
  let sites = 0;
  for (const [from, to] of RAW_SWAPS) {
    sites += mutant.split(from).length - 1;
    mutant = mutant.split(from).join(to);
  }
  return { mutant, sites };
}

// ---- the kill proof ----

describe("#466 the route-then-ignore mutant fails the hardened guard", () => {
  it("the shadow mutant derives from the shipped source at exactly four sites", () => {
    const { mutant, sites } = applyShadowMutant(CORE);
    expect(sites).toBe(4);
    expect(mutant).toContain("const sess = agent.session;");
    expect(mutant).toContain("const routed = { ...agent, session: sess };");
  });

  it("the raw mutant derives from the shipped source at exactly four sites", () => {
    const { mutant, sites } = applyRawMutant(CORE);
    expect(sites).toBe(4);
    expect(mutant).toContain("this._editTicket(agent, args, \"agent\")");
  });

  it("the old spelling check is blind to the shadow mutant (why #466 exists)", () => {
    const { mutant } = applyShadowMutant(CORE);
    // The routing call is still there in every entry — the pre-#466 guard
    // passed this tree while the defect was live.
    expect(oldSpellingHolds(mutant)).toBe(true);
  });

  it("the hardened predicates hold on the shipped source", () => {
    expect(routedUseHolds(CORE)).toBe(true);
    expect(noAliasRebuildHolds(CORE)).toBe(true);
    expect(noRawAgentWriteHolds(CORE)).toBe(true);
  });

  it("the alias ban kills the shadow mutant (and only it needs to)", () => {
    const { mutant } = applyShadowMutant(CORE);
    // The shadow keeps the `this._editTicket(routed,` spelling — the
    // use-check honestly still passes on it; the alias rebuild is what gives
    // it away, twice over (`agent.session` and the `...agent` spread).
    expect(routedUseHolds(mutant)).toBe(true);
    expect(noAliasRebuildHolds(mutant)).toBe(false);
  });

  it("the use-check kills the raw mutant (and the global catches it too)", () => {
    const { mutant } = applyRawMutant(CORE);
    // No alias here — but the mutant deletes the `...(routed,` marker text
    // the entry windows self-check on, so the alias predicate reports false
    // through its fail-loud path as well. Overdetermined red: every half of
    // the hardened guard breaks the build on this tree.
    expect(routedUseHolds(mutant)).toBe(false);
    expect(noRawAgentWriteHolds(mutant)).toBe(false);
  });
});

// ---- the behavioural anchor: the seam this file reasons about is live ----

type Harness = ReturnType<typeof createHarness>;

/** One owner session holding a ticket, plus a stranger that created nothing. */
function foreignSetup(): {
  harness: Harness;
  owner: ReturnType<Harness["makeAgent"]>;
  stranger: ReturnType<Harness["makeAgent"]>;
  ticketId: number;
} {
  const ws = mkdtempSync(join(tmpdir(), "ws466-"));
  mkdirSync(join(ws, "src"), { recursive: true });
  const harness = createHarness(undefined, { cwd: ws });
  harness.installService();
  const svc = harness.service;
  const owner = harness.makeAgent({ id: "owner-session" });
  const stranger = harness.makeAgent({ id: "stranger-session" });
  const ticket = svc.setTicket(harness.asAgent(owner), { title: "Foreign ticket" });
  return { harness, owner, stranger, ticketId: ticket.id };
}

describe("#466 the routing seam is live on the shipped service", () => {
  it("a stranger's edit lands on a ticket it did not create", () => {
    const { harness, owner, stranger, ticketId } = foreignSetup();
    const svc = harness.service;
    const row = svc.setTicket(harness.asAgent(stranger), {
      ticketId,
      description: "edited by a session that did not create this ticket",
    });
    expect(row.id).toBe(ticketId);
    const read = svc.getTicket(harness.asAgent(owner), { ticketId });
    expect(read.ticket.description).toBe(
      "edited by a session that did not create this ticket",
    );
  });

  it("a write to a truly unknown id still refuses", () => {
    const { harness, stranger } = foreignSetup();
    const svc = harness.service;
    const strangerAgent = harness.asAgent(stranger);
    expect(() =>
      svc.setTicket(strangerAgent, { ticketId: 999999, description: "ghost" }),
    ).toThrow(/no such ticket|unknown ticket/);
    expect(() =>
      svc.agentAttachEvidence(strangerAgent, {
        ticketId: 999999,
        kind: "builtin:test_run",
        payload: {},
      }),
    ).toThrow(/no such ticket|unknown ticket/);
  });
});
