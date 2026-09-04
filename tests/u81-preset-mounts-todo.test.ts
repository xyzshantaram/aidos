/**
 * #81: the aidos preset must mount dsh-tool-todo, so an aidos session has
 * `todo_write` like a standard one.
 *
 * The user caught this: "dsh has a todo tool, you just can't see it for some
 * reason, it works in the standard preset". The cause was ours. The aidos
 * preset builds its OWN tool realm (which is why it re-mounts tool-bash,
 * tool-fs, tool-skill and the rest), and dsh-web-app disables the base
 * tool-todo row, so a preset MUST re-mount it or the tool does not exist.
 *
 * REWRITTEN after the #81 review, which proved the first version could not
 * fail for six of eight mutations. It matched with
 * `indexOf("- id: tool-todo\n")` and `toContain(...)`, so:
 *
 *   - a row COMMENTED OUT still matched (the search hit at offset 2 inside
 *     "# - id: tool-todo");
 *   - a row NESTED inside another row's config still matched, because
 *     indentation was not anchored;
 *   - a package-name TYPO still passed, because `toContain` is satisfied by
 *     the superstring "dsh-tool-todoo" -- the single most likely real-world
 *     regression;
 *   - adding `disabled: true` still passed.
 *
 * The mutation testing behind the original commit had been real but not
 * ADVERSARIAL: it tested the mutations the test was designed to catch. This
 * version parses the YAML and asserts by equality against the top-level
 * sequence, so structure and identity are both checked rather than
 * approximated by substring.
 */

import { readFileSync } from "node:fs";

import YAML from "yaml";
import { describe, expect, it } from "vitest";

import { TOOL_UNIVERSE } from "../src/tools/mask";

interface PresetRow {
  id?: unknown;
  name?: unknown;
  disabled?: unknown;
  config?: Record<string, unknown>;
}

/*
 * logLevel silent: the preset uses cordis's custom `!!js` tag (e.g.
 * `disabled: !!js process.platform === 'win32'` on tool-bash), which this
 * parser does not know and warns about on every run. The warning is noise
 * here, and left in place it would train everyone to ignore warnings.
 *
 * The unresolved tag is harmless for these assertions: it parses to the
 * expression as a STRING with the key PRESENT, so a row disabled that way
 * still fails the `disabled` check below rather than sneaking past as
 * undefined. Verified rather than assumed.
 */
const parsed = YAML.parse(
  readFileSync(new URL("../presets/aidos/agent.cordis.yml", import.meta.url), "utf8"),
  { logLevel: "silent" },
) as unknown;

/** The preset's TOP-LEVEL rows. Anything nested elsewhere is not a mount. */
const rows: PresetRow[] = Array.isArray(parsed) ? (parsed as PresetRow[]) : [];

function row(id: string): PresetRow | undefined {
  return rows.find((r) => r.id === id);
}

describe("#81 the aidos preset mounts the todo tool", () => {
  it("parses as a top-level sequence of rows", () => {
    // Asserted first rather than assumed: if the document does not parse the
    // way this file believes, every assertion below is meaningless. The
    // substring version would have passed happily on a document it could not
    // understand at all.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => typeof r === "object" && r !== null)).toBe(true);
  });

  it("has a tool-todo row in the TOP-LEVEL sequence", () => {
    // Membership of the top-level list, not a substring hit: a row nested
    // inside another row's config is not a mount, and used to pass.
    expect(row("tool-todo")).toBeDefined();
  });

  it("names the package EXACTLY, so a typo cannot pass", () => {
    /*
     * Equality, not containment. `toContain("...dsh-tool-todo")` was
     * satisfied by "...dsh-tool-todoo", so the most likely real regression
     * sailed through the guard meant to catch it.
     */
    expect(row("tool-todo")?.name).toBe("@deepseek-ai/dsh-tool-todo");
  });

  it("matches dsh-base's configuration exactly", () => {
    /*
     * Verified field by field against the real dsh-base row during the #81
     * review (dsh-base/cordis.patch.yml). A DIFFERENT config would give
     * aidos sessions a subtly different todo tool, which is worse than not
     * having one: the user hits a behaviour difference with no visible
     * cause.
     */
    expect(row("tool-todo")?.config).toEqual({ allowParallelInProgress: true });
  });

  it("is not disabled", () => {
    /*
     * `disabled: true` leaves the row present and the tool absent, which the
     * substring version could not tell apart from a working mount.
     *
     * This also covers the `!!js` form the preset uses elsewhere: an
     * unresolved custom tag parses to the expression as a non-empty STRING
     * with the key present, so it is not undefined and this still fails.
     */
    expect(row("tool-todo")?.disabled).toBeUndefined();
    expect(Object.keys(row("tool-todo") ?? {})).not.toContain("disabled");
  });

  it("sits alongside the other tool rows this preset re-mounts", () => {
    // The reason the row went missing: this preset owns its whole tool
    // realm, so anything not listed here does not exist in the session.
    for (const id of ["tool-bash", "tool-skill", "tool-todo"]) {
      expect(row(id), `preset row ${id}`).toBeDefined();
    }
  });
});

describe("#81 the mask never denies todo_write", () => {
  it("todo_write is not in TOOL_UNIVERSE, so no tier can deny it", () => {
    /*
     * Asserted against the REAL exported set (#81 review, finding 2). The
     * first version sliced the source text from "const TOOL_UNIVERSE" to the
     * first "]" -- which lands immediately after the five spread
     * identifiers, so the slice never contained an expanded tool name and
     * the assertion could not fail. Adding todo_write to any of the five
     * source arrays passed it.
     *
     * The mask denies `registryTools() ∩ TOOL_UNIVERSE − visible`, so a tool
     * outside the universe is never denied in ANY state -- including `open`,
     * where planning happens and a todo list is most useful. Mounting the
     * tool would be pointless if the mask then hid it there.
     */
    expect(TOOL_UNIVERSE.has("todo_write")).toBe(false);
  });

  it("the universe is genuinely populated, so the check above means something", () => {
    // Guards the degenerate pass: an empty set satisfies the assertion above
    // while proving nothing at all.
    expect(TOOL_UNIVERSE.size).toBeGreaterThan(5);
    expect(TOOL_UNIVERSE.has("get_tickets")).toBe(true);
  });
});
