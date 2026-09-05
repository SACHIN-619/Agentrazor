"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, ArrowRight, Check, AlertCircle, Sparkles,
  Building, Mail, Lock, User, Key, Upload, Database, CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Account Info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Step 2: Profile Info
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");

  // Step 3: Revenue Source Choice
  const [revenueSourceType, setRevenueSourceType] = useState("razorpay"); // "razorpay" | "csv" | "skip"
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [csvImportResult, setCsvImportResult] = useState(null);

  // Handle Step 1 Submit (Register User & Org)
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !businessName) {
      setError("Please fill out all required fields.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await api.signup(businessName, email, password, name);
      setCurrentStep(2);
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 Submit (Business Profile)
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setCurrentStep(3);
  };

  // Handle Step 3 Submit (Connect Source)
  const handleSourceSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (revenueSourceType === "razorpay" && razorpayKeyId && razorpayKeySecret) {
        await api.connectGateway(razorpayKeyId, razorpayKeySecret, "TEST");
      } else if (revenueSourceType === "csv" && csvFile) {
        const res = await api.ingestCsv(csvFile);
        setCsvImportResult(res);
      }
      setCurrentStep(4);
    } catch (err) {
      setError(err.message || "Failed to configure revenue source.");
    } finally {
      setLoading(false);
    }
  };

  // Final Action -> Navigate to Dashboard
  const handleFinishOnboarding = () => {
    router.push("/dashboard");
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      {/* Header Badge */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Real Merchant Onboarding</span>
        </div>
        <h1 className="text-3xl font-black text-white">Setup Your Recovery Agent</h1>
        <p className="text-sm text-sand-400">
          Step-by-step setup to monitor and recover failed merchant revenue.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { num: 1, label: "Account" },
          { num: 2, label: "Business" },
          { num: 3, label: "Revenue Source" },
          { num: 4, label: "Ready" }
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition ${
              currentStep === s.num
                ? "bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-lg"
                : currentStep > s.num
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-sand-200/10 text-sand-500 border border-sand-200/10"
            }`}>
              {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span className={`text-xs font-semibold hidden sm:inline ${
              currentStep >= s.num ? "text-white" : "text-sand-500"
            }`}>
              {s.label}
            </span>
            {idx < 3 && <div className="w-8 h-0.5 bg-sand-200/10 hidden sm:block mx-1"></div>}
          </div>
        ))}
      </div>

      {/* Wizard Card Container */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-sand-200/20 bg-[#16100c] shadow-2xl">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Account Creation */}
        {currentStep === 1 && (
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Create your merchant admin account</h2>
              <p className="text-xs text-sand-400">You will receive full administrative authority over recovery policies.</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-sand-300 mb-1.5">Business / Organization Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3.5 top-3.5 text-sand-400" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme SaaS Ltd"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c140e] border border-sand-200/20 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sand-300 mb-1.5">Your Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-sand-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c140e] border border-sand-200/20 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sand-300 mb-1.5">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-sand-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@acme.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c140e] border border-sand-200/20 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sand-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-sand-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c140e] border border-sand-200/20 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg"
            >
              <span>{loading ? "Creating Account..." : "Continue to Business Details"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: Business Profile */}
        {currentStep === 2 && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Business Settings</h2>
              <p className="text-xs text-sand-400">Configure currency and operating timezone for recovery calculations.</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-sand-300 mb-1.5">Primary Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1c140e] border border-sand-200/20 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="INR">Indian Rupee (INR ₹)</option>
                  <option value="USD">US Dollar (USD $)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sand-300 mb-1.5">Operating Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1c140e] border border-sand-200/20 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg"
            >
              <span>Continue to Revenue Source</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 3: Revenue Source Setup */}
        {currentStep === 3 && (
          <form onSubmit={handleSourceSubmit} className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Connect Revenue Source</h2>
              <p className="text-xs text-sand-400">Choose how RazorRecover receives failed transaction signals.</p>
            </div>

            {/* Source Options Radio Cards */}
            <div className="space-y-3 pt-1">
              <div
                onClick={() => setRevenueSourceType("razorpay")}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  revenueSourceType === "razorpay"
                    ? "bg-[#1f2820] border-emerald-500/50 shadow-md"
                    : "bg-[#1c140e] border-sand-200/20 hover:border-sand-200/40"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="source"
                    checked={revenueSourceType === "razorpay"}
                    onChange={() => setRevenueSourceType("razorpay")}
                    className="accent-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center space-x-2">
                      <span>Razorpay Test Mode API</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">Recommended</span>
                    </div>
                    <p className="text-[11px] text-sand-400 mt-0.5">Automated webhook reception & live payment links</p>
                  </div>
                </div>

                {revenueSourceType === "razorpay" && (
                  <div className="mt-3.5 space-y-2.5 pt-3 border-t border-emerald-500/20">
                    <div>
                      <label className="block text-[11px] font-bold text-sand-300 mb-1">Razorpay Key ID</label>
                      <input
                        type="text"
                        value={razorpayKeyId}
                        onChange={(e) => setRazorpayKeyId(e.target.value)}
                        placeholder="rzp_test_..."
                        className="w-full px-3 py-2 rounded-lg bg-[#141a16] border border-emerald-500/30 text-white text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-sand-300 mb-1">Razorpay Key Secret</label>
                      <input
                        type="password"
                        value={razorpayKeySecret}
                        onChange={(e) => setRazorpayKeySecret(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 rounded-lg bg-[#141a16] border border-emerald-500/30 text-white text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div
                onClick={() => setRevenueSourceType("csv")}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  revenueSourceType === "csv"
                    ? "bg-[#1f2820] border-emerald-500/50 shadow-md"
                    : "bg-[#1c140e] border-sand-200/20 hover:border-sand-200/40"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="source"
                    checked={revenueSourceType === "csv"}
                    onChange={() => setRevenueSourceType("csv")}
                    className="accent-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Import CSV of Failed Payments</div>
                    <p className="text-[11px] text-sand-400 mt-0.5">Upload a batch file of failed invoices or subscriptions</p>
                  </div>
                </div>

                {revenueSourceType === "csv" && (
                  <div className="mt-3.5 pt-3 border-t border-emerald-500/20">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files[0])}
                      className="text-xs text-sand-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div
                onClick={() => setRevenueSourceType("skip")}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  revenueSourceType === "skip"
                    ? "bg-[#1f2820] border-emerald-500/50 shadow-md"
                    : "bg-[#1c140e] border-sand-200/20 hover:border-sand-200/40"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="source"
                    checked={revenueSourceType === "skip"}
                    onChange={() => setRevenueSourceType("skip")}
                    className="accent-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">I&apos;ll configure this later</div>
                    <p className="text-[11px] text-sand-400 mt-0.5">Start with an empty workspace and connect later</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg"
            >
              <span>{loading ? "Configuring..." : "Complete Setup"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 4: Truthful Dynamic Ready State */}
        {currentStep === 4 && (
          <div className="space-y-6 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Setup Complete!</h2>
              <p className="text-xs text-sand-400 max-w-sm mx-auto">
                Your business organization is initialized. Here is your current agent status:
              </p>
            </div>

            {/* Dynamic Status Pill */}
            <div className="p-4 rounded-2xl bg-black/40 border border-sand-200/20 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sand-400">Autonomous Agent Status:</span>
                {revenueSourceType === "razorpay" ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>🟢 Monitoring Revenue Signals</span>
                  </span>
                ) : revenueSourceType === "csv" ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>🟢 Monitoring Imported Signals</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-sand-300 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-sand-400"></span>
                    <span>⚪ Waiting for Revenue Source</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-sand-400 border-t border-white/5 pt-2">
                {revenueSourceType === "skip"
                  ? "No revenue signals detected yet. You can import CSV failure batches or connect Razorpay Test keys anytime from Revenue Sources."
                  : "Ready to diagnose failures and execute deterministic recovery workflows."}
              </div>
            </div>

            <button
              onClick={handleFinishOnboarding}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xl"
            >
              <span>Enter Merchant Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="text-center mt-6 text-xs text-sand-400">
        Already have an account?{" "}
        <Link href="/login" className="text-amber-400 hover:underline font-bold">
          Sign In
        </Link>
      </div>
    </div>
  );
}
