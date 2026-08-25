/**
 * The shared aidos UI toast store. Every aidos client feature (plan UI,
 * settings, U2d, U3, and later) imports showToast from this module; it is
 * not board-specific.
 *
 * Ticket U2c: the module-level toast store.
 *
 * The store is plain module state, not a React hook. React components
 * subscribe through subscribeToasts and re-render on every change, so no
 * context provider is needed. New toasts stack at the bottom; existing
 * toasts shift up. Each toast auto-dismisses after TOAST_DURATION_MS.
 *
 * The old single-string toast in LocalTicketView is a U2a stub. This store
 * replaces it. The U2a timing was three seconds; the U2c contract is six.
 */

export type ToastKind = "refusal" | "info" | "success";

export interface Toast {
  id: string;
  text: string;
  kind: ToastKind;
  expiresAt: number;
}

/** How long one toast stays visible before it auto-dismisses. */
export const TOAST_DURATION_MS = 6_000;

/** A fresh toast id. crypto.randomUUID when present, else a time-based fallback. */
function makeToastId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now() + "-" + Math.random();
}

let toasts: Toast[] = [];
const listeners = new Set<(toasts: Toast[]) => void>();
const timers = new Map<string, number>();

/** Fire every listener with the current list. */
function emit(): void {
  const snapshot = toasts.slice();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

/** Remove one toast by id and stop its timer. */
function removeToast(id: string): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
}

/**
 * Show one toast and return its id. The id can cancel the toast early
 * through dismissToast. The default kind is info.
 */
export function showToast(text: string, kind: ToastKind = "info"): string {
  const id = makeToastId();
  const toast: Toast = {
    id,
    text,
    kind,
    expiresAt: Date.now() + TOAST_DURATION_MS,
  };
  toasts = toasts.concat(toast);
  emit();
  const timer = window.setTimeout(function () {
    removeToast(id);
  }, TOAST_DURATION_MS);
  timers.set(id, timer);
  return id;
}

/** Cancel one toast before it auto-dismisses. */
export function dismissToast(id: string): void {
  removeToast(id);
}

/**
 * Subscribe to the toast list. The listener fires on every change.
 * Returns the unsubscribe disposer.
 */
export function subscribeToasts(listener: (toasts: Toast[]) => void): () => void {
  listeners.add(listener);
  return function () {
    listeners.delete(listener);
  };
}

/**
 * Test-only reset. Clears the toast list and every active timer. The
 * underscore marks it as outside the public API.
 */
export function _resetToastsForTests(): void {
  for (const timer of timers.values()) {
    window.clearTimeout(timer);
  }
  timers.clear();
  toasts = [];
  emit();
}
