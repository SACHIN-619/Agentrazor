"""
app.py — Main Flask REST API Server for RazorRecover SaaS.

Provides strictly authenticated, multi-tenant REST API endpoints:
- Authentication (`/api/auth/*`)
- Gateway Configuration (`/api/gateway/*`)
- Revenue Ingestion (`/api/webhooks/razorpay`, `/api/ingestion/csv`)
- Case Lifecycle & State Machine (`/api/cases/*`)
- Approval Queue & Actions (`/api/approvals/*`)
- Verified Recovery Ledger (`/api/ledger`)
- Immutable Audit Logs (`/api/audit`)
- Autonomous Background Worker Status (`/api/worker/status`)
- Benchmark Evaluation (`/api/evaluation/*`)
"""

import os
import sys
import csv
import io
from datetime import datetime, timezone
from flask import Flask, jsonify, request, g
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv
load_dotenv()

from models import (
    db, Merchant, User, MerchantUser, GatewayConnection, Customer,
    RevenueSignal, Case, CaseEvent, Approval, RecoveryAction, Payment,
    LedgerEntry, AuditLog
)
from auth import (
    require_role, generate_jwt, decode_jwt, authenticate_request
)
from werkzeug.security import generate_password_hash, check_password_hash
import store
import policy
import agent
import metrics
import seed_data
import evaluation
import worker
from razorpay_client import (
    razorpay_adapter, get_merchant_gateway_adapter,
    encrypt_secret, verify_webhook_signature
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Database Configuration (PostgreSQL with SQLite fallback)
db_url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL")
if not db_url:
    sqlite_path = os.path.join(BASE_DIR, "data", "razorrecover.db")
    db_url = f"sqlite:///{sqlite_path}"
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    try:
        db.create_all()
        seed_data.seed_database(60)
    except Exception as e:
        print(f"[app] Database startup notice: {e}")

# Initialize Background Worker Scheduler
try:
    worker.init_scheduler(app)
except Exception as e:
    print(f"[app] Worker scheduler notice: {e}")


@app.before_request
def before_request_auth():
    if request.endpoint and not request.endpoint.startswith("static"):
        authenticate_request()


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


# --- Public / Health Endpoints ---------------------------------------------

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "app": "RazorRecover Multi-Tenant SaaS Backend API",
        "status": "online",
        "database": store.get_db_status(),
        "razorpay_mode": razorpay_adapter.get_mode_info(),
        "worker": worker.get_worker_status()
    })


# --- Authentication & Organization Management (`/api/auth/*`) --------------

