/**
 * #114 round 3 (2026-09-05). The independent reviewer verified both round-2
 * fixes held, then reproduced the LITERAL reported symptom through a detour
 * the round-2 tests never drove:
 *
 *   A(aidos, 3) -> non-aidos chat -> back to A -> aidos B, board unopened
 *   => B's tab header still said "Tickets (3)".
 *
 * Cause: reconcile() registers the tab but never updated `lastLabel`, so
 * the badge callback's `next === lastLabel` guard compared against a label
 * the header stopped showing sessions ago. The same stale guard also
 * stopped the suffix from ever clearing.
 *
 * These tests drive the REAL apply() from src/client/index.ts with a fake
 * slot registry and sessions store -- the same harness shape the reviewer
 * built -- because the defect lives in the WIRING between reconcile, the
 * badge callback, and setCurrentSession, and no unit-level view-state test
 * can see it. (This is the lesson of the round-1 source-greps: spelling is
 * not behaviour.)
 *
 * They also pin reviewer advisory 2: switching to a non-aidos session must
 * not mount a LocalTicketView microseconds before disposing it -- the
 * bump-driven re-register ran while `want` still held the previous
 * session's value, paying the #100 remount cost for a session that must
 * not have the tab at all.
 */
import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/client/index";
import {
  __resetBadgeStateForTests,
  badgeLabel,
  reportCount,
  setCurrentSession,
  setCountCallback,
  setRemountSuppressed,
} from "../src/client/view-state";

/** The tickets-tab entry the real apply() registers, as the header sees it. */
interface TabEntry {
  id: string;
  label: () => string;
}

/**
 * The fake runtime apply() needs. `effect` runs immediately (Cordis effects
 * run their callback synchronously on creation); `get` answers the two
 * services the plugin injects or reaches for.
 */
function fakeRuntime() {
  const ticketsRegistrations: TabEntry[] = [];
  const scratchRegistrations: number[] = [];
  // The label the tab header currently displays: the newest live entry.
  let live: TabEntry | null = null;

  const slots = {
    inject(_slot: string, register: () => () => void) {
      return register();
    },
    register(entry: { id?: string; label?: () => string }) {
      const tab: TabEntry = { id: entry.id ?? "?", label: entry.label ?? (() => "") };
      if (tab.id === "tickets") {
        ticketsRegistrations.push(tab);
        live = tab;
        return () => {
          if (live === tab) live = null;
        };
      }
      scratchRegistrations.push(tab);
      return () => {};
    },
  };

  const sessions = {
    list: {
      getSnapshot: () => snapshot,
      subscribe: (fn: () => void) => {
        listeners.push(fn);
        return () => {};
      },
    },
  };

  let snapshot: {
    current: string | null;
    byId: Record<string, { agentPreset?: string }>;
  } = { current: null, byId: {} };
  const listeners: Array<() => void> = [];

  const ctx = {
    effect(fn: () => () => void) {
      fn();
      return () => {};
    },
    get(name: string) {
      if (name === "slots") return slots;
      if (name === "sessions") return sessions;
      return undefined;
    },
  };

  return {
    ctx,
    /** What the tab header displays right now. Null when the tab is gone. */
    headerLabel: (): string | null => (live === null ? null : live.label()),
    /** Sessionswitch helper: mutate the snapshot and notify, as the store would. */
    switchTo(sessionId: string, preset: string | undefined) {
      snapshot = { current: sessionId, byId: { ...snapshot.byId, [sessionId]: { agentPreset: preset } } };
      for (const listener of listeners) listener();
    },
    /** How many times the tickets entry has been registered (mounts). */
    mountCount: (): number => ticketsRegistrations.length,
  };
}

describe("#114 round 3: the badge survives a detour through a non-aidos session", () => {
  let rt: ReturnType<typeof fakeRuntime>;

  beforeEach(() => {
    __resetBadgeStateForTests();
    setCountCallback(null);
    rt = fakeRuntime();
    apply(rt.ctx as never);
  });

  it("B's tab shows no count after A -> chat -> A -> B, the reviewer's exact repro", () => {
    rt.switchTo("A", "aidos");
    // A's board rendered once and reported 3.
    reportCount("A", 3);
    expect(rt.headerLabel()).toBe("Tickets (3)");

    // Detour through an ordinary non-aidos chat session.
    rt.switchTo("chat", undefined === undefined ? "default" : "default");
    expect(rt.headerLabel()).toBeNull();

    // Back to A: the tab returns with A's count.
    rt.switchTo("A", "aidos");
    expect(rt.headerLabel()).toBe("Tickets (3)");

    // THE SYMPTOM: switch to aidos session B and never open its board.
    rt.switchTo("B", "aidos");
    expect(rt.headerLabel()).toBe("Tickets");
  });

  it("the suffix clears when A's count drops to zero after the detour", () => {
    rt.switchTo("A", "aidos");
    reportCount("A", 3);
    rt.switchTo("chat", "default");
    rt.switchTo("A", "aidos");
    // Every ticket closed; the board reports zero.
    reportCount("A", 0);
    expect(rt.headerLabel()).toBe("Tickets");
  });

  it("switching to a non-aidos session performs no board mount (advisory 2)", () => {
    rt.switchTo("A", "aidos");
    reportCount("A", 3);
    const mounts = rt.mountCount();
    // The dispose must happen without a single new registration: the old
    // order mounted a fresh LocalTicketView microseconds before killing it.
    rt.switchTo("chat", "default");
    expect(rt.mountCount()).toBe(mounts);
    expect(rt.headerLabel()).toBeNull();
  });

  it("switching between two aidos sessions relabels without opening B's board", () => {
    rt.switchTo("A", "aidos");
    reportCount("A", 3);
    rt.switchTo("B", "aidos");
    expect(rt.headerLabel()).toBe("Tickets");
    // And back: A's count is still 3, and reportCount early-returns on an
    // unchanged count -- the label must still be correct.
    rt.switchTo("A", "aidos");
    expect(rt.headerLabel()).toBe("Tickets (3)");
  });
});

describe("#114 round 3: the test reset clears suppression (advisory 3)", () => {
  it("a relabel is not swallowed by suppression a prior test left on", () => {
    let bumps = 0;
    __resetBadgeStateForTests();
    setCountCallback(() => {
      bumps += 1;
    });
    // A prior test ended with suppression on...
    setRemountSuppressed(true);
    // ...and the reset under test must clear it, so the session change
    // bumps instead of being silently swallowed.
    __resetBadgeStateForTests();
    setCurrentSession("sess-a");
    reportCount("sess-a", 2);
    expect(bumps).toBeGreaterThan(0);
    expect(badgeLabel()).toBe("Tickets (2)");
  });
});
