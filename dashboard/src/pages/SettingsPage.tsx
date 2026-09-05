import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { EEGSessionRecord } from '../types/telemetry';
import { 
  Shield, 
  Cpu, 
  BrainCircuit, 
  Send, 
  UserCheck, 
  LogOut,
  CheckCircle2
} from 'lucide-react';

interface SettingsPageProps {
  sessionRecords: EEGSessionRecord[];
  onSendAllApprovedForTraining: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  sessionRecords,
  onSendAllApprovedForTraining,
}) => {
  const { user, logout } = useAuth();
  const role = user?.role || 'ADMIN';
  const [isSendingForTraining, setIsSendingForTraining] = useState<boolean>(false);

  // Doctor-approved samples
  const approvedSamples = sessionRecords.filter((s) => s.isApprovedForTraining);
  const pendingCount = approvedSamples.filter((s) => !s.addedToTechnicianQueue).length;

  const handleDoctorSubmitToTechnician = () => {
    if (approvedSamples.length === 0) {
      alert('ℹ️ No doctor-approved EEG samples currently in your queue. Go to Clinical Records and click "Approve for Training" on a patient recording first.');
      return;
    }

    setIsSendingForTraining(true);
    setTimeout(() => {
      onSendAllApprovedForTraining();
      setIsSendingForTraining(false);
      alert(`🚀 SUCCESS! ${approvedSamples.length} Doctor-Approved EEG Telemetry Samples submitted to the Biomedical Technician Training Review Queue!`);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Title */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Settings & User Account</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active User Identity, RBAC Permissions & Clinical Training Data Submissions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Profile Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> Active User Account
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">User Name</label>
              <input
                type="text"
                value={user?.name || 'Dr. Sarah Chen'}
                readOnly
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Active RBAC Role</label>
              <input
                type="text"
                value={user?.role || 'ADMIN'}
                readOnly
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Assigned Department</label>
              <input
                type="text"
                value={user?.department || 'Clinical Neurology'}
                readOnly
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
              />
            </div>

            {/* Sign Out Button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={logout}
                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Doctor-Only: Send Data for Training Card */}
        {role === 'DOCTOR' && (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <BrainCircuit className="w-4.5 h-4.5 text-teal-600" /> Doctor-Approved EEG Training Samples
                  </h3>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-800 font-bold text-[10px] rounded-full font-mono">
                    {approvedSamples.length} Approved
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send your doctor-approved EEG recording samples to the Biomedical Technician's review queue
                </p>
              </div>

              <button
                onClick={handleDoctorSubmitToTechnician}
                disabled={isSendingForTraining || approvedSamples.length === 0}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSendingForTraining ? 'Sending data...' : 'Send Data for Training'}
              </button>
            </div>

            {/* Approved Samples List */}
            <div className="space-y-2">
              {approvedSamples.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                  No doctor-approved samples currently queued. Go to Clinical Records and click <strong>"Approve for Training"</strong>!
                </div>
              ) : (
                approvedSamples.map((sample) => (
                  <div
                    key={sample.sessionId}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs font-mono"
                  >
                    <div>
                      <span className="font-bold text-teal-700">{sample.sessionId}</span> - <span className="font-sans font-bold text-slate-900">{sample.patientName}</span>
                      <p className="text-[11px] text-slate-500 font-sans mt-0.5">{sample.classification}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full font-sans">
                      {sample.addedToTechnicianQueue ? 'Submitted to Technician' : 'Ready to Send'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
