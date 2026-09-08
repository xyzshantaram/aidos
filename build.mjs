/*
 * #148 round 3: esbuild is imported LAZILY, further down this file.
 *
 * Round 2 detected the drift; the review that failed it said the detection
 * was at the wrong END of the problem -- a red suite run happens after the
 * bad commit already exists. Round 3 adds a pre-commit hook, which means
 * `node build.mjs --precommit` now runs on the human's keystroke rather
 * than in CI, and the criterion is explicit that it must not make
 * committing slow. A top-level `import { build } from "esbuild"` made every
 * commit pay for loading the whole bundler before the hook could decide it
 * had nothing to do; it dominated the measurement. So the one import that
 * costs anything moved BELOW the CLI section, and the hook path never
 * touches it.
 */
import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
  return composeDigest(await sourceFiles(), async (file) => {
    try {
      return await readFile(file, "utf8");
    } catch {
      return null;
    }
  });
}

/**
 * THE digest rule, in exactly one place.
 *
 * #148 round 3 needs the same digest computed over two different readers:
 * the WORKING TREE (what `sourceDigest` has always done, and what the suite
 * checks) and the GIT INDEX (what the pre-commit hook must judge, because
 * the index is what is about to become a commit -- an unstaged rebuild
 * sitting in the working tree must not talk the hook out of a refusal).
 *
 * Those two callers share this function rather than each implementing the
 * rule, because the hook and the test would otherwise be checking two
 * different things and only one of them could be right. The independence
 * that the review asked for lives where it belongs: in
 * tests/u148-bundle-freshness, which re-implements the walk on purpose and
 * compares against the real one.
 *
 * `read` returns the file's text, or null when it does not exist. A missing
 * SOURCE is impossible (the list came from a directory walk or from the
 * index itself) and throws rather than being papered over; a missing
 * BUILD_INPUT contributes its absence, because the lockfile can genuinely
 * be absent in a tarball checkout and a digest that threw there would make
 * the whole suite unrunnable rather than reporting drift.
 */
