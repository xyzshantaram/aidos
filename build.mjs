import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

/*
 * #148: the artifacts below are what aidos SHIPS.
 *
 * aidos is installed from git and pnpm runs no build at install time, so
 * `src/` is only the input -- these three files are the product. Nothing
 * enforced that they agreed with their sources, and by 2026-09-07 they had
 * silently diverged by twelve commits: the committed client bundle still
 * rendered a pill that had been deleted, and four tickets' worth of work
 * (#100, #131, #135, #141) was absent from the artifact a consumer
 * installs. Two independent reviews of that work were verifying source
 * that nobody was running.
 *
 * The manifest below is how that becomes impossible to do silently. It is
 * the same shape as the vendored sheet's SOURCE.json, which is the one
 * control in this repo with a proven catch record (it caught upstream drift
 * three times in one session): record hashes, then check BOTH directions --
 * sources that moved without a rebuild, and artifacts edited by hand.
 */
const SHIPPED_ARTIFACTS = [
  "presets/aidos/aidos-tools.js",
  "dist/host/aidos-plugin.js",
  "lib/client.js",
];

/** Where the recorded hashes live. Read by tests/u148-bundle-freshness. */
const BUILD_MANIFEST = "lib/build-manifest.json";

/*
 * #148 round 2: the NON-src inputs that also decide the output.
 *
 * The first cut hashed src/ plus build.mjs and its comment claimed that was
 * "every input that can change an artifact". The independent review proved
 * otherwise in one mutation: `tsconfig.client.json` is handed straight to
 * esbuild (see the client build below), so flipping a compiler option there
 * changed lib/client.js's bytes while the suite stayed green. The same
 * blindness covered the dependency set -- gray-matter, marked, yaml, zod
 * and highlight.js are BUNDLED, not external, so a version bump rewrites
 * the artifacts with no source edit at all.
 *
 * Hashing the lockfile closes the dependency case exactly, because that is
 * the file which decides which versions get bundled. What remains
 * deliberately outside: the esbuild binary itself and the Node version --
 * a digest cannot see those, and pretending otherwise would be the same
 * overclaim the review just caught. That residue is stated in the manifest
 * note rather than left for the next reviewer to find.
 */
export const BUILD_INPUT_FILES = [
  "build.mjs",
  "tsconfig.json",
  "tsconfig.client.json",
  "package.json",
  "pnpm-lock.yaml",
];

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

/** Every source file that feeds an artifact, sorted so the digest is stable. */
async function sourceFiles(dir = "src") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await sourceFiles(path)));
    else out.push(path);
  }
  return out.sort();
}

/**
 * One digest over every input that can change an artifact.
 *
 * `build.mjs` hashes ITSELF as well: a change to the recipe (a new external,
 * a different target) changes the output with no source edit at all, and a
 * check that missed that would be wrong in exactly the situation where the
 * artifacts are hardest to eyeball.
 *
 * The set is deliberately WIDE (all of src/, not a per-artifact import
 * trace): over-approximating costs one rebuild of a build that takes 100ms,
 * while under-approximating means a stale artifact passes -- which is the
 * defect this exists to prevent.
 */
export async function sourceDigest() {
  const files = await sourceFiles();
  const parts = [];
  for (const file of files) parts.push(`${file}\n${sha256(await readFile(file, "utf8"))}`);
  for (const file of BUILD_INPUT_FILES) {
    // A missing optional input contributes its absence, not a crash: the
    // lockfile can be absent in a tarball checkout, and a digest that
    // throws there would make the whole suite unrunnable rather than
    // reporting drift.
    let text = "";
    try {
      text = await readFile(file, "utf8");
    } catch {
      text = "\u0000absent";
    }
    parts.push(`${file}\n${sha256(text)}`);
  }
  return sha256(parts.join("\n"));
}

/** Record the digest and every artifact's hash, after a successful build. */
async function writeBuildManifest() {
  const artifacts = {};
  for (const path of SHIPPED_ARTIFACTS) artifacts[path] = sha256(await readFile(path, "utf8"));
  await writeFile(
    BUILD_MANIFEST,
    JSON.stringify(
      {
        note:
          "#148: written by build.mjs. sourceDigest covers every file under src/ plus " +
          "build.mjs itself; artifacts are the files this package ships. " +
          "tests/u148-bundle-freshness.test.ts fails when either side moves without the " +
          "other. Regenerate with: node build.mjs",
        sourceDigest: await sourceDigest(),
        artifacts,
      },
      null,
      2,
    ) + "\n",
  );
}

// gray-matter calls require at runtime. An ESM bundle has no require, so
// esbuild's shim throws "Dynamic require of \"fs\" is not supported" the
// moment the plugin loads. This banner gives every node bundle a real
// require, built from the module URL.
/*
 * #148 round 2: `node build.mjs --print-digest` prints the digest and exits
 * WITHOUT building.
 *
 * The review's sharpest hit landed here. My "proves it can fire" tests
 * perturbed a source in memory and re-implemented the digest inline, so a
 * mutation that replaced the real sourceDigest() with a constant left them
 * both passing -- they proved that sha256 is a hash function, not that the
 * shipped check is wired to anything. The honest fix is for the test to
 * execute THIS function and compare it against its own independent walk: a
 * production digest that is constant, or that reads a different file set,
 * then disagrees with the recomputation and the suite goes red.
 *
 * A flag rather than an import because importing this module would run the
 * build as a side effect, and a test that rebuilds the artifacts it is
 * judging is not a test.
 */
