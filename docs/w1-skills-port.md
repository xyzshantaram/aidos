# W1 Skills Port Inventory

This document inventories the port of ten skills from the opencode-style setup at `/home/sid/repos/dotfiles-ai/skills/<name>/SKILL.md` into DeepSeek Harness (dsh) as `SKILL.md` bundles. It is build W1 of the personal config. The deliverable is the inventory only. The bundles themselves are written in a later step.

The dsh facts below were verified earlier. They are not re-verified here.

- dsh loads skills through `ctx.skills`.
- dsh frontmatter fields are `name`, `description`, `whenToUse`.
- opencode's `compatibility` line is opencode-specific. Translate it or drop it.
- opencode's `question` tool becomes dsh's userQuestions mechanism.
- opencode's `Task` tool becomes dsh's subagent tool.
- opencode's `permission.bash` prompt becomes dsh's approval system, the approval and asked cards.
- "Primary-agent only" maps to dsh tool availability per agent scope.
- Paths like `~/.config/opencode/skills/<name>/scripts/...` become `$DSH_HOME` equivalents. The W0 sync script copies dotfiles-ai into `$DSH_HOME`.

This document follows the STE rules of the ste-writing skill: short active sentences, one name per thing, no semicolons, no contractions, imperative steps.

## 1. Summary table

| Skill | One-line purpose | External dependencies | opencode terms to translate | STE/polish needed | Port notes |
|---|---|---|---|---|---|
| caffeine | Toggle the systemd-logind inhibitor so this laptop may or may not sleep | `scripts/caffeine.sh` (bundled); systemd-logind over D-Bus; `$XDG_RUNTIME_DIR`; Linux/systemd | "Primary-agent only; not available to subagents"; `compatibility: linux, systemd` | Light | Path swap; primary-agent mapping; drop compatibility |
| devtunnel | Run a dev server and expose it over HTTPS on the LAN at a potato.local URL | `~/.local/bin/devtunnel` (PATH binary); Caddy; avahi/mDNS; firewalld port range 1338-1360 opened out-of-band; tracked copy `devtunnel` in bundle | "opencode-web (this very chat)"; `OPENCODE_SETUP.md` reference; "long-running/background shell tool"; `compatibility: linux, systemd, caddy` | Moderate | Doc reference rewrite; keep PATH binary and drift note |
| etu | Track time with the etu CLI: check hours, sessions, and memos; start and stop the clock | `etu` CLI (built from `~/repos/etu`, deno); `--structured` JSON output; ask-before-run approval config | `permission.bash`; "opencode shows an approval prompt"; "dodge the pattern match"; regen path inside generated marker; `compatibility: opencode` | Yes, prose rewrite | Keep generated block intact; rewrite Rules and Workflow around dsh approval cards |
| expense-split | Fetch delivery orders, itemize them into JSON, split them in a dashboard, push splits to Splitwise | `dashboard.py` + `push_to_splitwise.py` (bundled); python3, tkinter, `requests-oauthlib`; MCP servers: blinkit (local node), swiggy-food, swiggy-instamart (remote), zepto (mcp-remote); `~/installs/blinkit-mcp` | No opencode tool names; MCP config in `opencode.json` format; `~/.config/opencode/skills/...` paths; no frontmatter at all | Yes, strict mode for steps | Port as skill, not tools; MCP rows move to dsh preset (W3) |
| grilling | Interview the user about every aspect of a plan until shared understanding | None | `question` tool; `compatibility: opencode` | Light | Near as-is; swap tool name in body and worked example |
| plan | Create and maintain a self-contained PLAN.md that tracks phased progress | None (optional `BENCHMARK_LEVER` env var read via bash) | "dispatch to `coder`/`researcher`" (Task tool); "compaction"; `CLAUDE.md` in the agent-instructions check; `compatibility: opencode` | Moderate | Term swaps only; keep review contract and five sections verbatim |
| review | Review a code change for quality, conventions, and scope creep | git, read-only | "coder subagent"; "orchestrator"; `compatibility: opencode` | Light-moderate | Term swaps only; report format unchanged |
| share-caddy-cert | Temporarily share this machine's Caddy local CA root with a new LAN device | `~/.local/bin/share-caddy-cert` (PATH binary); Caddy CA root at `~/.local/share/caddy/pki/authorities/local/root.crt`; port 1350 in the 1338-1360 range | `OPENCODE_SETUP.md` reference; "long-running/background shell tool"; no frontmatter | Light | Near as-is; add frontmatter; doc reference rewrite |
| software-engineering | Run non-trivial coding work through think, plan, review, dispatch | git (status/diff/commit); coder/tester/researcher subagent rows (W2) | `Task` tool; `task_id` reuse; coder/tester/researcher subagents; "primary conversation"; "compact"; `compatibility: opencode` | Moderate-heavy | Vocabulary rewrite across body and worked example; keep split test/implementation rule |
| ste-writing | Rewrite prose into ASD-STE100 Simplified Technical English | None | None | Minimal; it is the style authority | Add whenToUse only; body ports unchanged |

