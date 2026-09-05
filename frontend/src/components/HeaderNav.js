"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck, LayoutDashboard, CheckSquare, BarChart3,
  Activity, Settings, UserCheck, LogOut, Database, Cpu, ArrowRight,
  FileText, CheckCircle2, ShieldAlert
} from "lucide-react";
import { api, getStoredUser, clearAuthSession } from "@/lib/api";
import RazorpaySettingsModal from "./RazorpaySettingsModal";

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [switchingRole, setSwitchingRole] = useState(false);

  const isDemoMode = pathname === "/demo";
  const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    } else if (!isPublicPage && !isDemoMode) {
      // If on protected page without auth, redirect to login
      router.push("/login");
    }
  }, [pathname, isPublicPage, isDemoMode]);

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

  const handleLogout = () => {
    api.logout();
  };

  // Role-specific navigation links
  const role = currentUser?.role || "MERCHANT_ADMIN";
  const isFinance = role === "FINANCE_OPERATOR";
  const isAuditor = role === "AUDITOR";

  let navLinks = [];
  if (isFinance) {
    navLinks = [
      { name: "Recovery Queue", href: "/dashboard", icon: LayoutDashboard, color: "text-amber-400" },
      { name: "Approvals Queue", href: "/approvals", icon: CheckSquare, color: "text-rose-400" },
      { name: "Recovery Analytics", href: "/analytics", icon: BarChart3, color: "text-emerald-400" },
      { name: "Ledger Records", href: "/activity", icon: FileText, color: "text-purple-400" },
    ];
  } else if (isAuditor) {
    navLinks = [
      { name: "Compliance Overview", href: "/dashboard", icon: ShieldCheck, color: "text-purple-400" },
      { name: "Policy & AI Audit", href: "/agent", icon: Cpu, color: "text-blue-400" },
      { name: "Verification Trail", href: "/activity", icon: Activity, color: "text-teal-400" },
      { name: "Audit Analytics", href: "/analytics", icon: BarChart3, color: "text-emerald-400" },
    ];
  } else {
    navLinks = [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-400" },
      { name: "Revenue Sources", href: "/revenue-sources", icon: Database, color: "text-teal-400" },
      { name: "Agent Control", href: "/agent", icon: Cpu, color: "text-amber-400" },
      { name: "Approvals", href: "/approvals", icon: CheckSquare, color: "text-rose-400" },
      { name: "Analytics", href: "/analytics", icon: BarChart3, color: "text-emerald-400" },
      { name: "Audit Trail", href: "/activity", icon: Activity, color: "text-purple-400" },
    ];
  }

  return (
    <>
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

            {/* Mode Specific Badges with whitespace-nowrap and fixed pill layout */}
            {isDemoMode ? (
              <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 whitespace-nowrap flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse mr-1.5 flex-shrink-0"></span>
                🟣 DEMO ENVIRONMENT · SYNTHETIC DATA
              </span>
            ) : !isPublicPage ? (
              <span className="hidden md:inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 whitespace-nowrap flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 flex-shrink-0"></span>
                🟢 MERCHANT WORKSPACE · RAZORPAY TEST MODE
              </span>
            ) : null}
          </div>

          {/* Role-tailored Navigation for Authenticated Workspace */}
          {!isPublicPage && !isDemoMode && (
            <nav className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      isActive
                        ? "bg-[#241a12] text-white border border-sand-200/20 shadow"
                        : "text-sand-300 hover:text-white hover:bg-sand-200/10"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${link.color}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Controls Area */}
          <div className="flex items-center space-x-2.5 text-xs flex-shrink-0">
            {isPublicPage ? (
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
            ) : isDemoMode ? (
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
              /* Real Authenticated Workspace Profile */
              <div className="flex items-center space-x-2.5">
                {/* User Identity Pill (Non-switchable in Real Workspace) */}
                <div className="flex items-center bg-[#18120d] border border-sand-200/20 rounded-xl px-3 py-1.5 space-x-2 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${isFinance ? "bg-amber-400" : isAuditor ? "bg-purple-400" : "bg-emerald-400"}`}></div>
                  <span className="text-white font-bold text-xs truncate max-w-[120px]">
                    {currentUser?.name || currentUser?.email || "Merchant Admin"}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${
                    isFinance
                      ? "bg-amber-500/20 text-amber-300"
                      : isAuditor
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}>
                    {isFinance ? "Finance Ops" : isAuditor ? "Auditor" : "Admin"}
                  </span>
                </div>

                {/* Razorpay Gateway Modal Trigger (Admin only) */}
                {role === "MERCHANT_ADMIN" && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition flex-shrink-0"
                    title="Gateway Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Gateway</span>
                  </button>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  title="Logout session"
                  className="p-1.5 rounded-xl bg-sand-200/10 hover:bg-red-500/20 hover:text-red-300 text-sand-400 transition flex-shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Razorpay Integration Settings Modal */}
      <RazorpaySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