if (process.argv.includes("--print-digest")) {
  process.stdout.write((await sourceDigest()) + "\n");
  process.exit(0);
}

const NODE_REQUIRE_BANNER = {
  js: "import { createRequire as __aidosCreateRequire } from 'node:module';\nconst require = __aidosCreateRequire(import.meta.url);",
};

// The aidos-tools agent plugin, bundled so the preset directory is
// self-contained. The dsh packages stay external: the loader resolves them
// from the profile's node_modules at runtime.
await build({
  entryPoints: ["src/tools/aidos-tools.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  external: ["@deepseek-ai/*", "node:*"],
  banner: NODE_REQUIRE_BANNER,
  outfile: "presets/aidos/aidos-tools.js",
  logLevel: "info",
});

// The aidos-core host plugin, bundled the same way.
await build({
  entryPoints: ["src/host/aidos-plugin.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  external: ["@deepseek-ai/*", "node:*"],
  banner: NODE_REQUIRE_BANNER,
  outfile: "dist/host/aidos-plugin.js",
  logLevel: "info",
});

// The client half: the Tickets board React components. esbuild bundles it
// browser/cjs (react and every @deepseek-ai package external: the shell's
// module table provides them at runtime), then the result is wrapped in the
// window.__ModuleLoader__.load facade the client-module loader expects. The
// dotfiles-ai plugins (subscriptions, approval-comment) use the same recipe
// against this same web profile.
// A real .css file becomes its text as a string at build time (design copied
// from dotfiles-ai). The board imports "./board.css" and injects the text
// once at runtime. dsh ships the CSS as a single string, so there is no
// bundler-level css loader to rely on.
/*
 * #148 round 2: the resolved path is made RELATIVE to the repo root.
 *
 * esbuild writes each resolved path into the bundle as a `// css-text:...`
 * comment, so the absolute form embedded the build machine's checkout into
 * the shipped artifact: the committed lib/client.js differed from a rebuild
 * in /tmp by exactly three comment lines. That made the bundle
 * irreproducible anywhere but this directory -- a reviewer could not
 * confirm the committed artifact by rebuilding it, and any future
 * rebuild-and-compare check would false-fail for every other contributor.
 * A relative path is the same file to esbuild (the build runs from the
 * repo root) and identical bytes everywhere.
 */
const cssTextPlugin = {
  name: "css-text",
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => ({
      path: relative(process.cwd(), resolve(args.resolveDir, args.path)),
      namespace: "css-text",
    }));
    build.onLoad({ filter: /.*/, namespace: "css-text" }, async (args) => {
      const text = await readFile(args.path, "utf8");
      return { contents: `export default ${JSON.stringify(text)};`, loader: "js" };
    });
  },
};

await build({
  entryPoints: ["src/client/index.ts"],
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2022",
  // Classic JSX: esbuild emits react.createElement(...) so the dsh client
  // runtime (which only supports createElement, not the jsx-runtime) can run
  // the bundle. The source is written in real JSX; this transform is the only
  // place it is lowered.
  jsx: "transform",
  jsxFactory: "react.createElement",
  jsxFragment: "react.Fragment",
  tsconfig: "tsconfig.client.json",
  external: ["react", "react/jsx-runtime", "react-dom/client", "@deepseek-ai/*"],
  plugins: [cssTextPlugin],
  outfile: "dist/client/_client.bundle.js",
  logLevel: "info",
});
{
  await mkdir("lib", { recursive: true });
  const bundled = (await readFile("dist/client/_client.bundle.js", "utf8")).replace(/\s+$/, "");
  await writeFile(
    "lib/client.js",
    `window.__ModuleLoader__.load({\n\tid: "aidos",\n\tfactory: (require) => {\n\t\tvar module = { exports: {} };\n\t\tvar exports = module.exports;\n\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });\n${bundled}\n\t\treturn module.exports;\n\t}\n});\n`,
  );
  await rm("dist/client/_client.bundle.js");
}

// Smoke check: a bundle that cannot load must fail the build. The plan
// parser pulls gray-matter, which calls require at runtime, so this probe
// bundles it with the node settings above and runs it. The unit tests run
// the source, so only this step covers the bundled form.
{
  const probeDir = resolve(tmpdir(), "aidos-build-probe");
  await mkdir(probeDir, { recursive: true });
  const probeFile = resolve(probeDir, `plan-${Date.now()}.mjs`);
  await build({
    entryPoints: ["src/plan/plan.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "es2022",
    external: ["@deepseek-ai/*", "node:*"],
    banner: NODE_REQUIRE_BANNER,
    outfile: probeFile,
    logLevel: "warning",
  });
  const probe = await import(`file://${probeFile}`);
  const doc = probe.parsePlan("---\ntitle: probe\n---\n\nText.\n");
  if (doc.frontmatterData.title !== "probe") {
    throw new Error("build probe: the bundled parser lost the frontmatter data");
  }
  await rm(probeFile);
}

// #148: LAST, so the manifest only ever describes a build that succeeded --
// including the smoke probe above. A manifest written before the probe would
// certify a bundle that cannot load.
await writeBuildManifest();

