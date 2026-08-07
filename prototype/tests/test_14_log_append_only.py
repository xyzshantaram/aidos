"""Item 14. The log is append-only."""

import unittest

from aidos_proto.store import GateRefused
from tests.helpers import make_store


class AppendOnlyLogTest(unittest.TestCase):
    def test_14_one_write_appends_one_record(self):
        store = make_store()
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        before = store.events()
        store.set_ticket(ticket, actor="user", title="T edited")

        after = store.events()
        self.assertEqual(len(after), len(before) + 1)
        self.assertEqual(after[: len(before)], before)

    def test_14_refused_move_appends_one_record(self):
        store = make_store()
        store.set_gate("open", "in_progress", ["builtin:user_signoff"], ["user"])
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        before = store.events()
        with self.assertRaises(GateRefused):
            store.move_ticket(ticket, "in_progress", actor="user")

        after = store.events()
        self.assertEqual(len(after), len(before) + 1)
        self.assertEqual(after[: len(before)], before)

    def test_14_mixed_writes_and_refusals_append_in_order(self):
        store = make_store()
        store.set_gate("open", "in_progress", ["builtin:user_signoff"], ["user"])
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        before = store.events()
        store.attach_evidence(ticket, "builtin:comment", {"i": 1}, actor="user")
        with self.assertRaises(GateRefused):
            store.move_ticket(ticket, "in_progress", actor="user")
        store.attach_evidence(ticket, "builtin:comment", {"i": 2}, actor="user")
        store.attach_evidence(
            ticket, "builtin:user_signoff", {"ok": True}, actor="user"
        )
        store.move_ticket(ticket, "in_progress", actor="user")

        after = store.events()
        self.assertEqual(len(after), len(before) + 5)
        self.assertEqual(after[: len(before)], before)


if __name__ == "__main__":
    unittest.main()
