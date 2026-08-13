"""The command line interface of the ticket kernel prototype.

The CLI always acts as the actor "agent". No flag sets the actor, and a
payload key named "author" or "actor" is data, not an instruction.

A subcommand that succeeds writes one JSON object to stdout and exits 0. The
subcommand `plan export` is the one exception, because it writes markdown. A
failure that the CLI detects writes one JSON object with the key "ok" set to
false and exits 1. A bad flag stays with the flag parser, which writes usage
text to stderr and exits 2.
"""

import argparse
import json
import os
import sys

from aidos_proto.plan import PlanParseError, parse_plan, render_plan
from aidos_proto.store import GateRefused, Store, UnknownKind

# The CLI acts as this actor on every write.
ACTOR = "agent"

# The evidence kinds that init registers. Each entry is label, description,
# and weight.
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
    "builtin:review_pass": (
        "Review pass",
        "A reviewer read the change and reported findings.",
        1.0),
    "builtin:imported_state": (
        "Imported state",
        "The state that a plan document claimed at import time.",
        0.0),
}

# The gates that init sets. Each entry is required kinds and allowed actors.
DEFAULT_GATES = {
    ("open", "in_progress"): (["builtin:user_signoff"], ["user", "agent"]),
    ("in_progress", "awaiting_verification"): (
        ["builtin:automated_check", "builtin:review_pass"],
        ["user", "agent"]),
    ("awaiting_verification", "done"): (["builtin:user_verified"], ["user"]),
    ("awaiting_verification", "in_progress"): ([], ["user"]),
}

# The two kinds that only a human supplies. The CLI refuses to author them.
HUMAN_ONLY_KINDS = ("builtin:user_signoff", "builtin:user_verified")

# The kind that plan import attaches to every ticket it loads.
IMPORT_RECORD_KIND = "builtin:imported_state"

# The title that a phase takes when create-ticket makes it and no flag names
# a title.
DEFAULT_PHASE_TITLE = "Untitled phase"

# The project that init creates.
DEFAULT_PROJECT_ID = 1


class Refusal(Exception):
    """One failure that the CLI detects. It carries the object to print."""

    def __init__(self, error, message, **extra):
        super().__init__(message)
        self.payload = {"ok": False, "error": error, "message": message}
        self.payload.update(extra)


# ---- reading the store ----


def require_project(store, project_id):
    """Refuse a project id that the store does not hold."""
    try:
        store.get_project(project_id)
    except KeyError:
        raise Refusal(
            "unknown_project", "no project with id %s" % project_id,
            project_id=project_id)


def require_ticket(store, ticket_id):
    """Refuse a ticket id that the store does not hold. Return the ticket."""
    try:
        return store.get_ticket(ticket_id)
    except KeyError:
        raise Refusal(
            "unknown_ticket", "no ticket with id %s" % ticket_id,
            ticket_id=ticket_id)


def ticket_view(ticket):
    """Return one ticket as plain data for the output."""
    return {
        "id": ticket["id"],
        "title": ticket["title"],
        "body": ticket["body"],
        "criteria": ticket["criteria"],
        "state": ticket["state"],
        "phase": ticket["phase"],
        "order": ticket["order"],
    }


def parse_payload(text):
    """Return one payload object. The value must be one JSON object."""
    if text is None:
        return {}
    try:
        payload = json.loads(text)
    except ValueError as error:
        raise Refusal(
            "bad_payload", "the payload is not JSON: %s" % error) from error
    if not isinstance(payload, dict):
        raise Refusal("bad_payload", "the payload is not a JSON object")
    return payload


# ---- subcommands ----


def handle_init(store, args):
    """Register the builtin kinds and the default gates, and hold a project."""
    abs_path = os.path.abspath(args.project_path or os.getcwd())
    name = args.project_name or os.path.basename(abs_path) or abs_path
    kinds = store.kinds()
    for kind_id, (label, description, weight) in BUILTIN_KINDS.items():
        if kinds.get(kind_id) != (label, description, weight):
            store.register_kind(kind_id, label, description, weight)
    gates = store.gates()
    for (from_state, to_state), (gate_kinds, actors) in DEFAULT_GATES.items():
        if gates.get((from_state, to_state)) != (gate_kinds, actors):
            store.set_gate(from_state, to_state, gate_kinds, actors)
    project_id = store.find_project(abs_path)
    if project_id is None:
        project_id = store.create_project(abs_path, name)
    return {
        "ok": True,
        "project_id": project_id,
        "kinds": sorted(store.kinds()),
        "gates": [
            {
                "from_state": from_state,
                "to_state": to_state,
                "required_kinds": list(kinds),
                "allowed_actors": list(actors),
            }
            for (from_state, to_state), (kinds, actors)
            in DEFAULT_GATES.items()
        ],
    }


