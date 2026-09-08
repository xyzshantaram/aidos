/**
 * The aidos-core host-plane plugin entry. The bundle patch mounts this
 * module as the `aidos-core` row; its apply mounts the AidosService on the
 * host plane, where the agent-plane tools and the (B2) Remote reach it.
 */

import type { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { registerAidosService } from "./aidos-core";
import { configuredReviewChain, registerPartnerReview } from "./partner-review";

export const inject = [
  "agents",
  "sessionProjections",
  "invariants",
  "settings",
  "workspaceRegistry",
] as const;

/**
 * Schemastery config for the aidos-core service.
 *
 * `reviewChain` is a chain NAME (#136), defaulting to "frontier". It is
 * never a model id: the harness resolves the name at dispatch against the
 * live profile, which is the whole point of naming a chain instead of
 * pinning a model.
 */
export const Config = z.object({
  reviewChain: z.string().default("frontier"),
});

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
  /*
   * #136: the reviewer type registers here, and is INERT when the harness
   * has no subagentTypes service — which is the case today. Guarded rather
   * than injected on purpose: `inject` would park the whole aidos service
   * until a service that may never arrive appears, and the board must mount
   * regardless. Disposed with the plugin, so it unregisters cleanly.
   */
  const unregisterReviewer = registerPartnerReview(
    ctx,
    configuredReviewChain(config),
  );
  ctx.effect(() => unregisterReviewer);
  // Registering the aidos event types with the host session reader happens in
  // the AidosService constructor (see aidos-core.ts / session-events.ts); the
  // service mounts here, before any lazy session load. The persistence read
  // path then accepts sessions containing aidos events.
  return registerAidosService(ctx, config as never);
}
