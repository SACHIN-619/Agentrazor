"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import RazorpayModal from "@/components/RazorpayModal";
import { ShieldCheck, CheckCircle2, DollarSign, Lock, Building, FileText, ArrowRight } from "lucide-react";

export default function CustomerPayPage() {
  const params = useParams();
  const case_id = params?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [paid, setPaid] = useState(false);

  const loadCase = async () => {
    if (!case_id) return;
    try {
      setLoading(true);
      const res = await api.getCaseDetail(case_id);
      setData(res.case);
      if (res.case?.status === "closed" && res.case?.outcome === "recovered") {
        setPaid(true);
      }
    } catch (err) {
      console.error("Failed to load customer payment link:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [case_id]);

  const handlePaymentSuccess = async (id, note) => {
    await api.verifyPayment(id, note || "Paid via Customer Link");
    setPaid(true);
    await loadCase();
  };

  if (loading) {
    return <div className="py-16 text-center text-sand-300 text-sm">Loading Razorpay Payment Gateway...</div>;
  }

  if (!data) {
    return <div className="py-16 text-center text-red-400 text-sm">Payment link expired or invalid case ID: {case_id}</div>;
  }

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      {/* Top Brand Bar */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Razorpay Secure Payment Portal</h1>
        <p className="text-xs text-sand-300">Authorized by {data.client_name} • Invoice #{data.invoice_number}</p>
      </div>

      {/* Invoice Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-sand-200/20 glow-warm space-y-6">
        {paid ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Payment Completed</h2>
            <p className="text-xs text-sand-300 max-w-sm mx-auto">
              Thank you! Your payment of <strong className="text-white">₹{data.amount?.toLocaleString("en-IN")}</strong> has been received and verified.
            </p>
            <div className="pt-2">
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300">
                <span>View Merchant Control Room</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center border-b border-sand-200/10 pb-4">
              <div>
                <span className="text-xs text-sand-300 font-semibold uppercase">Billed To</span>
                <div className="text-base font-bold text-white mt-0.5">{data.client_name}</div>
                <div className="text-xs text-sand-400">{data.client_email}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-sand-300 font-semibold uppercase">Total Amount Due</span>
                <div className="text-3xl font-extrabold text-emerald-400 mt-0.5">
                  ₹{data.amount?.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-sand-300 uppercase tracking-wider">Invoice Summary</span>
              <div className="bg-[#140e0a] p-4 rounded-2xl border border-sand-200/10 text-xs space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Professional Services / Deliverables ({data.invoice_number})</span>
                  <span className="font-bold text-white">₹{data.amount?.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sand-400 text-[11px] pt-2 border-t border-sand-200/10">
                  <span>Status: Outstanding</span>
                  <span className="text-amber-400 font-semibold">Payment Action Required</span>
                </div>
              </div>
            </div>

            {/* Pay Action Button */}
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>PAY ₹{data.amount?.toLocaleString("en-IN")} NOW VIA RAZORPAY</span>
            </button>
          </>
        )}
      </div>

      {/* Razorpay Modal Simulator */}
      <RazorpayModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        caseData={data}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
