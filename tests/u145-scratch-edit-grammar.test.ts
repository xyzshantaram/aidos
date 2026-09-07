/**
 * #145 (2026-09-07): scratch_edit refused the anchor grammar it advertised.
 *
 * **The live failure.** Calling `scratch_edit` with an `edits` array — a
 * parameter its own schema declared — came back:
 *
 *   {"ok":false,"error":"edit_grammar_unsupported","message":"the resolved
 *    edit tool does not accept the anchor grammar (`edits`); use
 *    old_string/new_string instead","accepts":["file_path","old_string",
 *    "new_string","replace_all","sandbox_permissions","justification"]}
 *
 * **The diagnosis (independent).** The SCHEMA was the liar, not the
 * resolver. The builtin `edit` this wrapper delegates to declares only
 * file_path/old_string/new_string/replace_all and never had `edits`; the
 * anchor grammar came from dsh-better-edit, which was mounted once and has
 * since been dropped. The runtime detection was doing its job perfectly —
 * it inspected the resolved backend and refused a grammar that backend
 * cannot take.
 *
 * So the fix is to stop advertising it. A capability whose availability is
 * decided at RUNTIME cannot be promised by a schema fixed at REGISTRATION,
 * and a tool that documents a grammar it usually cannot accept teaches the
 * model to write calls that always fail.
 *
 * Both halves are pinned here: the schema no longer promises anchors, and
 * the runtime refusal still fires if one is passed anyway.
 */

import { describe, expect, it, beforeEach } from "vitest";

import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness, type Harness } from "./b1-harness";

/**
 * The parameter names a registered tool actually declares.
 *
 * Reads `parameters.properties`, because `defineTool` COMPILES the spec
 * into a JSON schema: the registered object's own keys are
 * `type`/`properties`/`required`. A first cut of this helper returned those
 * three, which made `not.toContain("edits")` pass no matter what the tool
 * declared — the assertion would have been green against the unfixed code.
 * The sibling test below ("the literal grammar it DOES forward") is what
 * exposed it, which is the argument for asserting both directions.
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

describe("#145 scratch_edit advertises only the grammar it can honour", () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});
  });

  it("does NOT declare the anchor grammar", () => {
    // The whole defect in one assertion: the model reads this schema and
    // wrote calls the wrapper could never pass on.
    expect(declaredParams(harness, "scratch_edit")).not.toContain("edits");
  });

  it("still declares the literal grammar it DOES forward", () => {
    const params = declaredParams(harness, "scratch_edit");
    expect(params).toContain("path");
    expect(params).toContain("old_string");
    expect(params).toContain("new_string");
    expect(params).toContain("replace_all");
  });

  it("its description no longer promises anchors either", () => {
    /*
     * The schema and the prose are two places the same promise is made, and
     * fixing one while leaving the other is how this bug half-survives:
     * the model reads both.
     */
    const definition = harness.tools.get("scratch_edit") as
      | { description?: string }
      | undefined;
    const description = String(definition?.description ?? "");
    expect(description).not.toContain("edits");
    expect(description).not.toContain("anchor");
    expect(description).toContain("old_string");
  });

  it("the sibling scratch tools are untouched by the narrowing", () => {
    // A schema edit that quietly changed scratch_write or scratch_read
    // would be a far worse bug than the one being fixed.
    expect(declaredParams(harness, "scratch_write")).toContain("content");
    expect(declaredParams(harness, "scratch_read")).toContain("path");
  });
});
