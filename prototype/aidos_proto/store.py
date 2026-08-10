"""Ticket kernel prototype. The event log is the source of truth."""

import json
import sqlite3
import time


# ---- SQL views over the log ----
# Each view mirrors one projection attribute. A later change can swap a
# view in for the in-memory copy without renaming any field.

_SQL_V_KINDS = """
CREATE VIEW IF NOT EXISTS v_kinds AS
SELECT json_extract(c.body,'$.kind_id') AS kind_id,
       (SELECT json_extract(u.body,'$.label')
          FROM events u
         WHERE json_extract(u.body,'$.kind_id') =
               json_extract(c.body,'$.kind_id')
           AND json_extract(u.body,'$.type') IN
               ('kind.registered','kind.weight_set')
           AND json_extract(u.body,'$.label') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS label,
       (SELECT json_extract(u.body,'$.description')
          FROM events u
         WHERE json_extract(u.body,'$.kind_id') =
               json_extract(c.body,'$.kind_id')
           AND json_extract(u.body,'$.type') IN
               ('kind.registered','kind.weight_set')
           AND json_extract(u.body,'$.description') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS description,
       (SELECT json_extract(u.body,'$.weight')
          FROM events u
         WHERE json_extract(u.body,'$.kind_id') =
               json_extract(c.body,'$.kind_id')
           AND json_extract(u.body,'$.type') IN
               ('kind.registered','kind.weight_set')
           AND json_extract(u.body,'$.weight') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS weight
  FROM events c
 WHERE json_extract(c.body,'$.type') IN
       ('kind.registered','kind.weight_set')
 GROUP BY json_extract(c.body,'$.kind_id')
"""

_SQL_V_GATES = """
CREATE VIEW IF NOT EXISTS v_gates AS
SELECT json_extract(c.body,'$.from_state') AS from_state,
       json_extract(c.body,'$.to_state') AS to_state,
       json_extract(c.body,'$.required_kinds') AS required_kinds,
       json_extract(c.body,'$.allowed_actors') AS allowed_actors
  FROM events c
 WHERE json_extract(c.body,'$.type') = 'gate.set'
   AND c.seq = (SELECT MAX(u.seq)
                  FROM events u
                 WHERE json_extract(u.body,'$.type') = 'gate.set'
                   AND json_extract(u.body,'$.from_state') =
                       json_extract(c.body,'$.from_state')
                   AND json_extract(u.body,'$.to_state') =
                       json_extract(c.body,'$.to_state'))
"""

_SQL_V_PROJECTS = """
CREATE VIEW IF NOT EXISTS v_projects AS
SELECT json_extract(c.body,'$.project_id') AS project_id,
       (SELECT json_extract(u.body,'$.abs_path')
          FROM events u
         WHERE json_extract(u.body,'$.project_id') =
               json_extract(c.body,'$.project_id')
           AND json_extract(u.body,'$.type') IN
               ('project.created','project.moved')
           AND json_extract(u.body,'$.abs_path') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS abs_path,
       (SELECT json_extract(u.body,'$.name')
          FROM events u
         WHERE json_extract(u.body,'$.project_id') =
               json_extract(c.body,'$.project_id')
           AND json_extract(u.body,'$.type') IN
               ('project.created','project.moved')
           AND json_extract(u.body,'$.name') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS name
  FROM events c
 WHERE json_extract(c.body,'$.type') = 'project.created'
"""

_SQL_V_PHASES = """
CREATE VIEW IF NOT EXISTS v_phases AS
SELECT json_extract(c.body,'$.project_id') AS project_id,
       json_extract(c.body,'$.number') AS number,
       COALESCE((SELECT json_extract(u.body,'$.title')
                   FROM events u
                  WHERE json_extract(u.body,'$.project_id') =
                        json_extract(c.body,'$.project_id')
                    AND json_extract(u.body,'$.number') =
                        json_extract(c.body,'$.number')
                    AND json_extract(u.body,'$.type') = 'phase.set'
                    AND json_extract(u.body,'$.title') IS NOT NULL
                  ORDER BY u.seq DESC
                  LIMIT 1), '') AS title,
       COALESCE((SELECT json_extract(u.body,'$.state')
                   FROM events u
                  WHERE json_extract(u.body,'$.project_id') =
                        json_extract(c.body,'$.project_id')
                    AND json_extract(u.body,'$.number') =
                        json_extract(c.body,'$.number')
                    AND json_extract(u.body,'$.type') = 'phase.set'
                    AND json_extract(u.body,'$.state') IS NOT NULL
                  ORDER BY u.seq DESC
                  LIMIT 1), 'open') AS state
  FROM events c
 WHERE json_extract(c.body,'$.type') = 'phase.set'
 GROUP BY json_extract(c.body,'$.project_id'),
          json_extract(c.body,'$.number')
"""