## 2. Per-skill details

### 2.1 caffeine

Proposed dsh frontmatter:

- name: `caffeine`
- description: Toggle whether this Linux laptop may sleep or suspend, on or off, at the user's word.
- whenToUse: Use when the user says "caffeine", "keep the laptop awake", "stay awake", "don't let it sleep", or the reverse: "let it sleep now", "turn off caffeine", "go to bed".

opencode-term translation list:

- "Primary-agent only; not available to subagents" in the description. This maps to dsh tool availability per agent scope. In practice, gate the script call behind a tool or rule that only the primary agent can invoke, and keep the instruction line in the body.
- `compatibility: linux, systemd`. Drop the field. Fold "Linux and systemd only" into the body or the description.

Content that must be rewritten:

- `~/.config/opencode/skills/caffeine/scripts/caffeine.sh` becomes `$DSH_HOME/skills/caffeine/scripts/caffeine.sh`. The script ships inside the bundle.
- Add the `whenToUse` frontmatter field. The current description carries the triggers, and dsh reads them from `whenToUse`.

Conflict or overlap: none. It is a leaf skill. It does not reference other skills.

### 2.2 devtunnel

Proposed dsh frontmatter:

- name: `devtunnel`
- description: Run a local dev server and expose it over HTTPS on the LAN at a potato.local URL.
- whenToUse: Use when the user wants to reach a dev server from a phone, tablet, or another device instead of localhost, or asks to start, stop, restart, list, or toggle a dev tunnel.

opencode-term translation list:

- "potato.local:1337 (opencode-web — this very chat)". The chat UI is now dsh web. Rewrite the parenthetical to "dsh web".
- "documented in `dotfiles-ai/OPENCODE_SETUP.md`". The opencode setup doc goes away. The W5 build describes the Caddy, mDNS, and systemd setup in the dotfiles README. Point the reference there.
- "run it via a long-running/background shell tool". dsh exposes long-running work as jobs and the long-running command tool from W4. Say "run it as a dsh job or long-running command".
- `compatibility: linux, systemd, caddy`. Drop the field. The constraints body already names Caddy, avahi, and firewalld.

Content that must be rewritten:

- Keep `~/.local/bin/devtunnel` as the live binary path. It is a deployed PATH binary, not a skill-relative path.
- Keep the tracked copy note, but reword it for the new home: the copy lives beside SKILL.md in the bundle under `$DSH_HOME`, not "in this directory" relative to the opencode repo.
- Keep the drift rule: when the live script changes, copy the update back to the bundle.
- Keep every design constraint. They are opencode-independent.

Conflict or overlap: share-caddy-cert shares the same CA and the same 1338-1360 port range. Each skill already names the other. Preserve both cross-references.

