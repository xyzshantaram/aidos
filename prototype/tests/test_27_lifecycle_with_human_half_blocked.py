"""Item 27. The CLI walks the lifecycle as far as a machine may go.

The CLI creates the ticket and makes every move it may make. The board
supplies the human evidence through the Store API. The last gate stays shut.
"""

import unittest

from tests.cli_helpers import CliTestCase


class LifecycleWithHumanHalfBlockedTest(CliTestCase):
    def setUp(self):
        super().setUp()
        self.init()
        self.ticket = self.create_ticket(title="Walk the lifecycle")

    def reach_in_progress(self):
        """Take the ticket to in_progress with a signoff from the board."""
        self.attach_as_human(self.ticket, "builtin:user_signoff")
        self.run_ok("move-ticket", "--ticket", str(self.ticket),
                    "--to", "in_progress")

    def reach_awaiting_verification(self):
        """Take the ticket to awaiting_verification with an automated check."""
        self.reach_in_progress()
        self.run_ok("attach-evidence", "--ticket", str(self.ticket),
                    "--kind", "builtin:automated_check")
        self.run_ok("move-ticket", "--ticket", str(self.ticket),
                    "--to", "awaiting_verification")

    def test_27_a_new_ticket_starts_open(self):
        self.assertEqual(self.ticket_state(self.ticket), "open")

    def test_27_the_move_out_of_open_needs_a_signoff(self):
        payload = self.run_fail(
            "move-ticket", "--ticket", str(self.ticket), "--to", "in_progress")
        self.assertEqual(payload.get("missing_kinds"), ["builtin:user_signoff"])
        self.assertEqual(self.ticket_state(self.ticket), "open")

    def test_27_the_cli_cannot_supply_the_signoff_itself(self):
        payload = self.run_fail(
            "attach-evidence", "--ticket", str(self.ticket),
            "--kind", "builtin:user_signoff")
        self.assertEqual(payload.get("kind"), "builtin:user_signoff")
        self.assertEqual(self.ticket_state(self.ticket), "open")

    def test_27_the_cli_reaches_in_progress_after_a_human_signoff(self):
        self.run_fail(
            "move-ticket", "--ticket", str(self.ticket), "--to", "in_progress")
        self.reach_in_progress()
        self.assertEqual(self.ticket_state(self.ticket), "in_progress")

    def test_27_the_cli_reaches_awaiting_verification(self):
        self.reach_awaiting_verification()
        self.assertEqual(
            self.ticket_state(self.ticket), "awaiting_verification")

    def test_27_the_automated_check_is_needed_for_the_second_move(self):
        self.reach_in_progress()
        payload = self.run_fail(
            "move-ticket", "--ticket", str(self.ticket),
            "--to", "awaiting_verification")
        self.assertEqual(
            payload.get("missing_kinds"), ["builtin:automated_check"])
        self.assertEqual(self.ticket_state(self.ticket), "in_progress")

    def test_27_done_stays_blocked(self):
        self.reach_awaiting_verification()
        payload = self.run_fail(
            "move-ticket", "--ticket", str(self.ticket), "--to", "done")
        self.assertEqual(payload.get("from_state"), "awaiting_verification")
        self.assertEqual(payload.get("to_state"), "done")
        self.assertEqual(sorted(payload.get("allowed_actors", [])), ["user"])
        self.assertEqual(
            self.ticket_state(self.ticket), "awaiting_verification")


if __name__ == "__main__":
    unittest.main()
