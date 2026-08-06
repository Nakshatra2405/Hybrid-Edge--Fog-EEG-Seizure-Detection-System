import React, { useState } from 'react';
import { Patient } from '../types/patient';
import { useRBAC } from '../context/RBACContext';
import { Users, Plus, Search, UserCheck, Stethoscope, MapPin, UserX, ShieldAlert } from 'lucide-react';
import { AddPatientModal } from '../components/modals/AddPatientModal';

interface PatientManagementPageProps {
  patients: Patient[];
  onAddPatient: (p: Patient) => void;
  onDischargePatient: (id: string) => void;
}

export const PatientManagementPage: React.FC<PatientManagementPageProps> = ({
  patients,
  onAddPatient,
  onDischargePatient,
}) => {
  const { hasRole } = useRBAC();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.room.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Patient Census & Ward Roster</h2>
          <p className="text-xs text-slate-500 mt-0.5">Neurological Ward Patient Directory & Telemetry Node Assignments</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter roster..."
              className="pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none w-64 shadow-sm"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Admit Patient
          </button>
        </div>
      </div>

      {/* Roster Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-4">Patient ID</th>
              <th className="p-4">Full Name</th>
              <th className="p-4">Demographics</th>
              <th className="p-4">Blood Group</th>
              <th className="p-4">Room & Bed</th>
              <th className="p-4">Attending Physician</th>
              <th className="p-4">Wearable Unit</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-mono font-bold text-teal-700">{p.id}</td>
                <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                  {p.name}
                </td>
                <td className="p-4 text-slate-600">{p.age} yrs ({p.gender})</td>
                <td className="p-4 font-bold text-red-600">{p.bloodGroup}</td>
                <td className="p-4 text-slate-800 font-medium">{p.room} ({p.bed})</td>
                <td className="p-4 text-slate-600">{p.doctor}</td>
                <td className="p-4 font-mono text-slate-600">{p.node}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase ${
                    p.status === 'Critical'
                      ? 'bg-red-100 text-red-700 animate-pulse'
                      : p.status === 'Monitoring'
                      ? 'bg-amber-100 text-amber-800'
                      : p.status === 'Discharged'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {hasRole(['ADMIN', 'DOCTOR']) && p.status !== 'Discharged' ? (
                    <button
                      onClick={() => onDischargePatient(p.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 border border-red-200"
                    >
                      <UserX className="w-3.5 h-3.5" /> Discharge
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px]">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddPatient}
      />
    </div>
  );
};