### 2.3 etu

Proposed dsh frontmatter:

- name: `etu`
- description: Track time with the etu CLI: check hours, sessions, and memos, and start or stop the clock.
- whenToUse: Use when the user asks about tracked hours, sessions, projects, or memos, or wants to start, stop, edit, or continue time tracking. dsh shows an approval card before every etu bash call, so call the CLI directly.

opencode-term translation list:

- "opencode's own permission system prompts for approval before every `etu` invocation" in the description. Becomes "dsh shows an approval card before every etu invocation".
- "opencode's `permission.bash` config asks for confirmation before **every** `etu` invocation" in the intro. Becomes a dsh bash approval rule: ask before every etu call, not only destructive ones. The rule lives in preset config, not in skill text.
- "The human approves or rejects via opencode's own prompt." Becomes "The human approves or rejects via the dsh approval card."
- "opencode shows an approval prompt to the human before it executes." Becomes "dsh shows an approval card before it executes the command."
- "Do not try to route around the prompt. No `sh -c 'etu ...'`, `eval`, or building the command in a variable to dodge the pattern match." The behavior ports. The wording must change: the dsh approval rule pattern-matches on the etu command. Wrapping the command in a shell construct dodges the rule. Keep the prohibition, rename the mechanism.
- "opencode's permission prompt reaches the human automatically. You do not need to relay or duplicate it." Becomes "The dsh approval card reaches the human automatically. Do not relay or duplicate it."
- `compatibility: opencode`. Drop it.

Content that must be rewritten:

- Keep the generated command reference intact between `BEGIN GENERATED` and `END GENERATED`. The port translates only the prose around it: the intro, Rules, Workflow, and Examples sections.
- The regen comment inside the marker names `~/.config/opencode/skills/etu/SKILL.md`. Update that path to `$DSH_HOME/skills/etu/SKILL.md` when the block is next regenerated. Keep all Usage output lines verbatim.
- The Workflow step 3 and the Examples show "OK?" as a spoken confirmation before running. That pattern stays, but the mechanic changes: the approval card is the confirmation, and the "OK?" line is the plan statement.

Conflict or overlap: none. It is a leaf skill.

### 2.4 expense-split

Proposed dsh frontmatter:

- name: `expense-split`
- description: Split delivery-platform orders among people and push the splits to Splitwise.
- whenToUse: Use when the user wants to split Blinkit, Swiggy, or Zepto expenses among roommates, partners, or a group, or wants to push the final splits to Splitwise.

opencode-term translation list:

- No opencode tool names appear. The skill names MCP tools like `blinkit_blinkit_order_history`. Those names are MCP tool names, not opencode terms. They stay.
- The MCP configuration JSON under "MCP configuration" is in `opencode.json` format. It becomes dsh preset MCP rows. W3 already lists swiggy-food and swiggy-instamart. Add blinkit (local node command) and zepto (mcp-remote) rows.
- `~/.config/opencode/skills/expense-split/dashboard.py` becomes `$DSH_HOME/skills/expense-split/dashboard.py`. Same for `push_to_splitwise.py`.

Content that must be rewritten:

- Add the full frontmatter. The current file has none. It starts with the heading.
- Rewrite every skill-relative script path to `$DSH_HOME`.
- Keep the user-data paths as they are: `~/ai-scratch/orders.json`, `~/.cache/ordersplit/`. Those are data locations, not skill locations.
- Keep the MCP auth notes. They describe per-platform behavior, not opencode behavior.
- Rewrite the dependency install line. `pip install requests-oauthlib` stays. The W11 `package` tool may cover it later, but the skill text can keep the plain command.

Scripts versus tools recommendation:

