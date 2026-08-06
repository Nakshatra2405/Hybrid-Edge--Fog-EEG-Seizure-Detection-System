import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const mockEEGSeries = Array.from({ length: 30 }, (_, i) => ({
  time: `${i * 2}s`,
  ch1: Math.sin(i * 0.5) * 40 + (Math.random() * 15 - 7.5),
  ch2: Math.cos(i * 0.4) * 35 + (Math.random() * 12 - 6),
  ch3: Math.sin(i * 0.8) * 50 + (i > 18 && i < 24 ? 90 : 0), // simulated seizure spike
  ch4: Math.sin(i * 0.3) * 25 + (Math.random() * 8 - 4),
}));

export const LiveEEGChart: React.FC = () => {
  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-md">
      <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span className="text-white font-bold">16-Channel Continuous EEG Telemetry Stream</span>
        </div>
        <span className="text-teal-400 font-bold">Sampling: 256 Hz | Bandpass: 0.5-70 Hz</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockEEGSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} domain={[-120, 120]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
            />
            <Line type="monotone" dataKey="ch1" stroke="#0d9488" strokeWidth={1.5} dot={false} name="FP1-F3" />
            <Line type="monotone" dataKey="ch2" stroke="#0ea5e9" strokeWidth={1.5} dot={false} name="F3-C3" />
            <Line type="monotone" dataKey="ch3" stroke="#ef4444" strokeWidth={2} dot={false} name="C3-P3 (Seizure Spike)" />
            <Line type="monotone" dataKey="ch4" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="P3-O1" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
