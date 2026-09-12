/**
 * #216: four board tools had no tool-render row, so attach_commit,
 * attach_tags, suggest_tag_change and digest_recent printed raw
 * argument/result JSON in the conversation.
 *
 * WHAT THIS PINS.
 * 1. REGISTRATION: the four names are in AIDOS_ROWS, keyed to their row.
 *    The mechanism (every entry in AIDOS_ROWS actually registering via
 *    slots.inject) is u183's suite, which derives its row list from
 *    AIDOS_ROWS itself -- so these four are covered there the moment they
 *    are listed here. The registry<->rows parity in both directions is
 *    u73's suite, which reads the host registry rather than a literal.
 * 2. CONTENT: each row renders its fields, driven through the REAL
 *    components (the u194/u201 shim: function components called directly
 *    with a minimal hook dispatcher, rows held expanded) over blocks in
 *    the harness's own shape -- not source greps.
 * 3. REFUSAL: an unresolvable attach_commit hash renders its reason as
 *    the summary and as prose in the body -- a refusal, never an empty
 *    card and never commit facts for a commit that does not exist.
 * 4. CHROME REUSE: every `aidos-*` class the four rows render already
 *    exists in board.css, and every `tool-render-*` class in the vendored
 *    sheet -- the phantom-class bug (`aidos-evidence-strips`, u73) fails
 *    here instead of shipping as unstyled markup.
 *
 * WHAT THIS DOES NOT PIN. Whether the browser actually shows the card:
 * registration is covered against a fake registry (u183) and content
 * against the shim, but only a live load proves the slot renders it.
 * That check needs a browser this session has no tool for; it is on the
 * orchestrator's verification list, not asserted here.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import react from "react";

import {
  AIDOS_ROWS,
  AttachCommitRow,
  AttachTagsRow,
  DigestRecentRow,
  SuggestTagChangeRow,
  attachCommitFacts,
  attachCommitSummary,
  attachTagsFacts,
  attachTagsSummary,
  commitHashOf,
  commitSubjectOf,
  digestFooterOf,
  digestLinesOf,
  digestSummary,
  shortHashOf,
  tagChangeLineOf,
  tagChangeSummary,
} from "../src/client/aidos-rows";

/* ------------------------------------------------------------------ */
/* Blocks in the harness's own shape (tool-block's readers).           */
/* ------------------------------------------------------------------ */

function settledBlock(args: unknown, result: unknown): unknown {
  return {
    kind: "tool_call",
    call: { argsRaw: JSON.stringify(args) },
    content: [{ type: "text", text: JSON.stringify(result) }],
    isError: false,
  };
}

function errorBlock(args: unknown, envelope: Record<string, unknown>): unknown {
  return {
    kind: "tool_call",
    call: { argsRaw: JSON.stringify(args) },
    content: [{ type: "text", text: `Error: ${JSON.stringify(envelope)}` }],
    isError: true,
  };
}

function runningBlock(args: unknown): unknown {
  return { argsRaw: JSON.stringify(args) };
}

/* ------------------------------------------------------------------ */
/* The shim renderer (u194 pattern, rows held expanded).               */
/* ------------------------------------------------------------------ */

/**
 * Install a minimal hook dispatcher; rows render EXPANDED.
 *
 * `initial === false` opens: AidosRow's `expanded` toggle is the only
 * `false`-initial state on the render path whose opening is wanted, and
 * every expandable fact opens with it, so the full text is assertable.
 * `peekOpen` opens too -- the click-through modal renders its empty
 * notice without a projection -- which is noise the assertions tolerate
 * by aiming at classes, not at the absence of text. The evidence viewer
 * stays shut: its state starts `null`, not `false`.
 */
