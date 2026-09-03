/**
 * #81: the aidos preset must mount dsh-tool-todo, so an aidos session has
 * `todo_write` like a standard one.
 *
 * The user caught this: "dsh has a todo tool, you just can't see it for some
 * reason, it works in the standard preset" -- and asked why the agent kept
 * writing markdown todo files instead. The cause was ours, not the
 * harness's. The aidos preset builds its OWN tool realm (which is why it
 * re-mounts tool-bash, tool-fs, tool-skill and the rest), and it simply had
 * no tool-todo row. So `todo_write` was never registered, the agent could
 * not see it, and it invented a markdown file beside the very board that
 * exists to track work.
 *
 * The fix is one preset row, which is exactly the kind of thing that
 * silently disappears in a future edit -- a deleted YAML row breaks no
 * types and fails no other test. Hence this guard.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const preset = readFileSync(
  new URL("../presets/aidos/agent.cordis.yml", import.meta.url),
  "utf8",
);

/** The `- id: <name>` block of one preset row, up to the next row. */
function row(id: string): string {
  const at = preset.indexOf(`- id: ${id}\n`);
  if (at < 0) return "";
  const next = preset.indexOf("\n- id: ", at + 1);
  return preset.slice(at, next < 0 ? preset.length : next);
}

describe("#81 the aidos preset mounts the todo tool", () => {
  it("has a tool-todo row naming the dsh package", () => {
    const block = row("tool-todo");
    expect(block).not.toBe("");
    expect(block).toContain("@deepseek-ai/dsh-tool-todo");
  });

  it("matches dsh-base's configuration, so behaviour is identical", () => {
    /*
     * allowParallelInProgress: true is what dsh-base sets. Mounting the tool
     * with a DIFFERENT config would give aidos sessions a subtly different
     * todo tool, which is worse than not having one -- the user would hit a
     * behaviour difference with no visible cause.
     */
    expect(row("tool-todo")).toContain("allowParallelInProgress: true");
  });

  it("sits alongside the other tool rows this preset re-mounts", () => {
    // The reason the row was missing in the first place: this preset owns
    // its whole tool realm, so anything not listed here does not exist.
    for (const id of ["tool-bash", "tool-skill", "tool-todo"]) {
      expect(row(id)).not.toBe("");
    }
  });
});

describe("#81 the mask never denies todo_write", () => {
  const mask = readFileSync(new URL("../src/tools/mask.ts", import.meta.url), "utf8");

  it("todo_write is outside TOOL_UNIVERSE, so no ticket state can deny it", () => {
    /*
     * The mask denies `registryTools() ∩ TOOL_UNIVERSE − visible`. A tool
     * outside TOOL_UNIVERSE is therefore never denied in any tier --
     * including `open`, which is the state where planning happens and so
     * exactly where a todo list is most useful. Mounting the tool would be
     * pointless if the mask then hid it in the planning tier.
     */
    const at = mask.indexOf("const TOOL_UNIVERSE");
    const universe = mask.slice(at, mask.indexOf("]", at));
    expect(universe).not.toContain("todo_write");
  });
});
