import React from 'react';
import { FileText, Folder, Download, Database, HardDrive, ShieldCheck } from 'lucide-react';

export const ClinicalRecordsPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clinical EEG Records & Trace History</h2>
          <p className="text-xs text-slate-500 mt-0.5">Archived EDF+ EEG Telemetry Datasets & Clinical Epoch Annotations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-teal-700 font-bold text-sm">
            <Folder className="w-5 h-5 text-teal-600" /> CHB-MIT Seizure Corpus
          </div>
          <p className="text-xs text-slate-500">23 Pediatric Subjects, 984 Continuous Hours recorded at 256Hz.</p>
          <button className="mt-3 text-xs font-bold text-teal-600 hover:underline flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Download EDF+ Bundle
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
            <Database className="w-5 h-5 text-sky-600" /> UCI Seizure Categorization Dataset
          </div>
          <p className="text-xs text-slate-500">11,500 1-second EEG slices, 5-class clinical EEG categorization.</p>
          <button className="mt-3 text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Download CSV Slices
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
            <HardDrive className="w-5 h-5 text-purple-600" /> Local Hospital Edge Buffer
          </div>
          <p className="text-xs text-slate-500">42 Active Wearables buffering raw telemetry streams to fog cluster.</p>
          <span className="mt-3 inline-block text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            Active Buffer: 1.4 TB
          </span>
        </div>
      </div>
    </div>
  );
};
