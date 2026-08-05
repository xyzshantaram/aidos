"""Ticket kernel prototype. The event log is the source of truth."""

import json
import sqlite3
import time


class GateRefused(Exception):
    """Raised when a transition is refused by its gate."""

    def __init__(self, missing_kinds, allowed_actors, from_state=None,
                 to_state=None, actor=None, no_gate=False):
        self.missing_kinds = list(missing_kinds)
        self.allowed_actors = list(allowed_actors)
        self.from_state = from_state
        self.to_state = to_state
        self.actor = actor
        self.no_gate = no_gate
        super().__init__()

    def __str__(self):
        where = ""
        if self.from_state is not None and self.to_state is not None:
            where = " for %s -> %s" % (self.from_state, self.to_state)
        who = ""
        if self.actor is not None:
            who = " by actor %s" % self.actor
        if self.no_gate:
            detail = "no gate configured for this transition"
        else:
            parts = []
            if self.missing_kinds:
                parts.append(
                    "missing evidence kinds: " + ", ".join(self.missing_kinds)
                )
            if self.allowed_actors:
                parts.append("allowed actors: " + ", ".join(self.allowed_actors))
            detail = " ".join(parts) or "this gate permits no actor"
        return "Gate refused%s%s: %s" % (where, who, detail)


class UnknownKind(Exception):
    """Raised when an evidence kind is not registered."""


class Event:
    """One append-only log record."""

    __slots__ = ("fields",)

    def __init__(self, fields):
        self.fields = fields

    def __getitem__(self, key):
        return self.fields[key]

    def __eq__(self, other):
        return isinstance(other, Event) and other.fields == self.fields

    def __hash__(self):
        # Must agree with __eq__, which compares fields. Identity would break
        # the contract that equal objects hash equally.
        return hash(json.dumps(self.fields, sort_keys=True))

    def __repr__(self):
        return "Event(%r)" % (self.fields,)

    def __str__(self):
        f = self.fields
        t = f.get("type")
        at = f.get("at")
        if t == "kind.registered":
            return ("Kind %s registered with weight %s by %s at %s"
                    % (f.get("kind_id"), f.get("weight"), f.get("actor"), at))
        if t == "kind.weight_set":
            return ("Weight for kind %s set to %s by %s at %s"
                    % (f.get("kind_id"), f.get("weight"), f.get("actor"), at))
        if t == "gate.set":
            return ("Gate set for %s -> %s requiring kinds: %s, "
                    "allowed actors: %s by %s at %s"
                    % (f.get("from_state"), f.get("to_state"),
                       ", ".join(f.get("required_kinds") or []),
                       ", ".join(f.get("allowed_actors") or []),
                       f.get("actor"), at))
        if t == "ticket.move_refused":
            return ("Move refused: ticket %s %s -> %s by %s at %s: %s"
                    % (f.get("ticket_id"), f.get("from_state"),
                       f.get("to_state"), f.get("actor"), at, f.get("reason")))
        if t == "ticket.moved":
            return ("Ticket %s moved %s -> %s by %s at %s"
                    % (f.get("ticket_id"), f.get("from_state"),
                       f.get("to_state"), f.get("actor"), at))
        if t == "evidence.attached":
            return ("Evidence %s attached to ticket %s by %s at %s"
                    % (f.get("kind_id"), f.get("ticket_id"), f.get("actor"), at))
        if t == "ticket.created":
            return ("Ticket %s created in project %s by %s at %s"
                    % (f.get("ticket_id"), f.get("project_id"),
                       f.get("actor"), at))
        if t == "ticket.set":
            return "Ticket %s updated by %s at %s" % (
                f.get("ticket_id"), f.get("actor"), at)
        if t == "project.created":
            return ("Project %s created at %s by %s at %s"
                    % (f.get("project_id"), f.get("abs_path"),
                       f.get("actor"), at))
        if t == "project.moved":
            return ("Project %s moved to %s by %s at %s"
                    % (f.get("project_id"), f.get("abs_path"),
                       f.get("actor"), at))
        return "Event of type %s" % (t,)


