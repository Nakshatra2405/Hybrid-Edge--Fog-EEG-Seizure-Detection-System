import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminRequestNotification } from '../../types/telemetry';
import { 
  Clock, 
  Users, 
  Cpu, 
  AlertTriangle, 
  Search, 
  Bell, 
  HelpCircle, 
  ShieldCheck,
  AlertOctagon,
  BellRing,
  UserPlus,
  LogOut,
  Check,
  XCircle,
  FileCheck2
} from 'lucide-react';
import { api } from '../../services/apiClient';

interface HeaderProps {
  patientCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  adminRequests: AdminRequestNotification[];
  onRefreshRequests: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  patientCount,
  searchQuery,
  onSearchChange,
  adminRequests,
  onRefreshRequests,
}) => {
  const { user } = useAuth();
  const role = user?.role;
  const [timeStr, setTimeStr] = useState<string>('');
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [headerMetrics, setHeaderMetrics] = useState<{ totalPatients: number; onlineNodesCount: number; totalNodesCount?: number } | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await api.getMetrics();
        if (data) setHeaderMetrics(data);
      } catch { /* ignore */ }
    };
    fetchSummary();
    const timer = setInterval(fetchSummary, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingRequests = adminRequests.filter((n) => n.status === 'PENDING');
  const unreadCount = pendingRequests.length;

  const handleResolve = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setResolvingId(id);
    try {
      const ok = await api.resolveNotification(id, status);
      if (ok) {
        onRefreshRequests();
      }
    } finally {
      setResolvingId(null);
    }
  };

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
          <span>Patients: <strong className="text-slate-900">{patientCount > 0 ? patientCount : (headerMetrics?.totalPatients ?? 0)}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-md">
          <Cpu className="w-4 h-4 text-sky-600" />
          <span>
            Nodes: <strong className="text-slate-900">
              {headerMetrics?.onlineNodesCount != null
                ? `${headerMetrics.onlineNodesCount} / ${headerMetrics.totalNodesCount ?? headerMetrics.onlineNodesCount} Edge Online`
                : '— Edge'}
            </strong>
          </span>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 font-bold rounded-md animate-pulse border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Requests: {unreadCount} Pending</span>
          </div>
        )}
      </div>

      {/* Right: Search, RBAC Role Badge & User Actions */}
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

        {/* RBAC Active Role Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold shadow-xs">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Role: {user?.role}</span>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
          {/* Notification Bell Dropdown Button */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2 text-slate-600 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors relative"
              title="Clinical & Administrative Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-teal-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown Window */}
            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-2 w-[420px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-teal-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-teal-200">
                      {role === 'ADMIN' ? 'Hospital Admin Message Center' : 'Clinical Admission / Discharge Requests'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300">
                    {adminRequests.length} Total
                  </span>
                </div>

                {/* Notification List */}
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {adminRequests.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No admission or discharge requests recorded.
                    </div>
                  ) : (
                    adminRequests.map((notif) => {
                      const isPending = notif.status === 'PENDING';
                      const isAdmission = notif.type === 'admission_request';
                      const isDischarge = notif.type === 'discharge_request';

                      return (
                        <div
                          key={notif.id}
                          className={`p-4 hover:bg-slate-50 transition-colors text-xs flex gap-3 ${
                            isPending ? 'bg-amber-50/40' : 'bg-white'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isAdmission ? (
                              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                                <UserPlus className="w-4 h-4" />
                              </div>
                            ) : isDischarge ? (
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                <FileCheck2 className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                                <AlertOctagon className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 capitalize">
                                {isAdmission ? 'Patient Admission Request' : isDischarge ? 'Patient Discharge Request' : 'Emergency Code Blue'}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">{notif.timestamp}</span>
                            </div>

                            <p className="text-[11px] font-semibold text-slate-800 mt-1">
                              Patient: <strong className="text-teal-700">{notif.patientName}</strong>
                              {notif.room && <span className="text-slate-500 font-normal"> — {notif.room}</span>}
                            </p>

                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Requested by: <strong className="text-slate-800">{notif.requestedByDoctor}</strong>
                            </p>

                            {notif.details && (
                              <p className="text-slate-500 text-[11px] mt-1 bg-white/70 p-2 rounded border border-slate-200/80 leading-relaxed">
                                {notif.details}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  notif.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : notif.status === 'REJECTED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800 animate-pulse'
                                }`}
                              >
                                {notif.status}
                              </span>

                              {/* Admin Action Buttons */}
                              {role === 'ADMIN' && isPending && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    disabled={resolvingId === notif.id}
                                    onClick={() => handleResolve(notif.id, 'APPROVED')}
                                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded text-[10px] flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                                  >
                                    <Check className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    disabled={resolvingId === notif.id}
                                    onClick={() => handleResolve(notif.id, 'REJECTED')}
                                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[10px] flex items-center gap-1 transition-all disabled:opacity-50"
                                  >
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-mono">
                    PostgreSQL Real-Time Synchronized Admin Queue
                  </span>
                </div>
              </div>
            )}
          </div>

          <button className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors" title="System Help">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
