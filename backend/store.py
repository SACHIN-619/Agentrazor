"""
store.py — Persistence, Case State Machine & Multi-Tenant Data Store.

Backed by PostgreSQL SQLAlchemy models with tenant scoping (`merchant_id`).
Provides API interface for cases, state machine transitions, client/customer context,
approval queues, recovery ledger, audit log tracking, and idempotency locks.
"""

import os
import json
import time
import uuid
from datetime import date, datetime, timezone
from typing import List, Dict, Any, Optional
from flask import g

from models import (
    db, Merchant, User, MerchantUser, Customer, RevenueSignal, Case, CaseEvent,
    AIDiagnosis, PolicyDecision, Approval, RecoveryAction, Payment, LedgerEntry,
    AuditLog, IdempotencyKey, EvaluationRun, generate_uuid
)


def get_current_merchant_id() -> str:
    """Extracts merchant_id from request context `g.merchant_id` or defaults to default dev merchant."""
    mid = getattr(g, "merchant_id", None)
    if not mid:
        merchant = Merchant.query.filter_by(email="demo@razorrecover.io").first()
        if merchant:
            return merchant.id
        merchant = Merchant(
            business_name="Apex Enterprise Labs",
            email="demo@razorrecover.io",
            environment="TEST"
        )
        db.session.add(merchant)
        db.session.commit()
        return merchant.id
    return mid


def get_db_status() -> dict:
    """Returns database connection status."""
    try:
        total_cases = db.session.query(Case).count()
        return {
            "engine": "PostgreSQL (SQLAlchemy)",
            "status": "connected",
            "total_cases": total_cases
        }
    except Exception as e:
        return {
            "engine": "PostgreSQL / SQLite",
            "status": "warning",
            "error": str(e)
        }


# --- Persistent Idempotency Locks -------------------------------------------

def acquire_persistent_lock(lock_key: str, resource_type: str = "ACTION") -> bool:
    """Acquires lock to prevent duplicate execution."""
    existing = IdempotencyKey.query.get(lock_key)
    if existing:
        return False
    key = IdempotencyKey(key=lock_key, resource_type=resource_type)
    db.session.add(key)
    db.session.commit()
    return True


def release_persistent_lock(lock_key: str):
    """Releases persistent action lock."""
    key = IdempotencyKey.query.get(lock_key)
    if key:
        db.session.delete(key)
        db.session.commit()


def is_lock_active(lock_key: str, ttl_seconds: float = 60.0) -> bool:
    """Checks if persistent lock exists."""
    key = IdempotencyKey.query.get(lock_key)
    if not key:
        return False
    age = (datetime.now(timezone.utc) - key.created_at.replace(tzinfo=timezone.utc)).total_seconds()
    if age < ttl_seconds:
        return True
    db.session.delete(key)
    db.session.commit()
    return False


# --- Case Operations --------------------------------------------------------

def list_cases(include_closed: bool = False, sort_by_priority: bool = True, merchant_id: str = None) -> List[Dict[str, Any]]:
    mid = merchant_id or get_current_merchant_id()
    query = Case.query.filter_by(merchant_id=mid)
    if not include_closed:
        query = query.filter(Case.status != "closed")

    cases_db = query.all()
    result = []
    for c in cases_db:
        d = c.to_dict()
        d["client_name"] = c.customer.name if c.customer else "Customer"
        d["client_id"] = c.customer_id
        d["authority_tier"] = c.assigned_tier or 1
        result.append(d)

    if sort_by_priority:
        def priority_key(c):
            amount = float(c.get("amount", 0))
            status = c.get("status")
            is_urgent = status in ["PENDING_APPROVAL", "pending_approval", "ESCALATED"]
            tier = c.get("assigned_tier") or 1
            return (0 if is_urgent else 1, -tier, -amount)
        result.sort(key=priority_key)

    return result


