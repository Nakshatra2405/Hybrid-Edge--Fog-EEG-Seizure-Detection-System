import { Patient } from '../types/patient';
import { EEGSessionRecord, TrainedModelVersion, AdminRequestNotification, TelemetryEvent } from '../types/telemetry';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseJsonSafe = async (res: Response): Promise<any> => {
  const text = await res.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const api = {
  // 1. Patients API
  async getPatients(): Promise<Patient[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/patients`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch patients');
      const data = await parseJsonSafe(res);
      if (!Array.isArray(data)) return [];

      return data.map((p: any) => ({
        id: p.mrn || p.id,
        name: p.name,
        age: p.age,
        dob: p.dob,
        gender: p.gender,
        bloodGroup: p.bloodGroup || 'O+',
        status: p.status,
        room: p.room,
        bed: `Bed ${p.room}-A`,
        floor: p.floor,
        doctor: p.doctorName,
        staff: p.nurseName || 'Ward Nurse',
        timeAdded: p.timeAdded,
        rawTimestamp: Date.now(),
        battery: p.battery || '94%',
        node: p.node || 'Node-01',
        vitals: {
          heartRate: 72 + Math.floor(Math.random() * 15),
          spo2: 98,
          bp: '120/80',
          eegAmplitude: 45.2,
          seizureProbability: p.seizureProbability || 0.05,
        },
      }));
    } catch (err) {
      console.error('API Error in getPatients:', err);
      return [];
    }
  },

  // 2. Clinical EEG Sessions
  async getClinicalSessions(): Promise<EEGSessionRecord[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/clinical-records`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch clinical records');
      const data = await parseJsonSafe(res);
      if (!Array.isArray(data)) return [];

      return data.map((s: any) => ({
        sessionId: s.sessionId,
        patientId: s.patientId,
        patientName: s.patientName,
        doctorName: s.doctorName,
        startTimestamp: s.startTimestamp,
        endTimestamp: s.endTimestamp,
        duration: s.duration,
        edgeNode: s.edgeNode,
        maxSeizureProbability: s.maxSeizureProbability,
        classification: s.classification,
        dataPointsCount: s.dataPointsCount,
        isApprovedForTraining: s.isApprovedForTraining,
        addedToTechnicianQueue: s.technicianStatus === 'Added to Training',
        technicianStatus: s.technicianStatus,
        approvedTimestamp: s.approvedTimestamp,
      }));
    } catch (err) {
      console.error('API Error in getClinicalSessions:', err);
      return [];
    }
  },

  // Approve session
  async approveSession(sessionId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/clinical-records/${sessionId}/approve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('API Error in approveSession:', err);
      return false;
    }
  },

  // Send approved sessions for training
  async sendDataForTraining(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/clinical-records/send-for-training`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in sendDataForTraining:', err);
      return null;
    }
  },

  // 3. AI Models
  async getModels(): Promise<TrainedModelVersion[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/models`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = await parseJsonSafe(res);
      if (!Array.isArray(data)) return [];

      return data.map((m: any) => ({
        id: m.id,
        versionName: m.versionName,
        trainedDate: m.trainedDate,
        trainedBy: m.trainedBy,
        sampleCount: m.sampleCount,
        accuracy: m.accuracy,
        precision: m.precision,
        recall: m.recall,
        f1Score: m.f1Score,
        confusionMatrix: m.confusionMatrix,
        isDeployed: m.isDeployed,
        deployedDate: m.deployedDate,
      }));
    } catch (err) {
      console.error('API Error in getModels:', err);
      return [];
    }
  },

  // Trigger Training
  async triggerTraining(versionName: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/models/trigger-training`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ versionName }),
      });
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in triggerTraining:', err);
      return null;
    }
  },

  // Deploy Model OTA
  async deployModel(modelId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/models/${modelId}/deploy`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ targetNode: 'ALL' }),
      });
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in deployModel:', err);
      return null;
    }
  },

  // 4. Notifications
  async getNotifications(): Promise<AdminRequestNotification[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await parseJsonSafe(res);
      if (!Array.isArray(data)) return [];

      return data.map((n: any) => ({
        id: n.id,
        type: n.type,
        patientId: n.patientId,
        patientName: n.patientName,
        requestedByDoctor: n.requestedByDoctor,
        room: n.requestedRoom,
        timestamp: n.timestamp,
        details: n.details,
        status: n.status,
      }));
    } catch (err) {
      console.error('API Error in getNotifications:', err);
      return [];
    }
  },

  // Request Admission
  async requestAdmission(patientName: string, requestedRoom: string, details: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/admission-request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ patientName, requestedRoom, details }),
      });
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in requestAdmission:', err);
      return null;
    }
  },

  // Request Discharge
  async requestDischarge(patientId: string, details: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/discharge-request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ patientId, details }),
      });
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in requestDischarge:', err);
      return null;
    }
  },

  // 5. Staff Management API
  async getStaff(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch staff list');
      const data = await parseJsonSafe(res);
      if (!Array.isArray(data)) return [];

      return data.map((s: any) => ({
        id: s.id,
        userId: s.userId,
        name: s.fullName,
        email: s.email,
        role: s.role,
        department: s.department || 'General',
        licenseNumber: s.licenseNumber,
        assignedFloor: s.assignedFloor,
        joinedDate: s.joinedDate,
        status: s.isActive ? 'ACTIVE' : 'SUSPENDED',
      }));
    } catch (err) {
      console.error('API Error in getStaff:', err);
      return [];
    }
  },

  async createStaff(data: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    department?: string;
    licenseNumber?: string;
    assignedFloor?: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return { success: false, message: 'Authentication required. Please log in as an Admin.' };
      }

      const res = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await parseJsonSafe(res);
      if (!res.ok) {
        if (res.status === 401) {
          return { success: false, message: resData.message || 'Session expired or invalid token. Please log in again.' };
        }
        if (res.status === 403) {
          return { success: false, message: 'Forbidden. Only Hospital Administrators can provision staff members.' };
        }
        return { success: false, message: resData.message || `Server returned error (${res.status})` };
      }
      return { success: true, message: resData.message || 'Staff member provisioned successfully' };
    } catch (err: any) {
      console.error('API Error in createStaff:', err);
      return { success: false, message: err.message || 'Network communication error' };
    }
  },


  async updateStaff(userId: string, data: {
    fullName?: string;
    role?: string;
    department?: string;
    licenseNumber?: string;
    assignedFloor?: string;
    password?: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return { success: false, message: 'Authentication required. Please log in as an Admin.' };
      }

      const res = await fetch(`${API_BASE_URL}/staff/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const resData = await parseJsonSafe(res);
      if (!res.ok) {
        return { success: false, message: resData.message || `Server returned error (${res.status})` };
      }
      return { success: true, message: resData.message || 'Staff member updated successfully' };
    } catch (err: any) {
      console.error('API Error in updateStaff:', err);
      return { success: false, message: err.message || 'Network communication error' };
    }
  },

  async updateStaffRole(userId: string, role: string, department?: string, assignedFloor?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role, department, assignedFloor }),
      });
      return res.ok;
    } catch (err) {
      console.error('API Error in updateStaffRole:', err);
      return false;
    }
  },


  async deactivateStaff(userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('API Error in deactivateStaff:', err);
      return false;
    }
  },
};



