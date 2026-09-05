"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setAuthSession } from "@/lib/api";
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, CheckCircle2, AlertCircle, Building2, KeyRound } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired");

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("admin@razorrecover.io");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("Sachin Admin");
  const [businessName, setBusinessName] = useState("Apex Enterprise Labs");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(expired ? "Your session has expired. Please log in again." : "");

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignup) {
        await api.signup(businessName, email, password, name);
      } else {
        await api.login(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword("password123");
    setLoading(true);
    setError("");
    try {
      await api.login(demoEmail, "password123");
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to login as " + demoRole);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#18120d] border border-sand-200/20 rounded-3xl p-8 shadow-2xl space-y-6 glow-warm">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 mx-auto flex items-center justify-center shadow-lg shadow-blue-600/30">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Razor<span className="text-amber-400">Recover</span>
        </h1>
        <p className="text-xs text-sand-300">
          {isSignup ? "Create your Merchant Organization" : "Sign in to access your Revenue Recovery Workspace"}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Demo Role Logins */}
      {!isSignup && (
        <div className="space-y-2 bg-[#241a12] p-3.5 rounded-2xl border border-sand-200/10">
          <div className="text-[11px] font-bold text-sand-400 uppercase tracking-wider text-center">
            Quick 1-Click Demo Logins
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@razorrecover.io", "Merchant Admin")}
              className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 text-center transition group"
            >
              <div className="text-[10px] font-bold text-white">Merchant Admin</div>
              <div className="text-[9px] text-blue-400">Full Access</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("finance@razorrecover.io", "Finance Operator")}
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-center transition group"
            >
              <div className="text-[10px] font-bold text-white">Finance Ops</div>
              <div className="text-[9px] text-amber-400">Approvals</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin("auditor@razorrecover.io", "Auditor")}
              className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-center transition group"
            >
              <div className="text-[10px] font-bold text-white">Auditor</div>
              <div className="text-[9px] text-purple-400">Read-Only</div>
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        {isSignup && (
          <>
            <div className="space-y-1">
              <label className="text-sand-300 font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sand-400" />
                <span>Business / Merchant Name</span>
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-[#140e0a] border border-sand-200/20 rounded-xl px-3 py-2 text-white placeholder-sand-500 focus:outline-none focus:border-amber-400"
                placeholder="e.g. Apex Dynamics Ltd"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sand-300 font-semibold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-sand-400" />
                <span>Your Full Name</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#140e0a] border border-sand-200/20 rounded-xl px-3 py-2 text-white placeholder-sand-500 focus:outline-none focus:border-amber-400"
                placeholder="e.g. Sachin Tendulkar"
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-sand-300 font-semibold flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-sand-400" />
            <span>Email Address</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#140e0a] border border-sand-200/20 rounded-xl px-3 py-2 text-white placeholder-sand-500 focus:outline-none focus:border-amber-400"
            placeholder="name@business.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sand-300 font-semibold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-sand-400" />
            <span>Password</span>
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#140e0a] border border-sand-200/20 rounded-xl px-3 py-2 text-white placeholder-sand-500 focus:outline-none focus:border-amber-400"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>{loading ? "Authenticating..." : isSignup ? "Create Organization" : "Sign In with JWT"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Toggle Signup / Login */}
      <div className="text-center pt-2 border-t border-sand-200/10 text-xs text-sand-400">
        {isSignup ? (
          <span>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setIsSignup(false)}
              className="text-amber-400 font-bold hover:underline"
            >
              Sign In
            </button>
          </span>
        ) : (
          <span>
            New merchant?{" "}
            <button
              type="button"
              onClick={() => setIsSignup(true)}
              className="text-amber-400 font-bold hover:underline"
            >
              Register Organization
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-sand-400 text-xs font-bold">Loading authentication...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
