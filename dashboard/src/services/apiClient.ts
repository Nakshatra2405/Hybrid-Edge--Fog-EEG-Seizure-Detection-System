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
        id: p.id || p.mrn,
        mrn: p.mrn,
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

  // Create Patient (Admit)
  async createPatient(patientData: {
    mrn: string;
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    bloodGroup?: string;
    assignedFloor: string;
    room: string;
    assignedDoctorId?: string | null;
    assignedNurseId?: string | null;
    edgeNodeId?: string | null;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(patientData),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        return { success: false, message: data.message || `Error ${res.status}` };
      }
      return { success: true, message: data.message || 'Patient admitted successfully' };
    } catch (err: any) {
      console.error('API Error in createPatient:', err);
      return { success: false, message: err.message || 'Network error' };
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

  // Get raw EEG sample waveform for clinical inspection
  async getSessionWaveform(sessionId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/clinical-records/${sessionId}/sample-waveform`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch EEG session waveform');
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in getSessionWaveform:', err);
      return null;
    }
  },

  // Export session as EDF+ standard clinical time-series file
  async exportSessionEdf(sessionId: string, fileName?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/clinical-records/${sessionId}/export-edf`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to export EDF file');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `EEG_Session_${sessionId.substring(0, 8)}.edf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    } catch (err) {
      console.error('API Error in exportSessionEdf:', err);
      return false;
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
  async requestAdmission(patientName: string, requestedRoom: string, details: string, assignedNurseId?: string | null): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/admission-request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ patientName, requestedRoom, details, assignedNurseId }),
      });
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in requestAdmission:', err);
      return null;
    }
  },

  // Call Code Blue
  async callCode(room: string, patientName?: string, details?: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/call-code`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ room, patientName, details }),
      });
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in callCode:', err);
      return null;
    }
  },

  // Resolve Notification
  async resolveNotification(id: string, status: 'APPROVED' | 'REJECTED', details?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/resolve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, details }),
      });
      return res.ok;
    } catch (err) {
      console.error('API Error in resolveNotification:', err);
      return false;
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

  // Discharge Patient (Admin Direct)
  async dischargePatient(patientId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${patientId}/discharge`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('API Error in dischargePatient:', err);
      return false;
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


  // Edge Nodes API
  async getNodes(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/edge/nodes`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch edge nodes');
      const data = await parseJsonSafe(res);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('API Error in getNodes:', err);
      return [];
    }
  },

  async getAvailableNodes(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/edge/available`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch available edge nodes');
      const data = await parseJsonSafe(res);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('API Error in getAvailableNodes:', err);
      return [];
    }
  },

  // System Metrics API
  async getMetrics(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/telemetry/metrics`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in getMetrics:', err);
      return null;
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

  // 6. NeuroShield IDS Security API (ADMIN-ONLY)
  async getSecurityIncidents(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/security/incidents`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch security incidents');
      const data = await parseJsonSafe(res);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('API Error in getSecurityIncidents:', err);
      return [];
    }
  },

  async getSecuritySummary(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/security/summary`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch security summary');
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in getSecuritySummary:', err);
      return null;
    }
  },

  async resolveSecurityIncident(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/security/incidents/${id}/resolve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.error('API Error in resolveSecurityIncident:', err);
      return false;
    }
  },

  async getSecurityConfig(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/security/config`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch security configuration');
      return await parseJsonSafe(res);
    } catch (err) {
      console.error('API Error in getSecurityConfig:', err);
      return null;
    }
  },
};



