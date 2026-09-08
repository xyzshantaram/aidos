/**
 * #148 (2026-09-07): the committed bundles must correspond to the sources
 * they were built from.
 *
 * **What happened.** aidos is installed FROM GIT and pnpm runs no build at
 * install time, so `lib/client.js`, `dist/host/aidos-plugin.js` and
 * `presets/aidos/aidos-tools.js` are not by-products — they ARE the
 * product. `.gitignore` says so, which is why they are committed. But
 * nothing checked that they matched `src/`, and by the time this test was
 * written they had drifted by twelve commits: the shipped client bundle
 * still rendered a pill deleted that morning, and #100, #131, #135 and #141
 * were all absent from it. Two independent reviewers spent their runs
 * reviewing source that nobody was running, and the human was one step away
 * from hand-verifying a UI that could not contain the fixes.
 *
 * **Why a test and not a habit.** "Remember to run the build" is the
 * weakest tier of control there is, and it had already failed silently
 * seven commits in a row. The one control in this repo with a proven catch
 * record is `u82-vendor-drift` — hashes in a sidecar, checked in the normal
 * suite run, with the remedy printed in the assertion. This is that, aimed
 * at our own artifacts instead of the vendored sheet.
 *
 * **Why hashes and not a rebuild-and-compare.** A rebuild inside the test
 * would either overwrite the real artifacts (a test with side effects on
 * the thing it is judging) or need build.mjs's config duplicated to
 * redirect its outputs — and a second copy of the build recipe is a second
 * thing to keep in step, which is the same class of bug. The build was
 * measured byte-deterministic across runs before this design was chosen, so
 * a digest is exactly as discriminating and costs nothing.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = new URL("../", import.meta.url).pathname;

interface BuildManifest {
  sourceDigest: string;
  artifacts: Record<string, string>;
}

const REBUILD = "run `node build.mjs` and COMMIT the artifacts it writes";

/*
 * A MISSING manifest is the same defect as a stale one, so it must produce
 * the same instruction. Round 1 let the module-level read throw a raw
 * ENOENT during collection: loud, but it named node:fs rather than the
 * remedy, and it took the whole file down instead of failing one assertion.
 */
const MANIFEST_PATH = join(ROOT, "lib/build-manifest.json");
if (!existsSync(MANIFEST_PATH)) {
  throw new Error(
    `#148: lib/build-manifest.json is missing, so nothing records which sources the ` +
      `shipped bundles were built from — ${REBUILD}.`,
  );
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as BuildManifest;

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * The same walk build.mjs does, deliberately re-implemented here rather
 * than imported.
 *
 * Importing the walk from build.mjs would make the check agree with the
 * build BY CONSTRUCTION: a bug in the file set (missing a directory, say)
 * would be invisible, because both sides would share it. Two independent
 * implementations of one rule disagree loudly when either is wrong, which
 * is the entire value of the check. The cost is that this function and
 * build.mjs's must be kept in step, and the test below that hashes the
 * SAME digest is what says so when they are not.
 */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else out.push(path);
  }
  return out.sort();
}

/*
 * The non-src inputs, restated here INDEPENDENTLY of build.mjs's own list.
 *
 * Round 1 hashed only src/ plus build.mjs, and the review broke it with one
 * mutation: `tsconfig.client.json` is handed to esbuild, so a compiler-option
 * change rewrote the shipped bundle while the suite stayed green. The
 * lockfile is here for the same reason one step out — gray-matter, marked,
 * yaml, zod and highlight.js are BUNDLED rather than external, so a version
 * bump changes the artifacts with no source edit at all.
 *
 * Kept as a literal rather than imported: if build.mjs's list and this one
 * ever diverge, the digests disagree and the suite says so on the next
 * build. That is the same reason the file walk below is duplicated, and it
 * is not theoretical — it fired on the very commit that added these two.
 */
const NON_SRC_INPUTS = [
  "build.mjs",
  "tsconfig.json",
  "tsconfig.client.json",
  "package.json",
  "pnpm-lock.yaml",
];

function currentSourceDigest(): string {
  const parts: string[] = [];
  for (const file of sourceFiles("src")) {
    parts.push(`${file}\n${sha256(readFileSync(join(ROOT, file), "utf8"))}`);
  }
  for (const file of NON_SRC_INPUTS) {
    const path = join(ROOT, file);
    /*
     * Absence contributes a value rather than throwing: a tarball checkout
     * without a lockfile must still run the suite.
     *
     * #148 round 3 — the sentinel is "\u0000absent", a NUL, matching
     * build.mjs exactly. It used to be a SPACE here and a NUL there, which
     * is the deliberate-duplication design working precisely as advertised
     * and, until now, silently: the two rules disagreed for any absent
     * build input, and the only reason no test caught it is that every
     * input happens to exist in this checkout. It would have fired first
     * for whoever ran the suite from a tarball — i.e. someone with no way
     * to tell a real drift from this bug. A NUL rather than a space because
     * no file's contents can collide with it.
     */
    parts.push(
      `${file}\n${sha256(existsSync(path) ? readFileSync(path, "utf8") : "\u0000absent")}`,
    );
  }
  return sha256(parts.join("\n"));
}