- Port this as a skill, not as dsh tools. The reason: step 2, the itemization, is agent judgment. It searches products, backsolves prices, detects B1G1, and writes verification scripts. A tool boundary does not capture that work. A skill does.
- Keep `dashboard.py` and `push_to_splitwise.py` as bundled files. The skill invokes them through the bash tool. The dashboard is a Tkinter GUI the human drives. The push script has interactive prompts for the human, the OAuth paste, and the `[Y/n/s/q]` confirmation. Those stay terminal-interactive.
- The MCP servers are the real tool surface. Move them into the dsh preset as MCP rows. The skill then calls them through `ctx` MCP tools.
- One refinement for the port: state the `--summary` flag earlier in the workflow. It avoids launching the GUI when the human only wants the table.

Conflict or overlap: none with the other nine skills. Its MCP rows overlap W3 of the aidos build by design.

### 2.5 grilling

Proposed dsh frontmatter:

- name: `grilling`
- description: Interview the user about every aspect of a plan, decision, or idea until you reach a shared understanding.
- whenToUse: Use when the user wants to stress-test their thinking, or uses any grill trigger phrase.

opencode-term translation list:

- "Use the `question` tool for every question, not plain prose." Becomes "Use the userQuestions mechanism for every question, not plain prose."
- The worked example shows a `question` tool call with `question`, `header`, and `options` fields. Those fields map to the dsh ask_user_question shape. Keep the example, rename the tool.
- "Do not mark any option '(Recommended)'." The rule stays. dsh's ask_user_question supports a recommended label. The skill forbids using it in a grilling session.
- `compatibility: opencode`. Drop it.

Content that must be rewritten:

- Only the tool name and the worked example header change. The one-question-at-a-time rule, the fact-versus-decision rule, and the no-acting rule port unchanged.

Conflict or overlap: plan and software-engineering both dispatch to grilling for scope and ticket decomposition. Keep the skill name `grilling` so those references stay valid. The evaluation-criteria rule in plan depends on it.

### 2.6 plan

Proposed dsh frontmatter:

- name: `plan`
- description: Create and maintain a self-contained PLAN.md that tracks phased implementation progress on a feature or effort.
- whenToUse: Use when the user mentions planning, a phased implementation plan, plan.md, compaction, or when starting or continuing medium-to-large work that needs a living record of its in-progress phases.

opencode-term translation list:

- "dispatch to `researcher`" and "dispatch to `coder`". These are Task-tool dispatches. Become "dispatch to the `researcher` subagent" and "dispatch to the `coder` subagent" through the dsh subagent tool.
- "compaction" as a trigger word. The word stays. The user says it, and the skill runs a compaction pass over PLAN.md.
- "run `echo \"$BENCHMARK_LEVER\"` (bash tool)". The bash tool stays. No change.
- The agent-instructions check names `AGENTS.md` and `CLAUDE.md`. Keep `AGENTS.md`. Drop `CLAUDE.md` or list it as a legacy name to check.
- `compatibility: opencode`. Drop it.

Content that must be rewritten:

- Only the dispatch vocabulary changes. The five sections, the ticket rules, the review contract, the human review queue, the benchmarking section, the compaction pass, the compactness budget, and the finishing rule port verbatim.
- The review contract is the load-bearing rule. Quote it in full in the bundle. review and software-engineering both reference it.

Conflict or overlap: heavy by design. plan names grilling for decomposition and evaluation criteria, and names coder and researcher subagents. software-engineering re-states plan's review contract. Keep the names `grilling`, `coder`, `researcher`, and `review` so the cross-references hold. The B4 build imports PLAN.md into the aidos board, so the five-section shape is a contract the board consumes.

### 2.7 review

Proposed dsh frontmatter:

- name: `review`
- description: Review a code change for code quality, convention adherence, and scope creep.
- whenToUse: Use when dispatched to review implementation work, or when the user asks to review a diff, a PR, or a commit.

opencode-term translation list:

