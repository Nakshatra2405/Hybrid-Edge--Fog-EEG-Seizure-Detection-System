import React, { useState, useRef, useEffect } from 'react';
import { Filter, Plus, ChevronDown, Users, Clock, AlertTriangle, Activity, UserX } from 'lucide-react';

interface FilterBarProps {
  currentFilterName: string;
  onFilterSelect: (type: string, name: string) => void;
  onAddPatientClick: () => void;
}

const filterOptions = [
  { type: 'all', name: 'All Patients', icon: Users, color: 'text-slate-700' },
  { type: 'latest', name: 'Latest Admission', icon: Clock, color: 'text-slate-700' },
  { type: 'alerts', name: 'Recent Seizure Alerts', icon: AlertTriangle, color: 'text-red-600 font-bold' },
  { type: 'live', name: 'Live Monitoring', icon: Activity, color: 'text-teal-600' },
  { type: 'discharged', name: 'Discharged Census', icon: UserX, color: 'text-slate-400' }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  currentFilterName,
  onFilterSelect,
  onAddPatientClick,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex justify-between items-end mb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Active Monitoring Grid</h2>
        <p className="text-xs text-slate-500 mt-0.5">Real-time 16-channel EEG telemetry & ward census management</p>
      </div>

      <div className="flex gap-3 relative" ref={dropdownRef}>
        {/* Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Filter className="w-4 h-4 text-teal-600" />
            <span>{currentFilterName}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-1" />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 space-y-0.5 z-50">
              {filterOptions.map((opt) => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.type}
                    onClick={() => {
                      onFilterSelect(opt.type, opt.name);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between ${opt.color}`}
                  >
                    <span>{opt.name}</span>
                    <IconComponent className="w-4 h-4 opacity-60" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Patient Trigger */}
        <button
          onClick={onAddPatientClick}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 shadow-md transition-all"
        >
          <Plus className="w-4 h-4" /> Add Patient
        </button>
      </div>
    </div>
  );
};
