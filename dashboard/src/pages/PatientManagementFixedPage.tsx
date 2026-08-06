import React from 'react';
import { Patient } from '../types/patient';
import { Heart, Activity, AlertOctagon, UserCheck, ShieldCheck } from 'lucide-react';

interface PatientManagementFixedPageProps {
  patients: Patient[];
}

export const PatientManagementFixedPage: React.FC<PatientManagementFixedPageProps> = ({ patients }) => {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Patient Management (Fixed Vitals Matrix)</h2>
          <p className="text-xs text-slate-500 mt-0.5">High-Density Telemetry Matrix with Standardized Live Sensor Baselines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {patients.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                <p className="text-xs font-mono text-slate-400">ID: {p.id}</p>
              </div>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${
                p.status === 'Critical' ? 'bg-red-600 text-white animate-pulse' : 'bg-teal-100 text-teal-800'
              }`}>
                {p.status}
              </span>
            </div>

            {/* Standardized Fixed Vitals Panel */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900 text-white rounded-lg text-xs font-mono text-center">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Heart Rate</span>
                <span className="font-bold text-teal-400 text-sm">{p.vitals.heartRate} bpm</span>
              </div>
              <div className="border-x border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">SpO2 Rate</span>
                <span className="font-bold text-sky-400 text-sm">{p.vitals.spo2} %</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">EEG Amplitude</span>
                <span className="font-bold text-amber-400 text-sm">{p.vitals.eegAmplitude} µV</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>Room: <strong className="text-slate-800">{p.room}</strong> | Bed: <strong className="text-slate-800">{p.bed}</strong></p>
              <p>Physician: <span className="text-slate-800 font-medium">{p.doctor}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
