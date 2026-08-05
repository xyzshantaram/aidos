"""Item 25. Every subcommand prints JSON, on success and on failure.

`plan export` is the one exception. It prints markdown.
"""

import json
import unittest

from tests.cli_helpers import CliTestCase

# A short plan document. test_26 holds the document that exercises the whole
# format. This one only has to import without an error.
SMALL_PLAN = """## Phase 1: Only phase \u2014 `open`

- [ ] **Ticket 1: Do the work.** A body. **Evaluate:** The work is done.
"""

# Every subcommand that must obey the JSON rule.
JSON_SUBCOMMANDS = {
    "init",
    "create-ticket",
    "set-ticket",
    "attach-evidence",
    "move-ticket",
    "show",
    "list",
    "plan import",
}


class EverySubcommandPrintsJsonTest(CliTestCase):
    def setUp(self):
        super().setUp()
        self.init()
        self.ticket = self.create_ticket()
        self.plan_path = self.write_file("small_plan.md", SMALL_PLAN)

    def test_25_every_subcommand_prints_json_on_success(self):
        # A fresh database for the import, because an import needs an empty
        # project and this test database already holds a ticket.
        other_db = self.temp_path("other.sqlite")
        self.init(db=other_db)
        self.attach_as_human(self.ticket, "builtin:user_signoff")

        runs = [
            ("init", ["init", "--project-path", "/srv/proj/cli"], None),
            ("create-ticket", ["create-ticket", "--title", "Second"], None),
            ("show", ["show", "--ticket", str(self.ticket)], None),
            ("list", ["list"], None),
            ("set-ticket",
             ["set-ticket", "--ticket", str(self.ticket), "--title", "New"],
             None),
            ("attach-evidence",
             ["attach-evidence", "--ticket", str(self.ticket),
              "--kind", "builtin:test_run"], None),
            ("move-ticket",
             ["move-ticket", "--ticket", str(self.ticket),
              "--to", "in_progress"], None),
            ("plan import",
             ["plan", "import", "--file", self.plan_path], other_db),
        ]
        seen = set()
        for name, command, db in runs:
            with self.subTest(subcommand=name):
                payload = self.run_ok(*command, db=db)
                self.assertIs(payload.get("ok"), True, str(payload))
                seen.add(name)
        self.assertEqual(seen, JSON_SUBCOMMANDS)

    def test_25_every_failure_prints_json(self):
        missing_file = self.temp_path("absent_plan.md")
        runs = [
            ("show", ["show", "--ticket", "999"]),
            ("set-ticket", ["set-ticket", "--ticket", "999", "--title", "X"]),
            ("create-ticket",
             ["create-ticket", "--title", "T", "--project", "999"]),
            ("list", ["list", "--project", "999"]),
            ("attach-evidence",
             ["attach-evidence", "--ticket", str(self.ticket),
              "--kind", "builtin:no_such_kind"]),
            ("attach-evidence",
             ["attach-evidence", "--ticket", str(self.ticket),
              "--kind", "builtin:user_signoff"]),
            ("attach-evidence",
             ["attach-evidence", "--ticket", str(self.ticket),
              "--kind", "builtin:test_run", "--payload", "not json"]),
            ("move-ticket",
             ["move-ticket", "--ticket", str(self.ticket), "--to", "done"]),
            ("plan import", ["plan", "import", "--file", missing_file]),
            ("plan import", ["plan", "import", "--file", self.plan_path]),
        ]
        seen = set()
        for name, command in runs:
            with self.subTest(command=command):
                payload = self.run_fail(*command)
                self.assertIn("message", payload, str(payload))
                seen.add(name)
        self.assertEqual(seen, JSON_SUBCOMMANDS - {"init"})

    def test_25_an_import_into_a_used_project_names_the_reason(self):
        payload = self.run_fail("plan", "import", "--file", self.plan_path)
        self.assertEqual(payload.get("error"), "project_not_empty")

    def test_25_plan_export_prints_markdown(self):
        result = self.run_cli("plan", "export")
        self.assertEqual(result.code, 0, str(result))
        with self.assertRaises(ValueError):
            json.loads(result.stdout)
        self.assertIn("Ticket one", result.stdout)
        headings = [
            line for line in result.stdout.splitlines()
            if line.startswith("## Phase ")
        ]
        self.assertEqual(len(headings), 1, str(result))


if __name__ == "__main__":
    unittest.main()