function installDispatcher(): () => void {
  const internals = react as unknown as {
    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
      ReactCurrentDispatcher: { current: unknown };
    };
  };
  const dispatcher = internals.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    .ReactCurrentDispatcher;
  const previous = dispatcher.current;
  const noop = () => {};
  dispatcher.current = {
    readContext: () => undefined,
    useCallback: (fn: unknown) => fn,
    useContext: () => undefined,
    useDebugValue: noop,
    useDeferredValue: (value: unknown) => value,
    useEffect: noop,
    useId: () => "test-id",
    useImperativeHandle: noop,
    useInsertionEffect: noop,
    useLayoutEffect: noop,
    useMemo: (factory: () => unknown) => factory(),
    useReducer: (_reducer: unknown, initial: unknown) => [initial, noop],
    useRef: (value: unknown) => ({ current: value }),
    useState: (initial: unknown) => [
      initial === false
        ? true
        : typeof initial === "function"
          ? (initial as () => unknown)()
          : initial,
      noop,
    ],
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
    useTransition: () => [false, (fn: () => void) => fn()],
  };
  return () => {
    dispatcher.current = previous;
  };
}

interface HostNode {
  tag: string;
  className: string;
  text: string;
}

function subtreeText(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(subtreeText).join("");
  if (typeof node !== "object" || !("props" in node)) return "";
  const props = (node as { props: Record<string, unknown> }).props;
  const html = props.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
  const rendered = typeof html?.__html === "string" ? html.__html : "";
  return rendered + subtreeText(props.children);
}

/** Recursively expand function components; collect every host element. */
function expand(node: unknown, out: HostNode[]): void {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") return;
  if (Array.isArray(node)) {
    for (const child of node) expand(child, out);
    return;
  }
  if (typeof node !== "object" || !("type" in node) || !("props" in node)) return;
  const element = node as { type: unknown; props: Record<string, unknown> };
  if (typeof element.type === "function") {
    expand((element.type as (props: Record<string, unknown>) => unknown)(element.props), out);
    return;
  }
  if (typeof element.type === "symbol") {
    expand(element.props.children, out);
    return;
  }
  if (typeof element.type === "string") {
    out.push({
      tag: element.type,
      className: typeof element.props.className === "string" ? element.props.className : "",
      text: subtreeText(element.props.children),
    });
    expand(element.props.children, out);
  }
}

/** Render one row component over one block; return every host element. */
function renderRow(
  Row: (props: { block: unknown }) => unknown,
  block: unknown,
): HostNode[] {
  const restore = installDispatcher();
  try {
    const out: HostNode[] = [];
    expand(Row({ block }), out);
    return out;
  } finally {
    restore();
  }
}

function summaryText(nodes: HostNode[]): string {
  const found = nodes.find(
    (node) => node.className.includes("tool-render-summary") || node.className.includes("tool-render-path"),
  );
  return found?.text ?? "";
}

function hasClass(nodes: HostNode[], token: string): boolean {
  return nodes.some((node) => node.className.split(" ").includes(token));
}

function allText(nodes: HostNode[]): string {
  return nodes.map((node) => node.text).join("\n");
}

/* ------------------------------------------------------------------ */
/* 1. Registration.                                                    */
/* ------------------------------------------------------------------ */

describe("#216 every missing board tool has a row in AIDOS_ROWS", () => {
  const byKey = new Map(AIDOS_ROWS);

  it("keys attach_commit to AttachCommitRow", () => {
    expect(byKey.get("attach_commit")).toBe(AttachCommitRow);
  });

  it("keys attach_tags to AttachTagsRow", () => {
    expect(byKey.get("attach_tags")).toBe(AttachTagsRow);
  });

  it("keys suggest_tag_change to SuggestTagChangeRow", () => {
    expect(byKey.get("suggest_tag_change")).toBe(SuggestTagChangeRow);
  });

  it("keys digest_recent to DigestRecentRow", () => {
    expect(byKey.get("digest_recent")).toBe(DigestRecentRow);
  });

  it("registers no two rows under one name", () => {
    expect(new Set(AIDOS_ROWS.map(([key]) => key)).size).toBe(AIDOS_ROWS.length);
  });
});

/* ------------------------------------------------------------------ */
/* 2a. attach_commit.                                                  */
/* ------------------------------------------------------------------ */

const COMMIT_ARGS = { ticketId: 216, hash: "abc1234", note: "lands the four rows" };
const COMMIT_RESULT = {
  ok: true,
  ticketId: 216,
  commit: "abc1234def56789012345678901234567890123456",
  subject: "feat(#216): four board tools gain tool-render rows",
  gatePresent: 2,
  gateTotal: 3,
  gateSatisfied: false,
  nextStep: "verify the rows in the browser",
};

