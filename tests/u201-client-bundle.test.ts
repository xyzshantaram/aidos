/**
 * #201: minify the client bundle + prove every hljs grammar is reached.
 *
 * WHAT THIS PINS.
 * 1. REACHABILITY: highlight.ts lazy-registers six grammars
 *    (bash/javascript/json/python/typescript/yaml). Each one must be
 *    reachable through the ONE caller that exists -- the scratch rows'
 *    code block (scratch-rows.tsx), fed by scratch_read/scratch_write
 *    paths of any extension. For every language the test asserts both
 *    halves of the path: an extension maps to it via languageFor, AND
 *    highlightCode with that language emits real hljs markup (proving the
 *    grammar module actually loads and highlights, not merely that the
 *    name is in a map). An unreached grammar would fail here and must be
 *    DROPPED from highlight.ts instead of kept -- all six pass, so all
 *    six stay.
 * 2. MINIFY: build.mjs enables minification on the client build
 *    (entryPoints src/client/index.ts). The before/after byte counts are
 *    reported by the build itself, not by this test.
 * 3. RENDER: the scratch rows still render highlighted code blocks after
 *    the change -- a ScratchReadRow and a ScratchWriteRow over a .ts path
 *    produce `code.tool-render-line-cell.hljs` nodes whose injected HTML
 *    carries hljs spans, while an unknown extension still falls back to
 *    ESCAPED text (the dangerouslySetInnerHTML security boundary).
 *
 * WHY A SHIM RENDERER. Same reason as u194: react-dom cannot load in this
 * repo's tests (react 18 against react-dom 19), so function components are
 * called directly with a minimal hook dispatcher and the element tree is
 * walked for host nodes. One deliberate deviation from u194: the dispatcher
 * holds useState OPEN (true) rather than at its initial value, because the
 * code body under test renders only in the expanded row -- the equivalent
 * of the user expanding the row, which the shim cannot click. Everything
 * else (language resolution, highlighting, escaping) is the real code.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import react from "react";

import { highlightCode, languageFor } from "../src/client/highlight";
import { ScratchReadRow, ScratchWriteRow } from "../src/client/scratch-rows";

/* ------------------------------------------------------------------ */
/* The shim renderer (u194 pattern, held open -- see header).           */
/* ------------------------------------------------------------------ */

/** Install a minimal hook dispatcher with rows held EXPANDED. */
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
    // Held open: the highlighted body renders only in the expanded row.
    useState: (_initial: unknown) => [true, noop],
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
    useTransition: () => [false, (fn: () => void) => fn()],
  };
  return () => {
    dispatcher.current = previous;
  };
}

interface HostNode {
  tag: string;
  props: Record<string, unknown>;
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
    const rendered = (element.type as (props: Record<string, unknown>) => unknown)(
      element.props,
    );
    expand(rendered, out);
    return;
  }
  if (typeof element.type === "symbol") {
    expand(element.props["children"], out);
    return;
  }
  if (typeof element.type === "string") {
    out.push({ tag: element.type, props: element.props });
    expand(element.props["children"], out);
  }
}

/** Render a component with the shim dispatcher; return every host node. */
function renderNodes(element: unknown): HostNode[] {
  const restore = installDispatcher();
  try {
    const out: HostNode[] = [];
    expand(element, out);
    return out;
  } finally {
    restore();
  }
}

/** The injected HTML of every highlighted line cell in the tree. */
function highlightedCells(root: unknown): string[] {
  return renderNodes(root)
    .filter(
      (node) =>
        node.tag === "code" &&
        typeof node.props["className"] === "string" &&
        (node.props["className"] as string).includes("tool-render-line-cell"),
    )
    .map((node) => {
      const injected = node.props["dangerouslySetInnerHTML"] as
        | { __html: string }
        | undefined;
      if (injected === undefined || typeof injected.__html !== "string") {
        throw new Error("a line cell renders without highlighted HTML");
      }
      return injected.__html;
    });
}

/* ------------------------------------------------------------------ */
/* Fixtures: settled scratch blocks, shaped like the harness's.         */
/* ------------------------------------------------------------------ */

function readBlock(path: string, content: string): unknown {
  return {
    kind: "tool-call",
    call: { argsRaw: JSON.stringify({ path }) },
    content: [
      {
        type: "text",
        text: JSON.stringify({ ok: true, path, scratch_root: "/scratch", content }),
      },
    ],
  };
}

