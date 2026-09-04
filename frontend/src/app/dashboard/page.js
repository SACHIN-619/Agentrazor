"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import RazorpayModal from "@/components/RazorpayModal";
import { Play, RotateCw, ShieldCheck, AlertTriangle, CheckCircle2, DollarSign, ArrowUpRight, Lock, Eye, Filter, ExternalLink, Sparkles, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("live"); // "live" or "eval"
  const [metrics, setMetrics] = useState(null);
  const [cases, setCases] = useState([]);
  const [evalResults, setEvalResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState(null);
  const [filterScenario, setFilterScenario] = useState("all");
  
  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Quick Pay Modal State
  const [selectedCaseForPay, setSelectedCaseForPay] = useState(null);

  const loadData = async () => {
    try {
      const [mRes, cRes, eRes] = await Promise.all([
        api.getMetrics().catch(() => null),
        api.getCases(false).catch(() => ({ cases: [] })),
        api.getEvaluationResults().catch(() => null)
      ]);
      if (mRes) setMetrics(mRes);
      if (cRes?.cases?.length > 0) setCases(cRes.cases);
      if (eRes) setEvalResults(eRes);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-poll every 5 seconds for live state updates
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterScenario, itemsPerPage]);

  const handleRunAgent = async () => {
    try {
      setRunning(true);
      const res = await api.runAgentCycle();
      setLastRunSummary(res.run_summary);
      await loadData();
    } catch (err) {
      alert("Failed to run agent cycle: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleRunEvaluation = async () => {
    try {
      setEvaluating(true);
      await api.generateEvaluation(60);
      const res = await api.runEvaluation();
      setEvalResults(res);
      await loadData();
    } catch (err) {
      alert("Failed to run batch evaluation: " + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setLoading(true);
      await api.seedDatabase(60);
      await loadData();
    } catch (err) {
      alert("Failed to reset dataset: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (id, note) => {
    await api.verifyPayment(id, note || "Paid via Quick Checkout Modal");
    setSelectedCaseForPay(null);
    await loadData();
  };

  // Filter & Search Logic
  const filteredCases = cases.filter(c => {
    const matchesScenario = filterScenario === "all" || c.scenario === filterScenario;
    if (!matchesScenario) return false;
    
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.case_id?.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q) ||
      c.client_email?.toLowerCase().includes(q) ||
      c.invoice_number?.toLowerCase().includes(q) ||
      c.scenario?.toLowerCase().includes(q) ||
      c.status?.toLowerCase().includes(q)
    );
  });

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredCases.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (validCurrentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, filteredCases.length);
  const paginatedCases = filteredCases.slice(startIdx, endIdx);

  return (
    <div className="space-y-8">
      {/* Mode Switcher Tabs & Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-sand-200/20">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Revenue Control Room</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          </h1>
          <p className="text-sand-300 text-sm mt-1">
            Real-time revenue-at-risk monitoring & autonomous recovery agent orchestrator
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2 bg-[#241a12] p-1.5 rounded-2xl border border-sand-200/20">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === "live" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-sand-300 hover:text-white"}`}
          >
            Live Test Mode
          </button>
          <button
            onClick={() => setActiveTab("eval")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === "eval" ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" : "text-sand-300 hover:text-white"}`}
          >
            Batch Evaluation Mode
          </button>
        </div>
      </div>

      {/* Mode Specific Action Bar */}
      {activeTab === "eval" ? (
        <div className="p-6 rounded-2xl bg-[#241a12] border border-amber-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glow-warm">
          <div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>Batch Recovery Evaluation Facility</span>
            </div>
            <p className="text-xs text-sand-300 mt-0.5">
              Evaluates agent performance on a 60-case dataset (40 dev / 20 held-out evaluation cases with ground-truth expected decisions).
            </p>
          </div>
          <button
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition transform active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${evaluating ? "animate-spin" : ""}`} />
            <span>{evaluating ? "Evaluating Batch..." : "RUN BATCH EVALUATION"}</span>
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center gap-3">
          <button
            onClick={handleSeedData}
            disabled={loading || running}
            className="px-4 py-2 rounded-xl bg-[#241a12] hover:bg-[#36271c] text-sand-200 text-xs font-semibold border border-sand-200/20 transition"
          >
            Reset Test Cases
          </button>

          <button
            onClick={handleRunAgent}
            disabled={running}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 transition transform active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
            <span>{running ? "Executing Agent Cycle..." : "RUN RECOVERY CYCLE"}</span>
          </button>
        </div>
      )}

      {/* Last Run Banner */}
      {lastRunSummary && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
              RUN
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Cycle Executed ({lastRunSummary.run_id})</span>
              </div>
              <div className="text-xs text-sand-300">
                Evaluated: {lastRunSummary.cases_evaluated} cases | Tier 1 Executed: {lastRunSummary.tier1_executed} | Tier 2 Queued: {lastRunSummary.tier2_queued} | Tier 3 Escalated: {lastRunSummary.tier3_escalated}
              </div>
            </div>
          </div>
          <div className="text-emerald-400 text-xs font-bold px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            +₹{lastRunSummary.recovered_this_run?.toLocaleString("en-IN")} Verified Recovered
          </div>
        </div>
      )}

      {/* Hero KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Revenue at Risk */}
        <div className="glass-card p-5 rounded-2xl space-y-2 border border-sand-200/10">
          <div className="flex justify-between items-center text-sand-300 text-xs font-semibold">
            <span>REVENUE AT RISK</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            ₹{metrics?.total_at_risk?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-sand-400">Across {metrics?.cases_count || 0} active revenue signals</div>
        </div>

        {/* KPI 2: Amount Recovered */}
        <div className="glass-card p-5 rounded-2xl space-y-2 border border-emerald-500/30 glow-emerald">
          <div className="flex justify-between items-center text-emerald-400 text-xs font-semibold">
            <span>RECOVERED AMOUNT</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            ₹{metrics?.total_recovered?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {metrics?.recovered_count || 0} verified payment recoveries
          </div>
        </div>

        {/* KPI 3: Recovery Rate % */}
        <div className="glass-card p-5 rounded-2xl space-y-2 border border-blue-500/30 glow-royal">
          <div className="flex justify-between items-center text-blue-400 text-xs font-semibold">
            <span>RECOVERY RATE</span>
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-400">
            {metrics?.recovery_rate_percent || 0}%
          </div>
          <div className="text-[11px] text-blue-300">
            Simulated Razorpay Test Value
          </div>
        </div>

        {/* KPI 4: Pending Decisions */}
        <div className="glass-card p-5 rounded-2xl space-y-2 border border-sand-200/10">
          <div className="flex justify-between items-center text-sand-300 text-xs font-semibold">
            <span>PENDING RECOVERY</span>
            <RotateCw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            ₹{metrics?.total_pending?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-sand-400">{metrics?.pending_count || 0} pending actions / approvals</div>
        </div>

        {/* KPI 5: Escalations */}
        <div className="glass-card p-5 rounded-2xl space-y-2 border border-red-500/20">
          <div className="flex justify-between items-center text-red-400 text-xs font-semibold">
            <span>HUMAN ESCALATIONS</span>
            <Lock className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-red-400">
            ₹{metrics?.total_escalated?.toLocaleString("en-IN") || "0"}
          </div>
          <div className="text-[11px] text-red-400 font-medium">
            {metrics?.escalated_count || 0} Tier 3 human-only cases
          </div>
        </div>
      </div>

      {/* Active Recovery Queue Table */}
      <div className="glass-panel rounded-3xl border border-sand-200/20 overflow-hidden space-y-4 p-6 glow-warm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Active Recovery Queue</span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#241a12] text-xs text-sand-200 font-mono border border-sand-200/20">
                {filteredCases.length}
              </span>
            </h2>
            <p className="text-xs text-sand-300">
              Ranked by financial urgency & authority bounds.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
            {/* Search Input Bar */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-sand-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search case, client, invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#140e0a] border border-sand-200/20 text-sand-100 placeholder-sand-500 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            {/* Scenario Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sand-400" />
              <select
                value={filterScenario}
                onChange={(e) => setFilterScenario(e.target.value)}
                className="bg-[#140e0a] border border-sand-200/20 text-sand-100 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Scenarios</option>
                <option value="payment_failure">Payment Failures</option>
                <option value="checkout_abandonment">Checkout Abandonments</option>
                <option value="overdue_invoice">Overdue Invoices</option>
                <option value="promise_broken">Broken Promises</option>
                <option value="dispute">Disputes</option>
              </select>
            </div>

            {/* Per Page Selector */}
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-[#140e0a] border border-sand-200/20 text-sand-100 rounded-xl px-2.5 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-sand-300 text-sm">Loading active recovery cases...</div>
        ) : filteredCases.length === 0 ? (
          <div className="py-12 text-center text-sand-300 text-sm">
            {searchQuery ? `No cases matching "${searchQuery}"` : "No cases match the selected scenario filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-sand-100">
              <thead className="bg-[#241a12] text-xs font-semibold text-sand-300 uppercase tracking-wider border-b border-sand-200/10">
                <tr>
                  <th className="py-3.5 px-4">Case ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Scenario</th>
                  <th className="py-3.5 px-4 text-right">Amount at Risk</th>
                  <th className="py-3.5 px-4">Authority Tier</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200/10">
                {paginatedCases.map((c) => {
                  const tier = c.authority_tier || 1;
                  const tierBadgeClass =
                    tier === 3
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : tier === 2
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

                  return (
                    <tr key={c.case_id} className="hover:bg-[#241a12]/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {c.case_id}
                        {c.is_held_out_eval && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 font-sans">
                            EVAL
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{c.client_name}</div>
                        <div className="text-xs text-sand-400">{c.client_email}</div>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-sand-200">
                        {c.scenario?.replace("_", " ")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        ₹{c.amount?.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${tierBadgeClass}`}>
                          <span>Tier {tier}</span>
                          <span className="text-[10px] opacity-80">
                            ({tier === 1 ? "Auto" : tier === 2 ? "Approval" : "Human"})
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize text-xs font-medium text-sand-200">
                          {c.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedCaseForPay(c)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 transition"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Pay Test</span>
                        </button>
                        <Link
                          href={`/cases/${c.case_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg border border-blue-500/20 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredCases.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-sand-200/10 text-xs text-sand-300">
            <div>
              Showing <span className="font-bold text-white">{startIdx + 1}</span> to <span className="font-bold text-white">{endIdx}</span> of <span className="font-bold text-white">{filteredCases.length}</span> cases
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={validCurrentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#241a12] border border-sand-200/20 hover:bg-[#36271c] disabled:opacity-40 transition font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pNum;
                  if (totalPages <= 5) {
                    pNum = i + 1;
                  } else if (validCurrentPage <= 3) {
                    pNum = i + 1;
                  } else if (validCurrentPage >= totalPages - 2) {
                    pNum = totalPages - 4 + i;
                  } else {
                    pNum = validCurrentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`px-3 py-1.5 rounded-lg font-mono font-bold transition ${
                        validCurrentPage === pNum
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-[#241a12] border border-sand-200/20 text-sand-300 hover:bg-[#36271c]"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={validCurrentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#241a12] border border-sand-200/20 hover:bg-[#36271c] disabled:opacity-40 transition font-semibold"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Pay Modal */}
      <RazorpayModal
        isOpen={Boolean(selectedCaseForPay)}
        onClose={() => setSelectedCaseForPay(null)}
        caseData={selectedCaseForPay}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
