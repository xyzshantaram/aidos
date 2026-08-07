"""Item 4. An unregistered kind is refused without side effects."""

import unittest

from aidos_proto.store import UnknownKind
from tests.helpers import make_store


class UnregisteredKindTest(unittest.TestCase):
    def test_04_unknown_kind_raises_and_writes_nothing(self):
        store = make_store()
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")
        log_before = store.events()

        with self.assertRaises(UnknownKind):
            store.attach_evidence(
                ticket, "builtin:no_such_kind", {"x": 1}, actor="agent"
            )

        self.assertEqual(store.evidence_for(ticket), [])
        self.assertEqual(store.events(), log_before)


if __name__ == "__main__":
    unittest.main()