def get_case(case_id: str, merchant_id: str = None) -> Optional[Dict[str, Any]]:
    mid = merchant_id or get_current_merchant_id()
    c = Case.query.filter_by(id=case_id, merchant_id=mid).first()
    if not c:
        c = Case.query.filter_by(case_number=case_id, merchant_id=mid).first()

    if not c:
        return None

    res = c.to_dict()
    res["client_name"] = c.customer.name if c.customer else "Unknown Customer"
    res["client_email"] = c.customer.email if c.customer else ""
    res["authority_tier"] = c.assigned_tier or 1

    history = []
    for ev in c.events:
        history.append({
            "timestamp": ev.created_at.isoformat() if ev.created_at else "",
            "event": ev.description,
            "type": ev.actor_type,
            "from_state": ev.from_state,
            "to_state": ev.to_state
        })
    res["history"] = history
    return res


def update_case(case_id: str, updates: dict, actor_type: str = "SYSTEM", actor_id: str = None) -> Optional[Dict[str, Any]]:
    mid = get_current_merchant_id()
    c = Case.query.filter_by(id=case_id, merchant_id=mid).first()
    if not c:
        c = Case.query.filter_by(case_number=case_id, merchant_id=mid).first()

    if not c:
        return None

    old_status = c.status
    if "status" in updates:
        new_status = updates["status"].upper()
        c.status = new_status
        event = CaseEvent(
            case_id=c.id,
            from_state=old_status,
            to_state=new_status,
            actor_type=actor_type,
            actor_id=actor_id,
            description=f"Status changed from {old_status} to {new_status}"
        )
        db.session.add(event)

    if "amount" in updates:
        c.amount = updates["amount"]
    if "assigned_tier" in updates or "authority_tier" in updates:
        c.assigned_tier = updates.get("assigned_tier") or updates.get("authority_tier")
    if "risk_level" in updates:
        c.risk_level = updates["risk_level"]

    c.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return get_case(c.id, mid)


def add_history_event(case_id: str, event_text: str, event_type: str = "agent_action", run_id: Optional[str] = None):
    mid = get_current_merchant_id()
    c = Case.query.filter_by(id=case_id, merchant_id=mid).first()
    if not c:
        c = Case.query.filter_by(case_number=case_id, merchant_id=mid).first()

    if c:
        ev = CaseEvent(
            case_id=c.id,
            from_state=c.status,
            to_state=c.status,
            actor_type=event_type.upper(),
            actor_id=run_id,
            description=event_text
        )
        db.session.add(ev)
        db.session.commit()


# --- Approvals Queue --------------------------------------------------

def list_pending_approvals(merchant_id: str = None) -> List[Dict[str, Any]]:
    mid = merchant_id or get_current_merchant_id()
    approvals = Approval.query.filter_by(decision="PENDING").all()
    results = []
    for app in approvals:
        c = Case.query.filter_by(id=app.case_id, merchant_id=mid).first()
        if c:
            cd = c.to_dict()
            cd["approval_id"] = app.id
            cd["requested_by"] = app.requested_by
            cd["reason"] = app.reason
            results.append(cd)
    return results


def save_draft(case_id: str, action_type: str, subject: str, body: str, run_id: Optional[str] = None) -> dict:
    mid = get_current_merchant_id()
    c = Case.query.filter_by(id=case_id, merchant_id=mid).first()
    if not c:
        c = Case.query.filter_by(case_number=case_id, merchant_id=mid).first()
    if not c:
        return {"error": f"No case found with ID {case_id}"}

    c.status = "PENDING_APPROVAL"
    c.assigned_tier = 2

    app = Approval(
        case_id=c.id,
        requested_by=run_id or "AI Agent",
        decision="PENDING",
        reason=f"Draft action '{action_type}': {subject}"
    )
    db.session.add(app)

    ev = CaseEvent(
        case_id=c.id,
        from_state=c.status,
        to_state="PENDING_APPROVAL",
        actor_type="AI_AGENT",
        description=f"Draft created ({action_type}). Held in Approval Queue (Tier 2)."
    )
    db.session.add(ev)
    db.session.commit()

    return {"success": True, "case_id": c.id, "approval_id": app.id, "tier": 2}


