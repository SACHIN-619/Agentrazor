"""
metrics.py — Measured Recovery Ledger & Evaluation Analytics Engine.

Calculates exact financial metrics and held-out decision accuracy for RazorRecover.
"""

from typing import Dict, Any
try:
    from . import store, policy
except ImportError:
    import store, policy


def get_batch_metrics() -> Dict[str, Any]:
    """
    Computes batch recovery metrics from state.
    """
    cases = store.list_cases(include_closed=True)
    ledger = store.get_ledger()

    total_at_risk = 0.0
    total_recovered = 0.0
    total_pending = 0.0
    total_escalated = 0.0

    cases_count = len(cases)
    recovered_count = 0
    pending_count = 0
    escalated_count = 0

    scenario_metrics = {
        "payment_failure": {"at_risk": 0.0, "recovered": 0.0, "cases": 0, "recovered_cases": 0},
        "checkout_abandonment": {"at_risk": 0.0, "recovered": 0.0, "cases": 0, "recovered_cases": 0},
        "overdue_invoice": {"at_risk": 0.0, "recovered": 0.0, "cases": 0, "recovered_cases": 0},
        "promise_broken": {"at_risk": 0.0, "recovered": 0.0, "cases": 0, "recovered_cases": 0},
        "dispute": {"at_risk": 0.0, "recovered": 0.0, "cases": 0, "recovered_cases": 0},
    }

    # Accuracy check on held-out evaluation cases
    eval_total = 0
    eval_matches = 0

    for c in cases:
        amount = float(c.get("amount", 0))
        status = c.get("status", "open")
        outcome = c.get("outcome", "")
        scenario = c.get("scenario", "overdue_invoice")

        total_at_risk += amount
        if scenario in scenario_metrics:
            scenario_metrics[scenario]["at_risk"] += amount
            scenario_metrics[scenario]["cases"] += 1

        if status == "closed" and outcome == "recovered":
            rec_amt = float(c.get("recovered_amount", amount))
            total_recovered += rec_amt
            recovered_count += 1
            if scenario in scenario_metrics:
                scenario_metrics[scenario]["recovered"] += rec_amt
                scenario_metrics[scenario]["recovered_cases"] += 1

        elif status in ["escalated", "human_only"]:
            total_escalated += amount
            escalated_count += 1
        else:
            total_pending += amount
            pending_count += 1

        # Evaluate decision accuracy on held-out test split
        if c.get("is_held_out_eval") is True:
            eval_total += 1
            ground_truth = c.get("ground_truth", {})
            expected_tier = ground_truth.get("expected_tier")
            assigned_tier = c.get("authority_tier")
            if expected_tier is not None and assigned_tier == expected_tier:
                eval_matches += 1

    recovery_rate = (total_recovered / total_at_risk * 100.0) if total_at_risk > 0 else 0.0
    eval_accuracy = (eval_matches / eval_total * 100.0) if eval_total > 0 else 100.0

    return {
        "mode": "Measured Simulated Revenue Recovered in Razorpay Test Mode",
        "total_at_risk": round(total_at_risk, 2),
        "total_recovered": round(total_recovered, 2),
        "recovery_rate_percent": round(recovery_rate, 1),
        "total_pending": round(total_pending, 2),
        "total_escalated": round(total_escalated, 2),
        "cases_count": cases_count,
        "recovered_count": recovered_count,
        "pending_count": pending_count,
        "escalated_count": escalated_count,
        "held_out_evaluation": {
            "total_eval_cases": eval_total,
            "correct_tier_decisions": eval_matches,
            "decision_accuracy_percent": round(eval_accuracy, 1)
        },
        "breakdown_by_scenario": scenario_metrics,
        "ledger_entries_count": len(ledger)
    }
