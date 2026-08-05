"""Item 26. A plan document survives an import, an export, and a second import.

The fixture holds every part of the format: frontmatter, a preamble, two
phases, a done ticket, an open ticket, a ticket with a body of three lines,
and one context section.

An import is never a transition. Every imported ticket lands in the state
"open", and the claim of the document becomes one row of the kind
builtin:imported_state. The round trip therefore compares the plan fields of
the ticket, and it holds the state to "open" on both sides.
"""

import unittest

from tests.cli_helpers import (
    IMPORT_RECORD_KIND,
    ROUND_TRIP_TICKET_KEYS,
    STATE_MARKS,
    CliTestCase,
)

PLAN = """---
plan: Prototype plan
owner: sid
---

# Prototype plan

## Phase 1: Groundwork — `done`

- [x] **Ticket 1: Read the kernel.** Read the store and note the API. \
**Evaluate:** The notes name every public method.
- [ ] **Ticket 2: Choose the flags.** Pick one spelling for each flag.
  Keep the spelling the same in every subcommand.
  Write the choice into a docstring. **Evaluate:** Every flag appears once \
in the docstring.

## Notes

This section is not a phase. The parser must keep the text.

The list below must survive:

- one
- two

## Phase 2: Tests — `open`

- [ ] **Ticket 3: Write the suite.** One module for each subject. \
**Evaluate:** The suite fails on the missing module.
"""

FRONTMATTER = "---\nplan: Prototype plan\nowner: sid\n---"

PREAMBLE = "# Prototype plan"

CONTEXT_SECTION = """## Notes

This section is not a phase. The parser must keep the text.

The list below must survive:

- one
- two"""

# One line inside a phase that is neither blank, nor a ticket, nor a
# continuation. The parser must stop and name the line.
BAD_PLAN_LINES = [
    "## Phase 1: Groundwork — `open`",
    "",
    "- [ ] **Ticket 1: Read it.** A body. **Evaluate:** The work is done.",
    "",
    "This line is neither a ticket nor a continuation.",
    "",
]
BAD_PLAN = "\n".join(BAD_PLAN_LINES)
BAD_LINE_NUMBER = BAD_PLAN_LINES.index(
    "This line is neither a ticket nor a continuation.") + 1


