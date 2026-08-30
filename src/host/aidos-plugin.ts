/**
 * The aidos-core host-plane plugin entry. The bundle patch mounts this
 * module as the `aidos-core` row; its apply mounts the AidosService on the
 * host plane, where the agent-plane tools and the (B2) Remote reach it.
 */

import type { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { registerAidosService } from "./aidos-core";

export const inject = [
  "agents",
  "sessionProjections",
  "invariants",
  "settings",
  "workspaceRegistry",
] as const;

/** Schemastery config for the aidos-core service. */
export const Config = z.object({});

/**
 * Mount the service on the host plane, unconditionally.
 *
 * The apply-time preset gate commit daf1f96 added here was dead in
 * production and fatal: composedPreset(ctx) reads the live scope chain and
 * resolves only for a real agent context (an unscoped host context answers
 * undefined), so the service never mounted. The aidos preset's tools row
 * injects the `aidos` service, so it never activated, the whole preset
 * mount failed (selecting aidos bounced back to Standard), and the board
 * had no projection units ("The board projection is unavailable").
 *
 * Per-session isolation does not come from an apply gate. The service keeps
 * no cross-session state a non-aidos session could reach: every read and
 * write is keyed by the calling agent's session log, and the per-agent
 * behavior gates (bashContext, project creation) already check
 * composedPreset(agent.ctx) at call time. The KNOWN_SESSION_EVENT_TYPES
 * registration is a host-wide read-path necessity, not contamination (see
 * ./session-events and the dsh-llm-fallbacks precedent).
 */
export function apply(ctx: Context, config: unknown): () => void {
  // Registering the aidos event types with the host session reader happens in
  // the AidosService constructor (see aidos-core.ts / session-events.ts); the
  // service mounts here, before any lazy session load. The persistence read
  // path then accepts sessions containing aidos events.
  return registerAidosService(ctx, config as never);
}
