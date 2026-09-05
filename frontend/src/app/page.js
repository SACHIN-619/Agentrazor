"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, ShieldCheck, Zap, Lock, BarChart3, CheckCircle2,
  AlertTriangle, FileText, Cpu, DollarSign, Users, Sparkles,
  HelpCircle, ChevronRight, Play, Check, ShieldAlert
} from "lucide-react";

export default function LandingPage() {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const pipelineSteps = [
    {
      id: "detect",
      title: "1. FAILED PAYMENT",
      subtitle: "Detect Signals",
      desc: "RazorRecover captures failure webhooks, overdue invoices, and broken payment commitments in real-time.",
      badge: "Real-time Signal",
      color: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400"
    },
    {
      id: "diagnose",
      title: "2. AI DIAGNOSIS",
      subtitle: "Root Cause Engine",
      desc: "Gemini analyzes transaction telemetry, historical customer reliability, and failure reason (auth, timeout, or dispute).",
      badge: "Gemini Intelligence",
      color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400"
    },
    {
      id: "policy",
      title: "3. SAFETY POLICY",
      subtitle: "Deterministic Gate",
      desc: "Zero LLM hallucinations on money. Strict Python financial policy gates autonomous actions by risk tier and amount.",
      badge: "100% Deterministic",
      color: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400"
    },
    {
      id: "recover",
      title: "4. RECOVERY ACTION",
      subtitle: "Bounded Execution",
      desc: "Executes Razorpay payment links, automated smart retries, or queues high-risk cases for human finance approval.",
      badge: "Razorpay Test Mode",
      color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400"
    },
    {
      id: "verify",
      title: "5. PAYMENT VERIFIED",
      subtitle: "Independent Proof",
      desc: "Action ≠ Recovery. RazorRecover queries Razorpay's independent payment status to confirm money has actually cleared.",
      badge: "Zero Fake Recovery",
      color: "from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400"
    },
    {
      id: "measure",
      title: "6. REVENUE RECOVERED",
      subtitle: "Immutable Ledger",
      desc: "Only verified payments append an entry to the financial recovery ledger and update net business recovery KPIs.",
      badge: "Audit Ready",
      color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400"
    }
  ];

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative glass-panel rounded-3xl p-8 sm:p-14 overflow-hidden border border-sand-200/15 bg-gradient-to-b from-[#1c140d] to-[#120d09]">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>Autonomous AI Revenue Recovery · Razorpay Track 03</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Recover revenue <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300">
              before it&apos;s lost. Safely.
            </span>
          </h1>

          <p className="text-lg text-sand-300 leading-relaxed font-normal">
            <strong className="text-white">RazorRecover</strong> is an autonomous AI revenue recovery agent that detects failed payments, diagnoses why they failed, chooses a safe recovery action, verifies the actual payment, and records only verified revenue.
          </p>

          {/* Primary Call-to-Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              href="/demo"
              className="inline-flex items-center space-x-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-600/30 transition transform hover:-translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Try Interactive Demo</span>
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center space-x-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-blue-500/20 transition transform hover:-translate-y-0.5"
            >
              <span>Create Merchant Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center space-x-1 px-5 py-3.5 rounded-xl bg-sand-200/10 hover:bg-sand-200/20 border border-sand-200/20 text-sand-200 font-bold transition"
            >
              <span>Sign In</span>
            </Link>
          </div>

          <div className="flex items-center space-x-6 pt-2 text-xs text-sand-400 font-semibold">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Razorpay Test Mode Ready</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Zero LLM Hallucination on Money</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Lock className="w-4 h-4 text-blue-400" />
              <span>Deterministic Financial Policy</span>
            </div>
          </div>
        </div>
      </section>

      {/* Closed-Loop Pipeline Explainer */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">The Closed-Loop Recovery Architecture</h2>
          <p className="text-sand-400 text-sm">
            How RazorRecover moves from raw failure signal to verified money in the ledger. Hover any card for plain-language details.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          {pipelineSteps.map((step, idx) => (
            <div
              key={step.id}
              onMouseEnter={() => setActiveTooltip(step.id)}
              onMouseLeave={() => setActiveTooltip(null)}
              className={`glass-card p-4 rounded-2xl flex flex-col justify-between space-y-3 border bg-gradient-to-b ${step.color} transition-all duration-200 hover:-translate-y-1 relative cursor-pointer`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-black/40 border border-white/10">
                    {step.badge}
                  </span>
                </div>
                <h3 className="font-extrabold text-xs tracking-tight text-white mb-0.5">{step.title}</h3>
                <p className="text-[11px] font-bold text-sand-300">{step.subtitle}</p>
              </div>

              <p className="text-[11px] text-sand-400 leading-relaxed">
                {step.desc}
              </p>

              <div className="pt-2 border-t border-white/5 flex items-center text-[10px] text-sand-400">
                <HelpCircle className="w-3 h-3 mr-1" />
                <span>Hover to understand</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Concrete Story Comparison: Tier 1 vs Tier 2 */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Autonomous vs Human Gated Stories</h2>
          <p className="text-sand-400 text-sm">
            Deterministic policies ensure small low-risk failures recover immediately, while large sums require human finance authorization.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Story 1: ₹4,800 Autonomous Recovery */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-[#161c18]/80 space-y-5">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Tier 1 Autonomous Recovery
              </span>
              <span className="text-2xl font-black text-emerald-400">₹4,800</span>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Authentication Timeout on Subscription</h3>
              <p className="text-sm text-sand-300 leading-relaxed">
                Customer payment fails due to SMS OTP bank gateway timeout. Amount is below the ₹5,000 threshold with zero dispute history.
              </p>
            </div>

            {/* Execution Trace */}
            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2 text-xs">
              <div className="flex items-center text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
                <span>Detection: Payment Failed (Auth Timeout)</span>
              </div>
              <div className="flex items-center text-sand-300">
                <Cpu className="w-4 h-4 mr-2 text-blue-400" />
                <span>AI Diagnosis: Transient Gateway Failure</span>
              </div>
              <div className="flex items-center text-sand-300">
                <Lock className="w-4 h-4 mr-2 text-red-400" />
                <span>Policy Gate: Tier 1 Approved Autonomously</span>
              </div>
              <div className="flex items-center text-sand-300">
                <DollarSign className="w-4 h-4 mr-2 text-teal-400" />
                <span>Action: Razorpay Payment Link dispatched</span>
              </div>
              <div className="flex items-center text-emerald-400 font-extrabold pt-1 border-t border-white/10">
                <Check className="w-4 h-4 mr-2 text-emerald-400" />
                <span>Verified by Razorpay API ➔ Ledger +₹4,800</span>
              </div>
            </div>
          </div>

          {/* Story 2: ₹28,000 Tier 2 Human Safety Gate */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-[#1c1812]/80 space-y-5">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Tier 2 Human Safety Gate
              </span>
              <span className="text-2xl font-black text-amber-400">₹28,000</span>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Overdue Enterprise Invoice Commitment Broken</h3>
              <p className="text-sm text-sand-300 leading-relaxed">
                Large B2B payment overdue. Because amount exceeds ₹5,000, autonomous recovery is strictly blocked by Python policy and held in the Approval Queue.
              </p>
            </div>

            {/* Execution Trace */}
            <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/20 space-y-2 text-xs">
              <div className="flex items-center text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 mr-2 text-amber-400" />
                <span>Detection: Overdue Commitment Expired</span>
              </div>
              <div className="flex items-center text-sand-300">
                <Cpu className="w-4 h-4 mr-2 text-blue-400" />
                <span>AI Diagnosis: Broken Payment Commitment</span>
              </div>
              <div className="flex items-center text-red-300 font-bold">
                <ShieldAlert className="w-4 h-4 mr-2 text-red-400" />
                <span>Policy Gate: Autonomous Action BLOCKED</span>
              </div>
              <div className="flex items-center text-amber-400 font-bold">
                <Users className="w-4 h-4 mr-2 text-amber-400" />
                <span>Finance Operator: Reviews Context & APPROVES</span>
              </div>
              <div className="flex items-center text-emerald-400 font-extrabold pt-1 border-t border-white/10">
                <Check className="w-4 h-4 mr-2 text-emerald-400" />
                <span>Verified by Razorpay API ➔ Ledger +₹28,000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Three Role Perspectives */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">One Recovery Event. Three Role Perspectives.</h2>
          <p className="text-sand-400 text-sm">
            Purpose-built views designed specifically for how modern revenue and finance teams operate.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-blue-500/30 bg-[#12161f]/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">👑 Merchant Admin</h3>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Configure · Monitor · Control · Analyze</p>
            <p className="text-sm text-sand-300 leading-relaxed">
              Maintains full business oversight. Configures Razorpay gateway keys, sets recovery policies, starts/pauses autonomous background workers, and tracks total revenue recovered.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-amber-500/30 bg-[#1f1912]/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">💼 Finance Operator</h3>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Review · Approve · Verify · Reconcile</p>
            <p className="text-sm text-sand-300 leading-relaxed">
              Focuses on high-value human approvals. Evaluates AI diagnosis rationale, approves or rejects candidate recovery actions, and verifies that payments clear before ledger settlement.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-[#1c1221]/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">⚖️ Auditor</h3>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Inspect · Trace · Verify · Report</p>
            <p className="text-sm text-sand-300 leading-relaxed">
              Read-only compliance verification. Inspects immutable decision logs, verifies who authorized high-value actions, and checks independent Razorpay payment verification proof.
            </p>
          </div>
        </div>
      </section>

      {/* Ready to Experience Section */}
      <section className="glass-panel rounded-3xl p-8 sm:p-12 text-center border border-sand-200/20 bg-gradient-to-r from-blue-900/30 via-purple-900/20 to-emerald-900/30 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-black text-white">Ready to see RazorRecover in action?</h2>
        <p className="text-sand-300 max-w-xl mx-auto text-sm leading-relaxed">
          Launch our isolated demo environment with pre-seeded test scenarios, or register a real merchant account to connect your Razorpay test keys or import CSV failure data.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link
            href="/demo"
            className="px-7 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 transition"
          >
            Launch Demo Environment
          </Link>
          <Link
            href="/signup"
            className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold shadow-lg transition"
          >
            Create Real Merchant Account
          </Link>
        </div>
      </section>
    </div>
  );
}
