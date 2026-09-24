/**
 * Ticket #459, criterion 5: the regression guard — hardened by #466.
 *
 * What this guard proves, honestly:
 *
 * - Every listed write entry CALLS the routing seam AND threads the routed
 *   handle into the call that performs the write. A route-then-ignore body —
 *   call the router, discard its result, rebuild an unrouted handle through a
 *   session alias — fails it (the pre-#466 guard passed such a mutant 23/23).
 * - A NEW entry that hands the raw `agent` to a known write helper fails the
 *   name-agnostic half without anyone adding the entry to the list.
 *
 * What it does NOT prove:
 *
 * - That the routed handle is CORRECT (that the router resolves to the owning
 *   session) — only that each entry uses what the router returned. The
 *   router's correctness is proved behaviourally by
 *   tests/459-foreign-session-writes.test.ts, which is the backstop: if this
 *   guard and that suite ever disagree, believe the suite.
 * - Coverage of a brand-new write HELPER (a new seam beside _editTicket and
 *   friends) — the name-agnostic half bans the known shapes, not unknown
 *   ones; a new seam needs a new assertion.
 *
 * Method windows are extracted by brace balance from the member definition
 * and self-check with a per-entry marker: a wrong window fails loudly
 * rather than passing silently.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const CORE = readFileSync(
  new URL("../src/host/aidos-core.ts", import.meta.url).pathname,
  "utf8",
);

/** The service source with every comment stripped (strings kept intact). */
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
      // Fall through: code inside ${...} is scanned as code.
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
  if (start < 0) throw new Error(`guard: member ${name} not found`);
  let i = start;
  // Past the parameter list.
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
  // The body opens at the first "{" past the signature that opens the
  // body rather than a return-type literal: one preceded by ")", "}" or a
  // generic ">" (never "=>" ), or by an identifier char (a bare `Foo {`
  // after the colon is the body — a type literal never opens there).
  // Anything else opens a type literal and is skipped by balance.
  // A second pass with its own string tracking (the parameter scan above
  // leaves its tracker behind).
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
    // Next "{" outside strings.
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
    // A return-type literal: skip to its match and keep looking.
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
  if (open < 0) throw new Error(`guard: body open for ${name} not found`);
  // Balance to the matching close.
  let brace = 0;
  s = null;
  for (let j = open; j < src.length; j += 1) {
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
      if (brace === 0) {
        const body = src.slice(start, j + 1);
        if (!body.includes(marker)) {
          throw new Error(
            `guard: window for ${name} misses its marker ${JSON.stringify(marker)} — fix the extractor, not the source`,
          );
        }
        return body;
      }
    }
  }
  throw new Error(`guard: body close for ${name} not found`);
}

const CODE = decommented(CORE);

/** Entry → a string its body must contain (proves the window is right). */
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

/** Entry → its marker, for tables that extend ENTRIES without restating it. */
function markerOf(name: string): string {
  const found = ENTRIES.find((row) => row[0] === name);
  if (found === undefined) throw new Error(`guard: no marker for ${name}`);
  return found[1];
}

/**
 * #466: the routed handle must be the one USED, not merely obtained. The
 * reviewer's route-then-ignore mutant calls `_routeWriteToTicket` and then
 * rebuilds an unrouted handle through a session alias — so "contains a
 * routing call" passes on it while the defect is live. Each entry below must
 * thread the routed handle into the call that performs the write: the
 * must-contain spelling takes `routed` (or routes inline in the receiver
 * argument, where route-then-ignore is impossible by construction), and the
 * must-not spelling hands the raw `agent` parameter to the same helper.
 */
