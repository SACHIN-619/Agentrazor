"""
policy.py — Authority Boundary & Idempotency Safeguard Engine for Controlled AI Autonomy.

=============================================================================
BUSINESS LOGIC & SAFETY ARCHITECTURE
=============================================================================
This module enforces the 3-Tier Authority System and Idempotency Rules:

  • Tier 1 (Autonomous):
    Routine payment retries & reminders (< ₹5,000).
    The AI agent automatically triggers recovery links or retries.

  • Tier 2 (Human Approval Required):
    Medium-to-high value cases (≥ ₹5,000), broken commitments, or repeated silent attempts.
    The AI agent drafts the recovery action, but holds it in the Approval Queue
    until a human user approves it with a single tap.

  • Tier 3 (Escalation / Human Only):
    Full disputes or disputed amounts ≥ ₹10,000.
    The AI agent strictly refuses autonomous execution or drafting. It escalates to human review.

CRITICAL DESIGN PRINCIPLE:
Deterministic execution rules and idempotency safeguards are enforced in Python BEFORE action tool execution.
The AI model (Gemini) is NEVER trusted to police its own authority boundaries.
=============================================================================
"""

import time
from typing import Dict, Any, Tuple

# --- Threshold Config ----------------------------------------------------
TIER2_AMOUNT_THRESHOLD = 5000.0        # ₹5,000
TIER3_DISPUTE_THRESHOLD = 10000.0      # ₹10,000
SILENT_ATTEMPTS_FOR_TIER2 = 3          # Max 3 unanswered contacts
MAX_RETRY_COUNT = 3                    # Max payment retries before safe stop

TIER_NAMES = {
    1: "autonomous",
    2: "needs human approval",
    3: "human only escalation — agent will not execute",
}

# In-memory idempotency locks for duplicate action protection
_ACTIVE_LOCKS: Dict[str, float] = {}
LOCK_TTL_SECONDS = 60.0


def check_idempotency(case_id: str, action_type: str, history: list) -> Tuple[bool, str]:
    """
    Checks whether a duplicate action or pending lock exists for a case.

    Returns:
        (is_safe: bool, reason: str)
    """
    now = time.time()
    lock_key = f"{case_id}:{action_type}"

    # Check active lock window
    if lock_key in _ACTIVE_LOCKS:
        lock_time = _ACTIVE_LOCKS[lock_key]
        if now - lock_time < LOCK_TTL_SECONDS:
            return False, f"Duplicate action blocked — lock active for case {case_id} ({action_type})"
        else:
            del _ACTIVE_LOCKS[lock_key]

    # Check history for recent identical actions within last hour
    recent_events = [
        h for h in history
        if h.get("action_type") == action_type and (now - h.get("timestamp_epoch", 0)) < 3600
    ]
    if len(recent_events) >= 2:
        return False, f"Idempotency limit reached — action '{action_type}' executed {len(recent_events)} times in past hour."

    return True, "Action pass idempotency verification"


def acquire_action_lock(case_id: str, action_type: str):
    """Acquires a temporary lock for case action execution."""
    lock_key = f"{case_id}:{action_type}"
    _ACTIVE_LOCKS[lock_key] = time.time()


def release_action_lock(case_id: str, action_type: str):
    """Releases lock after execution."""
    lock_key = f"{case_id}:{action_type}"
    if lock_key in _ACTIVE_LOCKS:
        del _ACTIVE_LOCKS[lock_key]


def required_tier(case: dict) -> int:
    """
    Deterministically evaluates authority tier (1, 2, or 3) for a revenue recovery case.
    """
    exception_type = case.get("exception_type", "")
    disputed = float(case.get("disputed_amount", 0) or 0)
    amount = float(case.get("amount", 0) or 0)
    contact_count = int(case.get("contact_count", 0) or 0)
    retry_count = int(case.get("retry_count", 0) or 0)

    # Rule 1 (Tier 3): Full disputes or large disputes >= ₹10,000 are strictly human-only
    if exception_type == "dispute_full" or disputed >= TIER3_DISPUTE_THRESHOLD:
        return 3

    # Rule 2 (Tier 2): Any partial dispute must be reviewed before sending
    if disputed > 0:
        return 2

    # Rule 3 (Tier 2): Broken payment promises require human review before tone/retry escalates
    if exception_type == "promise_broken":
        return 2

    # Rule 4 (Tier 2): High-value recovery >= ₹5,000 requires human approval gate
    if amount >= TIER2_AMOUNT_THRESHOLD:
        return 2

    # Rule 5 (Tier 2): Repeated contacts or retries require approval gate to prevent spamming
    if contact_count >= SILENT_ATTEMPTS_FOR_TIER2 or retry_count >= MAX_RETRY_COUNT:
        return 2

    # Default (Tier 1): Routine low-risk revenue recovery
    return 1


def explain_tier(case: dict) -> str:
    """
    Returns auditable justification for assigned authority tier.
    """
    tier = required_tier(case)
    exception_type = case.get("exception_type", "")
    disputed = float(case.get("disputed_amount", 0) or 0)
    amount = float(case.get("amount", 0) or 0)
    contact_count = int(case.get("contact_count", 0) or 0)
    retry_count = int(case.get("retry_count", 0) or 0)

    if tier == 3:
        if exception_type == "dispute_full":
            return "Full amount disputed — escalated for direct human intervention."
        return f"Disputed amount (₹{disputed:,.2f}) exceeds the ₹10,000 human-only threshold."
    if tier == 2:
        if disputed > 0:
            return f"₹{disputed:,.2f} disputed — requires human approval before releasing message."
        if exception_type == "promise_broken":
            return "Client payment promise was broken — human approval required before next attempt."
        if amount >= TIER2_AMOUNT_THRESHOLD:
            return f"₹{amount:,.2f} value exceeds the ₹5,000 autonomous execution threshold."
        if contact_count >= SILENT_ATTEMPTS_FOR_TIER2:
            return f"{contact_count} unanswered attempts — require human approval to prevent spamming."
        if retry_count >= MAX_RETRY_COUNT:
            return f"Max retry count ({retry_count}) reached — stopping autonomous retry and queuing for human review."
    return "Within safe autonomous bounds — agent acts automatically."
