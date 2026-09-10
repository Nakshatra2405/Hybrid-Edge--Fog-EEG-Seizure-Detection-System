import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRBAC } from '../context/RBACContext';
import { Plus, Lock, ShieldAlert, Loader2, Search, Filter, Users, X, Edit3 } from 'lucide-react';
import { UserRole } from '../types/rbac';
import { api } from '../services/apiClient';
import { ProvisionStaffModal, StaffMemberModalData } from '../components/modals/ProvisionStaffModal';

export const StaffManagementRBACPage: React.FC = () => {
  const { user } = useAuth();
  const { canManageStaff } = useRBAC();
  const [staffList, setStaffList] = useState<StaffMemberModalData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<StaffMemberModalData | null>(null);

  const loadStaff = React.useCallback(async () => {
    try {
      setLoading(true);
      const liveStaff = await api.getStaff();
      setStaffList(liveStaff);
    } catch (err) {
      console.error('Failed to load staff roster:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleToggleStatus = async (userId: string) => {
    const success = await api.deactivateStaff(userId);
    if (success) {
      alert(`✅ Account status updated in database!`);
      loadStaff();
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'DOCTOR':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            DOCTOR
          </span>
        );
      case 'NURSE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            NURSE
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            ADMIN
          </span>
        );
      case 'TECHNICIAN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            TECHNICIAN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {role}
          </span>
        );
    }
  };

  const filteredStaff = staffList.filter((stf) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      stf.name.toLowerCase().includes(q) ||
      stf.email.toLowerCase().includes(q) ||
      stf.department.toLowerCase().includes(q) ||
      stf.role.toLowerCase().includes(q) ||
      stf.id.toLowerCase().includes(q);

    const matchesRole = selectedRoleFilter === 'ALL' || stf.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staff Management & RBAC Permissions</h2>
          <p className="text-xs text-slate-500 mt-0.5">Role-Based Access Control (RBAC) Matrix & Hospital Staff Directory</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono text-slate-700 font-bold border border-slate-200">
            <Users className="w-4 h-4 text-teal-600" />
            <span>Total Staff: <strong className="text-teal-700">{staffList.length}</strong></span>
          </div>

          {canManageStaff() && (
            <button 
              onClick={() => {
                setEditingStaff(null);
                setIsProvisionModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 shadow-md shadow-teal-900/10 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Provision New Staff Member
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-teal-600" /> Filter by RBAC Role:
          </div>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="ALL">All Roles ({staffList.length})</option>
            <option value="DOCTOR">Doctors ({staffList.filter(s => s.role === 'DOCTOR').length})</option>
            <option value="NURSE">Nurses ({staffList.filter(s => s.role === 'NURSE').length})</option>
            <option value="TECHNICIAN">Technicians ({staffList.filter(s => s.role === 'TECHNICIAN').length})</option>
            <option value="ADMIN">Admins ({staffList.filter(s => s.role === 'ADMIN').length})</option>
          </select>
        </div>

        {/* Live Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name, email, role, department..."
            className="pl-9 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none w-full md:w-80 shadow-inner font-medium text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
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
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    <span>Loading hospital staff directory from PostgreSQL...</span>
                  </div>
                </td>
              </tr>
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                  {searchTerm || selectedRoleFilter !== 'ALL'
                    ? 'No staff members match the current search or role filter.'
                    : 'No staff members found in this hospital.'}
                </td>
              </tr>
            ) : (
              filteredStaff.map((stf) => (
                <tr key={stf.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-teal-700">{stf.id.length > 12 ? stf.id.substring(0, 8).toUpperCase() : stf.id}</td>
                  <td className="p-4 font-bold text-slate-900">{stf.name}</td>
                  <td className="p-4 text-slate-600 font-mono text-[11px]">{stf.email}</td>
                  <td className="p-4 text-slate-700">{stf.department}</td>
                  <td className="p-4">
                    {getRoleBadge(stf.role)}
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingStaff(stf);
                            setIsProvisionModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors shadow-xs"
                          title="Edit Staff Member & Role"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(stf.userId)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            stf.status === 'ACTIVE'
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                          }`}
                        >
                          {stf.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Protected</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProvisionStaffModal
        isOpen={isProvisionModalOpen}
        onClose={() => {
          setIsProvisionModalOpen(false);
          setEditingStaff(null);
        }}
        onSuccess={loadStaff}
        editStaff={editingStaff}
      />
    </div>
  );
};


