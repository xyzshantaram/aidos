"""Item 32. tickets_page returns one page plus the total count.

Each row carries the get_ticket fields plus a score and a
gate_fraction. The tests compare the page score against
confidence_score, because the score is advisory. The total counts
matching tickets before limit and offset apply.
"""

import unittest

from aidos_proto.store import STATE_ORDER
from tests.helpers import make_store


class TicketsPageTest(unittest.TestCase):
    """The page shape, the total, and the score column."""

    def _store_with_tickets(self, count):
        """Return a store holding one project with the given ticket count."""
        store = make_store()
        project = store.create_project("/srv/proj/page", "page")
        for index in range(count):
            store.create_ticket(
                project, "Ticket %d" % index, "A description.")
        return store

    def test_32_a_page_of_twenty_returns_twenty_rows(self):
        """A page of twenty rows keeps the full count in the total."""
        store = self._store_with_tickets(25)
        page, total = store.tickets_page(limit=20, offset=0)
        self.assertEqual(len(page), 20)
        self.assertEqual(total, 25)

    def test_32_every_row_score_matches_the_confidence_oracle(self):
        """The page score equals confidence_score for every row."""
        store = make_store([
            ("kind_a", "Kind A", "The first kind.", 1.0),
            ("kind_b", "Kind B", "The second kind.", 2.0),
        ])
        project = store.create_project("/srv/proj/score", "score")
        first = store.create_ticket(project, "T1", "One.")
        second = store.create_ticket(project, "T2", "Two.")
        store.create_ticket(project, "T3", "Three.")
        store.attach_evidence(first, "kind_a", {"n": 1}, actor="user")
        store.attach_evidence(first, "kind_b", {"n": 2}, actor="user")
        store.attach_evidence(first, "kind_a", {"n": 3}, actor="agent")
        store.attach_evidence(second, "kind_a", {"n": 4}, actor="user")
        store.attach_evidence(second, "kind_a", {"n": 5}, actor="user")
        page, _ = store.tickets_page()
        for row in page:
            self.assertEqual(
                row["score"], store.confidence_score(row["id"]))

    def test_32_score_sort_and_gate_fraction_sort_disagree(self):
        """The two sort keys order the same tickets differently."""
        store = make_store([
            ("kind_a", "Kind A", "The first kind.", 1.0),
            ("kind_b", "Kind B", "The second kind.", 1.0),
            ("kind_c", "Kind C", "The heavy kind.", 10.0),
        ])
        store.set_gate("open", "in_progress",
                       ["kind_a", "kind_b"], ["user"])
        project = store.create_project("/srv/proj/sort", "sort")
        high_score = store.create_ticket(project, "T1", "One.")
        low_score = store.create_ticket(project, "T2", "Two.")
        store.attach_evidence(high_score, "kind_b", {"n": 1})
        store.attach_evidence(high_score, "kind_c", {"n": 2})
        store.attach_evidence(low_score, "kind_a", {"n": 3})
        store.attach_evidence(low_score, "kind_b", {"n": 4})
        by_score = [row["id"] for row in
                    store.tickets_page(sort="score")[0]]
        by_fraction = [row["id"] for row in
                       store.tickets_page(sort="gate_fraction")[0]]
        self.assertNotEqual(by_score, by_fraction)

    def test_32_project_filter_limits_rows_and_total(self):
        """A project filter narrows both the page and the total."""
        store = make_store()
        alpha = store.create_project("/srv/proj/a", "Alpha")
        beta = store.create_project("/srv/proj/b", "Beta")
        for index in range(3):
            store.create_ticket(alpha, "A%d" % index, "Desc.")
        for index in range(2):
            store.create_ticket(beta, "B%d" % index, "Desc.")
        page, total = store.tickets_page(project_id=alpha)
        self.assertEqual(len(page), 3)
        self.assertEqual(total, 3)
        for row in page:
            self.assertEqual(row["project_id"], alpha)
        _, beta_total = store.tickets_page(project_id=beta)
        self.assertEqual(beta_total, 2)

    def test_32_walking_offsets_visits_every_ticket_once(self):
        """Moving the offset covers the whole set with no duplicate."""
        store = self._store_with_tickets(7)
        ids = sorted(store.tickets)
        collected = []
        offset = 0
        while len(collected) < len(ids):
            page, _ = store.tickets_page(limit=3, offset=offset)
            collected.extend(row["id"] for row in page)
            offset += 3
        self.assertEqual(sorted(collected), ids)

    def test_32_an_unknown_sort_key_is_refused(self):
        """An unknown sort key raises ValueError."""
        store = self._store_with_tickets(2)
        with self.assertRaises(ValueError):
            store.tickets_page(sort="unknown")

    def test_32_descending_reverses_the_id_order(self):
        """Descending order is the reverse of ascending order."""
        store = self._store_with_tickets(5)
        ascending = [row["id"] for row in
                     store.tickets_page(sort="id", descending=False)[0]]
        descending = [row["id"] for row in
                      store.tickets_page(sort="id", descending=True)[0]]
        self.assertEqual(descending, list(reversed(ascending)))


