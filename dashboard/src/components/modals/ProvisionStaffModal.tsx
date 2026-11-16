import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types/rbac';
import { api } from '../../services/apiClient';
import { 
  X, 
  UserPlus, 
  UserCog,
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  AlertCircle,
  Loader2
} from 'lucide-react';

export interface StaffMemberModalData {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  licenseNumber?: string;
  assignedFloor?: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

interface ProvisionStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editStaff?: StaffMemberModalData | null;
}

export const ProvisionStaffModal: React.FC<ProvisionStaffModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  editStaff = null 
}) => {
  if (!isOpen) return null;

  const isEditMode = Boolean(editStaff);

  const initialFormState = {
    fullName: '',
    email: '',
    password: '',
    role: 'DOCTOR' as UserRole,
    department: 'Epileptology & Clinical Neurophysiology',
    licenseNumber: '',
    assignedFloor: 'Floor 4 - ICU',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize form whenever modal opens or editStaff changes
  useEffect(() => {
    if (isOpen) {
      if (editStaff) {
        setFormData({
          fullName: editStaff.name || '',
          email: editStaff.email || '',
          password: '', // blank password indicates no change during edit
          role: editStaff.role || 'DOCTOR',
          department: editStaff.department || 'General',
          licenseNumber: editStaff.licenseNumber || '',
          assignedFloor: editStaff.assignedFloor || 'Floor 4 - ICU',
        });
      } else {
        setFormData({
          fullName: '',
          email: '',
          password: 'password123',
          role: 'DOCTOR' as UserRole,
          department: 'Epileptology & Clinical Neurophysiology',
          licenseNumber: '',
          assignedFloor: 'Floor 4 - ICU',
        });
      }
      setErrorMessage(null);
      setLoading(false);
    }
  }, [isOpen, editStaff]);

  const handleRoleChange = (newRole: UserRole) => {
    let dept = formData.department;
    let floor = formData.assignedFloor;

    if (newRole === 'DOCTOR') {
      dept = 'Epileptology & Clinical Neurophysiology';
    } else if (newRole === 'NURSE') {
      dept = 'Floor 4 - ICU';
      floor = 'Floor 4 - ICU';
    } else if (newRole === 'ADMIN') {
      dept = 'Hospital Administration';
    } else if (newRole === 'TECHNICIAN') {
      dept = 'Biomedical Edge AI Lab';
    }

    setFormData({
      ...formData,
      role: newRole,
      department: dept,
      assignedFloor: floor,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Strict client-side compulsory fields validation
    if (!formData.fullName.trim()) {
      setErrorMessage('Full Name is compulsory.');
      return;
    }
    if (!isEditMode && !formData.email.trim()) {
      setErrorMessage('Clinical Email Address is compulsory.');
      return;
    }
    if (!isEditMode && !formData.password.trim()) {
      setErrorMessage('Password is compulsory for new staff accounts.');
      return;
    }
    if (formData.role === 'DOCTOR' && !formData.licenseNumber.trim()) {
      setErrorMessage('Medical License Number is compulsory for Doctor role.');
      return;
    }
    if (formData.role === 'NURSE' && !formData.licenseNumber.trim()) {
      setErrorMessage('Nursing License Number is compulsory for Nurse role.');
      return;
    }
    if ((formData.role === 'ADMIN' || formData.role === 'TECHNICIAN') && !formData.department.trim()) {
      setErrorMessage('Department / Lab assignment is compulsory.');
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && editStaff) {
        const payload = {
          fullName: formData.fullName.trim(),
          role: formData.role,
          department: formData.department.trim(),
          licenseNumber: (formData.role === 'DOCTOR' || formData.role === 'NURSE') ? formData.licenseNumber.trim() : undefined,
          assignedFloor: formData.role === 'NURSE' ? formData.assignedFloor : undefined,
          password: formData.password.trim() ? formData.password.trim() : undefined,
        };

        const result = await api.updateStaff(editStaff.userId, payload);

        if (!result.success) {
          setErrorMessage(result.message || 'Failed to update staff member.');
          return;
        }

        alert(`✅ Staff member "${formData.fullName}" updated successfully in PostgreSQL!`);
        onSuccess();
        onClose();
      } else {
        const payload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
          department: formData.department.trim(),
          licenseNumber: formData.licenseNumber.trim() || undefined,
          assignedFloor: formData.role === 'NURSE' ? formData.assignedFloor : undefined,
        };

        const result = await api.createStaff(payload);

        if (!result.success) {
          setErrorMessage(result.message || 'Failed to provision staff member.');
          return;
        }

        alert(`✅ Staff member "${formData.fullName}" (${formData.role}) provisioned successfully in PostgreSQL!`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while communicating with the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shrink-0 shadow-xs">
              {isEditMode ? <UserCog className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditMode ? 'Edit Staff Member & RBAC Role' : 'Provision New Staff Member'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditMode 
                  ? 'Update clinical credentials, role assignments & hospital departments' 
                  : 'Create clinical credentials & allocate RBAC system permissions'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name & Clinical Credentials *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Dr. Jason Miller, MD"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none font-medium"
              />
            </div>
          </div>

          {/* Email & Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Email Address {isEditMode ? '(Read-only)' : '*'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="email"
                  disabled={isEditMode}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@hospital.com"
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs font-mono outline-none ${
                    isEditMode 
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                      : 'bg-slate-50 text-slate-900 border-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-teal-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isEditMode ? 'New Password (Optional)' : 'Initial Password *'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required={!isEditMode}
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isEditMode ? 'Leave blank to keep current' : 'password123'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* RBAC Role Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned RBAC System Role *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['DOCTOR', 'NURSE', 'TECHNICIAN', 'ADMIN'] as UserRole[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center ${
                    formData.role === r
                      ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Role-Specific Subfields */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              Role Configuration ({formData.role})
            </h4>

            {formData.role === 'DOCTOR' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Specialization / Department *</label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Epileptology & Clinical Neurophysiology">Epileptology & Neurophysiology</option>
                    <option value="Pediatric Neurology">Pediatric Neurology</option>
                    <option value="Critical Care Neurology & ICU">Critical Care Neurology & ICU</option>
                    <option value="General Neurology">General Neurology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Medical License Number *</label>
                  <input
                    required
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="e.g. MD-99412"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>
            )}

            {formData.role === 'NURSE' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Assigned Floor / Ward *</label>
                  <select
                    required
                    value={formData.assignedFloor}
                    onChange={(e) => setFormData({ ...formData, assignedFloor: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Floor 4 - ICU">Floor 4 - ICU</option>
                    <option value="Floor 2 - Ward">Floor 2 - Ward</option>
                    <option value="Floor 3 - Neuro Ward">Floor 3 - Neuro Ward</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Nursing License Number *</label>
                  <input
                    required
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="e.g. RN-30012"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>
            )}

            {formData.role === 'ADMIN' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Department / Office *</label>
                <input
                  required
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Hospital Administration"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}

            {formData.role === 'TECHNICIAN' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Lab / Department *</label>
                <input
                  required
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Biomedical Edge AI Lab"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-md shadow-teal-900/10 flex items-center gap-2 disabled:bg-teal-800 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditMode ? 'Updating Staff...' : 'Provisioning...'}</span>
                </>
              ) : (
                <>
                  {isEditMode ? <UserCog className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isEditMode ? 'Update Staff Member' : 'Provision Staff Member'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

