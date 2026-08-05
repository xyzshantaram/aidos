"""Item 12. Loosening a gate is a data change, not a schema change."""

import unittest

from helm_proto.store import GateRefused
from tests.helpers import make_store


class LoosenGateTest(unittest.TestCase):
    def test_12_removed_kind_no_longer_blocks(self):
        store = make_store([
            ("builtin:user_signoff", "User signoff", "The human signs off.", 1.0),
            ("plugin:check:x", "Check x", "Extra check.", 1.0),
            ("plugin:check:y", "Check y", "Extra check.", 1.0),
        ])
        store.set_gate("open", "in_progress", ["builtin:user_signoff"], ["user"])
        store.set_gate(
            "in_progress",
            "awaiting_verification",
            ["plugin:check:x", "plugin:check:y"],
            ["user"],
        )

        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")
        store.attach_evidence(ticket, "builtin:user_signoff", {"ok": True}, actor="user")
        store.move_ticket(ticket, "in_progress", actor="user")
        store.attach_evidence(ticket, "plugin:check:x", {"ok": True}, actor="user")

        with self.assertRaises(GateRefused) as cm:
            store.move_ticket(ticket, "awaiting_verification", actor="user")
        self.assertCountEqual(cm.exception.missing_kinds, ["plugin:check:y"])

        ticket_before = store.get_ticket(ticket)
        rows_before = store.evidence_for(ticket)
        log_before = store.events()

        store.set_gate(
            "in_progress",
            "awaiting_verification",
            ["plugin:check:x"],
            ["user"],
        )

        self.assertEqual(store.get_ticket(ticket), ticket_before)
        self.assertEqual(store.evidence_for(ticket), rows_before)
        self.assertEqual(store.events()[: len(log_before)], log_before)

        store.move_ticket(ticket, "awaiting_verification", actor="user")
        self.assertEqual(store.get_ticket(ticket)["state"], "awaiting_verification")


if __name__ == "__main__":
    unittest.main()
