const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-User-Role": "Merchant Admin",
        ...(options.headers || {})
      },
      ...options
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  getHealth: () => fetchJson("/"),
  getRazorpayStatus: () => fetchJson("/api/razorpay/status"),
  pingRazorpay: () => fetchJson("/api/razorpay/ping", { method: "POST" }),
  syncInvoices: () => fetchJson("/api/invoices/sync", { method: "POST" }),
  seedDatabase: (num_cases = 60) => fetchJson("/api/seed", { method: "POST", body: JSON.stringify({ num_cases }) }),
  generateEvaluation: (num_cases = 60) => fetchJson("/api/evaluation/generate", { method: "POST", body: JSON.stringify({ num_cases }) }),
  runEvaluation: () => fetchJson("/api/evaluation/run", { method: "POST" }),
  getEvaluationResults: () => fetchJson("/api/evaluation/results"),
  runAgentCycle: () => fetchJson("/api/agent/run", { method: "POST" }),
  getMetrics: () => fetchJson("/api/agent/metrics"),
  getCases: (include_closed = false) => fetchJson(`/api/cases?include_closed=${include_closed}`),
  getCaseDetail: (id) => fetchJson(`/api/cases/${id}`),
  diagnoseCase: (id) => fetchJson(`/api/cases/${id}/diagnose`),
  executeAction: (id, action_type) => fetchJson(`/api/cases/${id}/action`, { method: "POST", body: JSON.stringify({ action_type }) }),
  verifyPayment: (id, verification_note) => fetchJson(`/api/cases/${id}/verify`, { method: "POST", body: JSON.stringify({ verification_note }) }),
  splitDispute: (id, disputed_amount, reason) => fetchJson(`/api/cases/${id}/dispute-split`, { method: "POST", body: JSON.stringify({ disputed_amount, reason }) }),
  getApprovals: () => fetchJson("/api/approvals"),
  approveAction: (id) => fetchJson(`/api/approvals/${id}/approve`, { method: "POST" }),
  rejectAction: (id) => fetchJson(`/api/approvals/${id}/reject`, { method: "POST" }),
  getLedger: () => fetchJson("/api/ledger"),
  getRuns: () => fetchJson("/api/runs")
};
