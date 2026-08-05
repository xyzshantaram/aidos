"""Item 9. Send-back keeps the evidence attached earlier."""

import unittest

from tests.helpers import make_store


class SendBackTest(unittest.TestCase):
    def test_09_evidence_survives_send_back(self):
        store = make_store()
        store.set_gate("open", "in_progress", ["builtin:user_signoff"], ["user"])
        store.set_gate(
            "in_progress",
            "awaiting_verification",
            ["builtin:agent_report"],
            ["user", "agent"],
        )
        store.set_gate(
            "awaiting_verification", "in_progress", ["builtin:comment"], ["user"]
        )

        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        store.attach_evidence(ticket, "builtin:user_signoff", {"ok": True}, actor="user")
        store.move_ticket(ticket, "in_progress", actor="user")
        store.attach_evidence(ticket, "builtin:agent_report", {"lines": 5}, actor="agent")
        store.move_ticket(ticket, "awaiting_verification", actor="agent")

        store.attach_evidence(ticket, "builtin:comment", {"text": "fix this"}, actor="user")
        store.move_ticket(ticket, "in_progress", actor="user")

        kinds = {row["kind_id"] for row in store.evidence_for(ticket)}
        self.assertEqual(
            kinds,
            {"builtin:user_signoff", "builtin:agent_report", "builtin:comment"},
        )
        self.assertEqual(store.get_ticket(ticket)["state"], "in_progress")


if __name__ == "__main__":
    unittest.main()
