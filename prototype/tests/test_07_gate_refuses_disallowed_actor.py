"""Item 7. A gate refuses a move by a disallowed actor."""

import unittest

from aidos_proto.store import GateRefused
from tests.helpers import make_store


class DisallowedActorTest(unittest.TestCase):
    def test_07_disallowed_actor_refused_but_user_succeeds(self):
        store = make_store()
        store.set_gate("open", "in_progress", ["builtin:user_signoff"], ["user"])
        project = store.create_project("/srv/proj/a", "a")
        ticket = store.create_ticket(project, "T", "d", actor="user")
        store.attach_evidence(
            ticket, "builtin:user_signoff", {"ok": True}, actor="user"
        )

        with self.assertRaises(GateRefused) as cm:
            store.move_ticket(ticket, "in_progress", actor="agent")
        self.assertEqual(cm.exception.allowed_actors, ["user"])

        store.move_ticket(ticket, "in_progress", actor="user")
        self.assertEqual(store.get_ticket(ticket)["state"], "in_progress")


if __name__ == "__main__":
    unittest.main()
