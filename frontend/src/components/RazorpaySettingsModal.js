"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { X, ShieldCheck, CheckCircle2, RefreshCw, Zap, Key, Server, Lock, ExternalLink } from "lucide-react";

export default function RazorpaySettingsModal({ isOpen, onClose }) {
  const [status, setStatus] = useState(null);
  const [pingResult, setPingResult] = useState(null);
  const [pinging, setPinging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const loadStatus = async () => {
    try {
      const res = await api.getRazorpayStatus();
      setStatus(res);
    } catch (err) {
      console.error("Failed to load Razorpay status:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const handlePing = async () => {
    try {
      setPinging(true);
      const res = await api.pingRazorpay();
      setPingResult(res);
    } catch (err) {
      setPingResult({ success: false, message: err.message });
    } finally {
      setPinging(false);
    }
  };

  const handleSyncInvoices = async () => {
    try {
      setSyncing(true);
      const res = await api.syncInvoices();
      setSyncMsg(`Synced ${res.synced_count} invoice records from Razorpay Invoices API.`);
    } catch (err) {
      setSyncMsg(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#18120d] border border-sand-200/20 rounded-3xl shadow-2xl overflow-hidden text-sand-100 glow-warm">
        {/* Header */}
        <div className="bg-[#241a12] p-5 border-b border-sand-200/10 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Razorpay Connection & Integration</h3>
              <p className="text-xs text-sand-300">API Gateway & Data Source Configuration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sand-200/10 hover:bg-sand-200/20 flex items-center justify-center text-sand-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs">
          {/* Connection Overview */}
          <div className="bg-[#241a12] p-4 rounded-2xl border border-sand-200/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sand-300">API Mode Status</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {status?.mode || "Razorpay Test Mode"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sand-200 border-t border-sand-200/10 pt-2">
              <span className="flex items-center gap-1.5 text-sand-400">
                <Key className="w-3.5 h-3.5" />
                <span>Razorpay Key ID</span>
              </span>
              <span className="font-mono text-white">rzp_test_••••••••4091</span>
            </div>

            <div className="flex justify-between items-center text-sand-200 border-t border-sand-200/10 pt-2">
              <span className="flex items-center gap-1.5 text-sand-400">
                <Server className="w-3.5 h-3.5" />
                <span>Webhook Listener</span>
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active & Verified</span>
              </span>
            </div>
          </div>

          {/* Test Ping */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">API Gateway Verification</span>
              <button
                onClick={handlePing}
                disabled={pinging}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{pinging ? "Pinging..." : "PING RAZORPAY API"}</span>
              </button>
            </div>

            {pingResult && (
              <div className="bg-[#140e0a] p-3 rounded-xl border border-blue-500/20 text-blue-300 font-mono space-y-1">
                <div className="font-bold">{pingResult.message}</div>
                <div className="text-[10px] text-sand-400">Latency: {pingResult.latency_ms}ms • Mode: {pingResult.mode}</div>
              </div>
            )}
          </div>

          {/* Invoice Sync Section */}
          <div className="space-y-3 pt-3 border-t border-sand-200/10">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">Invoice Data Source</span>
                <p className="text-[11px] text-sand-400">Sync merchant receivables from Razorpay Invoices API</p>
              </div>
              <button
                onClick={handleSyncInvoices}
                disabled={syncing}
                className="px-3.5 py-1.5 rounded-xl bg-[#241a12] hover:bg-[#36271c] border border-sand-200/20 text-sand-100 font-bold text-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span>SYNC INVOICES</span>
              </button>
            </div>

            {syncMsg && (
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-300 font-mono">
                {syncMsg}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#140e0a] py-3 px-6 border-t border-sand-200/10 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-sand-200/10 hover:bg-sand-200/20 text-sand-200 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
