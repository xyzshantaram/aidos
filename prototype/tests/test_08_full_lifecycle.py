"""Item 8. The full lifecycle from open to done, one gate step at a time."""

import unittest

from helm_proto.store import GateRefused
from tests.helpers import make_store

GATES = {
    ("open", "in_progress"): (
        ["builtin:eval_criteria", "builtin:file_allowlist", "builtin:user_signoff"],
        ["user"],
    ),
    ("in_progress", "awaiting_verification"): (
        ["builtin:agent_report"],
        ["user", "agent"],
    ),
    ("awaiting_verification", "in_progress"): (
        ["builtin:comment"],
        ["user"],
    ),
    ("awaiting_verification", "done"): (
        ["builtin:review_pass", "builtin:after_shot"],
        ["user"],
    ),
}


class FullLifecycleTest(unittest.TestCase):
    def setUp(self):
        self.store = make_store()
        for (frm, to), (kinds, actors) in GATES.items():
            self.store.set_gate(frm, to, kinds, actors)
        project = self.store.create_project("/srv/proj/life", "life")
        self.ticket = self.store.create_ticket(
            project, "Lifecycle", "d", actor="user"
        )

    def move_after_attaching(self, to_state, kinds, actor):
        """Assert refusal, attach the missing kinds, then assert success."""
        with self.assertRaises(GateRefused) as cm:
            self.store.move_ticket(self.ticket, to_state, actor=actor)
        self.assertCountEqual(cm.exception.missing_kinds, kinds)
        for kind in kinds:
            self.store.attach_evidence(
                self.ticket, kind, {"k": kind}, actor=actor
            )
        self.store.move_ticket(self.ticket, to_state, actor=actor)

    def test_08_drive_open_to_done(self):
        self.move_after_attaching(
            "in_progress",
            ["builtin:eval_criteria", "builtin:file_allowlist", "builtin:user_signoff"],
            "user",
        )
        self.assertEqual(self.store.get_ticket(self.ticket)["state"], "in_progress")

        self.move_after_attaching(
            "awaiting_verification", ["builtin:agent_report"], "agent"
        )
        self.assertEqual(
            self.store.get_ticket(self.ticket)["state"], "awaiting_verification"
        )

        with self.assertRaises(GateRefused) as cm:
            self.store.move_ticket(self.ticket, "done", actor="agent")
        self.assertEqual(cm.exception.allowed_actors, ["user"])
        self.assertEqual(
            self.store.get_ticket(self.ticket)["state"], "awaiting_verification"
        )

        self.move_after_attaching(
            "done", ["builtin:review_pass", "builtin:after_shot"], "user"
        )
        self.assertEqual(self.store.get_ticket(self.ticket)["state"], "done")


if __name__ == "__main__":
    unittest.main()
