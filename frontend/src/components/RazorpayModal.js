"use client";

import { useState } from "react";
import { X, ShieldCheck, CreditCard, Smartphone, Building2, CheckCircle2, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function RazorpayModal({ isOpen, onClose, caseData, onPaymentSuccess }) {
  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [upiId, setUpiId] = useState("success@razorpay");

  if (!isOpen || !caseData) return null;

  const amount = caseData.amount || 0;

  const handlePay = async () => {
    try {
      setProcessing(true);
      // Simulate network request to Razorpay Test Gateway
      await new Promise((r) => setTimeout(r, 1200));
      
      // Call Payment Outcome Verifier tool
      if (onPaymentSuccess) {
        await onPaymentSuccess(caseData.case_id, `Paid via Razorpay Test Mode (${method.toUpperCase()})`);
      }
      setCompleted(true);
    } catch (err) {
      alert("Payment failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#18120d] border border-sand-200/20 rounded-3xl shadow-2xl overflow-hidden text-sand-100 glow-warm">
        {/* Razorpay Test Modal Header */}
        <div className="bg-[#241a12] p-5 border-b border-sand-200/10 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-white text-lg shadow-md shadow-blue-600/30">
              R
            </div>
            <div>
              <div className="font-bold text-white text-base flex items-center gap-2">
                <span>Razorpay Checkout</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  TEST MODE
                </span>
              </div>
              <p className="text-xs text-sand-300">Invoice #{caseData.invoice_number || caseData.case_id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sand-200/10 hover:bg-sand-200/20 flex items-center justify-center text-sand-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {completed ? (
            /* Success State */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Payment Confirmed!</h3>
              <p className="text-xs text-sand-300 max-w-xs mx-auto">
                ₹{amount.toLocaleString("en-IN")} received & verified via Razorpay Test Mode. Case <span className="font-mono text-emerald-400 font-bold">{caseData.case_id}</span> is now CLOSED & RECOVERED.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition"
              >
                Return to Control Room
              </button>
            </div>
          ) : (
            /* Checkout State */
            <>
              {/* Amount Display */}
              <div className="bg-[#241a12] p-4 rounded-2xl border border-sand-200/10 flex justify-between items-center">
                <div>
                  <span className="text-xs text-sand-300 uppercase font-semibold">Amount Payable</span>
                  <div className="text-2xl font-extrabold text-white">₹{amount.toLocaleString("en-IN")}</div>
                </div>
                <div className="text-right text-xs text-sand-300">
                  <div>{caseData.client_name}</div>
                  <div className="text-[11px] text-sand-400">{caseData.client_email}</div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-sand-300 uppercase tracking-wider">Select Payment Method</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setMethod("upi")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold ${method === "upi" ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-[#241a12] border-sand-200/10 text-sand-300 hover:text-white"}`}
                  >
                    <Smartphone className="w-5 h-5 text-blue-400" />
                    <span>UPI / GPay</span>
                  </button>

                  <button
                    onClick={() => setMethod("card")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold ${method === "card" ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-[#241a12] border-sand-200/10 text-sand-300 hover:text-white"}`}
                  >
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    <span>Card</span>
                  </button>

                  <button
                    onClick={() => setMethod("netbanking")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold ${method === "netbanking" ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-[#241a12] border-sand-200/10 text-sand-300 hover:text-white"}`}
                  >
                    <Building2 className="w-5 h-5 text-amber-400" />
                    <span>Netbanking</span>
                  </button>
                </div>
              </div>

              {/* Method Detail Form */}
              {method === "upi" && (
                <div className="space-y-2">
                  <label className="text-xs text-sand-300 font-semibold">Enter VPA / UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-[#140e0a] border border-sand-200/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-sand-400">Use 'success@razorpay' for instant test authorization.</p>
                </div>
              )}

              {method === "card" && (
                <div className="space-y-2 text-xs">
                  <div className="bg-[#140e0a] p-3 rounded-xl border border-sand-200/20 font-mono space-y-1 text-slate-300">
                    <div>Card: 4111 •••• •••• 1111</div>
                    <div>Expiry: 12/28 • CVV: 123</div>
                  </div>
                  <p className="text-[10px] text-sand-400">Standard Razorpay Test Visa Card pre-filled.</p>
                </div>
              )}

              {method === "netbanking" && (
                <div className="space-y-2 text-xs">
                  <select className="w-full bg-[#140e0a] border border-sand-200/20 text-white rounded-xl p-2.5 focus:outline-none">
                    <option>HDFC Bank (Test)</option>
                    <option>ICICI Bank (Test)</option>
                    <option>State Bank of India (Test)</option>
                    <option>Axis Bank (Test)</option>
                  </select>
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Razorpay Test Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>PAY ₹{amount.toLocaleString("en-IN")} VIA RAZORPAY</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#140e0a] py-3 px-6 border-t border-sand-200/10 flex items-center justify-between text-[11px] text-sand-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit Razorpay Test Encryption</span>
          </div>
          <span>Razorpay Buildathon 2026</span>
        </div>
      </div>
    </div>
  );
}
