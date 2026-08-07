"""Item 17. File-backed state survives a close and a reopen."""

import os
import tempfile
import unittest

from aidos_proto.store import Store


class StateSurvivesReopenTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "store.sqlite")

    def tearDown(self):
        self.tmp.cleanup()

    def build(self):
        """Fill a fresh store and return it plus the created ids."""
        store = Store(self.db_path)
        store.register_kind(
            "builtin:user_signoff", "User signoff", "The human signs off.", 1.0
        )
        store.register_kind(
            "builtin:agent_report", "Agent report", "The agent reports.", 1.0
        )
        store.set_gate("open", "in_progress", ["builtin:user_signoff"], ["user"])
        store.set_gate(
            "in_progress",
            "awaiting_verification",
            ["builtin:agent_report"],
            ["user", "agent"],
        )
        project = store.create_project("/srv/proj/x", "x")
        ticket_a = store.create_ticket(project, "A", "Body A.", actor="user")
        ticket_b = store.create_ticket(project, "B", "Body B.", actor="agent")
        store.attach_evidence(
            ticket_a, "builtin:user_signoff", {"ok": True}, actor="user"
        )
        store.move_ticket(ticket_a, "in_progress", actor="user")
        store.attach_evidence(
            ticket_a, "builtin:agent_report", {"lines": 3}, actor="agent"
        )
        store.move_ticket(ticket_a, "awaiting_verification", actor="agent")
        store.attach_evidence(
            ticket_b, "builtin:user_signoff", {"ok": True}, actor="user"
        )
        return store, project, ticket_a, ticket_b

    def snapshot(self, store, project, ticket_a, ticket_b):
        """Return every observable part of the store as plain data."""
        return {
            "projects": {project: store.get_project(project)},
            "tickets": {
                ticket_a: store.get_ticket(ticket_a),
                ticket_b: store.get_ticket(ticket_b),
            },
            "evidence": {
                ticket_a: store.evidence_for(ticket_a),
                ticket_b: store.evidence_for(ticket_b),
            },
            "scores": {
                ticket_a: store.confidence_score(ticket_a),
                ticket_b: store.confidence_score(ticket_b),
            },
            "events": store.events(),
        }

    def assert_state_identical(self, first, second):
        """Assert two snapshots are equal in every observable part."""
        self.assertEqual(first["projects"], second["projects"])
        self.assertEqual(first["tickets"], second["tickets"])
        self.assertEqual(first["evidence"], second["evidence"])
        self.assertEqual(first["scores"], second["scores"])
        self.assertEqual(first["events"], second["events"])

    def test_17_state_survives_a_reopen(self):
        store, project, ticket_a, ticket_b = self.build()
        before = self.snapshot(store, project, ticket_a, ticket_b)

        store.close()
        store = Store(self.db_path)

        after = self.snapshot(store, project, ticket_a, ticket_b)
        self.assert_state_identical(before, after)

    def test_17_reopening_is_repeatable(self):
        store, project, ticket_a, ticket_b = self.build()
        before = self.snapshot(store, project, ticket_a, ticket_b)

        store.close()
        store = Store(self.db_path)
        store.close()
        store = Store(self.db_path)

        after = self.snapshot(store, project, ticket_a, ticket_b)
        self.assert_state_identical(before, after)


if __name__ == "__main__":
    unittest.main()
