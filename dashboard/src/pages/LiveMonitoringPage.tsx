import React, { useState } from 'react';
import { Patient } from '../types/patient';
import { TelemetryEvent } from '../types/telemetry';
import { FilterBar } from '../components/telemetry/FilterBar';
import { PatientCard } from '../components/telemetry/PatientCard';
import { EventFeed } from '../components/telemetry/EventFeed';
import { LiveEEGChart } from '../components/telemetry/LiveEEGChart';
import { AddPatientModal } from '../components/modals/AddPatientModal';

interface LiveMonitoringPageProps {
  patients: Patient[];
  events: TelemetryEvent[];
  searchQuery: string;
  onCallCode: (p: Patient) => void;
  onNotifyDoctor: (p: Patient) => void;
  onAddPatient: (p: Patient) => void;
  onDischargePatient: (id: string) => void;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({
  patients,
  events,
  searchQuery,
  onCallCode,
  onNotifyDoctor,
  onAddPatient,
  onDischargePatient,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterName, setFilterName] = useState<string>('All Patients');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  let filtered = [...patients];

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
    <div className="p-6 flex gap-6 h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-1 space-y-6">
        <FilterBar
          currentFilterName={filterName}
          onFilterSelect={(type, name) => {
            setFilterType(type);
            setFilterName(name);
          }}
          onAddPatientClick={() => setIsAddModalOpen(true)}
        />

        {/* Live EEG Waveform Visualization Panel */}
        <LiveEEGChart />

        {/* Patient Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 pb-12">
          {filtered.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="font-bold text-slate-800 text-sm">No matching patient telemetry records found</p>
              <p className="text-xs text-slate-500 mt-1">Try selecting a different filter or search query.</p>
            </div>
          ) : (
            filtered.map((p) => (
              <PatientCard
                key={p.id}
                patient={p}
                onCallCode={onCallCode}
                onNotifyDoctor={onNotifyDoctor}
                onDischarge={onDischargePatient}
              />
            ))
          )}
        </div>
      </div>

      <EventFeed events={events} />

      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onAddPatient}
      />
    </div>
  );
};
