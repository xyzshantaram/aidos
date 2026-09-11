/**
 * #145 (2026-09-07): scratch_edit must MIMIC the schema of the edit tool it
 * delegates to.
 *
 * **History.** The live failure: calling `scratch_edit` with an `edits` array
 * — a parameter its own schema declared — came back
 * `edit_grammar_unsupported`. A first fix (43b4697) narrowed the declared
 * schema to old_string/new_string so anchor calls were refused BY SCHEMA. The
 * owner rejected that shortcut: "scratch_edit should just proxy to the
 * available edit tool — either str_replace or hashline with dsh_better_edit —
 * and mimic its schema. It's specifically meant to be a wrapper that just
 * makes scratch-file access a tiny bit easier."
 *
 * **The fix.** `mimicEditSchema` derives the declared parameters (and the
 * description, which must say plainly which backend and grammar apply) from
 * the edit definition resolved at registration — the builtin str_replace
 * grammar or dsh-better-edit's `{path, edits}` hashline grammar. The runtime
 * grammar detection is unchanged: it re-resolves the backend per call and
 * refuses a grammar that scope's backend cannot take, which is what keeps
 * the wrapper honest when registration-time and call-time resolution differ.
 *
 * Every assertion here drives a REAL `defineTool`-registered delegate — never
 * a mock that assumes the answer — so wrapper and delegate cannot drift apart
 * again without these tests failing.
 */

import { describe, expect, it } from "vitest";
import { defineTool } from "@deepseek-ai/dsh-tools";

import { apply } from "../src/tools/aidos-tools";
import { mimicEditSchema } from "../src/tools/scratch";
import { asContext, createHarness, type Harness } from "./b1-harness";

/**
 * The parameter names a registered tool actually declares.
 *
 * Reads `parameters.properties`, because `defineTool` COMPILES the spec
 * into a JSON schema: the registered object's own keys are
 * `type`/`properties`/`required`.
 */
function declaredParams(harness: Harness, name: string): string[] {
  const definition = harness.tools.get(name) as
    | { parameters?: { properties?: Record<string, unknown> } }
    | undefined;
  expect(definition, `${name} must be registered`).toBeDefined();
  const properties = definition?.parameters?.properties;
  expect(properties, `${name} must declare a compiled parameter schema`).toBeDefined();
  return Object.keys(properties ?? {});
}

/** The builtin str-replace grammar (dsh-tool-fs). */
const LITERAL_GRAMMAR = {
  file_path: { type: "string", required: true },
  old_string: { type: "string", required: true },
  new_string: { type: "string", required: true },
  replace_all: { type: "boolean" },
} as const;

/** dsh-better-edit's hashline anchor grammar, on the `path` key. */
const ANCHOR_GRAMMAR = {
  path: { type: "string", required: true },
  edits: { type: "array", required: true, items: { type: "array" } },
} as const;

/**
 * A harness carrying a REAL `defineTool`-registered edit backend registered
 * BEFORE the aidos plugin applies — the production order — plus a record of
 * the arguments the backend was actually handed.
 */
function harnessWithEditBeforeApply(parameters: Record<string, unknown>) {
  const harness = createHarness();
  harness.installService();
  const seen: Record<string, unknown>[] = [];
  harness.ctx.tools.register(
    defineTool({
      name: "edit",
      description: "a test edit backend",
      parameters: parameters as never,
      output: { schema: { type: "object", additionalProperties: true }, render: () => [] },
      execute: async (args: Record<string, unknown>) => {
        seen.push(args);
        return { ok: true, message: "edited" };
      },
    }) as never,
  );
  apply(asContext(harness.ctx), {});
  return { harness, seen };
}