- "a coder subagent's diff" in the description. Stays. `coder` is a dsh subagent row from W2.
- "the orchestrator" throughout. Becomes "the primary agent".
- "re-dispatches to `coder` for fixes". Becomes "re-dispatches to the `coder` subagent".
- "Do not edit the code yourself. Findings go back to the orchestrator." Becomes "Do not edit the code yourself. Findings go back to the primary agent."
- `compatibility: opencode`. Drop it.

Content that must be rewritten:

- The git commands stay: `git diff`, `git diff --staged`, `git show`, `git log`.
- The AI-slop, wheel-reinvention, scope, convention, and claim-check sections port verbatim.
- The report contract stays: pass or request-changes with `file:line` references for every finding.

Conflict or overlap: review implements the plan skill's review contract at the dispatch level. The plan skill's contract is the independent verification floor. review adds the code-quality pass on top. Keep that separation clear in the port. software-engineering dispatches review through the `researcher` subagent. Keep the `researcher` name.

### 2.8 share-caddy-cert

Proposed dsh frontmatter:

- name: `share-caddy-cert`
- description: Temporarily share this machine's Caddy local CA root certificate with a new device on the LAN.
- whenToUse: Use when a device does not yet trust local HTTPS on potato.local and needs the root certificate to install as a trusted CA, or when the user asks to share, expose, or send the caddy cert.

opencode-term translation list:

- "documented in `dotfiles-ai/OPENCODE_SETUP.md`". Rewrite to the dotfiles README, same as devtunnel.
- "run it via a long-running/background shell tool". Becomes "run it as a dsh job or long-running command". The script blocks in the foreground for up to 30 minutes.

Content that must be rewritten:

- Add the full frontmatter. The current file has none.
- Keep `~/.local/bin/share-caddy-cert` and the CA root path. Both are deployed locations, not skill paths.
- Keep the platform install steps for ChromeOS, Android, and iOS. They are device instructions, not opencode content.
- Keep the self-destruct rule and the port fallback note.

Conflict or overlap: devtunnel. Same CA, same trust model, same 1338-1360 port range. The two skills already cross-reference. Preserve both references in the port.

### 2.9 software-engineering

Proposed dsh frontmatter:

- name: `software-engineering`
- description: Run any non-trivial software engineering request through the think, plan, review, and dispatch workflow.
- whenToUse: Use for any multi-step coding task: implementing a feature, building something, fixing a bug, or refactoring. Skip for a one-line fix, a quick question, or a single obvious edit.

opencode-term translation list:

- "Subagents (`coder`, `tester`, `researcher`) typically run on a cheaper, faster model tier". Stays. W2 pins the model tiers.
- "via the Task tool". Becomes "via the dsh subagent tool".
- "reuse `task_id` to continue the same subagent session". Becomes "reuse the same subagent. dsh subagents are durable. Send follow-up work to the same subagent id." A fresh dispatch without reuse starts a blank context, same as opencode.
- "a subagent invocation without a reused `task_id` starts from a blank context". Becomes "a new subagent starts from a blank context".
- "deliberately *not* reusing the first dispatch's `task_id`". Becomes "deliberately as a fresh subagent, not a follow-up message to the test coder". The split test/implementation rule survives this translation.
- "in the primary conversation" and "in the main session". Becomes "in the primary agent session".
- "the orchestrator always names the exact test or command in the brief". Becomes "the primary agent always names the exact test or command in the brief".
- "suggest they compact (or start a fresh session)". The word compact stays. dsh has session hygiene and compaction. Keep the advice.
- `compatibility: opencode`. Drop it.

Content that must be rewritten:

- The worked example transcript. The `task_id` references become subagent id references. The "not continuing that session" line becomes "as a fresh subagent, not a follow-up message".
- The example's ticket snippet uses `## Ticket:` and `**Acceptance criteria:**`. Keep the shape. The aidos board consumes tickets, so the shape matters to the build.
- Everything else, the workflow steps, the trust rules, the review dispatch rule, and the diff-reading rule port with the vocabulary above.

