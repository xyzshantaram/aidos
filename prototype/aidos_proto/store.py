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


# ---- tickets page ----
# STATE_ORDER defines the forward transitions of a ticket. Each state
# hands on to the next one. The last state has no successor, so a
# ticket in it has no forward gate and no fraction.

STATE_ORDER = ("open", "in_progress", "awaiting_verification", "done")


def _next_state_sql(indent):
    """Return a SQL CASE that maps a ticket state to its successor.

    The arms come from STATE_ORDER, so the order is written once and
    the SQL cannot drift from it. The last state matches no arm, so
    the CASE yields NULL and the caller reads that as no forward gate.
    """
    pad = " " * indent
    arms = "\n".join(
        "%sWHEN '%s' THEN '%s'" % (pad, state, following)
        for state, following in zip(STATE_ORDER, STATE_ORDER[1:]))
    return "CASE t.state\n%s\n%sEND" % (arms, pad)

_SQL_SCORE = """
COALESCE((SELECT SUM(k.weight)
            FROM (SELECT DISTINCT ev.kind_id, ev.author
                    FROM v_evidence ev
                   WHERE ev.ticket_id = t.ticket_id) AS de
            JOIN v_kinds k ON k.kind_id = de.kind_id), 0.0)
"""

_SQL_GATE_FRACTION = """
CASE
  WHEN NOT EXISTS (SELECT 1 FROM v_gates g
                    WHERE g.from_state = t.state
                      AND g.to_state = __NEXT_STATE__) THEN NULL
  ELSE (SELECT CASE
                  WHEN COALESCE(json_array_length(g.required_kinds), 0) = 0
                    THEN 1.0
                  ELSE CAST((SELECT COUNT(*)
                               FROM json_each(g.required_kinds) req
                              WHERE EXISTS (SELECT 1
                                              FROM v_evidence ev
                                             WHERE ev.ticket_id =
                                                   t.ticket_id
                                               AND ev.kind_id =
                                                   req.value))
                        AS REAL)
                       / COALESCE(json_array_length(g.required_kinds), 0)
               END
          FROM v_gates g
         WHERE g.from_state = t.state
           AND g.to_state = __NEXT_STATE__)
END
""".replace("__NEXT_STATE__", _next_state_sql(22))

# A legacy ticket has a NULL phase and order in v_tickets. The caller
# sees the filled defaults instead, so each sort key below sorts on the
# same values the caller sees: a NULL phase counts as phase 1 and a
# NULL order sorts after every real order in its phase group.
_SORT_COLUMNS = {
    "id": ("ticket_id",),
    "title": ("title",),
    "phase": ("COALESCE(phase, 1)",
              'CASE WHEN "order" IS NULL THEN 1 ELSE 0 END', '"order"'),
    "score": ("score",),
    "gate_fraction": ("gate_fraction",),
}

# The columns Store._ticket_dict takes, in the order it takes them. Three
# reads select them, so the order lives here once.
_TICKET_COLUMNS = ("ticket_id", "project_id", "title", "description",
                   "body", "criteria", "phase", '"order"', "state")


