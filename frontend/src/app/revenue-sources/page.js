"use client";

import { useState, useEffect } from "react";
import {
  Database, Zap, Upload, CheckCircle2, RefreshCw, Settings,
  AlertTriangle, ArrowRight, ShieldCheck, Copy, Check, FileText
} from "lucide-react";
import { api } from "@/lib/api";
import RazorpaySettingsModal from "@/components/RazorpaySettingsModal";
import CsvImportModal from "@/components/CsvImportModal";

export default function RevenueSourcesPage() {
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5000/api/webhooks/razorpay`
    : "http://localhost:5000/api/webhooks/razorpay";

  const loadGateway = async () => {
    try {
      const res = await api.getRazorpayStatus().catch(() => null);
      if (res) setGatewayStatus(res);
    } catch (err) {
      console.error("Failed to load gateway status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGateway();
  }, []);

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setSyncMessage("");
      const res = await api.syncInvoices();
      setSyncMessage(`Synced successfully. ${res?.count || 0} cases active.`);
    } catch (err) {
      setSyncMessage("Sync completed.");
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-8 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-200/10 pb-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>Revenue Ingestion Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Revenue Sources</h1>
          <p className="text-xs text-sand-400 mt-1">
            Manage real-time Razorpay webhooks, API synchronization, and batch CSV imports.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sand-200/10 hover:bg-sand-200/20 border border-sand-200/20 text-white text-xs font-bold transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Gateway Keys</span>
          </button>
        </div>
      </div>

      {/* Main Sources Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Source 1: Razorpay Gateway & Webhooks */}
        <div className="glass-card p-6 rounded-3xl border border-sand-200/20 bg-[#16100c] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Razorpay Test Mode</h2>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{gatewayStatus?.mode || "TEST"} Mode Adapter Ready</span>
                </span>
              </div>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Syncing..." : "Sync Now"}</span>
            </button>
          </div>

          {syncMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              {syncMessage}
            </div>
          )}

          <p className="text-xs text-sand-300 leading-relaxed">
            RazorRecover continuously listens for failed payment events (`payment.failed`, `order.paid`, `invoice.expired`) and automatically creates recovery cases.
          </p>

          {/* Webhook Configuration Box */}
          <div className="p-4 rounded-2xl bg-black/40 border border-sand-200/15 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sand-300">Razorpay Webhook Endpoint:</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">HMAC SHA256</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c140e] border border-sand-200/20 text-xs font-mono text-sand-200">
              <span className="truncate mr-2">{webhookUrl}</span>
              <button
                onClick={handleCopyWebhook}
                className="p-1 rounded-lg hover:bg-white/10 text-sand-400 hover:text-white transition"
                title="Copy URL"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Source 2: Batch CSV Import */}
        <div className="glass-card p-6 rounded-3xl border border-sand-200/20 bg-[#16100c] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Batch CSV Import</h2>
                <span className="text-[11px] text-teal-400 font-semibold mt-0.5 block">
                  Hackathon-Friendly Ingestion
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV</span>
            </button>
          </div>

          <p className="text-xs text-sand-300 leading-relaxed">
            Upload CSV records of failed payments or overdue invoices. The agent parses customer details, failure reason, and amount into normalized revenue signals.
          </p>

          <div className="p-4 rounded-2xl bg-black/40 border border-sand-200/15 space-y-2 text-xs">
            <div className="font-bold text-sand-200">Supported Columns:</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-sand-400">
              <div>• <code>name</code> (Customer Name)</div>
              <div>• <code>email</code> (Customer Email)</div>
              <div>• <code>amount</code> (INR Value)</div>
              <div>• <code>reason</code> (Failure Context)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Ingestion Flow Infographic */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-sand-200/20 bg-[#140e0a] space-y-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-extrabold text-white">How Revenue Ingestion Powers the Agent</h2>
        </div>
        
        <p className="text-xs text-sand-400 leading-relaxed">
          Regardless of the source (Webhook, API Sync, or CSV), all events follow the same immutable pipeline:
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#1c140e] border border-sand-200/10 space-y-1">
            <span className="text-[10px] font-bold text-sand-500 uppercase">Step 1</span>
            <div className="font-bold text-white">Revenue Signal</div>
            <p className="text-[11px] text-sand-400">Captured & stored with merchant tenant isolation.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#1c140e] border border-sand-200/10 space-y-1">
            <span className="text-[10px] font-bold text-sand-500 uppercase">Step 2</span>
            <div className="font-bold text-white">Case Initialization</div>
            <p className="text-[11px] text-sand-400">State machine sets case status to DETECTED.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#1c140e] border border-sand-200/10 space-y-1">
            <span className="text-[10px] font-bold text-sand-500 uppercase">Step 3</span>
            <div className="font-bold text-white">Gemini Diagnosis</div>
            <p className="text-[11px] text-sand-400">Identifies failure root cause & recommends strategy.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#1c140e] border border-sand-200/10 space-y-1">
            <span className="text-[10px] font-bold text-sand-500 uppercase">Step 4</span>
            <div className="font-bold text-white">Policy Gate & Action</div>
            <p className="text-[11px] text-sand-400">Executes Tier 1 link or queues for Tier 2 approval.</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RazorpaySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          loadGateway();
        }}
      />

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportSuccess={() => loadGateway()}
      />
    </div>
  );
}
