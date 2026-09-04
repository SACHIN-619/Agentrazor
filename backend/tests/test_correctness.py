"""
test_correctness.py — Unit & Integration Test Suite for RazorRecover Backend.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from policy import required_tier, explain_tier, check_idempotency
from seed_data import seed_database
from store import list_cases, get_case, store_promise, check_promise_status, split_disputed_amount, verify_and_close, list_pending_approvals, approve_and_send_draft
from agent import run_agent_cycle
from metrics import get_batch_metrics


class TestRazorRecoverBackend(unittest.TestCase):

    def setUp(self):
        # Reset and seed database before tests
        from seed_data import seed_database
        seed_database(60)

    def test_policy_tiers(self):
        # Tier 1 case
        t1_case = {"amount": 2500.0, "exception_type": "payment_failed", "disputed_amount": 0}
        self.assertEqual(required_tier(t1_case), 1)

        # Tier 2 case (amount >= 5000)
        t2_case = {"amount": 8000.0, "exception_type": "invoice_overdue", "disputed_amount": 0}
        self.assertEqual(required_tier(t2_case), 2)

        # Tier 2 case (broken promise)
        t2_promise = {"amount": 3000.0, "exception_type": "promise_broken", "disputed_amount": 0}
        self.assertEqual(required_tier(t2_promise), 2)

        # Tier 3 case (full dispute)
        t3_dispute = {"amount": 15000.0, "exception_type": "dispute_full", "disputed_amount": 15000.0}
        self.assertEqual(required_tier(t3_dispute), 3)

    def test_idempotency_safeguard(self):
        import time
        now = time.time()
        history = [
            {"action_type": "recovery_action", "timestamp_epoch": now - 100},
            {"action_type": "recovery_action", "timestamp_epoch": now - 50}
        ]
        is_safe, reason = check_idempotency("RR-1001", "recovery_action", history)
        self.assertFalse(is_safe)

    def test_dispute_split(self):
        res = split_disputed_amount("RR-1005", 2000.0, "Late delivery penalty")
        self.assertIn("status", res)

    def test_agent_run_cycle(self):
        summary = run_agent_cycle()
        self.assertIn("run_id", summary)
        self.assertGreater(summary["cases_evaluated"], 0)

    def test_batch_metrics(self):
        m = get_batch_metrics()
        self.assertGreater(m["total_at_risk"], 0)
        self.assertIn("held_out_evaluation", m)
        self.assertGreaterEqual(m["held_out_evaluation"]["decision_accuracy_percent"], 80.0)


if __name__ == "__main__":
    unittest.main()
