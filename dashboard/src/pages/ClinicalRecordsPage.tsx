import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { EEGSessionRecord } from '../types/telemetry';
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
  BrainCircuit
} from 'lucide-react';

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

  const handleExportSession = (record: EEGSessionRecord) => {
    alert(`📥 Downloading EEG Session Record (${record.sessionId})\nPatient: ${record.patientName}\nStart: ${record.startTimestamp}\nFormat: EDF+ Telemetry File & Metadata JSON`);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clinical EEG Telemetry Records & Timestamp History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Collected EEG Recording Timestamps & Doctor Validation for Model Fine-Tuning Datasets
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-lg">
          <UserCheck className="w-4 h-4 text-teal-600" />
          <span>Attending Physician: <strong className="text-slate-900">{user?.name || 'Dr. Sarah Roberts, MD'}</strong></span>
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
              <th className="p-4">Patient Name & ID</th>
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
                  <td className="p-4 font-mono font-bold text-teal-700">{rec.sessionId}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{rec.patientName}</p>
                    <p className="text-[11px] font-mono text-slate-400">{rec.patientId}</p>
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
                        rec.classification === 'Ictal Seizure Event'
                          ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                          : rec.classification === 'Pre-Ictal Warning'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}
                    >
                      {rec.classification === 'Ictal Seizure Event' && <AlertOctagon className="w-3 h-3 text-red-600" />}
                      {rec.classification === 'Normal Baseline' && <CheckCircle2 className="w-3 h-3 text-teal-600" />}
                      {rec.classification}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Approve for Model Training Action */}
                      <button
                        onClick={() => onToggleApproveSession(rec.sessionId)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all inline-flex items-center gap-1 border shadow-xs ${
                          rec.isApprovedForTraining
                            ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                        }`}
                        title="Mark EEG session as doctor-validated ground truth for model fine-tuning"
                      >
                        {rec.isApprovedForTraining ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" /> Approved for Training
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="w-3.5 h-3.5 text-teal-600" /> Approve for Training
                          </>
                        )}
                      </button>

                      {/* Export EDF+ Action */}
                      <button
                        onClick={() => handleExportSession(rec)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> Export EDF+
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
