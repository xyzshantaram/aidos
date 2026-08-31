/**
 * The per-agent preset gate. Standing-mount registrations are process-global
 * (the mount's scope admits untagged dispatchers), so every listener, guard,
 * and mask the aidos row installs observes EVERY session, whatever preset it
 * runs. What scopes them to aidos sessions is this check, run at call time
 * with the real agent context: composedPreset(agent.ctx) reads the live
 * scope chain and answers the preset the agent actually joined (or undefined
 * for a deployment that composes no presets, where aidos rows can only exist
 * because the deployment composed them another way — same fallback the
 * per-agent gates in aidos-core.ts use).
 */
import type { Context } from "@deepseek-ai/cordis";
import type { Agent } from "@deepseek-ai/dsh-agent";

/** The preset id the aidos rows enforce for. */
export const AIDOS_PRESET_ID = "aidos";

/**
 * Whether one agent runs the aidos preset. True when the agentPresets
 * service is absent (harness and uncomposed deployments), so the existing
 * test harness keeps activating aidos. False for an agent whose composed
 * preset is anything else — the cross-preset case the standing mount leaks
 * into.
 */
export function isAidosAgent(ctx: Context, agent: Agent): boolean {
  const presets = ctx.get("agentPresets") as
    | { composedPreset: (agentCtx: unknown) => string | undefined }
    | undefined;
  if (presets === undefined) return true;
  let composed: string | undefined;
  try {
    composed = presets.composedPreset(agent.ctx);
  } catch {
    // An unreadable scope chain must not veto tool calls; treat as aidos
    // (fail open) and let the per-agent seams the service owns still apply.
    return true;
  }
  return composed === undefined || composed === AIDOS_PRESET_ID;
}
