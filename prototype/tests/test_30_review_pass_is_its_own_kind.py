"""Item 30. A review is its own evidence kind, and the second gate needs it.

A passing check says nothing about dead code or scope that grew. A review says
nothing about whether the thing runs. The gate from in_progress to
awaiting_verification asks for both, and the agent may author both, so the
number of gates a human must satisfy does not change.
"""

import unittest

from tests.cli_helpers import HUMAN_ONLY_KINDS, CliTestCase

AUTOMATED_CHECK = "builtin:automated_check"
REVIEW_PASS = "builtin:review_pass"


class ReviewPassIsItsOwnKindTest(CliTestCase):
    def setUp(self):
        super().setUp()
        self.init()
        self.ticket = self.create_ticket(title="Needs a review")
        self.attach_as_human(self.ticket, "builtin:user_signoff")
        self.run_ok("move-ticket", "--ticket", str(self.ticket),
                    "--to", "in_progress")

    def attach(self, kind_id):
        """Ask the CLI to attach one kind. The CLI acts as the agent."""
        self.run_ok("attach-evidence", "--ticket", str(self.ticket),
                    "--kind", kind_id)

    def score(self):
        """Return the confidence score of the ticket under test."""
        store = self.read_store()
        try:
            return store.confidence_score(self.ticket)
        finally:
            store.close()

    def test_30_a_passing_check_without_a_review_is_refused(self):
        self.attach(AUTOMATED_CHECK)
        payload = self.run_fail(
            "move-ticket", "--ticket", str(self.ticket),
            "--to", "awaiting_verification")
        self.assertEqual(payload.get("missing_kinds"), [REVIEW_PASS])
        self.assertEqual(self.ticket_state(self.ticket), "in_progress")

    def test_30_a_review_without_a_check_is_refused(self):
        self.attach(REVIEW_PASS)
        payload = self.run_fail(
            "move-ticket", "--ticket", str(self.ticket),
            "--to", "awaiting_verification")
        self.assertEqual(payload.get("missing_kinds"), [AUTOMATED_CHECK])
        self.assertEqual(self.ticket_state(self.ticket), "in_progress")

    def test_30_the_same_ticket_moves_once_the_review_row_exists(self):
        self.attach(AUTOMATED_CHECK)
        self.run_fail(
            "move-ticket", "--ticket", str(self.ticket),
            "--to", "awaiting_verification")
        self.attach(REVIEW_PASS)
        self.run_ok("move-ticket", "--ticket", str(self.ticket),
                    "--to", "awaiting_verification")
        self.assertEqual(
            self.ticket_state(self.ticket), "awaiting_verification")

    def test_30_the_agent_may_author_the_review(self):
        """The new kind costs the human nothing at the keyboard."""
        self.assertNotIn(REVIEW_PASS, HUMAN_ONLY_KINDS)
        self.attach(REVIEW_PASS)

    def test_30_the_review_weighs_one(self):
        before = self.score()
        self.attach(REVIEW_PASS)
        self.assertEqual(self.score() - before, 1.0)

    def test_30_a_review_note_does_not_satisfy_the_gate(self):
        """A single remark is not a finished pass. The kinds stay separate."""
        self.attach(AUTOMATED_CHECK)
        self.attach("builtin:review_note")
        payload = self.run_fail(
            "move-ticket", "--ticket", str(self.ticket),
            "--to", "awaiting_verification")
        self.assertEqual(payload.get("missing_kinds"), [REVIEW_PASS])
        self.assertEqual(self.ticket_state(self.ticket), "in_progress")


if __name__ == "__main__":
    unittest.main()
