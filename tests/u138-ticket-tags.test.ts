/**
 * #138: ticket tags, the consumption half.
 *
 * #180 shipped tags as DATA (tags: string[] on every view, the
 * tags/attached+tags/detached delta fold, the attach_tags tool). This file
 * covers what #138 adds on top of that: tag chips on the card and detail
 * panel, a tag filter in the FilterPanel with parity filtering in the
 * get_tickets tool, and tag creation from the create-ticket modal.
 *
 * DELIBERATELY NOT HERE (reported on the ticket, not guessed):
 *  - tags as a named field on set_ticket. #180 decided this by grilling and
 *    pins it in u180 ("setTicket accepts no tags argument — the merge rule,
 *    not an omission"): a whole-list replace would reintroduce the
 *    last-write-wins clobbering the delta fold exists to prevent, and hand
 *    the agent a detach-by-omission. This suite pins the satisfiable half
 *    instead — a whole-value edit preserves folded tags.
 *  - group-by-tag. Explicitly deferred; a source guard below pins that no
 *    grouping vocabulary ships with this change.
 *  - (follow-up fix) the last runtime link of the panel filter USED to be
 *    open: view-state.ts cloneAppliedState and local-ticket-view.ts
 *    restoreFilter reconstructed the applied state field-by-field and
 *    dropped `tags`. Both now copy it through, and the "runtime link"
 *    block below proves the panel's tag filter survives both functions
 *    and still narrows the board.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { filterTicketViews } from "../src/kernel/projections";
import type { TicketFilter } from "../src/kernel/projections";
import {
  filterTickets,
  idColor,
  tagColor,
  tagCounts,
} from "../src/client/board-logic";
import type { FilterState } from "../src/client/board-logic";
import { TicketTagChips, TicketTile } from "../src/client/ticket-tile";
import { parseTagInput } from "../src/client/create-ticket-modal";
import { cloneAppliedState } from "../src/client/view-state";
import { restoreFilter } from "../src/client/local-ticket-view";
import type { TicketView } from "../src/kernel/projections";
import { apply } from "../src/tools/aidos-tools";
import { AidosService } from "../src/host/aidos-core";
import {
  asContext,
  createHarness,
  successJson,
} from "./b1-harness";

function setup() {
  const harness = createHarness();
  harness.installService();
  apply(asContext(harness.ctx), {});
  const svc = harness.service;
  const agent = harness.asAgent();
  const fake = harness.agent;
  return { harness, svc, agent, fake };
}

function create(
  svc: AidosService,
  agent: Parameters<AidosService["setTicket"]>[0],
  title: string,
) {
  svc.setTicket(agent, { title });
  const found = svc.getTickets(agent).find((row) => row.title === title);
  if (found === undefined) throw new Error(`test setup: ticket ${title} not found`);
  return found;
}

/** One minimal filterable row. Tags default to untagged. */
function row(
  id: number,
  extra: {
    state?: string;
    projectId?: number;
    tags?: string[];
    updatedAt?: number;
  } = {},
) {
  return {
    id,
    title: "Ticket " + id,
    criteria: "criterion",
    confidenceScore: 1,
    gateFraction: 0.5,
    updatedAt: extra.updatedAt ?? id,
    state: extra.state ?? "open",
    projectId: extra.projectId ?? 1,
    tags: extra.tags ?? [],
    workspaceKey: "--ws--",
    slug: "ticket-" + id,
  };
}

const ALL_STATES = [
  "open",
  "in_progress",
  "awaiting_verification",
  "done",
] as FilterState["stateIds"];

function panelFilter(tags?: string[]): FilterState {
  return {
    projectIds: null,
    stateIds: [...ALL_STATES],
    sortKey: "confidence",
    descending: true,
    search: "",
    ...(tags === undefined ? {} : { tags }),
  };
}

// ---- the kernel: tag narrowing ------------------------------------------------

