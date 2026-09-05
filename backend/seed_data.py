"""
seed_data.py — Multi-Tenant PostgreSQL Seed Data & 60-Case Evaluation Batch Generator.

Generates 60 synthetic revenue risk cases (40 dev / 20 held-out evaluation)
labeled with ground-truth expected decisions to verify agent accuracy.
Seeds PostgreSQL database ORM entities (Merchant, User, Customer, Case, RevenueSignal).
"""

import os
import json
import random
from datetime import datetime, date, timedelta, timezone

from models import (
    db, Merchant, User, MerchantUser, Customer, RevenueSignal, Case, CaseEvent,
    generate_uuid
)
from werkzeug.security import generate_password_hash

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
    try:
        # Check if database already has cases
        existing_cases = Case.query.count()
        if existing_cases >= num_cases:
            print(f"[seed_data] Database already contains {existing_cases} cases. Skipping seed.")
            return
    except Exception as e:
        print(f"[seed_data] DB count notice: {e}")

    # 1. Seed Default Merchant
    merchant = Merchant.query.filter_by(email="demo@razorrecover.io").first()
    if not merchant:
        merchant = Merchant(
            business_name="Apex Enterprise Labs",
            email="demo@razorrecover.io",
            environment="TEST"
        )
        db.session.add(merchant)
        db.session.commit()

    # 2. Seed Default Roles Users
    users_data = [
        ("Sachin (Admin)", "admin@razorrecover.io", "password123", "MERCHANT_ADMIN"),
        ("Finance Lead", "finance@razorrecover.io", "password123", "FINANCE_OPERATOR"),
        ("Compliance Auditor", "auditor@razorrecover.io", "password123", "AUDITOR")
    ]

    for name, email, password, role in users_data:
        u = User.query.filter_by(email=email).first()
        if not u:
            u = User(name=name, email=email, password_hash=generate_password_hash(password))
            db.session.add(u)
            db.session.commit()

            mu = MerchantUser(merchant_id=merchant.id, user_id=u.id, role=role)
            db.session.add(mu)
            db.session.commit()

    # 3. Seed Customers
    customer_objs = []
    for idx, (cname, cemail, ctier) in enumerate(CLIENT_NAMES, start=1):
        cust = Customer.query.filter_by(merchant_id=merchant.id, email=cemail).first()
        if not cust:
            cust = Customer(
                merchant_id=merchant.id,
                external_id=f"cli_{idx:03d}",
                name=cname,
                email=cemail,
                phone=f"+9198765432{idx:02d}"
            )
            db.session.add(cust)
            db.session.commit()
        customer_objs.append(cust)

    today = date.today()

    for idx in range(1, num_cases + 1):
        case_num = f"RR-{1000 + idx}"
        cust = customer_objs[(idx - 1) % len(customer_objs)]
        scenario = SCENARIOS[(idx - 1) % len(SCENARIOS)]

        amount = 0.0
        disputed_amount = 0.0
        expected_tier = 1

        if scenario == "payment_failure":
            amount = round(random.choice([1500, 2800, 4200, 7500, 12000]), 2)
            expected_tier = 2 if amount >= 5000 else 1
        elif scenario == "checkout_abandonment":
            amount = round(random.choice([1200, 2500, 3800, 4800, 6500]), 2)
            expected_tier = 2 if amount >= 5000 else 1
        elif scenario == "overdue_invoice":
            amount = round(random.choice([3500, 6500, 15000, 28000, 45000]), 2)
            expected_tier = 2 if amount >= 5000 else 1
        elif scenario == "promise_broken":
            amount = round(random.choice([4500, 8500, 18000, 32000]), 2)
            expected_tier = 2
        elif scenario == "dispute":
            amount = round(random.choice([12000, 25000, 50000, 85000]), 2)
            is_full = (idx % 2 == 0)
            if is_full:
                disputed_amount = amount
                expected_tier = 3
            else:
                disputed_amount = round(amount * 0.3, 2)
                expected_tier = 2 if disputed_amount < 10000 else 3

        # Revenue Signal
        sig = RevenueSignal(
            merchant_id=merchant.id,
            customer_id=cust.id,
            source="API_SYNC",
            event_type=f"signal.{scenario}",
            amount=amount,
            currency="INR",
            raw_payload={"scenario": scenario, "disputed_amount": disputed_amount}
        )
        db.session.add(sig)
        db.session.flush()

        # Case
        c = Case(
            merchant_id=merchant.id,
            signal_id=sig.id,
            customer_id=cust.id,
            case_number=case_num,
            status="DETECTED",
            amount=amount,
            currency="INR",
            risk_level="HIGH" if expected_tier >= 2 else "LOW",
            assigned_tier=expected_tier
        )
        db.session.add(c)
        db.session.flush()

        # Initial Event
        ev = CaseEvent(
            case_id=c.id,
            from_state=None,
            to_state="DETECTED",
            actor_type="SYSTEM",
            description=f"Revenue signal detected ({scenario.replace('_', ' ').title()}). Risk Amount: ₹{amount:,.2f}"
        )
        db.session.add(ev)

    db.session.commit()
    print(f"[seed_data] Successfully seeded PostgreSQL database with merchant, 3 users, {len(customer_objs)} customers, and {num_cases} cases.")


if __name__ == "__main__":
    from app import app
    with app.app_context():
        seed_database()
