/**
 * The aidos board client plugin. Injects the stylesheet once and registers
 * the Tickets tab into the conversation.view list slot. A badge count change
 * re-registers the identical entry so the tab header re-reads badgeLabel.
 *
 * The tab is visible only while the current session runs the aidos preset.
 * The conversation.view tab strip is global (its entries carry no session
 * state), so visibility is reconciled from the client sessions store: the
 * summary of the current session carries the session's own agentPreset
 * (undefined when the deployment composes no presets — the tab stays,
 * mirroring the host-side fallback).
 */

import type { Context } from "@deepseek-ai/cordis";
import type {
  ISessions,
  SessionListState,
  SlotRegistry,
} from "@deepseek-ai/dsh-client-runtime/client";
// Load the conversation slot-map augmentation so "conversation.view" is a
// known SlotMap key to the typechecker below.
import type {} from "@deepseek-ai/dsh-client-ui-conversation/client";

import boardCss from "./board.css";
import planMetaCss from "./plan-meta.css";
/*
 * #82: tool-render's stylesheet, VENDORED verbatim.
 *
 * Three hand-ports in a row failed to match it ("not close enough", "the
 * card looks different"), because approximating a design from memory does
 * not converge. Using the ACTUAL stylesheet makes the scratch rows identical
 * by construction rather than by resemblance.
 *
 * Vendored, not imported: tool-render is a separate dotfiles-ai plugin that
 * may not be mounted, and #72 requires aidos to depend on nothing external.
 * tests/u82-vendor-drift.test.ts fails loudly when upstream changes.
 *
 * Injecting it while tool-render is ALSO mounted is harmless: the rules are
 * byte-identical, and the marker guard in injectStyles already prevents a
 * second copy of the same sheet.
 */
import toolRenderCss from "./vendor/tool-render/tool-render.css";
import { badgeLabel, setCountCallback, setCurrentSession } from "./view-state";
import { LocalTicketView } from "./local-ticket-view";
import react from "react";
import { SCRATCH_ROWS } from "./scratch-rows";
import { AIDOS_ROWS } from "./aidos-rows";

/** Stable plugin identity, also the loader entry id in build.mjs. */
export const name = "aidos";

/** Services this bundle reaches through the plugin context. */
export const inject = ["slots"];

/** The preset id whose sessions show the Tickets tab. */
const AIDOS_PRESET = "aidos";

/** Inject the stylesheet once. The data-plugin-css guard prevents duplicates. */
function injectStyles(): void {
  if (typeof document === "undefined") return;
  for (const sheet of [
    { marker: "aidos/board.css", text: boardCss },
    { marker: "aidos/plan-meta.css", text: planMetaCss },
    { marker: "aidos/tool-render.css", text: toolRenderCss },
  ] as const) {
    if (document.querySelector(`style[data-plugin-css="${sheet.marker}"]`) !== null) {
      continue;
    }
    const tag = document.createElement("style");
    tag.dataset.plugin = "aidos";
    tag.dataset.pluginCss = sheet.marker;
    tag.textContent = sheet.text;
    document.head.appendChild(tag);
  }
}

/**
 * #82: register a rendered row for each scratch tool.
 *
 * They rendered a raw JSON envelope, so a scratch read appeared as a data
 * dump beside a builtin read's clean row. Keyed by TOOL NAME on the
 * `tool.call.toolview` slot, the same seam tool-render uses -- so a scratch
 * call now reads the way an fs call does.
 *
 * Registered ONCE at apply, not reconciled with the Tickets tab: a toolview
 * is keyed by tool name and is inert unless that tool is actually called, so
 * there is nothing to hide when the session is not an aidos one. That also
 * keeps it clear of the dispose/re-register cycle that caused #100.
 */
/**
 * Wrap one tool row so a render failure degrades to a plain line instead of
 * taking down the transcript.
 *
 * A toolview renders untrusted, arbitrarily-shaped data: a call's arguments
 * and result come off the wire, may be truncated mid-flight, may be absent
 * while the call is still running, and may come from an older build whose
 * shape differed. A row that assumes any of that is well-formed can throw
 * during render, and an unhandled throw inside a slot takes the whole
 * surface with it.
 *
 * The user reported exactly that -- a transient crash "about frontend
 * toolcall slots". I could not reproduce it from the code (my first
 * hypothesis, that EvidenceStrip would throw on an undefined timestamp, was
 * WRONG: it guards a non-number), so this does not claim to be that fix. It
 * is the invariant that should hold regardless of the cause: rendering a
 * tool card is cosmetic, and cosmetic code must not be able to crash the
 * page.
 *
 * The fallback still names the tool, so a degraded row is visibly a row
 * rather than a blank gap, and the error reaches the console for diagnosis.
 */
