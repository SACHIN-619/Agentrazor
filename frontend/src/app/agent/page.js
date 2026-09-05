"use client";

import { useState, useEffect } from "react";
import {
  Cpu, Play, Pause, RotateCw, ShieldCheck, Lock, CheckCircle2,
  AlertTriangle, DollarSign, Activity, FileText, ArrowUpRight
} from "lucide-react";
import { api } from "@/lib/api";

export default function AgentControlPage() {
  const [workerStatus, setWorkerStatus] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningCycle, setRunningCycle] = useState(false);
  const [agentPaused, setAgentPaused] = useState(false);
  const [cycleResult, setCycleResult] = useState(null);

  const loadData = async () => {
    try {
      const [wRes, aRes, cRes] = await Promise.all([
        api.getWorkerStatus().catch(() => null),
        api.getAuditLogs().catch(() => ({ logs: [] })),
        api.getCases(false).catch(() => ({ cases: [] }))
      ]);
      if (wRes) setWorkerStatus(wRes);
      if (aRes?.logs) setAuditLogs(aRes.logs);
      if (cRes?.cases) setCases(cRes.cases);
    } catch (err) {
      console.error("Failed to load agent control data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerCycle = async () => {
    try {
      setRunningCycle(true);
      setCycleResult(null);
      const res = await api.runAgentCycle();
      setCycleResult(res.run_summary || { message: "Cycle completed" });
      await loadData();
    } catch (err) {
      alert("Failed to run agent cycle: " + err.message);
    } finally {
      setRunningCycle(false);
    }
  };

  const activeCasesCount = cases.filter(c => c.status !== "RECOVERED" && c.status !== "CLOSED").length;
  const pendingApprovalsCount = cases.filter(c => c.status === "AWAITING_APPROVAL").length;
  const recoveredCount = cases.filter(c => c.status === "RECOVERED").length;

  return (
    <div className="space-y-8 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-200/10 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Autonomous Intelligence & Policy Controller</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Agent Control Room</h1>
          <p className="text-xs text-sand-400 mt-1">
            Monitor autonomous background worker execution, financial policy gates, and live recovery telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAgentPaused(!agentPaused)}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition ${
              agentPaused
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
          >
            {agentPaused ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{agentPaused ? "Resume Agent" : "Pause Agent"}</span>
          </button>

          <button
            onClick={handleTriggerCycle}
            disabled={runningCycle}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-black font-extrabold text-xs transition shadow-lg"
          >
            <RotateCw className={`w-3.5 h-3.5 ${runningCycle ? "animate-spin" : ""}`} />
            <span>{runningCycle ? "Executing..." : "Process Batch Now"}</span>
          </button>
        </div>
      </div>

      {cycleResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span>
            🎉 <strong>Agent Cycle Completed:</strong> Processed {cycleResult.processed_count || 0} cases. Verified {cycleResult.verified_count || 0} recoveries.
          </span>
          <button onClick={() => setCycleResult(null)} className="text-sand-400 hover:text-white text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Real-Time Agent Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
          <span className="text-[11px] font-bold text-sand-400">Agent Status</span>
          <div className="flex items-center space-x-2 pt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${agentPaused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`}></span>
            <span className="text-sm font-black text-white">{agentPaused ? "PAUSED" : "ACTIVE MONITORING"}</span>
          </div>
          <p className="text-[10px] text-sand-500 mt-1">APScheduler Worker Polling (120s)</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
          <span className="text-[11px] font-bold text-sand-400">Active Pipeline Cases</span>
          <div className="text-2xl font-black text-blue-400">{activeCasesCount}</div>
          <p className="text-[10px] text-sand-500 mt-1">Detected & diagnosing</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
          <span className="text-[11px] font-bold text-sand-400">Pending Human Approvals</span>
          <div className="text-2xl font-black text-amber-400">{pendingApprovalsCount}</div>
          <p className="text-[10px] text-sand-500 mt-1">Tier 2 safety gated</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-sand-200/15 bg-[#16100c] space-y-1">
          <span className="text-[11px] font-bold text-sand-400">Verified Recoveries</span>
          <div className="text-2xl font-black text-emerald-400">{recoveredCount}</div>
          <p className="text-[10px] text-sand-500 mt-1">Payment verified & ledgered</p>
        </div>
      </div>

      {/* Autonomous Policy Gate Configuration */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-sand-200/20 bg-[#16100c] space-y-5">
        <div className="flex items-center justify-between border-b border-sand-200/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <Lock className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-extrabold text-white">Deterministic Financial Policy Gates</h2>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Enforced Outside LLM (Python)
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400">Tier 1: Autonomous</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Active</span>
            </div>
            <div className="text-xs font-bold text-white">Amounts &lt; ₹5,000</div>
            <p className="text-[11px] text-sand-400 leading-relaxed">
              Agent automatically dispatches Razorpay payment links and smart retries for low-risk failures.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400">Tier 2: Human Approval</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Gated</span>
            </div>
            <div className="text-xs font-bold text-white">₹5,000 – ₹50,000</div>
            <p className="text-[11px] text-sand-400 leading-relaxed">
              Autonomous execution blocked. Candidate action generated and held in queue for Finance Operator authorization.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-red-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-red-400">Tier 3: Strict Escalation</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">Escalated</span>
            </div>
            <div className="text-xs font-bold text-white">Amounts &gt; ₹50,000</div>
            <p className="text-[11px] text-sand-400 leading-relaxed">
              Disputed charges, fraud alerts, or high-value contracts strictly escalated to senior leadership.
            </p>
          </div>
        </div>
      </div>

      {/* Live Agent Execution Log */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-sand-200/20 bg-[#16100c] space-y-4">
        <div className="flex items-center justify-between border-b border-sand-200/10 pb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-extrabold text-white">Live Execution Feed</h2>
          </div>
          <span className="text-xs text-sand-400">Auto-refreshing every 5s</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-sand-500 text-xs">
            No agent actions recorded yet. Ingest revenue signals or click &quot;Process Batch Now&quot; to begin.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {auditLogs.slice(0, 15).map((log, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-black/40 border border-sand-200/10 flex items-start justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{log.action || log.event_type || "EXECUTION"}</span>
                    <span className="text-[10px] font-mono text-sand-400">
                      {log.case_id ? `Case #${log.case_id.slice(0, 8)}` : "SYSTEM"}
                    </span>
                  </div>
                  <p className="text-[11px] text-sand-300">
                    {typeof log.details === "object" ? JSON.stringify(log.details) : log.details || "Agent evaluated state transition"}
                  </p>
                </div>
                <span className="text-[10px] text-sand-500 font-mono flex-shrink-0 ml-2">
                  {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "Recent"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
