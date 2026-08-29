/**
 * A-LOG2: leveled logging for the browser bundle.
 *
 * The client has no host logger; it reaches the host only through the Remote
 * funnel in remote.ts. This module wraps the browser console with an "aidos:"
 * prefix and maps to the same level convention as the host:
 *
 *   debug - per-call trace and payload detail
 *   info  - a state change a person wants in a normal-volume log
 *   warn  - a fallback fired or a refusal happened
 *   error - the operation failed and the caller is affected
 *
 * Components import these helpers instead of calling console directly, so the
 * prefix and the level convention live in one place.
 */

export function logDebug(message: string): void {
  console.debug("aidos: " + message);
}

export function logInfo(message: string): void {
  console.info("aidos: " + message);
}

export function logWarn(message: string): void {
  console.warn("aidos: " + message);
}

export function logError(message: string): void {
  console.error("aidos: " + message);
}
