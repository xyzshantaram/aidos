/**
 * The aidos board client plugin. Injects the stylesheet once and registers
 * the Tickets tab into the conversation.view list slot. A badge count change
 * re-registers the identical entry so the tab header re-reads badgeLabel.
 */


import { injectStyles } from "./styles";
import { badgeLabel, setCountCallback } from "./view-state";
import { LocalTicketView } from "./local-ticket-view";

/** Stable plugin identity, also the loader entry id in build.mjs. */
export const name = "aidos";

/** Services this bundle reaches through the plugin context. */
export const inject = ["slots"];

/** Plugin body: inject the styles once and register the Tickets tab. */
export function apply(ctx: {
  slots: {
    inject: (key: string, callback: () => unknown) => () => void;
    register: (options: unknown, component: unknown) => unknown;
  };
}): void {
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
