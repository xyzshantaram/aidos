/**
 * Ticket #459, criterion 5: the regression guard.
 *
 * Fails the build if any board write path resolves a ticket id through the
 * calling session's own fold (`_cache(agent.session).state.tickets`) instead
 * of the workspace board. Two halves:
 *
 * 1. No occurrence of the caller-fold ticket lookup anywhere in the
 *    decommented service source. The fixed code reads tickets through a
 *    routed owner handle (`_cache(routed.session)`, `_cache(owner.session)`)
 *    or a bound `cache` variable, so the literal's return means the defect
 *    is back, wherever it hides.
 * 2. Every board write entry resolves through `_routedAgent` and never
 *    touches the caller's fold directly. Some entries delegate (setTicket
 *    hands to _editTicket), so the absence of the literal alone would not
 *    catch a reintroduction there — the routing call is the tripwire.
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
});
