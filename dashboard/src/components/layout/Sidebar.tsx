import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Activity, 
  BarChart2, 
  Users, 
  FileText, 
  Settings, 
  UserCheck, 
  ShieldAlert,
  BrainCircuit,
  UploadCloud,
  CheckSquare
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'ADMIN';

  // Role-specific navigation presets
  let navItems = [
    { name: 'Live Monitoring', path: '/', icon: Activity },
    { name: 'Metrics Dashboard', path: '/metrics', icon: BarChart2 },
    { name: 'Patient Management', path: '/patients', icon: Users },
    { name: 'Patient Vitals Grid', path: '/patients-fixed', icon: UserCheck },
    { name: 'Staff Management (RBAC)', path: '/staff-rbac', icon: ShieldAlert },
    { name: 'Settings & Config', path: '/settings', icon: Settings },
  ];

  if (role === 'DOCTOR') {
    navItems = [
      { name: 'Live Monitoring', path: '/', icon: Activity },
      { name: 'Patient Management', path: '/patients', icon: Users },
      { name: 'Patient Vitals Grid', path: '/patients-fixed', icon: UserCheck },
      { name: 'Clinical Records', path: '/records', icon: FileText },
      { name: 'Settings & Config', path: '/settings', icon: Settings },
    ];
  } else if (role === 'NURSE') {
    navItems = [
      { name: 'Live Monitoring', path: '/', icon: Activity },
      { name: 'Patient Management', path: '/patients', icon: Users },
      { name: 'Patient Vitals Grid', path: '/patients-fixed', icon: UserCheck },
      { name: 'Settings & Config', path: '/settings', icon: Settings },
    ];
  } else if (role === 'TECHNICIAN') {
    navItems = [
      { name: 'Data Review & Samples', path: '/', icon: CheckSquare },
      { name: 'Model Training & Eval', path: '/technician-training', icon: BrainCircuit },
      { name: 'Model Upload & Edge OTA', path: '/technician-deployments', icon: UploadCloud },
      { name: 'Metrics Dashboard', path: '/metrics', icon: BarChart2 },
      { name: 'Settings & Config', path: '/settings', icon: Settings },
    ];
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed top-0 left-0 z-50 border-r border-slate-800 shadow-xl">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/60">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-900/50">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight">NeuroWatch AI</h1>
          <p className="text-[10px] text-teal-400 font-mono tracking-wider uppercase">Clinical Edge EEG</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-900/30'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: User Profile Badge & Role */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-900/60 border border-teal-500/40 font-mono font-bold text-xs text-teal-300 flex items-center justify-center shrink-0">
            {user?.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() || 'DR'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{user?.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
              <p className="text-[10px] text-teal-400 font-mono uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
