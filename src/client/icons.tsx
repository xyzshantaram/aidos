/**
 * Small inline icon components. Each renders a 12px square, inherits the
 * current text color, and carries no color of its own.
 *
 * #21, from the user: the icons "are also kinda thin". They were — none of
 * them set `stroke-width`, so every one rendered at the SVG default of 1px.
 * A 1px hairline beside 600-weight 11px text reads as a grey smudge however
 * bright the colour token is, which is why raising contrast alone did not
 * fix it. `ICON_STROKE` is now shared, so the whole set has one weight and
 * a future icon cannot quietly reintroduce a hairline.
 */

import react from "react";

import { IconChevronDownOutline14 } from "@deepseek-ai/dsh-client-ui-primitives";

/**
 * The shared stroke weight. 1.6 matches the visual weight of the 600-weight
 * chip text at this size: thinner greys out, thicker blots at 12px.
 */
const ICON_STROKE = 1.6;

/** The props every icon shares. Spread first so a caller can still override. */
function iconProps() {
  return {
    width: 12,
    height: 12,
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: ICON_STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
}

export function PencilIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M8.5 1.5l2 2L4 10l-2.5.5L2 8z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M2 3.5h8M5 3.5V2h2v1.5M3 3.5l.5 7h5l.5-7M5 5.5v3M7 5.5v3" />
    </svg>
  );
}

/** The pop-out icon (#69 strips): a square with an arrow leaving its corner. */
export function PopOutIcon() {
  return (
    <svg {...iconProps()}>
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
    <svg {...iconProps()}>
      <path d="M6 1.5l4.5 8h-9z" />
      <path d="M6 4.75v2.5" />
      <path d="M6 8.6v.4" />
    </svg>
  );
}

/**
 * The GATE icon: a keyhole (#21, user's choice, revised to keyhole).
 *
 * The gate is the lock on a transition and evidence is what opens it. The
 * first glyph was a key; the user read the two shapes as different claims --
 * a key is what you CARRY, a keyhole is the lock itself, and the chip
 * reports the state of the lock on this ticket, not the state of anyone's
 * keyring. It replaces the word "Gate", which was four characters of
 * furniture repeated on every tile.
 */
export function KeyholeIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="6" cy="4.1" r="2.4" />
      <path d="M5.1 6.3L4.3 9.9h3.4L6.9 6.3" />
    </svg>
  );
}

/**
 * The DEPENDENCY icon: a fork, in the branch / merge-request sense (#21,
 * user's choice).
 *
 * A dependency is another line of work this one joins onto, which is what a
 * branch glyph already says in every tool a developer reads. It replaces a
 * bare arrow, which said "something goes somewhere" and no more.
 */
export function ForkIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="3.4" cy="2.6" r="1.4" />
      <circle cx="3.4" cy="9.4" r="1.4" />
      <circle cx="8.6" cy="2.6" r="1.4" />
      <path d="M3.4 4v4" />
      <path d="M8.6 4v1.4c0 1.2-.7 1.6-1.8 1.6H3.4" />
    </svg>
  );
}

/**
 * The CONFIDENCE icon: a compass (#21, user's choice).
 *
 * Confidence is ADVISORY — it never unlocks anything — and a compass reads
 * as a bearing rather than a gate, which is exactly the distinction the
 * tooltip then spells out. A keyhole and a compass side by side say "one of
 * these controls something and the other does not".
 */
export function CompassIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="6" cy="6" r="4.6" />
      <path d="M8 4L5.2 5.2 4 8l2.8-1.2z" />
    </svg>
  );
}

/**
 * The PENDING-APPROVAL icon: an exclamation in a circle (#21, user's ask).
 *
 * Sits beside the ticket id when the ticket has an allowlist request waiting
 * for the human. It is the one thing on a card that is BLOCKED ON THEM, so
 * it is allowed to draw attention where the rest of the chip row is not --
 * the card's attention budget goes to the gate, the id, the status, and
 * this.
 */
export function AlertCircleIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="6" cy="6" r="4.6" />
      <path d="M6 3.5v3" />
      <path d="M6 8.3v.35" />
    </svg>
  );
}

/**
 * The QUEUE ACTION icons (#93, user's design).
 *
 * The queue's rows previously carried their buttons inline, which is what
 * made them so hard to align: a row's action set varies, so the column
 * either reserved dead space or went ragged. Collapsing each row to a single
 * coloured ICON removes the problem at its source -- there is nothing to
 * align until the row is expanded.
 *
 * Each one is a picture of the ask, not a decoration: a clipboard for a
 * signature, a round check for verification, a square check for completion,
 * a checklist for a list of paths. The colour is the state the action leads
 * TO, so the queue reads as a column of intents.
 */

/**
 * Sign off: a page with a SIGNATURE stroke across it.
 *
 * The first attempt drew a clipboard, a clip AND a check inside 12 square
 * pixels; the user could not read it ("the sign off icon is not clear
 * enough"), and they were right -- three shapes at that size is a smudge.
 * A page outline plus one sweeping signature line is two shapes, and the
 * signature is what the action actually is.
 */
export function SignoffIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M2.6 1.6h4.3l2.5 2.5v6.3H2.6z" />
      <path d="M6.8 1.7v2.4h2.4" />
      <path d="M4.2 8.4c1-1.4 1.7-1.4 2.2-.5s1 .6 1.6-.6" />
    </svg>
  );
}

/** Verify: a round check. */
export function VerifyIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="6" cy="6" r="4.6" />
      <path d="M3.9 6.1l1.5 1.5L8.2 4.8" />
    </svg>
  );
}

/** Mark done: a square check. */
export function MarkDoneIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="1.6" y="1.6" width="8.8" height="8.8" rx="1.6" />
      <path d="M3.9 6.1l1.5 1.5L8.2 4.8" />
    </svg>
  );
}

/** Allowlist: a checklist of paths. */
export function AllowlistIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M1.8 3.2l1 1 1.6-1.8" />
      <path d="M1.8 7.4l1 1 1.6-1.8" />
      <path d="M6.4 3.4h3.8" />
      <path d="M6.4 7.6h3.8" />
    </svg>
  );
}

/**
 * The EXPAND chevron, in the todo panel's style (user, 2026-09-05: "Ticket
 * chevrons should be the same style as the new dotfiles-ai chevron").
 *
 * This is the real primitive — `IconChevronDownOutline14` from the shell's
 * own primitives module — not the text glyph `▾`/`▸` it replaces. The
 * rotation language is copied from durable-todos: pointing right collapsed,
 * rotating to point down open, a 0.12s transform transition, label-secondary
 * colour. Same icon, same motion, same hue as a panel the user already
 * reads, so an expandable ticket row stops announcing itself as a foreign
 * widget.
 *
 * The primitive's sizing comes from its own defaults; the classes live in
 * board.css beside the rest of the aidos chrome.
 */
export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <IconChevronDownOutline14
      className={"aidos-chevron" + (open ? " aidos-chevron-open" : "")}
      aria-hidden={true}
    />
  );
}

/*
 * The BASE CARD's chevron: the tool-render classes, not the todo-panel ones.
 * The tool-render stylesheet gives this chevron its own margin and rotation,
 * so a row built from tool-render's classes must use this variant to sit
 * identically to a native tool call -- the aidos-chevron margin was tuned
 * for the board rows and rendered with the wrong padding beside the badge.
 */
export function ToolRenderChevron({ open }: { open: boolean }) {
  return (
    <IconChevronDownOutline14
      className={"tool-render-chevron" + (open ? " tool-render-chevron-open" : "")}
      aria-hidden={true}
    />
  );
}