function writeBlock(path: string, content: string): unknown {
  return {
    kind: "tool-call",
    call: { argsRaw: JSON.stringify({ path, content }) },
    content: [
      {
        type: "text",
        text: JSON.stringify({ ok: true, path, scratch_root: "/scratch", message: "created" }),
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 1. Every registered grammar is reached by a code path.               */
/* ------------------------------------------------------------------ */

describe("#201 every hljs grammar is reached", () => {
  /*
   * The six grammars highlight.ts registers, with the extensions that must
   * reach each one and a sample that must REALLY highlight (hljs spans in
   * the output, not the escaped fallback). Drop a grammar's row here and
   * the corresponding import in highlight.ts becomes dead weight the
   * bundle ships anyway -- or rather: this table failing is the signal to
   * drop the grammar, not to weaken the table.
   */
  const REACHED: ReadonlyArray<{
    language: string;
    extensions: ReadonlyArray<string>;
    sample: string;
  }> = [
    { language: "javascript", extensions: ["a.js", "a.mjs", "a.cjs", "a.jsx"], sample: "const x = 1;" },
    {
      language: "typescript",
      extensions: ["a.ts", "a.mts", "a.cts", "a.tsx"],
      sample: "const x: number = 1;",
    },
    { language: "json", extensions: ["a.json", "a.jsonc", "a.jsonl"], sample: '{"a": 1}' },
    { language: "python", extensions: ["a.py", "a.pyi"], sample: "def f():\n    return 1" },
    { language: "bash", extensions: ["a.sh", "a.bash", "a.zsh"], sample: "echo $HOME" },
    { language: "yaml", extensions: ["a.yml", "a.yaml"], sample: "a: 1" },
  ];

  for (const { language, extensions, sample } of REACHED) {
    it(`reaches ${language}: extensions map to it and it really highlights`, () => {
      for (const file of extensions) expect(languageFor(file)).toBe(language);
      const html = highlightCode(sample, language);
      expect(html).toContain("hljs-");
      expect(html).not.toBe(sample);
    });
  }

  it("still has exactly one caller, the scratch rows' code block", () => {
    // The grep half of the reachability check, pinned: if a second caller
    // appears (or the scratch rows stop calling), this arrangement -- and
    // the drop/keep verdict above -- must be re-examined.
    const rows = readFileSync(new URL("../src/client/scratch-rows.tsx", import.meta.url), "utf8");
    expect(rows).toContain('from "./highlight"');
    expect(rows).toContain("highlightCode(row.text, language)");
  });
});

/* ------------------------------------------------------------------ */
/* 2. The client build minifies.                                        */
/* ------------------------------------------------------------------ */

describe("#201 client bundle minifies", () => {
  it("enables minify on the client build in build.mjs", () => {
    const build = readFileSync(new URL("../build.mjs", import.meta.url), "utf8");
    const start = build.indexOf('entryPoints: ["src/client/index.ts"]');
    expect(start).toBeGreaterThan(-1);
    const end = build.indexOf('outfile: "dist/client/_client.bundle.js"', start);
    expect(end).toBeGreaterThan(start);
    expect(build.slice(start, end)).toContain("minify: true");
  });
});

/* ------------------------------------------------------------------ */
/* 3. Code-block rendering in scratch rows is preserved.                */
/* ------------------------------------------------------------------ */

describe("#201 scratch rows still render highlighted code", () => {
  const TS = 'const greeting: string = "hi";\n';

  it("a scratch read of a .ts file renders highlighted lines", () => {
    const cells = highlightedCells(
      react.createElement(ScratchReadRow, { block: readBlock("/scratch/notes.ts", TS) }),
    );
    expect(cells.length).toBeGreaterThan(0);
    // Joined, not per-cell: a blank line legitimately highlights to no
    // spans, so the assertion is that the block AS A WHOLE carries real
    // grammar output rather than the escaped fallback.
    expect(cells.join("\n")).toContain("hljs-");
  });

  it("a scratch write of a .ts file renders highlighted lines", () => {
    const cells = highlightedCells(
      react.createElement(ScratchWriteRow, { block: writeBlock("/scratch/notes.ts", TS) }),
    );
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.join("\n")).toContain("hljs-");
  });

  it("an unknown extension still falls back to escaped text", () => {
    const nasty = '<img src=x onerror="alert(1)">';
    const cells = highlightedCells(
      react.createElement(ScratchReadRow, {
        block: readBlock("/scratch/notes.unknownext", nasty),
      }),
    );
    expect(cells.length).toBeGreaterThan(0);
    for (const html of cells) {
      expect(html).not.toContain("hljs-");
      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img");
    }
  });
});
