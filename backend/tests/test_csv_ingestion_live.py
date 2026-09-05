import urllib.request
import json
import os
import sys

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:5000")
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(CURRENT_DIR, "sample_failed_payments.csv")

def post_json(endpoint, data, token=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Connection": "close",
            **({"Authorization": f"Bearer {token}"} if token else {})
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))

def get_json(endpoint, token=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        headers={
            "Content-Type": "application/json",
            "Connection": "close",
            **({"Authorization": f"Bearer {token}"} if token else {})
        },
        method="GET"
    )
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))

def run_csv_test():
    print("=== TESTING LIVE CSV INGESTION & PROCESSING ===", flush=True)
    
    # 1. Login as Merchant Admin
    status, auth = post_json("/api/auth/login", {
        "email": "admin@razorrecover.io",
        "password": "password123"
    })
    token = auth["token"]
    print(f"Logged in as {auth['user']['email']}, Merchant ID: {auth['merchant']['id']}", flush=True)

    # 2. Upload CSV using multipart form data
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    with open(CSV_PATH, "rb") as f:
        file_content = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="sample_failed_payments.csv"\r\n'
        f"Content-Type: text/csv\r\n\r\n"
    ).encode("utf-8") + file_content + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/ingestion/csv",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {token}",
            "Connection": "close"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as response:
        status = response.status
        res = json.loads(response.read().decode("utf-8"))
        print(f"CSV Ingestion Result: Status {status}, Created Cases: {res.get('created_cases')}", flush=True)
        assert status == 200
        assert res.get("created_cases") == 4

    # 3. Retrieve Cases & check newly created CSV cases
    status, cases_data = get_json("/api/cases?include_closed=true", token)
    csv_cases = [c for c in cases_data.get("cases", []) if "RR-CSV-" in c.get("case_number", "")]
    print(f"Found {len(csv_cases)} ingested CSV cases in database.", flush=True)
    for c in csv_cases[-4:]:
        print(f" - {c['case_number']}: {c.get('customer_name')} | Amount: INR {c.get('amount')} | Tier: {c.get('assigned_tier')} | Status: {c.get('status')}", flush=True)

    print("\n=== CSV INGESTION TEST PASSED 100% ===", flush=True)

if __name__ == "__main__":
    run_csv_test()
