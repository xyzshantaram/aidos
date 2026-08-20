# aidos

aidos is a coding-agent harness. It makes it hard to ignore the code, the scope, and the features.

You open a session. The agent talks the work through with you before it writes anything. Features
become tickets in one central store. A ticket moves between states only when the required proof
exists. You sign off at both ends.

**Status.** The Phase-1 prototype pins the kernel behavior. It lives in `prototype/`. The dsh-based
build has started: build B0 ships the domain kernel and its test port in `packages/aidos/`. PLAN.md holds the design and the ticket list.

## The name

Aidos is a Greek word for the sense of respect that keeps people honest with each other. In Plato's
*Protagoras*, Zeus sends Hermes to hand out aidos and dike, respect and justice. Zeus says everyone
gets them, because a city cannot hold together otherwise. That is the idea here. The rules apply to
both sides. The agent cannot mark its own work done. Nothing reaches `done` without you, so you
cannot drop out of the loop either.

## The problem

An agent left alone drifts. It widens scope, drops half-finished work, and reports success it did
not earn. Prompts and good intentions fail over a long session. aidos moves the fix into the
harness. A gate is a rule the agent cannot talk its way past.

## The model

**Tickets** hold the work. A ticket has four states: `open`, `in-progress`,
`awaiting-verification`, `done`. Only you move a ticket out of `awaiting-verification`. Work the
agent finished but you have not checked is exactly where things get dropped.

**Evidence** is a first-class row attached to a ticket. A row holds a kind, an author, a time, and
a payload. aidos stamps the author from the entry point that made the call. It never reads the
author from the payload, so the agent cannot write a row that names you. Kinds are namespaced, so a
plugin can add its own: `builtin:user_signoff`, or `plugin:xyz.shantaram:lighthouse_score`.

Kind definitions live in a registry, separate from the rows. The registry holds the label, the
description, and the weight. A row holds only the ticket, the kind, the author, the time, and the
payload. Weight cannot drift between two rows of the same kind, and whoever attaches a row cannot
set its own weight.

**Gates** are predicates over evidence. A gate names one transition and the evidence kinds that
transition requires. If a row is missing, aidos refuses the move and names the missing kind and who
must write it. Gates live in config, so strictness is a setting and not a schema migration.

A ticket also shows a confidence score, summed from the weights of its evidence. The score is advisory. It never unlocks anything. Only the mandatory kinds do that.

## Ticket lifecycle

1. You talk about the work.
2. The agent creates a ticket from your guidance.
3. You agree the evaluation criteria. You may define an automated check as a shell script.
4. You sign off. Only then does the ticket move to `in-progress`.
5. The agent does the work and reports what it did.
6. aidos runs the automated check. A failure sends the ticket back.
7. On a pass, the reviewer reads the change. The reviewer reports to you, not to the agent.
8. You send the ticket back with comments, or you mark it done.

## The plan

A plan belongs to a project. It holds three parts:

- the tickets,
- a project context section, kept under 500 lines,
- a project rules section that stores your preferences, which the agent may update.

The agent reads the plan serialized as markdown, because markdown is what an agent handles well.
The agent writes through tool calls such as `set_ticket`. You edit in the web UI. A plan is a
better to-do list. The rules section gives your preferences a place to live.

## Rules

aidos never writes a file into a project directory. All state lives in aidos's own data directory.
A project is keyed by its absolute path. A `move` command repoints a project to a new path.

aidos is opt-in. The aidos preset sits alongside the standard preset. A quick task uses a standard
session with zero ticket machinery. The agent's tools follow the ticket state. Before signoff it
can read and plan but cannot write files or run commands.

## Built on DeepSeek Harness

The implementation builds on DeepSeek Harness (dsh), not the from-scratch stack an earlier draft
assumed. dsh provides the agent loop, the session log, the web UI, the tool pipeline, subagents,
jobs, skills, and the human loop. aidos adds the ticket kernel, the board, and the plan skill.
The session log is the append-only source of truth. Derived reads are projections, not queries.

See PLAN.md for the full design and the ticket list.

## Repository layout

- `PLAN.md` — the design and the tickets. It is a bootstrap artifact with a scheduled death. The
  board imports it, and Ticket P6 deletes it.
- `prototype/` — the Phase-1 behavior specification. Ticket U5 deletes it when the web UI replaces
  it.

## License

MIT. See LICENSE.md.
