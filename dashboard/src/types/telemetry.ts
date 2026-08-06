export interface EEGDataPoint {
  time: string;
  ch1: number;
  ch2: number;
  ch3: number;
  ch4: number;
  confidence: number;
}

export interface TelemetryEvent {
  id: string;
  patientId?: string;
  patientName?: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  type: 'seizure_alert' | 'system_update' | 'admission' | 'low_battery' | 'user_access' | 'disconnect';
}
