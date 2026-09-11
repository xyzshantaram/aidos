/**
 * Ticket U2c + #62: the action bar. Every action renders in every state;
 * unavailable ones are greyed out with a tooltip naming what is missing.
 * The allowlist editor opens here for in-progress tickets.
 *
 * #194, REVERSED (owner, 2026-09-12): this bar is the DETAIL PANEL's
 * affordance only — the first cut also mounted it on every board tile,
 * which greyed six buttons across a 206-tile grid; the tile now carries no
 * action chrome at all and the tile-side callers are gone. Retirement moved
 * off the flat row into the overflow kebab at the bar's right-hand end
 * (`onOpenRetire`): retirement is orthogonal to the state axis, so it was
 * never an ActionDescriptor and never belonged beside the lifecycle verbs.
 */

import react from "react";

import { actionsFor, type ActionId } from "./action-visibility";
import { logDebug } from "./log";
import { AidosRemoteError } from "./remote";
import type { TicketView } from "../kernel/projections";
import type { EvidenceRowLike } from "./board-logic";
import { showToast } from "./toast-store";

export interface ActionBarProps {
  ticket: TicketView;
  evidence: readonly EvidenceRowLike[];
  onOpenSignoff: () => void;
  onOpenVerify: () => void;
  onOpenSendBack: () => void;
  onOpenMarkDone: () => void;
  onOpenSubmitForReview: () => void;
  onOpenAllowlist: () => void;
  /**
   * #194 reversal: opens the retire dialog from the overflow kebab. Absent,
   * the kebab renders nothing — the bar keeps the #62 flat row for the
   * lifecycle actions and adds no furniture it cannot use.
   */
  onOpenRetire?: () => void;
  /**
   * #194: the click-time re-check. The descriptors above are a render-time
   * snapshot: the ticket may have moved since this bar rendered (a stale
   * detail panel, a card grid that has not refreshed), and opening a flow
   * from a stale snapshot is the #177 junk write -- the dialog attaches
   * its row BEFORE the move, and the row is user-authored and append-only,
   * so the junk stays.
   *
   * When present, an enabled button awaits this first: a refusal reason
   * toasts and opens NOTHING (no dialog, no remote beyond the guard's own
   * READ), null opens the flow. Greyed buttons never reach it -- disabled
   * buttons do not fire clicks, so the render-time verdict still rules
   * them out. Absent, the opener runs directly, which is the pre-#194
   * behaviour every existing caller keeps until it wires a guard.
   */
  checkAction?: (id: ActionId) => Promise<string | null>;
}

/** One descriptor id to its opener prop name. */
const OPENERS: Record<ActionId, keyof Omit<ActionBarProps, "ticket" | "evidence" | "checkAction" | "onOpenRetire">> = {
  signoff: "onOpenSignoff",
  verify: "onOpenVerify",
  "submit-for-review": "onOpenSubmitForReview",
  "send-back": "onOpenSendBack",
  "mark-done": "onOpenMarkDone",
  allowlist: "onOpenAllowlist",
};

/** One entry of the overflow kebab. */
export interface OverflowItem {
  id: string;
  label: string;
  onSelect: () => void;
}

/**
 * #194 reversal: the kebab's dropdown. Rendered only while open; the open
 * state lives in `ActionBar` next to the checking state, so a closed menu
 * costs no DOM.
 *
 * Keyboard reachable: the trigger is a real <button> (Enter/Space open),
 * the items are real buttons inside a role="menu" listbox, and Escape
 * closes and returns focus to the trigger. Dismissable: Escape, an item
 * activation, or a pointer-down anywhere outside the bar closes it.
 *
 * STYLING: board.css is not this ticket's to edit, so the positioning and
 * the surface ride inline styles built from the tokens that stylesheet
 * already defines (--surface, --border-subtle, --text-primary) — the same
 * values the flat row's `.aidos-action-bar .aidos-btn` rules use, so the
 * menu reads as part of the bar rather than a foreign surface. The items
 * themselves ARE the shared `.aidos-btn` class.
 */