class Store:
    """An append-only ticket store with a derived projection."""

    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS events ("
            "seq INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL)"
        )
        self.rebuild_projection()

    def close(self):
        """Release the database connection."""
        self.db.close()

    # ---- internal helpers ----

    def _append(self, fields):
        """Append one record to the log."""
        self.db.execute(
            "INSERT INTO events (body) VALUES (?)", (json.dumps(fields),)
        )
        self.db.commit()

    def _apply_event(self, fields):
        """Apply one log record to the projection. Refusals change nothing."""
        t = fields["type"]
        if t == "kind.registered":
            self.kinds[fields["kind_id"]] = (
                fields["label"], fields["description"], fields["weight"]
            )
        elif t == "kind.weight_set":
            if fields["kind_id"] in self.kinds:
                label, description, _ = self.kinds[fields["kind_id"]]
                self.kinds[fields["kind_id"]] = (
                    label, description, fields["weight"]
                )
        elif t == "gate.set":
            self.gates[(fields["from_state"], fields["to_state"])] = (
                list(fields["required_kinds"]), list(fields["allowed_actors"])
            )
        elif t == "project.created":
            pid = fields["project_id"]
            self.projects[pid] = {
                "id": pid,
                "abs_path": fields["abs_path"],
                "name": fields["name"],
            }
            if pid >= self._next_project_id:
                self._next_project_id = pid + 1
        elif t == "project.moved":
            self.projects[fields["project_id"]]["abs_path"] = fields["abs_path"]
        elif t == "ticket.created":
            tid = fields["ticket_id"]
            self.tickets[tid] = {
                "id": tid,
                "project_id": fields["project_id"],
                "title": fields["title"],
                "description": fields["description"],
                "state": "open",
            }
            if tid >= self._next_ticket_id:
                self._next_ticket_id = tid + 1
        elif t == "ticket.set":
            ticket = self.tickets[fields["ticket_id"]]
            if "title" in fields:
                ticket["title"] = fields["title"]
            if "description" in fields:
                ticket["description"] = fields["description"]
        elif t == "ticket.moved":
            self.tickets[fields["ticket_id"]]["state"] = fields["to_state"]
        elif t == "evidence.attached":
            self.evidence.setdefault(fields["ticket_id"], []).append({
                "kind_id": fields["kind_id"],
                "payload": fields["payload"],
                "author": fields["actor"],
                "created_at": fields["at"],
            })
        # ticket.move_refused carries no state change. Ignore it.

    # ---- registry ----

    def register_kind(self, kind_id, human_label, description, weight):
        """Register an evidence kind. One audit record is appended."""
        fields = {
            "type": "kind.registered",
            "kind_id": kind_id,
            "label": human_label,
            "description": description,
            "weight": weight,
            "actor": "system",
            "at": time.time(),
        }
        self._append(fields)
        self._apply_event(fields)

    def set_kind_weight(self, kind_id, weight):
        """Change the weight of a kind. One audit record is appended."""
        if kind_id not in self.kinds:
            raise UnknownKind(kind_id)
        fields = {
            "type": "kind.weight_set",
            "kind_id": kind_id,
            "weight": weight,
            "actor": "system",
            "at": time.time(),
        }
        self._append(fields)
        self._apply_event(fields)

    def set_gate(self, from_state, to_state, required_kinds, allowed_actors):
        """Set the gate for one exact state pair. One audit record is appended."""
        fields = {
            "type": "gate.set",
            "from_state": from_state,
            "to_state": to_state,
            "required_kinds": list(required_kinds),
            "allowed_actors": list(allowed_actors),
            "actor": "system",
            "at": time.time(),
        }
        self._append(fields)
        self._apply_event(fields)

    # ---- projects ----

    def create_project(self, abs_path, name):
        pid = self._next_project_id
        fields = {
            "type": "project.created",
            "project_id": pid,
            "abs_path": abs_path,
            "name": name,
            "actor": "system",
            "at": time.time(),
        }
        self._append(fields)
        self._apply_event(fields)
        return pid

    def move_project(self, project_id, new_abs_path):
        fields = {
            "type": "project.moved",
            "project_id": project_id,
            "abs_path": new_abs_path,
            "actor": "system",
            "at": time.time(),
        }
        self._append(fields)
        self._apply_event(fields)

    def get_project(self, project_id):
        return self.projects[project_id]

    # ---- tickets ----

    def create_ticket(self, project_id, title, description, *, actor="user"):
        if project_id not in self.projects:
            raise KeyError(project_id)
        tid = self._next_ticket_id
        fields = {
            "type": "ticket.created",
            "ticket_id": tid,
            "project_id": project_id,
            "title": title,
            "description": description,
            "actor": actor,
            "at": time.time(),
        }
        self._append(fields)
        self._apply_event(fields)
        return tid

    def set_ticket(self, ticket_id, *, actor="user", title=None, description=None):
        fields = {
            "type": "ticket.set",
            "ticket_id": ticket_id,
            "actor": actor,
            "at": time.time(),
        }
        if title is not None:
            fields["title"] = title
        if description is not None:
            fields["description"] = description
        self._append(fields)
        self._apply_event(fields)

    def get_ticket(self, ticket_id):
        return self.tickets[ticket_id]

    # ---- evidence ----

    def attach_evidence(self, ticket_id, kind_id, payload, *, actor="user"):
        if kind_id not in self.kinds:
            raise UnknownKind("no such kind: %s" % kind_id)
        fields = {
            "type": "evidence.attached",
            "ticket_id": ticket_id,
            "kind_id": kind_id,
            "payload": payload,
            "actor": actor,
            "at": time.time(),
        }
        self._append(fields)
        self._apply_event(fields)

    def evidence_for(self, ticket_id):
        return list(self.evidence.get(ticket_id, []))

    def confidence_score(self, ticket_id):
        """Sum one weight per kind per distinct author. Advisory only."""
        total = 0.0
        counted = set()
        for row in self.evidence.get(ticket_id, []):
            key = (row["kind_id"], row["author"])
            if key in counted:
                continue
            counted.add(key)
            total += self.kinds[row["kind_id"]][2]
        return total

    # ---- transitions ----

    def move_ticket(self, ticket_id, to_state, *, actor="user"):
        ticket = self.tickets[ticket_id]
        from_state = ticket["state"]
        gate = self.gates.get((from_state, to_state))
        if gate is None:
            self._append({
                "type": "ticket.move_refused",
                "ticket_id": ticket_id,
                "from_state": from_state,
                "to_state": to_state,
                "actor": actor,
                "at": time.time(),
                "reason": "no gate configured for this transition",
            })
            raise GateRefused([], [], from_state, to_state, actor, no_gate=True)
        required_kinds, allowed_actors = gate
        attached = {row["kind_id"] for row in self.evidence.get(ticket_id, [])}
        missing = [kind for kind in required_kinds if kind not in attached]
        if actor not in allowed_actors or missing:
            reason = self._refusal_reason(missing, allowed_actors)
            self._append({
                "type": "ticket.move_refused",
                "ticket_id": ticket_id,
                "from_state": from_state,
                "to_state": to_state,
                "actor": actor,
                "at": time.time(),
                "reason": reason,
            })
            raise GateRefused(missing, allowed_actors, from_state, to_state, actor)
        fields = {
            "type": "ticket.moved",
            "ticket_id": ticket_id,
            "from_state": from_state,
            "to_state": to_state,
            "actor": actor,
            "at": time.time(),
        }
        self._append(fields)
        self._apply_event(fields)

    @staticmethod
    def _refusal_reason(missing, allowed_actors):
        parts = []
        if missing:
            parts.append("missing evidence kinds: " + ", ".join(missing))
        if allowed_actors:
            parts.append("allowed actors: " + ", ".join(allowed_actors))
        return " ".join(parts)

    # ---- log and projection ----

    def events(self):
        """Return the whole log as Event objects, oldest first."""
        rows = self.db.execute("SELECT body FROM events ORDER BY seq").fetchall()
        return [Event(json.loads(body)) for (body,) in rows]

    def rebuild_projection(self):
        """Drop the projection and rebuild it from the log alone."""
        self.kinds = {}
        self.gates = {}
        self.projects = {}
        self.tickets = {}
        self.evidence = {}
        self._next_project_id = 1
        self._next_ticket_id = 1
        for event in self.events():
            self._apply_event(event.fields)
