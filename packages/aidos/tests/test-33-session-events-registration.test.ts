/**
 * The plugin registers its session event types with the host reader.
 *
 * aidos appends its own domain events (`project/created`, `ticket/change`,
 * ...) into the DSH session log. The host persistence read path refuses a
 * session whose log contains an event type outside its baked catalog unless
 * the envelope is marked ignorable. Because `Session.append` cannot stamp
 * `ignorable`, the plugin instead registers the aidos types into the root-
 * exported `KNOWN_SESSION_EVENT_TYPES` Set at startup (the llm-fallbacks
 * issue-#52 pattern, see src/host/session-events.ts). These pins hold that
 * registration contract: the Set must accept every aidos type once the
 * registration has run, and registration must be idempotent.
 */
import { describe, expect, it } from "vitest";
import * as dshSession from "@deepseek-ai/dsh-session";

import { AIDOS_EVENT_TYPES } from "../src/host/invariant";
import {
  aidosSessionEventTypesRegistered,
  registerAidosSessionEventTypes,
} from "../src/host/session-events";

describe("aidos session event type registration", () => {
  it("registers every aidos type into the host KNOWN_SESSION_EVENT_TYPES", () => {
    const known = (dshSession as {
      KNOWN_SESSION_EVENT_TYPES?: ReadonlySet<string>;
    }).KNOWN_SESSION_EVENT_TYPES;
    expect(known).toBeInstanceOf(Set);

    const before = [...AIDOS_EVENT_TYPES].filter((type) => known!.has(type));
    const result = registerAidosSessionEventTypes();

    expect(result).toBe(true);
    for (const type of AIDOS_EVENT_TYPES) {
      expect(known!.has(type)).toBe(true);
    }
    // Every type we added was not already known, so the count grew by the
    // full set, not by a stale partial registration.
    expect(AIDOS_EVENT_TYPES.size).toBeGreaterThan(0);
    expect(before.length).toBe(0);
    expect(aidosSessionEventTypesRegistered()).toBe(true);
  });

  it("is idempotent and reports true once registered", () => {
    const known = (dshSession as {
      KNOWN_SESSION_EVENT_TYPES?: ReadonlySet<string>;
    }).KNOWN_SESSION_EVENT_TYPES as Set<string>;
    const sizeBefore = known.size;

    expect(registerAidosSessionEventTypes()).toBe(true);
    expect(registerAidosSessionEventTypes()).toBe(true);
    expect(known.size).toBe(sizeBefore);
    expect(aidosSessionEventTypesRegistered()).toBe(true);
  });
});
