/**
 * Small inline icon components. Each renders a 12px square, inherits the
 * current text color, and carries no color of its own.
 */

import react from "react";

export function PencilIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M8.5 1.5l2 2L4 10l-2.5.5L2 8z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M2 3.5h8M5 3.5V2h2v1.5M3 3.5l.5 7h5l.5-7M5 5.5v3M7 5.5v3" />
    </svg>
  );
}

/** The pop-out icon (#69 strips): a square with an arrow leaving its corner. */
export function PopOutIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M6.5 2H2v8h8V5.5" />
      <path d="M7 2h3v3" />
      <path d="M5 7l5-5" />
    </svg>
  );
}

/**
 * The warning triangle: marks a criterion no evidence covers yet. Like the
 * others it inherits the current text color, so the caller decides the hue.
 */
export function WarningIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M6 1.5l4.5 8h-9z" />
      <path d="M6 4.75v2.5" />
      <path d="M6 8.6v.4" />
    </svg>
  );
}
