"""Item 23. A refusal prints JSON that names the states and the reason."""

import unittest

from tests.cli_helpers import CliTestCase


class RefusalJsonShapeTest(CliTestCase):
    def setUp(self):
        super().setUp()
        self.init()
        self.ticket = self.create_ticket()

    def test_23_a_refused_move_exits_non_zero(self):
        result = self.run_cli(
            "move-ticket", "--ticket", str(self.ticket), "--to", "in_progress")
        self.assertNotEqual(result.code, 0, str(result))
        self.assertIs(self.parse_json(result).get("ok"), False)

    def test_23_a_refusal_names_the_from_state_and_the_to_state(self):
        payload = self.run_fail(
            "move-ticket", "--ticket", str(self.ticket), "--to", "in_progress")
        self.assertEqual(payload.get("from_state"), "open")
        self.assertEqual(payload.get("to_state"), "in_progress")

    def test_23_a_refusal_names_the_missing_kinds(self):
        payload = self.run_fail(
            "move-ticket", "--ticket", str(self.ticket), "--to", "in_progress")
        self.assertEqual(payload.get("missing_kinds"), ["builtin:user_signoff"])

    def test_23_a_refusal_names_the_allowed_actors(self):
        ticket = self.drive_to_awaiting_verification(title="Ready for a human")
        payload = self.run_fail(
            "move-ticket", "--ticket", str(ticket), "--to", "done")
        self.assertEqual(sorted(payload.get("allowed_actors", [])), ["user"])
        self.assertEqual(payload.get("from_state"), "awaiting_verification")
        self.assertEqual(payload.get("to_state"), "done")

    def test_23_a_refusal_writes_no_traceback(self):
        result = self.run_cli(
            "move-ticket", "--ticket", str(self.ticket), "--to", "in_progress")
        self.assertNotIn("Traceback", result.stderr)
        self.assertNotIn("Traceback", result.stdout)
        self.parse_json(result)

    def test_23_an_unknown_ticket_gives_json_and_not_a_traceback(self):
        result = self.run_cli("move-ticket", "--ticket", "999", "--to", "done")
        self.assertNotEqual(result.code, 0, str(result))
        self.assertNotIn("Traceback", result.stderr)
        payload = self.parse_json(result)
        self.assertIs(payload.get("ok"), False)
        self.assertIn("999", payload.get("message", ""))

    def test_23_a_refused_move_changes_no_state(self):
        self.run_fail(
            "move-ticket", "--ticket", str(self.ticket), "--to", "in_progress")
        self.assertEqual(self.ticket_state(self.ticket), "open")


if __name__ == "__main__":
    unittest.main()
