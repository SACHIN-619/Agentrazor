"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck, LayoutDashboard, CheckSquare, BarChart3,
  Activity, Settings, LogOut, Database, Cpu, ChevronLeft,
  ChevronRight, FileText, Sparkles, User, Layers
} from "lucide-react";
import { api, getStoredUser } from "@/lib/api";
import RazorpaySettingsModal from "./RazorpaySettingsModal";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isPublicPage = pathname === "/" || pathname === "/demo" || pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
    }
  }, [pathname]);

  if (isPublicPage) return null;

  const role = currentUser?.role || "MERCHANT_ADMIN";
  const isFinance = role === "FINANCE_OPERATOR";
  const isAuditor = role === "AUDITOR";
  const isAdmin = !isFinance && !isAuditor;

  let navLinks = [];
  if (isFinance) {
    navLinks = [
      { name: "Recovery Queue", href: "/dashboard", icon: LayoutDashboard, color: "text-amber-400", badge: "Queue" },
      { name: "Approvals Queue", href: "/approvals", icon: CheckSquare, color: "text-rose-400", badge: "Tier 2" },
      { name: "Recovery Analytics", href: "/analytics", icon: BarChart3, color: "text-emerald-400" },
      { name: "Ledger Records", href: "/activity", icon: FileText, color: "text-purple-400" },
    ];
  } else if (isAuditor) {
    navLinks = [
      { name: "Compliance Audit", href: "/dashboard", icon: ShieldCheck, color: "text-purple-400", badge: "Read-Only" },
      { name: "Policy & AI Audit", href: "/agent", icon: Cpu, color: "text-blue-400" },
      { name: "Verification Trail", href: "/activity", icon: Activity, color: "text-teal-400" },
      { name: "Audit Analytics", href: "/analytics", icon: BarChart3, color: "text-emerald-400" },
    ];
  } else {
    navLinks = [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-400" },
      { name: "Revenue Sources", href: "/revenue-sources", icon: Database, color: "text-teal-400", badge: "Live" },
      { name: "Agent Control", href: "/agent", icon: Cpu, color: "text-amber-400", badge: "Active" },
      { name: "Approvals", href: "/approvals", icon: CheckSquare, color: "text-rose-400" },
      { name: "Analytics", href: "/analytics", icon: BarChart3, color: "text-emerald-400" },
      { name: "Audit Trail", href: "/activity", icon: Activity, color: "text-purple-400" },
    ];
  }

  const handleLogout = () => {
    api.logout();
  };

  const effectiveExpanded = !isCollapsed || isHovered;

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => isCollapsed && setIsHovered(false)}
        className={`hidden md:flex flex-col justify-between fixed top-0 left-0 bottom-0 z-40 bg-[#16100c]/95 border-r border-sand-200/10 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          effectiveExpanded ? "w-64 shadow-2xl" : "w-[72px]"
        }`}
      >
        {/* Top Brand & Collapse Toggle */}
        <div className="p-4 border-b border-sand-200/10">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              {effectiveExpanded && (
                <div className="overflow-hidden">
                  <span className="font-black text-lg tracking-tight text-white whitespace-nowrap">
                    Razor<span className="text-amber-400">Recover</span>
                  </span>
                </div>
              )}
            </Link>

            {/* Collapse Toggle Button */}
            {effectiveExpanded && (
              <button
                onClick={() => {
                  setIsCollapsed(!isCollapsed);
                  setIsHovered(false);
                }}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                className="p-1.5 rounded-lg bg-sand-200/10 hover:bg-sand-200/20 text-sand-400 hover:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mode Pill Badge */}
          {effectiveExpanded && (
            <div className="mt-3">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                RAZORPAY TEST MODE
              </span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={!effectiveExpanded ? link.name : undefined}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition group ${
                  isActive
                    ? "bg-gradient-to-r from-sand-200/20 to-sand-200/10 text-white border border-sand-200/20 shadow-md"
                    : "text-sand-400 hover:text-white hover:bg-sand-200/10"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${link.color}`} />
                  {effectiveExpanded && (
                    <span className="truncate whitespace-nowrap">{link.name}</span>
                  )}
                </div>

                {effectiveExpanded && link.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-sand-300 font-mono border border-white/5">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom User Profile & Gateway Controls */}
        <div className="p-3 border-t border-sand-200/10 space-y-2 bg-[#120c09]">
          {/* Uncollapsed toggle trigger if collapsed */}
          {!effectiveExpanded && (
            <button
              onClick={() => setIsCollapsed(false)}
              title="Expand Sidebar"
              className="w-full py-2 flex items-center justify-center rounded-xl bg-sand-200/10 hover:bg-sand-200/20 text-sand-300 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* User Profile Card */}
          {effectiveExpanded ? (
            <div className="p-2.5 rounded-xl bg-[#1c140e] border border-sand-200/15 flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  isFinance ? "bg-amber-500/20 text-amber-300" : isAuditor ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"
                }`}>
                  {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">
                    {currentUser?.name || currentUser?.email || "Admin User"}
                  </div>
                  <div className="text-[9px] uppercase font-bold text-sand-400 tracking-wider">
                    {isFinance ? "Finance Ops" : isAuditor ? "Auditor" : "Merchant Admin"}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Logout session"
                className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-300 text-sand-400 transition flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Logout session"
              className="w-full py-2 flex items-center justify-center rounded-xl bg-sand-200/10 hover:bg-red-500/20 hover:text-red-300 text-sand-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Gateway Settings Trigger (Admin Only) */}
          {isAdmin && effectiveExpanded && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Gateway Settings</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#16100c]/95 backdrop-blur-md border-t border-sand-200/15 px-3 py-2 flex items-center justify-around">
        {navLinks.slice(0, 4).map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center space-y-1 py-1 px-3 rounded-xl text-[10px] font-bold transition ${
                isActive ? "text-amber-400" : "text-sand-400 hover:text-sand-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.name.split(" ")[0]}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center space-y-1 py-1 px-3 rounded-xl text-[10px] font-bold text-sand-400 hover:text-red-300"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit</span>
        </button>
      </nav>

      {/* Razorpay Integration Modal */}
      <RazorpaySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