_SQL_V_PLAN_META = """
CREATE VIEW IF NOT EXISTS v_plan_meta AS
SELECT json_extract(c.body,'$.project_id') AS project_id,
       COALESCE((SELECT json_extract(u.body,'$.frontmatter')
                   FROM events u
                  WHERE json_extract(u.body,'$.project_id') =
                        json_extract(c.body,'$.project_id')
                    AND json_extract(u.body,'$.type') =
                        'plan.meta_set'
                    AND json_extract(u.body,'$.frontmatter')
                        IS NOT NULL
                  ORDER BY u.seq DESC
                  LIMIT 1), '') AS frontmatter,
       COALESCE((SELECT json_extract(u.body,'$.preamble')
                   FROM events u
                  WHERE json_extract(u.body,'$.project_id') =
                        json_extract(c.body,'$.project_id')
                    AND json_extract(u.body,'$.type') =
                        'plan.meta_set'
                    AND json_extract(u.body,'$.preamble')
                        IS NOT NULL
                  ORDER BY u.seq DESC
                  LIMIT 1), '') AS preamble,
       COALESCE((SELECT json_extract(u.body,'$.context_sections')
                   FROM events u
                  WHERE json_extract(u.body,'$.project_id') =
                        json_extract(c.body,'$.project_id')
                    AND json_extract(u.body,'$.type') =
                        'plan.meta_set'
                    AND json_extract(u.body,'$.context_sections')
                        IS NOT NULL
                  ORDER BY u.seq DESC
                  LIMIT 1), '[]') AS context_sections
  FROM events c
 WHERE json_extract(c.body,'$.type') = 'plan.meta_set'
 GROUP BY json_extract(c.body,'$.project_id')
"""

_SQL_V_TICKETS = """
CREATE VIEW IF NOT EXISTS v_tickets AS
SELECT json_extract(c.body,'$.ticket_id') AS ticket_id,
       json_extract(c.body,'$.project_id') AS project_id,
       (SELECT json_extract(u.body,'$.title')
          FROM events u
         WHERE json_extract(u.body,'$.ticket_id') =
               json_extract(c.body,'$.ticket_id')
           AND json_extract(u.body,'$.type') IN
               ('ticket.created','ticket.set')
           AND json_extract(u.body,'$.title') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS title,
       (SELECT json_extract(u.body,'$.description')
          FROM events u
         WHERE json_extract(u.body,'$.ticket_id') =
               json_extract(c.body,'$.ticket_id')
           AND json_extract(u.body,'$.type') IN
               ('ticket.created','ticket.set')
           AND json_extract(u.body,'$.description') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS description,
       (SELECT json_extract(u.body,'$.body')
          FROM events u
         WHERE json_extract(u.body,'$.ticket_id') =
               json_extract(c.body,'$.ticket_id')
           AND json_extract(u.body,'$.type') IN
               ('ticket.created','ticket.set')
           AND json_extract(u.body,'$.body') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS body,
       (SELECT json_extract(u.body,'$.criteria')
          FROM events u
         WHERE json_extract(u.body,'$.ticket_id') =
               json_extract(c.body,'$.ticket_id')
           AND json_extract(u.body,'$.type') IN
               ('ticket.created','ticket.set')
           AND json_extract(u.body,'$.criteria') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS criteria,
       (SELECT json_extract(u.body,'$.phase')
          FROM events u
         WHERE json_extract(u.body,'$.ticket_id') =
               json_extract(c.body,'$.ticket_id')
           AND json_extract(u.body,'$.type') IN
               ('ticket.created','ticket.set')
           AND json_extract(u.body,'$.phase') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS phase,
       (SELECT json_extract(u.body,'$.order')
          FROM events u
         WHERE json_extract(u.body,'$.ticket_id') =
               json_extract(c.body,'$.ticket_id')
           AND json_extract(u.body,'$.type') IN
               ('ticket.created','ticket.set')
           AND json_extract(u.body,'$.order') IS NOT NULL
         ORDER BY u.seq DESC
         LIMIT 1) AS "order",
       COALESCE((SELECT json_extract(u.body,'$.to_state')
                   FROM events u
                  WHERE json_extract(u.body,'$.ticket_id') =
                        json_extract(c.body,'$.ticket_id')
                    AND json_extract(u.body,'$.type') = 'ticket.moved'
                  ORDER BY u.seq DESC
                  LIMIT 1), 'open') AS state
  FROM events c
 WHERE json_extract(c.body,'$.type') = 'ticket.created'
"""

