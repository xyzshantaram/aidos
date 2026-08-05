"""Item 20. The CLI always stores the author "agent". No flag changes it."""

import json
import unittest

from tests.cli_helpers import CLI_EVENT_TYPES, CliTestCase


class CliAuthorIsAgentTest(CliTestCase):
    def setUp(self):
        super().setUp()
        self.init()

    def cli_events(self):
        """Return the log records that the CLI itself creates."""
        store = self.read_store()
        try:
            return [
                event.fields for event in store.events()
                if event.fields["type"] in CLI_EVENT_TYPES
            ]
        finally:
            store.close()

    def test_20_ticket_author_is_agent(self):
        ticket = self.create_ticket()
        created = [
            fields for fields in self.cli_events()
            if fields["type"] == "ticket.created"
        ]
        self.assertEqual(len(created), 1)
        self.assertEqual(created[0]["ticket_id"], ticket)
        self.assertEqual(created[0]["actor"], "agent")

    def test_20_payload_author_key_does_not_change_the_stored_author(self):
        ticket = self.create_ticket()
        self.run_ok(
            "attach-evidence", "--ticket", str(ticket),
            "--kind", "builtin:test_run",
            "--payload", json.dumps({"author": "user", "note": "one"}))
        rows = self.evidence_rows(ticket)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["author"], "agent")

    def test_20_payload_actor_key_does_not_change_the_stored_author(self):
        ticket = self.create_ticket()
        self.run_ok(
            "attach-evidence", "--ticket", str(ticket),
            "--kind", "builtin:test_run",
            "--payload", json.dumps({"actor": "user", "note": "two"}))
        rows = self.evidence_rows(ticket)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["author"], "agent")

    def test_20_payload_is_stored_without_a_change(self):
        ticket = self.create_ticket()
        payload = {"author": "user", "actor": "user", "note": "three"}
        self.run_ok(
            "attach-evidence", "--ticket", str(ticket),
            "--kind", "builtin:test_run", "--payload", json.dumps(payload))
        rows = self.evidence_rows(ticket)
        self.assertEqual(rows[0]["payload"], payload)

    def test_20_author_and_actor_flags_are_rejected(self):
        ticket = self.create_ticket()
        commands = [
            ["create-ticket", "--title", "T", "--author", "user"],
            ["create-ticket", "--title", "T", "--actor", "user"],
            ["attach-evidence", "--ticket", str(ticket),
             "--kind", "builtin:test_run", "--author", "user"],
            ["attach-evidence", "--ticket", str(ticket),
             "--kind", "builtin:test_run", "--actor", "user"],
            ["move-ticket", "--ticket", str(ticket),
             "--to", "in_progress", "--actor", "user"],
        ]
        for command in commands:
            with self.subTest(command=command):
                result = self.run_cli(*command)
                self.assertNotEqual(result.code, 0, str(result))

    def test_20_every_cli_event_is_authored_by_agent(self):
        ticket = self.create_ticket()
        self.run_ok("set-ticket", "--ticket", str(ticket), "--title", "New")
        self.run_ok(
            "attach-evidence", "--ticket", str(ticket),
            "--kind", "builtin:test_run")
        self.run_fail("move-ticket", "--ticket", str(ticket),
                      "--to", "in_progress")
        self.attach_as_human(ticket, "builtin:user_signoff")
        self.run_ok("move-ticket", "--ticket", str(ticket),
                    "--to", "in_progress")

        seen = set()
        for fields in self.cli_events():
            if fields["type"] == "evidence.attached" and (
                    fields["kind_id"] == "builtin:user_signoff"):
                # The test attached this one through the Store API as a human.
                continue
            self.assertEqual(fields["actor"], "agent", str(fields))
            seen.add(fields["type"])
        self.assertEqual(seen, set(CLI_EVENT_TYPES))


if __name__ == "__main__":
    unittest.main()