describe("#216 attach_commit shows the hash, the subject and the ticket", () => {
  it("reads the host-resolved hash over what the agent passed", () => {
    expect(commitHashOf(COMMIT_ARGS, COMMIT_RESULT)).toBe(COMMIT_RESULT.commit);
    expect(commitHashOf(COMMIT_ARGS, null)).toBe("abc1234");
    expect(commitHashOf(null, null)).toBeNull();
  });

  it("shortens to the twelve the evidence strip shows", () => {
    expect(shortHashOf(COMMIT_RESULT.commit)).toBe("abc1234def56");
    expect(shortHashOf("abc1234")).toBe("abc1234");
    expect(shortHashOf(null)).toBeNull();
  });

  it("summarises ticket, short hash and subject together", () => {
    const summary = attachCommitSummary("216", COMMIT_ARGS, COMMIT_RESULT, "#216 — Four rows");
    expect(summary).toContain("#216");
    expect(summary).toContain("abc1234def56");
    expect(summary).toContain("feat(#216)");
  });

  it("degrades half by half while running or titleless", () => {
    // Running: a hash, no subject yet -- never an empty line.
    expect(attachCommitSummary("216", COMMIT_ARGS, null, "#216 — Four rows")).toContain("abc1234");
    // No published title: the bare id, not blank.
    expect(attachCommitSummary("216", COMMIT_ARGS, COMMIT_RESULT, null)).toContain("#216");
  });

  it("carries hash, subject, note, gate and next step as facts", () => {
    const labels = attachCommitFacts(COMMIT_ARGS, COMMIT_RESULT).map((fact) => fact.label);
    expect(labels).toEqual(["Commit", "Subject", "Note", "Gate", "Next step"]);
    const by = (label: string) =>
      attachCommitFacts(COMMIT_ARGS, COMMIT_RESULT).find((fact) => fact.label === label);
    expect(by("Commit")?.value).toBe(COMMIT_RESULT.commit);
    expect(by("Gate")?.value).toBe("2/3");
  });

  it("renders the card with the strip, not JSON", () => {
    const nodes = renderRow(AttachCommitRow, settledBlock(COMMIT_ARGS, COMMIT_RESULT));
    expect(summaryText(nodes)).toContain("abc1234def56");
    expect(summaryText(nodes)).toContain("feat(#216)");
    expect(allText(nodes)).toContain("lands the four rows");
    // The sibling's chrome: the same evidence strip, the same facts table.
    expect(hasClass(nodes, "aidos-evidence-list")).toBe(true);
    expect(hasClass(nodes, "aidos-tool-facts")).toBe(true);
  });

  it("a refused hash reads as a refusal, not an empty card", () => {
    const reason = "git show failed: fatal: bad object deadbee";
    const nodes = renderRow(
      AttachCommitRow,
      errorBlock(COMMIT_ARGS, { ok: false, error: "tool_error", message: reason }),
    );
    // The reason is the summary line AND prose in the body.
    expect(summaryText(nodes)).toContain(reason);
    expect(hasClass(nodes, "aidos-tool-message")).toBe(true);
    expect(allText(nodes)).toContain(reason);
    // No commit facts for a commit that does not exist.
    expect(hasClass(nodes, "aidos-tool-facts")).toBe(false);
    expect(hasClass(nodes, "aidos-evidence-list")).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 2b. attach_tags.                                                    */
/* ------------------------------------------------------------------ */

const TAGS_ARGS = { ticketId: 216, tags: ["frontend", "new-tag"] };
const TAGS_RESULT = {
  ok: true,
  ticketId: 216,
  attached: ["frontend", "new-tag"],
  createdTags: ["new-tag"],
  createdCount: 1,
  message: "agent created 1 tag: new-tag",
};

describe("#216 attach_tags keeps tag creation visible", () => {
  it("summarises the count and any creation", () => {
    expect(attachTagsSummary("216", TAGS_ARGS, TAGS_RESULT, "#216 — Four rows")).toBe(
      "#216 — Four rows · 2 tags · created 1",
    );
    // No creation: the summary confirms nothing instead of claiming it.
    const settled = { ...TAGS_RESULT, createdTags: [], createdCount: 0, message: "agent created 0 tags" };
    expect(attachTagsSummary("216", TAGS_ARGS, settled, null)).toBe("#216 · 2 tags");
    // Running: the request, honestly unsettled.
    expect(attachTagsSummary("216", TAGS_ARGS, null, null)).toBe("#216 · 2 tags");
  });

  it("names nothing attached before the host answers", () => {
    expect(attachTagsFacts(TAGS_ARGS, null)).toEqual([]);
  });

  it("renders the host's creation report verbatim", () => {
    const facts = attachTagsFacts(TAGS_ARGS, TAGS_RESULT);
    expect(facts.map((fact) => fact.label)).toEqual(["Attached", "Created"]);
    // #180's whole point: the exact wording, not a paraphrase into a count.
    expect(facts.find((fact) => fact.label === "Created")?.value).toBe(
      "agent created 1 tag: new-tag",
    );
  });

  it("renders the card with the report on it", () => {
    const nodes = renderRow(AttachTagsRow, settledBlock(TAGS_ARGS, TAGS_RESULT));
    expect(summaryText(nodes)).toContain("created 1");
    expect(allText(nodes)).toContain("agent created 1 tag: new-tag");
    expect(hasClass(nodes, "aidos-tool-facts")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 2c. suggest_tag_change.                                             */
/* ------------------------------------------------------------------ */

describe("#216 suggest_tag_change renders the proposal awaiting approval", () => {
  const DELETE_ARGS = { action: "delete", tag: "stale", reason: "nobody uses it" };
  const DELETE_RESULT = {
    ok: true,
    status: "pending",
    requestId: "req-1",
    action: "delete",
    tag: "stale",
    to: null,
  };

  it("names the proposal and that it still waits", () => {
    expect(tagChangeSummary(tagChangeLineOf(DELETE_ARGS, DELETE_RESULT))).toBe(
      "delete stale · pending",
    );
    expect(
      tagChangeSummary(
        tagChangeLineOf(
          { action: "migrate", tag: "old", to: "new", reason: "rename" },
          { ok: true, status: "pending", requestId: "req-2", action: "migrate", tag: "old", to: "new" },
        ),
      ),
    ).toBe("old → new · pending");
    expect(
      tagChangeSummary(
        tagChangeLineOf(
          { action: "detach", tag: "x", ticketId: 12, reason: "wrong ticket" },
          { ok: true, status: "pending", requestId: "req-3", action: "detach", tag: "x", to: null },
        ),
      ),
    ).toBe("detach x from #12 · pending");
  });

  it("is null when the call named no proposal", () => {
    expect(tagChangeLineOf({}, null)).toBeNull();
    expect(tagChangeSummary(null)).toBe("tag change");
  });

  it("renders the reason -- the payload of a proposal -- expandably", () => {
    const nodes = renderRow(SuggestTagChangeRow, settledBlock(DELETE_ARGS, DELETE_RESULT));
    expect(summaryText(nodes)).toContain("delete stale · pending");
    expect(allText(nodes)).toContain("nobody uses it");
    expect(allText(nodes)).toContain("request req-1");
    // SuggestActionsRow's chrome: the same list, not a second one.
    expect(hasClass(nodes, "aidos-tool-list")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 2d. digest_recent.                                                  */
/* ------------------------------------------------------------------ */

const DIGEST_RESULT = {
  ok: true,
  changes: [
    {
      ticketId: 216,
      at: 1789203448,
      change: "moved to in_progress",
      title: "Four rows",
      state: "in_progress",
      nextStep: "verify the rows in the browser",
    },
    {
      ticketId: 215,
      at: 1789203400,
      change: "evidence attached",
      title: "Red typechecks",
      state: "open",
      nextStep: "leave it for its owner",
    },
  ],
  omitted: 1,
  covers: "board changes only",
};

describe("#216 digest_recent renders one next step per row", () => {
  it("reads the lines, skipping what it cannot shape", () => {
    const lines = digestLinesOf(DIGEST_RESULT);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ ticketId: "216", change: "moved to in_progress" });
    expect(digestLinesOf(null)).toEqual([]);
    expect(digestLinesOf({ changes: [null, 3, { ticketId: 1 }] })).toEqual([]);
  });

  it("counts on the line, scoped when the call was", () => {
    expect(digestSummary(null, DIGEST_RESULT, digestLinesOf(DIGEST_RESULT))).toBe("2 changes");
    expect(digestSummary({ ticketId: 216 }, DIGEST_RESULT, digestLinesOf(DIGEST_RESULT))).toBe(
      "#216 · 2 changes",
    );
    // Running is not "0 changes": that would read like a failure.
    expect(digestSummary(null, null, [])).toBe("recent changes");
  });

  it("foots the scope note and the omitted count", () => {
    expect(digestFooterOf(DIGEST_RESULT)).toBe("board changes only · 1 earlier change omitted");
    expect(digestFooterOf(null)).toBeNull();
  });

  it("renders each change with its next step, and the footer under them", () => {
    const nodes = renderRow(DigestRecentRow, settledBlock({}, DIGEST_RESULT));
    expect(summaryText(nodes)).toBe("2 changes");
    expect(allText(nodes)).toContain("moved to in_progress");
    expect(allText(nodes)).toContain("Next: verify the rows in the browser");
    expect(allText(nodes)).toContain("board changes only · 1 earlier change omitted");
    expect(hasClass(nodes, "aidos-tool-list")).toBe(true);
    expect(hasClass(nodes, "aidos-tool-footer")).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 5. Chrome reuse: no new CSS tokens.                                 */
/* ------------------------------------------------------------------ */

describe("#216 the new rows reuse the existing chrome", () => {
  const boardCss = readFileSync(new URL("../src/client/board.css", import.meta.url), "utf8");
  const vendorCss = readFileSync(
    new URL("../src/client/vendor/tool-render/tool-render.css", import.meta.url),
    "utf8",
  );

  /** Every class token the four rows render, across settled, running and refused states. */
  function renderedTokens(): Set<string> {
    const restore = installDispatcher();
    const blocks: unknown[] = [
      settledBlock(COMMIT_ARGS, COMMIT_RESULT),
      runningBlock(COMMIT_ARGS),
      errorBlock(COMMIT_ARGS, { ok: false, error: "tool_error", message: "git show failed" }),
      settledBlock(TAGS_ARGS, TAGS_RESULT),
      runningBlock(TAGS_ARGS),
      settledBlock(
        { action: "delete", tag: "stale", reason: "nobody uses it" },
        { ok: true, status: "pending", requestId: "req-1", action: "delete", tag: "stale", to: null },
      ),
      settledBlock({}, DIGEST_RESULT),
      runningBlock({}),
    ];
    const rows = [AttachCommitRow, AttachTagsRow, SuggestTagChangeRow, DigestRecentRow];
    const tokens = new Set<string>();
    try {
      for (const Row of rows) {
        for (const block of blocks) {
          const out: HostNode[] = [];
          try {
            expand(Row({ block }), out);
          } catch {
            // A row fed another tool's block may throw; the per-row suites
            // above cover each row over its own shapes. This suite only
            // collects the classes of successful renders.
          }
          for (const node of out) {
            for (const token of node.className.split(" ").filter((t) => t !== "")) {
              tokens.add(token);
            }
          }
        }
      }
    } finally {
      restore();
    }
    return tokens;
  }

  it("every aidos-* class rendered already exists in board.css", () => {
    const missing = [...renderedTokens()]
      .filter((token) => token.startsWith("aidos-"))
      .filter((token) => !boardCss.includes("." + token));
    expect(missing, "new aidos-* classes need board.css rules; reuse instead").toEqual([]);
  });

  it("every tool-render-* class rendered comes from the vendored sheet", () => {
    const missing = [...renderedTokens()]
      .filter((token) => token.startsWith("tool-render-"))
      .filter((token) => !vendorCss.includes("." + token) && !boardCss.includes("." + token));
    expect(missing).toEqual([]);
  });
});
