/**
 * #183: every aidos tool-call card failed to register, on every client load.
 *
 * `tool.call.toolview` is a CHILD slot, declared by the tool-call chat-node
 * entry's children table in dsh-client-ui-tool. `registerScratchRows` called
 * `slots.register` DIRECTLY at apply time, which raced that declaration and
 * threw `slot "tool.call.toolview" is not declared` for all sixteen rows.
 * The per-row catch turned the total outage into console lines nobody acted
 * on, and every board tool rendered as a raw JSON envelope.
 *
 * The fix wraps each registration in `slots.inject(...)` — the documented
 * pattern, and the one dsh-client-ui-tool itself uses for this exact slot.
 *
 * These tests drive the REAL `registerScratchRows` against a fake registry
 * whose semantics mirror SlotRegistry's contract (dsh-client-runtime
 * slots.d.ts): `register` throws while the slot is undeclared; `inject`
 * runs its callback synchronously when declared and defers it into the
 * declaration otherwise; the inject disposer cancels a pending wait.
 *
 * THE ANTI-MUTATION TEST is the first one: remove the inject wrapper and
 * every register call throws at apply time, the catch eats it, and zero
 * rows ever land — the assertion that all sixteen entries exist after the
 * declaration arrives is exactly what the shipped bug failed.
 */
import { describe, expect, it } from "vitest";

import { registerScratchRows } from "../src/client/index";
import { AIDOS_ROWS } from "../src/client/aidos-rows";
import { SCRATCH_ROWS } from "../src/client/scratch-rows";

const ROW_NAMES = [...SCRATCH_ROWS, ...AIDOS_ROWS].map(([key]) => key);
const ROW_COUNT = ROW_NAMES.length;

/** One registry fake per test; mirrors the SlotRegistry face we consume. */
function fakeRegistry(options: { failRegister?: boolean } = {}) {
  const entries: Array<{ key: string; priority: number }> = [];
  const disposedKeys: string[] = [];
  let declared = false;
  const pending: Array<() => void> = [];

  const registry = {
    register(spec: { key: string; priority: number }, _component: unknown) {
      if (!declared) {
        throw new Error(
          'slot "tool.call.toolview" is not declared (a parent entry\'s ' +
            "children table must declare it)",
        );
      }
      if (options.failRegister) throw new Error("duplicate child declaration");
      entries.push({ key: spec.key, priority: spec.priority });
      return () => {
        disposedKeys.push(spec.key);
      };
    },
    inject(_key: string, callback: () => () => void): () => void {
      // Mirrors SlotRegistry.inject: the returned disposer covers BOTH the
      // pending wait and the active registration the callback created.
      let active: (() => void) | undefined;
      const run = () => {
        const effect = callback();
        if (typeof effect === "function") active = effect;
      };
      if (declared) run();
      else pending.push(run);
      return () => {
        const at = pending.indexOf(run);
        if (at >= 0) pending.splice(at, 1);
        active?.();
      };
    },
    declare() {
      declared = true;
      for (const callback of [...pending]) callback();
      pending.length = 0;
    },
  };
  return {
    registry,
    entries,
    disposedKeys,
    declare: () => registry.declare(),
    pendingCount: () => pending.length,
  };
}

describe("#183 the tool rows wait for the tool.call.toolview declaration", () => {
  it("registers every row only once the child slot is declared", () => {
    const fake = fakeRegistry();
    const dispose = registerScratchRows(fake.registry as never);
    // Before the declaration: nothing thrown, nothing registered, all
    // sixteen waits pending.
    expect(fake.entries).toHaveLength(0);
    expect(fake.pendingCount()).toBe(ROW_COUNT);

    // The parent chat-node entry declares the children table.
    fake.declare();

    // THE ANTI-MUTATION ASSERTION. Without the inject wrapper every
    // register call threw at apply time, the catch ate it, and this stayed
    // zero -- the exact shipped bug.
    expect(fake.entries).toHaveLength(ROW_COUNT);
    expect(fake.entries.map((entry) => entry.key).sort()).toEqual(
      [...ROW_NAMES].sort(),
    );
    dispose();
  });

  it("keeps per-tool-name rows at priority -100", () => {
    const fake = fakeRegistry();
    const dispose = registerScratchRows(fake.registry as never);
    fake.declare();
    for (const entry of fake.entries) {
      expect(entry.priority).toBe(-100);
    }
    // Per-NAME rows, never one whole-node row: sixteen distinct keys.
    expect(new Set(fake.entries.map((entry) => entry.key)).size).toBe(ROW_COUNT);
    dispose();
  });

  it("declared-already registers synchronously, as inject promises", () => {
    const fake = fakeRegistry();
    fake.declare();
    const dispose = registerScratchRows(fake.registry as never);
    expect(fake.entries).toHaveLength(ROW_COUNT);
    dispose();
  });
});

describe("#183 disposal survives the inject wrapper", () => {
  it("disposing after registration unregisters every row", () => {
    const fake = fakeRegistry();
    const dispose = registerScratchRows(fake.registry as never);
    fake.declare();
    expect(fake.entries).toHaveLength(ROW_COUNT);
    dispose();
    expect(fake.disposedKeys.sort()).toEqual([...ROW_NAMES].sort());
  });

  it("disposing before the declaration cancels the waits, so nothing registers late", () => {
    const fake = fakeRegistry();
    const dispose = registerScratchRows(fake.registry as never);
    expect(fake.pendingCount()).toBe(ROW_COUNT);
    dispose();
    fake.declare();
    expect(fake.entries).toHaveLength(0);
  });
});

describe("#183 a TOTAL registration failure is loud", () => {
  it("throws when the slot is already declared and every row fails", () => {
    const fake = fakeRegistry({ failRegister: true });
    fake.declare();
    // The shipped code warned sixteen times and returned a no-op disposer.
    // Zero of N registered is the outage itself and must reach the caller.
    expect(() => registerScratchRows(fake.registry as never)).toThrow(
      /all \d+ tool rows failed to register/,
    );
  });

  it("still isolates a PARTIAL failure: the other rows continue", () => {
    const fake = fakeRegistry();
    fake.declare();
    // Sabotage one key so exactly one register throws.
    const realRegister = fake.registry.register.bind(fake.registry);
    fake.registry.register = (spec: { key: string; priority: number }, c: unknown) => {
      if (spec.key === "get_tickets") throw new Error("one bad row");
      return realRegister(spec, c);
    };
    const dispose = registerScratchRows(fake.registry as never);
    expect(fake.entries).toHaveLength(ROW_COUNT - 1);
    expect(fake.entries.map((entry) => entry.key)).not.toContain("get_tickets");
    dispose();
  });
});
