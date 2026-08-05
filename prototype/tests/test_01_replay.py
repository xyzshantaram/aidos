"""Item 1. Replay. Rebuild the projection and check the state is unchanged."""

import unittest

from helm_proto.store import GateRefused
from tests.helpers import make_store


class ReplayTest(unittest.TestCase):
    def test_01_replay_state_is_identical_after_rebuild(self):
        store = make_store([
            ("builtin:user_signoff", "User signoff", "The human signs off.", 1.0),
            ("builtin:agent_report", "Agent report", "The agent reports.", 1.0),
        ])
        store.set_kind_weight("builtin:user_signoff", 2.0)
        store.set_gate("open", "in_progress", ["builtin:user_signoff"], ["user"])

        project_one = store.create_project("/srv/proj/one", "one")
        ticket_one = store.create_ticket(
            project_one, "First ticket", "Body one.", actor="user"
        )
        store.set_ticket(ticket_one, actor="agent", title="First ticket edited")

        # Refused move: the required kind is not attached yet.
        with self.assertRaises(GateRefused):
            store.move_ticket(ticket_one, "in_progress", actor="user")
        store.attach_evidence(
            ticket_one, "builtin:user_signoff", {"ok": True}, actor="user"
        )
        # Refused move: the agent is not an allowed actor on this gate.
        with self.assertRaises(GateRefused):
            store.move_ticket(ticket_one, "in_progress", actor="agent")
        store.move_ticket(ticket_one, "in_progress", actor="user")
        # Refused move: no gate exists for this pair at all.
        with self.assertRaises(GateRefused):
            store.move_ticket(ticket_one, "done", actor="agent")
        store.attach_evidence(
            ticket_one, "builtin:agent_report", {"lines": 3}, actor="agent"
        )

        project_two = store.create_project("/srv/proj/two", "two")
        ticket_two = store.create_ticket(
            project_two, "Second ticket", "Body two.", actor="agent"
        )
        store.attach_evidence(
            ticket_two, "builtin:agent_report", {"lines": 12}, actor="agent"
        )
        store.set_ticket(ticket_two, actor="agent", description="Body two revised")
        store.move_project(project_two, "/srv/proj/two-moved")

        log_before = store.events()
        self.assertGreaterEqual(len(log_before), 12)

        tickets_before = {
            ticket_one: store.get_ticket(ticket_one),
            ticket_two: store.get_ticket(ticket_two),
        }
        evidence_before = {
            ticket_one: store.evidence_for(ticket_one),
            ticket_two: store.evidence_for(ticket_two),
        }
        scores_before = {
            ticket_one: store.confidence_score(ticket_one),
            ticket_two: store.confidence_score(ticket_two),
        }

        # Sanity: the snapshot is concrete, not empty.
        self.assertEqual(tickets_before[ticket_one]["state"], "in_progress")
        self.assertEqual(tickets_before[ticket_two]["state"], "open")
        self.assertEqual(len(evidence_before[ticket_one]), 2)

        store.rebuild_projection()

        for ticket_id, ticket in tickets_before.items():
            self.assertEqual(store.get_ticket(ticket_id), ticket)
        for ticket_id, rows in evidence_before.items():
            self.assertEqual(store.evidence_for(ticket_id), rows)
        for ticket_id, score in scores_before.items():
            self.assertEqual(store.confidence_score(ticket_id), score)
        self.assertEqual(store.events(), log_before)


if __name__ == "__main__":
    unittest.main()
