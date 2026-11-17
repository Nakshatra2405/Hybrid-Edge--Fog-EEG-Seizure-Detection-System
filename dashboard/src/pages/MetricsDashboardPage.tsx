import React, { useCallback, useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Cpu, Zap, ShieldCheck, BatteryCharging, Download, TrendingDown, CheckCircle, RefreshCw, Radio } from 'lucide-react';
import { api } from '../services/apiClient';
import { useTelemetry, TelemetryUpdate } from '../hooks/useTelemetry';

interface LatencyPoint {
  time: string;
  edgeLatencyMs: number;
  seizureProbabilityPercent: number;
  nodeName: string;
}

interface ModelBenchmarkPoint {
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  isDeployed: boolean;
}

interface SystemMetrics {
  totalPatients: number;
  criticalCount: number;
  onlineNodesCount: number;
  averageLatencyMs: number;
  modelSensitivityPercent: number;
  modelF1Score: number;
  activeModelVersion?: string;
  totalNodesCount?: number;
  alertNodesCount?: number;
  recentTelemetry?: LatencyPoint[];
  modelBenchmarks?: ModelBenchmarkPoint[];
}

const fallbackAccuracyData: ModelBenchmarkPoint[] = [
  { version: 'SeizureNet-v2.8', accuracy: 94.2, precision: 93.1, recall: 93.8, f1Score: 93.4, isDeployed: false },
  { version: 'SeizureNet-v3.1', accuracy: 96.8, precision: 95.9, recall: 96.2, f1Score: 96.0, isDeployed: false },
  { version: 'SeizureNet-v3.2', accuracy: 98.4, precision: 97.9, recall: 98.1, f1Score: 98.0, isDeployed: true },
];

