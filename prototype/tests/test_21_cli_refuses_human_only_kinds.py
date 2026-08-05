"""Item 21. The CLI refuses to author the two kinds that only a human gives."""

import unittest

from tests.cli_helpers import AGENT_KINDS, HUMAN_ONLY_KINDS, CliTestCase


class CliRefusesHumanOnlyKindsTest(CliTestCase):
    def setUp(self):
        super().setUp()
        self.init()
        self.ticket = self.create_ticket()

    def attach(self, kind_id):
        """Ask the CLI to attach one kind. Return the completed run."""
        return self.run_cli(
            "attach-evidence", "--ticket", str(self.ticket), "--kind", kind_id)

    def test_21_user_signoff_is_refused(self):
        result = self.attach("builtin:user_signoff")
        self.assertNotEqual(result.code, 0, str(result))
        payload = self.parse_json(result)
        self.assertIs(payload.get("ok"), False, str(result))

    def test_21_user_verified_is_refused(self):
        result = self.attach("builtin:user_verified")
        self.assertNotEqual(result.code, 0, str(result))
        payload = self.parse_json(result)
        self.assertIs(payload.get("ok"), False, str(result))

    def test_21_the_refusal_names_the_kind(self):
        for kind_id in HUMAN_ONLY_KINDS:
            with self.subTest(kind=kind_id):
                payload = self.run_fail(
                    "attach-evidence", "--ticket", str(self.ticket),
                    "--kind", kind_id)
                self.assertEqual(payload.get("kind"), kind_id)
                self.assertIn(kind_id, payload.get("message", ""))

    def test_21_the_refusal_says_a_human_must_supply_the_kind(self):
        for kind_id in HUMAN_ONLY_KINDS:
            with self.subTest(kind=kind_id):
                payload = self.run_fail(
                    "attach-evidence", "--ticket", str(self.ticket),
                    "--kind", kind_id)
                message = payload.get("message", "").lower()
                self.assertIn("human", message)
                self.assertIn("must", message)

    def test_21_a_refused_kind_stores_no_evidence(self):
        for kind_id in HUMAN_ONLY_KINDS:
            self.run_fail(
                "attach-evidence", "--ticket", str(self.ticket),
                "--kind", kind_id)
        self.assertEqual(self.evidence_rows(self.ticket), [])

    def test_21_the_other_builtin_kinds_are_accepted(self):
        for kind_id in AGENT_KINDS:
            with self.subTest(kind=kind_id):
                self.run_ok(
                    "attach-evidence", "--ticket", str(self.ticket),
                    "--kind", kind_id)
        attached = [row["kind_id"] for row in self.evidence_rows(self.ticket)]
        self.assertCountEqual(attached, AGENT_KINDS)


if __name__ == "__main__":
    unittest.main()