def approve_and_send_draft(case_id: str, approver: str = "Merchant Admin", user_id: str = None) -> dict:
    mid = get_current_merchant_id()
    c = Case.query.filter_by(id=case_id, merchant_id=mid).first()
    if not c:
        c = Case.query.filter_by(case_number=case_id, merchant_id=mid).first()
    if not c:
        return {"error": f"No pending draft for case ID {case_id}"}

    app = Approval.query.filter_by(case_id=c.id, decision="PENDING").first()
    if not app or c.status != "PENDING_APPROVAL":
        return {"error": f"No pending approval draft found for case ID {case_id}"}

    app.decision = "APPROVED"
    app.approved_by = user_id
    app.decided_at = datetime.now(timezone.utc)

    c.status = "EXECUTING"

    action = RecoveryAction(
        case_id=c.id,
        action_type="PAYMENT_LINK",
        status="EXECUTED",
        external_reference=f"plink_appr_{uuid.uuid4().hex[:8]}"
    )
    db.session.add(action)

    audit = AuditLog(
        merchant_id=mid,
        actor_id=user_id,
        actor_type="USER",
        action="APPROVE_RECOVERY_DRAFT",
        resource_type="CASE",
        resource_id=c.id,
        old_state={"status": "PENDING_APPROVAL"},
        new_state={"status": "EXECUTING"}
    )
    db.session.add(audit)

    ev = CaseEvent(
        case_id=c.id,
        from_state="PENDING_APPROVAL",
        to_state="EXECUTING",
        actor_type="USER",
        actor_id=user_id,
        description=f"Draft APPROVED & EXECUTED by {approver}."
    )
    db.session.add(ev)
    db.session.commit()

    return {"success": True, "case_id": c.id, "executed_action": action.to_dict()}


def escalate_case(case_id: str, reason: str, run_id: Optional[str] = None) -> dict:
    mid = get_current_merchant_id()
    c = Case.query.filter_by(id=case_id, merchant_id=mid).first()
    if not c:
        c = Case.query.filter_by(case_number=case_id, merchant_id=mid).first()
    if not c:
        return {"error": f"No case found with ID {case_id}"}

    old_status = c.status
    c.status = "ESCALATED"
    c.assigned_tier = 3

    ev = CaseEvent(
        case_id=c.id,
        from_state=old_status,
        to_state="ESCALATED",
        actor_type="POLICY_ENGINE",
        description=f"Escalated to human owner (Tier 3): {reason}"
    )
    db.session.add(ev)
    db.session.commit()
    return {"success": True, "case_id": c.id, "status": "ESCALATED"}


# --- Payment Verification & Recovery Ledger ------------------------------------

def verify_and_close(case_id: str, verification_note: str, payment_ref: str = "", run_id: Optional[str] = None) -> dict:
    mid = get_current_merchant_id()
    c = Case.query.filter_by(id=case_id, merchant_id=mid).first()
    if not c:
        c = Case.query.filter_by(case_number=case_id, merchant_id=mid).first()
    if not c:
        return {"error": f"No case found with ID {case_id}"}

    recovered_amount = float(c.amount)

    # Idempotency guard — prevent duplicate verification & ledger entries
    if c.status == "RECOVERED":
        return {
            "success": True,
            "case_id": c.id,
            "recovered_amount": recovered_amount,
            "status": "RECOVERED",
            "message": "Payment already verified and recorded in recovery ledger"
        }

    old_status = c.status
    c.status = "RECOVERED"


    payment = Payment(
        case_id=c.id,
        razorpay_payment_id=payment_ref or f"pay_verif_{uuid.uuid4().hex[:8]}",
        amount=recovered_amount,
        status="CAPTURED",
        verified_at=datetime.now(timezone.utc)
    )
    db.session.add(payment)
    db.session.flush()

    ledger = LedgerEntry(
        merchant_id=mid,
        case_id=c.id,
        payment_id=payment.id,
        recovered_amount=recovered_amount,
        currency=c.currency,
        entry_type="RECOVERY"
    )
    db.session.add(ledger)

    ev = CaseEvent(
        case_id=c.id,
        from_state=old_status,
        to_state="RECOVERED",
        actor_type="VERIFIER",
        description=f"Payment verified ({verification_note}). ₹{recovered_amount:,.2f} recorded in Recovery Ledger."
    )
    db.session.add(ev)
    db.session.commit()

    return {
        "success": True,
        "case_id": c.id,
        "recovered_amount": recovered_amount,
        "status": "RECOVERED"
    }


