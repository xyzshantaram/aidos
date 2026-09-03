/**
 * Every @Remote's argument parameter must be named `args`.
 *
 * The typert gateway builds each Remote's descriptor by reflecting on the
 * PARAMETER NAME. Spelling it `_args` -- the ordinary way to mark a parameter
 * unused -- declares a Remote that accepts nothing, so every client call is
 * refused at the wire with `unexpected "args"`.
 *
 * This cost a real bug: actionNominations and pendingApprovals both shipped as
 * `_args`, so agent nominations and pending approval cards NEVER reached the
 * board. It presented as "suggestions aren't working" with no other signal,
 * because the failure was on the wire rather than in the logic.
 *
 * A source scan is the right shape here: the mistake is invisible to tsc (the
 * signature is perfectly valid TypeScript) and invisible to any unit test that
 * calls the method directly, since only the GATEWAY cares about the name.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("@Remote parameter naming", () => {
  it("no @Remote declares its argument parameter as _args", () => {
    const source = readFileSync(
      join(__dirname, "..", "src", "host", "aidos-core.ts"),
      "utf8",
    );
    const lines = source.split("\n");
    const offenders: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (!/@Remote\(/.test(lines[i])) continue;
      // The method signature follows the decorator, possibly after comments.
      for (let j = i + 1; j < Math.min(i + 12, lines.length); j += 1) {
        const line = lines[j];
        if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
        if (/_args\s*[?:]/.test(line)) {
          offenders.push(`${lines[i].trim()} -> line ${j + 1}: ${line.trim()}`);
        }
        break;
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the two remotes that hit this are declared with args", () => {
    const source = readFileSync(
      join(__dirname, "..", "src", "host", "aidos-core.ts"),
      "utf8",
    );
    expect(source).toContain("pendingApprovals(agent: Agent, args?:");
    expect(source).toContain("actionNominations(agent: Agent, args?:");
  });
});
