"""
test_jwt_verification.py — Empirical Proof of Pure JWT Authentication
"""

import urllib.request
import json
import os

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:5000")

def req_url(endpoint, method="GET", data=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = {"Content-Type": "application/json", "Connection": "close"}
    if headers:
        req_headers.update(headers)
    
    encoded_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {}

def test_pure_jwt_auth():
    print("\n--- TEST 1: UNPROTECTED REQUEST WITHOUT TOKEN (MUST BE 401) ---")
    status, body = req_url("/api/cases")
    print(f"Status without Token: {status}, Response: {body}")
    assert status == 401, "Expected 401 Unauthorized"

    print("\n--- TEST 2: FORGED TOKEN (MUST BE 401) ---")
    status, body = req_url("/api/cases", headers={"Authorization": "Bearer fake.tampered.token"})
    print(f"Status with Forged Token: {status}, Response: {body}")
    assert status == 401, "Expected 401 Unauthorized"

    print("\n--- TEST 3: X-USER-ROLE HEADER ONLY (MUST BE 401) ---")
    status, body = req_url("/api/cases", headers={"X-User-Role": "Merchant Admin"})
    print(f"Status with X-User-Role Spoof: {status}, Response: {body}")
    assert status == 401, "Expected 401 Unauthorized (X-User-Role is completely disabled)"

    print("\n--- TEST 4: AUTHENTICATE WITH VALID LOGIN (JWT ISSUED) ---")
    status, res_login = req_url("/api/auth/login", method="POST", data={
        "email": "admin@razorrecover.io",
        "password": "password123"
    })
    token = res_login.get("token")
    print(f"Login Success: {res_login.get('success')}, Role: {res_login.get('role')}")
    print(f"Token prefix: {token[:25]}...")
    assert status == 200 and token is not None

    print("\n--- TEST 5: REQUEST WITH VALID BEARER JWT (MUST BE 200) ---")
    status, res_auth = req_url("/api/cases", headers={"Authorization": f"Bearer {token}"})
    print(f"Status with Valid JWT: {status}, Cases count: {res_auth.get('count')}")
    assert status == 200, "Expected 200 OK"

    print("\n--- TEST 6: /api/auth/me IDENTITY RESOLUTION ---")
    status, res_me = req_url("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    print(f"Resolved Identity: {res_me.get('user', {}).get('email')}, Role: {res_me.get('role')}")
    assert res_me.get("user", {}).get("email") == "admin@razorrecover.io"

    print("\n=== ALL P0 REAL JWT SECURITY TESTS PASSED 100% ===")

if __name__ == "__main__":
    test_pure_jwt_auth()
