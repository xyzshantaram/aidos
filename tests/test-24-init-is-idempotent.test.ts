/**
 * Item 24. Two runs of init leave the same kinds, gates, and project.
 *
 * The CLI's init idempotency ports as "the default config is
 * deterministic". The kernel has one constant table, and every store built
 * from it exposes exactly that config. The claims that a second init
 * creates no second project and keeps the tickets are B1 tool tests.
 */

import { describe, expect, it } from "vitest";

import {
  BUILTIN_KINDS,
  DEFAULT_CONFIG,
  DEFAULT_GATES,
} from "../src/kernel/constants";
import { makeStore } from "./helpers";

describe("init is idempotent", () => {
  it("the default config is deterministic", () => {
    const first: typeof DEFAULT_CONFIG = {
      kinds: [...BUILTIN_KINDS],
      gates: [...DEFAULT_GATES],
      injectEnabled: true,
      injectDebounceMs: 30000,
    };
    expect(first).toEqual(DEFAULT_CONFIG);
    expect(JSON.parse(JSON.stringify(DEFAULT_CONFIG))).toEqual(DEFAULT_CONFIG);
  });

  it("a store built from the constants exposes the default config", () => {
    const store = makeStore(DEFAULT_CONFIG);
    expect(store.config).toEqual(DEFAULT_CONFIG);
    expect(store.config.kinds).toEqual([...BUILTIN_KINDS]);
    expect(store.config.gates).toEqual([...DEFAULT_GATES]);
  });
});
