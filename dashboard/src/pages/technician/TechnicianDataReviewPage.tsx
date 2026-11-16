import React from 'react';
import { EEGSessionRecord } from '../../types/telemetry';
import { CheckSquare, UserCheck, Cpu, Clock, CheckCircle2, ShieldCheck, Filter } from 'lucide-react';

interface TechnicianDataReviewPageProps {
  sessionRecords: EEGSessionRecord[];
  onAddToTrainingPipeline: (sessionId: string) => void;
}

export const TechnicianDataReviewPage: React.FC<TechnicianDataReviewPageProps> = ({
  sessionRecords,
  onAddToTrainingPipeline,
}) => {
  // Only display Doctor-approved sessions, and ANONYMIZE all patient PII!
  const doctorApprovedSamples = sessionRecords.filter((s) => s.isApprovedForTraining);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Title Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Doctor-Submitted Telemetry Data Review</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Anonymized EEG Telemetry Slices Verified by Attending Physicians (HIPAA PII Stripped)
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>PHI Privacy Mode: <strong className="text-slate-900">ANONYMIZED GROUND TRUTH</strong></span>
        </div>
      </div>

      {/* Doctor-Approved Anonymous Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-700">
            Available Doctor-Approved Samples ({doctorApprovedSamples.length})
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            Ready for Technician Dataset Quality Inspection
          </span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-4">Session Hash ID</th>
              <th className="p-4">Verifying Physician</th>
              <th className="p-4">Recording Timestamp</th>
              <th className="p-4">Duration</th>
              <th className="p-4">Edge Device Node</th>
              <th className="p-4">Verified Classification</th>
              <th className="p-4">Pipeline Status</th>
              <th className="p-4 text-right">Technician Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-mono">
            {doctorApprovedSamples.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500 font-sans">
                  No doctor-approved samples currently in queue.
                </td>
              </tr>
            ) : (
              doctorApprovedSamples.map((sample) => (
                <tr key={sample.sessionId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-teal-700">{sample.sessionId}</td>
                  <td className="p-4 text-slate-800 font-sans font-medium flex items-center gap-1.5 pt-5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" /> {sample.doctorName}
                  </td>
                  <td className="p-4 text-slate-600">{sample.startTimestamp}</td>
                  <td className="p-4 text-slate-700">{sample.duration}</td>
                  <td className="p-4 text-slate-600 flex items-center gap-1 pt-5">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" /> {sample.edgeNode}
                  </td>
                  <td className="p-4 font-sans">
                    <span className="px-2.5 py-1 text-[10px] rounded-full font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                      {sample.classification}
                    </span>
                  </td>
                  <td className="p-4 font-sans">
                    <span
                      className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase border ${
                        sample.addedToTechnicianQueue
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {sample.addedToTechnicianQueue ? 'Queued for Training' : 'Pending Technician Review'}
                    </span>
                  </td>
                  <td className="p-4 text-right font-sans">
                    <button
                      onClick={() => onAddToTrainingPipeline(sample.sessionId)}
                      disabled={sample.addedToTechnicianQueue}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 border ${
                        sample.addedToTechnicianQueue
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-teal-600 text-white hover:bg-teal-700 border-teal-700 shadow-sm'
                      }`}
                    >
                      {sample.addedToTechnicianQueue ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Added
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" /> Add for Training
                        </>
                      )}
                    </button>
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
