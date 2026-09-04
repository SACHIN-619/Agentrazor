"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, LayoutDashboard, CheckSquare, BarChart3, Activity, Settings, UserCheck, Key } from "lucide-react";
import RazorpaySettingsModal from "./RazorpaySettingsModal";

export default function HeaderNav() {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userRole, setUserRole] = useState("Merchant Admin");

  useEffect(() => {
    const saved = localStorage.getItem("razor_recover_role");
    if (saved) setUserRole(saved);
  }, []);

  const handleRoleChange = (role) => {
    setUserRole(role);
    localStorage.setItem("razor_recover_role", role);
  };

  const navLinks = [
    { name: "Control Room", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-400" },
    { name: "Approval Queue", href: "/approvals", icon: CheckSquare, color: "text-amber-400" },
    { name: "Analytics", href: "/analytics", icon: BarChart3, color: "text-emerald-400" },
    { name: "Agent Audit", href: "/activity", icon: Activity, color: "text-purple-400" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 glass-panel border-b border-sand-200/10 bg-[#140e0a]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Razor<span className="text-amber-400">Recover</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Track 03 AI
            </span>
          </div>

          {/* Main Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? "bg-[#241a12] text-white border border-sand-200/20 shadow"
                      : "text-sand-300 hover:text-white hover:bg-sand-200/10"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${link.color}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Authentication RBAC Switcher & Razorpay Connection Settings */}
          <div className="flex items-center space-x-2.5 text-xs">
            {/* RBAC Role Selector */}
            <div className="flex items-center bg-[#18120d] border border-sand-200/20 rounded-xl px-2.5 py-1.5 space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={userRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="bg-transparent text-sand-100 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="Merchant Admin" className="bg-[#18120d] text-white">Merchant Admin (Full)</option>
                <option value="Finance Operator" className="bg-[#18120d] text-white">Finance Ops (Approvals)</option>
                <option value="Auditor" className="bg-[#18120d] text-white">Auditor (Read-Only)</option>
              </select>
            </div>

            {/* Razorpay Gateway Status & Modal Trigger */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">Razorpay Gateway</span>
              <Settings className="w-3.5 h-3.5 ml-0.5 text-emerald-400" />
            </button>
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
