import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { EEGSessionRecord } from '../types/telemetry';
import { api } from '../services/apiClient';
import { 
  Clock, 
  Search, 
  Download, 
  Filter, 
  AlertOctagon, 
  CheckCircle2, 
  Calendar,
  Cpu,
  UserCheck,
  CheckCheck,
  BrainCircuit,
  Eye,
  X,
  Activity,
  Zap
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ClinicalRecordsPageProps {
  sessionRecords: EEGSessionRecord[];
  onToggleApproveSession: (sessionId: string) => void;
}

export const ClinicalRecordsPage: React.FC<ClinicalRecordsPageProps> = ({
  sessionRecords,
  onToggleApproveSession,
}) => {
  const { user } = useAuth();
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Waveform Viewer Modal State
  const [activeWaveformModal, setActiveWaveformModal] = useState<{
    isOpen: boolean;
    loading: boolean;
    data: any | null;
  }>({
    isOpen: false,
    loading: false,
    data: null,
  });

  const uniquePatients = Array.from(
    new Map(sessionRecords.map((rec) => [rec.patientId, rec.patientName])).entries()
  );

  const filteredRecords = sessionRecords.filter((rec) => {
    const matchesPatient = selectedPatientFilter === 'all' || rec.patientId === selectedPatientFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      rec.patientName.toLowerCase().includes(q) ||
      rec.patientId.toLowerCase().includes(q) ||
      rec.sessionId.toLowerCase().includes(q) ||
      rec.startTimestamp.toLowerCase().includes(q);

    return matchesPatient && matchesSearch;
  });

  const handleViewWaveform = async (record: EEGSessionRecord) => {
    setActiveWaveformModal({ isOpen: true, loading: true, data: null });
    try {
      const data = await api.getSessionWaveform(record.sessionId);
      setActiveWaveformModal({ isOpen: true, loading: false, data });
    } catch (err) {
      console.error(err);
      setActiveWaveformModal({ isOpen: false, loading: false, data: null });
    }
  };

  const handleExportSession = async (record: EEGSessionRecord) => {
    const fileName = `EEG_${record.patientName.replace(/\s+/g, '_')}_${record.sessionId.substring(0, 8)}.edf`;
    await api.exportSessionEdf(record.sessionId, fileName);
  };

  const chartData = activeWaveformModal.data?.waveform?.map((val: number, idx: number) => ({
    time: (idx / 173.61).toFixed(2),
    voltage: val,
  })) || [];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clinical EEG Telemetry Records &amp; Waveform Archive</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Collected EEG Recording Timestamps, Raw Waveform Inspection &amp; Doctor Validation for Model Fine-Tuning
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-lg">
          <UserCheck className="w-4 h-4 text-teal-600" />
          <span>Active Clinician: <strong className="text-slate-900">{user?.name || 'Dr. Sarah Roberts, MD'}</strong></span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-teal-600" /> Filter by Registered Patient:
          </div>
          <select
            value={selectedPatientFilter}
            onChange={(e) => setSelectedPatientFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="all">All Registered Patients ({sessionRecords.length} sessions)</option>
            {uniquePatients.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by session ID, patient name, date..."
            className="pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none w-72"
          />
        </div>
      </div>

      {/* Timestamp Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-4">Session ID</th>
              <th className="p-4">Patient Name &amp; ID</th>
              <th className="p-4">Start Timestamp</th>
              <th className="p-4">End Timestamp</th>
              <th className="p-4">Duration</th>
              <th className="p-4">Edge Device</th>
              <th className="p-4">Max Seizure Prob</th>
              <th className="p-4">Classification</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                  No EEG recording timestamps found for the selected filter.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.sessionId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-mono font-bold text-teal-700">{rec.sessionId.substring(0, 8)}...</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{rec.patientName}</p>
                    <p className="text-[11px] font-mono text-slate-400">{rec.patientId.substring(0, 8)}...</p>
                  </td>
                  <td className="p-4 font-mono text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {rec.startTimestamp}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-700">{rec.endTimestamp}</td>
                  <td className="p-4 text-slate-800 font-medium">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-600" /> {rec.duration}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-600">
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" /> {rec.edgeNode}
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold">
                    <span className={rec.maxSeizureProbability > 0.7 ? 'text-red-600 font-extrabold' : 'text-emerald-700'}>
                      {(rec.maxSeizureProbability * 100).toFixed(0)} %
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase border inline-flex items-center gap-1 ${
                        rec.classification.includes('Ictal') || rec.classification.includes('Seizure')
                          ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                          : rec.classification.includes('Pre')
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}
                    >
                      {(rec.classification.includes('Ictal') || rec.classification.includes('Seizure')) && <AlertOctagon className="w-3 h-3 text-red-600" />}
                      {rec.classification.includes('Normal') && <CheckCircle2 className="w-3 h-3 text-teal-600" />}
                      {rec.classification}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* View Raw Waveform */}
                      <button
                        onClick={() => handleViewWaveform(rec)}
                        className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                        title="View raw 178-point EEG epoch trace"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-600" /> View Waveform
                      </button>

                      {/* Approve for Model Training */}
                      <button
                        onClick={() => onToggleApproveSession(rec.sessionId)}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all inline-flex items-center gap-1 border shadow-2xs ${
                          rec.isApprovedForTraining
                            ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                        }`}
                        title="Mark EEG session as doctor-validated ground truth"
                      >
                        {rec.isApprovedForTraining ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" /> Approved
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="w-3.5 h-3.5 text-teal-600" /> Approve
                          </>
                        )}
                      </button>

                      {/* Export EDF+ Action */}
                      <button
                        onClick={() => handleExportSession(rec)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                        title="Download official EDF+ ASCII EEG time-series file"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" /> EDF+
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Waveform Inspection Modal */}
      {activeWaveformModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    Patient EEG Epoch Waveform: {activeWaveformModal.data?.patientName || 'Loading…'}
                  </h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border ${
                    activeWaveformModal.data?.maxSeizureProbability > 0.70
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-teal-50 text-teal-700 border-teal-200'
                  }`}>
                    {activeWaveformModal.data?.classification || 'Diagnostic Session'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  178-Sample Standard Time-Series Window (Sampling Rate: 173.61 Hz) • Wearable Edge Node: {activeWaveformModal.data?.edgeNode || 'EEG-Nano-BLE-01'}
                </p>
              </div>
              <button
                onClick={() => setActiveWaveformModal({ isOpen: false, loading: false, data: null })}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4">
              {activeWaveformModal.loading ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                  Loading waveform telemetry...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px]">PEAK SEIZURE PROB</span>
                      <strong className={`text-sm ${activeWaveformModal.data?.maxSeizureProbability > 0.7 ? 'text-red-600' : 'text-teal-700'}`}>
                        {((activeWaveformModal.data?.maxSeizureProbability || 0) * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">RECORDED VOLTAGE RANGE</span>
                      <strong className="text-sm text-slate-800">
                        -320.0 µV to +480.0 µV
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DURATION / SAMPLING</span>
                      <strong className="text-sm text-sky-700">
                        1.02 sec (178 samples)
                      </strong>
                    </div>
                  </div>

                  {/* EEG Oscilloscope View */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                    <div className="flex items-center justify-between pb-2 text-[10px] font-mono text-teal-400 border-b border-slate-800 mb-2">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" /> Channel FP1-F3 (Filtered 0.5 - 70 Hz)
                      </span>
                      <span>Scale: 50 µV/div • Sweep: 100 ms/div</span>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="time" stroke="#64748b" fontSize={10} unit="s" />
                          <YAxis stroke="#64748b" fontSize={10} unit="µV" domain={[-500, 500]} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '11px' }}
                            formatter={(val: any) => [`${val} µV`, 'Voltage']}
                          />
                          <Line
                            type="monotone"
                            dataKey="voltage"
                            stroke={activeWaveformModal.data?.maxSeizureProbability > 0.7 ? '#ef4444' : '#14b8a6'}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-mono">
                Session ID: {activeWaveformModal.data?.sessionId}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveWaveformModal({ isOpen: false, loading: false, data: null })}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeWaveformModal.data) {
                      api.exportSessionEdf(
                        activeWaveformModal.data.sessionId,
                        `EEG_${activeWaveformModal.data.patientName.replace(/\s+/g, '_')}.edf`
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-md flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Export EDF+ File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
