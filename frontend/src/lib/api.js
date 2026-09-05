/**
 * api.js — Real JWT Frontend API Client for RazorRecover SaaS.
 * 
 * Features:
 * - Automatic Authorization: Bearer <JWT> header injection
 * - Zero X-User-Role development spoofing
 * - Client-side 401 Unauthorized handling & login redirection
 * - Auth session management (login, signup, logout, getMe)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const TOKEN_KEY = "razorrecover_jwt_token";
const USER_KEY = "razorrecover_user";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function fetchJson(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      // Unauthenticated / expired JWT — clear session & redirect if not already on login page
      clearAuthSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=1";
      }
      const err = await res.json().catch(() => ({ error: "Unauthorized" }));
      throw new Error(err.error || "Unauthorized — please log in");
    }

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
  // Authentication & Identity
  login: async (email, password) => {
    const res = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (res.token) {
      setAuthSession(res.token, { ...res.user, role: res.role, merchant: res.merchant });
    }
    return res;
  },

  signup: async (business_name, email, password, name) => {
    const res = await fetchJson("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ business_name, email, password, name })
    });
    if (res.token) {
      setAuthSession(res.token, { ...res.user, role: res.role, merchant: res.merchant });
    }
    return res;
  },

  logout: () => {
    clearAuthSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  getMe: () => fetchJson("/api/auth/me"),
  getToken: getStoredToken,
  getUser: getStoredUser,

  // Health & Gateway
  getHealth: () => fetchJson("/"),
  getRazorpayStatus: () => fetchJson("/api/gateway/status"),
  pingRazorpay: () => fetchJson("/api/gateway/test", { method: "POST" }),
  connectGateway: (key_id, key_secret, environment = "TEST") =>
    fetchJson("/api/gateway/connect", {
      method: "POST",
      body: JSON.stringify({ key_id, key_secret, environment })
    }),

  // Revenue Ingestion
  syncInvoices: () => fetchJson("/api/cases?include_closed=true"),
  ingestCsv: (file) => {
    const token = getStoredToken();
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/ingestion/csv`, {
      method: "POST",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: formData
    }).then(r => r.json());
  },

  // Cases & State Machine
  getCases: (include_closed = false) => fetchJson(`/api/cases?include_closed=${include_closed}`),
  getCaseDetail: (id) => fetchJson(`/api/cases/${id}`),
  diagnoseCase: (id) => fetchJson(`/api/cases/${id}/diagnose`),
  executeAction: (id, action_type) => fetchJson(`/api/cases/${id}/action`, {
    method: "POST",
    body: JSON.stringify({ action_type })
  }),
  verifyPayment: (id, verification_note) => fetchJson(`/api/cases/${id}/verify`, {
    method: "POST",
    body: JSON.stringify({ verification_note })
  }),

  // Approvals Queue (Tier 2)
  getApprovals: () => fetchJson("/api/approvals"),
  approveAction: (id) => fetchJson(`/api/approvals/${id}/approve`, { method: "POST" }),
  rejectAction: (id) => fetchJson(`/api/approvals/${id}/reject`, { method: "POST" }),

  // Ledger, Audit, Runs & Evaluation
  getLedger: () => fetchJson("/api/ledger"),
  getAuditLogs: () => fetchJson("/api/audit"),
  getWorkerStatus: () => fetchJson("/api/worker/status"),
  runAgentCycle: () => fetchJson("/api/agent/run", { method: "POST" }),
  runEvaluation: () => fetchJson("/api/evaluation/run", { method: "POST" }),
  getEvaluationResults: () => fetchJson("/api/evaluation/results")
};
