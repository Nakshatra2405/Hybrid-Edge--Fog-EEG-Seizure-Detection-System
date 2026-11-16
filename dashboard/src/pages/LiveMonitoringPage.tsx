import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Patient } from '../types/patient';
import { TelemetryEvent } from '../types/telemetry';
import { FilterBar } from '../components/telemetry/FilterBar';
import { PatientCard } from '../components/telemetry/PatientCard';
import { AddPatientModal } from '../components/modals/AddPatientModal';
import { RequestAdmissionModal } from '../components/modals/RequestAdmissionModal';
import { getScopedPatients } from '../utils/rbacFilter';
import { Cpu, Zap, ShieldCheck, BatteryCharging, Radio } from 'lucide-react';

interface LiveMonitoringPageProps {
  patients: Patient[];
  events: TelemetryEvent[];
  searchQuery: string;
  onCallCode: (p: Patient) => void;
  onNotifyDoctor: (p: Patient) => void;
  onAddPatient: (p: Patient) => void;
  onRequestAdmission: (name: string, room: string, nurseName: string, details: string) => void;
  onDischargePatient: (id: string) => void;
  onRequestDischarge: (p: Patient) => void;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({
  patients,
  events,
  searchQuery,
  onCallCode,
  onNotifyDoctor,
  onAddPatient,
  onRequestAdmission,
  onDischargePatient,
  onRequestDischarge,
}) => {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterName, setFilterName] = useState<string>('All Patients');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);

  // Apply role scoping
  const scopedPatients = getScopedPatients(user, patients);
  let filtered = [...scopedPatients];

  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.room.toLowerCase().includes(q) ||
        p.doctor.toLowerCase().includes(q)
    );
  }

  if (filterType === 'latest') {
    filtered.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
  } else if (filterType === 'alerts') {
    filtered = filtered.filter((p) => p.status === 'Critical' || p.status === 'Monitoring');
  } else if (filterType === 'live') {
    filtered = filtered.filter((p) => p.status !== 'Discharged');
  } else if (filterType === 'discharged') {
    filtered = filtered.filter((p) => p.status === 'Discharged');
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      <FilterBar
        currentFilterName={filterName}
        onFilterSelect={(type, name) => {
          setFilterType(type);
          setFilterName(name);
        }}
        onAddPatientClick={() => setIsAddModalOpen(true)}
        onRequestAdmissionClick={() => setIsRequestModalOpen(true)}
      />

      {/* Edge On-Device Seizure Inference Architecture Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">On-Device Edge Seizure Inference Active</h3>
                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-[10px] font-bold rounded-full border border-teal-500/30 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-teal-400 animate-ping" /> LOW BANDWIDTH & BATTERY OPTIMIZED
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Raw 16-channel EEG is processed locally on wearable Edge nodes. Only lightweight inference alerts & vitals are synced to save battery.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Inference Speed</span>
              <span className="font-bold text-teal-400 text-sm flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> 4.2 ms
              </span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 text-[10px] uppercase block">Model Accuracy</span>
              <span className="font-bold text-sky-400 text-sm flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> 98.4%
              </span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 text-[10px] uppercase block">Avg Battery Life</span>
              <span className="font-bold text-emerald-400 text-sm flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> +38 hrs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-12">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-800 text-sm">No scoped patient telemetry records found</p>
            <p className="text-xs text-slate-500 mt-1">
              Active role ({user?.role}) sees patients within authorized scope.
            </p>
          </div>
        ) : (
          filtered.map((p) => (
            <PatientCard
              key={p.id}
              patient={p}
              onCallCode={onCallCode}
              onNotifyDoctor={onNotifyDoctor}
              onDischarge={onDischargePatient}
              onRequestDischarge={onRequestDischarge}
            />
          ))
        )}
      </div>

      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onAddPatient}
      />

      <RequestAdmissionModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onRequestSubmit={onRequestAdmission}
      />
    </div>
  );
};
