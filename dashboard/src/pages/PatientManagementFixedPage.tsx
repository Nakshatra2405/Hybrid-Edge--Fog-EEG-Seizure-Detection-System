import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Patient } from '../types/patient';
import { getScopedPatients } from '../utils/rbacFilter';

interface PatientManagementFixedPageProps {
  patients: Patient[];
}

export const PatientManagementFixedPage: React.FC<PatientManagementFixedPageProps> = ({ patients }) => {
  const { user } = useAuth();
  const scopedPatients = getScopedPatients(user, patients);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Patient Management (Edge Seizure Telemetry Matrix)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            High-Density Matrix for Edge AI Inference Outputs & Wearable Hardware Health ({user?.role} Scope)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {scopedPatients.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-bold text-slate-500">
            No scoped patient vitals matrix records found for active role ({user?.role}).
          </div>
        ) : (
          scopedPatients.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                  <p className="text-xs font-mono text-slate-400">ID: {p.id}</p>
                </div>
                <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase ${
                  p.status === 'Critical' ? 'bg-red-600 text-white animate-pulse' : 'bg-teal-100 text-teal-800'
                }`}>
                  {p.status}
                </span>
              </div>

              {/* Edge AI Seizure Telemetry Matrix Panel */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 text-white rounded-lg text-xs font-mono text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Seizure Prob</span>
                  <span className={`font-bold text-sm ${p.vitals.seizureProbability > 0.7 ? 'text-red-400 font-extrabold' : 'text-emerald-400'}`}>
                    {(p.vitals.seizureProbability * 100).toFixed(0)} %
                  </span>
                </div>
                <div className="border-x border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Edge Latency</span>
                  <span className="font-bold text-teal-400 text-sm">4.2 ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Battery Reserve</span>
                  <span className={`font-bold text-sm ${p.battery === '0%' ? 'text-red-400' : 'text-sky-300'}`}>{p.battery}</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>Room: <strong className="text-slate-800">{p.room}</strong> | Node: <span className="font-mono text-teal-700 font-bold">{p.node}</span></p>
                <p>Physician: <span className="text-slate-800 font-medium">{p.doctor}</span></p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
