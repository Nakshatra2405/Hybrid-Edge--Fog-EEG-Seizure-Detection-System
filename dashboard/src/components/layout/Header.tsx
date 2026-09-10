import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck,
  AlertOctagon,
  BellRing,
  BatteryLow,
  CheckCheck
} from 'lucide-react';

interface HeaderProps {
  patientCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

interface DoctorNotification {
  id: string;
  type: 'seizure_alert' | 'doctor_pager' | 'device_warning';
  patientId?: string;
  patientName?: string;
  room?: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

const initialNotifications: DoctorNotification[] = [
  {
    id: 'notif-01',
    type: 'seizure_alert',
    patientId: '#EEG-8829',
    patientName: 'John Doe',
    room: 'ICU 402-A',
    title: 'CRITICAL SEIZURE SPIKE DETECTED',
    message: 'On-device EEG inference detected 94% seizure probability. Spike-wave pattern in Channel 03 & 04.',
    timestamp: '14:31:58',
    isRead: false,
  },
  {
    id: 'notif-02',
    type: 'doctor_pager',
    patientId: '#EEG-4456',
    patientName: 'Samuel Thompson',
    room: 'Room 408-A',
    title: 'Urgent Telemetry Alert Dispatched',
    message: 'Pre-ictal warning (42% probability) dispatched to Dr. Sarah Chen mobile pager.',
    timestamp: '14:28:10',
    isRead: false,
  },
  {
    id: 'notif-03',
    type: 'device_warning',
    patientId: '#EEG-8829',
    title: 'Edge Node Battery Low',
    message: 'Edge-Node 04 reserve dropped to 42%. Connect magnetic charger.',
    timestamp: '14:22:01',
    isRead: false,
  },
];

export const Header: React.FC<HeaderProps> = ({ patientCount, searchQuery, onSearchChange }) => {
  const { user } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<DoctorNotification[]>(initialNotifications);

  const notifRef = useRef<HTMLDivElement>(null);

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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
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
          <span>Patients: <strong className="text-slate-900">{patientCount}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-md">
          <Cpu className="w-4 h-4 text-sky-600" />
          <span>Nodes: <strong className="text-slate-900">42 Edge / 8 Fog</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 font-bold rounded-md animate-pulse border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>Alerts: {unreadCount} Active</span>
        </div>
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

        {/* RBAC Active Role Badge (Static) */}
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
              title="Doctor Seizure Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown Window */}
            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-teal-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-teal-200">Doctor Clinical Notifications</h3>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-slate-400 hover:text-teal-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No active notifications.
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      let bgStyle = notif.isRead ? 'bg-white' : 'bg-slate-50/80 font-medium';
                      let iconColor = 'text-teal-600';
                      let IconComponent = BellRing;

                      if (notif.type === 'seizure_alert') {
                        bgStyle = notif.isRead ? 'bg-white' : 'bg-red-50/60 border-l-4 border-red-600';
                        iconColor = 'text-red-600';
                        IconComponent = AlertOctagon;
                      } else if (notif.type === 'device_warning') {
                        iconColor = 'text-amber-600';
                        IconComponent = BatteryLow;
                      }

                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleToggleRead(notif.id)}
                          className={`p-3.5 hover:bg-slate-100/80 transition-colors cursor-pointer text-xs flex gap-3 ${bgStyle}`}
                        >
                          <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-bold ${notif.type === 'seizure_alert' ? 'text-red-700' : 'text-slate-900'}`}>
                                {notif.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">{notif.timestamp}</span>
                            </div>

                            {notif.patientName && (
                              <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
                                Patient: <strong className="text-teal-700">{notif.patientName}</strong> ({notif.patientId}) - <span className="text-slate-500">{notif.room}</span>
                              </p>
                            )}

                            <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">{notif.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Real-Time Edge Seizure Alert Dispatch Engine
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