async function composeDigest(files, read) {
  const parts = [];
  for (const file of files) {
    const text = await read(file);
    if (text === null) throw new Error(`build.mjs: source ${file} vanished while hashing`);
    parts.push(`${file}\n${sha256(text)}`);
  }
  for (const file of BUILD_INPUT_FILES) {
    const text = await read(file);
    parts.push(`${file}\n${sha256(text === null ? "\u0000absent" : text)}`);
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
          "#148: written by build.mjs. sourceDigest covers every file under src/ plus the " +
          "build inputs (build.mjs itself, both tsconfigs, package.json, pnpm-lock.yaml); " +
          "artifacts are the files this package ships. Two controls read it: the pre-commit " +
          "hook build.mjs installs (refuses the bad commit before it exists; bypass with " +
          "AIDOS_SKIP_BUNDLE_HOOK=1) and tests/u148-bundle-freshness.test.ts (catches a " +
          "clone that never installed, or a --no-verify). Outside the digest by admission: " +
          "the esbuild binary and the Node version. Regenerate with: node build.mjs",
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

/*
 * ===========================================================================
 * #148 round 3: the pre-commit hook.
 * ===========================================================================
 *
 * WHY THIS EXISTS AND ROUND 2 WAS NOT ENOUGH. Round 2 shipped a digest, a
 * manifest and tests/u148-bundle-freshness, and an independent review passed
 * all six criteria. The user failed it anyway, and the finding is the whole
 * point of this section: *"The ticket must fix the METHODOLOGY it exposed,
 * not only detect the symptom afterwards. A test that fails after the bad
 * commit exists is the wrong end of the problem."*
 *
 * That is right, and it is not a stylistic preference. A suite-run failure
 * is discovered by whoever runs the suite next, on a commit that is already
 * in history and possibly already pushed or installed from. The original
 * incident is precisely that shape: twelve commits of drift, each one green
 * at the moment it was made because nobody ran the check between the edit
 * and the commit. Moving the refusal to `git commit` means the bad commit
 * never comes into existence, so there is nothing to notice later.
 *
 * The suite check STAYS. It is the belt to this hook's braces: a clone that
 * has never run `pnpm install` has no hook, and `--no-verify` exists. The
 * two controls fail independently, which is the only reason having both is
 * worth anything.
 *
 * WHAT IT JUDGES: the INDEX, never the working tree. This is the one design
 * decision here that is easy to get wrong and impossible to see afterwards.
 * `git commit` commits the index; a rebuilt-but-unstaged lib/client.js
 * sitting in the working tree would talk a working-tree check out of a
 * refusal and let the stale artifact land anyway -- reproducing the exact
 * bug while appearing to prevent it. So every byte the hook hashes comes
 * from `git cat-file --batch` against `:path`.
 */

/** Marks the installed hook as ours, so a foreign hook is never clobbered. */
const HOOK_MARKER = "# aidos #148 bundle-freshness pre-commit hook";

/**
 * The documented bypass.
 *
 * A deliberate source-only commit is a real thing -- splitting a large
 * change into reviewable commits, or landing a source fix whose rebuild
 * belongs with the next one -- and a control with no way out gets disabled
 * wholesale rather than used. Two ways out, both named in the refusal
 * itself:
 *
 *   AIDOS_SKIP_BUNDLE_HOOK=1 git commit ...   (this hook only)
 *   git commit --no-verify                     (every hook)
 *
 * The env var is preferred and listed first because it is narrow: it turns
 * off THIS check and leaves any other hook the repo grows later alone.
 */
const HOOK_BYPASS_ENV = "AIDOS_SKIP_BUNDLE_HOOK";

/** One git command, from the repo root, as text. */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** A NUL-separated git listing as an array. `-z` because paths may contain anything. */
function gitZ(args) {
  return git(args)
    .split("\u0000")
    .filter((line) => line.length > 0);
}

/**
 * Read many paths OUT OF THE INDEX in one child process.
 *
 * `git cat-file --batch` answers in request order, so one spawn covers every
 * source file plus the build inputs plus the artifacts. The naive form --
 * one `git show :path` per file -- is ~70 processes here and was measurably
 * the difference between a hook you forget about and one you start
 * bypassing out of irritation.
 *
 * A path that is not in the index answers `<ref> missing` and maps to null,
 * which composeDigest turns into the same absence value the working-tree
 * reader uses.
 */
function readIndexBlobs(paths) {
  const found = new Map();
  if (paths.length === 0) return found;
  const buffer = execFileSync("git", ["cat-file", "--batch"], {
    input: paths.map((path) => `:${path}`).join("\n") + "\n",
    maxBuffer: 1024 * 1024 * 1024,
  });
  let offset = 0;
  for (const path of paths) {
    const newline = buffer.indexOf(10, offset);
    const header = buffer.subarray(offset, newline).toString("utf8");
    offset = newline + 1;
    /*
     * A present object answers "<sha> <type> <size>" and then <size> bytes
     * plus a newline. An absent one answers "<ref> missing" (or
     * "<ref> ambiguous") and NOTHING follows -- so the parse must branch on
     * the header before advancing the offset, or every later file in the
     * batch is read from the wrong place. Matching on the last field rather
     * than on the ref keeps it correct for paths containing spaces.
     */
    const fields = header.split(" ");
    const size = Number(fields[fields.length - 1]);
    if (fields[fields.length - 2] !== "blob" || !Number.isFinite(size)) {
      found.set(path, null);
      continue;
    }
    found.set(path, buffer.subarray(offset, offset + size).toString("utf8"));
    offset += size + 1;
  }
  return found;
}

/**
 * Every path whose staging should make the hook look closer.
 *
 * Deliberately WIDER than the review's wording ("a modified .ts/.tsx/.css
 * without its rebuilt .js artifact"): the artifacts and the manifest are in
 * here too, so a hand-patched bundle is refused as well -- the other
 * direction the suite check already covers, and the reason round 2 has two
 * assertions rather than one.
 */
function isWatchedPath(path) {
  return (
    path.startsWith("src/") ||
    BUILD_INPUT_FILES.includes(path) ||
    SHIPPED_ARTIFACTS.includes(path) ||
    path === BUILD_MANIFEST
  );
}

/**
 * `sourceDigest`, but every byte read from the INDEX instead of the disk.
 *
 * Same rule (composeDigest), different reader — which is the whole reason
 * composeDigest exists. `node build.mjs --staged-digest` exposes it so a
 * test can drive the real function over a deliberately mutated index and
 * check that the number moves, rather than asserting on a value the test
 * itself computed.
 *
 * The source LIST comes from the index too (`git ls-files --cached`), not
 * from a directory walk: a file deleted from the index but still on disk
 * must not be hashed into a commit that no longer contains it.
 */
export async function stagedSourceDigest() {
  const sources = gitZ(["ls-files", "--cached", "-z", "--full-name", "--", "src"]).sort();
  const blobs = readIndexBlobs([...sources, ...BUILD_INPUT_FILES]);
  return composeDigest(sources, (file) => blobs.get(file) ?? null);
}

/**
 * The check itself. Returns a process exit code: 0 lets the commit through.
 *
 * Exported for tests/u148-precommit-hook, which drives it through the real
 * CLI against a scratch GIT_INDEX_FILE -- so what the test exercises is the
 * shipped path, not a re-implementation of it.
 */
export async function runPreCommitCheck() {
  if (process.env[HOOK_BYPASS_ENV]) {
    process.stderr.write(
      `#148: ${HOOK_BYPASS_ENV} is set -- the bundle-freshness check is bypassed for this ` +
        `commit. The suite still checks it (tests/u148-bundle-freshness).\n`,
    );
    return 0;
  }

  const staged = gitZ(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]);
  // The fast path, and the common one: a commit that touches docs, PLAN.md
  // or a test does not need any hashing at all.
  if (!staged.some(isWatchedPath)) return 0;

  const manifestText = readIndexBlobs([BUILD_MANIFEST]).get(BUILD_MANIFEST) ?? null;
  if (manifestText === null) {
    process.stderr.write(
      `#148: this commit changes ${BUILD_MANIFEST}'s inputs but ${BUILD_MANIFEST} is not in ` +
        `the index, so nothing records which sources the shipped bundles were built from.\n` +
        `  Fix: node build.mjs && git add ${[BUILD_MANIFEST, ...SHIPPED_ARTIFACTS].join(" ")}\n`,
    );
    return 1;
  }
  const manifest = JSON.parse(manifestText);

  const staleness = [];
  const stagedDigest = await stagedSourceDigest();
  const blobs = readIndexBlobs(SHIPPED_ARTIFACTS);
  if (stagedDigest !== manifest.sourceDigest) {
    staleness.push(
      `  - the staged sources do not match the staged ${BUILD_MANIFEST}: this commit would ` +
        `ship bundles that do not contain its own source change.`,
    );
  }
  for (const path of SHIPPED_ARTIFACTS) {
    const text = blobs.get(path) ?? null;
    if (text === null) {
      staleness.push(`  - ${path} is not in the index at all, so the package ships without it.`);
      continue;
    }
    if (sha256(text) !== manifest.artifacts?.[path]) {
      staleness.push(
        `  - ${path} does not match its hash in the staged manifest (stale, or edited by hand ` +
          `-- edits there are discarded by the next build; fix the SOURCE).`,
      );
    }
  }

  if (staleness.length === 0) return 0;

  process.stderr.write(
    `\n#148: refusing this commit -- the bundles aidos SHIPS would not match its sources.\n\n` +
      staleness.join("\n") +
      `\n\n  aidos is installed FROM GIT with no build at install time, so ` +
      `${SHIPPED_ARTIFACTS.join(", ")}\n  are not by-products: they are the product. A commit ` +
      `touching src/ ships its rebuild.\n\n` +
      `  Fix:    node build.mjs && git add ${[BUILD_MANIFEST, ...SHIPPED_ARTIFACTS].join(" ")}\n` +
      `  Bypass: ${HOOK_BYPASS_ENV}=1 git commit ...   (deliberate source-only commit)\n` +
      `          git commit --no-verify              (every hook)\n\n`,
  );
  return 1;
}

/**
 * Install the hook FROM THE BUILD, so no clone has to remember.
 *
 * The criterion is that the hook "must be installed by the repo rather than
 * left to each clone". package.json's `prepare` script is already
 * `node build.mjs`, and npm/pnpm run `prepare` after every install -- so
 * installing from here means a fresh clone gets the hook from its first
 * `pnpm install`, and every subsequent build re-asserts it.
 *
 * Three pieces of care, each for a failure someone would otherwise hit:
 *
 *  - `core.hooksPath` wins if it is set. Writing to .git/hooks while git
 *    reads somewhere else installs a hook that never runs, which is worse
 *    than no hook because it looks installed.
 *  - `git rev-parse --git-path hooks` rather than a hardcoded `.git/hooks`,
 *    because in a per-ticket WORKTREE `.git` is a file and hooks live in
 *    the common directory. (aidos itself makes those worktrees -- #101.)
 *  - a pre-existing hook that is not ours is left ALONE with a warning.
 *    Silently overwriting someone's hook to install a freshness check would
 *    be a worse bug than the one being fixed.
 *
 * Failure is never fatal to the build: a tarball with no .git, or a
 * read-only hooks directory, must still produce artifacts.
 */
function installPreCommitHook() {
  let hooksDir;
  try {
    const configured = (() => {
      try {
        return git(["config", "--get", "core.hooksPath"]).trim();
      } catch {
        return "";
      }
    })();
    hooksDir = configured || git(["rev-parse", "--git-path", "hooks"]).trim();
  } catch {
    return { installed: false, reason: "not a git checkout" };
  }

  const body =
    `#!/bin/sh\n` +
    `${HOOK_MARKER}\n` +
    `#\n` +
    `# Installed by build.mjs, which package.json runs as \`prepare\` -- so a\n` +
    `# fresh clone gets this from its first install and never has to remember.\n` +
    `# Refuses a commit whose staged src/ (or build config) does not match the\n` +
    `# staged lib/build-manifest.json and rebuilt artifacts.\n` +
    `#\n` +
    `#   Fix:    node build.mjs && git add lib/build-manifest.json <artifacts>\n` +
    `#   Bypass: ${HOOK_BYPASS_ENV}=1 git commit ...   (deliberate source-only commit)\n` +
    `#           git commit --no-verify\n` +
    `#\n` +
    `# Regenerate this file with: node build.mjs\n` +
    `root=$(git rev-parse --show-toplevel) || exit 0\n` +
    `[ -f "$root/build.mjs" ] || exit 0\n` +
    `# The hook is UNTRACKED and build.mjs is TRACKED, so checking out a\n` +
    `# commit from before this feature leaves a hook newer than the script it\n` +
    `# calls. An old build.mjs ignores the unknown flag and BUILDS -- editing\n` +
    `# files in the middle of a commit. Standing down is the only safe answer.\n` +
    `grep -q -e '--precommit' "$root/build.mjs" || exit 0\n` +
    `cd "$root" || exit 0\n` +
    `exec node build.mjs --precommit\n`;

  const file = join(hooksDir, "pre-commit");
  try {
    if (existsSync(file)) {
      const current = readFileSync(file, "utf8");
      if (!current.includes(HOOK_MARKER)) {
        return { installed: false, reason: `a foreign pre-commit hook is already at ${file}` };
      }
      if (current === body) return { installed: true, reason: "already current" };
    }
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(file, body);
    chmodSync(file, 0o755);
    return { installed: true, reason: `written to ${file}` };
  } catch (error) {
    return { installed: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

if (process.argv.includes("--staged-digest")) {
  process.stdout.write((await stagedSourceDigest()) + "\n");
  process.exit(0);
}

if (process.argv.includes("--precommit")) {
  process.exit(await runPreCommitCheck());
}

if (process.argv.includes("--install-hook")) {
  const outcome = installPreCommitHook();
  process.stdout.write(`${outcome.installed ? "installed" : "NOT installed"}: ${outcome.reason}\n`);
  process.exit(outcome.installed ? 0 : 1);
}

const { build } = await import("esbuild");

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

/*
 * #148 round 3: and THEN install the hook.
 *
 * After the manifest, so a clone whose very first `pnpm install` runs this
 * ends up with the hook and a manifest that already agrees with the tree --
 * never with a hook that refuses the developer's first commit for a state
 * the install itself created.
 *
 * The outcome is printed rather than silent: "installed a hook you did not
 * ask for" is exactly the kind of thing that should appear in the install
 * log, and the not-installed branches (foreign hook, no .git) are the ones
 * someone will need to see to understand why the check never fires.
 */
{
  const outcome = installPreCommitHook();
  console.log(
    outcome.installed
      ? `#148 pre-commit hook: ${outcome.reason}`
      : `#148 pre-commit hook NOT installed (${outcome.reason}) — the bundle-freshness rule ` +
          `is then enforced only by tests/u148-bundle-freshness on the next suite run.`,
  );
}