describe("#138 the kernel filters by tags", () => {
  const rows = [
    row(1, { tags: ["ui"] }),
    row(2, { tags: ["ui", "host"] }),
    row(3, { tags: ["host"] }),
    row(4),
  ];

  it("absent or empty means all tickets — unlike stateIds, where empty means none", () => {
    expect(filterTicketViews(rows, {}).map((r) => r.id)).toEqual([1, 2, 3, 4]);
    expect(filterTicketViews(rows, { tags: [] }).map((r) => r.id)).toEqual([1, 2, 3, 4]);
    // The contrast, pinned: an empty state selection matches nothing.
    expect(filterTicketViews(rows, { stateIds: [] })).toEqual([]);
  });

  it("one tag keeps exactly its carriers", () => {
    expect(filterTicketViews(rows, { tags: ["ui"] }).map((r) => r.id)).toEqual([1, 2]);
  });

  it("several tags match carriers of ANY of them, and an unknown tag matches nothing", () => {
    expect(filterTicketViews(rows, { tags: ["ui", "host"] }).map((r) => r.id)).toEqual([
      1, 2, 3,
    ]);
    expect(filterTicketViews(rows, { tags: ["ghost"] })).toEqual([]);
  });

  it("composes with state, project, and search", () => {
    const mixed = [
      row(1, { tags: ["ui"], state: "open" }),
      row(2, { tags: ["ui"], state: "done" }),
      row(3, { tags: ["ui"], state: "open", projectId: 2 }),
    ];
    const filter: TicketFilter = { stateIds: ["open"], projectIds: [1], tags: ["ui"] };
    expect(filterTicketViews(mixed, filter).map((r) => r.id)).toEqual([1]);
    expect(
      filterTicketViews(mixed, { search: "ticket 2", tags: ["ui"] }).map((r) => r.id),
    ).toEqual([2]);
  });

  it("a row without a tags field reads as untagged, never as a crash", () => {
    const { tags: _dropped, ...legacy } = row(5, { tags: ["ui"] });
    void _dropped;
    expect(filterTicketViews([legacy, row(6, { tags: ["ui"] })], { tags: ["ui"] }).map((r) => r.id)).toEqual([6]);
    expect(filterTicketViews([legacy], {}).map((r) => r.id)).toEqual([5]);
  });

  it("still sorts the survivors", () => {
    const out = filterTicketViews(
      [row(1, { tags: ["ui"], updatedAt: 3 }), row(2, { tags: ["ui"], updatedAt: 9 })],
      { tags: ["ui"], sortKey: "time", descending: true },
    ).map((r) => r.id);
    expect(out).toEqual([2, 1]);
  });
});

// ---- board-logic: the panel's mapping and helpers ------------------------------

