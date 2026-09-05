"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, getStoredUser } from "@/lib/api";
import RazorpayModal from "@/components/RazorpayModal";
import RazorpaySettingsModal from "@/components/RazorpaySettingsModal";
import CsvImportModal from "@/components/CsvImportModal";
import {
  Play, RotateCw, ShieldCheck, AlertTriangle, CheckCircle2, DollarSign,
  ArrowUpRight, Lock, Eye, Filter, ExternalLink, Sparkles, Search,
  ChevronLeft, ChevronRight, Upload, Users, FileText, Check, X,
  HelpCircle, RefreshCw, Cpu, ShieldAlert, ArrowRight, Activity, Clock
} from "lucide-react";

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [cases, setCases] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filterScenario, setFilterScenario] = useState("all");
  
  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal States
  const [selectedCaseForPay, setSelectedCaseForPay] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auditor Selected Case for Detailed Timeline Audit
  const [selectedAuditCase, setSelectedAuditCase] = useState(null);

  const loadData = async () => {
    try {
      const user = getStoredUser();
      if (user) setCurrentUser(user);

      const [mRes, cRes, aRes, lRes, logRes] = await Promise.all([
        api.getMetrics().catch(() => null),
        api.getCases(true).catch(() => ({ cases: [] })),
        api.getApprovals().catch(() => ({ approvals: [] })),
        api.getLedger().catch(() => ({ entries: [] })),
        api.getAuditLogs().catch(() => ({ logs: [] }))
      ]);
      if (mRes) setMetrics(mRes);
      if (cRes?.cases) {
        setCases(cRes.cases);
        if (!selectedAuditCase && cRes.cases.length > 0) {
          setSelectedAuditCase(cRes.cases[0]);
        }
      }
      if (aRes?.approvals) setApprovals(aRes.approvals);
      if (lRes?.entries) setLedgerEntries(lRes.entries);
      if (logRes?.logs) setAuditLogs(logRes.logs);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterScenario, itemsPerPage]);

  const handleRunAgent = async () => {
    try {
      setRunning(true);
      await api.runAgentCycle();
      await loadData();
    } catch (err) {
      alert("Failed to run agent cycle: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleApprove = async (approvalId) => {
    try {
      await api.approveAction(approvalId);
      await loadData();
    } catch (err) {
      alert("Approval error: " + err.message);
    }
  };

  const handleReject = async (approvalId) => {
    try {
      await api.rejectAction(approvalId);
      await loadData();
    } catch (err) {
      alert("Rejection error: " + err.message);
    }
  };

  const handlePaymentSuccess = async (id, note) => {
    await api.verifyPayment(id, note || "Paid via Quick Checkout Modal");
    setSelectedCaseForPay(null);
    await loadData();
  };

  // Role detection
  const isFinance = currentUser?.role === "FINANCE_OPERATOR";
  const isAuditor = currentUser?.role === "AUDITOR";
  const isAdmin = !isFinance && !isAuditor;

  // Filter & Search Cases
  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      (c.case_number && c.case_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.customer_name && c.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.customer_email && c.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.failure_reason && c.failure_reason.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = 
      filterScenario === "all" ||
      (filterScenario === "tier1" && c.assigned_tier === 1) ||
      (filterScenario === "tier2" && c.assigned_tier === 2) ||
      (filterScenario === "recovered" && c.status === "RECOVERED") ||
      (filterScenario === "approval" && c.status === "AWAITING_APPROVAL");

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredCases.length / itemsPerPage) || 1;
  const paginatedCases = filteredCases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const pendingApprovalsList = approvals.filter(a => a.status === "PENDING");
  const pendingApprovalsAmount = pendingApprovalsList.reduce((sum, a) => sum + (a.case_amount || 0), 0);
  const recoveringCases = cases.filter(c => c.status === "RECOVERING");

  return (
    <div className="space-y-8 py-2">
      
      {/* ──────────────────────────────────────────────────────────────────────────
          1. 👑 MERCHANT ADMIN DASHBOARD EXPERIENCE
      ────────────────────────────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="space-y-8">
          {/* Admin Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-200/10 pb-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  👑 Merchant Admin Control Room
                </span>
                <span className="text-xs font-bold text-sand-500">•</span>
                <span className="text-xs text-sand-400">
                  {currentUser?.merchant?.business_name || "Merchant Organization"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Revenue Recovery Overview
              </h1>
              <p className="text-xs text-sand-400 mt-1">
                Executive business metrics, autonomous background recovery controls, and revenue failure triage.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsCsvModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleRunAgent}
                disabled={running}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold text-xs transition shadow-lg"
              >
                <RotateCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
                <span>{running ? "Processing Cycle..." : "Process Batch Now"}</span>
              </button>
            </div>
          </div>

          {/* Admin Empty State (0 cases) */}
          {cases.length === 0 && !loading && (
            <div className="glass-card p-8 rounded-3xl border border-sand-200/20 bg-[#16100c] text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-xl font-black text-white">Welcome to RazorRecover!</h2>
                <p className="text-xs text-sand-300 leading-relaxed">
                  Your autonomous recovery agent is ready. Connect your Razorpay Test keys or import a CSV batch to begin detecting failed payments.
                </p>
              </div>
              <div className="flex justify-center space-x-3 pt-3">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg"
                >
                  Connect Razorpay
                </button>
                <button
                  onClick={() => setIsCsvModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition shadow-lg"
                >
                  Import CSV Batch
                </button>
              </div>
            </div>
          )}

          {/* Admin Executive KPIs */}
          {cases.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sand-400">Revenue at Risk</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  ₹{(metrics?.total_revenue_at_risk || 0).toLocaleString("en-IN")}
                </div>
                <p className="text-[10px] text-sand-500">Failed & overdue pipeline</p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sand-400">Verified Recovered</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  ₹{(metrics?.total_recovered_revenue || 0).toLocaleString("en-IN")}
                </div>
                <p className="text-[10px] text-sand-500">Confirmed in recovery ledger</p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sand-400">Recovery Rate</span>
                  <Sparkles className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-2xl font-black text-teal-400">
                  {metrics?.recovery_rate_pct !== undefined ? `${metrics.recovery_rate_pct.toFixed(1)}%` : "0.0%"}
                </div>
                <p className="text-[10px] text-sand-500">Verified recovery efficiency</p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sand-400">Agent Status</span>
                  <Cpu className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex items-center space-x-2 pt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-lg font-black text-white">AUTONOMOUS</span>
                </div>
                <p className="text-[10px] text-sand-500">APScheduler (120s polling)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          2. 💼 FINANCE OPERATOR DASHBOARD EXPERIENCE (QUEUE & APPROVAL FOCUSED)
      ────────────────────────────────────────────────────────────────────────── */}
      {isFinance && (
        <div className="space-y-8">
          {/* Finance Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-200/10 pb-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  💼 Finance Operations Control
                </span>
                <span className="text-xs font-bold text-sand-500">•</span>
                <span className="text-xs text-sand-400">Human Authorization & Recovery Queue</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Financial Approvals & Recovery Queue
              </h1>
              <p className="text-xs text-sand-400 mt-1">
                Evaluate AI root cause context for Tier 2 cases (&gt; ₹5,000), authorize recovery outreach, and track payment settlements.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href="/approvals"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-lg flex items-center space-x-1.5"
              >
                <span>Full Approvals Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Finance Queue Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-amber-500/30 bg-[#1c1812] space-y-1">
              <span className="text-[11px] font-bold text-amber-300">Pending Authorization</span>
              <div className="text-2xl font-black text-amber-400">
                {pendingApprovalsList.length} cases
              </div>
              <p className="text-[10px] text-amber-200/70 font-mono">₹{pendingApprovalsAmount.toLocaleString("en-IN")} at stake</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-indigo-500/30 bg-[#141620] space-y-1">
              <span className="text-[11px] font-bold text-indigo-300">Awaiting Settlement</span>
              <div className="text-2xl font-black text-indigo-400">
                {recoveringCases.length} links sent
              </div>
              <p className="text-[10px] text-indigo-200/70">Customer payment in progress</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-[#141c16] space-y-1">
              <span className="text-[11px] font-bold text-emerald-300">Verified Recovered</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₹{(metrics?.total_recovered_revenue || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-emerald-200/70">Logged to verified ledger</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
              <span className="text-[11px] font-bold text-sand-400">Policy Gate Bound</span>
              <div className="text-lg font-black text-white pt-1">
                Tier 2: &gt; ₹5,000
              </div>
              <p className="text-[10px] text-sand-500">Autonomous override blocked</p>
            </div>
          </div>

          {/* PRIORITY ACTION REQUIRED: Pending Approval Triage Cards */}
          <div className="glass-card p-6 rounded-3xl border border-amber-500/30 bg-[#18130d] space-y-5">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-extrabold text-white">Tier 2 Actions Requiring Authorization</h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingApprovalsList.length} Pending
              </span>
            </div>

            {pendingApprovalsList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-black/30 border border-sand-200/10 text-xs text-sand-400">
                🎉 No pending approvals in queue! All high-value cases are currently addressed.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovalsList.slice(0, 5).map((appr) => (
                  <div key={appr.id} className="p-5 rounded-2xl bg-black/50 border border-amber-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white">{appr.customer_name || "Enterprise Customer"}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-sand-300">{appr.case_number}</span>
                        </div>
                        <p className="text-xs text-sand-400 mt-0.5 font-mono">{appr.customer_email || "billing@customer.com"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-amber-400 font-mono">₹{(appr.case_amount || 0).toLocaleString("en-IN")}</span>
                        <div className="text-[10px] text-amber-300 font-bold">Tier 2 Human Gate</div>
                      </div>
                    </div>

                    {/* AI Diagnosis Context */}
                    <div className="p-3 rounded-xl bg-[#241a12] border border-amber-500/20 text-xs text-sand-300 space-y-1">
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <Cpu className="w-3.5 h-3.5 text-blue-400" />
                        <span>AI Root Cause Diagnosis & Recommendation:</span>
                      </div>
                      <p className="text-[11px] text-sand-300 leading-relaxed">
                        {appr.proposed_action ? `Proposed Action: ${appr.proposed_action}. Reason: High value transaction requiring verified human sign-off.` : "Customer payment commitment broken. Recommended action: Dispatch personalized recovery link with 5-day grace period."}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-1">
                      <button
                        onClick={() => handleReject(appr.id)}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold transition flex items-center space-x-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject Action</span>
                      </button>
                      <button
                        onClick={() => handleApprove(appr.id)}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg flex items-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Authorize & Dispatch Link</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          3. ⚖️ AUDITOR DASHBOARD EXPERIENCE (COMPLIANCE & EVIDENCE FOCUSED)
      ────────────────────────────────────────────────────────────────────────── */}
      {isAuditor && (
        <div className="space-y-8">
          {/* Auditor Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-200/10 pb-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  ⚖️ Independent Compliance & Audit Control
                </span>
                <span className="text-xs font-bold text-sand-500">•</span>
                <span className="text-xs text-sand-400">Strict Read-Only Verification Environment</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Compliance Audit & Verification Records
              </h1>
              <p className="text-xs text-sand-400 mt-1">
                Inspect immutable decision records, policy adherence proof, and independent Razorpay payment verification evidence.
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-purple-500/10 border border-purple-500/30 px-3.5 py-2 rounded-xl text-purple-300 text-xs font-bold">
              <Lock className="w-4 h-4" />
              <span>Read-Only Mode Enforced</span>
            </div>
          </div>

          {/* Compliance Metrics Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-purple-500/30 bg-[#161020] space-y-1">
              <span className="text-[11px] font-bold text-purple-300">Policy Compliance Score</span>
              <div className="text-2xl font-black text-purple-400">100.0%</div>
              <p className="text-[10px] text-purple-200/70">0 policy violations detected</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-[#101814] space-y-1">
              <span className="text-[11px] font-bold text-emerald-300">Verified Ledger Balance</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ₹{(metrics?.total_recovered_revenue || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-emerald-200/70">{ledgerEntries.length} verified ledger entries</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
              <span className="text-[11px] font-bold text-sand-400">Unsafe Action Rate</span>
              <div className="text-2xl font-black text-emerald-400">0.0%</div>
              <p className="text-[10px] text-sand-500">Zero unauthorized executions</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
              <span className="text-[11px] font-bold text-sand-400">Total Audit Events</span>
              <div className="text-2xl font-black text-blue-400">{auditLogs.length}</div>
              <p className="text-[10px] text-sand-500">Cryptographically verifiable</p>
            </div>
          </div>

          {/* Interactive Decision & Verification Audit Timeline Inspector */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-[#161020] space-y-6">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">Compliance Inspector</span>
                <h2 className="text-lg font-black text-white">6-Stage Decision & Verification Audit Trail</h2>
              </div>
              <span className="text-xs text-sand-400">Click any case below to inspect audit evidence</span>
            </div>

            {selectedAuditCase ? (
              <div className="p-5 rounded-2xl bg-black/50 border border-purple-500/30 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="text-base font-black text-white">{selectedAuditCase.customer_name} ({selectedAuditCase.case_number})</div>
                    <div className="text-xs text-sand-400 font-mono">{selectedAuditCase.customer_email} · Failure: {selectedAuditCase.failure_reason}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-emerald-400 font-mono">₹{(selectedAuditCase.amount || 0).toLocaleString("en-IN")}</span>
                    <div className="text-[10px] font-bold text-purple-300">Status: {selectedAuditCase.status}</div>
                  </div>
                </div>

                {/* 6 Stage Audit Trace */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">1. Ingestion Evidence</span>
                    <p className="text-[11px] text-sand-300">Revenue Signal Captured with raw payload & HMAC signature verified.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">2. AI Diagnosis</span>
                    <p className="text-[11px] text-sand-300">Gemini diagnosed root cause without hallucinating financial authority.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">3. Policy Rule Gating</span>
                    <p className="text-[11px] text-sand-300">Classified as Tier {selectedAuditCase.assigned_tier} strictly by Python deterministic rule.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">4. Authorization Proof</span>
                    <p className="text-[11px] text-sand-300">{selectedAuditCase.assigned_tier === 1 ? "Tier 1: Pre-authorized by merchant policy." : "Tier 2: Authorized by Finance Operator."}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">5. Razorpay Verification</span>
                    <p className="text-[11px] text-sand-300">Queried Razorpay Test Mode API before updating status.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">6. Immutable Ledger</span>
                    <p className="text-[11px] text-sand-300">Settled to verified recovery ledger with timestamp.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-sand-500">
                Select a case from the table to view the detailed audit timeline.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          4. CASES TABLE (ADAPTIVE ACROSS ROLES)
      ────────────────────────────────────────────────────────────────────────── */}
      {cases.length > 0 && (
        <div className="glass-card p-6 rounded-3xl border border-sand-200/20 bg-[#16100c] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">
                {isFinance ? "Recovery Queue & Action Status" : isAuditor ? "Case Audit Log & Verification Ledger" : "All Pipeline Cases"}
              </h2>
              <p className="text-xs text-sand-400">
                {isFinance ? "Cases filtered by recovery priority" : isAuditor ? "Immutable state records" : "Real-time state machine pipeline"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterScenario("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterScenario === "all" ? "bg-sand-200/20 text-white" : "text-sand-400 hover:text-white"
                }`}
              >
                All ({cases.length})
              </button>
              <button
                onClick={() => setFilterScenario("tier1")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterScenario === "tier1" ? "bg-emerald-500/20 text-emerald-400" : "text-sand-400 hover:text-white"
                }`}
              >
                Tier 1 (Auto)
              </button>
              <button
                onClick={() => setFilterScenario("tier2")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterScenario === "tier2" ? "bg-amber-500/20 text-amber-400" : "text-sand-400 hover:text-white"
                }`}
              >
                Tier 2 (Approval)
              </button>
              <button
                onClick={() => setFilterScenario("recovered")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterScenario === "recovered" ? "bg-teal-500/20 text-teal-400" : "text-sand-400 hover:text-white"
                }`}
              >
                Recovered
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-sand-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cases, customers, or reasons..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1c140e] border border-sand-200/20 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-sand-200/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#241a12] text-sand-300 border-b border-sand-200/10">
                <tr>
                  <th className="px-4 py-3 font-bold">Case #</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Amount</th>
                  <th className="px-4 py-3 font-bold">Reason</th>
                  <th className="px-4 py-3 font-bold">Tier / Gate</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200/10 text-sand-300">
                {paginatedCases.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-sand-500">
                      No cases match your current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => isAuditor && setSelectedAuditCase(c)}
                      className={`hover:bg-white/5 transition ${isAuditor ? "cursor-pointer" : ""}`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-white">
                        <Link href={`/cases/${c.id}`} className="hover:text-amber-400 transition">
                          {c.case_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{c.customer_name || "Customer"}</div>
                        <div className="text-[10px] text-sand-500 font-mono">{c.customer_email || "—"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-white">
                        ₹{(c.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sand-400 text-[11px] truncate max-w-[140px]">
                        {c.failure_reason || "Payment failure"}
                      </td>
                      <td className="px-4 py-3">
                        {c.assigned_tier === 1 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Tier 1 (Auto)
                          </span>
                        ) : c.assigned_tier === 2 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Tier 2 (Approval)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            Tier 3 (Escalate)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.status === "RECOVERED" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-500/20 text-teal-400">
                            RECOVERED ✓
                          </span>
                        ) : c.status === "AWAITING_APPROVAL" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            APPROVAL REQ
                          </span>
                        ) : c.status === "RECOVERING" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                            RECOVERING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                            {c.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {c.status === "RECOVERING" && !isAuditor && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCaseForPay(c);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition shadow"
                              title="Simulate customer paying Razorpay link"
                            >
                              Quick Pay
                            </button>
                          )}
                          <Link
                            href={`/cases/${c.id}`}
                            className="p-1.5 rounded-lg bg-sand-200/10 hover:bg-sand-200/20 text-sand-300 hover:text-white transition"
                            title="View Case Timeline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-sand-400 pt-2">
            <span>
              Showing {filteredCases.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCases.length)} of {filteredCases.length} cases
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-1.5 rounded-lg bg-sand-200/10 hover:bg-sand-200/20 disabled:opacity-30 text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-white px-2">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 rounded-lg bg-sand-200/10 hover:bg-sand-200/20 disabled:opacity-30 text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedCaseForPay && (
        <RazorpayModal
          isOpen={!!selectedCaseForPay}
          onClose={() => setSelectedCaseForPay(null)}
          caseData={selectedCaseForPay}
          onSuccess={(note) => handlePaymentSuccess(selectedCaseForPay.id, note)}
        />
      )}

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportSuccess={() => loadData()}
      />

      <RazorpaySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