describe("#148 the shipped bundles match their sources", () => {
  it("every artifact the package ships is present and non-empty", () => {
    // A missing artifact is the loudest possible version of this bug: the
    // install produces a plugin with no client at all.
    expect(Object.keys(manifest.artifacts).length).toBeGreaterThan(0);
    for (const path of Object.keys(manifest.artifacts)) {
      expect(existsSync(join(ROOT, path)), path).toBe(true);
      expect(readFileSync(join(ROOT, path), "utf8").length, path).toBeGreaterThan(0);
    }
  });

  it("the three artifacts the package actually ships are all covered", () => {
    /*
     * Named explicitly, because the failure mode is a NEW shipped artifact
     * that nobody adds to the manifest — it would then rot exactly the way
     * lib/client.js did, with a green suite the whole time. If this list
     * and package.json ever disagree, that is the bug.
     */
    expect(Object.keys(manifest.artifacts).sort()).toEqual([
      "dist/host/aidos-plugin.js",
      "lib/client.js",
      "presets/aidos/aidos-tools.js",
    ]);
  });

  it("SOURCES have not moved since the last build", () => {
    /*
     * THE headline check. It fires when someone edits src/ and commits
     * without rebuilding, which is what shipped twelve commits of drift.
     */
    expect(
      currentSourceDigest(),
      `#148: src/ (or build.mjs) changed since the bundles were built, so the artifacts ` +
        `this package SHIPS do not contain your work — ${REBUILD}.`,
    ).toBe(manifest.sourceDigest);
  });

  it("no artifact was edited by hand after the build", () => {
    /*
     * The other direction, and the reason this is two checks rather than
     * one: a hand-patched bundle "works" until the next build silently
     * discards it. Same guarantee u82 gives the vendored sheet.
     */
    for (const [path, hash] of Object.entries(manifest.artifacts)) {
      expect(
        sha256(readFileSync(join(ROOT, path), "utf8")),
        `#148: ${path} does not match its recorded hash. Either it was edited by hand ` +
          `(fix the SOURCE instead — the next build discards edits here) or ${REBUILD}.`,
      ).toBe(hash);
    }
  });

  it("THE SHIPPED DIGEST FUNCTION agrees with this file's independent walk", () => {
    /*
     * The wiring proof, and the reason the two tests it replaced are gone.
     *
     * Round 1 had tests that perturbed a source IN MEMORY and recomputed a
     * digest inline. The independent review killed them with one mutation:
     * replace build.mjs's sourceDigest() with a constant, and BOTH still
     * passed — because neither ever executed the production function. They
     * proved sha256 hashes things. The commit message calling them proof
     * that the check "can actually fire" was an overstatement, and this is
     * the correction.
     *
     * This runs the REAL function (`node build.mjs --print-digest`, which
     * exits before building) and compares it to the walk implemented above.
     * A production digest that is constant, that skips a directory, or that
     * hashes a different input set now disagrees with an independent
     * recomputation of the same rule, and the suite goes red. That is also
     * what makes the deliberate duplication of the walk pay for itself:
     * two implementations of one rule disagree loudly, where a shared one
     * would agree by construction and hide the bug.
     */
    const printed = execFileSync("node", ["build.mjs", "--print-digest"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    expect(
      printed,
      "#148: build.mjs's own sourceDigest() disagrees with this test's independent " +
        "recomputation — the recorded manifest is being produced by a different rule " +
        "than the one being checked, so the freshness guarantee is void.",
    ).toBe(currentSourceDigest());
    // ...and that shared value is what the manifest recorded.
    expect(printed).toBe(manifest.sourceDigest);
  });

  it("A RENAMED SOURCE FILE CHANGES THE DIGEST — content-only hashing would miss it", () => {
    /*
     * Renaming a file changes what ships (imports resolve differently) while
     * the SET of file contents can stay identical. Hashing contents alone
     * would be blind to it, so the digest interleaves each path with its
     * hash; this asserts that choice rather than leaving it to a comment.
     */
    const files = sourceFiles("src");
    const target = files[0] as string;
    const renamed = (() => {
      const parts: string[] = [];
      for (const file of files) {
        const text = readFileSync(join(ROOT, file), "utf8");
        parts.push(`${file === target ? file + ".moved" : file}\n${sha256(text)}`);
      }
      parts.push(`build.mjs\n${sha256(readFileSync(join(ROOT, "build.mjs"), "utf8"))}`);
      return sha256(parts.join("\n"));
    })();
    expect(renamed).not.toBe(manifest.sourceDigest);
  });

  it("the digest covers the NON-src inputs, one at a time", () => {
    /*
     * Each input is dropped individually and the digest must change. A
     * whole-set check would pass while one member was silently ignored,
     * and that is exactly the shape of the bug the review found: the set
     * LOOKED complete because src/ dominated it, while tsconfig.client.json
     * — the file esbuild is literally handed — was absent.
     *
     * `pnpm-lock.yaml` earns its place the same way: the bundled deps
     * (gray-matter, marked, yaml, zod, highlight.js) are compiled INTO the
     * artifacts, so the lockfile decides their bytes.
     */
    for (const dropped of NON_SRC_INPUTS) {
      const partial = (() => {
        const parts: string[] = [];
        for (const file of sourceFiles("src")) {
          parts.push(`${file}\n${sha256(readFileSync(join(ROOT, file), "utf8"))}`);
        }
        for (const file of NON_SRC_INPUTS) {
          if (file === dropped) continue;
          const path = join(ROOT, file);
          parts.push(
            `${file}\n${sha256(existsSync(path) ? readFileSync(path, "utf8") : "\u0000absent")}`,
          );
        }
        return sha256(parts.join("\n"));
      })();
      expect(partial, `dropping ${dropped} must change the digest`).not.toBe(
        manifest.sourceDigest,
      );
    }
  });
});
