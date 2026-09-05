"""
app.py — Main Flask REST API Server for RazorRecover.

Provides authenticated endpoints for frontend control room, approval queue,
case investigation, analytics, and live activity timeline.
"""

import os
import sys
from datetime import datetime, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv
load_dotenv()

try:
    from . import store, policy, agent, metrics, seed_data, evaluation
    from .auth import require_role
    from .razorpay_client import razorpay_adapter
except ImportError:
    import store, policy, agent, metrics, seed_data, evaluation
    from auth import require_role
    from razorpay_client import razorpay_adapter

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-User-Role"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "app": "RazorRecover Backend API",
        "status": "online",
        "database": store.get_db_status(),
        "razorpay_mode": razorpay_adapter.get_mode_info()
    })


@app.route("/api/razorpay/status", methods=["GET"])
def razorpay_status():
    res = razorpay_adapter.get_mode_info()
    res["database"] = store.get_db_status()
    return jsonify(res)


@app.route("/api/razorpay/ping", methods=["POST"])
def razorpay_ping():
    result = razorpay_adapter.ping()
    return jsonify(result)


@app.route("/api/invoices/sync", methods=["GET", "POST"])
@require_role(["Merchant Admin", "Finance Operator"])
def sync_invoices():
    """Sync invoices from Razorpay Test API (or local store in Offline Mode)."""
    razorpay_info = razorpay_adapter.get_mode_info()
    synced_invoices = razorpay_adapter.fetch_invoices()
    cases = store.list_cases(include_closed=True)
    return jsonify({
        "success": True,
        "synced_count": len(cases),
        "razorpay_invoices_fetched": len(synced_invoices),
        "mode": razorpay_info.get("mode"),
        "source": "Razorpay Test API" if razorpay_info.get("is_live_sdk") else "Offline Simulation",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


@app.route("/api/seed", methods=["POST"])
@require_role(["Merchant Admin"])
def seed_endpoint():
    num = request.json.get("num_cases", 60) if request.is_json else 60
    seed_data.seed_database(num)
    return jsonify({"success": True, "message": f"Successfully seeded {num} cases."})


@app.route("/api/evaluation/generate", methods=["POST"])
@require_role(["Merchant Admin"])
def generate_eval():
    num = request.json.get("num_cases", 60) if request.is_json else 60
    res = evaluation.generate_evaluation_dataset(num)
    return jsonify(res)


@app.route("/api/evaluation/run", methods=["POST"])
@require_role(["Merchant Admin", "Finance Operator"])
def run_eval():
    res = evaluation.run_batch_evaluation()
    return jsonify(res)


@app.route("/api/evaluation/results", methods=["GET"])
def get_eval_results():
    res = evaluation.get_evaluation_results()
    return jsonify(res)


@app.route("/api/agent/run", methods=["POST"])
@require_role(["Merchant Admin", "Finance Operator"])
def run_agent():
    summary = agent.run_agent_cycle()
    return jsonify({"success": True, "run_summary": summary})


@app.route("/api/agent/metrics", methods=["GET"])
def get_metrics():
    batch_metrics = metrics.get_batch_metrics()
    return jsonify(batch_metrics)


@app.route("/api/cases", methods=["GET"])
def get_cases():
    include_closed = request.args.get("include_closed", "false").lower() == "true"
    cases = store.list_cases(include_closed=include_closed, sort_by_priority=True)
    return jsonify({"count": len(cases), "cases": cases})


@app.route("/api/cases/<case_id>", methods=["GET"])
def get_case_detail(case_id):
    data = agent.get_case_detail(case_id)
    if "error" in data:
        return jsonify(data), 404
    return jsonify(data)


@app.route("/api/cases/<case_id>/diagnose", methods=["GET", "POST"])
def diagnose_case(case_id):
    diag = agent.diagnose_root_cause(case_id)
    gate = agent.evaluate_policy_gate(case_id)
    return jsonify({"diagnosis": diag, "policy_gate": gate})


@app.route("/api/cases/<case_id>/action", methods=["POST"])
@require_role(["Merchant Admin", "Finance Operator"])
def execute_action(case_id):
    data = request.get_json() or {}
    action_type = data.get("action_type", "create_payment_link")
    res = agent.execute_recovery_action(case_id, action_type)
    return jsonify(res)


@app.route("/api/cases/<case_id>/verify", methods=["POST"])
@require_role(["Merchant Admin", "Finance Operator"])
def verify_payment(case_id):
    data = request.get_json() or {}
    note = data.get("verification_note", "Payment evidence verified")
    res = agent.verify_payment_evidence(case_id, note)
    return jsonify(res)


@app.route("/api/cases/<case_id>/dispute-split", methods=["POST"])
@require_role(["Merchant Admin", "Finance Operator"])
def split_dispute(case_id):
    data = request.get_json() or {}
    disputed_amount = float(data.get("disputed_amount", 0))
    reason = data.get("reason", "Client disputed invoice line item")
    res = store.split_disputed_amount(case_id, disputed_amount, reason)
    return jsonify(res)


@app.route("/api/approvals", methods=["GET"])
def list_approvals():
    approvals = store.list_pending_approvals()
    return jsonify({"count": len(approvals), "approvals": approvals})


@app.route("/api/approvals/<case_id>/approve", methods=["POST"])
@require_role(["Merchant Admin", "Finance Operator"])
def approve_action(case_id):
    res = store.approve_and_send_draft(case_id, approver="Merchant Admin")
    return jsonify(res)


@app.route("/api/approvals/<case_id>/reject", methods=["POST"])
@require_role(["Merchant Admin", "Finance Operator"])
def reject_action(case_id):
    res = store.escalate_case(case_id, "Draft rejected by user — escalated for manual review")
    return jsonify(res)


@app.route("/api/ledger", methods=["GET"])
def get_ledger():
    ledger = store.get_ledger()
    return jsonify({"count": len(ledger), "ledger": ledger})


@app.route("/api/runs", methods=["GET"])
def get_runs():
    runs = store.get_agent_runs()
    return jsonify({"count": len(runs), "runs": runs})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"[app] Starting RazorRecover API Server on port {port}...")
    # Make sure initial database is seeded
    seed_data.seed_database(60)
    app.run(host="0.0.0.0", port=port, debug=True)
