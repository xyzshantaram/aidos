/**
 * Shared helpers extracted from Store/AidosService to prevent drift (H1).
 * One source for rowOf, refusalReason, deepClone — both sides import here.
 * See audit finding H1.
 */
import type { TicketSnapshot, TicketRow } from "./types";

/** Clone one JSON-safe value. The log must never alias caller data. */
export function deepClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = deepClone((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
}

/** One ticket row from a folded snapshot. The one read code path. */
export function rowOf(snapshot: TicketSnapshot): TicketRow {
  return {
    id: snapshot.id,
    projectId: snapshot.projectId,
    title: snapshot.title,
    description: snapshot.description,
    body: snapshot.body,
    criteria: snapshot.criteria,
    phase: snapshot.phase,
    order: snapshot.order,
    state: snapshot.state,
    dependsOn: [...snapshot.dependsOn],
  };
}

/** The refusal reason string of the prototype's _refusal_reason. */
export function refusalReason(missing: string[], allowedActors: string[]): string {
  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`missing evidence kinds: ${missing.join(", ")}`);
  }
  if (allowedActors.length > 0) {
    parts.push(`allowed actors: ${allowedActors.join(", ")}`);
  }
  return parts.join(" ");
}
