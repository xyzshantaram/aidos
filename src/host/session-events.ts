/**
 * The aidos session-event registration seam.
 *
 * aidos appends its own domain events (`project/created`, `ticket/change`,
 * ...) into the DSH session log via `Session.append`. Those types exist only
 * as a downstream `SessionEventMap` augmentation (a `declare module` in
 * aidos-core.ts), which is erased at runtime — the DSH persistence read path
 * (`dsh-session-persistence` `assertEventsSupported`) hard-refuses a log
 * containing an event type outside the host's baked `KNOWN_SESSION_EVENT_TYPES`
 * catalog unless the envelope carries the `ignorable` marker, which
 * `Session.append` cannot write.
 *
 * The host catalog is generated from in-repo `SessionEventMap` members only;
 * out-of-repo plugin events are outside it by construction and no upstream
 * registration surface exists yet. So, following the pattern established by
 * the dsh-llm-fallbacks plugin for the identical refusal, we register the
 * aidos types into the ROOT-exported `KNOWN_SESSION_EVENT_TYPES` Set at
 * plugin startup (see https://github.com/omdsh-dev/dsh-llm-fallbacks/pull/53,
 * issue #52). Session loads are lazy (per open/resume), so apply-time
 * registration always precedes any load and already-persisted logs heal
 * retroactively. The `@deepseek-ai/*` externals in the aidos bundle resolve
 * from the host's config tree, so this namespace IS the host's in-box module
 * — the same Set the persistence read path consults.
 *
 * Registration is idempotent and failure-tolerant: when the export is absent
 * or the Set frozen, registration reports false and the commit() append guard
 * (aidos-core.ts) skips the durable event rather than write one a later read
 * would refuse. STOPGAP — remove when the upstream registration surface lands.
 */

import * as dshSession from "@deepseek-ai/dsh-session";
import type { Context } from "@deepseek-ai/cordis";

import { AIDOS_EVENT_TYPES } from "./invariant";

/** True once every aidos event type is registered with the host reader. */
let registered = false;

/**
 * Register every aidos event type into the host's `KNOWN_SESSION_EVENT_TYPES`
 * read-path catalog. Idempotent: re-calling after success is a no-op, and a
 * re-apply in a second fiber re-covers the same Set safely.
 *
 * @returns whether registration is in effect (all aidos types are readable).
 */
export function registerAidosSessionEventTypes(ctx?: Context): boolean {
  if (registered) return true;
  const known = (dshSession as { KNOWN_SESSION_EVENT_TYPES?: ReadonlySet<string> })
    .KNOWN_SESSION_EVENT_TYPES;
  if (!(known instanceof Set)) return false;
  try {
    for (const type of AIDOS_EVENT_TYPES) (known as Set<string>).add(type);
    registered = [...AIDOS_EVENT_TYPES].every((type) => known.has(type));
  } catch (error) {
    ctx?.logger?.warn?.(`aidos: failed to register session event types: ${error instanceof Error ? error.message : String(error)}`);
    registered = false;
  }
  return registered;
}

/** Whether the host reader currently accepts aidos event types. */
export function aidosSessionEventTypesRegistered(): boolean {
  return registered;
}