function guardRow(
  key: string,
  Row: (props: never) => unknown,
): (props: never) => unknown {
  return function GuardedRow(props: never) {
    try {
      return Row(props);
    } catch (error) {
      console.warn(`aidos: the ${key} tool row failed to render`, error);
      return react.createElement(
        "div",
        { className: "tool-render-card" },
        react.createElement(
          "div",
          { className: "tool-render-row", "data-state": "error" },
          react.createElement("span", { className: "tool-render-title" }, key),
          react.createElement("span", { className: "tool-render-sep" }),
          react.createElement(
            "span",
            { className: "tool-render-summary" },
            "this card could not render; the call itself was unaffected",
          ),
        ),
      );
    }
  };
}

function registerScratchRows(slots: SlotRegistry): () => void {
  const disposers: Array<() => void> = [];
  /*
   * #73: the aidos tools' own rows register through the same seam. Priority
   * -100 shadows BELOW the rows dsh ships, so a client update that adds a
   * shipped row for one of these names wins rather than colliding -- which
   * is #73's "survives a dsh client update" criterion.
   */
  for (const [key, Row] of [...SCRATCH_ROWS, ...AIDOS_ROWS] as ReadonlyArray<
    [string, (props: never) => unknown]
  >) {
    /*
     * PER-ROW ISOLATION. One failing registration used to take the rest of
     * the loop with it, and the loop registers fifteen rows.
     *
     * That failure mode is silent and looks exactly like the user's report:
     * the rows registered BEFORE the throw render, every row after it is
     * simply absent, and the only symptom is "some tool cards have no UI".
     * Registration order then decides which tools work, which is not a
     * property anyone would think to check.
     *
     * A row is a rendering nicety. It must never cost another row, and it
     * must never cost the page.
     */
    try {
      disposers.push(
        slots.register(
          { name: "tool.call.toolview", key, priority: -100 } as never,
          guardRow(key, Row) as never,
        ),
      );
    } catch (error) {
      console.warn(
        `aidos: the ${key} tool row could not register; the other rows continue`,
        error,
      );
    }
  }
  return function () {
    for (const dispose of disposers) dispose();
  };
}

/** Register the Tickets tab. Returns the registration disposer. */
function registerTicketsTab(slots: SlotRegistry): () => void {
  return slots.inject("conversation.view", () =>
    slots.register(
      {
        name: "conversation.view",
        id: "tickets",
        order: 20,
        label: badgeLabel,
      },
      LocalTicketView,
    ),
  );
}

/**
 * Plugin body: inject the styles once, then own one visibility effect.
 * The effect subscribes to the sessions list snapshot and registers or
 * disposes the Tickets entry as the current session's preset changes.
 *
 * The registration handle is shared with the badge callback: reportCount
 * fires during render on every projection update, and refreshing the tab
 * label means dispose + re-register the identical entry (the tab header only
 * re-reads the label thunk through re-registration). Registering twice
 * without disposing throws "already has an entry with id tickets", which
 * crashes the slot entry and blanks the pane.
 */