class GateFractionTest(unittest.TestCase):
    """The gate_fraction column for each gate situation."""

    def _set_forward_gates(self, store, required):
        """Set one gate on every forward transition."""
        for from_state, to_state in (
                ("open", "in_progress"),
                ("in_progress", "awaiting_verification"),
                ("awaiting_verification", "done")):
            store.set_gate(from_state, to_state, required, ["user"])

    def _page_first_row(self, store):
        """Return the only row of the only ticket in the store."""
        page, _ = store.tickets_page()
        self.assertEqual(len(page), 1)
        return page[0]

    def test_32_a_done_ticket_has_no_gate_fraction(self):
        """A ticket in done has no forward gate to satisfy."""
        store = make_store()
        self._set_forward_gates(store, ["builtin:user_signoff"])
        project = store.create_project("/srv/proj/done", "done")
        ticket = store.create_ticket(project, "T", "A description.")
        store.attach_evidence(
            ticket, "builtin:user_signoff", {"n": 1}, actor="user")
        store.move_ticket(ticket, "in_progress", actor="user")
        store.move_ticket(ticket, "awaiting_verification", actor="user")
        store.move_ticket(ticket, "done", actor="user")
        row = self._page_first_row(store)
        self.assertEqual(row["state"], "done")
        self.assertIsNone(row["gate_fraction"])

    def test_32_a_missing_forward_gate_has_no_gate_fraction(self):
        """A gate on another transition leaves the fraction None."""
        store = make_store()
        store.set_gate("open", "review",
                       ["builtin:user_signoff"], ["user"])
        project = store.create_project("/srv/proj/gate", "gate")
        store.create_ticket(project, "T", "A description.")
        row = self._page_first_row(store)
        self.assertEqual(row["state"], "open")
        self.assertIsNone(row["gate_fraction"])

    def test_32_a_gate_with_no_required_kinds_is_one(self):
        """An empty gate gives a fraction of one."""
        store = make_store()
        self._set_forward_gates(store, [])
        project = store.create_project("/srv/proj/empty", "empty")
        store.create_ticket(project, "T", "A description.")
        self.assertEqual(self._page_first_row(store)["gate_fraction"], 1.0)

    def test_32_every_required_kind_gives_one(self):
        """A full evidence set gives a fraction of one."""
        store = make_store()
        self._set_forward_gates(
            store, ["builtin:user_signoff", "builtin:eval_criteria"])
        project = store.create_project("/srv/proj/full", "full")
        ticket = store.create_ticket(project, "T", "A description.")
        store.attach_evidence(
            ticket, "builtin:user_signoff", {"n": 1}, actor="user")
        store.attach_evidence(
            ticket, "builtin:eval_criteria", {"n": 2}, actor="user")
        self.assertEqual(self._page_first_row(store)["gate_fraction"], 1.0)

    def test_32_some_required_kinds_give_a_partial_fraction(self):
        """A partial evidence set gives a fraction between zero and one."""
        store = make_store()
        self._set_forward_gates(
            store, ["builtin:user_signoff", "builtin:eval_criteria"])
        project = store.create_project("/srv/proj/partial", "partial")
        ticket = store.create_ticket(project, "T", "A description.")
        store.attach_evidence(
            ticket, "builtin:user_signoff", {"n": 1}, actor="user")
        fraction = self._page_first_row(store)["gate_fraction"]
        self.assertGreater(fraction, 0.0)
        self.assertLess(fraction, 1.0)


class ForwardTransitionCoverageTest(unittest.TestCase):
    """Every forward transition in STATE_ORDER yields a fraction.

    The gate fraction SQL is generated from STATE_ORDER. Without this
    test the contents of that tuple are not pinned. Dropping the last
    state left the suite green, because no other test reached the gate
    from awaiting_verification to done.
    """

    # One required kind per forward transition, so an earlier kind
    # cannot satisfy a later gate.
    GATE_KINDS = ("builtin:user_signoff", "builtin:agent_report",
                  "builtin:after_shot")

    def _transitions(self):
        """Return each forward step paired with the kind its gate needs."""
        self.assertEqual(
            len(self.GATE_KINDS), len(STATE_ORDER) - 1,
            "GATE_KINDS must supply one kind per forward transition")
        return list(zip(STATE_ORDER, STATE_ORDER[1:], self.GATE_KINDS))

    def _fraction(self, store, ticket_id):
        rows, _ = store.tickets_page(limit=10)
        return {row["id"]: row["gate_fraction"] for row in rows}[ticket_id]

    def test_32_every_state_before_the_last_reports_a_fraction(self):
        store = make_store()
        for state, following, kind_id in self._transitions():
            store.set_gate(state, following, [kind_id], ["user"])
        project = store.create_project("/srv/proj/walk", "walk")
        ticket = store.create_ticket(project, "Walker", "A description.")

        for state, following, kind_id in self._transitions():
            self.assertEqual(store.get_ticket(ticket)["state"], state)
            self.assertEqual(self._fraction(store, ticket), 0.0)
            store.attach_evidence(ticket, kind_id, {"ok": True},
                                  actor="user")
            self.assertEqual(self._fraction(store, ticket), 1.0)
            store.move_ticket(ticket, following, actor="user")

        self.assertEqual(
            store.get_ticket(ticket)["state"], STATE_ORDER[-1])
        self.assertIsNone(self._fraction(store, ticket))


if __name__ == "__main__":
    unittest.main()
