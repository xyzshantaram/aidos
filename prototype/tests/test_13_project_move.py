"""Item 13. Moving a project keeps its tickets."""

import os
import tempfile
import unittest

from tests.helpers import make_store, reopen


class ProjectMoveTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "store.sqlite")

    def tearDown(self):
        self.tmp.cleanup()

    def test_13_ticket_stays_with_project_and_path_updates(self):
        store = make_store(path=self.db_path)
        project = store.create_project("/srv/proj/alpha", "alpha")
        ticket = store.create_ticket(project, "T", "d", actor="user")

        store.move_project(project, "/srv/proj/beta")

        project_info = store.get_project(project)
        self.assertEqual(project_info["id"], project)
        self.assertEqual(project_info["abs_path"], "/srv/proj/beta")
        self.assertEqual(project_info["name"], "alpha")

        ticket_info = store.get_ticket(ticket)
        self.assertEqual(ticket_info["project_id"], project)

        store = reopen(store)
        self.assertEqual(store.get_project(project)["abs_path"], "/srv/proj/beta")
        self.assertEqual(store.get_ticket(ticket)["project_id"], project)


if __name__ == "__main__":
    unittest.main()