describe("#138 the board maps the panel filter and names tag colours", () => {
  const rows = [
    row(1, { tags: ["ui"] }),
    row(2, { tags: ["ui", "host"] }),
    row(3),
  ];

  it("filterTickets passes tags through and agrees with the kernel", () => {
    const filter = panelFilter(["ui"]);
    expect(filterTickets(rows, filter).map((r) => r.id)).toEqual(
      filterTicketViews(rows, { ...filter }).map((r) => r.id),
    );
    expect(filterTickets(rows, panelFilter()).map((r) => r.id)).toEqual([1, 2, 3]);
    expect(filterTickets(rows, panelFilter([])).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("tagColor is the id-badge hash family, stable per tag", () => {
    expect(tagColor("ui")).toBe(idColor("ui"));
    expect(tagColor("ui")).toBe(tagColor("ui"));
  });

  it("tagCounts aggregates in Tags-browser order: count desc, name asc", () => {
    expect(tagCounts(rows)).toEqual([
      { tag: "ui", count: 2 },
      { tag: "host", count: 1 },
    ]);
    expect(tagCounts([row(1), row(2)])).toEqual([]);
  });
});

// ---- host and tool: FilterPanel parity ------------------------------------------

describe("#138 getTickets and get_tickets filter by tags too", () => {
  function seed(svc: AidosService, agent: Parameters<AidosService["setTicket"]>[0]) {
    const a = create(svc, agent, "Tagged UI");
    const b = create(svc, agent, "Tagged UI Host");
    const c = create(svc, agent, "Untagged");
    svc.agentAttachTags(agent, { ticketId: a.id, tags: ["ui"] });
    svc.agentAttachTags(agent, { ticketId: b.id, tags: ["ui", "host"] });
    return { a, b, c };
  }

  it("the host narrows by tags and defaults to everything", () => {
    const { svc, agent } = setup();
    const ids = seed(svc, agent);
    expect(svc.getTickets(agent, { tags: ["ui"] }).map((r) => r.id).sort()).toEqual(
      [ids.a.id, ids.b.id].sort(),
    );
    expect(svc.getTickets(agent, { tags: ["host"] }).map((r) => r.id)).toEqual([ids.b.id]);
    expect(svc.getTickets(agent, { tags: ["ghost"] })).toEqual([]);
    expect(svc.getTickets(agent).length).toBe(3);
    expect(svc.getTickets(agent, { tags: [] }).length).toBe(3);
  });

  it("the tool accepts tags and agrees with the host", async () => {
    const { harness, svc, agent, fake } = setup();
    const ids = seed(svc, agent);
    const payload = successJson(
      await harness.runTool("get_tickets", { tags: ["ui"] }, { agent: fake }),
    ) as { ok: boolean; total: number; tickets: Array<{ id: number; tags: string[] }> };
    expect(payload.ok).toBe(true);
    expect(payload.total).toBe(2);
    expect(payload.tickets.map((t) => t.id).sort()).toEqual([ids.a.id, ids.b.id].sort());
    // Summary rows still carry the tag names, not just a count (#180 DATA).
    for (const ticket of payload.tickets) {
      expect(ticket.tags).toContain("ui");
    }
    const all = successJson(
      await harness.runTool("get_tickets", {}, { agent: fake }),
    ) as { ok: boolean; total: number };
    expect(all.total).toBe(3);
    void ids;
  });

  it("the exact payload the panel emits agrees across all three layers", () => {
    const { svc, agent } = setup();
    const ids = seed(svc, agent);
    // What FilterPanel.onApply hands up when the user ticks "ui".
    const emitted: FilterState = {
      projectIds: null,
      stateIds: [...ALL_STATES],
      sortKey: "confidence",
      descending: true,
      search: "",
      tags: ["ui"],
    };
    const boardRows = svc.getTickets(agent);
    const panelIds = filterTickets(boardRows, emitted).map((r) => r.id).sort();
    const kernelIds = filterTicketViews(boardRows, emitted).map((r) => r.id).sort();
    const hostIds = svc.getTickets(agent, { tags: emitted.tags }).map((r) => r.id).sort();
    expect(panelIds).toEqual([ids.a.id, ids.b.id].sort());
    expect(kernelIds).toEqual(panelIds);
    expect(hostIds).toEqual(panelIds);
    void ids;
  });
});

// ---- criterion 1, satisfiable half: edits preserve folded tags -------------------

describe("#138 a whole-value edit preserves folded tags (no set_ticket tags field)", () => {
  it("editing the title keeps the tags the delta fold holds", () => {
    const { svc, agent } = setup();
    const ticket = create(svc, agent, "Work");
    svc.agentAttachTags(agent, { ticketId: ticket.id, tags: ["ui"] });
    svc.setTicket(agent, { ticketId: ticket.id, title: "Renamed" });
    const read = svc.getTicket(agent, { ticketId: ticket.id });
    expect(read.ticket.title).toBe("Renamed");
    expect(read.ticket.tags).toEqual(["ui"]);
  });
});

// ---- chips: the shared component renders, the tile wires it ----------------------

interface ElementProps {
  children?: unknown;
  className?: unknown;
  [key: string]: unknown;
}

/** Walk a React element tree without a renderer (node has no DOM). */
function walk(
  node: unknown,
  visit: (props: ElementProps, type: unknown) => void,
): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (node === null || typeof node !== "object") return;
  const element = node as { type?: unknown; props?: unknown };
  if (element.type === undefined) return;
  if (element.props === null || typeof element.props !== "object") return;
  const props = element.props as ElementProps;
  visit(props, element.type);
  walk(props.children, visit);
}

function textOf(children: unknown): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(textOf).join("");
  return "";
}

function tagSpans(node: unknown): Array<{ text: string; props: ElementProps }> {
  const out: Array<{ text: string; props: ElementProps }> = [];
  walk(node, (props) => {
    if (typeof props.className === "string" && props.className.includes("aidos-chip-tag")) {
      out.push({ text: textOf(props.children), props });
    }
  });
  return out;
}

function makeView(id: number, tags: string[]): TicketView {
  return {
    id,
    projectId: 1,
    title: "Ticket " + id,
    description: "description",
    body: "",
    criteria: "criterion",
    phase: 1,
    order: id,
    state: "open",
    dependsOn: [],
    allowlist: [],
    tags,
    confidenceScore: 1,
    gateFraction: 0.5,
    gatePresent: 1,
    gateTotal: 2,
    updatedAt: 1000 + id,
    workspaceKey: "--ws--",
    slug: "ticket-" + id,
  };
}

describe("#138 tag chips render on the card", () => {
  it("TicketTagChips renders one chip per tag and null when untagged", () => {
    expect(TicketTagChips({ tags: [] })).toBeNull();
    const spans = tagSpans(TicketTagChips({ tags: ["ui", "host"] }));
    expect(spans.map((s) => s.text)).toEqual(["ui", "host"]);
    for (const span of spans) {
      expect(span.props["aria-label"]).toBe("Tag " + span.text);
      const style = span.props["style"] as { "--chip-hue"?: unknown } | undefined;
      expect(style?.["--chip-hue"]).toBe(tagColor(span.text));
    }
  });

  it("the tile wires its tags into TicketTagChips", () => {
    const tree = TicketTile({
      ticket: makeView(7, ["ui"]),
      evidence: [],
      selected: false,
      onSelect: () => {},
    });
    let wired: unknown = null;
    walk(tree, (props, type) => {
      if (type === TicketTagChips) wired = (props as { tags?: unknown }).tags;
    });
    expect(wired).toEqual(["ui"]);
    // And the shared component renders those same tags as chips.
    expect(tagSpans(TicketTagChips({ tags: (wired as string[]) ?? [] })).map((s) => s.text)).toEqual([
      "ui",
    ]);
  });

  it("an untagged tile wires an empty list, rendering no chip", () => {
    const tree = TicketTile({
      ticket: makeView(8, []),
      evidence: [],
      selected: false,
      onSelect: () => {},
    });
    let wired: unknown = null;
    walk(tree, (props, type) => {
      if (type === TicketTagChips) wired = (props as { tags?: unknown }).tags;
    });
    expect(wired).toEqual([]);
    expect(TicketTagChips({ tags: [] })).toBeNull();
  });

  it("the detail panel renders the same shared chips from its ticket", () => {
    // DetailPanel owns hooks, so it cannot be invoked without a renderer;
    // this pins the wiring instead: the shared component off the ticket's
    // own tags, in the chips row.
    const detail = readFileSync(
      new URL("../src/client/detail-panel.tsx", import.meta.url),
      "utf8",
    );
    expect(detail).toMatch(/import \{ TicketTagChips \} from "\.\/ticket-tile"/);
    expect(detail).toMatch(/<TicketTagChips tags=\{ticket\.tags \?\? \[\]\} \/>/);
  });
});

// ---- create modal: tags through the board's user-actor path -----------------------

describe("#138 the create modal takes tags and attaches them after the create", () => {
  it("parseTagInput splits on commas, trims, drops empties, dedupes", () => {
    expect(parseTagInput("")).toEqual([]);
    expect(parseTagInput("  , ,")).toEqual([]);
    expect(parseTagInput("ui, host, debt")).toEqual(["ui", "host", "debt"]);
    expect(parseTagInput("  ui ,ui, host  ")).toEqual(["ui", "host"]);
  });

  it("the modal's sequence — userSetTicket then userAttachTags — lands tags", () => {
    const { svc, agent } = setup();
    const created = svc.userSetTicket(agent, {
      title: "Fresh",
      description: "",
      criteria: "",
    });
    const attached = svc.userAttachTags(agent, {
      ticketId: created.id,
      tags: parseTagInput("ui, host, ui"),
    });
    expect(attached.attached).toEqual(["ui", "host"]);
    expect(svc.getTicket(agent, { ticketId: created.id }).ticket.tags).toEqual([
      "ui",
      "host",
    ]);
  });

  it("userAttachTags cleans like the agent path and refuses an empty batch", () => {
    const { svc, agent } = setup();
    const created = svc.userSetTicket(agent, { title: "Fresh" });
    expect(() => svc.userAttachTags(agent, { ticketId: created.id, tags: [] })).toThrow(
      "at least one",
    );
    expect(() => svc.userAttachTags(agent, { ticketId: created.id, tags: ["  "] })).toThrow(
      "non-empty",
    );
  });

  it("the modal reaches tags only through the user Remote, never a tag event", () => {
    const modal = readFileSync(
      new URL("../src/client/create-ticket-modal.tsx", import.meta.url),
      "utf8",
    );
    expect(modal).toMatch(/"userAttachTags"/);
    expect(modal).not.toMatch(/tags\/(attached|detached)/);
    // set_ticket itself stays tag-free: the create carries no tags argument.
    expect(modal).not.toMatch(/userSetTicket",\s*\{[^}]*tags/);
  });
});

// ---- deferred, pinned: no group-by-tag ships here ----------------------------------

describe("#138 group-by-tag stays deferred", () => {
  it("no grouping vocabulary ships in the filter or its surfaces", () => {
    const read = (name: string): string =>
      readFileSync(new URL("../src/" + name, import.meta.url), "utf8");
    for (const name of [
      "kernel/projections.ts",
      "client/board-logic.ts",
      "client/filter-panel.tsx",
      "tools/aidos-tools.ts",
      "host/aidos-core.ts",
    ]) {
      expect(read(name)).not.toMatch(/groupBy/i);
    }
  });
});

// ---- follow-up fix: the tag filter survives view state -----------------------------
//
// The FilterPanel stages its filter in view-state, and the board restores a
// persisted one from localStorage. Both paths used to rebuild the state
// field-by-field and silently drop `tags` — the panel showed the filter,
// the live board ignored it. These tests pin the two handoff points and
// prove a tag-narrowed filter still narrows after each one.

/**
 * A minimal window stub whose localStorage answers ANY key with the given
 * payload — restoreFilter keys off its own private storage key, and the
 * tests care about what comes back, not the key it lives under.
 */
function fakeWindow(payload: string | null): unknown {
  return {
    localStorage: {
      getItem: () => payload,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    },
  };
}

function withWindow<T>(payload: string | null, body: () => T): T {
  const real = globalThis.window;
  globalThis.window = fakeWindow(payload) as unknown as typeof globalThis.window;
  try {
    return body();
  } finally {
    globalThis.window = real;
  }
}

describe("#138 the tag filter survives the view-state handoffs", () => {
  it("cloneAppliedState copies tags and defends the array", () => {
    const source = panelFilter(["ui", "host"]);
    const copy = cloneAppliedState(source);
    expect(copy.tags).toEqual(["ui", "host"]);
    // Defensive: mutating the copy must not reach back into the source.
    copy.tags!.push("ghost");
    expect(source.tags).toEqual(["ui", "host"]);
  });

  it("cloneAppliedState keeps an absent tag filter absent", () => {
    const withEmpty = cloneAppliedState(panelFilter([]));
    expect(withEmpty.tags).toEqual([]);
    const without = cloneAppliedState(panelFilter());
    expect(without.tags).toBeUndefined();
  });

  it("a cloned tag filter still narrows the board", () => {
    const rows = [row(1, { tags: ["ui"] }), row(2, { tags: ["host"] }), row(3)];
    const narrowed = filterTickets(rows, cloneAppliedState(panelFilter(["ui"])));
    expect(narrowed.map((r) => r.id)).toEqual([1]);
  });

  it("restoreFilter reads tags back from localStorage as a string array", () => {
    const restored = withWindow(JSON.stringify(panelFilter(["ui", "host"])), () =>
      restoreFilter("ws", [row(1)] as never),
    );
    expect(restored.tags).toEqual(["ui", "host"]);
  });

  it("restoreFilter treats a malformed tags field as absent", () => {
    const stored = JSON.stringify({ ...panelFilter(), tags: "ui" });
    const restored = withWindow(stored, () => restoreFilter("ws", [row(1)] as never));
    expect(restored.tags).toBeUndefined();
  });

  it("restoreFilter falls back to defaults when nothing is stored", () => {
    const restored = withWindow(null, () => restoreFilter("ws", [row(1)] as never));
    expect(restored.tags).toBeUndefined();
    expect(restored.search).toBe("");
  });

  it("a restored tag filter still narrows the board", () => {
    const restored = withWindow(JSON.stringify(panelFilter(["ui"])), () =>
      restoreFilter("ws", [row(1)] as never),
    );
    const rows = [row(1, { tags: ["ui"] }), row(2, { tags: ["host"] }), row(3)];
    expect(filterTickets(rows, restored).map((r) => r.id)).toEqual([1]);
  });
});
