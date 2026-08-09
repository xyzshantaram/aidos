# aidos

aidos is a coding-agent harness that makes it hard to ignore the code, the scope, and the
features.

You open a session. The agent talks the work through with you before it writes anything.
Features become tickets in one central database. A ticket moves between states only when the
required proof exists. You sign off at both ends.

**Nothing is built yet. This repository holds the plan. See PLAN.md.**

## The name

Aidos is a Greek word for the sense of respect that keeps people honest with each other. In
Plato's *Protagoras*, Zeus sends Hermes to hand out aidos and dike, respect and justice. Hermes
asks whether to give them to a few experts, the way crafts are given out. Zeus says everyone
gets them, because a city cannot hold together otherwise.

That is the idea here. The rules apply to both sides. The agent cannot mark its own work done,
and nothing reaches `done` without you, so you cannot drop out of the loop either.

## The problem

An agent left alone drifts. It widens scope, drops half-finished work, and reports success it
did not earn. The usual fixes are prompts and good intentions. Both fail over a long session.

aidos moves the fix into the harness. A gate is a rule the agent cannot talk its way past.

## The model

Three objects carry the whole design.

**Tickets** hold the work. A ticket is in one of four states: `open`, `in-progress`,
`awaiting-verification`, `done`. Only you move a ticket out of `awaiting-verification`. That
state exists because work the agent finished but you have not checked is exactly where things
get dropped, and it is not the same as work nobody has started.

**Evidence** is a first-class row attached to a ticket. A row holds a kind, an author, a time,
and a payload. aidos stamps the author from the entry point that made the call. aidos never reads
the author from the payload, so the agent cannot write a row that names you. Kinds are
namespaced, so a plugin can add its own: `builtin:user_signoff`, or
`plugin:xyz.shantaram:lighthouse_score`.

Kind definitions live in a registry, separate from the rows. The registry holds the label, the
description, and the weight. A row holds only the ticket, the kind, the author, the time, and
the payload. Weight therefore cannot drift between two rows of the same kind, and whoever
attaches a row cannot set its own weight.

**Gates** are predicates over evidence. A gate names one transition and the evidence kinds that
transition requires. If a row is missing, aidos refuses the move and names the kind that is
missing and who must write it. Gates live in config, so strictness is a setting and not a
schema migration.

A ticket also shows a confidence score, summed from the weights of its evidence. The score is
advisory. It never unlocks anything. Only the mandatory kinds do that.

## Ticket lifecycle

1. You talk about the work.
2. The agent creates a ticket from your guidance.
3. You and the agent agree the evaluation criteria. You may define an automated check as a
   shell script.
4. You sign off. Only then does the ticket move to `in-progress`. You may review or change the
   file allowlist first.
5. The agent does the work and reports what it did.
6. aidos runs the automated check. A failure sends the ticket back.
7. On a pass, aidos dispatches the reviewer. The reviewer reports to **you**, not to the agent.
8. You send the ticket back with comments, or you mark it done.

## The plan

A plan belongs to a project. It holds three parts:

- the tickets,
- a project context section, kept under 500 lines,
- a project rules section that stores your preferences, which the agent may update.

Think of it as a better version of a to-do list. The rules section gives your preferences a
place to live, so you do not re-litigate them every session.

The agent reads the plan serialized as markdown, because markdown is what an agent handles
well. The agent writes structured, through tool calls such as `set_ticket`. You edit
structured, in the web UI. Markdown is also the import format for the first plan.

## Rules

aidos never writes a file into a project directory. All state lives in aidos's own data
directory. A project is keyed by its absolute path. A `move` command repoints a project to a
new path and changes the working directory of the agent session, which also covers a switch
between worktrees.

## Stack

- Rust, end to end.
- `rig-core` for the agent loop and provider normalization.
- `poem` for HTTP. WebSocket carries the agent-to-client protocol.
- SQLite through `sqlx`. An append-only event log is authoritative and current state derives
  from it. Versioning, provenance, and the audit log are then one mechanism instead of three.
- Svelte 5 with Vite for the web UI. `ts-rs` generates the TypeScript types from the Rust
  types, so the wire protocol cannot drift.
- `rquickjs` runs tool scripts. It is the only embedded engine evaluated that offers a hard
  memory cap, a stack cap, and an interrupt handler, together with host async functions that a
  script can await without blocking a tokio worker.

aidos runs on one machine and serves your other devices on the LAN. It holds one human identity,
so an evidence row is either yours or the agent's, with no login.

## Provider profiles

A profile is one provider setup: provider URL, API key, model auto-detection, and a preferred
model list. Every profile has the same shape. One provider may appear in many profiles, such as
a test and a production DeepSeek, or a personal and a work Claude subscription.

Providers are not uniformly OpenAI compatible, so aidos translates through rig's provider layer
and not through raw compatibility endpoints. Anthropic's own compatibility layer ignores
`strict` tool schemas, prompt caching, and `reasoning_effort`, and Anthropic states it is not
production ready.

## Extension

- **Tools are directories.** Each holds a `README.md` with frontmatter, a description, and
  screenshots, plus a `script.js`. Drop a directory into the config directory to add a tool.
  aidos ships a `.d.ts` for the tool API, so an author gets editor completion while shipping
  plain JavaScript.
- **Skills are first class.** A small core of tools stays always on. A skill activates a
  further group when a task needs it. This keeps the context small, which also makes small
  models work better.
- **The agent can build a user interface.** It emits a declarative node tree and aidos renders
  it, so the agent can build a throwaway dashboard for a one-off review task. Form submissions
  come back as structured data and land as evidence rows.
- **The shell tool is narrow.** Allow and deny patterns, with ask by default for anything
  unmatched. Ask-by-default does the real work here, because an unmatched command cannot pass
  silently. Allow entries must name narrow verbs, since allowing `git *` re-opens `git push`.
- **Config can load from a git URL.**

## Credit

The declarative node tree, the script-facing standard library split into `ctx`, `ui`, `util`
and `store`, and the per-turn resource model all come from
[nostr-canvas](https://gitlab.com/soapbox-pub/nostr-canvas). aidos does not embed that crate. It
copies the design, and some code, into a plain Rust program.

## License

MIT. See LICENSE.md.
