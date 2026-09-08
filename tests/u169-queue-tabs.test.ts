/**
 * #169 (2026-09-08): the queue modal separates its three asks into TABS,
 * not stacked sections.
 *
 * Sign off, approvals and verification are different jobs done at different
 * times, so each gets a tab carrying its own icon, label and count. The
 * modal opens on a tab that HAS work; an empty tab says so in its own
 * terms; the whole-queue message appears only when every tab is empty.
 *
 * The partition is a pure function, so the RULES are testable — #137's
 * review history is clear that an ordering asserted by reading JSX is an
 * ordering nobody can check. The panel-source pins at the bottom cover
 * only wiring the pure tests cannot reach.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  QUEUE_TAB_EMPTY,
  QUEUE_TAB_ICON_ACTION,
  QUEUE_TAB_LABELS,
  QUEUE_TAB_ORDER,
  agentAskCount,
  defaultQueueTab,
  groupQueueByTab,
  humanQueue,
  queueButtonState,
  queueTabOf,
} from "../src/client/human-queue";
import type { QueueEntry, QueueTabId } from "../src/client/human-queue";
import { entryKey, queueEntriesFor } from "../src/client/queue-panel";
import {
  __resetModalsForTests,
  getRunningApproval,
  setRunningApproval,
} from "../src/client/view-state";
import { makeTicket } from "./u2c-helpers";

const panel = readFileSync(
  new URL("../src/client/queue-panel.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");

/** Entries spanning all three tabs, built through the real queue. */
function entriesAcrossTabs(): QueueEntry[] {
  const tickets = [
    makeTicket({ id: 1, state: "open" }),
    makeTicket({ id: 2, state: "in_progress" }),
    makeTicket({ id: 3, state: "awaiting_verification" }),
  ];
  // in_progress tickets produce no derived ask, so the approvals tab is
  // seeded with an approval card — which is what actually lands there.
  const approval = {
    id: "req-1",
    ticketId: 2,
    kind: "allowlist",
    prompt: "may I write these paths",
    payload: { paths: ["src/client"] },
    at: 0,
  };
  return humanQueue(tickets, () => [], [], "suggested", [approval as never]);
}

function tabEntries(id: QueueTabId): QueueEntry[] {
  return groupQueueByTab(entriesAcrossTabs()).find((tab) => tab.id === id)?.entries ?? [];
}

