"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { CheckSquare, CheckCircle2, XCircle, ShieldAlert, Eye, ArrowRight } from "lucide-react";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.getApprovals();
      setApprovals(res.approvals || []);
    } catch (err) {
      console.error("Failed to load approval queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleApprove = async (case_id) => {
    try {
      await api.approveAction(case_id);
      setActionMessage({ type: "success", text: `Action approved & executed for ${case_id}` });
      await loadApprovals();
    } catch (err) {
      setActionMessage({ type: "error", text: `Failed to approve: ${err.message}` });
    }
  };

  const handleReject = async (case_id) => {
    try {
      await api.rejectAction(case_id);
      setActionMessage({ type: "success", text: `Action rejected & escalated for ${case_id}` });
      await loadApprovals();
    } catch (err) {
      setActionMessage({ type: "error", text: `Failed to reject: ${err.message}` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-sand-200/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-8 h-8 text-amber-400" />
            <span>Human Approval Queue</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
              Tier 2 Safety Gate
            </span>
          </h1>
          <p className="text-sand-300 text-sm mt-1">
            Review and approve AI-drafted recovery interventions before execution.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${actionMessage.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {actionMessage.text}
        </div>
      )}

      {/* Approval Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-sand-300 text-sm">Loading approval queue...</div>
      ) : approvals.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-3 border border-sand-200/20 glow-warm">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">Approval Queue is Clear</h3>
          <p className="text-sm text-sand-300 max-w-md mx-auto">
            All Tier 2 actions have been reviewed or executed. Autonomous Tier 1 recovery continues operating in background.
          </p>
          <div className="pt-2">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-semibold">
              <span>Return to Control Room</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {approvals.map((item) => {
            const draft = item.draft_action || {};
            return (
              <div key={item.case_id} className="glass-card rounded-3xl border border-amber-500/20 p-6 space-y-4 glow-warm">
                {/* Card Top Banner */}
                <div className="flex justify-between items-start border-b border-sand-200/10 pb-3">
                  <div>
                    <span className="font-mono font-bold text-white text-base">{item.case_id}</span>
                    <h3 className="font-bold text-lg text-white mt-0.5">{item.client_name}</h3>
                    <span className="text-xs text-sand-400">{item.client_email}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-amber-400">
                      ₹{item.amount?.toLocaleString("en-IN")}
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-1 uppercase">
                      TIER 2 APPROVAL GATE
                    </span>
                  </div>
                </div>

                {/* Why is this here? AI Reasoning */}
                <div className="bg-[#140e0a] p-3.5 rounded-xl border border-sand-200/10 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Why Human Approval is Required:</span>
                  </div>
                  <p className="text-sand-200 leading-relaxed">
                    {item.exception_type === "promise_broken"
                      ? "Client payment promise deadline passed without payment evidence."
                      : item.amount >= 5000
                      ? `Case value (₹${item.amount?.toLocaleString("en-IN")}) exceeds the ₹5,000 autonomous threshold.`
                      : "Repeated contact attempts trigger Tier 2 safety review to prevent client spamming."}
                  </p>
                </div>

                {/* Draft Message Preview */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider">
                    Draft Action Preview
                  </span>
                  <div className="bg-[#140e0a] p-4 rounded-xl border border-sand-200/10 text-xs font-mono space-y-2 text-sand-100">
                    <div className="font-bold text-blue-400">
                      Subject: {draft.subject || `RazorRecover Recovery — ${item.case_id}`}
                    </div>
                    <div className="whitespace-pre-wrap text-sand-300 leading-relaxed">
                      {draft.body || "Please complete your outstanding payment via Razorpay recovery link."}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <Link
                    href={`/cases/${item.case_id}`}
                    className="inline-flex items-center gap-1 text-xs text-sand-400 hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Case</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(item.case_id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject & Escalate</span>
                    </button>

                    <button
                      onClick={() => handleApprove(item.case_id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition transform active:scale-95"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>APPROVE & EXECUTE</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
