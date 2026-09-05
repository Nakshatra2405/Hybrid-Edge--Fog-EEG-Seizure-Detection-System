import { Patient } from '../types/patient';
import { UserProfile } from '../types/rbac';

export const getScopedPatients = (user: UserProfile | null, patients: Patient[]): Patient[] => {
  if (!user) return [];

  if (user.role === 'ADMIN') {
    return patients;
  }

  if (user.role === 'DOCTOR') {
    // Strictly scope patients assigned to this doctor
    const docName = user.name.toLowerCase();
    const docParts = docName.split(' ').filter((p) => p !== 'dr.' && p !== 'dr');
    const lastName = docParts.pop() || docName;

    return patients.filter((p) => {
      const pDoc = p.doctor.toLowerCase();
      return pDoc.includes(lastName) || docName.includes(pDoc) || pDoc.includes(docName);
    });
  }

  if (user.role === 'NURSE') {
    // Return patients on allotted floor e.g. Room 400 series / ICU Floor 4
    return patients.filter((p) => p.room.includes('40') || p.room.includes('ICU'));
  }

  if (user.role === 'TECHNICIAN') {
    return []; // Technician has zero patient visibility
  }

  return patients;
};
