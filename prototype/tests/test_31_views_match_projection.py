"""Item 31. SQL views over the log match the in-memory projection.

The in-memory projection is the oracle. Each view must return exactly
what the projection holds, so one can replace the other without renaming
any field. The fixture drives every event type a view reads. The
refused move writes a log record that must change no view.
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
        self.assertEqual(
            rows,
            [(kind_id, label, description, weight)
             for kind_id, (label, description, weight)
             in sorted(self.store.kinds.items())])

        rows = self.store.db.execute(
            "SELECT from_state, to_state, required_kinds,"
            " allowed_actors FROM v_gates"
            " ORDER BY from_state, to_state").fetchall()
        self.assertEqual(
            [(from_state, to_state, json.loads(required),
              json.loads(allowed))
             for from_state, to_state, required, allowed in rows],
            [(from_state, to_state, required, allowed)
             for (from_state, to_state), (required, allowed)
             in sorted(self.store.gates.items())])

        rows = self.store.db.execute(
            "SELECT project_id, abs_path, name FROM v_projects"
            " ORDER BY project_id").fetchall()
        self.assertEqual(
            rows,
            [(project_id, project["abs_path"], project["name"])
             for project_id, project
             in sorted(self.store.projects.items())])

        rows = self.store.db.execute(
            "SELECT project_id, number, title, state FROM v_phases"
            " ORDER BY project_id, number").fetchall()
        self.assertEqual(
            rows,
            [(project_id, number, phase["title"], phase["state"])
             for (project_id, number), phase
             in sorted(self.store.phases.items())])

        rows = self.store.db.execute(
            "SELECT project_id, frontmatter, preamble, context_sections"
            " FROM v_plan_meta ORDER BY project_id").fetchall()
        self.assertEqual(
            [(project_id, frontmatter, preamble,
              json.loads(context_sections))
             for project_id, frontmatter, preamble, context_sections
             in rows],
            [(project_id, meta["frontmatter"], meta["preamble"],
              meta["context_sections"])
             for project_id, meta
             in sorted(self.store.plan_meta.items())])

        rows = self.store.db.execute(
            'SELECT ticket_id, project_id, title, description, body,'
            ' criteria, phase, "order", state FROM v_tickets'
            ' ORDER BY ticket_id').fetchall()
        self.assertEqual(
            rows,
            [(ticket["id"], ticket["project_id"], ticket["title"],
              ticket["description"], ticket["body"], ticket["criteria"],
              ticket["phase"], ticket["order"], ticket["state"])
             for ticket_id, ticket
             in sorted(self.store.tickets.items())])

        rows = self.store.db.execute(
            "SELECT ticket_id, kind_id, payload, author, created_at,"
            " seq FROM v_evidence ORDER BY seq").fetchall()
        by_ticket = {}
        for row in rows:
            by_ticket.setdefault(row[0], []).append(row)
        self.assertEqual(set(by_ticket), set(self.store.evidence))
        for ticket_id, view_rows in by_ticket.items():
            self.assertEqual(
                [(json.loads(row[2]), row[3], row[4])
                 for row in view_rows],
                [(evidence["payload"], evidence["author"],
                  evidence["created_at"])
                 for evidence in self.store.evidence[ticket_id]])


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
        self.assertEqual(store.kinds["seqkind"][2], 9.0)


class LegacyTicketDefaultsTest(unittest.TestCase):
    """get_ticket fills defaults that v_tickets cannot express.

    A ticket record written before the plan fields existed carries no
    body, criteria, phase or order. The view returns NULL for each one
    and get_ticket supplies the default in Python. That fallback sits
    outside the view, so test_31 above does not reach it. These tests
    hold it against the projection while the projection still exists.
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

    def _assert_matches_projection(self, store, ticket_id):
        self.assertEqual(
            store.get_ticket(ticket_id), store.tickets[ticket_id])

    def test_31_legacy_ticket_defaults_match_the_projection(self):
        store = self._legacy_store(modern_first=False)
        self._assert_matches_projection(store, 1)

    def test_31_legacy_defaults_step_past_an_existing_order(self):
        store = self._legacy_store(modern_first=True)
        self._assert_matches_projection(store, 1)
        self._assert_matches_projection(store, 2)
        self.assertEqual(store.get_ticket(2)["order"], 2)


if __name__ == "__main__":
    unittest.main()