class PlanRoundTripTest(CliTestCase):
    def setUp(self):
        super().setUp()
        self.init()
        self.second_db = self.temp_path("second.sqlite")
        self.init(db=self.second_db)
        self.plan_path = self.write_file("plan.md", PLAN)

    def import_fixture(self):
        """Load the fixture into the first database."""
        return self.run_ok("plan", "import", "--file", self.plan_path)

    def ticket_data(self, db=None):
        """Return the round trip fields of every ticket, in list order."""
        payload = self.run_ok("list", db=db)
        rows = []
        for ticket in payload["tickets"]:
            for key in ROUND_TRIP_TICKET_KEYS:
                self.assertIn(key, ticket, str(ticket))
            rows.append({key: ticket[key] for key in ROUND_TRIP_TICKET_KEYS})
        return rows

    def ticket_states(self, db=None):
        """Return the state of every ticket, in list order."""
        return [
            ticket["state"] for ticket in self.run_ok("list", db=db)["tickets"]
        ]

    def export(self, db=None):
        """Export the plan and return the completed run."""
        result = self.run_cli("plan", "export", db=db)
        self.assertEqual(result.code, 0, str(result))
        return result

    def mark_of(self, text, ticket_id):
        """Return the mark that the export gave one ticket."""
        wanted = "**Ticket %s:" % ticket_id
        for line in text.splitlines():
            if wanted in line:
                return line.strip()[2:5]
        self.fail("ticket %s has no line in the export:\n%s"
                  % (ticket_id, text))

    def test_26_the_fixture_imports_with_the_documented_fields(self):
        self.import_fixture()
        rows = self.ticket_data()
        self.assertEqual(len(rows), 3)
        self.assertEqual(
            [row["title"] for row in rows],
            ["Read the kernel", "Choose the flags", "Write the suite"])
        self.assertEqual([row["phase"] for row in rows], [1, 1, 2])
        self.assertEqual([row["order"] for row in rows], [1, 2, 1])
        self.assertEqual([row["id"] for row in rows], [1, 2, 3])
        self.assertEqual(
            rows[0]["criteria"], "The notes name every public method.")

    def test_26_a_multi_line_body_keeps_every_line(self):
        self.import_fixture()
        rows = self.ticket_data()
        body = rows[1]["body"]
        self.assertIn("Pick one spelling for each flag.", body)
        self.assertIn("Keep the spelling the same in every subcommand.", body)
        self.assertIn("Write the choice into a docstring.", body)
        self.assertNotIn("**Evaluate:**", body)
        self.assertEqual(
            rows[1]["criteria"], "Every flag appears once in the docstring.")

    def test_26_every_imported_ticket_lands_in_open(self):
        self.import_fixture()
        self.assertEqual(self.ticket_states(), ["open", "open", "open"])

    def test_26_the_done_ticket_keeps_its_claim_as_evidence(self):
        self.import_fixture()
        rows = [row for row in self.evidence_rows(1)
                if row["kind_id"] == IMPORT_RECORD_KIND]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["payload"]["claimed_state"], "done")
        self.assertEqual(rows[0]["payload"]["source"], self.plan_path)
        self.assertEqual(self.ticket_state(1), "open")

    def test_26_every_imported_ticket_holds_one_import_record(self):
        self.import_fixture()
        claims = []
        for ticket_id in (1, 2, 3):
            rows = [row for row in self.evidence_rows(ticket_id)
                    if row["kind_id"] == IMPORT_RECORD_KIND]
            self.assertEqual(len(rows), 1, "ticket %s" % ticket_id)
            claims.append(rows[0]["payload"]["claimed_state"])
        self.assertEqual(claims, ["done", "open", "open"])

    def test_26_a_round_trip_keeps_the_ticket_data(self):
        self.import_fixture()
        first = self.ticket_data()

        exported = self.write_file("exported.md", self.export().stdout)
        self.run_ok("plan", "import", "--file", exported, db=self.second_db)
        second = self.ticket_data(db=self.second_db)

        self.assertEqual(second, first)
        self.assertEqual(
            self.ticket_states(db=self.second_db), ["open", "open", "open"])

    def test_26_two_exports_are_byte_identical(self):
        self.import_fixture()
        self.assertEqual(self.export().out_bytes, self.export().out_bytes)

    def test_26_a_context_section_survives_unchanged(self):
        self.import_fixture()
        self.assertIn(CONTEXT_SECTION, self.export().stdout)

    def test_26_the_frontmatter_survives_unchanged(self):
        self.import_fixture()
        self.assertIn(FRONTMATTER, self.export().stdout)

    def test_26_the_preamble_survives_unchanged(self):
        self.import_fixture()
        self.assertIn(PREAMBLE, self.export().stdout)

    def test_26_the_export_renders_all_four_state_marks(self):
        # The board builds the four states through the Store API. The CLI has
        # no path to the last two, so the test may not use it here.
        wanted = {}
        for state in ("open", "in_progress", "awaiting_verification", "done"):
            ticket = self.create_ticket(title="Ticket in %s" % state)
            self.force_state(ticket, state)
            self.assertEqual(self.ticket_state(ticket), state)
            wanted[ticket] = STATE_MARKS[state]

        text = self.export().stdout
        for ticket_id, mark in wanted.items():
            self.assertEqual(self.mark_of(text, ticket_id), mark)

    def test_26_an_unparsable_line_names_the_line_number(self):
        path = self.write_file("bad_plan.md", BAD_PLAN)
        payload = self.run_fail("plan", "import", "--file", path)
        self.assertEqual(payload.get("error"), "plan_parse_error")
        self.assertEqual(payload.get("line"), BAD_LINE_NUMBER)
        self.assertIn(str(BAD_LINE_NUMBER), payload.get("message", ""))

    def test_26_an_unparsable_line_imports_nothing(self):
        path = self.write_file("bad_plan.md", BAD_PLAN)
        self.run_fail("plan", "import", "--file", path)
        self.assertEqual(self.ticket_data(), [])


if __name__ == "__main__":
    unittest.main()
