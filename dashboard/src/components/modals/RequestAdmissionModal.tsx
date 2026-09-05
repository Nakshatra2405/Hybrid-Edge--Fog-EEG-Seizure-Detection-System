import React, { useState } from 'react';
import { X, UserPlus, Send, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RequestAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmit: (patientName: string, room: string, nurseName: string, details: string) => void;
}

export const RequestAdmissionModal: React.FC<RequestAdmissionModalProps> = ({
  isOpen,
  onClose,
  onRequestSubmit,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState<string>('');
  const [room, setRoom] = useState<string>('ICU Room 402-A');
  const [nurseName, setNurseName] = useState<string>('Nurse E. Vance (RN)');
  const [details, setDetails] = useState<string>('Continuous EEG Telemetry required for suspected temporal lobe seizures.');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestSubmit(name, room, nurseName, details);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm">Request Patient Admission</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Submit patient admission details & assigned nurse to the System Admin for ward registration.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Patient Full Name *</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Robert Miller"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Allotted Room / Bed *</label>
            <input
              required
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Assigned Ward Nurse (RN) *</label>
            <div className="relative">
              <input
                required
                type="text"
                value={nurseName}
                onChange={(e) => setNurseName(e.target.value)}
                placeholder="e.g. Nurse E. Vance (RN)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Clinical Admission Notes</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-md flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Submit Request to Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
