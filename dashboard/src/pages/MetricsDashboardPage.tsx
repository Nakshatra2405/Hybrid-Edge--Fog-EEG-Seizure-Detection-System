import React from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Cpu, Zap, ShieldCheck, BatteryCharging, Download, TrendingDown, CheckCircle } from 'lucide-react';

const mockLatencyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  edgeLatency: (3.8 + Math.sin(i * 0.4) * 0.6).toFixed(1),
  fogLatency: (14.2 + Math.cos(i * 0.5) * 1.5).toFixed(1),
}));

const mockAccuracyData = [
  { epoch: 'Epoch 01', precision: 92.4, recall: 90.1 },
  { epoch: 'Epoch 05', precision: 94.8, recall: 93.2 },
  { epoch: 'Epoch 10', precision: 96.5, recall: 95.8 },
  { epoch: 'Epoch 15', precision: 97.9, recall: 97.4 },
  { epoch: 'Epoch 20', precision: 98.4, recall: 98.1 },
];

export const MetricsDashboardPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Title Bar */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Metrics & Inference Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">AISeizureNet-v4.8 Performance Analytics & Edge/Fog Cluster Load</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            Last 24 Hours
          </button>
          <button className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-md flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export Analytics PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Mean Inference Latency</span>
            <Zap className="w-4 h-4 text-teal-600" />
          </div>
          <h3 className="text-2xl font-bold text-teal-700 mt-1">4.2 ms</h3>
          <p className="text-[11px] text-teal-600 mt-1.5 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> -0.8ms vs baseline (Edge INT8)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Seizure Detection Sensitivity</span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <h3 className="text-2xl font-bold text-sky-700 mt-1">98.4 %</h3>
          <p className="text-[11px] text-sky-600 mt-1.5 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> CHB-MIT Corpus Validated
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>False Positive Rate / Hr</span>
            <Cpu className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">0.02 / hr</h3>
          <p className="text-[11px] text-slate-500 mt-1.5">0.15 threshold requirement</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Active Edge Nodes</span>
            <BatteryCharging className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">42 Online</h3>
          <p className="text-[11px] text-amber-600 mt-1.5 font-mono">Avg Battery: 84%</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-600" /> Real-Time Inference Latency (ms)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockLatencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="edgeLatency" stroke="#0d9488" fill="#ccfbf1" name="Edge Latency (ms)" />
                <Area type="monotone" dataKey="fogLatency" stroke="#0ea5e9" fill="#e0f2fe" name="Fog Sync Latency (ms)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600" /> Model Benchmark Convergence (Precision vs Recall)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockAccuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="epoch" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[85, 100]} />
                <Tooltip />
                <Bar dataKey="precision" fill="#0d9488" name="Precision (%)" />
                <Bar dataKey="recall" fill="#0ea5e9" name="Recall (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
