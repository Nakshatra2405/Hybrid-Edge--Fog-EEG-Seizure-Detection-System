import { Patient } from '../types/patient';
import { UserProfile } from '../types/rbac';

export const getScopedPatients = (user: UserProfile | null, patients: Patient[]): Patient[] => {
  if (!user) return [];

  // Backend C# API at /api/v1/patients is the single source of truth for role-based scoping:
  // - Doctors receive only their assigned patients
  // - Nurses receive only their floor's patients
  // - Admins receive all hospital patients
  // - Technicians receive 0 patients (HIPAA PII protection)
  if (user.role === 'TECHNICIAN') {
    return [];
  }

  return patients;
};

