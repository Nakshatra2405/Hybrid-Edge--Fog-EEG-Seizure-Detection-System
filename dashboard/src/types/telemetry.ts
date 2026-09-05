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

export interface EEGSessionRecord {
  sessionId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  startTimestamp: string;
  endTimestamp: string;
  duration: string;
  edgeNode: string;
  maxSeizureProbability: number;
  classification: 'Ictal Seizure Event' | 'Pre-Ictal Warning' | 'Normal Baseline';
  dataPointsCount: number;
  isApprovedForTraining?: boolean;
  addedToTechnicianQueue?: boolean;
  technicianStatus?: 'Pending Technician Review' | 'Added to Training' | 'Approved for Training' | 'Rejected';
  approvedTimestamp?: string;
}

export interface ConfusionMatrixData {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
}

export interface TrainedModelVersion {
  id: string;
  versionName: string;
  trainedDate: string;
  trainedBy: string;
  sampleCount: number;
  accuracy: number; // e.g. 98.4
  precision: number; // e.g. 97.9
  recall: number; // e.g. 98.1
  f1Score: number; // e.g. 98.0
  confusionMatrix: ConfusionMatrixData;
  isDeployed: boolean;
  deployedDate?: string;
}

export interface AdminRequestNotification {
  id: string;
  type: 'admission_request' | 'discharge_request';
  patientId?: string;
  patientName: string;
  requestedByDoctor: string;
  room?: string;
  timestamp: string;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
