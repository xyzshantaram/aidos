"""Item 24. Two runs of init leave the same kinds, gates, and project.

The store appends one audit record for every registration, so a second run
makes the log longer even when it changes nothing. Every assertion here reads
the registry, not the log.
"""

import unittest

from tests.cli_helpers import (
    BUILTIN_KINDS,
    CliTestCase,
    expected_gates_snapshot,
    gates_snapshot,
    kinds_snapshot,
)


class InitIsIdempotentTest(CliTestCase):
    def registry(self):
        """Return the kinds, the gates, and the projects as plain data."""
        store = self.read_store()
        try:
            return (kinds_snapshot(store), gates_snapshot(store),
                    dict(store.projects))
        finally:
            store.close()

    def test_24_init_prints_json(self):
        payload = self.init()
        self.assertIs(payload.get("ok"), True)
        self.assertIsInstance(payload.get("project_id"), int)

    def test_24_init_registers_the_documented_kinds(self):
        self.init()
        kinds, _, _ = self.registry()
        self.assertEqual(kinds, BUILTIN_KINDS)

    def test_24_init_sets_the_documented_gates(self):
        self.init()
        _, gates, _ = self.registry()
        self.assertEqual(gates, expected_gates_snapshot())

    def test_24_a_second_init_leaves_the_same_kinds_and_gates(self):
        self.init()
        first_kinds, first_gates, _ = self.registry()
        self.init()
        second_kinds, second_gates, _ = self.registry()
        self.assertEqual(second_kinds, first_kinds)
        self.assertEqual(second_gates, first_gates)
        self.assertEqual(second_kinds, BUILTIN_KINDS)
        self.assertEqual(second_gates, expected_gates_snapshot())

    def test_24_a_second_init_creates_no_second_project(self):
        first = self.init()
        second = self.init()
        self.assertEqual(second["project_id"], first["project_id"])
        _, _, projects = self.registry()
        self.assertEqual(len(projects), 1)

    def test_24_a_second_init_keeps_the_tickets(self):
        self.init()
        ticket = self.create_ticket(title="Made before the second init")
        self.init()
        payload = self.run_ok("show", "--ticket", str(ticket))
        self.assertEqual(payload["ticket"]["title"],
                         "Made before the second init")
        self.assertEqual(payload["ticket"]["state"], "open")


if __name__ == "__main__":
    unittest.main()