export const MetricsDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [telemetrySeries, setTelemetrySeries] = useState<LatencyPoint[]>([]);
  const [modelBenchmarks, setModelBenchmarks] = useState<ModelBenchmarkPoint[]>(fallbackAccuracyData);
  const [liveBadge, setLiveBadge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMetrics();
      if (data) {
        setMetrics(data);
        if (Array.isArray(data.recentTelemetry) && data.recentTelemetry.length > 0) {
          setTelemetrySeries(data.recentTelemetry);
        }
        if (Array.isArray(data.modelBenchmarks) && data.modelBenchmarks.length > 0) {
          setModelBenchmarks(data.modelBenchmarks);
        }
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 15000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  // Live SignalR updates from BLE / Edge Gateway
  const handleLiveTelemetry = useCallback((update: TelemetryUpdate) => {
    const nowTime = new Date().toTimeString().split(' ')[0];
    const latency = Number(update.edgeLatencyMs ?? 14);
    const probPct = Number(((update.seizureProbability ?? 0) * 100).toFixed(1));
    const nodeLabel = update.nodeName || update.deviceId || 'Edge-Node';

    setLiveBadge(`LIVE: ${nodeLabel} · ${latency} ms · ${probPct}% Prob`);

    setTelemetrySeries((prev) => {
      const next = [
        ...prev,
        {
          time: nowTime,
          edgeLatencyMs: latency,
          seizureProbabilityPercent: probPct,
          nodeName: nodeLabel,
        },
      ];
      const trimmed = next.slice(-30);

      // Update live rolling average latency on KPI card immediately
      const avg = trimmed.reduce((sum, pt) => sum + Number(pt.edgeLatencyMs || 0), 0) / trimmed.length;
      setMetrics((m) =>
        m
          ? {
              ...m,
              averageLatencyMs: Number(avg.toFixed(1)),
            }
          : m
      );

      return trimmed;
    });

    // Refresh aggregate patient/node DB counts shortly after packet commit
    loadMetrics();
  }, [loadMetrics]);

  useTelemetry(handleLiveTelemetry, true);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Title Bar */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Metrics &amp; Inference Dashboard</h2>
            {liveBadge && (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-ping" />
                {liveBadge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {metrics?.activeModelVersion || 'SeizureNet-v3.2'} Performance Analytics &amp; Real-Time Edge/Fog Cluster Load
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMetrics}
            className="px-4 py-2 bg-white border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="px-4 py-2 bg-white border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            Live Stream (Last 30 Packets)
          </button>
          <button className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-md flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export Analytics PDF
          </button>
        </div>
      </div>

      {/* KPI Cards — Live from backend & SignalR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Mean Inference Latency</span>
            <Zap className="w-4 h-4 text-teal-600" />
          </div>
          <h3 className="text-2xl font-bold text-teal-700 mt-1">
            {metrics?.averageLatencyMs != null ? `${Number(metrics.averageLatencyMs).toFixed(1)} ms` : '— ms'}
          </h3>
          <p className="text-[11px] text-teal-600 mt-1.5 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Live rolling mean ({telemetrySeries.length} packets)
          </p>
        </div>

        {(() => {
          const latestSample = telemetrySeries.length > 0 ? telemetrySeries[telemetrySeries.length - 1] : null;
          const liveProb = latestSample != null ? Number(latestSample.seizureProbabilityPercent) : null;
          const isSeizureHigh = liveProb != null && liveProb >= 70;
          return (
            <div className={`bg-white border rounded-xl p-4 shadow-sm ${isSeizureHigh ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Live Seizure Prob</span>
                <ShieldCheck className={`w-4 h-4 ${isSeizureHigh ? 'text-red-500 animate-pulse' : 'text-sky-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold mt-1 ${isSeizureHigh ? 'text-red-600 animate-pulse' : 'text-sky-700'}`}>
                {liveProb != null
                  ? `${liveProb.toFixed(1)} %`
                  : metrics?.modelSensitivityPercent != null
                    ? `${Number(metrics.modelSensitivityPercent).toFixed(1)} %`
                    : '— %'}
              </h3>
              <p className="text-[11px] text-sky-700 mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                Sensitivity: {metrics?.modelSensitivityPercent != null ? `${Number(metrics.modelSensitivityPercent).toFixed(1)}%` : '—'} ({metrics?.activeModelVersion || 'Active Model'})
              </p>
            </div>
          );
        })()}

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Critical Patients Now</span>
            <Cpu className="w-4 h-4 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            {metrics ? `${metrics.criticalCount ?? 0} / ${metrics.totalPatients ?? 0}` : '— / —'}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {metrics ? `${metrics.totalPatients ?? 0} total admitted` : 'Loading…'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Active Edge Nodes</span>
            <BatteryCharging className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">
            {metrics?.onlineNodesCount != null
              ? `${metrics.onlineNodesCount}${metrics.totalNodesCount != null ? ` / ${metrics.totalNodesCount}` : ''} Online`
              : '— Online'}
          </h3>
          <p className="text-[11px] text-amber-600 mt-1.5 font-mono">
            F1 Score: {metrics?.modelF1Score != null ? `${Number(metrics.modelF1Score).toFixed(2)}%` : '—%'}
            {metrics?.alertNodesCount ? ` · ${metrics.alertNodesCount} Alerting` : ''}
          </p>
        </div>
      </div>

      {/* Analytics Charts — Connected to DB Telemetry & Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-600" /> Real-Time Edge Inference Latency (ms) &amp; Seizure Prob (%)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetrySeries.length > 0 ? `${telemetrySeries.length} live samples` : 'Awaiting stream…'}
            </span>
          </div>
          <div className="h-64 min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
              <AreaChart data={telemetrySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="edgeLatencyMs" stroke="#0d9488" fill="#ccfbf1" name="Edge Latency (ms)" />
                <Area type="monotone" dataKey="seizureProbabilityPercent" stroke="#0ea5e9" fill="#e0f2fe" name="Seizure Prob (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600" /> Model Benchmark Convergence (Precision vs Recall)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {modelBenchmarks.length} registered models
            </span>
          </div>
          <div className="h-64 min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
              <BarChart data={modelBenchmarks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="version" stroke="#94a3b8" fontSize={11} />
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