def _ticket_columns(prefix=""):
    """Return the ticket column list, with an optional table prefix."""
    return ", ".join(prefix + name for name in _TICKET_COLUMNS)


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
    """An append-only ticket store. Every read comes from SQL views."""

    def __init__(self, path):
        self.path = path
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
        row = self.db.execute(
            'SELECT COALESCE(MAX("order"), 0) + 1 FROM v_tickets'
            ' WHERE project_id = ? AND phase = ?',
            (project_id, phase)).fetchone()
        return row[0]

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

    def set_kind_weight(self, kind_id, weight):
        """Change the weight of a kind. One audit record is appended."""
        row = self.db.execute(
            "SELECT 1 FROM v_kinds WHERE kind_id = ?",
            (kind_id,)).fetchone()
        if row is None:
            raise UnknownKind(kind_id)
        fields = {
            "type": "kind.weight_set",
            "kind_id": kind_id,
            "weight": weight,
            "actor": "system",
            "at": time.time(),
        }
        self._append(fields)

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

    def kinds(self):
        """Return the kind registry as a map from kind id to its tuple."""
        rows = self.db.execute(
            "SELECT kind_id, label, description, weight FROM v_kinds"
        ).fetchall()
        return {kind_id: (label, description, weight)
                for kind_id, label, description, weight in rows}

    def gates(self):
        """Return the gate registry as a map from state pair to its tuple."""
        rows = self.db.execute(
            "SELECT from_state, to_state, required_kinds, allowed_actors"
            " FROM v_gates").fetchall()
        return {
            (from_state, to_state): (
                json.loads(required_kinds), json.loads(allowed_actors))
            for from_state, to_state, required_kinds, allowed_actors in rows
        }

    # ---- projects ----

    def create_project(self, abs_path, name):
        row = self.db.execute(
            "SELECT COALESCE(MAX(project_id), 0) + 1 FROM v_projects"
        ).fetchone()
        pid = row[0]
        fields = {
            "type": "project.created",
            "project_id": pid,
            "abs_path": abs_path,
            "name": name,
            "actor": "system",
            "at": time.time(),
        }
        self._append(fields)
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

    def get_project(self, project_id):
        row = self.db.execute(
            "SELECT abs_path, name FROM v_projects"
            " WHERE project_id = ?", (project_id,)).fetchone()
        if row is None:
            raise KeyError(project_id)
        abs_path, name = row
        return {"id": project_id, "abs_path": abs_path, "name": name}

    def projects(self):
        """Return every project as a map from project id to its dict."""
        rows = self.db.execute(
            "SELECT project_id, abs_path, name FROM v_projects"
            " ORDER BY project_id").fetchall()
        return {
            project_id: {"id": project_id, "abs_path": abs_path,
                         "name": name}
            for project_id, abs_path, name in rows
        }

    def find_project(self, abs_path):
        """Return the id of the project at one path, or None."""
        row = self.db.execute(
            "SELECT project_id FROM v_projects WHERE abs_path = ?"
            " ORDER BY project_id LIMIT 1", (abs_path,)).fetchone()
        if row is None:
            return None
        return row[0]

    # ---- phases ----

    def set_phase(self, project_id, number, *, title=None, state=None,
                  actor="system"):
        """Create or update one phase. One audit record is appended.

        A new phase starts with an empty title and the state "open". The phase
        state is a label for the plan document. No gate reads it.
        """
        row = self.db.execute(
            "SELECT 1 FROM v_projects WHERE project_id = ?",
            (project_id,)).fetchone()
        if row is None:
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

    def get_phase(self, project_id, number):
        row = self.db.execute(
            "SELECT title, state FROM v_phases"
            " WHERE project_id = ? AND number = ?",
            (project_id, number)).fetchone()
        if row is None:
            raise KeyError((project_id, number))
        title, state = row
        return {"project_id": project_id, "number": number,
                "title": title, "state": state}

    # ---- plan meta ----

    def set_plan_meta(self, project_id, *, frontmatter=None, preamble=None,
                      context_sections=None, actor="system"):
        """Store the parts of a plan document that hold no ticket.

        One audit record is appended. A context section carries a heading, a
        text, and an index. The index counts the phases that come before the
        section, so an export can put the section back in its place.
        """
        row = self.db.execute(
            "SELECT 1 FROM v_projects WHERE project_id = ?",
            (project_id,)).fetchone()
        if row is None:
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

    def get_plan_meta(self, project_id):
        """Return the plan meta of one project.

        A project that never held a plan document gives an empty frontmatter,
        an empty preamble, and no context section.
        """
        row = self.db.execute(
            "SELECT frontmatter, preamble, context_sections"
            " FROM v_plan_meta WHERE project_id = ?",
            (project_id,)).fetchone()
        if row is None:
            return {"frontmatter": "", "preamble": "", "context_sections": []}
        frontmatter, preamble, context_sections = row
        return {
            "frontmatter": frontmatter,
            "preamble": preamble,
            "context_sections": [dict(section)
                                 for section in json.loads(context_sections)],
        }

    def phases_for(self, project_id):
        """Return every phase of one project, sorted by phase number."""
        rows = self.db.execute(
            "SELECT number, title, state FROM v_phases"
            " WHERE project_id = ? ORDER BY number",
            (project_id,)).fetchall()
        return [
            {"project_id": project_id, "number": number,
             "title": title, "state": state}
            for number, title, state in rows
        ]

    # ---- tickets ----

    def create_ticket(self, project_id, title, description, *, actor="user",
                      body="", criteria="", phase=1, order=None):
        row = self.db.execute(
            "SELECT 1 FROM v_projects WHERE project_id = ?",
            (project_id,)).fetchone()
        if row is None:
            raise KeyError(project_id)
        row = self.db.execute(
            "SELECT COALESCE(MAX(ticket_id), 0) + 1 FROM v_tickets"
        ).fetchone()
        tid = row[0]
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

    def _fill_ticket_defaults(self, project_id, body, criteria, phase,
                              order):
        """Return the plan fields with the defaults replay used.

        A ticket record written before the plan fields existed carries
        no body, criteria, phase or order, so v_tickets gives NULL for
        each one. Both the single read and the paged read need the
        same defaults, so they live here only.
        """
        if body is None:
            body = ""
        if criteria is None:
            criteria = ""
        if phase is None:
            phase = 1
        if order is None:
            order = self._next_order(project_id, phase)
        return body, criteria, phase, order

    def _ticket_dict(self, ticket_id, project_id, title, description,
                     body, criteria, phase, order, state):
        """Return one ticket dict with the replay defaults applied.

        get_ticket, tickets_for and tickets_page read the same nine
        columns from v_tickets, so they all build the dict here. The
        order of the keys matches the column order of the SELECT.
        """
        body, criteria, phase, order = self._fill_ticket_defaults(
            project_id, body, criteria, phase, order)
        return {
            "id": ticket_id,
            "project_id": project_id,
            "title": title,
            "description": description,
            "body": body,
            "criteria": criteria,
            "phase": phase,
            "order": order,
            "state": state,
        }

    def get_ticket(self, ticket_id):
        row = self.db.execute(
            'SELECT ' + _ticket_columns() + ' FROM v_tickets'
            ' WHERE ticket_id = ?',
            (ticket_id,)).fetchone()
        if row is None:
            raise KeyError(ticket_id)
        return self._ticket_dict(*row)

    def tickets_for(self, project_id):
        """Return every ticket of one project, sorted by phase and order."""
        rows = self.db.execute(
            'SELECT ' + _ticket_columns() + ' FROM v_tickets'
            ' WHERE project_id = ?'
            ' ORDER BY COALESCE(phase, 1),'
            ' CASE WHEN "order" IS NULL THEN 1 ELSE 0 END,'
            ' "order", ticket_id',
            (project_id,)).fetchall()
        return [self._ticket_dict(*row) for row in rows]

    def tickets_page(self, *, project_id=None, sort="id",
                     descending=False, limit=20, offset=0):
        """Return one page of ticket rows plus the total count.

        The rows carry every field of get_ticket plus a score and a
        gate_fraction. The total counts matching tickets before limit
        and offset apply.
        """
        columns = _SORT_COLUMNS.get(sort)
        if columns is None:
            raise ValueError("unknown sort key: %r" % (sort,))
        params = []
        where = ""
        if project_id is not None:
            where = " WHERE t.project_id = ?"
            params.append(project_id)
        direction = " DESC" if descending else ""
        order_by = ", ".join("%s%s" % (col, direction)
                             for col in columns)
        sql = (
            'SELECT ' + _ticket_columns("t.") + ','
            ' ' + _SQL_SCORE + ' AS score,'
            ' ' + _SQL_GATE_FRACTION + ' AS gate_fraction'
            ' FROM v_tickets t' + where + ' ORDER BY ' + order_by
            + ', ticket_id LIMIT ? OFFSET ?'
        )
        rows = self.db.execute(sql, params + [limit, offset]).fetchall()
        total = self.db.execute(
            "SELECT COUNT(*) FROM v_tickets t" + where,
            params).fetchone()[0]
        page = []
        for (ticket_id, owner_id, title, description, body, criteria,
             phase, order, state, score, gate_fraction) in rows:
            ticket = self._ticket_dict(
                ticket_id, owner_id, title, description, body, criteria,
                phase, order, state)
            ticket["score"] = score
            ticket["gate_fraction"] = gate_fraction
            page.append(ticket)
        return page, total

    # ---- evidence ----

    def attach_evidence(self, ticket_id, kind_id, payload, *, actor="user"):
        row = self.db.execute(
            "SELECT 1 FROM v_kinds WHERE kind_id = ?",
            (kind_id,)).fetchone()
        if row is None:
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

    def evidence_for(self, ticket_id):
        rows = self.db.execute(
            "SELECT kind_id, payload, author, created_at FROM v_evidence"
            " WHERE ticket_id = ?", (ticket_id,)).fetchall()
        return [
            {"kind_id": kind_id,
             "payload": json.loads(payload),
             "author": author,
             "created_at": created_at}
            for kind_id, payload, author, created_at in rows
        ]

    def confidence_score(self, ticket_id):
        """Sum one weight per kind per distinct author. Advisory only."""
        weights = dict(self.db.execute(
            "SELECT kind_id, weight FROM v_kinds").fetchall())
        total = 0.0
        counted = set()
        rows = self.db.execute(
            "SELECT kind_id, author FROM v_evidence"
            " WHERE ticket_id = ?", (ticket_id,)).fetchall()
        for kind_id, author in rows:
            key = (kind_id, author)
            if key in counted:
                continue
            counted.add(key)
            total += weights[kind_id]
        return total

    # ---- transitions ----

    def move_ticket(self, ticket_id, to_state, *, actor="user"):
        ticket = self.get_ticket(ticket_id)
        from_state = ticket["state"]
        row = self.db.execute(
            "SELECT required_kinds, allowed_actors FROM v_gates"
            " WHERE from_state = ? AND to_state = ?",
            (from_state, to_state)).fetchone()
        if row is None:
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
        required_kinds = json.loads(row[0])
        allowed_actors = json.loads(row[1])
        kinds = self.db.execute(
            "SELECT DISTINCT kind_id FROM v_evidence"
            " WHERE ticket_id = ?", (ticket_id,)).fetchall()
        attached = {kind_id for (kind_id,) in kinds}
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

    @staticmethod
    def _refusal_reason(missing, allowed_actors):
        parts = []
        if missing:
            parts.append("missing evidence kinds: " + ", ".join(missing))
        if allowed_actors:
            parts.append("allowed actors: " + ", ".join(allowed_actors))
        return " ".join(parts)

    # ---- log ----

    def events(self):
        """Return the whole log as Event objects, oldest first."""
        rows = self.db.execute("SELECT body FROM events ORDER BY seq").fetchall()
        return [Event(json.loads(body)) for (body,) in rows]
