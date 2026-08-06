import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/rbac';
import { 
  Clock, 
  Users, 
  Cpu, 
  AlertTriangle, 
  Search, 
  Bell, 
  HelpCircle, 
  LogOut, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  patientCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ patientCount, searchQuery, onSearchChange }) => {
  const { user, setUserRole, logout } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const roles: UserRole[] = ['ADMIN', 'DOCTOR', 'NURSE', 'TECHNICIAN'];

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between shadow-sm">
      {/* Left: Telemetry System Metrics */}
      <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-md">
          <Clock className="w-4 h-4 text-teal-600" />
          <span>{timeStr || '14:32:01'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-md">
          <Users className="w-4 h-4 text-teal-600" />
          <span>Patients: <strong className="text-slate-900">{patientCount}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-md">
          <Cpu className="w-4 h-4 text-sky-600" />
          <span>Nodes: <strong className="text-slate-900">42 Edge / 8 Fog</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 font-bold rounded-md animate-pulse border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>Alerts: 3 Active</span>
        </div>
      </div>

      {/* Right: Search, RBAC Role Switcher & User Actions */}
      <div className="flex items-center gap-4">
        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search patients, ID, room..."
            className="pl-9 pr-4 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 w-48 transition-all focus:w-64"
          />
        </div>

        {/* RBAC Quick Role Simulator Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold hover:bg-teal-100 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Role: {user?.role}</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 mb-1">
                Simulate RBAC Access Role
              </div>
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setUserRole(role);
                    setShowRoleDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                    user?.role === role ? 'text-teal-700 font-bold bg-teal-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{role}</span>
                  {user?.role === role && <span className="w-2 h-2 rounded-full bg-teal-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
          <button className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors" title="Notifications">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors" title="System Help">
            <HelpCircle className="w-4 h-4" />
          </button>
          <button onClick={logout} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
