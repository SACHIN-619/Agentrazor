# RazorRecover Backend — Autonomous AI Recovery Engine

The **RazorRecover Backend** is a production-grade Python Flask application and autonomous agent service. It interfaces with Google Gemini LLMs for intelligent root-cause diagnosis, executes bounded recovery actions via Razorpay Test APIs, enforces deterministic Python policy boundaries, and manages multi-tenant state in PostgreSQL/SQLite.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND MODULE TOPOLOGY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [API Routing & Auth]       app.py, auth.py (Pure JWT & Role Decorators)    │
│            │                                                                │
│            ▼                                                                │
│  [Multi-Tenant Store]       store.py, models.py (SQLAlchemy 17 Models)      │
│            │                                                                │
│            ▼                                                                │
│  [AI Diagnosis Core]        agent.py (Google Gemini 2.5 + Structured Schema)│
│            │                                                                │
│            ▼                                                                │
│  [Deterministic Gate]       policy.py (Tier 1/2/3 Python Policy & Locks)    │
│            │                                                                │
│            ▼                                                                │
│  [Payment Gateway]          razorpay_client.py (Dual SDK / Mock Adapter)    │
│            │                                                                │
│            ▼                                                                │
│  [Scheduler & Daemon]       worker.py (APScheduler Autonomous Background)   │
│            │                                                                │
│            ▼                                                                │
│  [Evaluation Benchmark]     evaluation.py, metrics.py (60-Case Split)       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Modules

| Module | Description |
| :--- | :--- |
| [`app.py`](file:///backend/app.py) | Main Flask REST API server registering all endpoints, CORS configurations, and error handlers. |
| [`agent.py`](file:///backend/agent.py) | Google Gemini 2.5 client with structured JSON output, context memory, and deterministic recovery fallbacks. |
| [`policy.py`](file:///backend/policy.py) | Deterministic 3-Tier policy rules engine enforcing autonomous limits (< ₹5,000), approvals (≥ ₹5,000), and escalations (≥ ₹10,000 / disputes). |
| [`models.py`](file:///backend/models.py) | SQLAlchemy relational schema (17 models including Merchants, Users, Cases, Audit Runs, Gateways, and Ledger). |
| [`store.py`](file:///backend/store.py) | Relational persistence layer providing clean data access methods and transactional isolation. |
| [`auth.py`](file:///backend/auth.py) | Pure JWT authentication engine with bcrypt password hashing and RBAC permission decorators. |
| [`razorpay_client.py`](file:///backend/razorpay_client.py) | Dual-adapter gateway service with Fernet AES-256 encrypted credential storage and live Razorpay Test API calls. |
| [`worker.py`](file:///backend/worker.py) | APScheduler background daemon that periodically scans active merchant cases and executes autonomous recovery cycles. |
| [`evaluation.py`](file:///backend/evaluation.py) | 60-case synthetic evaluation suite (40 dev / 20 held-out test split) with ground-truth decision accuracy validation. |
| [`metrics.py`](file:///backend/metrics.py) | Computes recovery rates, false positive costs, ROI metrics, and scenario performance breakdowns. |

---

## Environment Configuration

Create a `.env` file in the `backend/` directory (refer to `.env.example`):

```bash
# Database Connection (Supabase PostgreSQL / SQLite fallback)
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# JWT Secret Key
JWT_SECRET_KEY=your_super_secret_jwt_key_here

# Google Gemini API Key
GEMINI_API_KEY=AIzaSyYourFreeKeyHere...
GEMINI_MODEL_DEFAULT=gemini-2.5-flash

# Razorpay Test Mode Credentials (Optional - Mock Adapter fallback active)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# AES-256 Fernet Encryption Key for Merchant Gateway Secrets
GATEWAY_ENCRYPTION_KEY=...

# CORS Allowed Origin
FRONTEND_URL=https://agentrazor-ochre.vercel.app,http://localhost:3000
```

---

## Local Installation & Quickstart

### 1. Prerequisites
- Python 3.10, 3.11, or 3.12
- Virtual environment tool (`venv`)

### 2. Setup Virtual Environment & Install Dependencies
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Seed Initial Demo Accounts & Data
```bash
python seed_data.py
```
*Seeds 3 default roles (`admin@razorrecover.io`, `finance@razorrecover.io`, `auditor@razorrecover.io`) and initial synthetic cases.*

### 4. Start the Backend API Server
```bash
python app.py
```
The Flask API server starts on **`http://localhost:5000`**.

---

## REST API Endpoints Reference

### 🔐 Authentication & Organizations
- `POST /api/auth/signup` — Register a new merchant organization and admin user.
- `POST /api/auth/login` — Authenticate and receive a signed Bearer JWT token.
- `GET  /api/auth/me` — Inspect authenticated user identity, role, and organization.

### 📋 Cases & Recovery Lifecycle
- `GET  /api/cases` — List active merchant cases (filterable by status, tier, scenario).
- `GET  /api/cases/<id>` — Retrieve full case details, AI diagnostic traces, and history.
- `POST /api/cases/<id>/action` — Execute an approved recovery intervention.
- `POST /api/cases/<id>/split` — Split disputed amounts into undisputed recovery vs escalated hold.

### 🚦 Approvals Queue (Finance Ops)
- `GET  /api/approvals` — List cases requiring human approval (Tier 2).
- `POST /api/approvals/<id>/approve` — Grant human consent and trigger execution.
- `POST /api/approvals/<id>/reject` — Reject proposal and escalate case to owner.

### 📂 Signal Ingestion Hub
- `POST /api/ingestion/csv` — Multi-part CSV file upload for batch payment failure ingestion.
- `POST /api/ingestion/sync-mock` — Ingest synthetic real-time gateway failure events.

### 💳 Razorpay Gateway Management
- `GET  /api/gateway/status` — Inspect gateway connection status, latency, and mode.
- `POST /api/gateway/connect` — Encrypt and save merchant Razorpay API credentials.
- `POST /api/gateway/ping` — Test live gateway connectivity with Razorpay Test APIs.

### 🤖 Autonomous Worker & Daemon
- `GET  /api/worker/status` — Query autonomous daemon scheduler state and next run time.
- `POST /api/worker/run-now` — Immediately trigger an autonomous recovery cycle.

### 🧪 Evaluation & Demo Sandbox
- `GET  /api/evaluation/results` — Fetch held-out benchmark decision accuracy % and metrics.
- `POST /api/evaluation/run` — Run batch evaluation against the 20 held-out test cases.
- `POST /api/demo/execute-step` — Execute an isolated, synthetic demo sandbox step.

---

## Automated Test Suites

Run the automated test suites using the virtual environment:

```bash
# 1. Deterministic Policy Rules & Unit Tests
python -m unittest tests/test_correctness.py

# 2. Pure JWT Security & Unauthorized Access Enforcement
python tests/test_jwt_verification.py

# 3. Multi-Tenant Role Authentication, Workspace Separation & RBAC
python tests/test_role_experiences.py

# 4. Live Multi-Part CSV Ingestion & Revenue Signal Parsing
python tests/test_csv_ingestion_live.py
```
