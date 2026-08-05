"""Item 10. A high score does not bypass a gate."""

import unittest

from helm_proto.store import GateRefused
from tests.helpers import make_store


class ScoreAdvisoryTest(unittest.TestCase):
    def test_10_high_score_does_not_open_the_gate(self):
        store = make_store([
            ("builtin:user_signoff", "User signoff", "The human signs off.", 1.0),
            ("builtin:agent_report", "Agent report", "The agent reports.", 1.0),
            ("builtin:review_pass", "Review pass", "A human review passed.", 1.0),
            ("plugin:audit:a", "Audit a", "Advisory evidence.", 50.0),
            ("plugin:audit:b", "Audit b", "More advisory evidence.", 50.0),
        ])
        store.set_gate("open", "in_progress", ["builtin:user_signoff"], ["user"])
        store.set_gate(
            "in_progress",
            "awaiting_verification",
            ["builtin:agent_report"],
            ["user"],
        )
        store.set_gate(
            "awaiting_verification", "done", ["builtin:review_pass"], ["user"]
        )

        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        store.attach_evidence(ticket, "builtin:user_signoff", {"ok": True}, actor="user")
        store.move_ticket(ticket, "in_progress", actor="user")
        store.attach_evidence(ticket, "builtin:agent_report", {"ok": True}, actor="agent")
        store.move_ticket(ticket, "awaiting_verification", actor="user")

        store.attach_evidence(ticket, "plugin:audit:a", {"x": 1}, actor="user")
        store.attach_evidence(ticket, "plugin:audit:b", {"y": 1}, actor="agent")
        store.attach_evidence(ticket, "plugin:audit:a", {"x": 2}, actor="agent")

        self.assertGreaterEqual(store.confidence_score(ticket), 100.0)

        with self.assertRaises(GateRefused) as cm:
            store.move_ticket(ticket, "done", actor="user")
        self.assertCountEqual(cm.exception.missing_kinds, ["builtin:review_pass"])

        store.attach_evidence(ticket, "builtin:review_pass", {"ok": True}, actor="user")
        store.move_ticket(ticket, "done", actor="user")
        self.assertEqual(store.get_ticket(ticket)["state"], "done")


if __name__ == "__main__":
    unittest.main()