describe("#145 scratch_edit mimics the delegate's schema", () => {
  it("declares the anchor grammar when the delegate is hashline-shaped (dsh-better-edit)", () => {
    const { harness } = harnessWithEditBeforeApply(ANCHOR_GRAMMAR);
    const params = declaredParams(harness, "scratch_edit");
    // The delegate's grammar, verbatim in presence: path + edits, nothing else.
    expect(params).toContain("path");
    expect(params).toContain("edits");
    expect(params).not.toContain("old_string");
    expect(params).not.toContain("new_string");
    expect(params).not.toContain("replace_all");
  });

  it("declares the literal grammar when the delegate is the str_replace builtin", () => {
    const { harness } = harnessWithEditBeforeApply(LITERAL_GRAMMAR);
    const params = declaredParams(harness, "scratch_edit");
    expect(params).toContain("path");
    expect(params).toContain("old_string");
    expect(params).toContain("new_string");
    expect(params).toContain("replace_all");
    expect(params).not.toContain("edits");
  });

  it("DRIFT GUARD: the declared parameters are derived from the resolved delegate, not hardcoded", () => {
    /*
     * The assertion that fails if wrapper and delegate drift apart again:
     * scratch_edit's declared grammar keys must equal what mimicEditSchema
     * derives from the SAME delegate definition the registry holds. A
     * hand-written schema (the 43b4697 regression) cannot stay in step with
     * an arbitrary delegate grammar, so this comparison pins the derivation.
     */
    for (const grammar of [ANCHOR_GRAMMAR, LITERAL_GRAMMAR]) {
      const { harness } = harnessWithEditBeforeApply(grammar);
      const delegate = harness.ctx.tools.get("edit") as { parameters?: unknown };
      const expected = Object.keys(mimicEditSchema(delegate).parameters);
      expect(declaredParams(harness, "scratch_edit")).toEqual(expected);
    }
  });

  it("the description names the backend and the grammar that applies", () => {
    /*
     * Both halves of the honesty contract: which backend is proxied, and
     * which grammar therefore applies. The 43b4697 schema was silent about
     * both while refusing a documented grammar.
     */
    const anchor = harnessWithEditBeforeApply(ANCHOR_GRAMMAR);
    const anchorDescription = String(
      (anchor.harness.tools.get("scratch_edit") as { description?: string }).description ?? "",
    );
    expect(anchorDescription).toContain("edit");
    expect(anchorDescription).toContain("edits");
    expect(anchorDescription).toContain("anchor");

    const literal = harnessWithEditBeforeApply(LITERAL_GRAMMAR);
    const literalDescription = String(
      (literal.harness.tools.get("scratch_edit") as { description?: string }).description ?? "",
    );
    expect(literalDescription).toContain("edit");
    expect(literalDescription).toContain("old_string");
    expect(literalDescription).toContain("str_replace");
  });

  it("with no edit tool visible at registration, falls back to the default builtin grammar and says so", () => {
    // Minimal harness: no edit backend registered before apply.
    const harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
    const params = declaredParams(harness, "scratch_edit");
    expect(params).toContain("old_string");
    expect(params).not.toContain("edits");
    const description = String(
      (harness.tools.get("scratch_edit") as { description?: string }).description ?? "",
    );
    expect(description).toContain("default str_replace builtin");
  });
});

describe("#145 both grammars work end-to-end through the wrapper", () => {
  it("performs an anchor edit against a hashline delegate", async () => {
    const { harness, seen } = harnessWithEditBeforeApply(ANCHOR_GRAMMAR);
    await harness.runTool("scratch_write", { path: "a.txt", content: "alpha\n" });
    const outcome = await harness.runTool("scratch_edit", {
      path: "a.txt",
      edits: [["aaa", "bbb", "replacement"]],
    });
    expect(outcome.isError, JSON.stringify(outcome.error)).toBe(false);
    expect(seen.length).toBe(1);
    expect(seen[0].edits).toEqual([["aaa", "bbb", "replacement"]]);
    // The delegate's own path key is used, and it received the ABSOLUTE path.
    expect(typeof seen[0].path).toBe("string");
    expect(seen[0].file_path).toBeUndefined();
  });

  it("performs a literal edit against the str_replace delegate", async () => {
    const { harness, seen } = harnessWithEditBeforeApply(LITERAL_GRAMMAR);
    await harness.runTool("scratch_write", { path: "e.txt", content: "alpha\nbeta\n" });
    const outcome = await harness.runTool("scratch_edit", {
      path: "e.txt",
      old_string: "beta",
      new_string: "BETA",
      replace_all: true,
    });
    expect(outcome.isError, JSON.stringify(outcome.error)).toBe(false);
    expect(seen.length).toBe(1);
    expect(seen[0].old_string).toBe("beta");
    expect(seen[0].new_string).toBe("BETA");
    expect(seen[0].replace_all).toBe(true);
    expect(typeof seen[0].file_path).toBe("string");
  });

  it("still refuses, naming the accepted grammar, a grammar the resolved delegate cannot take", async () => {
    /*
     * Mimicry is at registration; resolution is per call. A scope whose
     * backend differs from the advertised one gets a CLEAR refusal — never a
     * silently ignored parameter, never a downstream crash.
     */
    const { harness, seen } = harnessWithEditBeforeApply(LITERAL_GRAMMAR);
    await harness.runTool("scratch_write", { path: "x.txt", content: "alpha\n" });
    const outcome = await harness.runTool("scratch_edit", {
      path: "x.txt",
      edits: [["aaa", "bbb", "c"]],
    });
    expect(outcome.isError).toBe(true);
    expect(outcome.error?.message).toContain("anchor grammar");
    expect(outcome.error?.message).toContain("old_string");
    expect(seen.length, "the backend must not be called with a shape it cannot parse").toBe(0);
  });

  it("the sibling scratch tools are untouched by the mimicry", () => {
    const { harness } = harnessWithEditBeforeApply(ANCHOR_GRAMMAR);
    expect(declaredParams(harness, "scratch_write")).toContain("content");
    expect(declaredParams(harness, "scratch_read")).toContain("path");
  });
});
