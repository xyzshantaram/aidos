"""Item 2. The author and time of a row come from the caller, not the payload."""

import unittest

from tests.helpers import make_store


class AuthorNotCallerControlledTest(unittest.TestCase):
    def test_02_payload_author_key_is_ignored(self):
        store = make_store()
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")
        store.attach_evidence(
            ticket,
            "builtin:comment",
            {"author": "user", "note": "tampered"},
            actor="agent",
        )
        rows = store.evidence_for(ticket)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["author"], "agent")

    def test_02_payload_created_at_key_is_ignored(self):
        store = make_store()
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="agent")
        store.attach_evidence(
            ticket,
            "builtin:comment",
            {"created_at": 123456789, "note": "tampered"},
            actor="agent",
        )
        rows = store.evidence_for(ticket)
        self.assertEqual(len(rows), 1)
        self.assertNotEqual(rows[0]["created_at"], 123456789)


if __name__ == "__main__":
    unittest.main()
