"""Item 28. The store holds the plan fields of a ticket, and it holds phases.

These tests cover the change to aidos_proto/store.py that the CLI needs. They
pass now, because the store is real code. Every other module from test_20
upward fails until aidos_proto/cli.py exists.
"""

import os
import tempfile
import unittest

from aidos_proto.store import Store
from tests.helpers import make_store


class TicketPlanFieldsTest(unittest.TestCase):
    def setUp(self):
        self.store = make_store()
        self.project = self.store.create_project("/srv/proj/fields", "fields")

    def test_28_a_new_ticket_holds_the_plan_fields(self):
        ticket = self.store.create_ticket(
            self.project, "T", "d",
            body="A body.", criteria="A test passes.", phase=2)
        row = self.store.get_ticket(ticket)
        self.assertEqual(row["body"], "A body.")
        self.assertEqual(row["criteria"], "A test passes.")
        self.assertEqual(row["phase"], 2)
        self.assertEqual(row["order"], 1)

    def test_28_the_plan_fields_have_defaults(self):
        row = self.store.get_ticket(
            self.store.create_ticket(self.project, "T", "d"))
        self.assertEqual(row["body"], "")
        self.assertEqual(row["criteria"], "")
        self.assertEqual(row["phase"], 1)
        self.assertEqual(row["order"], 1)

    def test_28_order_counts_up_inside_one_phase(self):
        first = self.store.create_ticket(self.project, "A", "d", phase=1)
        second = self.store.create_ticket(self.project, "B", "d", phase=1)
        other = self.store.create_ticket(self.project, "C", "d", phase=2)
        self.assertEqual(self.store.get_ticket(first)["order"], 1)
        self.assertEqual(self.store.get_ticket(second)["order"], 2)
        self.assertEqual(self.store.get_ticket(other)["order"], 1)

    def test_28_an_explicit_order_is_kept(self):
        ticket = self.store.create_ticket(self.project, "A", "d", order=7)
        later = self.store.create_ticket(self.project, "B", "d")
        self.assertEqual(self.store.get_ticket(ticket)["order"], 7)
        self.assertEqual(self.store.get_ticket(later)["order"], 8)

    def test_28_set_ticket_changes_the_plan_fields(self):
        ticket = self.store.create_ticket(self.project, "A", "d")
        self.store.set_ticket(
            ticket, body="New body.", criteria="New rule.", phase=3, order=4)
        row = self.store.get_ticket(ticket)
        self.assertEqual(row["body"], "New body.")
        self.assertEqual(row["criteria"], "New rule.")
        self.assertEqual(row["phase"], 3)
        self.assertEqual(row["order"], 4)

    def test_28_set_ticket_leaves_an_absent_field_alone(self):
        ticket = self.store.create_ticket(
            self.project, "A", "d", body="Keep me.", criteria="Keep me too.")
        self.store.set_ticket(ticket, title="New title")
        row = self.store.get_ticket(ticket)
        self.assertEqual(row["title"], "New title")
        self.assertEqual(row["body"], "Keep me.")
        self.assertEqual(row["criteria"], "Keep me too.")


class OldRecordReplayTest(unittest.TestCase):
    """A log written before the plan fields existed must still replay."""

    def test_28_an_old_ticket_record_replays_with_defaults(self):
        store = make_store()
        project = store.create_project("/srv/proj/old", "old")
        # The shape that create_ticket wrote before the plan fields existed.
        # The test uses the write path of the store, because no public method
        # can make a record of the old shape now.
        store._append({
            "type": "ticket.created",
            "ticket_id": 1,
            "project_id": project,
            "title": "Old ticket",
            "description": "An old description.",
            "actor": "user",
            "at": 0.0,
        })
        store.rebuild_projection()

        row = store.get_ticket(1)
        self.assertEqual(row["title"], "Old ticket")
        self.assertEqual(row["description"], "An old description.")
        self.assertEqual(row["state"], "open")
        self.assertEqual(row["body"], "")
        self.assertEqual(row["criteria"], "")
        self.assertEqual(row["phase"], 1)
        self.assertEqual(row["order"], 1)

    def test_28_an_old_update_record_replays(self):
        store = make_store()
        project = store.create_project("/srv/proj/old", "old")
        ticket = store.create_ticket(project, "T", "d", body="A body.")
        store._append({
            "type": "ticket.set",
            "ticket_id": ticket,
            "title": "Renamed",
            "actor": "user",
            "at": 0.0,
        })
        store.rebuild_projection()

        row = store.get_ticket(ticket)
        self.assertEqual(row["title"], "Renamed")
        self.assertEqual(row["body"], "A body.")


class PhaseTest(unittest.TestCase):
    def setUp(self):
        self.store = make_store()
        self.project = self.store.create_project("/srv/proj/phase", "phase")

    def test_28_a_new_phase_starts_open_with_an_empty_title(self):
        self.store.set_phase(self.project, 1)
        phase = self.store.get_phase(self.project, 1)
        self.assertEqual(phase["title"], "")
        self.assertEqual(phase["state"], "open")

    def test_28_a_phase_keeps_its_title_and_state(self):
        self.store.set_phase(self.project, 1, title="Groundwork", state="done")
        phase = self.store.get_phase(self.project, 1)
        self.assertEqual(phase["title"], "Groundwork")
        self.assertEqual(phase["state"], "done")

    def test_28_setting_one_phase_field_leaves_the_other(self):
        self.store.set_phase(self.project, 1, title="Groundwork", state="done")
        self.store.set_phase(self.project, 1, state="open")
        phase = self.store.get_phase(self.project, 1)
        self.assertEqual(phase["title"], "Groundwork")
        self.assertEqual(phase["state"], "open")

    def test_28_phases_for_sorts_by_number(self):
        self.store.set_phase(self.project, 2, title="Second")
        self.store.set_phase(self.project, 1, title="First")
        self.assertEqual(
            [phase["number"] for phase in self.store.phases_for(self.project)],
            [1, 2])

    def test_28_phases_for_skips_another_project(self):
        other = self.store.create_project("/srv/proj/other", "other")
        self.store.set_phase(self.project, 1, title="Mine")
        self.store.set_phase(other, 1, title="Theirs")
        self.assertEqual(
            [phase["title"] for phase in self.store.phases_for(self.project)],
            ["Mine"])

    def test_28_a_phase_of_an_unknown_project_is_refused(self):
        with self.assertRaises(KeyError):
            self.store.set_phase(999, 1, title="Nowhere")


class PlanFieldsSurviveReopenTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "store.sqlite")

    def tearDown(self):
        self.tmp.cleanup()

    def test_28_the_plan_fields_and_phases_survive_a_reopen(self):
        store = Store(self.db_path)
        project = store.create_project("/srv/proj/reopen", "reopen")
        store.set_phase(project, 1, title="Groundwork", state="done")
        ticket = store.create_ticket(
            project, "T", "d",
            body="A body.", criteria="A test passes.", phase=1)
        before_ticket = dict(store.get_ticket(ticket))
        before_phase = dict(store.get_phase(project, 1))
        store.close()

        store = Store(self.db_path)
        try:
            self.assertEqual(store.get_ticket(ticket), before_ticket)
            self.assertEqual(store.get_phase(project, 1), before_phase)
        finally:
            store.close()


if __name__ == "__main__":
    unittest.main()
