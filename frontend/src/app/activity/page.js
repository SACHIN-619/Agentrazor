"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Activity, Clock, ShieldCheck, CheckCircle2, Lock, Cpu, Play } from "lucide-react";

export default function ActivityPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const res = await api.getRuns();
      setRuns(res.runs || []);
    } catch (err) {
      console.error("Failed to load agent runs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-slate-500 text-sm">Loading agent audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-8 h-8 text-purple-400" />
            <span>Agent Activity & Audit Log</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Immutable log of agent execution cycles tagged by run_id.
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3 border border-slate-800">
          <Clock className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">No Agent Runs Recorded Yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Trigger a recovery cycle from the Control Room to generate an immutable audit log.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {runs.map((r) => {
            const sum = r.summary || {};
            return (
              <div key={r.run_id} className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
                {/* Run Top Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2 font-mono font-bold text-base text-purple-400">
                      <Cpu className="w-4 h-4" />
                      <span>{r.run_id}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{r.timestamp}</div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Evaluated: {sum.cases_evaluated || 0}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Tier 1: {sum.tier1_executed || 0}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Tier 2: {sum.tier2_queued || 0}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      Tier 3: {sum.tier3_escalated || 0}
                    </span>
                  </div>
                </div>

                {/* Run Case Details List */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Execution Details Across Worklist
                  </span>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-xs space-y-2 max-h-64 overflow-y-auto">
                    {(sum.details || []).map((d, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-900 last:border-0">
                        <span className="text-white font-bold">{d.case_id}</span>
                        <span className="text-slate-400 capitalize">{d.action?.replace("_", " ")}</span>
                        {d.tier && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${d.tier === 3 ? "bg-red-500/20 text-red-400" : d.tier === 2 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                            Tier {d.tier}
                          </span>
                        )}
                        {d.recovered && (
                          <span className="text-emerald-400 font-bold">RECOVERED</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
