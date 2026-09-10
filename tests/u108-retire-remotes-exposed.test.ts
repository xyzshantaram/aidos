/**
 * #108 follow-up (user report 2026-09-10): retiring a ticket answered HTTP
 * 404 — `userRetireTicket` and `userUnretireTicket` were plain host methods
 * with no `@Remote` decorator, so the gateway had no route for the names the
 * client calls. The RetireDialog comment even called it "the host's
 * userRetireTicket Remote" while it was no such thing.
 *
 * Same bug class as u93 (a wire-level remote mistake invisible to tsc and to
 * any unit test that calls the method directly): only the gateway cares
 * whether the decorator exists, so only a source scan can pin it.
 *
 * The rule: every name the client passes to `callAidosRemote` — single-line
 * or split across lines — must have a matching `@Remote("name")` on the
 * host. A new client call without its decorator fails this suite instead of
 * failing the human at click time with a toast refusal.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CLIENT_DIR = new URL("../src/client/", import.meta.url).pathname;
const HOST_SOURCE = new URL("../src/host/aidos-core.ts", import.meta.url).pathname;

function clientCalledNames(): string[] {
  const names = new Set<string>();
  for (const file of readdirSync(CLIENT_DIR)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const source = readFileSync(join(CLIENT_DIR, file), "utf8");
    // The name may sit on the next line (see RetireDialog's confirm()).
    for (const match of source.matchAll(/callAidosRemote\(\s*"([^"]+)"/g)) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

function hostExposedNames(): Set<string> {
  const source = readFileSync(HOST_SOURCE, "utf8");
  const names = new Set<string>();
  for (const match of source.matchAll(/@Remote\("([^"]+)"\)/g)) {
    names.add(match[1]);
  }
  return names;
}

describe("every client-called remote is exposed on the host", () => {
  it("no callAidosRemote name lacks its @Remote decorator", () => {
    const exposed = hostExposedNames();
    const missing = clientCalledNames().filter((name) => !exposed.has(name));
    expect(
      missing,
      "these remotes are called by the client but the gateway has no route for them (HTTP 404 at click time): " +
        missing.join(", "),
    ).toEqual([]);
  });

  it("the retire pair that hit this is exposed", () => {
    const exposed = hostExposedNames();
    expect(exposed.has("userRetireTicket")).toBe(true);
    expect(exposed.has("userUnretireTicket")).toBe(true);
  });
});