export function apply(ctx: Context): void {
  injectStyles();

  // #82: the scratch tools' rows. Independent of the Tickets tab's
  // visibility reconciliation -- a toolview is inert unless its tool runs.
  ctx.effect(() => {
    const slots = ctx.get("slots") as SlotRegistry | undefined;
    if (slots === undefined) return () => {};
    return registerScratchRows(slots);
  }, "aidos: scratch tool rows");

  // Owned by the visibility effect below; read by the badge callback.
  let registration: (() => void) | null = null;
  let want = false;

  function reconcile(slots: SlotRegistry): void {
    if (want && registration === null) {
      registration = registerTicketsTab(slots);
    }
    if (!want && registration !== null) {
      registration();
      registration = null;
    }
  }

  ctx.effect(function () {
    const slots = ctx.get("slots") as SlotRegistry | undefined;
    if (slots === undefined) return () => {};

    const sessions = ctx.get("sessions") as ISessions | undefined;
    if (
      sessions === undefined ||
      typeof sessions.list?.getSnapshot !== "function" ||
      typeof sessions.list?.subscribe !== "function"
    ) {
      // No sessions store on this context (harness, older runtime): keep the
      // tab always registered, matching the pre-gate behavior.
      want = true;
      reconcile(slots);
      return function () {
        want = false;
        reconcile(slots);
      };
    }

    let list: SessionListState = sessions.list.getSnapshot();

    const sync = function (): void {
      /*
       * THE BADGE'S SESSION COMES FROM HERE, not from a board render.
       *
       * User-reported 2026-09-05: "the ticket count in the chat/trajectory/
       * tickets bar shows the count of the previous workspace you opened the
       * board in", and then the diagnosis, which was right: "they both
       * update when the board is opened but it doesn't matter WHICH board".
       *
       * `reportCount` fires during LocalTicketView's render, so it named
       * whatever board was on screen and the tab of workspace A took
       * workspace B's count. This effect already subscribes to the sessions
       * store precisely because it needs to know the current session, so
       * the authoritative answer was one line away the whole time.
       */
      setCurrentSession(list.current ?? null);
      const preset = list.current
        ? list.byId[list.current]?.agentPreset
        : undefined;
      // undefined = the deployment composes no presets; keep the tab.
      want = preset === undefined || preset === AIDOS_PRESET;
      reconcile(slots);
    };

    const disposeSubscribe = sessions.list.subscribe(function () {
      list = sessions.list.getSnapshot();
      sync();
    });
    sync();

    return function () {
      disposeSubscribe();
      want = false;
      reconcile(slots);
    };
  }, "aidos: tickets tab visibility");

  /*
   * A badge change re-registers the entry, which is the only way the tab
   * header re-reads the label. Dispose first, and only while the tab is
   * visible: a hidden tab has no registration to refresh.
   *
   * #100: THIS IS WHY READERS WERE EJECTED FROM A TICKET. A slot
   * re-registration UNMOUNTS AND REMOUNTS the component, destroying every
   * useState and useRef in the tree -- the open ticket among them. The count
   * changes on any board write anywhere in the workspace, so the trigger was
   * usually someone else's action, which is exactly why it felt random.
   *
   * The real fix is that the selection now lives in the module-level store
   * (view-state.ts) and survives a remount. This guard is the second half:
   * re-register only when the rendered LABEL STRING actually differs.
   *
   * reportCount already skips an unchanged count, but the same label covers
   * MANY counts -- every count of zero renders "Tickets" -- so a board
   * churning between zero and zero-again, or any change that does not alter
   * the text, previously still remounted the tree for no visible benefit.
   * Comparing the rendered string removes that churn entirely.
   */
  let lastLabel = badgeLabel();
  setCountCallback(function () {
    if (registration === null) return;
    const next = badgeLabel();
    if (next === lastLabel) return;
    const slots = ctx.get("slots") as SlotRegistry | undefined;
    if (slots === undefined) return;
    /*
     * DEFENSIVE, and the comment at the top of this file explains why:
     * "Registering twice without disposing throws ... which crashes the slot
     * entry and blanks the pane."
     *
     * User-reported: "opening the queue modal makes the board disappear."
     * Opening the queue changes the count, which lands here -- and if the
     * re-register throws, the old registration is already disposed and
     * `registration` is left holding a dead handle, so the tab is gone and
     * the pane is blank with no way back short of a reload.
     *
     * A label refresh is COSMETIC. It must never be able to take the board
     * down with it: on failure, drop the stale handle and leave the label
     * stale rather than leaving the user with no board. `lastLabel` is only
     * advanced on success, so the next count change retries.
     */
    try {
      registration();
      registration = registerTicketsTab(slots);
      lastLabel = next;
      // Queue-disappearance probe: a SUCCESSFUL re-register here is a board
      // remount. Unconditional, so the console names the mechanism.
      // eslint-disable-next-line no-console
      console.info(`[aidos] tab re-registered for label "${next}" <- this remounts the board`);
    } catch (error) {
      registration = null;
      // eslint-disable-next-line no-console
      console.error(
        "aidos: the Tickets tab failed to re-register after a badge change; " +
          "the tab may show a stale count until the next visibility change",
        error,
      );
    }
  });
}