describe("#169 every entry lands in exactly one tab, none lost", () => {
  it("parts the queue into sign off, approvals, verify — in that order", () => {
    const tabs = groupQueueByTab(entriesAcrossTabs());
    expect(tabs.map((tab) => tab.id)).toEqual(["signoff", "approvals", "verify"]);
    expect([...QUEUE_TAB_ORDER]).toEqual(["signoff", "approvals", "verify"]);
  });

  it("loses no entry and duplicates none", () => {
    const entries = entriesAcrossTabs();
    const tabbed = groupQueueByTab(entries).flatMap((tab) => tab.entries);
    expect(tabbed).toHaveLength(entries.length);
    // entryKey, not boardKey: two approvals on one ticket share a board key
    // and must still count as two asks.
    expect(new Set(tabbed.map(entryKey))).toEqual(new Set(entries.map(entryKey)));
  });

  it("routes a signoff ask to the sign-off tab", () => {
    for (const entry of tabEntries("signoff")) {
      expect(entry.actionId).toBe("signoff");
      expect(entry.approvalId).toBeUndefined();
    }
    expect(tabEntries("signoff")).not.toHaveLength(0);
  });

  it("routes a pending approval card to approvals, whatever ticket it rides on", () => {
    const entries = tabEntries("approvals");
    expect(entries).not.toHaveLength(0);
    for (const entry of entries) {
      expect(entry.approvalId).not.toBeUndefined();
    }
  });

  it("routes verify AND mark-done to the verify tab — both check finished work", () => {
    // An awaiting ticket with no verification yet offers verify ...
    const unverified = humanQueue([makeTicket({ id: 3, state: "awaiting_verification" })], () => []);
    expect(unverified.map((e) => e.actionId)).toEqual(["verify"]);
    expect(unverified.map(queueTabOf)).toEqual(["verify"]);
    // ... and once the row exists the queue offers mark-done instead, which
    // is the same job at the same tab.
    const verified = humanQueue(
      [makeTicket({ id: 3, state: "awaiting_verification" })],
      () => ["builtin:user_verified"],
    );
    expect(verified.map((e) => e.actionId)).toEqual(["mark-done"]);
    expect(verified.map(queueTabOf)).toEqual(["verify"]);
  });

  it("an ask nobody invented yet still lands somewhere rather than vanishing", () => {
    const rogue = {
      ticket: makeTicket({ id: 9, state: "open" }),
      boardKey: "9",
      actionId: "send-back",
      label: "Send back",
      prompt: "x",
    } as unknown as QueueEntry;
    expect(queueTabOf(rogue)).toBe("verify");
    expect(groupQueueByTab([rogue]).flatMap((tab) => tab.entries)).toHaveLength(1);
  });

  it("labels the tabs by the WORK, and empties in their own terms", () => {
    expect(QUEUE_TAB_LABELS).toEqual({
      signoff: "Sign off",
      approvals: "Approvals",
      verify: "Verify",
    });
    // Three distinct messages, none of them the whole-queue one: an empty
    // tab is a finished job, not an empty queue.
    expect(new Set(Object.values(QUEUE_TAB_EMPTY)).size).toBe(3);
    for (const message of Object.values(QUEUE_TAB_EMPTY)) {
      expect(message).not.toContain("Nothing is waiting on you");
    }
  });

  it("each tab wears its ask's collapsed-row icon", () => {
    // The tab and its rows read as the same object at two scales: clipboard
    // for signoff, round check for verify, checklist for an approval.
    expect(QUEUE_TAB_ICON_ACTION).toEqual({
      signoff: "signoff",
      approvals: "allowlist",
      verify: "verify",
    });
  });
});

describe("#169 the counts sum to the toolbar total", () => {
  it("the tab counts part the SAME composition the toolbar button counts", () => {
    const tickets = [
      makeTicket({ id: 1, state: "open" }),
      makeTicket({ id: 2, state: "in_progress" }),
      makeTicket({ id: 3, state: "awaiting_verification" }),
    ];
    const approvals = [
      {
        id: "req-1",
        ticketId: 2,
        kind: "allowlist",
        prompt: "may I write these paths",
        payload: { paths: ["src/client"] },
        at: 0,
      },
    ];
    // queueEntriesFor is the PRODUCTION composition both surfaces share:
    // local-ticket-view counts it for the button, the panel tabs it.
    const entries = queueEntriesFor(tickets, {}, [], approvals as never);
    const tabs = groupQueueByTab(entries);
    expect(tabs.reduce((sum, tab) => sum + tab.entries.length, 0)).toBe(entries.length);
    expect(queueButtonState(entries.length, agentAskCount(entries)).count).toBe(entries.length);
  });

  it("answering an ask decrements only its own tab", () => {
    // The answered set is keyed per entry, so hiding one ask cannot move
    // the other tabs' counts: re-parting the filtered list keeps every
    // surviving entry on its tab.
    const entries = entriesAcrossTabs();
    const target = tabEntries("signoff")[0] as QueueEntry;
    const answered = new Set([entryKey(target)]);
    const visible = entries.filter((entry) => !answered.has(entryKey(entry)));
    const before = groupQueueByTab(entries);
    const after = groupQueueByTab(visible);
    for (const tab of after) {
      const was = before.find((t) => t.id === tab.id)?.entries.length ?? 0;
      expect(tab.entries.length).toBe(tab.id === "signoff" ? was - 1 : was);
    }
  });
});