def record_ledger_entry(case_id: str, client_name: str, amount: float, note: str, payment_ref: str = "", run_id: Optional[str] = None):
    mid = get_current_merchant_id()
    ledger = LedgerEntry(
        merchant_id=mid,
        case_id=case_id,
        recovered_amount=amount,
        currency="INR",
        entry_type="RECOVERY"
    )
    db.session.add(ledger)
    db.session.commit()


def get_ledger(merchant_id: str = None) -> List[Dict[str, Any]]:
    mid = merchant_id or get_current_merchant_id()
    entries = LedgerEntry.query.filter_by(merchant_id=mid).order_by(LedgerEntry.created_at.desc()).all()
    results = []
    for e in entries:
        d = e.to_dict()
        c = Case.query.get(e.case_id) if e.case_id else None
        d["case_number"] = c.case_number if c else "N/A"
        d["client_name"] = c.customer.name if c and c.customer else "Merchant Customer"
        d["payment_ref"] = e.payment_id or "Verified"
        d["timestamp"] = e.created_at.isoformat() if e.created_at else ""
        results.append(d)
    return results


# --- Audit Logs & Agent Runs --------------------------------------------------

def log_audit_event(action: str, resource_type: str, resource_id: str, old_state: dict = None, new_state: dict = None):
    mid = get_current_merchant_id()
    actor_id = getattr(g.current_user, "id", "SYSTEM") if hasattr(g, "current_user") and g.current_user else "SYSTEM"
    audit = AuditLog(
        merchant_id=mid,
        actor_id=actor_id,
        actor_type="USER" if actor_id != "SYSTEM" else "SYSTEM",
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_state=old_state,
        new_state=new_state
    )
    db.session.add(audit)
    db.session.commit()


def get_audit_logs(merchant_id: str = None) -> List[Dict[str, Any]]:
    mid = merchant_id or get_current_merchant_id()
    logs = AuditLog.query.filter_by(merchant_id=mid).order_by(AuditLog.created_at.desc()).all()
    return [l.to_dict() for l in logs]


def log_agent_run(run_id: str, summary: dict):
    log_audit_event(
        action="AGENT_RUN_COMPLETED",
        resource_type="AGENT",
        resource_id=run_id,
        new_state=summary
    )


def get_agent_runs(merchant_id: str = None) -> List[Dict[str, Any]]:
    mid = merchant_id or get_current_merchant_id()
    logs = AuditLog.query.filter_by(merchant_id=mid, action="AGENT_RUN_COMPLETED").order_by(AuditLog.created_at.desc()).all()
    results = []
    for l in logs:
        results.append({
            "run_id": l.resource_id,
            "timestamp": l.created_at.isoformat() if l.created_at else "",
            "summary": l.new_state
        })
    return results


def get_client(client_id: str) -> Optional[Dict[str, Any]]:
    mid = get_current_merchant_id()
    c = Customer.query.filter_by(id=client_id, merchant_id=mid).first()
    return c.to_dict() if c else None
