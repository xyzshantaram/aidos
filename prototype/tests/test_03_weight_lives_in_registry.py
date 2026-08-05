"""Item 3. Weight lives in the registry, not in the rows."""

import unittest

from tests.helpers import make_store


class WeightInRegistryTest(unittest.TestCase):
    def test_03_score_tracks_registry_weight(self):
        store = make_store()
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")
        for i in range(3):
            store.attach_evidence(ticket, "builtin:comment", {"i": i}, actor="user")

        self.assertEqual(store.confidence_score(ticket), 0.5)

        rows_before = store.evidence_for(ticket)
        store.set_kind_weight("builtin:comment", 2.5)

        self.assertEqual(store.confidence_score(ticket), 2.5)
        self.assertEqual(store.evidence_for(ticket), rows_before)


if __name__ == "__main__":
    unittest.main()
