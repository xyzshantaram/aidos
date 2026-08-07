"""Item 6. A gate refuses a move when a required kind is missing."""

import unittest

from aidos_proto.store import GateRefused
from tests.helpers import make_store


class MissingKindTest(unittest.TestCase):
    def test_06_missing_kind_refuses_the_move(self):
        store = make_store([
            ("builtin:req", "Required", "Required evidence.", 1.0),
            ("builtin:other", "Other", "Other evidence.", 1.0),
        ])
        store.set_gate(
            "open", "in_progress", ["builtin:req", "builtin:other"], ["user"]
        )
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        with self.assertRaises(GateRefused) as cm:
            store.move_ticket(ticket, "in_progress", actor="user")

        exception = cm.exception
        self.assertCountEqual(
            exception.missing_kinds, ["builtin:req", "builtin:other"]
        )
        self.assertEqual(exception.allowed_actors, ["user"])
        self.assertIn("builtin:req", str(exception))
        self.assertIn("builtin:other", str(exception))
        self.assertEqual(store.get_ticket(ticket)["state"], "open")

    def test_06_partial_kind_set_lists_only_the_absent_kind(self):
        store = make_store([
            ("builtin:req", "Required", "Required evidence.", 1.0),
            ("builtin:other", "Other", "Other evidence.", 1.0),
        ])
        store.set_gate(
            "open", "in_progress", ["builtin:req", "builtin:other"], ["user"]
        )
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")
        store.attach_evidence(ticket, "builtin:req", {"x": 1}, actor="user")

        with self.assertRaises(GateRefused) as cm:
            store.move_ticket(ticket, "in_progress", actor="user")
        self.assertCountEqual(cm.exception.missing_kinds, ["builtin:other"])
        self.assertEqual(store.get_ticket(ticket)["state"], "open")


if __name__ == "__main__":
    unittest.main()