def handle_create_ticket(store, args):
    """Create one ticket in the state "open"."""
    require_project(store, args.project)
    ticket_id = create_ticket(
        store, args.project, args.title, args.body, args.criteria,
        args.phase, args.phase_title)
    return {"ok": True, "ticket": ticket_view(store.get_ticket(ticket_id))}


def create_ticket(store, project_id, title, body, criteria, phase,
                  phase_title, order=None):
    """Create one ticket, and create its phase when the phase is absent."""
    try:
        store.get_phase(project_id, phase)
    except KeyError:
        store.set_phase(
            project_id, phase, title=phase_title, state="open", actor=ACTOR)
    return store.create_ticket(
        project_id, title, "", actor=ACTOR, body=body, criteria=criteria,
        phase=phase, order=order)


def handle_set_ticket(store, args):
    """Change the named fields of one ticket."""
    require_ticket(store, args.ticket)
    store.set_ticket(
        args.ticket, actor=ACTOR, title=args.title, body=args.body,
        criteria=args.criteria)
    return {"ok": True, "ticket": ticket_view(store.get_ticket(args.ticket))}


def handle_attach_evidence(store, args):
    """Attach one piece of evidence that the agent may author."""
    require_ticket(store, args.ticket)
    if args.kind in HUMAN_ONLY_KINDS:
        raise Refusal(
            "human_only_kind",
            "the kind %s is human evidence, so a human must supply it"
            % args.kind,
            kind=args.kind)
    payload = parse_payload(args.payload)
    store.attach_evidence(args.ticket, args.kind, payload, actor=ACTOR)
    return {
        "ok": True,
        "ticket_id": args.ticket,
        "kind": args.kind,
        "payload": payload,
    }


def handle_move_ticket(store, args):
    """Ask the store to move one ticket."""
    ticket = require_ticket(store, args.ticket)
    from_state = ticket["state"]
    store.move_ticket(args.ticket, args.to, actor=ACTOR)
    return {
        "ok": True,
        "ticket_id": args.ticket,
        "from_state": from_state,
        "to_state": args.to,
    }


def handle_show(store, args):
    """Show one ticket and its evidence."""
    ticket = require_ticket(store, args.ticket)
    view = ticket_view(ticket)
    view["evidence"] = store.evidence_for(args.ticket)
    return {"ok": True, "ticket": view}


def handle_list(store, args):
    """List every ticket of one project, sorted by phase and then order."""
    require_project(store, args.project)
    return {
        "ok": True,
        "tickets": [ticket_view(row) for row in store.tickets_for(args.project)],
    }


def handle_plan_export(store, args):
    """Return the plan document of one project as markdown."""
    require_project(store, args.project)
    meta = store.get_plan_meta(args.project)
    rows = store.tickets_for(args.project)
    phases = []
    for phase in store.phases_for(args.project):
        phases.append({
            "number": phase["number"],
            "title": phase["title"],
            "state": phase["state"],
            "tickets": [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "body": row["body"],
                    "criteria": row["criteria"],
                    "claimed_state": row["state"],
                    "order": row["order"],
                }
                for row in rows if row["phase"] == phase["number"]
            ],
        })
    return render_plan({
        "frontmatter": meta["frontmatter"],
        "preamble": meta["preamble"],
        "phases": phases,
        "context_sections": meta["context_sections"],
    })


def handle_plan_import(store, args):
    """Load one plan document into an empty project."""
    require_project(store, args.project)
    try:
        with open(args.file, encoding="utf-8") as handle:
            text = handle.read()
    except OSError as error:
        raise Refusal(
            "file_not_read", "cannot read the plan file %s: %s"
            % (args.file, error.strerror), path=args.file) from error
    document = parse_plan(text)
    if store.tickets_for(args.project):
        raise Refusal(
            "project_not_empty",
            "project %s already holds a ticket, and an import loads a whole "
            "plan into an empty project" % args.project,
            project_id=args.project)
    store.set_plan_meta(
        args.project, frontmatter=document["frontmatter"],
        preamble=document["preamble"],
        context_sections=document["context_sections"], actor=ACTOR)
    ticket_ids = []
    for phase in document["phases"]:
        store.set_phase(
            args.project, phase["number"], title=phase["title"],
            state=phase["state"], actor=ACTOR)
        for ticket in phase["tickets"]:
            ticket_id = create_ticket(
                store, args.project, ticket["title"], ticket["body"],
                ticket["criteria"], phase["number"], phase["title"],
                order=ticket["order"])
            store.attach_evidence(
                ticket_id, IMPORT_RECORD_KIND,
                {"claimed_state": ticket["claimed_state"],
                 "source": args.file},
                actor=ACTOR)
            ticket_ids.append(ticket_id)
    return {
        "ok": True,
        "phases": [phase["number"] for phase in document["phases"]],
        "tickets": ticket_ids,
    }


