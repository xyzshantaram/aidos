/**
 * Shared setup helpers for the ported tests. No test logic here.
 *
 * The kernel reads kinds and gates from one AidosConfig value injected at
 * store construction. The log never carries a config event, so there is no
 * registerKind, no setKindWeight, and no setGate on the store. These helpers
 * build configs and stores, and replay one log into a fresh store, which is
 * the reopen equivalent of the prototype.
 */

import { expect } from "vitest";

import { BUILTIN_KINDS } from "../src/kernel/constants";
import type { AidosEvent } from "../src/kernel/events";
import { Store, type StoreOptions } from "../src/kernel/store";
import type { AidosConfig, KindDef } from "../src/kernel/types";
import {
  EvidenceAuthorRefused,
  GateRefused,
  UnknownKind,
} from "../src/kernel/types";

/** One fixed wall clock, seconds as a float. Deterministic tests only. */
export const FIXED_NOW = 1000.0;

/** The store-level subset of the builtin kinds, in helpers.py order. */
const STORE_KIND_IDS = [
  "builtin:user_signoff",
  "builtin:eval_criteria",
  "builtin:file_allowlist",
  "builtin:agent_report",
  "builtin:comment",
  "builtin:review_pass",
  "builtin:after_shot",
] as const;

/**
 * The 7-kind store-level subset that the store tests use. The weights and
 * the descriptions come from BUILTIN_KINDS, the one constant table, so the
 * subset cannot drift from it.
 */
export function defaultKinds(): KindDef[] {
  const byId = new Map(BUILTIN_KINDS.map((kind) => [kind.id, kind]));
  return STORE_KIND_IDS.map((id) => {
    const kind = byId.get(id);
    if (!kind) {
      throw new Error(`default kind ${id} is missing from BUILTIN_KINDS`);
    }
    return { ...kind };
  });
}

/** One config with the given kinds and no gates. */
export function makeConfig(kinds?: KindDef[]): AidosConfig {
  return { kinds: kinds ?? defaultKinds(), gates: [] };
}

/**
 * A fresh store with a fixed clock, so wall-clock floats never make an
 * assertion fragile. Pass options.now to override the clock.
 */
export function makeStore(config?: AidosConfig, options?: StoreOptions): Store {
  const now = options?.now ?? (() => FIXED_NOW);
  return new Store(config ?? makeConfig(), { ...options, now });
}

/** Replay one log into a fresh store built with the same config. */
export function storeFromLog(
  log: readonly AidosEvent[],
  config?: AidosConfig,
): Store {
  return new Store(config ?? makeConfig(), { log: [...log] });
}

type ErrorClass<T extends Error> = new (...args: never[]) => T;

/**
 * Run one call, assert that it throws the given error class, and return
 * the thrown error, so the test can read its fields.
 */
export function expectThrows<T extends Error>(
  fn: () => void,
  ctor: ErrorClass<T>,
): T {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ctor);
  return caught as T;
}

/** Assert one call throws GateRefused and return the refusal. */
export function expectGateRefused(fn: () => void): GateRefused {
  return expectThrows(fn, GateRefused);
}

/** Assert one call throws UnknownKind and return the error. */
export function expectUnknownKind(fn: () => void): UnknownKind {
  return expectThrows(fn, UnknownKind);
}

/** Assert one call throws EvidenceAuthorRefused and return the error. */
export function expectEvidenceAuthorRefused(
  fn: () => void,
): EvidenceAuthorRefused {
  return expectThrows(fn, EvidenceAuthorRefused);
}

/** The order-free equality that Python's assertCountEqual asserts. */
export function expectSameItems(actual: string[], expected: string[]): void {
  expect([...actual].sort()).toEqual([...expected].sort());
}
