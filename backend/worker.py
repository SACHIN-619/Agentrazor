"""
worker.py — Background Autonomous Recovery Scheduler for RazorRecover.

Uses APScheduler to continuously poll and process revenue signals and pending cases
without requiring manual browser interaction:
1. Detects new revenue risk signals
2. Invokes Gemini AI diagnosis & deterministic policy gate
3. Executes Tier 1 autonomous recovery actions
4. Verifies payment outcomes with Razorpay Test/Live API
5. Records recovered funds in immutable financial ledger
"""

import time
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from flask import current_app

from models import db, Case, CaseEvent, RecoveryAction, Payment, LedgerEntry, AuditLog
from razorpay_client import get_merchant_gateway_adapter
import store
import policy
import agent

_scheduler = None
_last_run_stats = {
    "status": "idle",
    "last_run": None,
    "next_run": None,
    "processed_cases": 0,
    "recovered_amount": 0.0,
    "errors": 0
}


def run_autonomous_recovery_cycle(app):
    """Executes background autonomous recovery pass for all active merchants."""
    global _last_run_stats
    with app.app_context():
        start_time = datetime.now(timezone.utc)
        print(f"[BackgroundWorker] Starting autonomous recovery cycle at {start_time.isoformat()}...")
        
        try:
            # 1. Fetch cases requiring autonomous recovery processing
            pending_cases = Case.query.filter(Case.status.in_(["DETECTED", "APPROVED", "EXECUTING"])).limit(10).all()
            processed_count = 0
            recovered_sum = 0.0

            for case_obj in pending_cases:
                c_dict = case_obj.to_dict()

                # Process DETECTED cases
                if case_obj.status == "DETECTED":
                    # AI Diagnosis
                    try:
                        diag = agent.diagnose_root_cause(case_obj.id)
                    except Exception:
                        diag = {"root_cause": "Payment processing exception detected", "confidence": 0.95}
                    root_cause = diag.get("root_cause", "Payment failure detected")

                    # Policy Evaluation
                    pol = policy.evaluate_policy(c_dict, root_cause)
                    tier = pol.get("tier", 1)


                    if tier == 1:
                        # Tier 1 Autonomous Execution
                        adapter = get_merchant_gateway_adapter(case_obj.merchant_id)
                        res = adapter.create_payment_link(
                            amount=float(case_obj.amount),
                            description=f"RazorRecover Payment for {case_obj.case_number}",
                            customer_name=c_dict.get("customer_name", "Valued Customer"),
                            customer_email=c_dict.get("customer_email", "customer@example.com")
                        )

                        case_obj.status = "EXECUTING"
                        act = RecoveryAction(
                            case_id=case_obj.id,
                            action_type="PAYMENT_LINK",
                            status="EXECUTED",
                            external_reference=res.get("link_id")
                        )
                        db.session.add(act)

                        # Payment Status Verification
                        verif = adapter.fetch_payment_status(res.get("link_id", ""))
                        if verif.get("verified"):
                            case_obj.status = "RECOVERED"
                            pmt = Payment(
                                case_id=case_obj.id,
                                action_id=act.id,
                                razorpay_payment_id=res.get("link_id"),
                                amount=float(case_obj.amount),
                                status="CAPTURED",
                                verified_at=datetime.now(timezone.utc)
                            )
                            db.session.add(pmt)
                            db.session.flush()

                            led = LedgerEntry(
                                merchant_id=case_obj.merchant_id,
                                case_id=case_obj.id,
                                payment_id=pmt.id,
                                recovered_amount=float(case_obj.amount),
                                currency=case_obj.currency,
                                entry_type="RECOVERY"
                            )
                            db.session.add(led)
                            recovered_sum += float(case_obj.amount)

                    elif tier == 2:
                        store.save_draft(case_obj.id, "PAYMENT_LINK", "Payment Recovery Required", "Please review and complete recovery payment.")

                    elif tier >= 3:
                        store.escalate_case(case_obj.id, "High risk or full dispute — requires human intervention.")

                    processed_count += 1

                elif case_obj.status in ["APPROVED", "EXECUTING"]:
                    # Verify pending payment actions
                    adapter = get_merchant_gateway_adapter(case_obj.merchant_id)
                    verif = adapter.fetch_payment_status(case_obj.case_number)
                    if verif.get("verified"):
                        case_obj.status = "RECOVERED"
                        pmt = Payment(
                            case_id=case_obj.id,
                            amount=float(case_obj.amount),
                            status="CAPTURED",
                            verified_at=datetime.now(timezone.utc)
                        )
                        db.session.add(pmt)
                        db.session.flush()

                        led = LedgerEntry(
                            merchant_id=case_obj.merchant_id,
                            case_id=case_obj.id,
                            payment_id=pmt.id,
                            recovered_amount=float(case_obj.amount),
                            currency=case_obj.currency,
                            entry_type="RECOVERY"
                        )
                        db.session.add(led)
                        recovered_sum += float(case_obj.amount)
                        processed_count += 1

            db.session.commit()

            _last_run_stats = {
                "status": "active",
                "last_run": start_time.isoformat(),
                "processed_cases": processed_count,
                "recovered_amount": recovered_sum,
                "errors": 0
            }
            print(f"[BackgroundWorker] Cycle completed. Processed {processed_count} cases, recovered ₹{recovered_sum:,.2f}")

        except Exception as e:
            db.session.rollback()
            print(f"[BackgroundWorker] Cycle error: {e}")
            _last_run_stats["errors"] += 1
            _last_run_stats["status"] = f"error: {str(e)}"


def init_scheduler(app):
    """Initializes APScheduler background task."""
    global _scheduler
    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        func=run_autonomous_recovery_cycle,
        args=[app],
        trigger="interval",
        seconds=120,
        id="autonomous_recovery_job",
        replace_existing=True
    )
    _scheduler.start()
    print("[BackgroundWorker] APScheduler background autonomous recovery engine started (runs every 120s).")


def get_worker_status() -> dict:
    """Returns background worker health and cycle statistics."""
    return _last_run_stats