HANDLERS = {
    "init": handle_init,
    "create-ticket": handle_create_ticket,
    "set-ticket": handle_set_ticket,
    "attach-evidence": handle_attach_evidence,
    "move-ticket": handle_move_ticket,
    "show": handle_show,
    "list": handle_list,
    "plan export": handle_plan_export,
    "plan import": handle_plan_import,
}


# ---- flags ----


def build_parser():
    """Return the flag parser of the whole CLI."""
    parser = argparse.ArgumentParser(prog="aidos_proto.cli")
    parser.add_argument("--db", required=True, help="path of the database")
    commands = parser.add_subparsers(dest="command", required=True)

    init = commands.add_parser("init")
    init.add_argument("--project-path")
    init.add_argument("--project-name")

    create = commands.add_parser("create-ticket")
    create.add_argument("--title", required=True)
    create.add_argument("--body", default="")
    create.add_argument("--criteria", default="")
    create.add_argument("--phase", type=int, default=1)
    create.add_argument("--phase-title", default=DEFAULT_PHASE_TITLE)
    add_project_flag(create)

    update = commands.add_parser("set-ticket")
    update.add_argument("--ticket", type=int, required=True)
    update.add_argument("--title")
    update.add_argument("--body")
    update.add_argument("--criteria")

    evidence = commands.add_parser("attach-evidence")
    evidence.add_argument("--ticket", type=int, required=True)
    evidence.add_argument("--kind", required=True)
    evidence.add_argument("--payload")

    move = commands.add_parser("move-ticket")
    move.add_argument("--ticket", type=int, required=True)
    move.add_argument("--to", required=True)

    show = commands.add_parser("show")
    show.add_argument("--ticket", type=int, required=True)

    add_project_flag(commands.add_parser("list"))

    plan = commands.add_parser("plan")
    plan_commands = plan.add_subparsers(dest="plan_command", required=True)
    add_project_flag(plan_commands.add_parser("export"))
    plan_import = plan_commands.add_parser("import")
    plan_import.add_argument("--file", required=True)
    add_project_flag(plan_import)

    return parser


def add_project_flag(parser):
    """Add the --project flag, which names the project that init created."""
    parser.add_argument("--project", type=int, default=DEFAULT_PROJECT_ID)


# ---- output ----


def write(text):
    """Write one whole output as UTF-8, whatever the locale says."""
    sys.stdout.buffer.write(text.encode("utf-8"))
    sys.stdout.buffer.flush()


def gate_refusal_payload(refused):
    """Return the object that names a refused move."""
    return {
        "ok": False,
        "error": "gate_refused",
        "from_state": refused.from_state,
        "to_state": refused.to_state,
        "missing_kinds": list(refused.missing_kinds),
        "allowed_actors": list(refused.allowed_actors),
        "message": str(refused),
    }


def main(argv=None):
    """Run one command and return its exit code."""
    args = build_parser().parse_args(argv)
    command = args.command
    if command == "plan":
        command = "plan %s" % args.plan_command
    store = Store(args.db)
    try:
        result = HANDLERS[command](store, args)
    except Refusal as refusal:
        write(json.dumps(refusal.payload) + "\n")
        return 1
    except GateRefused as refused:
        write(json.dumps(gate_refusal_payload(refused)) + "\n")
        return 1
    except UnknownKind as error:
        # The kind comes off the exception, not off the flags. Not every
        # subcommand that can raise this carries a --kind flag. plan import
        # attaches its own record kind and has no such flag.
        write(json.dumps({
            "ok": False,
            "error": "unknown_kind",
            "kind": error.kind_id,
            "message": "no evidence kind with id %s" % error.kind_id,
        }) + "\n")
        return 1
    except PlanParseError as error:
        write(json.dumps({
            "ok": False,
            "error": "plan_parse_error",
            "line": error.line,
            "message": error.message,
        }) + "\n")
        return 1
    finally:
        store.close()
    write(result if isinstance(result, str) else json.dumps(result) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
