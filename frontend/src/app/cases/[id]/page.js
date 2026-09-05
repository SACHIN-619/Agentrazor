"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import RazorpayModal from "@/components/RazorpayModal";
import { ArrowLeft, Cpu, Lock, CheckCircle2, AlertTriangle, ShieldCheck, Clock, FileText, Send, Split, ExternalLink, DollarSign } from "lucide-react";

export default function CaseDetailPage() {
  const params = useParams();
  const case_id = params?.id;

  const [data, setData] = useState(null);
  const [diag, setDiag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [disputeAmount, setDisputeAmount] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [msg, setMsg] = useState(null);

  const loadDetail = async () => {
    if (!case_id) return;
    try {
      setLoading(true);
      const [dRes, diagRes] = await Promise.all([
        api.getCaseDetail(case_id),
        api.diagnoseCase(case_id)
      ]);
      setData(dRes);
      setDiag(diagRes);
    } catch (err) {
      console.error("Failed to load case detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [case_id]);

  const handleExecuteAction = async (action_type) => {
    try {
      setActing(true);
      const res = await api.executeAction(case_id, action_type);
      setMsg({ type: "success", text: `Action '${action_type}' processed: ${res.message || "Executed"}` });
      await loadDetail();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActing(false);
    }
  };

  const handleVerify = async (id, note) => {
    try {
      setActing(true);
      await api.verifyPayment(case_id, note || "Payment verified via Razorpay Test Mode confirmation");
      setMsg({ type: "success", text: `Case ${case_id} successfully verified & marked RECOVERED!` });
      await loadDetail();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActing(false);
    }
  };

  const handleDisputeSplit = async (e) => {
    e.preventDefault();
    if (!disputeAmount) return;
    try {
      setActing(true);
      await api.splitDispute(case_id, parseFloat(disputeAmount), disputeReason || "Client dispute");
      setMsg({ type: "success", text: `Dispute split executed for ${case_id}` });
      setDisputeAmount("");
      setDisputeReason("");
      await loadDetail();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sand-300 text-sm">Loading investigation detail...</div>;
  }

  if (!data || !data.case) {
    return <div className="py-16 text-center text-red-400 text-sm">Case not found: {case_id}</div>;
  }

  const c = data.case;
  const client = data.client_profile || {};
  const diagnosis = diag?.diagnosis || {};
  const gate = diag?.policy_gate || {};
  const history = c.history || [];

  const tier = c.authority_tier || 1;
  const tierBadgeClass =
    tier === 3
      ? "bg-red-500/10 text-red-400 border-red-500/30"
      : tier === 2
      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-sand-300 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Control Room</span>
        </Link>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      {/* Case Hero Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-sand-200/20 glow-warm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-extrabold text-2xl text-white">{c.case_id}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tierBadgeClass}`}>
                TIER {tier} AUTHORITY ({tier === 1 ? "AUTONOMOUS" : tier === 2 ? "APPROVAL GATE" : "HUMAN ONLY"})
              </span>
              {c.status === "closed" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  RECOVERED
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mt-1">{c.client_name}</h1>
            <p className="text-xs text-sand-300">{c.client_email} • Invoice #{c.invoice_number}</p>
          </div>

          <div className="text-right">
            <div className="text-xs text-sand-300 font-semibold uppercase">Amount at Risk</div>
            <div className="text-3xl font-extrabold text-white mt-0.5">
              ₹{c.amount?.toLocaleString("en-IN")}
            </div>
            {c.disputed_amount > 0 && (
              <div className="text-xs text-red-400 mt-1 font-medium">
                (₹{c.disputed_amount?.toLocaleString("en-IN")} under dispute)
              </div>
            )}
          </div>
        </div>

        {/* 6-Stage Visual Recovery Lifecycle Stepper */}
        <div className="pt-4 border-t border-sand-200/10">
          <div className="text-[11px] font-bold text-sand-400 uppercase tracking-wider mb-3">
            Autonomous Recovery Closed-Loop Journey
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { num: "01", name: "Detected", status: "completed", desc: "Signal Registered" },
              { num: "02", name: "AI Diagnosis", status: diagnosis.root_cause ? "completed" : "active", desc: `${diagnosis.confidence ? Math.round(diagnosis.confidence * 100) : 95}% Confidence` },
              { num: "03", name: "Policy Gate", status: gate.tier_name ? "completed" : "pending", desc: `Tier ${tier} Authority` },
              { num: "04", name: "Razorpay Action", status: c.status === "recovering" || c.status === "closed" || c.status === "RECOVERED" ? "completed" : "pending", desc: "Payment Link Active" },
              { num: "05", name: "Verification", status: c.status === "closed" || c.status === "RECOVERED" ? "completed" : "pending", desc: "Independent Status Check" },
              { num: "06", name: "Ledger Recorded", status: c.status === "closed" || c.status === "RECOVERED" ? "completed" : "pending", desc: `+₹${c.amount?.toLocaleString("en-IN")} Verified` },
            ].map((step, idx) => {
              const isDone = step.status === "completed";
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition ${
                    isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-[#18120d] border-sand-200/10 text-sand-400 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold">{step.num}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-sand-500"></span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-white">{step.name}</div>
                  <div className="text-[10px] text-sand-300 truncate mt-0.5">{step.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Diagnosis & Policy */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* AI Root Cause Diagnosis Card */}
        <div className="glass-card p-6 rounded-2xl border border-blue-500/20 space-y-4 glow-royal">
          <div className="flex justify-between items-center border-b border-sand-200/10 pb-3">
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <span>AI Root Cause Diagnosis</span>
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {(diagnosis.confidence * 100).toFixed(0)}% Confidence
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-sand-400 uppercase font-semibold text-[10px]">Diagnosed Cause</span>
              <div className="text-sm font-bold text-white mt-0.5">{diagnosis.root_cause}</div>
            </div>
            <div>
              <span className="text-sand-400 uppercase font-semibold text-[10px]">AI Reasoning</span>
              <p className="text-sand-100 leading-relaxed mt-0.5">{diagnosis.reasoning}</p>
            </div>
            <div>
              <span className="text-sand-400 uppercase font-semibold text-[10px]">Recommended Action</span>
              <div className="text-xs font-mono font-bold text-blue-400 mt-0.5 uppercase">
                {diagnosis.recommended_action}
              </div>
            </div>
          </div>
        </div>

        {/* Deterministic Policy Gate Card */}
        <div className="glass-card p-6 rounded-2xl border border-amber-500/20 space-y-4 glow-warm">
          <div className="flex justify-between items-center border-b border-sand-200/10 pb-3">
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              <span>Deterministic Policy Gate</span>
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
              Python Enforced
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-sand-400 uppercase font-semibold text-[10px]">Assigned Tier</span>
              <div className="text-sm font-bold text-white mt-0.5 capitalize">{gate.tier_name}</div>
            </div>
            <div>
              <span className="text-sand-400 uppercase font-semibold text-[10px]">Policy Explanation</span>
              <p className="text-sand-100 leading-relaxed mt-0.5">{gate.policy_reason}</p>
            </div>
            <div>
              <span className="text-sand-400 uppercase font-semibold text-[10px]">Idempotency Safeguard</span>
              <div className="text-xs font-medium text-emerald-400 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{gate.idempotency_reason || "Passed duplicate check"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls & Razorpay Checkout Simulator */}
      <div className="glass-panel p-6 rounded-2xl border border-sand-200/20 space-y-6">
        <h2 className="text-lg font-bold text-white">Recovery Actions & Razorpay Integration</h2>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleExecuteAction("create_payment_link")}
            disabled={acting || c.status === "closed"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Generate Recovery Payment Link</span>
          </button>

          <button
            onClick={() => setShowPayModal(true)}
            disabled={c.status === "closed"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition transform active:scale-95 disabled:opacity-50"
          >
            <DollarSign className="w-4 h-4" />
            <span>Simulate Customer Payment (Razorpay Test Checkout)</span>
          </button>

          <Link
            href={`/pay/${c.case_id}`}
            target="_blank"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#241a12] hover:bg-[#36271c] border border-sand-200/20 text-sand-100 font-semibold text-xs transition"
          >
            <ExternalLink className="w-4 h-4 text-blue-400" />
            <span>Open Customer Gateway Link</span>
          </Link>
        </div>

        {/* Dispute Split Form */}
        <div className="pt-4 border-t border-sand-200/10 space-y-3">
          <div className="text-xs font-bold text-sand-200 flex items-center gap-2">
            <Split className="w-4 h-4 text-amber-400" />
            <span>Dispute Split Control (Separate undisputed vs disputed portion)</span>
          </div>
          <form onSubmit={handleDisputeSplit} className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              placeholder="Disputed amount (₹)"
              value={disputeAmount}
              onChange={(e) => setDisputeAmount(e.target.value)}
              className="bg-[#140e0a] border border-sand-200/20 text-white rounded-xl px-3.5 py-2 text-xs w-48 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="Reason (e.g. Line item damaged)"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="bg-[#140e0a] border border-sand-200/20 text-white rounded-xl px-3.5 py-2 text-xs w-64 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={acting || !disputeAmount}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              Split Dispute
            </button>
          </form>
        </div>
      </div>

      {/* Interactive Case History & Event Timeline */}
      <div className="glass-panel p-6 rounded-2xl border border-sand-200/20 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <span>Case History & Audit Event Timeline</span>
        </h2>

        <div className="relative border-l border-sand-200/20 ml-4 space-y-6 py-2">
          {history.map((ev, idx) => (
            <div key={idx} className="relative pl-6 space-y-1">
              <div className="absolute -left-2 top-1.5 w-4 h-4 rounded-full bg-[#140e0a] border-2 border-blue-500"></div>
              <div className="text-[11px] font-mono text-sand-400 flex items-center gap-2">
                <span>{ev.timestamp}</span>
                {ev.run_id && (
                  <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-400 rounded text-[10px]">
                    {ev.run_id}
                  </span>
                )}
              </div>
              <div className="text-xs text-sand-100 font-medium">{ev.event}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Razorpay Modal Simulator */}
      <RazorpayModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        caseData={c}
        onPaymentSuccess={handleVerify}
      />
    </div>
  );
}
