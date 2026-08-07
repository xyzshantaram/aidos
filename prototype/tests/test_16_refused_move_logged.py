"""Item 16. A refused move is logged as an audit record."""

import unittest

from aidos_proto.store import GateRefused
from tests.helpers import make_store


class RefusedMoveLogTest(unittest.TestCase):
    def setUp(self):
        self.store = make_store()
        self.store.set_gate(
            "open", "in_progress", ["builtin:user_signoff"], ["user"]
        )
        self.store.set_gate(
            "in_progress",
            "awaiting_verification",
            ["builtin:agent_report"],
            ["user", "agent"],
        )
        self.project = self.store.create_project("/srv/proj/r", "r")
        self.ticket = self.store.create_ticket(
            self.project, "T", "d", actor="user"
        )

    def test_16_refused_move_appends_exactly_one_record(self):
        before = len(self.store.events())
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "in_progress", actor="user")
        self.assertEqual(len(self.store.events()), before + 1)
        self.assertEqual(self.store.get_ticket(self.ticket)["state"], "open")

    def test_16_refusal_record_names_actor_target_and_ticket(self):
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "in_progress", actor="agent")
        text = str(self.store.events()[-1])
        self.assertIn("agent", text)
        self.assertIn("in_progress", text)
        self.assertIn(str(self.ticket), text)

    def test_16_refusal_record_names_the_missing_kind(self):
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "in_progress", actor="user")
        text = str(self.store.events()[-1])
        self.assertIn("builtin:user_signoff", text)

    def test_16_projection_ignores_refusal_records(self):
        self.store.attach_evidence(
            self.ticket, "builtin:user_signoff", {"ok": True}, actor="user"
        )
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "in_progress", actor="agent")
        self.store.move_ticket(self.ticket, "in_progress", actor="user")
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "done", actor="agent")
        self.store.attach_evidence(
            self.ticket, "builtin:agent_report", {"lines": 4}, actor="agent"
        )
        self.store.move_ticket(self.ticket, "awaiting_verification", actor="agent")
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "done", actor="user")
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "in_progress", actor="user")

        ticket_before = self.store.get_ticket(self.ticket)
        rows_before = self.store.evidence_for(self.ticket)
        score_before = self.store.confidence_score(self.ticket)
        log_before = self.store.events()

        self.store.rebuild_projection()

        self.assertEqual(self.store.get_ticket(self.ticket), ticket_before)
        self.assertEqual(self.store.evidence_for(self.ticket), rows_before)
        self.assertEqual(self.store.confidence_score(self.ticket), score_before)
        self.assertEqual(self.store.events(), log_before)


if __name__ == "__main__":
    unittest.main()
