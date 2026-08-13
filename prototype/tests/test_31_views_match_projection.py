"""Item 31. SQL views over the log match hand-written expected values.

Each assertion compares one view to a literal value derived by hand
from the fixture events and the view SQL. The projection still exists,
but no assertion reads it, because a later unit deletes it. The fixture
drives every event type a view reads. The refused move writes a log
record that must change no view.
"""

import json
import unittest

from aidos_proto.store import GateRefused, Store
from tests.helpers import make_store


class ViewsMatchProjectionTest(unittest.TestCase):
    def setUp(self):
        self.store = self._fixture_store()

    def _fixture_store(self):
        """Return a store whose log exercises every projection field."""
        store = make_store()
        store.register_kind("kind_a", "Kind A", "The first kind.", 1.0)
        store.register_kind("kind_b", "Kind B", "The second kind.", 2.0)
        store.set_kind_weight("kind_a", 3.0)
        store.set_gate("open", "review", ["kind_a"], ["user"])
        store.set_gate("open", "review", ["kind_a", "kind_b"],
                       ["user", "agent"])
        store.set_gate("review", "done", ["kind_a"], ["user"])
        alpha = store.create_project("/srv/a", "Alpha")
        store.move_project(alpha, "/srv/a2")
        beta = store.create_project("/srv/b", "Beta")
        store.set_phase(alpha, 1, title="Groundwork")
        store.set_phase(alpha, 1, state="done")
        store.set_phase(beta, 2, title="Build")
        store.set_plan_meta(alpha, frontmatter="# Front", preamble="Intro")
        store.set_plan_meta(
            alpha,
            context_sections=[{"heading": "H1", "text": "T1", "index": 0}])
        first = store.create_ticket(alpha, "Ticket one", "First desc.")
        store.create_ticket(alpha, "Ticket two", "Second desc.")
        store.create_ticket(beta, "Ticket three", "Third desc.",
                            body="A body.", criteria="A rule.", phase=1)
        store.set_ticket(first, title="Renamed one", body="New body.")
        store.set_ticket(first, criteria="A new rule.", phase=2)
        store.attach_evidence(first, "kind_a", {"note": "one"},
                              actor="user")
        store.attach_evidence(first, "kind_b", {"note": "two"},
                              actor="user")
        store.attach_evidence(first, "kind_a", {"note": "three"},
                              actor="agent")
        store.move_ticket(first, "review", actor="user")
        store.move_ticket(first, "done", actor="user")
        return store

    def test_31_every_view_matches_the_projection(self):
        # The refused move appends a record that must change no state.
        with self.assertRaises(GateRefused):
            self.store.move_ticket(2, "review", actor="user")

        rows = self.store.db.execute(
            "SELECT kind_id, label, description, weight FROM v_kinds"
            " ORDER BY kind_id").fetchall()
        self.assertEqual(rows, [
            ("builtin:after_shot", "After shot",
             "The state after the work.", 1.0),
            ("builtin:agent_report", "Agent report",
             "The agent describes the work.", 1.0),
            ("builtin:comment", "Comment", "A remark on the ticket.", 0.5),
            ("builtin:eval_criteria", "Evaluation criteria",
             "The criteria to judge the work.", 1.0),
            ("builtin:file_allowlist", "File allowlist",
             "The files the change may touch.", 1.0),
            ("builtin:review_pass", "Review pass",
             "A human review passed.", 1.0),
            ("builtin:user_signoff", "User signoff",
             "The human confirms the work.", 1.0),
            ("kind_a", "Kind A", "The first kind.", 3.0),
            ("kind_b", "Kind B", "The second kind.", 2.0),
        ])

        rows = self.store.db.execute(
            "SELECT from_state, to_state, required_kinds,"
            " allowed_actors FROM v_gates"
            " ORDER BY from_state, to_state").fetchall()
        self.assertEqual(
            [(from_state, to_state, json.loads(required),
              json.loads(allowed))
             for from_state, to_state, required, allowed in rows],
            [("open", "review", ["kind_a", "kind_b"], ["user", "agent"]),
             ("review", "done", ["kind_a"], ["user"])])

        rows = self.store.db.execute(
            "SELECT project_id, abs_path, name FROM v_projects"
            " ORDER BY project_id").fetchall()
        self.assertEqual(rows, [
            (1, "/srv/a2", "Alpha"),
            (2, "/srv/b", "Beta"),
        ])

        rows = self.store.db.execute(
            "SELECT project_id, number, title, state FROM v_phases"
            " ORDER BY project_id, number").fetchall()
        self.assertEqual(rows, [
            (1, 1, "Groundwork", "done"),
            (2, 2, "Build", "open"),
        ])

        rows = self.store.db.execute(
            "SELECT project_id, frontmatter, preamble, context_sections"
            " FROM v_plan_meta ORDER BY project_id").fetchall()
        self.assertEqual(
            [(project_id, frontmatter, preamble,
              json.loads(context_sections))
             for project_id, frontmatter, preamble, context_sections
             in rows],
            [(1, "# Front", "Intro",
              [{"heading": "H1", "text": "T1", "index": 0}])])

        rows = self.store.db.execute(
            'SELECT ticket_id, project_id, title, description, body,'
            ' criteria, phase, "order", state FROM v_tickets'
            ' ORDER BY ticket_id').fetchall()
        self.assertEqual(rows, [
            (1, 1, "Renamed one", "First desc.", "New body.",
             "A new rule.", 2, 1, "done"),
            (2, 1, "Ticket two", "Second desc.", "", "", 1, 2, "open"),
            (3, 2, "Ticket three", "Third desc.", "A body.",
             "A rule.", 1, 1, "open"),
        ])

        rows = self.store.db.execute(
            "SELECT ticket_id, kind_id, payload, author, created_at,"
            " seq FROM v_evidence ORDER BY seq").fetchall()
        self.assertEqual(
            [(ticket_id, kind_id, json.loads(payload), author, seq)
             for ticket_id, kind_id, payload, author, created_at, seq
             in rows],
            [(1, "kind_a", {"note": "one"}, "user", 27),
             (1, "kind_b", {"note": "two"}, "user", 28),
             (1, "kind_a", {"note": "three"}, "agent", 29)])
        # created_at comes from time.time(), so it cannot be a literal.
        # Two calls can share one clock tick, so the values must not fall,
        # not necessarily rise.
        created_at = [row[4] for row in rows]
        self.assertTrue(
            all(isinstance(at, float) for at in created_at),
            "created_at must be a wall-clock float")
        self.assertEqual(
            created_at, sorted(created_at),
            "created_at must not fall as seq rises")


