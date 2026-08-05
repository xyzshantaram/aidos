"""Item 11. A kind contributes its weight once per distinct author."""

import unittest

from tests.helpers import make_store


class OncePerAuthorTest(unittest.TestCase):
    def test_11_kind_contributes_once_per_author(self):
        store = make_store([
            ("builtin:testimonial", "Testimonial", "Evidence of praise.", 3.0),
        ])
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        for i in range(3):
            store.attach_evidence(
                ticket, "builtin:testimonial", {"i": i}, actor="agent"
            )

        self.assertEqual(store.confidence_score(ticket), 3.0)

        store.attach_evidence(ticket, "builtin:testimonial", {"i": 3}, actor="user")

        self.assertEqual(store.confidence_score(ticket), 6.0)


if __name__ == "__main__":
    unittest.main()
