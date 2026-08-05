"""Shared helpers for the CLI tests, and the CLI specification itself.

The module helm_proto.cli does not exist yet. The test modules test_20 upward
define it. Read this docstring first. It records every flag spelling and every
output rule that those tests assume. Where the brief fixed a spelling, this
docstring repeats it. Where the brief left a spelling open, this docstring
fixes it.

Invocation
----------

    python3 -m helm_proto.cli --db PATH SUBCOMMAND [FLAGS]

The global flag --db PATH comes before the subcommand. The CLI creates the
database file if the file is absent.

Actor rule
----------

The CLI always acts as the actor "agent". No flag sets the actor. A --payload
value that holds an "author" key or an "actor" key does not change the stored
author. The CLI stores the payload without a change.

Output rules
------------

1. A subcommand that succeeds writes one JSON object to stdout and exits 0.
2. `plan export` is the one exception. It writes markdown to stdout.
3. A failure that the CLI detects writes one JSON object to stdout with the
   key "ok" set to false, and the CLI exits 1. The CLI never writes a
   traceback.
4. A bad flag is a usage error. The flag parser writes usage text to stderr
   and exits 2. Usage errors are exempt from rule 3, because the flag parser
   handles them before the CLI runs.

Refusal objects
---------------

A refused move writes this object:

    {"ok": false, "error": "gate_refused", "from_state": ..., "to_state": ...,
     "missing_kinds": [...], "allowed_actors": [...], "message": ...}

A refused evidence kind writes this object:

    {"ok": false, "error": "human_only_kind", "kind": ..., "message": ...}

The message for a human-only kind names the kind and states that a human must
supply it.

A plan parse error writes this object:

    {"ok": false, "error": "plan_parse_error", "line": N, "message": ...}

N is the 1-based number of the line that the parser rejected.

Subcommands
-----------

init [--project-path PATH] [--project-name NAME]
    Registers the six builtin kinds and the four default gates. Creates one
    project. --project-path defaults to the current directory.
    --project-name defaults to the last element of the project path.
    A second run makes no change to the kinds, the gates, or the project set.
    Output keys: ok, project_id, kinds, gates.

create-ticket --title TITLE [--body BODY] [--criteria CRITERIA]
              [--phase N] [--phase-title TITLE] [--project ID]
    Creates one ticket in state "open". --phase defaults to 1. The order
    value is the next free position in the phase, counted from 1. If the
    phase does not exist, the CLI creates it. --phase-title gives a new phase
    its title and defaults to "Untitled phase". A new phase starts in the
    phase state "open".
    Output keys: ok, ticket.

set-ticket --ticket ID [--title TITLE] [--body BODY] [--criteria CRITERIA]
    Changes the named fields of one ticket. An absent flag leaves its field
    as it was.
    Output keys: ok, ticket.

attach-evidence --ticket ID --kind KIND_ID [--payload JSON]
    Attaches one piece of evidence. --payload takes one JSON object as one
    string and defaults to {}. The CLI refuses builtin:user_signoff and
    builtin:user_verified.
    Output keys: ok, ticket_id, kind, payload.

move-ticket --ticket ID --to STATE
    Asks the store to move the ticket.
    Output keys: ok, ticket_id, from_state, to_state.

show --ticket ID
    Output keys: ok, ticket. The ticket object holds id, title, body,
    criteria, state, phase, order, and evidence.

list [--project ID]
    Output keys: ok, tickets. The list is sorted by phase, then by order.
    Each entry holds id, title, body, criteria, state, phase, and order.

plan export [--project ID]
    Writes the plan document to stdout as markdown.

plan import --file PATH [--project ID]
    Reads a plan document and loads it into the project.
    An import is not a transition. Every imported ticket starts in the state
    "open", whatever mark the document carries. The CLI keeps the claim of
    the document as evidence. It attaches one row of the kind
    builtin:imported_state to each imported ticket, with this payload:

        {"claimed_state": ..., "source": ...}

    The value of "claimed_state" is the state that the mark named. The value
    of "source" is the path that --file gave. The weight of the kind is 0.0,
    because the row is a record and not a proof. This rule keeps one
    invariant true: no path reaches "done" without a human.
    Output keys: ok, phases, tickets.

Every subcommand that names a project accepts --project ID. The value
defaults to 1, which is the project that init creates.

Error cases
-----------

Each of these fails under output rule 3. The CLI writes one JSON object with
"ok" set to false and exits 1.

* The ticket id does not exist. The message holds the id.
* The project id does not exist.
* The evidence kind is not registered.
* The --payload value is not a JSON object.
* The --file value of `plan import` names a file that is absent.
* `plan import` runs against a project that already holds a ticket. The
  error value is "project_not_empty". An import loads a whole plan into an
  empty project, so the CLI never merges two plans.

Plan document format
--------------------

* Frontmatter is optional. It starts with a line that holds only "---" as the
  first line of the file. It ends with the next line that holds only "---".
  The CLI keeps the frontmatter text without a change. The CLI does not parse
  YAML.
* The text between the frontmatter and the first "##" heading is the
  preamble. The CLI keeps the preamble text without a change.
* A phase heading has this form:

      ## Phase N: Title - `state`

  The character between the title and the state is an em dash, not the hyphen
  shown above. N is a whole number. The state is free text inside backticks.
  The CLI keeps the phase state as a label and does not gate on it.
* A ticket line has this form:

      - [ ] **Ticket ID: Title.** body **Evaluate:** criteria

  The mark holds one of four states:

      [ ]  open
      [~]  in_progress
      [?]  awaiting_verification
      [x]  done

  The exporter writes the mark of the real state of the ticket. The importer
  reads all four marks, but it does not set the state. See `plan import`.
  The title must not end with a period, because the exporter adds the period.
  The marker "**Evaluate:**" is required.
* A line that starts with two or more spaces continues the body of the ticket
  above it. The exporter writes each continuation line with two leading
  spaces.
* Inside a phase section only three kinds of line are legal: a blank line, a
  ticket line, and a continuation line. Any other line is a parse error. The
  CLI reports the line number, changes nothing, and exits 1. The CLI never
  skips the line.
* A "##" heading that is not a phase heading starts a context section. The
  CLI keeps the text of a context section without a change.
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

from helm_proto.store import Store

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The kinds that init registers. Each entry is label, description, weight.
BUILTIN_KINDS = {
    "builtin:user_signoff": (
        "User signoff", "The human agrees that the work may start.", 1.0),
    "builtin:user_verified": (
        "User verified", "The human checked the finished work.", 1.0),
    "builtin:automated_check": (
        "Automated check", "A machine check ran and reported a result.", 1.0),
    "builtin:after_shot": (
        "After shot", "A record of the state after the work.", 0.5),
    "builtin:test_run": (
        "Test run", "A test run and its result.", 1.0),
    "builtin:review_note": (
        "Review note", "A remark from a review.", 0.5),
    "builtin:imported_state": (
        "Imported state",
        "The state that a plan document claimed at import time.",
        0.0),
}

# The kind that plan import attaches to every ticket it loads.
IMPORT_RECORD_KIND = "builtin:imported_state"

# The mark that each state takes in a plan document.
STATE_MARKS = {
    "open": "[ ]",
    "in_progress": "[~]",
    "awaiting_verification": "[?]",
    "done": "[x]",
}

# The gates that init sets. Each entry is required kinds, allowed actors.
DEFAULT_GATES = {
    ("open", "in_progress"): (["builtin:user_signoff"], ["user", "agent"]),
    ("in_progress", "awaiting_verification"): (
        ["builtin:automated_check"], ["user", "agent"]),
    ("awaiting_verification", "done"): (["builtin:user_verified"], ["user"]),
    ("awaiting_verification", "in_progress"): ([], ["user"]),
}

# The CLI refuses to author these two kinds. Only a human supplies them.
HUMAN_ONLY_KINDS = ["builtin:user_signoff", "builtin:user_verified"]

# Every kind that the CLI may author.
AGENT_KINDS = [
    "builtin:automated_check",
    "builtin:after_shot",
    "builtin:test_run",
    "builtin:review_note",
    "builtin:imported_state",
]

# The event types that the CLI creates. The store hardcodes the actor "system"
# on every other type, so those types say nothing about the CLI.
CLI_EVENT_TYPES = (
    "ticket.created",
    "ticket.set",
    "evidence.attached",
    "ticket.moved",
    "ticket.move_refused",
)

# The ticket fields that must survive a round trip through a plan document.
# The state is absent, because an import always lands in "open".
ROUND_TRIP_TICKET_KEYS = ("id", "title", "body", "criteria", "phase", "order")


class CliResult:
    """One completed CLI run, held as both bytes and text."""

    def __init__(self, code, out_bytes, err_bytes):
        self.code = code
        self.out_bytes = out_bytes
        self.err_bytes = err_bytes
        self.stdout = out_bytes.decode("utf-8", "replace")
        self.stderr = err_bytes.decode("utf-8", "replace")

    def __str__(self):
        return "exit %s\nstdout:\n%s\nstderr:\n%s" % (
            self.code, self.stdout, self.stderr)


class CliTestCase(unittest.TestCase):
    """Base class that runs the CLI as a real subprocess.

    Each test gets its own temporary directory and its own database file.
    tearDown removes the directory.
    """

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "helm.sqlite")

    def tearDown(self):
        self.tmp.cleanup()

    # ---- running the CLI ----

    def run_cli(self, *args, db=None):
        """Run one CLI command and return a CliResult.

        The command runs from the repository root, so the real entry point and
        the real exit code are under test.
        """
        argv = [sys.executable, "-m", "helm_proto.cli",
                "--db", db or self.db_path]
        argv.extend(args)
        env = dict(os.environ)
        env["PYTHONPATH"] = os.pathsep.join(
            [REPO_ROOT, env.get("PYTHONPATH", "")]).rstrip(os.pathsep)
        proc = subprocess.run(
            argv, cwd=REPO_ROOT, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, env=env)
        result = CliResult(proc.returncode, proc.stdout, proc.stderr)
        if "No module named" in result.stderr:
            self.fail(
                "helm_proto.cli does not exist yet. Python said: %s"
                % result.stderr.strip())
        return result

    def run_ok(self, *args, db=None):
        """Run a command that must succeed. Return its parsed JSON object."""
        result = self.run_cli(*args, db=db)
        self.assertEqual(
            result.code, 0, "command %s must succeed but gave %s" % (
                list(args), result))
        return self.parse_json(result)

    def run_fail(self, *args, db=None):
        """Run a command that must fail. Return its parsed JSON object."""
        result = self.run_cli(*args, db=db)
        self.assertNotEqual(
            result.code, 0, "command %s must fail but gave %s" % (
                list(args), result))
        self.assertNotIn("Traceback", result.stderr, str(result))
        payload = self.parse_json(result)
        self.assertIs(payload.get("ok"), False, str(result))
        return payload

    def parse_json(self, result):
        """Parse the stdout of a run as one JSON object."""
        try:
            payload = json.loads(result.stdout)
        except ValueError as error:
            self.fail("stdout is not JSON (%s). Run gave: %s" % (error, result))
        self.assertIsInstance(payload, dict, str(result))
        return payload

    # ---- common setup steps ----

    def init(self, db=None):
        """Run init with a fixed project path. Return its parsed output."""
        return self.run_ok(
            "init", "--project-path", "/srv/proj/cli",
            "--project-name", "cli", db=db)

    def create_ticket(self, title="Ticket one", body="A body.",
                      criteria="A test passes.", db=None):
        """Create one ticket through the CLI. Return its id."""
        payload = self.run_ok(
            "create-ticket", "--title", title, "--body", body,
            "--criteria", criteria, db=db)
        return payload["ticket"]["id"]

    def temp_path(self, name):
        """Return a path inside the temporary directory of this test."""
        return os.path.join(self.tmp.name, name)

    def write_file(self, name, text):
        """Write one document into the temporary directory. Return its path."""
        path = self.temp_path(name)
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(text)
        return path

    def drive_to_awaiting_verification(self, title="Ticket one"):
        """Return a new ticket that sits in awaiting_verification.

        The human half of the first gate comes from the Store API, because the
        CLI refuses to author it. Every kind that the CLI may author is
        attached, so a later refusal cannot blame a kind the agent could give.
        """
        ticket = self.create_ticket(title=title)
        self.attach_as_human(ticket, "builtin:user_signoff")
        self.run_ok("move-ticket", "--ticket", str(ticket),
                    "--to", "in_progress")
        for kind_id in AGENT_KINDS:
            self.run_ok("attach-evidence", "--ticket", str(ticket),
                        "--kind", kind_id)
        self.run_ok("move-ticket", "--ticket", str(ticket),
                    "--to", "awaiting_verification")
        return ticket

    # ---- reading the store directly ----

    def read_store(self, db=None):
        """Open the test database with the Store API. The caller must close."""
        return Store(db or self.db_path)

    def attach_as_human(self, ticket_id, kind_id, payload=None, db=None):
        """Attach evidence as the user, the way the board would.

        The CLI has no path to this. Only the Store API offers it.
        """
        store = self.read_store(db=db)
        try:
            store.attach_evidence(
                ticket_id, kind_id, payload or {"ok": True}, actor="user")
        finally:
            store.close()

    def force_state(self, ticket_id, state, db=None):
        """Drive a ticket to one state with the Store API, as the board would.

        The board acts as the user, so it passes every gate that a human may
        pass. The CLI has no path to the last step.
        """
        steps = {
            "open": [],
            "in_progress": [
                ("builtin:user_signoff", "in_progress")],
            "awaiting_verification": [
                ("builtin:user_signoff", "in_progress"),
                ("builtin:automated_check", "awaiting_verification")],
            "done": [
                ("builtin:user_signoff", "in_progress"),
                ("builtin:automated_check", "awaiting_verification"),
                ("builtin:user_verified", "done")],
        }
        store = self.read_store(db=db)
        try:
            for kind_id, to_state in steps[state]:
                store.attach_evidence(
                    ticket_id, kind_id, {"ok": True}, actor="user")
                store.move_ticket(ticket_id, to_state, actor="user")
        finally:
            store.close()

    def ticket_state(self, ticket_id, db=None):
        """Return the state of one ticket, read from the store."""
        store = self.read_store(db=db)
        try:
            return store.get_ticket(ticket_id)["state"]
        finally:
            store.close()

    def evidence_rows(self, ticket_id, db=None):
        """Return every evidence row on one ticket, oldest first."""
        store = self.read_store(db=db)
        try:
            return store.evidence_for(ticket_id)
        finally:
            store.close()


def kinds_snapshot(store):
    """Return the kind registry as plain comparable data."""
    return dict(store.kinds)


def gates_snapshot(store):
    """Return the gate registry with both lists sorted, so order is free."""
    return {
        pair: (sorted(kinds), sorted(actors))
        for pair, (kinds, actors) in store.gates.items()
    }


def expected_gates_snapshot():
    """Return DEFAULT_GATES in the shape that gates_snapshot returns."""
    return {
        pair: (sorted(kinds), sorted(actors))
        for pair, (kinds, actors) in DEFAULT_GATES.items()
    }