const ROUTED_USE: [string, string[], string][] = [
  // [entry, fragments the write call must contain, the same call with raw `agent`]
  ["setTicket", ["this._editTicket(routed,"], "this._editTicket(agent,"],
  ["agentAttachEvidence", ["this._attachEvidence(routed,"], "this._attachEvidence(agent,"],
  ["agentMoveTicket", ["this._moveTicket(routed,"], "this._moveTicket(agent,"],
  ["agentAddComment", ["this._addComment(routed,"], "this._addComment(agent,"],
  ["userSetTicket", ["this._editTicket(this._routedAgent("], "this._editTicket(agent,"],
  ["userMoveTicket", ["this._moveTicket(this._routedAgent("], "this._moveTicket(agent,"],
  // attachCommit wraps the receiver onto the next line, so the use is two
  // fragments: the helper call and the route inside its receiver argument.
  ["attachCommit", ["this._attachCommitEvidence(", "this._routedAgent(agent, args.ticketId)"], "this._attachCommitEvidence(agent,"],
  ["agentAttachTags", ["this._applyTags(routed,"], "this._applyTags(agent,"],
  ["requestAllowlist", ["this._cache(routed.session)"], "this._cache(agent.session)"],
  ["suggestActions", ["this._cache(routed.session)"], "this._cache(agent.session)"],
  ["recentChanges", ["this._routedAgent(reader, args.ticketId)"], "this._cache(agent.session)"],
];

/**
 * #466: the entries that destructure `routed` from `_routeWriteToTicket` must
 * have no other way to build a handle. The reviewer's mutant rebuilds one via
 * `agent.session` (`const sess = agent.session; const routed = { ...agent,
 * session: sess }`) — either half of that rebuild fails this test, so the
 * mutant fails twice over. None of these bodies reads `agent.session` or
 * spreads `agent` today; the legitimate `agent` uses (the route call itself,
 * the create branch) stay untouched.
 */
const DESTRUCTURED_ROUTED = [
  "setTicket",
  "agentAttachEvidence",
  "agentMoveTicket",
  "agentAddComment",
];

/**
 * #466, criterion 2: a NEW write entry that resolves through the caller fold
 * is caught without anyone adding it to ENTRIES. Any call that hands the raw
 * `agent` parameter to a ticket-write helper anywhere in the service breaks
 * the build — routing first is the only way to hold a handle those helpers
 * accept. Creates (`_createTicket`) and plan-meta (`_setPlanMeta`) are
 * deliberately outside this list: with no ticket id there is nothing to
 * route.
 */
const RAW_AGENT_WRITE =
  /this\._(?:editTicket|attachEvidence|moveTicket|addComment|applyTags|attachCommitEvidence)\(\s*agent\s*,/;

describe("#459 no board write path reads the caller's own fold", () => {
  it("the caller-fold ticket lookup appears nowhere in the service", () => {
    expect(CODE).not.toContain("_cache(agent.session).state.tickets");
  });

  it.each(ENTRIES)("%s routes through the workspace board", (name, marker) => {
    // Either the routing seam itself or the write-side helper built on it.
    const body = methodBody(CODE, name, marker);
    expect(body.includes("_routedAgent(") || body.includes("_routeWriteToTicket(")).toBe(true);
  });

  it.each(ENTRIES)("%s never touches the caller's fold directly", (name, marker) => {
    const body = methodBody(CODE, name, marker);
    expect(body).not.toContain("_cache(agent.session)");
  });

  it.each(ROUTED_USE)(
    "%s threads the routed handle into the write",
    (name, mustAll, mustNot) => {
      const marker = markerOf(name);
      const body = methodBody(CODE, name, marker);
      for (const must of mustAll) expect(body).toContain(must);
      expect(body).not.toContain(mustNot);
    },
  );

  it.each(DESTRUCTURED_ROUTED)(
    "%s builds no handle except the router's",
    (name) => {
      const marker = markerOf(name);
      const body = methodBody(CODE, name, marker);
      expect(body).not.toContain("agent.session");
      expect(body).not.toContain("...agent");
    },
  );

  it("no write-helper call anywhere in the service takes the raw agent", () => {
    expect(CODE).not.toMatch(RAW_AGENT_WRITE);
  });
});
