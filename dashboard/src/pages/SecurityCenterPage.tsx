import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Radio, 
  Activity, 
  Server,
  Lock,
  ArrowUpDown,
  Cpu,
  Layers,
  Sliders,
  Eye,
  X,
  Database,
  Terminal,
  Zap,
  Check,
  AlertOctagon,
  Clock
} from 'lucide-react';
import { api } from '../services/apiClient';
import { SecurityIncident, SecuritySummary, SecurityConfigSummary } from '../types/security';

const ALERTS_HUB_URL = 'http://localhost:5000/hubs/alerts';

export const SecurityCenterPage: React.FC = () => {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [summary, setSummary] = useState<SecuritySummary>({
    totalIncidents: 0,
    activeIncidents: 0,
    unknownDevicesIntercepted: 0,
    replaysBlocked: 0,
    tamperAttemptsDetected: 0,
    floodsMitigated: 0,
    physicalIncidents: 0,
    simulatorIncidents: 0,
    untrustedIncidents: 0,
  });
  const [config, setConfig] = useState<SecurityConfigSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [activeFailingStage, setActiveFailingStage] = useState<string | null>(null);
  const [recentTrafficEvent, setRecentTrafficEvent] = useState<{
    status: 'VERIFIED' | 'REJECTED';
    incidentType?: string;
    timestamp: string;
  } | null>(null);

  const hubConnectionRef = useRef<signalR.HubConnection | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [incidentList, summaryData, configData] = await Promise.all([
        api.getSecurityIncidents(),
        api.getSecuritySummary(),
        api.getSecurityConfig(),
      ]);

      setIncidents(incidentList || []);
      if (summaryData) {
        setSummary(summaryData);
      }
      if (configData) {
        setConfig(configData);
      }
    } catch (err) {
      console.error('Failed to load security command center data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect to existing AlertsHub for live security alerts
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(ALERTS_HUB_URL, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('ReceiveSecurityAlert', (alert: any) => {
      const newIncident: SecurityIncident = {
        id: alert.id,
        incidentType: alert.incidentType,
        severity: alert.severity,
        deviceId: alert.deviceId,
        sourceIp: alert.sourceIp,
        sequenceNumberReceived: alert.sequenceNumberReceived,
        expectedMinSequence: alert.expectedMinSequence,
        timestampReceived: alert.timestampReceived,
        detailMessage: alert.detailMessage,
        isResolved: false,
        sourceClassification: alert.sourceClassification || 'UNTRUSTED',
      };

      setIncidents((prev) => [newIncident, ...prev]);
      setSummary((prev) => ({
        ...prev,
        totalIncidents: prev.totalIncidents + 1,
        activeIncidents: prev.activeIncidents + 1,
        unknownDevicesIntercepted: alert.incidentType === 'UNKNOWN_DEVICE' ? prev.unknownDevicesIntercepted + 1 : prev.unknownDevicesIntercepted,
        replaysBlocked: alert.incidentType === 'REPLAY_ATTACK' ? prev.replaysBlocked + 1 : prev.replaysBlocked,
        tamperAttemptsDetected: alert.incidentType === 'INVALID_SIGNATURE' ? prev.tamperAttemptsDetected + 1 : prev.tamperAttemptsDetected,
        floodsMitigated: alert.incidentType === 'TRAFFIC_FLOOD' ? prev.floodsMitigated + 1 : prev.floodsMitigated,
        untrustedIncidents: alert.sourceClassification === 'UNTRUSTED' ? (prev.untrustedIncidents || 0) + 1 : prev.untrustedIncidents,
        simulatorIncidents: alert.sourceClassification === 'SIMULATOR' ? (prev.simulatorIncidents || 0) + 1 : prev.simulatorIncidents,
        physicalIncidents: alert.sourceClassification === 'PHYSICAL' ? (prev.physicalIncidents || 0) + 1 : prev.physicalIncidents,
      }));

      // Highlight failing stage on pipeline
      let stage = 'STAGE 1: RATE LIMIT';
      if (alert.incidentType === 'UNKNOWN_DEVICE') stage = 'STAGE 2: DEVICE REGISTRY';
      if (alert.incidentType === 'INVALID_SIGNATURE') stage = 'STAGE 3: HMAC-SHA256';
      if (alert.incidentType === 'INVALID_TIMESTAMP') stage = 'STAGE 4: CLOCK FRESHNESS';
      if (alert.incidentType === 'REPLAY_ATTACK') stage = 'STAGE 5: SEQUENCE REPLAY';

      setActiveFailingStage(stage);
      setRecentTrafficEvent({
        status: 'REJECTED',
        incidentType: alert.incidentType,
        timestamp: new Date().toLocaleTimeString(),
      });

      const timer = setTimeout(() => {
        setActiveFailingStage(null);
      }, 5000);

      return () => clearTimeout(timer);
    });

    connection
      .start()
      .then(() => {
        setIsLiveConnected(true);
        hubConnectionRef.current = connection;
      })
      .catch((err) => {
        console.warn('[SignalR AlertsHub] Connection error:', err);
        setIsLiveConnected(false);
      });

    return () => {
      if (hubConnectionRef.current) {
        hubConnectionRef.current.stop();
        hubConnectionRef.current = null;
      }
    };
  }, []);

  const handleResolve = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setResolvingId(id);
    try {
      const ok = await api.resolveSecurityIncident(id);
      if (ok) {
        setIncidents((prev) =>
          prev.map((inc) => (inc.id === id ? { ...inc, isResolved: true, resolvedAt: new Date().toISOString() } : inc))
        );
        setSummary((prev) => ({
          ...prev,
          activeIncidents: Math.max(0, prev.activeIncidents - 1),
        }));
        if (selectedIncident?.id === id) {
          setSelectedIncident((prev) => prev ? { ...prev, isResolved: true, resolvedAt: new Date().toISOString() } : null);
        }
      }
    } finally {
      setResolvingId(null);
    }
  };

  const getAttackTypeBadge = (type: string) => {
    switch (type) {
      case 'UNKNOWN_DEVICE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/50">UNKNOWN DEVICE</span>;
      case 'REPLAY_ATTACK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-700/50">REPLAY ATTACK</span>;
      case 'INVALID_SIGNATURE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-700/50">PAYLOAD TAMPER</span>;
      case 'TRAFFIC_FLOOD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/80 text-sky-300 border border-sky-700/50">TRAFFIC FLOOD</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">{type}</span>;
    }
  };

  const getProvenanceBadge = (prov?: string) => {
    switch (prov) {
      case 'PHYSICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950/80 text-emerald-300 border border-emerald-600/60">PHYSICAL BLE</span>;
      case 'SIMULATOR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-950/80 text-cyan-300 border border-cyan-600/60">SIMULATOR</span>;
      case 'UNTRUSTED':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-950/80 text-rose-300 border border-rose-600/60">UNTRUSTED</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'CRITICAL') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white shadow-sm shadow-red-900 animate-pulse">CRITICAL</span>;
    }
    if (severity === 'HIGH') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-600 text-white">HIGH</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">WARNING</span>;
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-200 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ========================================================================= */}
      {/* HEADER: COMMAND CENTER                                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-950/50">
            <ShieldAlert className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                NeuroShield™ Command Center
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full">
                ADMIN PRIVILEGED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Synchronous Rule-Based Medical IDS · Burst-Tolerant Rate Limiting · Cryptographic Ingest Defense
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* SignalR Connection Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 shadow-inner text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-ping' : 'bg-slate-600'}`} />
            <span className="text-slate-400">SignalR Alerts:</span>
            <strong className={isLiveConnected ? 'text-emerald-400' : 'text-slate-500'}>
              {isLiveConnected ? 'ACTIVE' : 'OFFLINE'}
            </strong>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 hover:text-white shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: SECURITY OVERVIEW CARDS                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Incidents */}
        <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Threats</span>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{summary.totalIncidents}</span>
            <span className="text-[10px] text-slate-500">logged</span>
          </div>
        </div>

        {/* Active / Unresolved */}
        <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Threats</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">{summary.activeIncidents}</span>
            <span className="text-[10px] text-rose-500/80">unresolved</span>
          </div>
        </div>

        {/* Unknown Devices */}
        <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Unknown Devices</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-300">{summary.unknownDevicesIntercepted}</span>
            <p className="text-[9px] text-slate-500 mt-0.5">Unregistered MAC/ID</p>
          </div>
        </div>

        {/* Replay Blocked */}
        <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Replay Blocked</span>
            <ArrowUpDown className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-300">{summary.replaysBlocked}</span>
            <p className="text-[9px] text-slate-500 mt-0.5">Sequence Monotonicity</p>
          </div>
        </div>

        {/* Payload Tamper */}
        <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-red-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">HMAC Tamper</span>
            <Lock className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-400">{summary.tamperAttemptsDetected}</span>
            <p className="text-[9px] text-slate-500 mt-0.5">SHA256 Mismatches</p>
          </div>
        </div>

        {/* Floods Mitigated */}
        <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">DoS Floods</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-sky-300">{summary.floodsMitigated}</span>
            <p className="text-[9px] text-slate-500 mt-0.5">Token Bucket Rate Limits</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: INTERACTIVE ARCHITECTURE PIPELINE VISUALIZATION                */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-300">
              Real-Time Telemetry Pipeline & Synchronous IDS Ingestion Defense
            </h2>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Verified Telemetry (200 OK)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Synchronously Rejected (401/429)
            </span>
          </div>
        </div>

        {/* Pipeline Diagram (SVG / Flex Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-stretch relative my-2">
          {/* Node 1: Edge Device */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Source Device</span>
                <Cpu className="w-4 h-4 text-teal-400" />
              </div>
              <h3 className="text-xs font-bold text-white mt-1">EEG Edge Classifier</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Arduino Nano 33 BLE / Synth</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-900 flex flex-wrap gap-1.5">
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">Node-01 (SIMULATED)</span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">Node-02 (PHYSICAL)</span>
            </div>
          </div>

          {/* Node 2: BLE Gateway */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Fog Layer</span>
                <Radio className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-xs font-bold text-white mt-1">Python BLE Gateway</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">BLE Rx & Raw Byte HMAC Signing</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-900">
              <p className="text-[9px] font-mono text-slate-500">Signs raw body bytes via HMAC-SHA256</p>
            </div>
          </div>

          {/* Node 3: NEUROSHIELD IDS (HIGHLIGHTED STAGE BOX) */}
          <div className={`p-3.5 rounded-xl bg-slate-950 border transition-all ${
            activeFailingStage ? 'border-rose-500 shadow-lg shadow-rose-950/60 ring-1 ring-rose-500' : 'border-teal-500/50 shadow-lg shadow-teal-950/30'
          } flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-300">Synchronous IDS</span>
                <ShieldAlert className={`w-4 h-4 ${activeFailingStage ? 'text-rose-400 animate-pulse' : 'text-teal-400'}`} />
              </div>
              <h3 className="text-xs font-bold text-white mt-1">NeuroShield IDS Engine</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">5 Synchronous Rule Checkpoints</p>
            </div>

            {/* Stages checklist */}
            <div className="mt-2.5 space-y-1 text-[9px] font-mono">
              {[
                { name: '1. Rate Limiting (Token Bucket)', match: 'STAGE 1: RATE LIMIT' },
                { name: '2. Device Registry Lookup', match: 'STAGE 2: DEVICE REGISTRY' },
                { name: '3. Raw-Body HMAC-SHA256', match: 'STAGE 3: HMAC-SHA256' },
                { name: '4. Timestamp Freshness (60s)', match: 'STAGE 4: CLOCK FRESHNESS' },
                { name: '5. Sequence Monotonicity', match: 'STAGE 5: SEQUENCE REPLAY' },
              ].map((s, idx) => {
                const isFailing = activeFailingStage === s.match;
                return (
                  <div
                    key={idx}
                    className={`px-1.5 py-0.5 rounded flex items-center justify-between transition-colors ${
                      isFailing ? 'bg-rose-900/70 text-rose-200 font-bold border border-rose-500 animate-pulse' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{s.name}</span>
                    {isFailing ? <X className="w-3 h-3 text-rose-300" /> : <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Node 4: ASP.NET Core Backend */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Clinical Fog</span>
                <Server className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-xs font-bold text-white mt-1">ASP.NET Core 8 WebAPI</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Atomic Commit & Telemetry Broadcast</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-900">
              <p className="text-[9px] font-mono text-emerald-400">Verified: Updates Patient Live Vitals</p>
            </div>
          </div>

          {/* Node 5: Storage & SignalR */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Audit & Broadcast</span>
                <Database className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-xs font-bold text-white mt-1">PostgreSQL & SignalR</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Isolated Security Incident Log</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-900">
              <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-900 text-slate-300 border border-slate-800">
                Zero Patient PII · Zero Raw EEG
              </span>
            </div>
          </div>
        </div>

        {/* Live Traffic Event Banner */}
        {recentTrafficEvent && (
          <div className="mt-3 py-1.5 px-3 rounded-lg bg-rose-950/60 border border-rose-800/80 flex items-center justify-between text-xs font-mono animate-fadeIn">
            <span className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <strong>INTERCEPTED THREAT:</strong> {recentTrafficEvent.incidentType} rejected synchronously at {recentTrafficEvent.timestamp}. Clinical database remained untouched.
            </span>
            <span className="text-[10px] text-rose-400 uppercase font-bold">Blocked 401/429</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION C & D: RATE LIMITING CONFIG & TRAFFIC ANALYTICS                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SECTION D: Rate Limiting Token Bucket Configuration */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Sensible Token-Bucket Rate Limiter Configuration
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-teal-300 rounded border border-slate-700">
                Burst-Tolerant
              </span>
            </div>

            {/* Prototype Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[9px] uppercase tracking-wider text-slate-400">Device Burst</span>
                <p className="text-sm font-bold text-white mt-0.5">{config?.defaultBurstCapacity ?? 6.0} tokens</p>
                <span className="text-[8px] text-slate-500">Max burst allowance</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[9px] uppercase tracking-wider text-slate-400">Device Refill</span>
                <p className="text-sm font-bold text-teal-300 mt-0.5">{config?.defaultRefillRate ?? 3.0} / sec</p>
                <span className="text-[8px] text-slate-500">Replenish rate</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[9px] uppercase tracking-wider text-slate-400">IP DoS Bucket</span>
                <p className="text-sm font-bold text-sky-300 mt-0.5">{config?.ipBurstCapacity ?? 20.0} tokens</p>
                <span className="text-[8px] text-slate-500">Refill {config?.ipRefillRate ?? 10.0}/s</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[9px] uppercase tracking-wider text-slate-400">Alert Strike</span>
                <p className="text-sm font-bold text-amber-300 mt-0.5">{config?.sustainedViolationThreshold ?? 3} strikes</p>
                <span className="text-[8px] text-slate-500">Sustained flood trigger</span>
              </div>
            </div>

            {/* Registered Device Profiles Table */}
            <div className="mt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Provisioned Clinical Device Profiles
              </span>
              <div className="space-y-1.5">
                {(config?.registeredProfiles || [
                  { deviceId: 'Node-01', burstCapacity: 6.0, refillRatePerSecond: 3.0, classification: 'SIMULATOR' },
                  { deviceId: 'Node-02', burstCapacity: 6.0, refillRatePerSecond: 3.0, classification: 'PHYSICAL' },
                ]).map((p) => (
                  <div key={p.deviceId} className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <strong className="text-white">{p.deviceId}</strong>
                      {getProvenanceBadge(p.classification)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Cap: <span className="text-teal-300 font-bold">{p.burstCapacity}</span> | Refill: <span className="text-teal-300 font-bold">{p.refillRatePerSecond}/s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prototype Demo Honest Disclaimer */}
          <div className="mt-4 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[10px] text-amber-300/90 leading-relaxed font-sans">
            <strong>Prototype Demo Configuration:</strong> Rate limit thresholds and refill rates are configured with conservative prototype values for laboratory evaluation. In dense clinical ICU deployments, refill rates and burst capacities are tuned according to multi-channel montage transmission density.
          </div>
        </div>

        {/* SECTION C: Provenance Breakdown & Threat Analytics */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Data Provenance & Threat Categorization
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                Audited Sources
              </span>
            </div>

            {/* Provenance Distribution Cards */}
            <div className="grid grid-cols-3 gap-2.5 my-3.5">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[9px] uppercase font-bold text-emerald-400 block">Physical Devices</span>
                <p className="text-xl font-black text-white mt-1">{summary.physicalIncidents ?? 0}</p>
                <span className="text-[8px] text-slate-500">Node-02 (Hardware)</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[9px] uppercase font-bold text-cyan-400 block">Simulators</span>
                <p className="text-xl font-black text-white mt-1">{summary.simulatorIncidents ?? 0}</p>
                <span className="text-[8px] text-slate-500">Node-01 (Simulated)</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[9px] uppercase font-bold text-rose-400 block">Untrusted / Rogue</span>
                <p className="text-xl font-black text-rose-400 mt-1">{summary.untrustedIncidents ?? summary.unknownDevicesIntercepted}</p>
                <span className="text-[8px] text-slate-500">Rogue Packets Intercepted</span>
              </div>
            </div>

            {/* Attack Share Progress Bars */}
            <div className="space-y-2 mt-4 text-xs font-mono">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Unknown Devices</span>
                  <span className="text-amber-400 font-bold">{summary.unknownDevicesIntercepted}</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (summary.unknownDevicesIntercepted / Math.max(1, summary.totalIncidents)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Replay Injections</span>
                  <span className="text-purple-400 font-bold">{summary.replaysBlocked}</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (summary.replaysBlocked / Math.max(1, summary.totalIncidents)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Payload Tampering (HMAC)</span>
                  <span className="text-red-400 font-bold">{summary.tamperAttemptsDetected}</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (summary.tamperAttemptsDetected / Math.max(1, summary.totalIncidents)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">DoS Traffic Flooding</span>
                  <span className="text-sky-400 font-bold">{summary.floodsMitigated}</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (summary.floodsMitigated / Math.max(1, summary.totalIncidents)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between font-mono">
            <span>Clock Freshness Window: <strong className="text-white">{config?.timestampSkewSeconds ?? 60}s</strong></span>
            <span>Auth Mode: <strong className="text-teal-400">HMAC-SHA256</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION E: LIVE SECURITY INCIDENTS TABLE & PACKET INSPECTOR               */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-teal-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Live Security Incidents (PostgreSQL Audit Log)
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">Click row to inspect packet</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-rose-400 font-bold">{summary.activeIncidents} Active</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{summary.totalIncidents} Total Recorded</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Attack Category</th>
                <th className="px-4 py-3">Provenance</th>
                <th className="px-4 py-3">Device ID</th>
                <th className="px-4 py-3">Client IP</th>
                <th className="px-4 py-3">Sequence (Recv / Min)</th>
                <th className="px-4 py-3">Technical Incident Details</th>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-14 text-slate-500 font-sans">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-70" />
                    No security incidents recorded. NeuroShield IDS operating with zero active intrusions.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`cursor-pointer hover:bg-slate-800/50 transition-colors ${
                      !inc.isResolved ? 'bg-rose-950/10' : 'opacity-60'
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getSeverityBadge(inc.severity)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getAttackTypeBadge(inc.incidentType)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getProvenanceBadge(inc.sourceClassification)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-white">
                      {inc.deviceId}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                      {inc.sourceIp || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                      {inc.sequenceNumberReceived ?? '—'}
                      {inc.expectedMinSequence ? ` / min ${inc.expectedMinSequence}` : ''}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-300 max-w-xs truncate" title={inc.detailMessage}>
                      {inc.detailMessage}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-[11px]">
                      {new Date(inc.timestampReceived).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      {inc.isResolved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedIncident(inc)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Inspect Packet"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={resolvingId === inc.id}
                            onClick={(e) => handleResolve(inc.id, e)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold rounded text-[10px] transition-colors disabled:opacity-50 border border-slate-700"
                          >
                            {resolvingId === inc.id ? 'Saving...' : 'Resolve'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PACKET INSPECTION SLIDE-OVER / MODAL                                      */}
      {/* ========================================================================= */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Packet Security Inspection
                    {getSeverityBadge(selectedIncident.severity)}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Incident ID: {selectedIncident.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Technical Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase">Attack Classification</span>
                  <div className="mt-1">{getAttackTypeBadge(selectedIncident.incidentType)}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase">Data Provenance</span>
                  <div className="mt-1">{getProvenanceBadge(selectedIncident.sourceClassification)}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase">Device Identifier</span>
                  <p className="text-sm font-bold text-white mt-1">{selectedIncident.deviceId}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase">Client Source IP</span>
                  <p className="text-sm font-bold text-slate-300 mt-1">{selectedIncident.sourceIp || '127.0.0.1'}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase">Sequence Received</span>
                  <p className="text-sm font-bold text-amber-300 mt-1">{selectedIncident.sequenceNumberReceived ?? 'None'}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase">Expected Min Sequence</span>
                  <p className="text-sm font-bold text-emerald-400 mt-1">{selectedIncident.expectedMinSequence ?? 'N/A'}</p>
                </div>
              </div>

              {/* Technical Detail Message */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">IDS Enforcement Log</span>
                <p className="text-rose-300 leading-relaxed">{selectedIncident.detailMessage}</p>
              </div>

              {/* Ingestion Fate / Pipeline Outcome */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Synchronous IDS Outcome</span>
                <p className="text-slate-300">
                  Packet rejected with HTTP status code before reaching clinical database tables. Patient live vitals and seizure classification state were NOT modified.
                </p>
              </div>

              {/* Privacy & Safety Guarantee */}
              <div className="p-3 rounded-lg bg-teal-950/30 border border-teal-800/40 text-[11px] text-teal-300 font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span>
                  <strong>Clinical Data Protection:</strong> Zero patient PII, zero raw EEG samples, and zero cryptographic device secrets are stored in security logs.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Timestamp: {new Date(selectedIncident.timestampReceived).toUTCString()}
              </span>
              <div className="flex items-center gap-2">
                {!selectedIncident.isResolved && (
                  <button
                    disabled={resolvingId === selectedIncident.id}
                    onClick={() => handleResolve(selectedIncident.id)}
                    className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    {resolvingId === selectedIncident.id ? 'Resolving...' : 'Resolve Incident'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityCenterPage;
