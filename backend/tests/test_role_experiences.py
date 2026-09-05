import urllib.request
import json
import uuid
import os
import sys

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:5000")

def post_json(endpoint, data, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Content-Type": "application/json",
        "Connection": "close",
        **({"Authorization": f"Bearer {token}"} if token else {})
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def get_json(endpoint, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Content-Type": "application/json",
        "Connection": "close",
        **({"Authorization": f"Bearer {token}"} if token else {})
    }
    req = urllib.request.Request(
        url,
        headers=headers,
        method="GET"
    )
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def run_tests():
    print("=== STARTING END-TO-END ROLE & WORKSPACE VERIFICATION ===", flush=True)
    
    # 1. Test Real Merchant Signup
    unique_id = uuid.uuid4().hex[:6]
    signup_email = f"merchant_{unique_id}@saas.io"
    print(f"\n[Test 1] Registering New Merchant Organization: {signup_email}...", flush=True)
    status, res = post_json("/api/auth/signup", {
        "business_name": f"Enterprise Test Lab {unique_id}",
        "name": "Alex Mercer",
        "email": signup_email,
        "password": "password123"
    })
    print(f"Status: {status}, Role: {res.get('role')}, Token Issued: {bool(res.get('token'))}", flush=True)
    assert status == 200, f"Signup failed with status {status}"
    assert res.get("role") == "MERCHANT_ADMIN"
    new_merchant_token = res.get("token")

    # Verify new merchant starts with 0 cases (Clean Empty State)
    status, cases_res = get_json("/api/cases?include_closed=true", new_merchant_token)
    print(f"New Merchant Initial Cases Count: {cases_res.get('count', 0)} (Expected: 0 for clean state)", flush=True)
    assert cases_res.get("count", 0) == 0

    # 2. Test Role 1: Merchant Admin (admin@razorrecover.io)
    print("\n[Test 2] Logging in as Demo Merchant Admin (admin@razorrecover.io)...", flush=True)
    status, admin_auth = post_json("/api/auth/login", {
        "email": "admin@razorrecover.io",
        "password": "password123"
    })
    assert status == 200, f"Admin login failed with status {status}"
    admin_token = admin_auth["token"]
    print(f"Admin Role Confirmed: {admin_auth['role']}", flush=True)

    # Check Admin Access to Cases, Gateway, Agent Worker
    status, admin_cases = get_json("/api/cases", admin_token)
    status_gw, gw_info = get_json("/api/gateway/status", admin_token)
    status_w, worker_info = get_json("/api/worker/status", admin_token)
    print(f"Admin Cases: {admin_cases.get('count')}, Gateway Mode: {gw_info.get('mode')}, Worker: {worker_info.get('status')}", flush=True)
    assert status == 200 and status_gw == 200 and status_w == 200

    # 3. Test Role 2: Finance Operator (finance@razorrecover.io)
    print("\n[Test 3] Logging in as Demo Finance Operator (finance@razorrecover.io)...", flush=True)
    status, finance_auth = post_json("/api/auth/login", {
        "email": "finance@razorrecover.io",
        "password": "password123"
    })
    assert status == 200, f"Finance login failed with status {status}"
    finance_token = finance_auth["token"]
    print(f"Finance Role Confirmed: {finance_auth['role']}", flush=True)

    # Check Finance Access to Approvals Queue
    status, approvals_res = get_json("/api/approvals", finance_token)
    print(f"Approvals in Queue: {approvals_res.get('count', 0)}", flush=True)
    assert status == 200

    # 4. Test Role 3: Auditor (auditor@razorrecover.io)
    print("\n[Test 4] Logging in as Demo Auditor (auditor@razorrecover.io)...", flush=True)
    status, auditor_auth = post_json("/api/auth/login", {
        "email": "auditor@razorrecover.io",
        "password": "password123"
    })
    assert status == 200, f"Auditor login failed with status {status}"
    auditor_token = auditor_auth["token"]
    print(f"Auditor Role Confirmed: {auditor_auth['role']}", flush=True)

    # Check Auditor Access to Ledger & Audit Logs
    status_l, ledger_res = get_json("/api/ledger", auditor_token)
    status_a, audit_res = get_json("/api/audit", auditor_token)
    print(f"Ledger Entries: {ledger_res.get('count', 0)}, Audit Logs: {audit_res.get('count', 0)}", flush=True)
    assert status_l == 200 and status_a == 200

    # Verify Auditor CANNOT execute gateway configuration (RBAC Protection)
    status_bad, _ = post_json("/api/gateway/connect", {"key_id": "test", "key_secret": "test"}, auditor_token)
    print(f"Auditor unauthorized action blocked by RBAC: HTTP {status_bad} (Expected: 403 Forbidden)", flush=True)
    assert status_bad == 403

    print("\n=== ALL ROLE WORKSPACES & RBAC RULES PASSED 100% ===", flush=True)

if __name__ == "__main__":
    run_tests()
