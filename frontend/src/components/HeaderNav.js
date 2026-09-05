"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck, UserCheck, ArrowRight
} from "lucide-react";
import { api, getStoredUser } from "@/lib/api";

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [switchingRole, setSwitchingRole] = useState(false);

  const isDemoMode = pathname === "/demo";
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, [pathname]);

  const handleDemoAccountSwitch = async (roleEmail) => {
    try {
      setSwitchingRole(true);
      const res = await api.login(roleEmail, "password123");
      if (res.user) {
        setCurrentUser({ ...res.user, role: res.role, merchant: res.merchant });
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to switch demo account:", err);
    } finally {
      setSwitchingRole(false);
    }
  };

  // Authenticated workspace pages use the left Sidebar instead
  if (!isPublicPage && !isDemoMode) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-sand-200/10 bg-[#140e0a]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Context Badge */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white whitespace-nowrap">
              Razor<span className="text-amber-400">Recover</span>
            </span>
          </Link>

          {isDemoMode && (
            <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 whitespace-nowrap flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse mr-1.5 flex-shrink-0"></span>
              🟣 DEMO ENVIRONMENT · SYNTHETIC DATA
            </span>
          )}
        </div>

        {/* Right Controls Area */}
        <div className="flex items-center space-x-2.5 text-xs flex-shrink-0">
          {isDemoMode ? (
            <div className="flex items-center space-x-3">
              {/* Demo Account Switcher */}
              <div className="flex items-center bg-[#1e1428] border border-purple-500/30 rounded-xl px-2.5 py-1.5 space-x-1.5 flex-shrink-0">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] text-purple-300 font-semibold hidden sm:inline">Demo Account:</span>
                <select
                  value={
                    currentUser?.role === "FINANCE_OPERATOR"
                      ? "finance@razorrecover.io"
                      : currentUser?.role === "AUDITOR"
                      ? "auditor@razorrecover.io"
                      : "admin@razorrecover.io"
                  }
                  disabled={switchingRole}
                  onChange={(e) => handleDemoAccountSwitch(e.target.value)}
                  className="bg-transparent text-purple-100 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="admin@razorrecover.io" className="bg-[#1e1428] text-white">Merchant Admin (Full)</option>
                  <option value="finance@razorrecover.io" className="bg-[#1e1428] text-white">Finance Ops (Approvals)</option>
                  <option value="auditor@razorrecover.io" className="bg-[#1e1428] text-white">Auditor (Read-Only)</option>
                </select>
              </div>

              <Link
                href="/signup"
                className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 font-bold transition whitespace-nowrap"
              >
                <span>Sign Up Real SaaS</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/demo"
                className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold transition whitespace-nowrap"
              >
                Try Demo
              </Link>
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl bg-sand-200/10 hover:bg-sand-200/20 text-sand-200 font-bold transition whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold shadow-md transition whitespace-nowrap"
              >
                Sign Up Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
