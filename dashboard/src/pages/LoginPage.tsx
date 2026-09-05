import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/rbac';
import { 
  Activity, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Cpu, 
  Stethoscope, 
  UserCheck, 
  Wrench,
  ArrowRight
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { setUserRole } = useAuth();
  const [email, setEmail] = useState<string>('sarah.chen@hospital.org');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserRole(selectedRole);
    onLoginSuccess();
  };

  const rolePresets = [
    { role: 'ADMIN' as UserRole, title: 'Chief Neurologist / Admin', desc: 'Full System, Staff & OTA Access', icon: ShieldCheck },
    { role: 'DOCTOR' as UserRole, title: 'Attending Doctor', desc: 'Patient Roster & EEG Review', icon: Stethoscope },
    { role: 'NURSE' as UserRole, title: 'ICU Nurse (RN)', desc: 'Live Telemetry & Code Blue Pagers', icon: UserCheck },
    { role: 'TECHNICIAN' as UserRole, title: 'Biomedical Technician', desc: 'Edge Node & Model Training Pipeline', icon: Wrench },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Radial Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600/20 border border-teal-500/30 text-teal-400 mb-2 shadow-lg shadow-teal-950">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">NeuroWatch AI</h1>
          <p className="text-xs text-teal-400 font-mono uppercase tracking-widest">
            Clinical Edge EEG Monitoring System
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 shadow-2xl space-y-5">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Email / Staff ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Clinical Email / Staff ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Selection Presets */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Sign-In Access Role:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {rolePresets.map((r) => {
                  const IconComp = r.icon;
                  const isSelected = selectedRole === r.role;
                  return (
                    <button
                      type="button"
                      key={r.role}
                      onClick={() => setSelectedRole(r.role)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-teal-600/20 border-teal-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-400' : 'text-slate-500'}`} />
                        <span className="font-bold text-[11px] truncate">{r.role}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 truncate">{r.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-teal-950 transition-all flex items-center justify-center gap-2 group mt-2"
            >
              <span>Authenticate & Access Telemetry</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Compliance Disclaimer */}
          <div className="pt-3 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
              🔒 <strong>HIPAA & PHI Compliant Connection</strong>
              <br />
              Restricted to authorized clinical healthcare personnel. All sessions are logged & audited.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 font-mono">
          <span>Edge Cluster Nodes: 42 Active | Fog Relay: Online</span>
        </div>
      </div>
    </div>
  );
};
