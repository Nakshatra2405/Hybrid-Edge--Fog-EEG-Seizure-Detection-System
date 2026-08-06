import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRBAC } from '../context/RBACContext';
import { UserRole } from '../types/rbac';
import { Shield, ShieldAlert, UserCheck, Plus, CheckCircle, Lock, UserX } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

const initialStaff: StaffMember[] = [
  { id: 'stf-01', name: 'Dr. Sarah Chen', email: 'sarah.chen@hospital.org', role: 'ADMIN', department: 'Chief Neurologist', status: 'ACTIVE' },
  { id: 'stf-02', name: 'Dr. Marcus Sterling', email: 'm.sterling@hospital.org', role: 'DOCTOR', department: 'Neurology ICU', status: 'ACTIVE' },
  { id: 'stf-03', name: 'Nurse E. Vance (RN)', email: 'e.vance@hospital.org', role: 'NURSE', department: 'ICU Telemetry Ward', status: 'ACTIVE' },
  { id: 'stf-04', name: 'Alex Rivera (BME)', email: 'a.rivera@hospital.org', role: 'TECHNICIAN', department: 'Biomedical Edge Engineering', status: 'ACTIVE' },
  { id: 'stf-05', name: 'Resident Dr. A. Patel', email: 'a.patel@hospital.org', role: 'DOCTOR', department: 'Neurology Resident', status: 'ACTIVE' }
];

export const StaffManagementRBACPage: React.FC = () => {
  const { user } = useAuth();
  const { canManageStaff } = useRBAC();
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);

  const handleRoleChange = (id: string, newRole: UserRole) => {
    setStaffList(
      staffList.map((stf) => (stf.id === id ? { ...stf, role: newRole } : stf))
    );
  };

  const handleToggleStatus = (id: string) => {
    setStaffList(
      staffList.map((stf) =>
        stf.id === id ? { ...stf, status: stf.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : stf
      )
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staff Management & RBAC Permissions</h2>
          <p className="text-xs text-slate-500 mt-0.5">Role-Based Access Control (RBAC) Matrix & Hospital Staff Roster</p>
        </div>

        {canManageStaff() && (
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 shadow-md transition-all">
            <Plus className="w-4 h-4" /> Provision New Staff Member
          </button>
        )}
      </div>

      {/* RBAC Guard Status Alert */}
      {!canManageStaff() ? (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-amber-900">Access Restricted (Read-Only Mode)</p>
            <p className="text-amber-700 mt-0.5">Your current active role (<strong className="uppercase">{user?.role}</strong>) does not have write permissions for Staff Provisioning. Switch to ADMIN role in the top header to edit access rules.</p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs font-medium flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-teal-600 shrink-0" />
          <div>
            <p className="font-bold text-teal-900">ADMIN Privileges Unlocked</p>
            <p className="text-teal-700 mt-0.5">You have full authority to modify staff RBAC roles, grant emergency code clearance, and suspend hospital accounts.</p>
          </div>
        </div>
      )}

      {/* Staff Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-4">Staff ID</th>
              <th className="p-4">Full Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Department</th>
              <th className="p-4">Assigned RBAC Role</th>
              <th className="p-4">Account Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {staffList.map((stf) => (
              <tr key={stf.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono font-bold text-teal-700">{stf.id}</td>
                <td className="p-4 font-bold text-slate-900">{stf.name}</td>
                <td className="p-4 text-slate-600 font-mono text-[11px]">{stf.email}</td>
                <td className="p-4 text-slate-700">{stf.department}</td>
                <td className="p-4">
                  {canManageStaff() ? (
                    <select
                      value={stf.role}
                      onChange={(e) => handleRoleChange(stf.id, e.target.value as UserRole)}
                      className="bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="DOCTOR">DOCTOR</option>
                      <option value="NURSE">NURSE</option>
                      <option value="TECHNICIAN">TECHNICIAN</option>
                    </select>
                  ) : (
                    <span className="font-bold text-slate-800 uppercase">{stf.role}</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${
                    stf.status === 'ACTIVE' ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-700'
                  }`}>
                    {stf.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {canManageStaff() ? (
                    <button
                      onClick={() => handleToggleStatus(stf.id)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                        stf.status === 'ACTIVE'
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                          : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                      }`}
                    >
                      {stf.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate'}
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Protected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
