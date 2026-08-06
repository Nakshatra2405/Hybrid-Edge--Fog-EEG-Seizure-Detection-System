import React, { useState } from 'react';
import { TelemetryEvent } from '../../types/telemetry';
import { 
  History, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  UserPlus, 
  BatteryLow, 
  LogIn, 
  WifiOff 
} from 'lucide-react';

interface EventFeedProps {
  events: TelemetryEvent[];
}

export const EventFeed: React.FC<EventFeedProps> = ({ events }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <aside
      className={`bg-white border border-slate-200 rounded-xl flex transition-all duration-300 ease-in-out shadow-sm h-full shrink-0 overflow-hidden ${
        isExpanded ? 'w-96' : 'w-12'
      }`}
    >
      {/* Collapsed Strip */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-full flex flex-col items-center py-4 cursor-pointer hover:bg-slate-50 transition-colors shrink-0 border-r border-slate-200 select-none"
        title="Toggle Real-Time Event Feed"
      >
        <History className="w-5 h-5 text-teal-600" />
        <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-2 animate-pulse">
          {events.length}
        </span>
        <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-bold text-slate-500 tracking-wider uppercase mt-6">
          Event Feed
        </span>
      </button>

      {/* Expanded Content Drawer */}
      <div className="flex-1 h-full flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm">Telemetry Event Feed</h3>
            <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">LIVE</span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="w-7 h-7 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Event List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {events.map((evt) => {
            let borderStyle = "border-l-4 border-slate-300 bg-slate-50";
            let IconComponent = RefreshCw;

            if (evt.severity === 'critical') {
              borderStyle = "border-l-4 border-red-600 bg-red-50/50";
              IconComponent = AlertTriangle;
            } else if (evt.severity === 'warning') {
              borderStyle = "border-l-4 border-amber-500 bg-amber-50/50";
              IconComponent = BatteryLow;
            } else if (evt.severity === 'success') {
              borderStyle = "border-l-4 border-teal-600 bg-teal-50/50";
              IconComponent = UserPlus;
            }

            return (
              <div key={evt.id} className={`p-3 rounded-lg flex gap-3 text-xs ${borderStyle}`}>
                <IconComponent className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">{evt.title}</p>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{evt.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{evt.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <button className="text-teal-700 text-xs font-bold uppercase tracking-wider hover:underline">
            View Complete Audit Logs
          </button>
        </div>
      </div>
    </aside>
  );
};
