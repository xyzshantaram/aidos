#!/usr/bin/env bash
# apply-dsh-patches.sh — idempotent patches the installed dsh package tree
# needs for aidos to function correctly. Run after every aidos (re)install
# and after every dsh upgrade; a reinstall of either wipes the patches.
#
# Patch 1 (aidos #60): the fs sandbox's writableRoots() gains the aidos
# durable scratch root for the session's workspace. The harness policy says
# scratch writes are allowed in every phase, and the aidos write boundary
# exempts the root; the sandbox was the one layer that still denied it, so
# any scratch write reaching the sandboxed fs tools refused with
# FS_SANDBOX_DENIED — including scratch_edit's delegation to `edit`.
#
# Every patch is an exact-string replacement that refuses to run when the
# target text does not match, so an upstream dsh change surfaces here as a
# loud failure, never a silent drift.
#
# Usage:  patches/apply-dsh-patches.sh [dsh-root]
#   dsh-root defaults to the dsh installation behind the `dsh` binary.

set -euo pipefail

if [ "$#" -ge 1 ]; then
	DSH_ROOT="$1"
elif command -v dsh >/dev/null 2>&1; then
	# Resolve through the fnm shims: dsh -> node -> .../@deepseek-ai/dsh
	DSH_ROOT="$(dirname "$(dirname "$(readlink -f "$(command -v dsh)")")")"
else
	echo "error: dsh not on PATH; pass the dsh package root as the first argument" >&2
	exit 1
fi

SANDBOX="$DSH_ROOT/node_modules/@deepseek-ai/dsh-sandbox/lib/index.js"
if [ ! -f "$SANDBOX" ]; then
	# Fallback: the harness checkout layout (dsh's own node_modules tree).
	ALT="$(dirname "$DSH_ROOT")/node_modules/@deepseek-ai/dsh-sandbox/lib/index.js"
	if [ -f "$ALT" ]; then
		SANDBOX="$ALT"
	else
		echo "dsh-sandbox not found under $DSH_ROOT — nothing to patch."
		exit 0
	fi
fi
echo "patching: $SANDBOX"

# ── Patch 1: the scratch-root exemption in writableRoots (#60) ──────────────
if grep -q 'scratchRootForWorkspace' "$SANDBOX"; then
	echo "  already applied: scratch-root exemption"
else
	python3 - "$SANDBOX" <<'PYEOF'
import sys

path = sys.argv[1]
s = open(path).read()

# The import gains homedir.
imp_old = 'import { tmpdir } from "node:os";'
imp_new = 'import { homedir, tmpdir } from "node:os";'
if imp_new not in s:
    if imp_old not in s:
        sys.exit("import line does not match; upstream changed")
    s = s.replace(imp_old, imp_new, 1)

old = """function writableRoots(policy) {
\tif (policy.mode !== "workspace-write") return [];
\treturn [...new Set([
\t\tpolicy.workspaceRoot,
\t\t"/tmp",
\t\ttmpdir()
\t].map(canonicalPath))];
}"""
new = """function writableRoots(policy) {
\tif (policy.mode !== "workspace-write") return [];
\treturn [...new Set([
\t\tpolicy.workspaceRoot,
\t\t"/tmp",
\t\ttmpdir(),
\t\tscratchRootForWorkspace(policy.workspaceRoot)
\t].map(canonicalPath))];
}
/**
* The aidos durable scratch root for one workspace: the harness policy says
* scratch writes are allowed in every phase, and the aidos write boundary
* already exempts the root - the sandbox was the one layer missing it
* (aidos ticket #60). The mangling mirrors workspaceKeyFromPath.
*/
function scratchRootForWorkspace(workspaceRoot) {
\tif (!workspaceRoot) return null;
\tconst home = process.env.DSH_HOME || homedir() + "/.dsh";
\tlet readable = "";
\tlet previousWasSeparator = false;
\tfor (const character of String(workspaceRoot)) {
\t\tif (character === "/" || character === "\\\\" || character === ":") {
\t\t\tif (!previousWasSeparator) readable += "-";
\t\t\tpreviousWasSeparator = true;
\t\t\tcontinue;
\t\t}
\t\tpreviousWasSeparator = false;
\t\tif (character !== "~" && /[A-Za-z0-9._-]/.test(character)) {
\t\t\treadable += character;
\t\t\tcontinue;
\t\t}
\t\treadable += "~" + character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
\t}
\treadable = readable.replace(/^-+/, "");
\tif (readable === "") readable = "root";
\treturn home + "/aidos/scratch/" + readable;
}"""
if old not in s:
    sys.exit("writableRoots block does not match; upstream changed")
open(path, "w").write(s.replace(old, new, 1))
PYEOF
	echo "  applied: scratch-root exemption"
fi

echo "dsh patches: done"
