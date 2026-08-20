# Fresh-session test checklist — aidos + personal dsh bundle

Purpose: verify the live personal dsh bundle and the aidos setup after the
server restart. Run each check, record pass/fail and what you saw. Do not
rely on any prior conversation; everything you need is on disk.

## Durable references

- aidos design / tickets: `/home/sid/repos/aidos/PLAN.md`
- personal bundle source + installer: `/home/sid/repos/dotfiles-ai/dsh/`
  - `sync.sh` (idempotent installer: clone + run to converge)
  - `build.mjs` (esbuild bundle of the plugins)
  - `plugins/` (bash-guard, manifest-guard, package-tool, see, session-hygiene)
  - `guards/*.json` (bash-guard rule drop-ins: git, find, grep)
  - `skills/`, `home/`, `lang/`, `mcp/`
- live dsh home: `~/.dsh`
  - web profile patch: `~/.dsh/profiles/web/cordis.patch.yml`
  - guards: `~/.dsh/plugins/guards/`
  - agent presets: `~/.dsh/.agent-presets/` (aidos only; standard/PTC ship in
    the dsh install `config/agent-presets/`, with standard/minimal/cordis
    masked to `.bak`)
  - settings: `~/.dsh/settings.yaml` (provider routes + agent-presets default)
- aidos bundle: `/home/sid/repos/aidos/packages/aidos/` (built
  `presets/aidos/aidos-tools.js`)

## Setup the fresh session needs to know

The personal bundle is host-plane: its MCP servers, bash-guard, manifest-guard,
package-tool, see, and session-hygiene apply to EVERY session/preset. The
agent presets are `aidos` (ticket board) and `standard`/`code` (base agents).

The dsh server must be restarted once after `sync.sh` runs, because bundle
rows (plugins/mcp) are static per boot. Presets and skills are read live.

## Test checklist

### A. Roster and presets
- [ ] Roster shows aidos, PTC (code), and standard. standard/minimal/cordis
      do NOT appear (masked to .bak).
- [ ] The aidos preset shows a description alongside its name (was reported
      missing; preset.yml carries name/description/order — verify the roster
      renders it).

### B. Model routes / default
- [ ] Default model for a new session is `opencode-go/deepseek-v4-pro`
      (settings.yaml `agent-default-model`). Verify the model picker lists
      opencode-go and meridian models (incl. claude-fable-5).
- [ ] A session on the model picker can switch to a meridian model (e.g.
      claude-sonnet-5) and it responds.
- [ ] curl http://127.0.0.1:9000/v1/models returns the meridian model list.

### C. MCP servers (host-plane, every session)
- [ ] `mcp__nostrbook__*`, `mcp__gitlab__*`, `mcp__swiggy-food__*`,
      `mcp__swiggy-instamart__*`, `mcp__git__*` tools appear in the catalog.
- [ ] `mcp__git__status` works from bash of the model.

### D. bash-guard (structural, drop-in rules)
- [ ] `git status` in the model's bash is DENIED with the mcp__git__* reason.
- [ ] `bash -c "git log"` is DENIED (command hidden in a wrapper).
- [ ] `$(git rev-parse --show-toplevel)` is DENIED (command substitution).
- [ ] `echo git status` is ALLOWED (git is an argument, not a command).
- [ ] `ls /home/sid/repos/dotfiles-ai/dsh/plugins` is ALLOWED (paths that
      merely contain `git`/`find`/`grep` must not trigger a deny).
- [ ] A command with a parse error (e.g. unbalanced quote) is DENIED
      (fail-closed), not run.
- [ ] `find . -name x` is DENIED (find rule) with the fd/rg reason.
- [ ] `cat file | rg pattern` is ALLOWED (rg not gated).
- [ ] Add a temporary drop-in `guards/tmp-curl.json` denying `curl`, confirm a
      `curl` bash call is denied, then remove the file and confirm it is
      allowed again — proves rules re-read per call with no restart.

### E. Manifest guard + package tool (host-plane)
- [ ] Model direct `write`/`edit` of `package.json` is DENIED
      (FS_PERMISSION_DENIED, package-tool redirect).
- [ ] Model direct `write`/`edit` of `requirements.txt` is ALLOWED (exempt).
- [ ] The `package` tool can add/remove/update a dependency (e.g. a scratch
      package) and resolves the latest version.

### F. see tool (profile-routed vision)
- [ ] The `see` tool exists. Give it a real PNG (e.g. a screenshot) and a
      question; it returns a factual description.
- [ ] Note which model it used (work profile → meridian/claude-haiku-4-5).
      Personal profile route (opencode-go/qwen3.7-plus) is a known TODO.

### G. session-hygiene
- [ ] In a fresh session the hygiene section is absent. (After many
      compactions it would appear; hard to reproduce quickly — optional.)

### H. dsh-better-edit (hashline)
- [ ] In a session, `read`/`edit` are the hashline variants (lines carry
      3-char hash prefixes) and the builtin pair is shadowed out.
- [ ] Guidance override files under
      `~/.dsh/plugins/dsh-better-edit/personal/*.md` render (tool:read at
      order 130, tool:edit at 131) — check the assembled prompt/section list.

### I. LAN / Caddy (not yet deployed — do not start)
- [ ] Do NOT start the Caddy/systemd units yet. They are documented in
      `dotfiles-ai/dsh/lang/`. Regenerate the basic_auth placeholder password
      (`potato123`) before ever exposing to a shared LAN.

### J. aidos ticket board
- [ ] A new session on the aidos preset shows the six board tools
      (get_tickets, set_ticket, attach_evidence, move_ticket, plan,
      plan_import) and `tool:aidos` prompt section.
- [ ] Create a ticket, move it to in-progress, attach evidence (human-authored
      kind enforced), sign off to done via the human side (needs B2 —
      if the human surface is not ready, note it and use the CLI/API path).
- [ ] Verify the state-gated tiers: open tier hides write/edit/bash; the
      awaiting-verification tier asks on every bash call.

### K. Archived-session cleanup (Ticket T6 — scoped later)
- [ ] Do NOT write this script yet. The ticket exists in PLAN.md. For now,
      archived sessions are viewed via
      `zstdcat $DSH_HOME/sessions/<workspace-dir>/<session-id>/session.jsonl.zstd`
      and deleted via `rm -rf` on the session directory.

## How to report back
For each section, give: pass/fail, what you observed, and any error text
verbatim. Separate "works" from "needs my human check" clearly.
