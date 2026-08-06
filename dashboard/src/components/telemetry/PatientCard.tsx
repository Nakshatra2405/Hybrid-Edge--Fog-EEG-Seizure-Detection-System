import React from 'react';
import { Patient } from '../../types/patient';
import { useRBAC } from '../../context/RBACContext';
import { 
  Heart, 
  Activity, 
  BatteryCharging, 
  Stethoscope, 
  UserCheck, 
  Cpu, 
  MapPin, 
  AlertOctagon, 
  BellRing,
  UserX
} from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
  onCallCode: (p: Patient) => void;
  onNotifyDoctor: (p: Patient) => void;
  onDischarge?: (id: string) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient: p,
  onCallCode,
  onNotifyDoctor,
  onDischarge,
}) => {
  const { canCallCode, hasRole } = useRBAC();

  const isCritical = p.status === 'Critical';
  const isMonitoring = p.status === 'Monitoring';
  const isDischarged = p.status === 'Discharged';

  let badgeStyle = "bg-teal-50 text-teal-700 border-teal-200 font-bold";
  let cardBorder = "border-slate-200 hover:border-slate-300";
  let animationClass = "";

  if (isCritical) {
    badgeStyle = "bg-red-600 text-white font-bold animate-pulse shadow-sm";
    cardBorder = "border-red-400 ring-2 ring-red-200 shadow-md";
    animationClass = "animate-seizure-pulse";
  } else if (isMonitoring) {
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 font-bold";
  } else if (isDischarged) {
    badgeStyle = "bg-slate-100 text-slate-500 border-slate-200 font-medium";
    cardBorder = "border-slate-200 opacity-60 grayscale";
  }

  return (
    <div className={`bg-white border ${cardBorder} rounded-xl p-4 flex flex-col gap-3 transition-all ${animationClass}`}>
      {/* Top Row: Avatar, Name, ID & Status Badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-400 font-bold text-sm">{p.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-snug">{p.name}</h3>
            <p className="text-slate-400 text-xs font-mono">ID: {p.id}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 text-[10px] rounded-full uppercase tracking-wider border ${badgeStyle}`}>
          {isCritical ? 'Seizure Alert' : p.status}
        </span>
      </div>

      {/* PII Grid: Age, DOB, Gender, Blood */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200/60 text-center text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Age</span>
          <span className="font-bold text-slate-800">{p.age} yrs</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">DOB</span>
          <span className="font-medium text-slate-700">{p.dob}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Gender</span>
          <span className="font-medium text-slate-700">{p.gender}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Blood</span>
          <span className="font-bold text-red-600">{p.bloodGroup}</span>
        </div>
      </div>

      {/* Real-Time Live Vitals Banner */}
      <div className="grid grid-cols-3 gap-2 p-2 bg-teal-950 text-white rounded-lg text-xs font-mono">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-teal-400 uppercase flex items-center gap-1">
            <Heart className="w-3 h-3 text-red-400 animate-bounce" /> Heart Rate
          </span>
          <span className="font-bold text-sm text-teal-200">{p.vitals.heartRate} <span className="text-[9px] text-teal-400">bpm</span></span>
        </div>
        <div className="flex flex-col items-center border-x border-teal-800/60 px-1">
          <span className="text-[9px] text-teal-400 uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-sky-400" /> EEG Amp
          </span>
          <span className="font-bold text-sm text-teal-200">{p.vitals.eegAmplitude} <span className="text-[9px] text-teal-400">µV</span></span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-teal-400 uppercase flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-amber-400" /> Prob
          </span>
          <span className={`font-bold text-sm ${p.vitals.seizureProbability > 0.7 ? 'text-red-400 font-extrabold' : 'text-teal-200'}`}>
            {(p.vitals.seizureProbability * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Location & Metadata Sub-card */}
      <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs space-y-1.5">
        <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
          <span className="font-bold text-slate-800 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-teal-600" /> {p.room} ({p.bed})
          </span>
          <span className="text-[10px] text-slate-400">{p.timeAdded}</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
          <div className="flex items-center gap-1 truncate" title={p.doctor}>
            <Stethoscope className="w-3 h-3 text-teal-600 shrink-0" /> {p.doctor}
          </div>
          <div className="flex items-center gap-1 truncate" title={p.staff}>
            <UserCheck className="w-3 h-3 text-slate-400 shrink-0" /> {p.staff}
          </div>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400 shrink-0" /> {p.node}
          </div>
          <div className={`flex items-center gap-1 font-bold ${p.battery === '0%' ? 'text-red-600' : 'text-teal-700'}`}>
            <BatteryCharging className="w-3 h-3 shrink-0" /> Battery: {p.battery}
          </div>
        </div>
      </div>

      {/* Action Buttons: RBAC Guarded */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        {canCallCode() ? (
          <button
            onClick={() => onCallCode(p)}
            className="py-2 px-3 bg-red-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <AlertOctagon className="w-3.5 h-3.5 animate-pulse" /> Call Code
          </button>
        ) : (
          <button disabled className="py-2 px-3 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed">
            Code Guarded
          </button>
        )}

        <button
          onClick={() => onNotifyDoctor(p)}
          className="py-2 px-3 bg-teal-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-teal-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <BellRing className="w-3.5 h-3.5" /> Notify Doc
        </button>
      </div>

      {/* Discharge Action (Admin & Doctor Only) */}
      {hasRole(['ADMIN', 'DOCTOR']) && !isDischarged && onDischarge && (
        <button
          onClick={() => onDischarge(p.id)}
          className="w-full py-1.5 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 mt-0.5 border border-slate-200"
        >
          <UserX className="w-3 h-3" /> Discharge Patient
        </button>
      )}
    </div>
  );
};
