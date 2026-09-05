# RazorRecover Frontend — Next.js 14 Web Application

The **RazorRecover Frontend** is a modern, responsive web application built with **Next.js 14 (App Router)** and Vanilla CSS design tokens. It provides a dual-experience interface tailored for both interactive hackathon evaluation and real-world merchant operations:

1. **Isolated Judge Demo Sandbox (`/demo`)**: Scripted, interactive walkthrough of Tier 1 autonomous recovery (₹4,800) and Tier 2 human approval gates (₹28,000) with explicit synthetic indicators.
2. **Authenticated Multi-Tenant Workspace**: Role-tailored dashboards and management tools for **Merchant Admins**, **Finance Operators**, and **Auditors**.

---

## Application Route Map

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND ROUTE TOPOLOGY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Public & Demo Space]                                                      │
│  ├── /                     Public Landing Page & 8-Stage Architecture       │
│  └── /demo                 Interactive Judge Sandbox (Synthetic Scenarios)  │
│                                                                             │
│  [Authentication & Onboarding]                                              │
│  ├── /login                Secure JWT Login with Demo Quick-Fill Accs       │
│  └── /signup               4-Step Merchant Organization Onboarding Wizard   │
│                                                                             │
│  [Authenticated Merchant Workspace]                                         │
│  ├── /dashboard            Role-Tailored Control Room (Admin / Ops / Audit) │
│  ├── /approvals            Tier 2 Human Approval Queue                      │
│  ├── /cases                Active Revenue-at-Risk Case Explorer             │
│  ├── /cases/[id]           Deep Case Investigation & 8-Stage Stepper        │
│  ├── /revenue-sources      Ingestion Hub (CSV Ingestion & Webhook Config)   │
│  ├── /agent                Autonomous Daemon Scheduler & Recovery Controls  │
│  ├── /analytics            Financial Ledger & Recovery Rate Metrics         │
│  └── /activity             Immutable Audit Trace Timeline (run_id)          │
│                                                                             │
│  [Customer Checkout Portal]                                                 │
│  └── /pay/[id]             Interactive Customer Payment Recovery Portal     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Role-Tailored Dashboard Views

| Role | Primary Dashboard Focus | Key Accessible Features |
| :--- | :--- | :--- |
| **👑 Merchant Admin** | Revenue Control Room & System Configuration | Gateway configuration, trigger autonomous cycles, run 60-case batch benchmarks, split disputed amounts. |
| **💼 Finance Operator** | Actionable Approval Queues & Customer Follow-ups | Review Tier 2 cases, approve/reject recovery plans, launch interactive payment simulators, track recovered ledger. |
| **🔍 Auditor** | Governance, Decision Accuracy & Compliance | Read-only access, inspect immutable `run_id` audit traces, verify held-out decision accuracy %, policy gate checks. |

---

## Key UI Components & Innovations

- **Collapsible Navigation Sidebar (`Sidebar.js`)**:
  - Features an intuitive collapse toggle button (`ChevronLeft` / `ChevronRight`).
  - **Hover Auto-Expansion**: Automatically expands when hovered in collapsed state for frictionless single-click navigation.
  - **Mobile Responsiveness**: Renders a sleek floating bottom navigation bar on mobile viewports.
- **8-Stage Lifecycle Stepper (`cases/[id]/page.js`)**:
  - Real-time visual progress through Detect, Diagnose, Decide, Gate, Execute, Verify, Measure, and Audit.
- **CSV Ingestion Modal (`CsvImportModal.js`)**:
  - Multi-part file upload with sample CSV template download and live server parsing feedback.
- **Interactive Checkout Simulator (`pay/[id]/page.js`)**:
  - Razorpay-style payment modal supporting UPI, Credit/Debit Cards, and Netbanking in Test Mode.

---

## Environment Configuration

Create a `.env.local` file in the `frontend/` directory:

```bash
# Backend Flask API URL (Local or Remote Production)
NEXT_PUBLIC_API_URL=http://localhost:5000
```

*For production deployment on Vercel, set `NEXT_PUBLIC_API_URL` to `https://agentrazor.onrender.com`.*

---

## Local Development & Setup

### 1. Prerequisites
- Node.js 18.x or 20.x
- npm or yarn

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```
*Builds and validates all 13 App Router routes with 0 TypeScript/ESLint/CSS compilation errors.*

---

## Default Demo Credentials

For rapid local testing and judging, use the quick-fill buttons on the [`/login`](file:///frontend/src/app/login/page.js) page or the credentials below:

- **👑 Merchant Admin**: `admin@razorrecover.io` / `password123`
- **💼 Finance Operator**: `finance@razorrecover.io` / `password123`
- **🔍 Auditor**: `auditor@razorrecover.io` / `password123`
- **🏢 Real Test Merchant**: `devin.tester@acmehorizon.com` / `password123`
