import React, { useState, useEffect } from 'react';
import { Patient, PatientStatus } from '../../types/patient';
import { X, UserPlus, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../../services/apiClient';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (p: Patient & { edgeNodeId?: string }) => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    id: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
    age: '48',
    dob: '1976-05-14',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    bloodGroup: 'O+',
    room: '404',
    floor: 'Floor 4 - ICU',
    doctorId: '',
    doctorName: '',
    nurseId: '',
    nurseName: '',
    nodeId: '',
    nodeName: '',
    status: 'Monitoring' as PatientStatus,
    battery: '100%',
  });

  const [staffOptions, setStaffOptions] = useState<{ doctors: any[]; nurses: any[] }>({
    doctors: [],
    nurses: [],
  });

  const [availableNodes, setAvailableNodes] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.getStaff().then((staff) => {
        const doctors = staff.filter((s: any) => s.role === 'DOCTOR' && s.status === 'ACTIVE');
        const nurses = staff.filter((s: any) => s.role === 'NURSE' && s.status === 'ACTIVE');
        setStaffOptions({ doctors, nurses });

        if (doctors.length > 0 && !formData.doctorId) {
          setFormData((prev) => ({
            ...prev,
            doctorId: doctors[0].userId,
            doctorName: doctors[0].name,
            nurseId: nurses.length > 0 ? nurses[0].userId : '',
            nurseName: nurses.length > 0 ? nurses[0].name : '',
          }));
        }
      });

      api.getAvailableNodes().then((nodes) => {
        setAvailableNodes(nodes);
        if (nodes.length > 0) {
          setFormData((prev) => ({
            ...prev,
            nodeId: nodes[0].id,
            nodeName: nodes[0].nodeName,
            battery: `${nodes[0].batteryPercentage}%`,
          }));
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPatient: Patient & { edgeNodeId?: string } = {
      id: formData.id || `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
      mrn: formData.id,
      name: formData.name,
      age: parseInt(formData.age) || 30,
      dob: formData.dob,
      gender: formData.gender,
      bloodGroup: formData.bloodGroup,
      room: formData.room,
      floor: formData.floor,
      bed: `Bed ${formData.room}-A`,
      doctor: formData.doctorName || 'Dr. Assigned',
      staff: formData.nurseName || 'Ward Nurse',
      node: formData.nodeName || 'Node-01',
      status: formData.status,
      battery: formData.battery,
      timeAdded: 'Just now',
      rawTimestamp: Date.now(),
      vitals: {
        heartRate: 74,
        spo2: 98,
        bp: '120/80',
        eegAmplitude: 22,
        seizureProbability: 0.02,
      },
      edgeNodeId: formData.nodeId || undefined,
    };
    onSave(newPatient);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-600" /> Admit New Patient
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Register patient PII & assign wearable EEG edge hardware</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Patient PII */}
          <div>
            <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Patient Personal Information (PII)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Robert Vance"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Medical Record Number (MRN)</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Age *</label>
                <input
                  required
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Date of Birth (DOB) *</label>
                <input
                  required
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Blood Group *</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Hospital & Room Details */}
          <div className="pt-3 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Room / Bed No. *</label>
                <input
                  required
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Assigned Floor</label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Attending Physician *</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => {
                    const doc = staffOptions.doctors.find((d) => d.userId === e.target.value);
                    setFormData({
                      ...formData,
                      doctorId: e.target.value,
                      doctorName: doc ? doc.name : '',
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  {staffOptions.doctors.map((doc) => (
                    <option key={doc.userId} value={doc.userId}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Assigned Ward Nurse</label>
                <select
                  value={formData.nurseId}
                  onChange={(e) => {
                    const n = staffOptions.nurses.find((nr) => nr.userId === e.target.value);
                    setFormData({
                      ...formData,
                      nurseId: e.target.value,
                      nurseName: n ? n.name : '',
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="">Unassigned</option>
                  {staffOptions.nurses.map((nurse) => (
                    <option key={nurse.userId} value={nurse.userId}>
                      {nurse.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Wearable Edge Node Hardware Assignment */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-sky-600" /> Wearable Edge Node Unit (Nano BLE)
            </h4>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Select Available Connected Node</label>
              {availableNodes.length > 0 ? (
                <select
                  value={formData.nodeId}
                  onChange={(e) => {
                    const nd = availableNodes.find((n) => n.id === e.target.value);
                    setFormData({
                      ...formData,
                      nodeId: e.target.value,
                      nodeName: nd ? nd.nodeName : 'Node-01',
                      battery: nd ? `${nd.batteryPercentage}%` : '100%',
                    });
                  }}
                  className="w-full bg-teal-50/50 border border-teal-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  {availableNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      ⚡ {node.nodeName} ({node.hardwareMac || 'Nano 33 BLE'}) — Batt: {node.batteryPercentage}% — Room: {node.room}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center justify-between">
                  <span>No free unassigned Edge Nodes found. Node-01 will be allocated by default.</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-md"
            >
              Save & Start Telemetry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
