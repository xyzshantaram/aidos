/**
 * The aidos board client plugin. Injects the stylesheet once and registers
 * the Tickets tab into the conversation.view list slot. A badge count change
 * re-registers the identical entry so the tab header re-reads badgeLabel.
 */

import boardCss from "./board.css";
import { badgeLabel, setCountCallback } from "./view-state";
import { LocalTicketView } from "./local-ticket-view";

/** Stable plugin identity, also the loader entry id in build.mjs. */
export const name = "aidos";

/** Services this bundle reaches through the plugin context. */
export const inject = ["slots"];

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

/** Plugin body: inject the styles once and register the Tickets tab. */
export function apply(ctx: {
  slots: {
    inject: (key: string, callback: () => unknown) => () => void;
    register: (options: unknown, component: unknown) => unknown;
  };
}): void {
  // Only register the Tickets tab for sessions that run the aidos preset.
  // The client context may not expose agentPresets; when it is absent we keep
  // the current behavior (register anyway) so a missing service never hides
  // the board in a genuine aidos project.
  const maybeGet = (ctx as unknown as { get?: (s: string) => unknown }).get;
  const presets = maybeGet
    ? (maybeGet("agentPresets") as { composedPreset: (c: unknown) => string } | undefined)
    : undefined;
  if (presets && presets.composedPreset(ctx as unknown) !== "aidos") return;
  injectStyles();

  let disposeRegistration: (() => void) | null = null;

  function registerView() {
    disposeRegistration = ctx.slots.inject("conversation.view", function () {
      return ctx.slots.register(
        { name: "conversation.view", id: "tickets", order: 20, label: badgeLabel },
        LocalTicketView,
      );
    });
  }

  registerView();

  // A badge change re-registers the entry. The tab header re-reads the label,
  // which is the only way the tab text updates live.
  setCountCallback(function () {
    if (disposeRegistration !== null) disposeRegistration();
    registerView();
  });
}
