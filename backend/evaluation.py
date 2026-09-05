"""
evaluation.py — Batch Evaluation Dataset Generator & Accuracy Evaluator for RazorRecover.

Provides isolated evaluation dataset generation, held-out accuracy testing,
and false positive/negative cost metrics for Razorpay Hackathon judging.
"""

import os
import json
import random
import time
from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List

try:
    from . import store, policy, agent
except ImportError:
    import store, policy, agent

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
EVAL_CASES_FILE = os.path.join(DATA_DIR, "eval_cases.json")
EVAL_RESULTS_FILE = os.path.join(DATA_DIR, "eval_results.json")

os.makedirs(DATA_DIR, exist_ok=True)


def generate_evaluation_dataset(total_cases: int = 60, dev_split_ratio: float = 0.67) -> Dict[str, Any]:
    """
    Generates synthetic evaluation cases labeled with ground truth expected decisions.
    Splits into Development Cases (e.g. 40) and Held-Out Evaluation Cases (e.g. 20).
    """
    clients = store._load_json(os.path.join(DATA_DIR, "clients.json"), [])
    if not clients:
        # Generate baseline clients if needed
        from seed_data import CLIENT_NAMES
        clients = [
            {
                "client_id": f"cli_{idx:03d}",
                "client_name": name,
                "client_email": email,
                "relationship_tier": tier,
                "avg_days_to_pay": random.randint(12, 45),
                "total_invoices_paid": random.randint(5, 30),
                "promises_kept_ratio": round(random.uniform(0.7, 0.98), 2)
            }
            for idx, (name, email, tier) in enumerate(CLIENT_NAMES, start=1)
        ]
        store._save_json(os.path.join(DATA_DIR, "clients.json"), clients)

    today = date.today()
    scenarios = ["payment_failure", "checkout_abandonment", "overdue_invoice", "promise_broken", "dispute"]
    eval_cases = []

    num_dev = int(total_cases * dev_split_ratio)  # e.g., 40

    for idx in range(1, total_cases + 1):
        case_id = f"EVAL-{1000 + idx}"
        client = random.choice(clients)
        scenario = scenarios[(idx - 1) % len(scenarios)]
        is_held_out = idx > num_dev  # True for 20 cases

        amount = 0.0
        disputed_amount = 0.0
        exception_type = "overdue"
        expected_tier = 1

        if scenario == "payment_failure":
            amount = round(random.choice([1800, 3200, 4800, 8500, 14000]), 2)
            exception_type = "payment_failed"
            expected_tier = 2 if amount >= 5000 else 1

        elif scenario == "checkout_abandonment":
            amount = round(random.choice([1500, 2900, 4500, 6800]), 2)
            exception_type = "checkout_abandoned"
            expected_tier = 2 if amount >= 5000 else 1

        elif scenario == "overdue_invoice":
            amount = round(random.choice([3500, 7500, 18000, 35000]), 2)
            exception_type = "invoice_overdue"
            expected_tier = 2 if amount >= 5000 else 1

        elif scenario == "promise_broken":
            amount = round(random.choice([4800, 9200, 22000]), 2)
            exception_type = "promise_broken"
            expected_tier = 2  # broken promise requires Tier 2 review

        elif scenario == "dispute":
            amount = round(random.choice([15000, 35000, 65000]), 2)
            is_full = (idx % 2 == 0)
            if is_full:
                exception_type = "dispute_full"
                disputed_amount = amount
                expected_tier = 3
            else:
                exception_type = "dispute_partial"
                disputed_amount = round(amount * 0.35, 2)
                expected_tier = 2 if disputed_amount < 10000 else 3

        created_days_ago = random.randint(3, 20)
        created_date = (today - timedelta(days=created_days_ago)).isoformat()

        eval_case = {
            "case_id": case_id,
            "invoice_number": f"INV-EVAL-{202600 + idx}",
            "environment": "evaluation",
            "is_held_out_eval": is_held_out,
            "client_id": client["client_id"],
            "client_name": client["client_name"],
            "client_email": client["client_email"],
            "amount": amount,
            "disputed_amount": disputed_amount,
            "scenario": scenario,
            "exception_type": exception_type,
            "authority_tier": expected_tier,
            "contact_count": 0 if scenario in ["payment_failure", "checkout_abandonment"] else random.randint(1, 2),
            "retry_count": 0,
            "status": "open",
            "outcome": None,
            "ground_truth": {
                "expected_tier": expected_tier,
                "expected_action": "payment_link" if scenario in ["payment_failure", "checkout_abandonment"] else "followup",
                "recoverable": scenario != "dispute_full"
            },
            "history": [
                {
                    "timestamp": f"{created_date} 09:00:00",
                    "event": f"Evaluation signal generated ({scenario}). Amount at risk: ₹{amount:,.2f}",
                    "type": "signal_detected"
                }
            ],
            "created_at": f"{created_date}T09:00:00Z"
        }

        eval_cases.append(eval_case)

    # Save evaluation dataset
    store._save_json(EVAL_CASES_FILE, eval_cases)
    # Also merge into main store cases with environment="evaluation"
    main_cases = store.list_cases(include_closed=True)
    non_eval_cases = [c for c in main_cases if c.get("environment") != "evaluation"]
    store._save_json(store.CASES_FILE, non_eval_cases + eval_cases)

    return {
        "success": True,
        "total_generated": total_cases,
        "dev_cases": num_dev,
        "held_out_cases": total_cases - num_dev
    }


