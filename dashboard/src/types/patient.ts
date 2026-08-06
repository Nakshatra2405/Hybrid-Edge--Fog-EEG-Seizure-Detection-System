export type PatientStatus = 'Critical' | 'Monitoring' | 'Stable' | 'Discharged';

export interface PatientVitals {
  heartRate: number; // bpm
  spo2: number; // %
  bp: string; // mmHg e.g. 120/80
  eegAmplitude: number; // uV
  seizureProbability: number; // 0 to 1
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  status: PatientStatus;
  room: string;
  bed: string;
  doctor: string;
  staff: string;
  timeAdded: string;
  rawTimestamp: number;
  battery: string;
  node: string;
  avatarUrl?: string;
  vitals: PatientVitals;
}
