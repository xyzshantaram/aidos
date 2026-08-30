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
import { badgeLabel, setCountCallback } from "./view-state";
import { LocalTicketView } from "./local-ticket-view";

/** Stable plugin identity, also the loader entry id in build.mjs. */
export const name = "aidos";

/** Services this bundle reaches through the plugin context. */
export const inject = ["slots"];

/** The preset id whose sessions show the Tickets tab. */
const AIDOS_PRESET = "aidos";

/** Inject the stylesheet once. The data-plugin-css guard prevents duplicates. */
function injectStyles(): void {
  if (typeof document === "undefined") return;
  if (
    document.querySelector("style[data-plugin-css=\"aidos/board.css\"]") !== null
  )
    return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "aidos";
  tag.dataset.pluginCss = "aidos/board.css";
  tag.textContent = boardCss;
  document.head.appendChild(tag);
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
 */
export function apply(ctx: Context): void {
  injectStyles();

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
      const dispose = registerTicketsTab(slots);
      return function () {
        dispose();
      };
    }

    let registration: (() => void) | null = null;
    const list: { current: SessionListState } = { current: sessions.list.getSnapshot() };

    const sync = function (): void {
      const preset = list.current.current
        ? list.current.byId[list.current.current]?.agentPreset
        : undefined;
      // undefined = the deployment composes no presets; keep the tab.
      const want = preset === undefined || preset === AIDOS_PRESET;
      if (want && registration === null) {
        registration = registerTicketsTab(slots);
      }
      if (!want && registration !== null) {
        registration();
        registration = null;
      }
    };

    const disposeSubscribe = sessions.list.subscribe(function () {
      list.current = sessions.list.getSnapshot();
      sync();
    });
    sync();

    return function () {
      disposeSubscribe();
      if (registration !== null) {
        registration();
        registration = null;
      }
    };
  }, "aidos: tickets tab visibility");

  // A badge change re-registers the entry. The tab header re-reads the label,
  // which is the only way the tab text updates live. The callback re-reads
  // the live slots service, so a visible tab re-registers and a hidden one
  // stays hidden.
  setCountCallback(function () {
    const slots = ctx.get("slots") as SlotRegistry | undefined;
    if (slots === undefined) return;
    registerTicketsTab(slots);
  });
}