describe("#169 the modal opens on a tab that has work", () => {
  it("lands on sign off when every tab has asks", () => {
    expect(defaultQueueTab(entriesAcrossTabs())).toBe("signoff");
  });

  it("never lands on an empty tab while another has asks", () => {
    // Sign off empty, approvals and verify busy: approvals first.
    expect(defaultQueueTab([...tabEntries("approvals"), ...tabEntries("verify")])).toBe(
      "approvals",
    );
    // Only verification has work.
    expect(defaultQueueTab(tabEntries("verify"))).toBe("verify");
    // Only sign off has work.
    expect(defaultQueueTab(tabEntries("signoff"))).toBe("signoff");
  });

  it("falls back to the first tab when every tab is empty", () => {
    // The whole-queue message replaces the tab body in that case, so the
    // fallback is never actually shown empty on its own.
    expect(defaultQueueTab([])).toBe("signoff");
  });

  it("re-derives live when a ticket moves: the work follows the ask", () => {
    // queueTabOf keys on the ASK (approval card, signoff action), not on
    // the ticket's state, so an answered ask leaves its tab with the next
    // render rather than needing bookkeeping.
    const open = humanQueue([makeTicket({ id: 1, state: "open" })], () => []);
    expect(defaultQueueTab(open)).toBe("signoff");
    const awaiting = humanQueue(
      [makeTicket({ id: 1, state: "awaiting_verification" })],
      () => [],
    );
    expect(defaultQueueTab(awaiting)).toBe("verify");
  });
});

describe("#169 switching tabs neither closes the runner nor loses its input", () => {
  it("the running key lives outside React and resolves against the FULL list", () => {
    const session = "u169-tab-switch";
    __resetModalsForTests();
    try {
      const entries = entriesAcrossTabs();
      // The runner is open on a verify ask while the reader looks at the
      // sign-off tab — the state after a tab switch.
      const target = entries.find((entry) => queueTabOf(entry) === "verify") as QueueEntry;
      setRunningApproval(session, entryKey(target));
      const stored = getRunningApproval(session);
      expect(stored).not.toBeNull();
      // The bug this guards: resolving the runner from the ACTIVE tab's
      // list, which closes it the moment its tab is not showing.
      const activeTabOnly =
        groupQueueByTab(entries).find((tab) => tab.id === "signoff")?.entries ?? [];
      expect(activeTabOnly.find((entry) => entryKey(entry) === stored)).toBeUndefined();
      // The panel's rule — resolve against the full entries — still finds
      // it, with its input intact.
      const resolved = entries.find((entry) => entryKey(entry) === stored) ?? null;
      expect(resolved).toBe(target);
    } finally {
      setRunningApproval(session, null);
    }
  });

  it("clearing the running key still closes the runner", () => {
    const session = "u169-tab-switch-clear";
    __resetModalsForTests();
    const entries = entriesAcrossTabs();
    setRunningApproval(session, entryKey(entries[0] as QueueEntry));
    setRunningApproval(session, null);
    expect(getRunningApproval(session)).toBeNull();
  });
});

describe("#169 the panel wiring the pure tests cannot reach", () => {
  it("tabs the FILTERED list, so an answered ask cannot survive on screen", () => {
    expect(panel).toContain("groupQueueByTab(visible)");
    expect(panel).not.toContain("groupQueueByTab(entries)");
    expect(panel).not.toContain("{entries.map((entry)");
  });

  it("the tabs are a top bar carrying icon, label and count per tab", () => {
    expect(panel).toContain('role="tablist"');
    expect(panel).toContain('role="tab"');
    expect(panel).toContain("ACTION_ICONS[QUEUE_TAB_ICON_ACTION[tab.id]");
    expect(panel).toContain("{tab.label}");
    expect(panel).toContain("{tab.entries.length}");
    expect(panel).toContain("setActiveTab(tab.id)");
  });

  it("an empty tab speaks for itself; the whole-queue message stays for all empty", () => {
    expect(panel).toContain("QUEUE_TAB_EMPTY[active.id]");
    expect(panel).toContain("Nothing is waiting on you");
  });

  it("the state grouping is gone, not stacked beside the tabs", () => {
    expect(panel).not.toContain("groupQueueByState");
    expect(panel).not.toContain("aidos-queue-group");
  });

  it("the tabs are left-aligned across the modal, not a sidebar", () => {
    const rule = css.slice(css.indexOf(".aidos-queue-tabs"));
    const block = rule.slice(0, rule.indexOf("}"));
    expect(block).toContain("display: flex");
    expect(block).toContain("justify-content: flex-start");
    expect(block).not.toContain("flex-direction: column");
  });
});
