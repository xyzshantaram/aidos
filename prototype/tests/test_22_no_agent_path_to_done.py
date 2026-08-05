"""Item 22. The agent has no path to done, whatever evidence it attaches.

A plan import is no way around this. An import lands in the state "open" even
when the document marks every ticket done.
"""

import unittest

from tests.cli_helpers import AGENT_KINDS, IMPORT_RECORD_KIND, CliTestCase

# Every ticket carries the done mark. None of them may land in state "done".
ALL_DONE_PLAN = """## Phase 1: Everything claims done — `done`

- [x] **Ticket 1: First claim.** A body. **Evaluate:** A test passes.
- [x] **Ticket 2: Second claim.** A body. **Evaluate:** A test passes.
"""


class NoAgentPathToDoneTest(CliTestCase):
    def setUp(self):
        super().setUp()
        self.init()
        self.ticket = self.drive_to_awaiting_verification()

    def test_22_the_setup_reaches_awaiting_verification(self):
        self.assertEqual(
            self.ticket_state(self.ticket), "awaiting_verification")
        attached = {row["kind_id"] for row in self.evidence_rows(self.ticket)}
        for kind_id in AGENT_KINDS:
            self.assertIn(kind_id, attached)

    def test_22_done_is_refused_with_every_agent_kind_attached(self):
        result = self.run_cli(
            "move-ticket", "--ticket", str(self.ticket), "--to", "done")
        self.assertNotEqual(result.code, 0, str(result))
        payload = self.parse_json(result)
        self.assertIs(payload.get("ok"), False, str(result))

    def test_22_the_refusal_names_the_missing_kind_or_the_allowed_actors(self):
        payload = self.run_fail(
            "move-ticket", "--ticket", str(self.ticket), "--to", "done")
        missing = payload.get("missing_kinds", [])
        allowed = payload.get("allowed_actors", [])
        self.assertTrue(
            missing or allowed,
            "the refusal must name a missing kind or an allowed actor: %s"
            % payload)
        if missing:
            self.assertIn("builtin:user_verified", missing)
        if allowed:
            self.assertEqual(sorted(allowed), ["user"])

    def test_22_the_ticket_stays_in_awaiting_verification(self):
        self.run_fail(
            "move-ticket", "--ticket", str(self.ticket), "--to", "done")
        self.assertEqual(
            self.ticket_state(self.ticket), "awaiting_verification")

    def test_22_done_is_refused_from_the_earlier_states(self):
        open_ticket = self.create_ticket(title="Still open")
        payload = self.run_fail(
            "move-ticket", "--ticket", str(open_ticket), "--to", "done")
        self.assertEqual(payload.get("from_state"), "open")
        self.assertEqual(payload.get("to_state"), "done")
        self.assertEqual(self.ticket_state(open_ticket), "open")

        self.attach_as_human(open_ticket, "builtin:user_signoff")
        self.run_ok("move-ticket", "--ticket", str(open_ticket),
                    "--to", "in_progress")
        payload = self.run_fail(
            "move-ticket", "--ticket", str(open_ticket), "--to", "done")
        self.assertEqual(payload.get("from_state"), "in_progress")
        self.assertEqual(self.ticket_state(open_ticket), "in_progress")

    def test_22_a_plan_import_cannot_produce_a_done_ticket(self):
        # An import needs an empty project, so it runs on a second database.
        other_db = self.temp_path("import.sqlite")
        self.init(db=other_db)
        path = self.write_file("all_done.md", ALL_DONE_PLAN)
        self.run_ok("plan", "import", "--file", path, db=other_db)

        tickets = self.run_ok("list", db=other_db)["tickets"]
        self.assertEqual(len(tickets), 2)
        self.assertEqual([ticket["state"] for ticket in tickets],
                         ["open", "open"])

    def test_22_an_import_keeps_the_done_claim_as_evidence_only(self):
        other_db = self.temp_path("import.sqlite")
        self.init(db=other_db)
        path = self.write_file("all_done.md", ALL_DONE_PLAN)
        self.run_ok("plan", "import", "--file", path, db=other_db)

        for ticket_id in (1, 2):
            rows = [row for row in self.evidence_rows(ticket_id, db=other_db)
                    if row["kind_id"] == IMPORT_RECORD_KIND]
            self.assertEqual(len(rows), 1, "ticket %s" % ticket_id)
            self.assertEqual(rows[0]["payload"]["claimed_state"], "done")
            self.assertEqual(self.ticket_state(ticket_id, db=other_db), "open")


if __name__ == "__main__":
    unittest.main()
