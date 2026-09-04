"""
seed_data.py — 60-Case Evaluation Batch Generator for RazorRecover.

Generates 60 synthetic revenue risk cases (40 dev / 20 held-out evaluation)
labeled with ground-truth expected decisions to verify agent accuracy.
"""

import os
import json
import random
from datetime import datetime, date, timedelta, timezone

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CASES_FILE = os.path.join(DATA_DIR, "cases.json")
CLIENTS_FILE = os.path.join(DATA_DIR, "clients.json")
LEDGER_FILE = os.path.join(DATA_DIR, "ledger.json")
RUNS_FILE = os.path.join(DATA_DIR, "runs.json")

os.makedirs(DATA_DIR, exist_ok=True)

CLIENT_NAMES = [
    ("Acme Corp", "finance@acme.com", "Tier A Enterprise"),
    ("Nova Labs", "accounts@novalabs.io", "Tier B Growth"),
    ("Orbit Tech", "billing@orbittech.com", "Tier A Enterprise"),
    ("Nexus Systems", "pay@nexussystems.com", "Tier C Standard"),
    ("Apex Dynamics", "invoice@apexdynamics.org", "Tier B Growth"),
    ("Starlight Retail", "vendor@starlight.in", "Tier C Standard"),
    ("Zenith Health", "ap@zenithhealth.com", "Tier A Enterprise"),
    ("Vortex Media", "finance@vortexmedia.in", "Tier B Growth"),
    ("Pulse Logistics", "accounts@pulselogistics.com", "Tier C Standard"),
    ("Hyperion AI", "billing@hyperionai.com", "Tier A Enterprise"),
]

SCENARIOS = [
    "payment_failure",
    "checkout_abandonment",
    "overdue_invoice",
    "promise_broken",
    "dispute"
]


def seed_database(num_cases: int = 60):
    cases = []
    clients = []

    # Create clients
    for idx, (name, email, tier) in enumerate(CLIENT_NAMES, start=1):
        clients.append({
            "client_id": f"cli_{idx:03d}",
            "client_name": name,
            "client_email": email,
            "relationship_tier": tier,
            "avg_days_to_pay": random.randint(12, 45),
            "total_invoices_paid": random.randint(5, 30),
            "promises_kept_ratio": round(random.uniform(0.7, 0.98), 2)
        })

    today = date.today()

    for idx in range(1, num_cases + 1):
        case_id = f"RR-{1000 + idx}"
        client = random.choice(clients)
        scenario = SCENARIOS[(idx - 1) % len(SCENARIOS)]

        # 40 dev cases (1..40), 20 held-out evaluation cases (41..60)
        is_eval = idx > 40

        amount = 0.0
        disputed_amount = 0.0
        exception_type = "overdue"
        authority_tier = 1
        expected_tier = 1

        if scenario == "payment_failure":
            amount = round(random.choice([1500, 2800, 4200, 7500, 12000]), 2)
            exception_type = "payment_failed"
            expected_tier = 2 if amount >= 5000 else 1

        elif scenario == "checkout_abandonment":
            amount = round(random.choice([1200, 2500, 3800, 4800, 6500]), 2)
            exception_type = "checkout_abandoned"
            expected_tier = 2 if amount >= 5000 else 1

        elif scenario == "overdue_invoice":
            amount = round(random.choice([3500, 6500, 15000, 28000, 45000]), 2)
            exception_type = "invoice_overdue"
            expected_tier = 2 if amount >= 5000 else 1

        elif scenario == "promise_broken":
            amount = round(random.choice([4500, 8500, 18000, 32000]), 2)
            exception_type = "promise_broken"
            expected_tier = 2  # broken promises always require Tier 2 review

        elif scenario == "dispute":
            amount = round(random.choice([12000, 25000, 50000, 85000]), 2)
            is_full = (idx % 2 == 0)
            if is_full:
                exception_type = "dispute_full"
                disputed_amount = amount
                expected_tier = 3  # full dispute -> Tier 3
            else:
                exception_type = "dispute_partial"
                disputed_amount = round(amount * 0.3, 2)
                expected_tier = 2 if disputed_amount < 10000 else 3

        authority_tier = expected_tier

        # Case History
        created_days_ago = random.randint(5, 25)
        created_date = (today - timedelta(days=created_days_ago)).isoformat()

        case_obj = {
            "case_id": case_id,
            "invoice_number": f"INV-{202600 + idx}",
            "client_id": client["client_id"],
            "client_name": client["client_name"],
            "client_email": client["client_email"],
            "amount": amount,
            "disputed_amount": disputed_amount,
            "scenario": scenario,
            "exception_type": exception_type,
            "authority_tier": authority_tier,
            "contact_count": 0 if scenario in ["payment_failure", "checkout_abandonment"] else random.randint(1, 2),
            "retry_count": 0,
            "status": "open",
            "outcome": None,
            "is_held_out_eval": is_eval,
            "ground_truth": {
                "expected_tier": expected_tier,
                "expected_action": "payment_link" if scenario in ["payment_failure", "checkout_abandonment"] else "followup",
                "recoverable": scenario != "dispute_full"
            },
            "history": [
                {
                    "timestamp": f"{created_date} 10:00:00",
                    "event": f"Revenue signal detected ({scenario.replace('_', ' ').title()}). Amount at risk: ₹{amount:,.2f}",
                    "type": "signal_detected"
                }
            ],
            "created_at": f"{created_date}T10:00:00Z",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        # Add pre-existing payment promise if promise_broken scenario
        if scenario == "promise_broken":
            past_promise_date = (today - timedelta(days=2)).isoformat()
            case_obj["promise_date"] = past_promise_date
            case_obj["promise_text"] = "We will initiate bank transfer by Friday."
            case_obj["history"].append({
                "timestamp": f"{(today - timedelta(days=5)).isoformat()} 14:30:00",
                "event": f"Client promised payment by {past_promise_date}: 'We will initiate bank transfer by Friday.'",
                "type": "promise_recorded"
            })

        cases.append(case_obj)

    # Save to files
    with open(CASES_FILE, "w", encoding="utf-8") as f:
        json.dump(cases, f, indent=2)

    with open(CLIENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(clients, f, indent=2)

    with open(LEDGER_FILE, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)

    with open(RUNS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)

    print(f"[seed_data] Successfully seeded 60 cases (40 dev / 20 held-out evaluation) into {DATA_DIR}")


if __name__ == "__main__":
    seed_database()
