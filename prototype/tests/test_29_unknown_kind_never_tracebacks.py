"""An unknown evidence kind must refuse cleanly on every path.

The CLI renders this refusal from the exception, not from the flags. Only
`attach-evidence` carries a `--kind` flag. `plan import` attaches its own
record kind and carries no such flag, so a refusal that read the flag raised
a second error inside the error handler and printed a traceback.
"""

import os

from cli_helpers import IMPORT_RECORD_KIND, CliTestCase

from helm_proto.store import Store


PLAN = (
    "## Phase 1: First — `open`\n"
    "\n"
    "- [ ] **Ticket A1: Alpha.** A body **Evaluate:** A test passes.\n"
)


class UnknownKindNeverTracebacks(CliTestCase):
    """The refusal names the kind, whatever subcommand raised it."""

    def bare_project(self):
        """Make a store that holds a project but registers no kind."""
        store = Store(self.db_path)
        store.create_project("/srv/proj/bare", "bare")
        store.close()

    def plan_file(self):
        """Write the plan document and return its path."""
        path = os.path.join(self.tmp.name, "plan.md")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(PLAN)
        return path

    def test_attach_evidence_names_the_unknown_kind(self):
        self.init()
        self.create_ticket()
        payload = self.run_fail(
            "attach-evidence", "--ticket", "1",
            "--kind", "builtin:not_a_real_kind", "--payload", "{}")
        self.assertEqual(payload["error"], "unknown_kind")
        self.assertEqual(payload["kind"], "builtin:not_a_real_kind")

    def test_plan_import_refuses_without_a_traceback(self):
        # run_fail asserts that stderr holds no traceback. That assertion is
        # the point of this test.
        self.bare_project()
        payload = self.run_fail("plan", "import", "--file", self.plan_file())
        self.assertEqual(payload["error"], "unknown_kind")

    def test_plan_import_names_the_record_kind_it_could_not_write(self):
        self.bare_project()
        payload = self.run_fail("plan", "import", "--file", self.plan_file())
        self.assertEqual(payload["kind"], IMPORT_RECORD_KIND)
        self.assertIn(IMPORT_RECORD_KIND, payload["message"])
