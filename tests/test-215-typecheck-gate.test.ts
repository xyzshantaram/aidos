/**
 * #215: one command runs every typecheck, and the suite fails when any
 * project fails.
 *
 * **What happened.** `typecheck:tests` was red on main from #40 through #44
 * (five errors: `AidosEvent` imported from `src/kernel/types`, where it has
 * never lived, plus an un-narrowed optional `commitTransaction`), and the
 * breakage was recorded as "typecheck clean" three times — by the
 * orchestrator and by two independent reviewers — because everyone ran only
 * `pnpm typecheck` (the src project) and believed they had checked all of
 * it. The repo defines THREE typecheck projects; the one-command habit
 * checked one.
 *
 * **What this file enforces.** `typecheck:all` (package.json) runs every
 * project, and these tests fail when that command fails — the same
 * enforcement level as `tests/u148-bundle-freshness`, the control the repo
 * already counts alongside its pre-commit hook. The positive test executes
 * the SHIPPED command (not a re-implementation of it); the wiring test pins
 * that the command names every project, so a future edit that drops one
 * goes red here; the negative test plants a real type error and proves the
 * command refuses.
 *
 * **Why a suite test and not a pre-commit hook.** Deliberate, measured:
 * the three projects cost ~1.6s sequential on an idle machine (the tests
 * project alone burns ~2.3s of CPU), and `u148-precommit-hook` asserts the
 * whole `--precommit` run stays under 2000ms — a tsc phase would eat that
 * budget idle and flake it under suite-load contention, breaking another
 * ticket's accepted criterion as collateral. Weakening that budget to fit
 * is not this ticket's to do. And a hook that taxes every commit (test
 * files ride in nearly every commit) trains exactly the bypass habit the
 * ticket warns about. So: the separate task plus the always-on belt, with
 * the hook left untouched.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const ROOT = new URL("../", import.meta.url).pathname;

/** Every typecheck project the repo defines. All three, always. */
const PROJECTS = ["tsconfig.json", "tsconfig.tests.json", "tsconfig.client.json"];

/** The one command. When it is red, `pnpm typecheck:all` is the remedy. */
const REMEDY = "run `pnpm typecheck:all` and fix what it reports";

const PROBE = join(ROOT, "tests", "tmp-215-typecheck-probe.ts");

afterAll(() => {
  rmSync(PROBE, { force: true });
});

/**
 * The shipped command, end to end. pnpm 11's dependency pre-check dies on
 * a symlinked node_modules (which is what per-ticket worktrees have), hence
 * the flag — the same flag the orchestrator's own commands carry.
 */
function runTypecheckAll() {
  return spawnSync("pnpm", ["--config.verify-deps-before-run=false", "typecheck:all"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

describe("#215 one command runs every typecheck", () => {
  it("typecheck:all names every project, so no subset can pose as the whole check", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const cmd = pkg.scripts["typecheck:all"];
    expect(cmd, "package.json must define a typecheck:all script").toBeTruthy();
    for (const project of PROJECTS) {
      expect(cmd, `typecheck:all must run ${project} — ${REMEDY}`).toContain(project);
    }
  });

  it(
    "typecheck:all passes on this tree",
    () => {
      const result = runTypecheckAll();
      const said = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      expect(result.status, `typecheck:all failed — ${REMEDY}:\n${said}`).toBe(0);
    },
    120000,
  );

  it(
    "typecheck:all FAILS when any project fails, and names the breakage",
    () => {
      // A genuine type error in the tests project: a member that
      // src/kernel/types has never exported. Not a *.test.ts file, so
      // vitest never collects it; under tests/ so tsconfig.tests.json
      // checks it; outside src/ so no digest or bundle assertion moves.
      writeFileSync(
        PROBE,
        'import type { NoSuchExport } from "../src/kernel/types";\n' +
          "export const probe: NoSuchExport = 1 as never;\n",
      );
      try {
        const result = runTypecheckAll();
        expect(result.status, "typecheck:all passed over a broken tests project").not.toBe(0);
        const said = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        expect(said, "the refusal must name the broken file").toMatch(/tmp-215-typecheck-probe/);
      } finally {
        rmSync(PROBE, { force: true });
      }
    },
    120000,
  );
});