Conflict or overlap: plan and review. software-engineering orchestrates both. It restates plan's review contract and dispatches review through the `researcher` subagent. Keep the names aligned with W2 rows.

### 2.10 ste-writing

Proposed dsh frontmatter:

- name: `ste-writing`
- description: Rewrite prose into ASD-STE100 Simplified Technical English to remove AI slop.
- whenToUse: Use when asked to make writing not sound like AI, make docs clear and plain, enforce a controlled writing style, or write technical documentation that reads human. Two modes apply: strict for procedures and safety text, STE-flavored for general prose.

opencode-term translation list:

- None. The body has no opencode terms, no tool names, no paths, and no scripts.

Content that must be rewritten:

- Add the `whenToUse` field. The current description already carries the triggers. Split them into description and whenToUse.
- The body ports verbatim: the words rules, the verb rules, the sentence rules, the punctuation rule, the structure rule, the two modes, and the self-lint list.
- Keep the ASD-STE100 link and the copyright note.

Conflict or overlap: none as a subject. As a style authority it governs the prose of the other nine bundles. The port should apply STE-flavored editing to every other bundle's body text, including this inventory.

## 3. Affects the aidos build

These skills carry rules the aidos B-series implementation must follow. The B-series is the ticket kernel, the board, and the plan skill.

- software-engineering: Split test-writing and implementation into two independent coder dispatches, never joined, with the primary agent naming the exact test command.
- plan: PLAN.md keeps exactly five sections, tickets carry user-agreed evaluation criteria, completed tickets leave the file, and the file is deleted when the work ships.
- plan: The review contract is a floor: the primary agent independently verifies one concrete claim against the real artifact before any ticket closes.
- review: Review reports pass or request-changes with file:line findings, and review never edits code itself.
- grilling: Ask one structured question at a time through userQuestions, and settle evaluation criteria with the user, never alone.
- ste-writing: Ticket text, plan text, and agent reports follow STE-flavored lint: one name per thing, no semicolons, no contractions, active voice.
- plan: The BENCHMARK_LEVER table survives the B4 import. It is the same benchmarking table the aidos build already keeps in PLAN.md.

## 4. Port order

Ports that land cleanly as-is, with light edits only:

1. ste-writing. No opencode terms, no paths, no scripts. Add whenToUse and it is done. Port it first because it sets the prose standard for the other nine bundles.
2. grilling. One tool swap in the body and the worked example. The structure is otherwise final.
3. review. Term swaps only: coder subagent, primary agent, researcher. The report contract is final.
4. caffeine. Path swap, primary-agent mapping, drop compatibility. The script ships unchanged.
5. share-caddy-cert. Add frontmatter, swap the doc reference and the job-tool wording. Everything else is final.
6. devtunnel. Swap the doc reference, "opencode-web" to "dsh web", and the job-tool wording. The constraints body is final.

Ports that need rewriting first:

7. plan. The structure is final, but the dispatch vocabulary needs the subagent translation before the B-series can depend on it.
8. software-engineering. The Task tool and task_id vocabulary runs through the whole body and the worked example. Translate it before W2 pins the subagent rows, because the two builds share the coder, tester, and researcher names.
9. etu. The approval interaction is the skill's core. Every rule sentence names opencode's permission prompt. Rewrite the prose around dsh approval cards. Keep the generated block intact and update the regen path.
10. expense-split. The largest structural job. It has no frontmatter, its MCP config is opencode-format JSON, and it has three classes of paths to separate. The scripts-vs-tools decision is settled here: port as a skill, keep the scripts bundled, move the MCP servers to the preset. Land it last because its MCP rows test against W3.

The reason for the order: ste-writing defines the style the other nine bundles must meet. grilling, plan, review, and software-engineering cross-reference one another, so their names and dispatch terms must land before the B-series depends on them. etu waits on the approval-config decision. expense-split waits on the W3 MCP rows to verify against.
