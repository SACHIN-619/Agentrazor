import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Lock, BarChart3, CheckCircle2, AlertTriangle, FileText, Cpu, DollarSign } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="relative glass-panel rounded-3xl p-8 sm:p-12 overflow-hidden border border-blue-500/20 glow-blue">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Razorpay Hackathon Track 03 — AI Revenue Recovery</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Autonomous AI Agent That <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Wins Back Slipping Revenue</span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed">
            <strong className="text-white">RazorRecover</strong> continuously monitors payment & receivable signals, diagnoses root causes, executes bounded recovery actions via Razorpay Test APIs, verifies payment evidence before closing, and measures actual revenue recovered across a batch — with deterministic Python policy bounds.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-lg shadow-blue-500/25 transition transform hover:-translate-y-0.5"
            >
              <span>Launch Control Room</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/analytics"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 font-semibold transition"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Explore Analytics</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Loop Infographic */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">The Immutable Closed-Loop Architecture</h2>
          <p className="text-slate-400 text-sm">
            Not just an AI chatbot. A complete autonomous financial recovery agent.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { step: "01", title: "Detect", desc: "Revenue signals & failure queue", icon: AlertTriangle, color: "text-amber-400" },
            { step: "02", title: "Diagnose", desc: "Root cause & context analysis", icon: Cpu, color: "text-blue-400" },
            { step: "03", title: "Decide", desc: "Candidate recovery strategy", icon: Zap, color: "text-indigo-400" },
            { step: "04", title: "Gate", desc: "Deterministic Python authority", icon: Lock, color: "text-red-400" },
            { step: "05", title: "Act", desc: "Razorpay Test Mode API action", icon: DollarSign, color: "text-emerald-400" },
            { step: "06", title: "Verify", desc: "Outcome evidence check", icon: CheckCircle2, color: "text-teal-400" },
            { step: "07", title: "Measure", desc: "Ledger & recovery metrics", icon: BarChart3, color: "text-green-400" },
            { step: "08", title: "Audit", desc: "Immutable agent run log", icon: FileText, color: "text-purple-400" }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="glass-card p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-slate-700/80 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">{item.step}</span>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white">{item.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-3 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">3-Tier Authority Policy</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Python-enforced bounds outside the LLM. Tier 1 executes autonomously, Tier 2 holds in Approval Queue, and Tier 3 strictly escalates high-risk disputes.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-3 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Razorpay Test Mode Integration</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Dual Adapter seamlessly executes live Razorpay Payment Links & Order Retries when API keys are configured, with deterministic mock fallback.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-3 border border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">60-Case Evaluation Batch</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Evaluates agent decision accuracy against ground-truth labels on a held-out test split, providing honest, verifiable recovery metrics.
          </p>
        </div>
      </section>
    </div>
  );
}
