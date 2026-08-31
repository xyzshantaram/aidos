/**
 * P14. The frontmatter handling of the plan parser moves to the gray-matter
 * and yaml libraries.
 *
 * The contract:
 * - `parsePlan` exposes the parsed frontmatter as a `frontmatterData` field
 *   of type `Record<string, unknown>`, parsed as YAML.
 * - `frontmatter` keeps the raw block with both fence lines, byte for byte,
 *   so the document round trips through `renderPlan`.
 * - A document whose frontmatter is not valid YAML is refused with a
 *   `PlanParseError` whose message names the frontmatter and carries the
 *   underlying YAML complaint.
 * - A document with no frontmatter yields `frontmatterData` equal to `{}`
 *   and `frontmatter` equal to `""`.
 * - An unclosed fence keeps the `the frontmatter never closes` refusal.
 * - The live `plan_import` tool returns a structured refusal for a file with
 *   malformed frontmatter.
 * - `package.json` carries `gray-matter` and `yaml` in `dependencies`, and no
 *   file under `src/kernel/` imports either library.
 */

import { describe, expect, it } from "vitest";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { parsePlan, renderPlan, PlanParseError } from "../src/plan/plan";
import { apply } from "../src/tools/aidos-tools";
import { asContext, createHarness, failureOf, type Harness } from "./b1-harness";

/** Read one field of the new contract through a cast, so the test compiles before the field exists. */
function frontmatterDataOf(doc: unknown): Record<string, unknown> | undefined {
  return (doc as { frontmatterData?: Record<string, unknown> }).frontmatterData;
}

/** A document with valid YAML frontmatter, one preamble, one phase, one ticket. */
const FRONTMATTER_PLAN = `---
title: Demo plan
count: 2
tags:
  - a
  - b
---

One preamble paragraph.

## Phase 2: core

- [x] **Ticket P8: A title here.** body prose
  more body. **Evaluate:** first criterion.
  second criterion.
`;

/** The frontmatter block alone, byte for byte. */
const FRONTMATTER_BLOCK = `---
title: Demo plan
count: 2
tags:
  - a
  - b
---`;

/** A document whose frontmatter block holds text the yaml parser refuses. */
const BAD_YAML_PLAN = `---
key: ok
	bad indentation
---
`;

/** A document with no frontmatter at all. */
const NO_FRONTMATTER_PLAN = `Just one preamble line.
`;

/** A document whose frontmatter fence never closes. */
const UNCLOSED_PLAN = `---
title: Demo plan
`;

describe("p14 frontmatter", () => {
  it("parsePlan exposes the frontmatter as parsed YAML data", () => {
    const doc = parsePlan(FRONTMATTER_PLAN);

    const data = frontmatterDataOf(doc);
    expect(data).toEqual({
      title: "Demo plan",
      count: 2,
      tags: ["a", "b"],
    });

    const bare = parsePlan(NO_FRONTMATTER_PLAN);
    expect(frontmatterDataOf(bare)).toEqual({});
  });

  it("frontmatter keeps the raw block with both fence lines, byte for byte", () => {
    const doc = parsePlan(FRONTMATTER_PLAN);
    expect(doc.frontmatter).toBe(FRONTMATTER_BLOCK);

    const rendered = renderPlan(doc);
    expect(rendered).toBe(FRONTMATTER_PLAN);
  });

  it("a frontmatter that is not valid YAML is refused with a message that names the frontmatter", () => {
    let caught: unknown;
    try {
      parsePlan(BAD_YAML_PLAN);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PlanParseError);
    const message = (caught as PlanParseError).message;
    expect(message).toMatch(/frontmatter/);
    expect(message).toMatch(/YAML|yaml|indentation|map/i);
  });

  it("a document with no frontmatter yields empty raw frontmatter text", () => {
    const doc = parsePlan(NO_FRONTMATTER_PLAN);
    expect(doc.frontmatter).toBe("");
  });

  it("an unclosed frontmatter fence keeps the never closes refusal", () => {
    expect(() => parsePlan(UNCLOSED_PLAN)).toThrow(PlanParseError);
    expect(() => parsePlan(UNCLOSED_PLAN)).toThrow(
      "the frontmatter never closes",
    );
  });

  it("plan_import refuses a file with malformed frontmatter through a structured refusal", async () => {
    const harness: Harness = createHarness();
    harness.installService();
    apply(asContext(harness.ctx), {});

    const planFile = harness.tempPlanFile(BAD_YAML_PLAN);
    const outcome = await harness.runTool("plan_import", { file: planFile });
    const failure = failureOf(outcome);
    expect(failure.message).toMatch(/frontmatter/);
  });

  it("package.json carries the two libraries and src/kernel imports neither", () => {
    const root = join(__dirname, "..");
    const pkg = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.["gray-matter"]).toBeTypeOf("string");
    expect(pkg.dependencies?.["yaml"]).toBeTypeOf("string");

    const kernelDir = join(root, "src", "kernel");
    const importPattern =
      /from\s+["'](gray-matter|yaml)["']|require\(["'](gray-matter|yaml)["']\)/;
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (importPattern.test(readFileSync(path, "utf8"))) {
          offenders.push(path);
        }
      }
    };
    walk(kernelDir);
    expect(offenders).toEqual([]);
  });
});