class SeqOrderingTest(unittest.TestCase):
    def test_31_ordering_follows_seq_not_at(self):
        """A later seq wins, even when `at` says the opposite.

        The rows go into the table directly with SQL, not through
        _append, so the test can fix `at` without patching time.time.
        AUTOINCREMENT gives the second row the higher seq.

        The first row carries the later `at`, so the two orderings
        disagree. A view that sorted by `at` would return the weight
        1.0 of the first row. Equal `at` values would not prove this,
        because a tie lets SQLite pick either row and pass by luck.
        """
        store = Store(":memory:")
        store.db.execute(
            "INSERT INTO events (body) VALUES (?)",
            (json.dumps({
                "type": "kind.registered",
                "kind_id": "seqkind",
                "label": "L",
                "description": "D",
                "weight": 1.0,
                "actor": "system",
                "at": 999.0,
            }),))
        store.db.execute(
            "INSERT INTO events (body) VALUES (?)",
            (json.dumps({
                "type": "kind.weight_set",
                "kind_id": "seqkind",
                "weight": 9.0,
                "actor": "system",
                "at": 123.0,
            }),))
        store.db.commit()
        store.rebuild_projection()
        row = store.db.execute(
            "SELECT weight FROM v_kinds WHERE kind_id = 'seqkind'"
        ).fetchone()
        self.assertEqual(row[0], 9.0)


class LegacyTicketDefaultsTest(unittest.TestCase):
    """get_ticket fills defaults that v_tickets cannot express.

    A ticket record written before the plan fields existed carries no
    body, criteria, phase or order. The view returns NULL for each one
    and get_ticket supplies the default in Python. That fallback sits
    outside the view, so test_31 above does not reach it. These tests
    assert the fallback against explicit expected dicts.
    """

    def _legacy_store(self, modern_first):
        """Return a store holding one legacy ticket record.

        A legacy record omits body, criteria, phase and order. When
        modern_first is true, a normal ticket is created before it, so
        the order default has to step past an existing order.
        """
        store = make_store()
        project = store.create_project("/srv/a", "Alpha")
        if modern_first:
            store.create_ticket(project, "Modern", "A desc.", phase=1)
        store.db.execute(
            "INSERT INTO events (body) VALUES (?)",
            (json.dumps({
                "type": "ticket.created",
                "ticket_id": 2 if modern_first else 1,
                "project_id": project,
                "title": "Legacy",
                "description": "A desc.",
                "actor": "user",
                "at": 1.0,
            }),))
        store.db.commit()
        store.rebuild_projection()
        return store

    def test_31_legacy_defaults_fill_the_missing_fields(self):
        store = self._legacy_store(modern_first=False)
        self.assertEqual(store.get_ticket(1), {
            "id": 1,
            "project_id": 1,
            "title": "Legacy",
            "description": "A desc.",
            "body": "",
            "criteria": "",
            "phase": 1,
            "order": 1,
            "state": "open",
        })

    def test_31_legacy_defaults_step_past_an_existing_order(self):
        store = self._legacy_store(modern_first=True)
        self.assertEqual(store.get_ticket(1), {
            "id": 1,
            "project_id": 1,
            "title": "Modern",
            "description": "A desc.",
            "body": "",
            "criteria": "",
            "phase": 1,
            "order": 1,
            "state": "open",
        })
        self.assertEqual(store.get_ticket(2), {
            "id": 2,
            "project_id": 1,
            "title": "Legacy",
            "description": "A desc.",
            "body": "",
            "criteria": "",
            "phase": 1,
            "order": 2,
            "state": "open",
        })


if __name__ == "__main__":
    unittest.main()