_SQL_V_EVIDENCE = """
CREATE VIEW IF NOT EXISTS v_evidence AS
SELECT json_extract(c.body,'$.ticket_id') AS ticket_id,
       json_extract(c.body,'$.kind_id') AS kind_id,
       json_extract(c.body,'$.payload') AS payload,
       json_extract(c.body,'$.actor') AS author,
       json_extract(c.body,'$.at') AS created_at,
       c.seq AS seq
  FROM events c
 WHERE json_extract(c.body,'$.type') = 'evidence.attached'
 ORDER BY c.seq
"""


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
    """Raised when an evidence kind is not registered.

    The kind is carried as an attribute, because a caller that did not name
    the kind itself still has to report which kind was missing.
    """

    def __init__(self, kind_id):
        self.kind_id = kind_id
        super().__init__("no such kind: %s" % kind_id)


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
        if t == "phase.set":
            return ("Phase %s of project %s set by %s at %s"
                    % (f.get("number"), f.get("project_id"),
                       f.get("actor"), at))
        if t == "plan.meta_set":
            return ("Plan meta of project %s set by %s at %s"
                    % (f.get("project_id"), f.get("actor"), at))
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
        # The views read the derived state without replaying the log in
        # Python. Each one mirrors one projection attribute.
        for sql in (_SQL_V_KINDS, _SQL_V_GATES, _SQL_V_PROJECTS,
                    _SQL_V_PHASES, _SQL_V_PLAN_META, _SQL_V_TICKETS,
                    _SQL_V_EVIDENCE):
            self.db.execute(sql)
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

    def _next_order(self, project_id, phase):
        """Return the next free position in one phase, counted from 1."""
        used = [
            ticket["order"] for ticket in self.tickets.values()
            if ticket["project_id"] == project_id and ticket["phase"] == phase
        ]
        return max(used) + 1 if used else 1

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
        elif t == "phase.set":
            key = (fields["project_id"], fields["number"])
            phase = self.phases.get(key)
            if phase is None:
                phase = {
                    "project_id": fields["project_id"],
                    "number": fields["number"],
                    "title": "",
                    "state": "open",
                }
                self.phases[key] = phase
            for name in ("title", "state"):
                if name in fields:
                    phase[name] = fields[name]
        elif t == "plan.meta_set":
            meta = self.plan_meta.get(fields["project_id"])
            if meta is None:
                meta = {
                    "frontmatter": "",
                    "preamble": "",
                    "context_sections": [],
                }
                self.plan_meta[fields["project_id"]] = meta
            for name in ("frontmatter", "preamble", "context_sections"):
                if name in fields:
                    meta[name] = fields[name]
        elif t == "ticket.created":
            tid = fields["ticket_id"]
            # A record written before the plan fields existed holds no phase,
            # body, criteria, or order. Each one falls back to its default so
            # that an old log still replays.
            phase = fields.get("phase", 1)
            self.tickets[tid] = {
                "id": tid,
                "project_id": fields["project_id"],
                "title": fields["title"],
                "description": fields["description"],
                "body": fields.get("body", ""),
                "criteria": fields.get("criteria", ""),
                "phase": phase,
                "order": fields.get(
                    "order", self._next_order(fields["project_id"], phase)),
                "state": "open",
            }
            if tid >= self._next_ticket_id:
                self._next_ticket_id = tid + 1
        elif t == "ticket.set":
            ticket = self.tickets[fields["ticket_id"]]
            for name in ("title", "description", "body", "criteria",
                         "phase", "order"):
                if name in fields:
                    ticket[name] = fields[name]
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

    # ---- phases ----

    def set_phase(self, project_id, number, *, title=None, state=None,
                  actor="system"):
        """Create or update one phase. One audit record is appended.

        A new phase starts with an empty title and the state "open". The phase
        state is a label for the plan document. No gate reads it.
        """
        if project_id not in self.projects:
            raise KeyError(project_id)
        fields = {
            "type": "phase.set",
            "project_id": project_id,
            "number": number,
            "actor": actor,
            "at": time.time(),
        }
        if title is not None:
            fields["title"] = title
        if state is not None:
            fields["state"] = state
        self._append(fields)
        self._apply_event(fields)

    def get_phase(self, project_id, number):
        return self.phases[(project_id, number)]

    # ---- plan meta ----

    def set_plan_meta(self, project_id, *, frontmatter=None, preamble=None,
                      context_sections=None, actor="system"):
        """Store the parts of a plan document that hold no ticket.

        One audit record is appended. A context section carries a heading, a
        text, and an index. The index counts the phases that come before the
        section, so an export can put the section back in its place.
        """
        if project_id not in self.projects:
            raise KeyError(project_id)
        fields = {
            "type": "plan.meta_set",
            "project_id": project_id,
            "actor": actor,
            "at": time.time(),
        }
        if frontmatter is not None:
            fields["frontmatter"] = frontmatter
        if preamble is not None:
            fields["preamble"] = preamble
        if context_sections is not None:
            fields["context_sections"] = [
                {
                    "heading": section["heading"],
                    "text": section["text"],
                    "index": section["index"],
                }
                for section in context_sections
            ]
        self._append(fields)
        self._apply_event(fields)

    def get_plan_meta(self, project_id):
        """Return the plan meta of one project.

        A project that never held a plan document gives an empty frontmatter,
        an empty preamble, and no context section.
        """
        meta = self.plan_meta.get(project_id)
        if meta is None:
            return {"frontmatter": "", "preamble": "", "context_sections": []}
        return {
            "frontmatter": meta["frontmatter"],
            "preamble": meta["preamble"],
            "context_sections": [dict(section)
                                 for section in meta["context_sections"]],
        }

    def phases_for(self, project_id):
        """Return every phase of one project, sorted by phase number."""
        return [
            phase for key, phase in sorted(self.phases.items())
            if key[0] == project_id
        ]

    # ---- tickets ----

    def create_ticket(self, project_id, title, description, *, actor="user",
                      body="", criteria="", phase=1, order=None):
        if project_id not in self.projects:
            raise KeyError(project_id)
        tid = self._next_ticket_id
        if order is None:
            order = self._next_order(project_id, phase)
        fields = {
            "type": "ticket.created",
            "ticket_id": tid,
            "project_id": project_id,
            "title": title,
            "description": description,
            "body": body,
            "criteria": criteria,
            "phase": phase,
            "order": order,
            "actor": actor,
            "at": time.time(),
        }
        self._append(fields)
        self._apply_event(fields)
        return tid

    def set_ticket(self, ticket_id, *, actor="user", title=None,
                   description=None, body=None, criteria=None, phase=None,
                   order=None):
        fields = {
            "type": "ticket.set",
            "ticket_id": ticket_id,
            "actor": actor,
            "at": time.time(),
        }
        for name, value in (("title", title), ("description", description),
                            ("body", body), ("criteria", criteria),
                            ("phase", phase), ("order", order)):
            if value is not None:
                fields[name] = value
        self._append(fields)
        self._apply_event(fields)

    def get_ticket(self, ticket_id):
        return self.tickets[ticket_id]

    # ---- evidence ----

    def attach_evidence(self, ticket_id, kind_id, payload, *, actor="user"):
        if kind_id not in self.kinds:
            raise UnknownKind(kind_id)
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
        self.phases = {}
        self.plan_meta = {}
        self.tickets = {}
        self.evidence = {}
        self._next_project_id = 1
        self._next_ticket_id = 1
        for event in self.events():
            self._apply_event(event.fields)
