"""Item 15. Deny by default. A move needs a configured gate for its exact pair."""

import unittest

from helm_proto.store import GateRefused
from tests.helpers import DEFAULT_KINDS, make_store


class DenyByDefaultTest(unittest.TestCase):
    def setUp(self):
        self.store = make_store()
        self.project = self.store.create_project("/srv/proj/d", "d")
        self.ticket = self.store.create_ticket(
            self.project, "T", "d", actor="user"
        )

    def test_15_unconfigured_transition_refused_for_agent(self):
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "done", actor="agent")
        self.assertEqual(self.store.get_ticket(self.ticket)["state"], "open")

    def test_15_unconfigured_transition_refused_for_user(self):
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "done", actor="user")
        self.assertEqual(self.store.get_ticket(self.ticket)["state"], "open")

    def test_15_other_unconfigured_pairs_are_refused(self):
        for actor in ("user", "agent"):
            with self.assertRaises(GateRefused):
                self.store.move_ticket(
                    self.ticket, "awaiting_verification", actor=actor
                )

        self.store.set_gate(
            "open", "in_progress", ["builtin:user_signoff"], ["user"]
        )
        self.store.attach_evidence(
            self.ticket, "builtin:user_signoff", {"ok": True}, actor="user"
        )
        self.store.move_ticket(self.ticket, "in_progress", actor="user")

        for actor in ("user", "agent"):
            with self.assertRaises(GateRefused):
                self.store.move_ticket(self.ticket, "done", actor=actor)
        self.assertEqual(self.store.get_ticket(self.ticket)["state"], "in_progress")

    def test_15_every_kind_attached_does_not_open_an_unconfigured_gate(self):
        for kind_id, _, _, _ in DEFAULT_KINDS:
            self.store.attach_evidence(
                self.ticket, kind_id, {"k": kind_id}, actor="user"
            )
        for to_state in ("awaiting_verification", "done"):
            for actor in ("user", "agent"):
                with self.assertRaises(GateRefused):
                    self.store.move_ticket(self.ticket, to_state, actor=actor)
        self.assertEqual(self.store.get_ticket(self.ticket)["state"], "open")

    def test_15_self_transition_refused_without_a_gate(self):
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "open", actor="user")
        self.assertEqual(self.store.get_ticket(self.ticket)["state"], "open")

    def test_15_self_transition_allowed_when_a_gate_exists(self):
        self.store.set_gate("open", "open", ["builtin:user_signoff"], ["user"])
        with self.assertRaises(GateRefused):
            self.store.move_ticket(self.ticket, "open", actor="user")
        self.store.attach_evidence(
            self.ticket, "builtin:user_signoff", {"ok": True}, actor="user"
        )
        self.store.move_ticket(self.ticket, "open", actor="user")
        self.assertEqual(self.store.get_ticket(self.ticket)["state"], "open")


if __name__ == "__main__":
    unittest.main()
