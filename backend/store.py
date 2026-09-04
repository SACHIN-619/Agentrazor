"""
store.py — Persistence, Recovery Ledger & State Management for RazorRecover.

Manages cases, client relationship context, payment promises, dispute splits,
approval queues, recovery ledger, and immutable audit run logs.
"""

import os
import json
import time
from datetime import date, datetime, timezone
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CASES_FILE = os.path.join(DATA_DIR, "cases.json")
CLIENTS_FILE = os.path.join(DATA_DIR, "clients.json")
LEDGER_FILE = os.path.join(DATA_DIR, "ledger.json")
RUNS_FILE = os.path.join(DATA_DIR, "runs.json")

os.makedirs(DATA_DIR, exist_ok=True)


def _load_json(filepath: str, default: Any) -> Any:
    if not os.path.exists(filepath):
        return default
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[store] Error loading {filepath}: {e}")
        return default


def _save_json(filepath: str, data: Any):
    temp_file = f"{filepath}.tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(temp_file, filepath)


# --- Case Operations --------------------------------------------------------

def list_cases(include_closed: bool = False, sort_by_priority: bool = True) -> List[Dict[str, Any]]:
    cases = _load_json(CASES_FILE, [])
    if not include_closed:
        cases = [c for c in cases if c.get("status") != "closed"]

    if sort_by_priority:
        # Sort by urgency/financial impact score
        def priority_key(c):
            amount = float(c.get("amount", 0))
            is_urgent = c.get("exception_type") in ["promise_broken", "dispute_partial", "dispute_full"]
            tier = c.get("authority_tier", 1)
            return (0 if is_urgent else 1, -tier, -amount)

        cases.sort(key=priority_key)

    return cases


def get_case(case_id: str) -> Optional[Dict[str, Any]]:
    cases = _load_json(CASES_FILE, [])
    for c in cases:
        if c.get("case_id") == case_id:
            return c
    return None