def run_batch_evaluation() -> Dict[str, Any]:
    """
    Runs agent evaluation cycle over held-out dataset and computes decision accuracy,
    false positives (over-autonomous actions), and false negatives (missed recoveries).
    """
    eval_cases = store._load_json(EVAL_CASES_FILE, [])
    if not eval_cases:
        generate_evaluation_dataset(60)
        eval_cases = store._load_json(EVAL_CASES_FILE, [])

    run_id = f"EVAL-RUN-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    total_eval = len(eval_cases)
    held_out_cases = [c for c in eval_cases if c.get("is_held_out_eval") is True]
    held_out_count = len(held_out_cases)

    total_at_risk = sum(c.get("amount", 0) for c in eval_cases)
    total_recovered = 0.0

    tier1_count = 0
    tier2_count = 0
    tier3_count = 0

    correct_decisions = 0
    false_positives = 0  # Agent executed Tier 1 when Tier 2/3 expected
    false_negatives = 0  # Agent escalated Tier 3 when Tier 1 expected

    evaluated_details = []

    for case in eval_cases:
        case_id = case["case_id"]
        amount = float(case.get("amount", 0))
        ground_truth = case.get("ground_truth", {})
        expected_tier = ground_truth.get("expected_tier")

        # Deterministic Policy Gate Evaluation
        assigned_tier = policy.required_tier(case)

        # Accuracy Check
        if assigned_tier == expected_tier:
            correct_decisions += 1
        elif assigned_tier < expected_tier:
            false_positives += 1
        else:
            false_negatives += 1

        # Simulate Execution
        if assigned_tier == 1:
            tier1_count += 1
            if case.get("scenario") in ["payment_failure", "checkout_abandonment"]:
                total_recovered += amount
                case["status"] = "closed"
                case["outcome"] = "recovered"
                case["recovered_amount"] = amount
        elif assigned_tier == 2:
            tier2_count += 1
            case["status"] = "pending_approval"
        else:
            tier3_count += 1
            case["status"] = "escalated"

        evaluated_details.append({
            "case_id": case_id,
            "scenario": case.get("scenario"),
            "amount": amount,
            "assigned_tier": assigned_tier,
            "expected_tier": expected_tier,
            "pass": assigned_tier == expected_tier
        })

    recovery_rate = (total_recovered / total_at_risk * 100.0) if total_at_risk > 0 else 0.0
    overall_accuracy = (correct_decisions / total_eval * 100.0) if total_eval > 0 else 100.0

    # Correctly compute held-out accuracy from actual held-out evaluated cases
    held_out_details = [d for d in evaluated_details if d["case_id"].startswith("EVAL-") and
                        any(c.get("case_id") == d["case_id"] and c.get("is_held_out_eval") for c in eval_cases)]
    held_out_correct = sum(1 for d in held_out_details if d.get("pass"))
    held_out_count_actual = len(held_out_details) if held_out_details else held_out_count
    held_out_accuracy = (held_out_correct / held_out_count_actual * 100.0) if held_out_count_actual > 0 else 100.0

    results = {
        "run_id": run_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cases_evaluated": total_eval,
        "held_out_count": held_out_count,
        "total_at_risk": round(total_at_risk, 2),
        "total_recovered": round(total_recovered, 2),
        "recovery_rate_percent": round(recovery_rate, 1),
        "tier1_autonomous_count": tier1_count,
        "tier2_approval_count": tier2_count,
        "tier3_escalation_count": tier3_count,
        "overall_accuracy_percent": round(overall_accuracy, 1),
        "held_out_accuracy_percent": round(held_out_accuracy, 1),
        "false_positives_count": false_positives,
        "false_negatives_count": false_negatives,
        "details": evaluated_details
    }

    store._save_json(EVAL_RESULTS_FILE, results)
    return results


def get_evaluation_results() -> Dict[str, Any]:
    return store._load_json(EVAL_RESULTS_FILE, run_batch_evaluation())
