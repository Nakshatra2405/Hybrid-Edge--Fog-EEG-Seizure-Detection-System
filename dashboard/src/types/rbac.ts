export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'TECHNICIAN';

export interface UserPermission {
  action: 'READ' | 'WRITE' | 'DELETE' | 'DISCHARGE' | 'CALL_CODE' | 'MANAGE_STAFF' | 'DEPLOY_MODEL';
  resource: 'PATIENTS' | 'TELEMETRY' | 'METRICS' | 'STAFF' | 'SETTINGS';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  permissions: UserPermission[];
}