def update_case(case_id: str, updates: dict) -> Optional[Dict[str, Any]]:
    cases = _load_json(CASES_FILE, [])
    updated_case = None
    for c in cases:
        if c.get("case_id") == case_id:
            c.update(updates)
            c["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated_case = c
            break
    if updated_case:
        _save_json(CASES_FILE, cases)
    return updated_case


def add_history_event(case_id: str, event_text: str, event_type: str = "agent_action", run_id: Optional[str] = None):
    cases = _load_json(CASES_FILE, [])
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    now_epoch = time.time()
    for c in cases:
        if c.get("case_id") == case_id:
            if "history" not in c:
                c["history"] = []
            c["history"].append({
                "timestamp": now_str,
                "timestamp_epoch": now_epoch,
                "event": event_text,
                "type": event_type,
                "run_id": run_id
            })
            c["updated_at"] = datetime.now(timezone.utc).isoformat()
            break
    _save_json(CASES_FILE, cases)


# --- Client Profiles ---------------------------------------------------------

def get_client(client_id: str) -> Optional[Dict[str, Any]]:
    clients = _load_json(CLIENTS_FILE, [])
    for cl in clients:
        if cl.get("client_id") == client_id:
            return cl
    return None


# --- Payment Promises --------------------------------------------------------

def store_promise(case_id: str, promised_date: str, source_text: str, run_id: Optional[str] = None) -> dict:
    case = get_case(case_id)
    if not case:
        return {"error": f"No case found with ID {case_id}"}

    updates = {
        "exception_type": "promise_pending",
        "promise_date": promised_date,
        "promise_text": source_text,
        "authority_tier": 1
    }
    update_case(case_id, updates)
    add_history_event(case_id, f"Payment promise recorded for {promised_date}: '{source_text}'", "promise_recorded", run_id)
    return {"success": True, "case_id": case_id, "promised_date": promised_date}


def check_promise_status(case_id: str) -> dict:
    case = get_case(case_id)
    if not case:
        return {"error": f"No case found with ID {case_id}"}

    promise_raw = case.get("promise_date")
    if not promise_raw:
        return {"status": "no_promise", "case_id": case_id}

    try:
        promise_date = date.fromisoformat(promise_raw)
    except ValueError:
        return {"status": "no_promise", "error": f"Invalid promise date: {promise_raw}"}

    today = date.today()
    days_remaining = (promise_date - today).days

    # Check history for payment verification
    history = case.get("history", [])
    has_payment = any("payment verified" in h.get("event", "").lower() for h in history)

    if has_payment:
        return {"status": "kept", "promise_date": promise_raw, "days_remaining": days_remaining}

    if today <= promise_date:
        return {"status": "pending", "promise_date": promise_raw, "days_remaining": days_remaining}

    # Promise is broken
    update_case(case_id, {"exception_type": "promise_broken", "authority_tier": 2})
    add_history_event(case_id, f"Promise deadline ({promise_raw}) passed without payment evidence — marked promise_broken", "promise_broken")
    return {"status": "broken", "promise_date": promise_raw, "days_overdue": abs(days_remaining)}


# --- Disputes & Splits --------------------------------------------------------

def split_disputed_amount(case_id: str, disputed_amount: float, reason: str, run_id: Optional[str] = None) -> dict:
    case = get_case(case_id)
    if not case:
        return {"error": f"No case found with ID {case_id}"}

    total_amount = float(case.get("amount", 0))
    if disputed_amount >= total_amount:
        # Full dispute -> Tier 3
        update_case(case_id, {
            "exception_type": "dispute_full",
            "disputed_amount": total_amount,
            "authority_tier": 3,
            "status": "escalated"
        })
        add_history_event(case_id, f"Full invoice disputed (₹{disputed_amount:,.2f}): {reason}. Escalated to Tier 3 human review.", "dispute_full", run_id)
        return {"status": "full_dispute_escalated", "case_id": case_id}

    undisputed_amount = total_amount - disputed_amount
    update_case(case_id, {
        "amount": undisputed_amount,
        "disputed_amount": disputed_amount,
        "exception_type": "dispute_partial",
        "authority_tier": 2
    })
    add_history_event(case_id, f"Dispute split: ₹{disputed_amount:,.2f} under review (Tier 3). ₹{undisputed_amount:,.2f} undisputed continuing recovery (Tier 2). Reason: {reason}", "dispute_split", run_id)

    return {
        "status": "split_completed",
        "case_id": case_id,
        "undisputed_amount": undisputed_amount,
        "disputed_amount": disputed_amount
    }


# --- Approval Queue & Drafts --------------------------------------------------

def list_pending_approvals() -> List[Dict[str, Any]]:
    cases = _load_json(CASES_FILE, [])
    return [c for c in cases if c.get("draft_pending") is True or c.get("status") == "pending_approval"]


def save_draft(case_id: str, action_type: str, subject: str, body: str, run_id: Optional[str] = None) -> dict:
    case = get_case(case_id)
    if not case:
        return {"error": f"No case found with ID {case_id}"}

    updates = {
        "draft_pending": True,
        "status": "pending_approval",
        "draft_action": {
            "action_type": action_type,
            "subject": subject,
            "body": body,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    }
    update_case(case_id, updates)
    add_history_event(case_id, f"Draft action created ('{action_type}'). Held in Approval Queue (Tier 2).", "draft_saved", run_id)
    return {"success": True, "case_id": case_id, "tier": 2}


def approve_and_send_draft(case_id: str, approver: str = "Merchant Admin") -> dict:
    case = get_case(case_id)
    if not case or not case.get("draft_pending"):
        return {"error": f"No pending draft for case ID {case_id}"}

    draft = case.get("draft_action", {})
    updates = {
        "draft_pending": False,
        "status": "recovering",
        "contact_count": int(case.get("contact_count", 0)) + 1,
        "draft_action": None
    }
    update_case(case_id, updates)
    add_history_event(case_id, f"Draft action '{draft.get('action_type')}' APPROVED & EXECUTED by {approver}.", "draft_approved")
    return {"success": True, "case_id": case_id, "executed_action": draft}


def escalate_case(case_id: str, reason: str, run_id: Optional[str] = None) -> dict:
    updates = {
        "status": "escalated",
        "authority_tier": 3,
        "escalation_reason": reason
    }
    update_case(case_id, updates)
    add_history_event(case_id, f"Escalated to owner (Tier 3): {reason}", "escalated", run_id)
    return {"success": True, "case_id": case_id, "status": "escalated"}


# --- Payment Verification & Recovery Ledger ------------------------------------

def verify_and_close(case_id: str, verification_note: str, payment_ref: str = "", run_id: Optional[str] = None) -> dict:
    case = get_case(case_id)
    if not case:
        return {"error": f"No case found with ID {case_id}"}

    recovered_amount = float(case.get("amount", 0))

    updates = {
        "status": "closed",
        "outcome": "recovered",
        "recovered_amount": recovered_amount,
        "closed_at": datetime.now(timezone.utc).isoformat()
    }
    update_case(case_id, updates)
    add_history_event(case_id, f"Payment evidence verified: {verification_note}. Case marked RECOVERED (₹{recovered_amount:,.2f}).", "payment_verified", run_id)

    # Record in Recovery Ledger
    record_ledger_entry(case_id, case.get("client_name", "Unknown"), recovered_amount, verification_note, payment_ref, run_id)

    return {
        "success": True,
        "case_id": case_id,
        "recovered_amount": recovered_amount,
        "status": "closed",
        "outcome": "recovered"
    }


def record_ledger_entry(case_id: str, client_name: str, amount: float, note: str, payment_ref: str = "", run_id: Optional[str] = None):
    ledger = _load_json(LEDGER_FILE, [])
    entry = {
        "entry_id": f"ledger_{len(ledger) + 1}",
        "case_id": case_id,
        "client_name": client_name,
        "recovered_amount": amount,
        "note": note,
        "payment_ref": payment_ref or f"rzp_test_{int(time.time())}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id
    }
    ledger.append(entry)
    _save_json(LEDGER_FILE, ledger)


def get_ledger() -> List[Dict[str, Any]]:
    return _load_json(LEDGER_FILE, [])


# --- Agent Run Log ------------------------------------------------------------

def log_agent_run(run_id: str, summary: dict):
    runs = _load_json(RUNS_FILE, [])
    runs.insert(0, {
        "run_id": run_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": summary
    })
    _save_json(RUNS_FILE, runs[:100])  # keep last 100 runs


def get_agent_runs() -> List[Dict[str, Any]]:
    return _load_json(RUNS_FILE, [])
