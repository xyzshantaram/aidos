"""Item 18. The registry survives a close and a reopen."""

import os
import tempfile
import unittest

from aidos_proto.store import GateRefused, Store


class RegistrySurvivesReopenTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "store.sqlite")

    def tearDown(self):
        self.tmp.cleanup()

    def test_18_registry_survives_a_reopen(self):
        store = Store(self.db_path)
        store.register_kind(
            "builtin:user_signoff", "User signoff", "The human signs off.", 1.0
        )
        store.register_kind(
            "builtin:agent_report", "Agent report", "The agent reports.", 1.0
        )
        store.set_kind_weight("builtin:agent_report", 2.5)
        store.set_gate("open", "in_progress", ["builtin:user_signoff"], ["user"])
        store.set_gate(
            "in_progress",
            "awaiting_verification",
            ["builtin:agent_report"],
            ["user", "agent"],
        )
        project = store.create_project("/srv/proj/x", "x")
        ticket = store.create_ticket(project, "T", "d", actor="user")
        store.attach_evidence(
            ticket, "builtin:user_signoff", {"ok": True}, actor="user"
        )
        store.move_ticket(ticket, "in_progress", actor="user")
        store.close()

        store = Store(self.db_path)

        # A kind registered before the close is still registered.
        store.attach_evidence(
            ticket, "builtin:user_signoff", {"again": True}, actor="user"
        )

        # The gate set before the close is still enforced.
        with self.assertRaises(GateRefused) as cm:
            store.move_ticket(ticket, "awaiting_verification", actor="agent")
        self.assertCountEqual(cm.exception.missing_kinds, ["builtin:agent_report"])
        store.attach_evidence(
            ticket, "builtin:agent_report", {"lines": 2}, actor="agent"
        )
        store.move_ticket(ticket, "awaiting_verification", actor="agent")
        self.assertEqual(
            store.get_ticket(ticket)["state"], "awaiting_verification"
        )

        # The weight set before the close still applies.
        self.assertEqual(store.confidence_score(ticket), 3.5)

        # Deny by default still holds.
        with self.assertRaises(GateRefused):
            store.move_ticket(ticket, "done", actor="user")
        self.assertEqual(
            store.get_ticket(ticket)["state"], "awaiting_verification"
        )


if __name__ == "__main__":
    unittest.main()
