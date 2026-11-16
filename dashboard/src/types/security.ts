export interface SecurityIncident {
  id: string;
  incidentType: 'UNKNOWN_DEVICE' | 'REPLAY_ATTACK' | 'INVALID_SIGNATURE' | 'TRAFFIC_FLOOD' | string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  deviceId: string;
  sourceIp?: string;
  sequenceNumberReceived?: number;
  expectedMinSequence?: number;
  timestampReceived: string;
  detailMessage: string;
  isResolved: boolean;
  resolvedAt?: string;
  sourceClassification?: 'PHYSICAL' | 'SIMULATOR' | 'UNTRUSTED';
}

export interface SecuritySummary {
  totalIncidents: number;
  activeIncidents: number;
  unknownDevicesIntercepted: number;
  replaysBlocked: number;
  tamperAttemptsDetected: number;
  floodsMitigated: number;
  physicalIncidents?: number;
  simulatorIncidents?: number;
  untrustedIncidents?: number;
}

export interface RateLimitProfile {
  deviceId: string;
  burstCapacity: number;
  refillRatePerSecond: number;
  classification: string;
}

export interface SecurityConfigSummary {
  defaultBurstCapacity: number;
  defaultRefillRate: number;
  ipBurstCapacity: number;
  ipRefillRate: number;
  sustainedViolationThreshold: number;
  timestampSkewSeconds: number;
  registeredProfiles: RateLimitProfile[];
}
