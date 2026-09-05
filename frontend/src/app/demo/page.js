"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play, RotateCw, ShieldCheck, AlertTriangle, CheckCircle2,
  DollarSign, ArrowRight, Lock, Eye, Cpu, Users, FileText,
  Sparkles, Check, ShieldAlert, ChevronRight, HelpCircle, Zap,
  X, Activity
} from "lucide-react";
import { api, getStoredUser } from "@/lib/api";

export default function DemoPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activePersona, setActivePersona] = useState("admin"); // "admin" | "finance" | "auditor"
  const [activeScenario, setActiveScenario] = useState("scenario1"); // "scenario1" | "scenario2"
  
  // Scenario 1 Interactive Step State
  const [s1Step, setS1Step] = useState(1);
  const [s1Running, setS1Running] = useState(false);

  // Scenario 2 Interactive Step State
  const [s2Step, setS2Step] = useState(1);
  const [s2Approved, setS2Approved] = useState(false);
  const [s2Running, setS2Running] = useState(false);

  // Synthetic Ledger State for Demo
  const [demoLedger, setDemoLedger] = useState([
    { id: "DEMO-TX-101", caseNumber: "RR-DEMO-1001", amount: 1200, status: "SYNTHETIC_VERIFIED", customer: "Aarav Sharma", time: "10 mins ago" },
    { id: "DEMO-TX-102", caseNumber: "RR-DEMO-1002", amount: 3500, status: "SYNTHETIC_VERIFIED", customer: "Pooja Verma", time: "25 mins ago" },
  ]);

  // Synthetic Approvals for Finance Demo
  const [demoApprovals, setDemoApprovals] = useState([
    { id: "appr-1", caseNumber: "RR-DEMO-28000", customer: "Acme Enterprises Ltd", email: "billing@acme.com", amount: 28000, reason: "Payment promise expired", status: "PENDING", action: "Send personalized executive link with 5-day grace" },
    { id: "appr-2", caseNumber: "RR-DEMO-14500", customer: "Nexus Global Tech", email: "finance@nexus.io", amount: 14500, reason: "Card limit exceeded", status: "PENDING", action: "Generate dynamic UPI/NEFT link" }
  ]);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
      if (user.role === "FINANCE_OPERATOR") setActivePersona("finance");
      else if (user.role === "AUDITOR") setActivePersona("auditor");
      else setActivePersona("admin");
    } else {
      api.login("admin@razorrecover.io", "password123")
        .then(res => {
          if (res.user) setCurrentUser({ ...res.user, role: res.role, merchant: res.merchant });
        })
        .catch(console.error);
    }
  }, []);

  const handleSwitchDemoPersona = async (roleName, email) => {
    setActivePersona(roleName);
    try {
      const res = await api.login(email, "password123");
      if (res.user) {
        setCurrentUser({ ...res.user, role: res.role, merchant: res.merchant });
      }
    } catch (err) {
      console.error("Failed demo account switch:", err);
    }
  };

  const runS1NextStep = () => {
    setS1Running(true);
    setTimeout(() => {
      setS1Step(prev => {
        const next = Math.min(prev + 1, 5);
        if (next === 5) {
          setDemoLedger(current => [
            { id: `DEMO-TX-${Date.now().toString().slice(-4)}`, caseNumber: "RR-DEMO-4800", amount: 4800, status: "SYNTHETIC_VERIFIED", customer: "Rahul Mehta", time: "Just now" },
            ...current
          ]);
        }
        return next;
      });
      setS1Running(false);
    }, 600);
  };

  const resetS1 = () => {
    setS1Step(1);
  };

  const runS2NextStep = () => {
    setS2Running(true);
    setTimeout(() => {
      setS2Step(prev => {
        const next = Math.min(prev + 1, 6);
        if (next === 6) {
          setDemoLedger(current => [
            { id: `DEMO-TX-${Date.now().toString().slice(-4)}`, caseNumber: "RR-DEMO-28000", amount: 28000, status: "SYNTHETIC_VERIFIED", customer: "Acme Tech Ltd", time: "Just now" },
            ...current
          ]);
        }
        return next;
      });
      setS2Running(false);
    }, 600);
  };

  const resetS2 = () => {
    setS2Step(1);
    setS2Approved(false);
  };

  const handleDemoApprove = (id) => {
    setDemoApprovals(prev => prev.map(a => a.id === id ? { ...a, status: "APPROVED" } : a));
    setDemoLedger(current => [
      { id: `DEMO-TX-${Date.now().toString().slice(-4)}`, caseNumber: "RR-DEMO-APPROVED", amount: 28000, status: "SYNTHETIC_VERIFIED", customer: "Approved by Finance Ops", time: "Just now" },
      ...current
    ]);
  };

  const handleDemoReject = (id) => {
    setDemoApprovals(prev => prev.map(a => a.id === id ? { ...a, status: "REJECTED" } : a));
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* Prominent Demo Sandbox Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-900/40 via-[#1c1228] to-purple-900/40 border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-base">🟣 DEMO ENVIRONMENT · SYNTHETIC DATA</span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30">
                Sandbox
              </span>
            </div>
            <p className="text-xs text-purple-300/80 mt-0.5">
              Isolated synthetic scenarios for evaluation. All verifications in this environment are marked as <strong className="text-purple-200 font-bold">Synthetic verification — Demo only</strong>.
            </p>
          </div>
        </div>

        {/* Demo Persona Switcher */}
        <div className="flex items-center space-x-2 bg-[#120a1a] border border-purple-500/30 rounded-xl p-1.5 flex-shrink-0">
          <span className="text-[11px] font-bold text-purple-300 pl-2">Demo Role:</span>
          <button
            onClick={() => handleSwitchDemoPersona("admin", "admin@razorrecover.io")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              activePersona === "admin"
                ? "bg-purple-600 text-white shadow"
                : "text-purple-300 hover:text-white"
            }`}
          >
            👑 Admin
          </button>
          <button
            onClick={() => handleSwitchDemoPersona("finance", "finance@razorrecover.io")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              activePersona === "finance"
                ? "bg-purple-600 text-white shadow"
                : "text-purple-300 hover:text-white"
            }`}
          >
            💼 Finance Ops
          </button>
          <button
            onClick={() => handleSwitchDemoPersona("auditor", "auditor@razorrecover.io")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              activePersona === "auditor"
                ? "bg-purple-600 text-white shadow"
                : "text-purple-300 hover:text-white"
            }`}
          >
            ⚖️ Auditor
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          ROLE-TAILORED DEMO PERSPECTIVES
      ────────────────────────────────────────────────────────────────────────── */}

      {/* 1. ADMIN DEMO VIEW */}
      {activePersona === "admin" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-sand-200/10 pb-4 gap-4">
            <div className="flex space-x-3">
              <button
                onClick={() => setActiveScenario("scenario1")}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeScenario === "scenario1"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg"
                    : "text-sand-400 hover:text-white hover:bg-sand-200/10"
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Scenario 1: ₹4,800 Autonomous Recovery (Tier 1)</span>
              </button>

              <button
                onClick={() => setActiveScenario("scenario2")}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeScenario === "scenario2"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg"
                    : "text-sand-400 hover:text-white hover:bg-sand-200/10"
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Scenario 2: ₹28,000 Human Safety Gate (Tier 2)</span>
              </button>
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow"
            >
              <span>Create Real SaaS Organization</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Interactive Scenario 1 */}
          {activeScenario === "scenario1" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-emerald-500/30 bg-[#141a16] space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">Interactive Walkthrough</span>
                    <h2 className="text-xl font-black text-white">₹4,800 Autonomous Subscription Recovery</h2>
                    <p className="text-xs text-sand-300">Customer: Rahul Mehta · Failure: Bank Gateway Timeout</p>
                  </div>
                  <button
                    onClick={resetS1}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sand-200 text-xs font-semibold transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className={`p-4 rounded-2xl border transition-all ${
                    s1Step >= 1 ? "bg-[#18241c] border-emerald-500/40 text-white" : "bg-black/20 border-white/5 text-sand-500"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">1. Detect Signal</span>
                      <span className="text-xs font-mono font-bold text-amber-400">FAILED: ₹4,800</span>
                    </div>
                    {s1Step >= 1 && (
                      <p className="text-xs text-sand-300 mt-2">
                        Razorpay webhook triggers: <code className="text-sand-100 bg-black/40 px-1 py-0.5 rounded">payment.failed (auth_timeout)</code>. Signal ingested and case created.
                      </p>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all ${
                    s1Step >= 2 ? "bg-[#18241c] border-emerald-500/40 text-white" : "bg-black/20 border-white/5 text-sand-500"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">2. Gemini AI Diagnosis</span>
                      {s1Step >= 2 && <span className="text-xs font-bold text-blue-400">Diagnosis Complete</span>}
                    </div>
                    {s1Step >= 2 && (
                      <p className="text-xs text-sand-300 mt-2">
                        Root cause evaluated: <em>Transient bank OTP timeout</em>. Recommended action: <strong>Generate Dynamic Razorpay Payment Link</strong>.
                      </p>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all ${
                    s1Step >= 3 ? "bg-[#18241c] border-emerald-500/40 text-white" : "bg-black/20 border-white/5 text-sand-500"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">3. Deterministic Policy Gate</span>
                      {s1Step >= 3 && <span className="text-xs font-bold text-emerald-400">Tier 1: Autonomous Allowed</span>}
                    </div>
                    {s1Step >= 3 && (
                      <p className="text-xs text-sand-300 mt-2">
                        Amount ₹4,800 is below the ₹5,000 threshold. Python policy approves autonomous action.
                      </p>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all ${
                    s1Step >= 4 ? "bg-[#18241c] border-emerald-500/40 text-white" : "bg-black/20 border-white/5 text-sand-500"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">4. Razorpay Link Dispatched</span>
                      {s1Step >= 4 && <span className="text-xs font-bold text-indigo-400">Link Sent</span>}
                    </div>
                    {s1Step >= 4 && (
                      <p className="text-xs text-sand-300 mt-2">
                        Payment link dispatched. Status moves to <strong>RECOVERING</strong> (Ledger is ₹0 until verified).
                      </p>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all ${
                    s1Step >= 5 ? "bg-[#18241c] border-emerald-500/60 text-white shadow-lg" : "bg-black/20 border-white/5 text-sand-500"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">5. Synthetic Verification ➔ Ledger</span>
                      {s1Step >= 5 && <span className="text-xs font-bold text-emerald-400">Recovered +₹4,800</span>}
                    </div>
                    {s1Step >= 5 && (
                      <div className="mt-2 space-y-2">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-300 flex items-center justify-between">
                          <span>Verification Badge: <strong className="text-purple-200">Synthetic verification — Demo only</strong></span>
                          <span className="font-mono font-bold text-emerald-400">+₹4,800.00</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {s1Step < 5 ? (
                  <button
                    onClick={runS1NextStep}
                    disabled={s1Running}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Advance to Step {s1Step + 1}</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center text-xs font-bold text-emerald-400">
                    🎉 Scenario 1 Complete: ₹4,800 safely recovered autonomously!
                  </div>
                )}
              </div>

              {/* Synthetic Demo Ledger */}
              <div className="glass-card p-6 rounded-3xl border border-purple-500/30 bg-[#161020] space-y-4">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <h3 className="font-extrabold text-sm text-white">Demo Synthetic Ledger</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Demo Only
                  </span>
                </div>
                <div className="space-y-2.5">
                  {demoLedger.map((tx) => (
                    <div key={tx.id} className="p-3 rounded-xl bg-black/40 border border-purple-500/20 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{tx.customer}</div>
                        <div className="text-[10px] text-purple-300/80 font-mono">{tx.caseNumber} · {tx.time}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-400">+₹{tx.amount.toLocaleString("en-IN")}</div>
                        <span className="text-[9px] uppercase tracking-wider text-purple-400 font-semibold">Synthetic Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Scenario 2 */}
          {activeScenario === "scenario2" && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-amber-500/30 bg-[#1c1812] space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">Interactive Walkthrough</span>
                    <h2 className="text-xl font-black text-white">₹28,000 High-Value Invoice Safety Gate</h2>
                    <p className="text-xs text-sand-300">Customer: Acme Tech Ltd · Overdue: Payment Commitment Expired</p>
                  </div>
                  <button
                    onClick={resetS2}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sand-200 text-xs font-semibold transition"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className={`p-4 rounded-2xl border transition-all ${
                    s2Step >= 1 ? "bg-[#241e16] border-amber-500/40 text-white" : "bg-black/20 border-white/5 text-sand-500"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">1. Detect Overdue Signal</span>
                      <span className="text-xs font-mono font-bold text-rose-400">OVERDUE: ₹28,000</span>
                    </div>
                    {s2Step >= 1 && (
                      <p className="text-xs text-sand-300 mt-2">
                        Invoice reached grace period expiration. Case initialized with status <strong>DETECTED</strong>.
                      </p>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all ${
                    s2Step >= 2 ? "bg-[#241e16] border-red-500/40 text-white" : "bg-black/20 border-white/5 text-sand-500"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">2. Deterministic Policy Gate: BLOCKED</span>
                      {s2Step >= 2 && <span className="text-xs font-bold text-red-400">Autonomous Action Denied</span>}
                    </div>
                    {s2Step >= 2 && (
                      <p className="text-xs text-sand-300 mt-2">
                        Amount is ₹28,000 (&gt; ₹5,000). Policy strictly holds case in the <strong>Approval Queue</strong>.
                      </p>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border transition-all ${
                    s2Step >= 3 ? "bg-[#241e16] border-amber-500/40 text-white" : "bg-black/20 border-white/5 text-sand-500"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">3. Finance Operator Review</span>
                      {s2Approved ? (
                        <span className="text-xs font-bold text-emerald-400">Approved by Finance Ops</span>
                      ) : (
                        <span className="text-xs font-bold text-amber-400">Awaiting Human Approval</span>
                      )}
                    </div>

                    {s2Step >= 3 && !s2Approved && (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 rounded-xl bg-black/40 border border-amber-500/30 text-xs">
                          <span className="text-sand-400 font-semibold">Proposed Action:</span> Send personalized executive payment recovery link with 5-day grace.
                        </div>
                        <button
                          onClick={() => {
                            setS2Approved(true);
                            setS2Step(4);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                        >
                          Approve Action (Finance Ops)
                        </button>
                      </div>
                    )}
                  </div>

                  {s2Step >= 4 && (
                    <div className={`p-4 rounded-2xl border transition-all ${
                      s2Step >= 5 ? "bg-[#241e16] border-emerald-500/60 text-white shadow-lg" : "bg-black/20 border-white/5 text-sand-500"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">4. Approved Execution ➔ Synthetic Verification</span>
                        {s2Step >= 5 && <span className="text-xs font-bold text-emerald-400">Recovered +₹28,000</span>}
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] text-purple-300 flex items-center justify-between">
                          <span>Verification Badge: <strong className="text-purple-200">Synthetic verification — Demo only</strong></span>
                          <span className="font-mono font-bold text-emerald-400">+₹28,000.00</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {s2Step < 2 ? (
                  <button
                    onClick={runS2NextStep}
                    disabled={s2Running}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Simulate AI Diagnosis & Policy Gate</span>
                  </button>
                ) : s2Step === 4 ? (
                  <button
                    onClick={runS2NextStep}
                    disabled={s2Running}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Verify Payment & Settle to Ledger</span>
                  </button>
                ) : null}
              </div>

              {/* Safety Proof */}
              <div className="glass-card p-6 rounded-3xl border border-purple-500/30 bg-[#161020] space-y-4">
                <div className="flex items-center space-x-2 border-b border-purple-500/20 pb-3">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <h3 className="font-extrabold text-sm text-white">Safety & Audit Proof</h3>
                </div>
                <p className="text-xs text-sand-300 leading-relaxed">
                  In RazorRecover, high-value financial actions cannot be executed autonomously by LLMs. Every action above ₹5,000 strictly requires human approval.
                </p>
                <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 space-y-2 text-xs">
                  <div className="text-purple-300 font-bold">Immutable Audit Record:</div>
                  <div className="text-[11px] text-sand-300 font-mono">
                    CASE: RR-DEMO-28000<br />
                    POLICY: Tier 2 (Gate Enforced)<br />
                    AUTHORIZER: finance@razorrecover.io<br />
                    EVIDENCE: Synthetic Verification
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. FINANCE OPS DEMO VIEW */}
      {activePersona === "finance" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-sand-200/10 pb-4">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">Finance Operator Perspective</span>
              <h2 className="text-xl font-black text-white">Interactive Approvals Triage Sandbox</h2>
              <p className="text-xs text-sand-300">Test how a Finance Operator authorizes high-value Tier 2 recovery actions.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              {demoApprovals.filter(a => a.status === "PENDING").length} Awaiting Review
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {demoApprovals.map((appr) => (
              <div key={appr.id} className="glass-card p-6 rounded-3xl border border-amber-500/30 bg-[#1c1812] space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{appr.customer}</h3>
                    <p className="text-xs text-sand-400 font-mono">{appr.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-amber-400 font-mono">₹{appr.amount.toLocaleString("en-IN")}</span>
                    <div className="text-[10px] font-bold text-amber-300">Tier 2 Gate</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-amber-500/20 text-xs text-sand-300 space-y-1">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    <span>Gemini AI Diagnostic Rationale:</span>
                  </div>
                  <p className="text-[11px] text-sand-300 leading-relaxed">
                    Failure cause: <strong>{appr.reason}</strong>. Proposed recovery: <em>{appr.action}</em>.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-sand-400 font-mono">Status: <strong className="text-white">{appr.status}</strong></span>
                  {appr.status === "PENDING" ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDemoReject(appr.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleDemoApprove(appr.id)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                      >
                        Authorize Link
                      </button>
                    </div>
                  ) : (
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      appr.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {appr.status} ✓
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. AUDITOR DEMO VIEW */}
      {activePersona === "auditor" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-sand-200/10 pb-4">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400">Auditor Perspective</span>
              <h2 className="text-xl font-black text-white">Compliance & Decision Audit Sandbox</h2>
              <p className="text-xs text-sand-300">Inspect full immutable decision logs and independent payment verification evidence.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
              100% Policy Adherence
            </span>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-purple-500/30 bg-[#161020] space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <h3 className="font-bold text-white text-sm">Demonstration Audit Trace: Case RR-DEMO-28000</h3>
              <span className="text-xs font-mono text-emerald-400 font-bold">+₹28,000 Verified</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase">1. Ingestion Log</span>
                <p className="text-[11px] text-sand-300">Webhook received from Razorpay. Hash signature verified.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase">2. Gemini Diagnosis</span>
                <p className="text-[11px] text-sand-300">Identified broken commitment. AI strictly proposed action without execution authority.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase">3. Policy Gate</span>
                <p className="text-[11px] text-sand-300">Autonomous execution blocked by Python policy engine (Amount &gt; ₹5,000).</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase">4. Human Authorization</span>
                <p className="text-[11px] text-sand-300">Authorized by Finance Operator at timestamp 2026-09-05T14:40:00Z.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase">5. Verification Proof</span>
                <p className="text-[11px] text-sand-300">Razorpay payment confirmed with Synthetic Verification badge.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#1c1428] border border-purple-500/20 space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase">6. Immutable Ledger</span>
                <p className="text-[11px] text-sand-300">Recorded entry in ledger: +₹28,000.00.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
