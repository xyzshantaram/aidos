"""Item 19. Registry changes are audited in the log."""

import unittest

from helm_proto.store import GateRefused
from tests.helpers import make_store


class RegistryAuditTest(unittest.TestCase):
    def setUp(self):
        self.store = make_store()

    def test_19_register_kind_is_audited(self):
        before = len(self.store.events())
        self.store.register_kind(
            "plugin:audit:new", "New kind", "A fresh kind.", 1.0
        )
        after = self.store.events()
        self.assertEqual(len(after), before + 1)
        self.assertIn("plugin:audit:new", str(after[-1]))

    def test_19_set_gate_is_audited(self):
        before = len(self.store.events())
        self.store.set_gate(
            "open", "in_progress", ["builtin:user_signoff"], ["user"]
        )
        after = self.store.events()
        self.assertEqual(len(after), before + 1)
        text = str(after[-1])
        self.assertIn("open", text)
        self.assertIn("in_progress", text)
        self.assertIn("builtin:user_signoff", text)

    def test_19_set_kind_weight_is_audited(self):
        before = len(self.store.events())
        self.store.set_kind_weight("builtin:comment", 3.25)
        after = self.store.events()
        self.assertEqual(len(after), before + 1)
        text = str(after[-1])
        self.assertIn("builtin:comment", text)
        self.assertIn("3.25", text)

    def test_19_projection_ignores_registry_audit_records(self):
        store = self.store
        store.set_gate(
            "open", "in_progress", ["builtin:user_signoff"], ["user"]
        )
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        with self.assertRaises(GateRefused):
            store.move_ticket(ticket, "in_progress", actor="user")
        store.attach_evidence(
            ticket, "builtin:user_signoff", {"ok": True}, actor="user"
        )
        store.move_ticket(ticket, "in_progress", actor="user")
        store.set_kind_weight("builtin:user_signoff", 0.25)

        # The weight change is in the log.
        text = " ".join(str(record) for record in store.events())
        self.assertIn("0.25", text)

        tickets_before = {ticket: store.get_ticket(ticket)}
        evidence_before = {ticket: store.evidence_for(ticket)}
        scores_before = {ticket: store.confidence_score(ticket)}
        events_before = store.events()

        store.rebuild_projection()

        self.assertEqual(store.get_ticket(ticket), tickets_before[ticket])
        self.assertEqual(store.evidence_for(ticket), evidence_before[ticket])
        self.assertEqual(store.confidence_score(ticket), scores_before[ticket])
        self.assertEqual(store.events(), events_before)

    def test_19_loosening_a_gate_is_visible_in_the_log(self):
        store = self.store
        store.set_gate(
            "open",
            "in_progress",
            ["builtin:user_signoff", "builtin:agent_report"],
            ["user"],
        )
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")
        store.attach_evidence(
            ticket, "builtin:user_signoff", {"ok": True}, actor="user"
        )

        with self.assertRaises(GateRefused):
            store.move_ticket(ticket, "in_progress", actor="user")

        before = len(store.events())
        store.set_gate(
            "open", "in_progress", ["builtin:user_signoff"], ["user"]
        )
        self.assertEqual(len(store.events()), before + 1)

        text = str(store.events()[-1])
        self.assertIn("open", text)
        self.assertIn("in_progress", text)
        self.assertIn("builtin:user_signoff", text)
        self.assertNotIn("builtin:agent_report", text)

        store.move_ticket(ticket, "in_progress", actor="user")
        self.assertEqual(store.get_ticket(ticket)["state"], "in_progress")


if __name__ == "__main__":
    unittest.main()
