/**
 * #82: the vendored tool-render files must not drift from upstream.
 *
 * The scratch tools have to LOOK like the builtin fs tools, and three
 * hand-ports in a row failed that ("not close enough", "the card looks
 * different"). Approximating a design from memory does not converge. So the
 * files are VENDORED verbatim -- the stylesheet and the text helpers -- and
 * this test is the step that fails loudly when upstream changes.
 *
 * Why vendor rather than import: tool-render is a separate dotfiles-ai
 * plugin that may or may not be mounted, and #72 requires aidos to depend on
 * nothing external. A vendored copy is aidos's own file with a recorded
 * provenance, which is a different thing from a dependency.
 *
 * TO RE-VENDOR after an intentional upstream change:
 *
 *     VENDOR_UPDATE=1 npx vitest run tests/u82-vendor-drift.test.ts
 *
 * That rewrites the copies and their hashes, and the diff shows exactly what
 * moved. Read it before committing: an upstream change may need a matching
 * change in aidos's own row components.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const VENDOR_DIR = new URL("../src/client/vendor/tool-render/", import.meta.url).pathname;

interface Manifest {
  source: string;
  vendoredAt: string;
  files: Record<string, { vendoredAs: string; sha256: string }>;
}

const manifest = JSON.parse(
  readFileSync(join(VENDOR_DIR, "SOURCE.json"), "utf8"),
) as Manifest;

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("#82 vendored tool-render files", () => {
  it("records where every vendored file came from", () => {
    // Provenance is the whole point: a copied file with no recorded origin
    // is indistinguishable from a file someone wrote by hand, and nobody
    // will know to re-sync it.
    expect(manifest.source).toContain("tool-render");
    expect(Object.keys(manifest.files).length).toBeGreaterThan(0);
    for (const [upstream, entry] of Object.entries(manifest.files)) {
      expect(entry.vendoredAs, upstream).toBeTruthy();
      expect(entry.sha256, upstream).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("the vendored copies are present and non-empty", () => {
    for (const entry of Object.values(manifest.files)) {
      const path = join(VENDOR_DIR, entry.vendoredAs);
      expect(existsSync(path), entry.vendoredAs).toBe(true);
      expect(readFileSync(path, "utf8").length, entry.vendoredAs).toBeGreaterThan(0);
    }
  });

  it("has NOT drifted from upstream", () => {
    /*
     * The loud failure the user asked for.
     *
     * Upstream lives outside this workspace, so it is not always reachable
     * -- a clone, or CI, will not have dotfiles-ai checked out. Absent
     * upstream SKIPS rather than fails: a check that fails for an
     * unavoidable environmental reason gets muted, and a muted check
     * protects nothing. Present-and-different is what fails.
     */
    if (!existsSync(manifest.source)) {
      // eslint-disable-next-line no-console
      console.warn(
        `#82 vendor drift: upstream not present at ${manifest.source}; skipping the comparison. ` +
          "This is expected off the development machine.",
      );
      return;
    }

    const drifted: string[] = [];
    for (const [upstream, entry] of Object.entries(manifest.files)) {
      const upstreamPath = join(manifest.source, upstream);
      if (!existsSync(upstreamPath)) {
        drifted.push(`${upstream}: GONE from upstream (renamed or deleted)`);
        continue;
      }
      const current = readFileSync(upstreamPath, "utf8");
      const currentHash = sha256(current);
      if (currentHash === entry.sha256) continue;

      if (process.env.VENDOR_UPDATE === "1") {
        writeFileSync(join(VENDOR_DIR, entry.vendoredAs), current);
        entry.sha256 = currentHash;
        continue;
      }
      drifted.push(
        `${upstream}: upstream ${currentHash.slice(0, 12)} != vendored ${entry.sha256.slice(0, 12)}`,
      );
    }

    if (process.env.VENDOR_UPDATE === "1") {
      manifest.vendoredAt = new Date().toISOString().slice(0, 10);
      writeFileSync(join(VENDOR_DIR, "SOURCE.json"), JSON.stringify(manifest, null, 2) + "\n");
      return;
    }

    expect(
      drifted,
      "tool-render changed upstream. Re-vendor with:\n" +
        "  VENDOR_UPDATE=1 npx vitest run tests/u82-vendor-drift.test.ts\n" +
        "then READ THE DIFF: an upstream change may need a matching change in " +
        "src/client/scratch-rows.tsx.",
    ).toEqual([]);
  });

  it("the vendored copy matches its own recorded hash", () => {
    /*
     * Guards the other direction: someone editing the VENDORED file by hand.
     * A vendored file is not a place to fix things -- the fix belongs
     * upstream, or in aidos's own code alongside it -- and a local edit
     * would be silently destroyed by the next re-vendor.
     */
    if (process.env.VENDOR_UPDATE === "1") return;
    for (const [upstream, entry] of Object.entries(manifest.files)) {
      const local = readFileSync(join(VENDOR_DIR, entry.vendoredAs), "utf8");
      expect(sha256(local), `${entry.vendoredAs} was edited locally; edit upstream instead`).toBe(
        entry.sha256,
      );
    }
  });
});