export function OverflowMenu(props: {
  open: boolean;
  items: readonly OverflowItem[];
  /** The bar that owns this menu: clicks inside it are not "outside". */
  containerRef: react.RefObject<HTMLElement | null>;
  /** Focus returns here on Escape, so keyboard flow never loses its place. */
  triggerRef: react.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  react.useEffect(function () {
    if (!props.open) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        props.onClose();
        props.triggerRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      const bar = props.containerRef.current;
      if (bar !== null && bar.contains(event.target)) return;
      props.onClose();
    }
    document.addEventListener("keydown", onEscape);
    document.addEventListener("pointerdown", onPointerDown);
    return function () {
      document.removeEventListener("keydown", onEscape);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [props.open, props.onClose]);

  if (!props.open) return null;
  return (
    <div
      role="menu"
      aria-label="More actions"
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: "2px",
        padding: "4px",
        background: "var(--surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "6px",
        boxShadow: "0 2px 8px rgb(0 0 0 / 0.25)",
      }}
    >
      {props.items.map((item) => (
        <button
          key={item.id}
          role="menuitem"
          className="aidos-btn"
          style={{
            background: "transparent",
            color: "var(--text-primary)",
            justifyContent: "flex-start",
            textAlign: "left",
          }}
          onClick={function () {
            props.onClose();
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ActionBar(props: ActionBarProps) {
  const kinds = props.evidence.map((row) => row.kind);
  const actions = actionsFor(props.ticket, kinds);
  /*
   * #194: which action is mid-re-check. One at a time: the guard is fast
   * (one READ), and a second click while one is in flight is either a
   * double-click or a change of mind -- both are served by finishing the
   * first check rather than racing two. `overflowOpen` is the kebab's
   * state; only one menu can exist per bar, so they share the component.
   */
  const [checking, setChecking] = react.useState<ActionId | null>(null);
  const [overflowOpen, setOverflowOpen] = react.useState(false);
  const barRef = react.useRef<HTMLDivElement | null>(null);
  const kebabRef = react.useRef<HTMLButtonElement | null>(null);

  react.useEffect(function () {
    logDebug("action bar mounted");
  }, []);

  function activate(action: (typeof actions)[number], opener: () => void) {
    if (action.unavailableReason !== undefined) return;
    if (props.checkAction === undefined) {
      opener();
      return;
    }
    if (checking !== null) return;
    const id = action.id;
    setChecking(id);
    void props
      .checkAction(id)
      .then((refusal) => {
        if (refusal !== null) {
          // #177: refuse with the reason, writing nothing. No dialog
          // opens, so no flow can attach its row before discovering the
          // move would be refused.
          showToast(refusal, "refusal");
          return;
        }
        opener();
      })
      .catch((error: unknown) => {
        showToast(
          error instanceof AidosRemoteError ? error.message : String(error),
          "refusal",
        );
      })
      .finally(() => {
        setChecking(null);
      });
  }

  const overflowItems: OverflowItem[] =
    props.onOpenRetire === undefined
      ? []
      : [{ id: "retire", label: "Retire\u2026", onSelect: props.onOpenRetire }];

  const buttons = actions.map((action) => {
    const opener = props[OPENERS[action.id]] as () => void;
    const disabled = action.unavailableReason !== undefined;
    const busy = checking === action.id;
    const className =
      (action.primary ? "aidos-btn aidos-btn-primary" : "aidos-btn") +
      (disabled ? " aidos-btn-disabled" : "");
    return (
      <button
        className={className}
        key={action.id}
        disabled={disabled || busy}
        title={action.unavailableReason ?? action.label}
        data-dsh-tip=""
        onClick={() => {
          activate(action, opener);
        }}
      >
        {busy ? "Checking…" : action.label}
      </button>
    );
  });

  return (
    <div
      ref={barRef}
      className="aidos-action-bar"
      style={overflowItems.length > 0 ? { position: "relative" } : undefined}
    >
      {buttons}
      {overflowItems.length > 0 ? (
        <button
          type="button"
          ref={kebabRef}
          className="aidos-btn"
          style={{ marginLeft: "auto" }}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={overflowOpen}
          title="More actions"
          data-dsh-tip=""
          onClick={function () {
            setOverflowOpen(!overflowOpen);
          }}
        >
          {"\u22ef"}
        </button>
      ) : null}
      <OverflowMenu
        open={overflowOpen}
        items={overflowItems}
        containerRef={barRef}
        triggerRef={kebabRef}
        onClose={function () {
          setOverflowOpen(false);
        }}
      />
    </div>
  );
}