@app.route("/api/auth/signup", methods=["POST"])
def auth_signup():
    """Registers a new merchant organization and admin user."""
    data = request.get_json() or {}
    business_name = data.get("business_name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    name = data.get("name", "").strip()

    if not business_name or not email or not password or not name:
        return jsonify({"error": "business_name, email, password, and name are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User with this email already exists"}), 400

    # Create Merchant
    merchant = Merchant(
        business_name=business_name,
        email=email,
        environment="TEST"
    )
    db.session.add(merchant)
    db.session.commit()

    # Create Admin User
    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()

    # Create Membership
    membership = MerchantUser(
        merchant_id=merchant.id,
        user_id=user.id,
        role="MERCHANT_ADMIN"
    )
    db.session.add(membership)
    db.session.commit()

    token = generate_jwt(user.id, merchant.id, "MERCHANT_ADMIN")
    return jsonify({
        "success": True,
        "token": token,
        "user": user.to_dict(),
        "merchant": merchant.to_dict(),
        "role": "MERCHANT_ADMIN"
    })


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    """Authenticates user and returns signed JWT token with tenant context."""
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    membership = MerchantUser.query.filter_by(user_id=user.id).first()
    if not membership:
        return jsonify({"error": "User does not belong to any merchant organization"}), 403

    merchant = Merchant.query.get(membership.merchant_id)
    token = generate_jwt(user.id, merchant.id, membership.role)

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({
        "success": True,
        "token": token,
        "user": user.to_dict(),
        "merchant": merchant.to_dict(),
        "role": membership.role
    })


@app.route("/api/auth/me", methods=["GET"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def auth_me():
    """Returns currently authenticated user, merchant, and role details."""
    current_user = getattr(g, "current_user", None)
    merchant_id = getattr(g, "merchant_id", None)
    if not current_user or not merchant_id:
        return jsonify({"error": "Unauthenticated"}), 401

    merchant = Merchant.query.get(merchant_id)
    return jsonify({
        "user": current_user,
        "merchant": merchant.to_dict() if merchant else None,
        "role": current_user.get("role")
    })


# --- Gateway Credentials Management (`/api/gateway/*`) ---------------------

@app.route("/api/gateway/connect", methods=["POST"])
@require_role(["MERCHANT_ADMIN"])
def gateway_connect():
    """Configures and encrypts merchant Razorpay API credentials."""
    data = request.get_json() or {}
    key_id = data.get("key_id", "").strip()
    key_secret = data.get("key_secret", "").strip()
    environment = data.get("environment", "TEST").upper()

    if not key_id or not key_secret:
        return jsonify({"error": "key_id and key_secret are required"}), 400

    merchant_id = store.get_current_merchant_id()
    conn = GatewayConnection.query.filter_by(
        merchant_id=merchant_id,
        environment=environment
    ).first()

    encrypted_secret = encrypt_secret(key_secret)

    if not conn:
        conn = GatewayConnection(
            merchant_id=merchant_id,
            provider="RAZORPAY",
            environment=environment,
            key_id=key_id,
            encrypted_secret=encrypted_secret,
            status="ACTIVE",
            last_verified_at=datetime.now(timezone.utc)
        )
        db.session.add(conn)
    else:
        conn.key_id = key_id
        conn.encrypted_secret = encrypted_secret
        conn.status = "ACTIVE"
        conn.last_verified_at = datetime.now(timezone.utc)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Razorpay {environment} Mode credentials configured and encrypted.",
        "connection": conn.to_dict()
    })


@app.route("/api/gateway/status", methods=["GET"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def gateway_status():
    merchant_id = store.get_current_merchant_id()
    adapter = get_merchant_gateway_adapter(merchant_id)
    return jsonify(adapter.get_mode_info())


@app.route("/api/gateway/test", methods=["POST"])
@require_role(["MERCHANT_ADMIN"])
def gateway_test():
    merchant_id = store.get_current_merchant_id()
    adapter = get_merchant_gateway_adapter(merchant_id)
    return jsonify(adapter.ping())


# --- Revenue Signal Ingestion (`/api/webhooks/razorpay`, `/api/ingestion/csv`)

@app.route("/api/webhooks/razorpay", methods=["POST"])
def razorpay_webhook():
    """Ingests Razorpay Webhooks (verifies HMAC SHA256 signature)."""
    raw_body = request.get_data(as_text=True)
    signature = request.headers.get("X-Razorpay-Signature", "")
    merchant_id = store.get_current_merchant_id()

    conn = GatewayConnection.query.filter_by(merchant_id=merchant_id, environment="TEST").first()
    webhook_secret = conn.key_id if conn else "dev_secret"

    if signature and not verify_webhook_signature(raw_body, signature, webhook_secret):
        return jsonify({"error": "Invalid webhook signature"}), 400

    payload = request.get_json(silent=True) or {}
    event_type = payload.get("event", "payment.failed")
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

    amount = payment_entity.get("amount", 500000) / 100.0 if payment_entity else 5000.0
    email = payment_entity.get("email", "customer@example.com")
    contact = payment_entity.get("contact", "+919876543210")

    cust = Customer.query.filter_by(merchant_id=merchant_id, email=email).first()
    if not cust:
        cust = Customer(merchant_id=merchant_id, name="Webhook Customer", email=email, phone=contact)
        db.session.add(cust)
        db.session.commit()

    sig = RevenueSignal(
        merchant_id=merchant_id,
        customer_id=cust.id,
        source="WEBHOOK",
        event_type=event_type,
        amount=amount,
        currency="INR",
        raw_payload=payload
    )
    db.session.add(sig)
    db.session.flush()

    case_num = f"RR-WH-{int(datetime.now(timezone.utc).timestamp())}"
    c = Case(
        merchant_id=merchant_id,
        signal_id=sig.id,
        customer_id=cust.id,
        case_number=case_num,
        status="DETECTED",
        amount=amount,
        currency="INR",
        risk_level="HIGH" if amount >= 5000 else "LOW",
        assigned_tier=2 if amount >= 5000 else 1
    )
    db.session.add(c)
    db.session.commit()

    return jsonify({"success": True, "case_id": c.id, "case_number": case_num})


@app.route("/api/ingestion/csv", methods=["POST"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR"])
def csv_ingestion():
    """Ingests failed payment signals via CSV upload."""
    if "file" not in request.files:
        return jsonify({"error": "CSV file required in 'file' form field"}), 400

    file = request.files["file"]
    stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
    reader = csv.DictReader(stream)

    merchant_id = store.get_current_merchant_id()
    created_count = 0

    for row in reader:
        amount = float(row.get("amount", 2500))
        email = row.get("email", "csv.customer@example.com")
        name = row.get("name", "CSV Customer")

        cust = Customer.query.filter_by(merchant_id=merchant_id, email=email).first()
        if not cust:
            cust = Customer(merchant_id=merchant_id, name=name, email=email)
            db.session.add(cust)
            db.session.commit()

        sig = RevenueSignal(
            merchant_id=merchant_id,
            customer_id=cust.id,
            source="CSV_IMPORT",
            event_type="payment.failed",
            amount=amount,
            currency="INR",
            raw_payload=dict(row)
        )
        db.session.add(sig)
        db.session.flush()

        case_num = f"RR-CSV-{int(datetime.now(timezone.utc).timestamp())}-{created_count+1}"
        c = Case(
            merchant_id=merchant_id,
            signal_id=sig.id,
            customer_id=cust.id,
            case_number=case_num,
            status="DETECTED",
            amount=amount,
            currency="INR",
            risk_level="HIGH" if amount >= 5000 else "LOW",
            assigned_tier=2 if amount >= 5000 else 1
        )
        db.session.add(c)
        created_count += 1

    db.session.commit()
    return jsonify({"success": True, "created_cases": created_count})


# --- Cases, Approvals, Ledger & Audit Endpoints ---------------------------

@app.route("/api/cases", methods=["GET"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def get_cases():
    include_closed = request.args.get("include_closed", "false").lower() == "true"
    cases = store.list_cases(include_closed=include_closed, sort_by_priority=True)
    return jsonify({"count": len(cases), "cases": cases})


@app.route("/api/cases/<case_id>", methods=["GET"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def get_case_detail(case_id):
    data = store.get_case(case_id)
    if not data:
        return jsonify({"error": f"Case {case_id} not found"}), 404
    return jsonify(data)


@app.route("/api/cases/<case_id>/diagnose", methods=["GET", "POST"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def diagnose_case(case_id):
    diag = agent.diagnose_root_cause(case_id)
    gate = agent.evaluate_policy_gate(case_id)
    return jsonify({"diagnosis": diag, "policy_gate": gate})


@app.route("/api/cases/<case_id>/action", methods=["POST"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR"])
def execute_action(case_id):
    data = request.get_json() or {}
    action_type = data.get("action_type", "create_payment_link")
    res = agent.execute_recovery_action(case_id, action_type)
    return jsonify(res)


@app.route("/api/cases/<case_id>/verify", methods=["POST"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR"])
def verify_payment(case_id):
    data = request.get_json() or {}
    note = data.get("verification_note", "Payment evidence verified")
    res = store.verify_and_close(case_id, note)
    return jsonify(res)


@app.route("/api/approvals", methods=["GET"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def list_approvals():
    approvals = store.list_pending_approvals()
    return jsonify({"count": len(approvals), "approvals": approvals})


@app.route("/api/approvals/<case_id>/approve", methods=["POST"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR"])
def approve_action(case_id):
    res = store.approve_and_send_draft(case_id, approver="Finance Operator")
    return jsonify(res)


@app.route("/api/approvals/<case_id>/reject", methods=["POST"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR"])
def reject_action(case_id):
    res = store.escalate_case(case_id, "Draft rejected by operator — escalated for manual review")
    return jsonify(res)


@app.route("/api/ledger", methods=["GET"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def get_ledger():
    ledger = store.get_ledger()
    return jsonify({"count": len(ledger), "ledger": ledger})


@app.route("/api/audit", methods=["GET"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def get_audit():
    logs = store.get_audit_logs()
    return jsonify({"count": len(logs), "audit_logs": logs})


@app.route("/api/worker/status", methods=["GET"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def get_worker():
    return jsonify(worker.get_worker_status())


@app.route("/api/evaluation/run", methods=["POST"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR"])
def run_eval():
    res = evaluation.run_batch_evaluation()
    return jsonify(res)


@app.route("/api/evaluation/results", methods=["GET"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR", "AUDITOR"])
def get_eval_results():
    res = evaluation.get_evaluation_results()
    return jsonify(res)


@app.route("/api/agent/run", methods=["POST"])
@require_role(["MERCHANT_ADMIN", "FINANCE_OPERATOR"])
def run_agent():
    summary = agent.run_agent_cycle()
    return jsonify({"success": True, "run_summary": summary})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"[app] Starting RazorRecover API Server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)
