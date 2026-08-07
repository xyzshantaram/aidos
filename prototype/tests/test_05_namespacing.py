"""Item 5. Kind ids are namespaced. Similar ids are distinct kinds."""

import unittest

from aidos_proto.store import GateRefused
from tests.helpers import make_store


class NamespacingTest(unittest.TestCase):
    def test_05_similar_ids_are_distinct_kinds(self):
        store = make_store([
            ("builtin:comment", "Comment", "A built-in comment.", 0.5),
            ("plugin:xyz.shantaram:comment", "Plugin comment", "A plugin comment.", 2.0),
        ])
        project = store.create_project("/srv/proj/a", "a")
        ticket_builtin = store.create_ticket(project, "B", "d", actor="user")
        ticket_plugin = store.create_ticket(project, "P", "d", actor="user")

        store.attach_evidence(ticket_builtin, "builtin:comment", {"x": 1}, actor="user")
        store.attach_evidence(
            ticket_plugin, "plugin:xyz.shantaram:comment", {"y": 1}, actor="user"
        )

        self.assertEqual(store.confidence_score(ticket_builtin), 0.5)
        self.assertEqual(store.confidence_score(ticket_plugin), 2.0)

        store.set_kind_weight("builtin:comment", 0.1)

        self.assertEqual(store.confidence_score(ticket_builtin), 0.1)
        self.assertEqual(store.confidence_score(ticket_plugin), 2.0)

    def test_05_one_kind_does_not_satisfy_the_other(self):
        store = make_store([
            ("builtin:comment", "Comment", "A built-in comment.", 0.5),
            ("plugin:xyz.shantaram:comment", "Plugin comment", "A plugin comment.", 2.0),
        ])
        store.set_gate("open", "in_progress", ["builtin:comment"], ["user"])
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        store.attach_evidence(
            ticket, "plugin:xyz.shantaram:comment", {"y": 1}, actor="user"
        )

        with self.assertRaises(GateRefused) as cm:
            store.move_ticket(ticket, "in_progress", actor="user")
        self.assertEqual(cm.exception.missing_kinds, ["builtin:comment"])

        store.attach_evidence(ticket, "builtin:comment", {"x": 1}, actor="user")
        store.move_ticket(ticket, "in_progress", actor="user")
        self.assertEqual(store.get_ticket(ticket)["state"], "in_progress")


if __name__ == "__main__":
    unittest.main()
