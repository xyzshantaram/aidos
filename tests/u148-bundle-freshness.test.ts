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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = new URL("../", import.meta.url).pathname;

interface BuildManifest {
  sourceDigest: string;
  artifacts: Record<string, string>;
}

const manifest = JSON.parse(
  readFileSync(join(ROOT, "lib/build-manifest.json"), "utf8"),
) as BuildManifest;

const REBUILD = "run `node build.mjs` and COMMIT the artifacts it writes";

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

function currentSourceDigest(): string {
  const parts: string[] = [];
  for (const file of sourceFiles("src")) {
    parts.push(`${file}\n${sha256(readFileSync(join(ROOT, file), "utf8"))}`);
  }
  parts.push(`build.mjs\n${sha256(readFileSync(join(ROOT, "build.mjs"), "utf8"))}`);
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

  it("A CHANGED SOURCE FILE CHANGES THE DIGEST — the check can actually fire", () => {
    /*
     * The proof that this control is not decorative, done in-process so it
     * is permanent and repeatable rather than a mutation someone performed
     * by hand once and described in a commit message.
     *
     * One source file's content is perturbed IN MEMORY and the digest
     * recomputed the same way; it must differ. If it does not, the digest
     * is insensitive to source changes and every other assertion in this
     * file is theatre — a green suite that certifies nothing, which is
     * precisely the state #148 was filed about.
     */
    const files = sourceFiles("src");
    expect(files.length).toBeGreaterThan(0);
    const target = files[0] as string;

    const perturbed = (() => {
      const parts: string[] = [];
      for (const file of files) {
        const text = readFileSync(join(ROOT, file), "utf8");
        // One added byte in one file: the smallest change a careless commit
        // can make, and the check must still catch it.
        parts.push(`${file}\n${sha256(file === target ? text + " " : text)}`);
      }
      parts.push(`build.mjs\n${sha256(readFileSync(join(ROOT, "build.mjs"), "utf8"))}`);
      return sha256(parts.join("\n"));
    })();

    expect(perturbed).not.toBe(manifest.sourceDigest);
    // And the unperturbed recomputation still matches, so the difference is
    // attributable to the edit rather than to a broken walk.
    expect(currentSourceDigest()).toBe(manifest.sourceDigest);
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

  it("the recorded digest covers build.mjs itself, not only src/", () => {
    /*
     * A recipe change (a new external, a different target) changes every
     * artifact with no source edit at all. Asserting the digest CHANGES
     * when build.mjs changes proves the input set really includes it,
     * rather than trusting the comment that says so.
     */
    const withoutBuildFile = (() => {
      const parts: string[] = [];
      for (const file of sourceFiles("src")) {
        parts.push(`${file}\n${sha256(readFileSync(join(ROOT, file), "utf8"))}`);
      }
      return sha256(parts.join("\n"));
    })();
    expect(withoutBuildFile).not.toBe(manifest.sourceDigest);
  });
});
