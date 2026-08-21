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

/** Mount the service on the host plane. */
export function apply(ctx: Context, config: unknown): () => void {
  // Registering the aidos event types with the host session reader happens in
  // the AidosService constructor (see aidos-core.ts / session-events.ts); the
  // service mounts here, before any lazy session load. The persistence read
  // path then accepts sessions containing aidos events.
  return registerAidosService(ctx, config as never);
}
