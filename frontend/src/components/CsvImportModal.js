"use client";

import { useState } from "react";
import {
  Upload, X, Check, AlertCircle, FileText, CheckCircle2,
  ArrowRight, Database, Download
} from "lucide-react";
import { api } from "@/lib/api";

export default function CsvImportModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState(null);

  if (!isOpen) return null;

  // Handle client-side CSV parsing for immediate preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== "");
        if (lines.length <= 1) {
          setError("CSV file appears to be empty or missing data rows.");
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const rows = [];

        for (let i = 1; i < Math.min(lines.length, 10); i++) {
          const values = lines[i].split(",").map(v => v.trim());
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || "";
          });
          rows.push(rowObj);
        }

        setParsedRows(rows);
      } catch (err) {
        setError("Failed to parse CSV preview. Please check file formatting.");
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleExecuteImport = async () => {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const res = await api.ingestCsv(file);
      setImportResult(res);
      if (onImportSuccess) onImportSuccess(res);
    } catch (err) {
      setError(err.message || "Failed to upload and ingest CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "name,email,amount,reason\nRahul Sharma,rahul@example.com,4800,authentication_failed\nPriya Patel,priya@example.com,3200,timeout\nAcme Enterprises,billing@acme.com,28000,payment_promise_broken\nZeta Corp,finance@zeta.io,45000,disputed_charge";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "razorrecover_failed_payments_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="glass-card max-w-2xl w-full p-6 rounded-3xl border border-sand-200/20 bg-[#16100c] shadow-2xl space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-sand-200/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Revenue Failure CSV</h2>
              <p className="text-xs text-sand-400">Upload failed payments or overdue invoices for autonomous recovery analysis.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-sand-200/10 hover:bg-sand-200/20 text-sand-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success State */}
        {importResult ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">CSV Ingestion Successful!</h3>
              <p className="text-xs text-sand-300">
                Created <strong className="text-emerald-400">{importResult.created_cases || 0}</strong> new revenue signals & recovery cases.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-sand-200/10 text-xs text-sand-400">
              Signals are now queued in the database. The agent will diagnose root causes and enforce policy bounds.
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg"
              >
                Close & View Cases
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Upload Box */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-sand-200/20 hover:border-teal-500/50 bg-[#1c140e] text-center space-y-2 transition cursor-pointer relative">
              <Upload className="w-8 h-8 text-teal-400 mx-auto" />
              <div className="text-xs font-bold text-white">
                {file ? file.name : "Select or drag & drop a .CSV file"}
              </div>
              <p className="text-[11px] text-sand-400">
                Required columns: <code>name</code>, <code>email</code>, <code>amount</code>, <code>reason</code>
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Template Download Link */}
            <div className="flex justify-between items-center text-xs text-sand-400">
              <span>Need a sample file to test?</span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center space-x-1 text-teal-400 hover:underline font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-sand-300">
                  <span>File Preview (First {parsedRows.length} rows):</span>
                  <span className="text-[10px] text-emerald-400">Valid Format ✓</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-sand-200/15 bg-black/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#241a12] text-sand-300 border-b border-sand-200/10">
                      <tr>
                        <th className="px-3 py-2 font-bold">Customer</th>
                        <th className="px-3 py-2 font-bold">Email</th>
                        <th className="px-3 py-2 font-bold">Amount</th>
                        <th className="px-3 py-2 font-bold">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-200/10 text-sand-300">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="px-3 py-2 text-white font-semibold">{row.name || "—"}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">{row.email || "—"}</td>
                          <td className="px-3 py-2 font-mono font-bold text-emerald-400">₹{row.amount || "0"}</td>
                          <td className="px-3 py-2 text-[11px] text-amber-400">{row.reason || "failed"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Submit Actions */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-sand-200/10 hover:bg-sand-200/20 text-sand-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!file || loading}
                onClick={handleExecuteImport}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-lg"
              >
                <span>{loading ? "Importing & Ingesting..." : "Import & Analyze Batch"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
