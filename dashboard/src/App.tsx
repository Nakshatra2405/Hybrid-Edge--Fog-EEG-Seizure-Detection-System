import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RBACProvider } from './context/RBACContext';
import { MainLayout } from './components/layout/MainLayout';

import { initialMockPatients, initialTelemetryEvents, initialSessionRecords } from './services/mockApi';
import { Patient } from './types/patient';
import { TelemetryEvent, EEGSessionRecord, TrainedModelVersion, AdminRequestNotification } from './types/telemetry';

import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { MetricsDashboardPage } from './pages/MetricsDashboardPage';
import { PatientManagementPage } from './pages/PatientManagementPage';
import { ClinicalRecordsPage } from './pages/ClinicalRecordsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PatientManagementFixedPage } from './pages/PatientManagementFixedPage';
import { StaffManagementRBACPage } from './pages/StaffManagementRBACPage';
import { LoginPage } from './pages/LoginPage';

// Dedicated Technician Pages
import { TechnicianDataReviewPage } from './pages/technician/TechnicianDataReviewPage';
import { ModelTrainingPage } from './pages/technician/ModelTrainingPage';
import { ModelDeploymentPage } from './pages/technician/ModelDeploymentPage';

import { api } from './services/apiClient';

const initialModelVersions: TrainedModelVersion[] = [
  {
    id: 'mod-v4.8',
    versionName: 'AISeizureNet-v4.8-int8.tflite',
    trainedDate: '2026-08-28',
    trainedBy: 'Alex Rivera (BME Technician)',
    sampleCount: 14,
    accuracy: 98.4,
    precision: 97.9,
    recall: 98.1,
    f1Score: 98.0,
    confusionMatrix: { truePositive: 412, falsePositive: 8, trueNegative: 1240, falseNegative: 6 },
    isDeployed: true,
  },
];

export const AppContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'ADMIN';

  React.useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [events, setEvents] = useState<TelemetryEvent[]>(initialTelemetryEvents);
  const [sessionRecords, setSessionRecords] = useState<EEGSessionRecord[]>([]);
  const [modelVersions, setModelVersions] = useState<TrainedModelVersion[]>(initialModelVersions);
  const [adminRequests, setAdminRequests] = useState<AdminRequestNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load live data from C# backend
  const loadData = React.useCallback(async () => {
    if (!user) return;

    try {
      // 1. Fetch Patients (Role-scoped by backend)
      if (role !== 'TECHNICIAN') {
        const livePatients = await api.getPatients();
        setPatients(livePatients);
      }

      // 2. Fetch Clinical Sessions (Role-scoped by backend)
      const liveSessions = await api.getClinicalSessions();
      setSessionRecords(liveSessions);

      // 3. Fetch Models
      if (role === 'TECHNICIAN' || role === 'ADMIN') {
        const liveModels = await api.getModels();
        if (liveModels && liveModels.length > 0) {
          setModelVersions(liveModels);
        }
      }

      // 4. Fetch Notifications
      const liveNotifs = await api.getNotifications();
      setAdminRequests(liveNotifs);
    } catch (err) {
      console.error('Failed to load live data from backend:', err);
    }
  }, [user, role]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCallCode = async (p: Patient) => {
    await api.callCode(p.room, p.name, `Emergency Code Blue triggered for ${p.name} in Room ${p.room}`);
    alert(`🚨 CODE BLUE DISPATCHED!\n\nPatient: ${p.name} (${p.id})\nLocation: ${p.room}\n\nICU Crash Cart Team & On-Call Physician notified!`);
    loadData();
  };

  const handleNotifyDoctor = (p: Patient) => {
    alert(`🔔 URGENT TELEMETRY NOTIFICATION DISPATCHED!\n\nPatient: ${p.name}\nDoctor: ${p.doctor}\n\nNotification sent to physician mobile app.`);
  };

  const handleAddPatient = (newPatient: Patient) => {
    setPatients([newPatient, ...patients]);
    alert(`✅ Patient ${newPatient.name} (${newPatient.id}) registered & telemetry initialized on ${newPatient.node}!`);
  };

  const handleRequestAdmission = async (name: string, room: string, nurseName: string, details: string) => {
    await api.requestAdmission(name, `${room} (Nurse: ${nurseName})`, details);
    alert(`📩 Patient Admission Request for "${name}" (Assigned Nurse: ${nurseName}) submitted to System Admin!`);
    loadData();
  };

  const handleDischargePatient = (id: string) => {
    setPatients(
      patients.map((p) => (p.id === id ? { ...p, status: 'Discharged' as const } : p))
    );
    alert(`✅ Patient ${id} has been discharged from active monitoring.`);
  };

  const handleRequestDischarge = async (p: Patient) => {
    await api.requestDischarge(p.id, `Physician requested discharge for ${p.name} (${p.id}).`);
    alert(`📩 Discharge Request for "${p.name}" (${p.id}) submitted to System Admin!`);
    loadData();
  };

  // Doctor approves session for training
  const handleToggleApproveSession = async (sessionId: string) => {
    const success = await api.approveSession(sessionId);
    if (success) {
      alert(`🧠 EEG Session ${sessionId} approved by Doctor in database!\n\nIt is now reflected in your queue to send to the Technician.`);
      loadData();
    }
  };

  // Doctor submits approved sessions to Technician
  const handleSendAllApprovedForTraining = async () => {
    await api.sendDataForTraining();
    alert('✅ Approved EEG sessions dispatched to Azure training queue in database!');
    loadData();
  };

  // Technician adds doctor-approved sample to training queue
  const handleTechnicianAddToTraining = (sessionId: string) => {
    setSessionRecords((prev) =>
      prev.map((rec) => {
        if (rec.sessionId === sessionId) {
          return { ...rec, addedToTechnicianQueue: true, technicianStatus: 'Added to Training' };
        }
        return rec;
      })
    );
    alert(`✅ Session ${sessionId} added to the Model Training Pipeline! Go to Model Training & Eval to train.`);
  };

  // Technician saves new trained model
  const handleAddNewTrainedModel = (newModel: TrainedModelVersion) => {
    setModelVersions([newModel, ...modelVersions]);
  };

  // Technician deploys model to Edge
  const handleDeployModelToEdge = async (id: string) => {
    await api.deployModel(id);
    alert('🚀 Model deployed via wireless BLE OTA to edge nodes in database!');
    loadData();
  };

  if (!user) {
    return <LoginPage onLoginSuccess={() => navigate('/')} />;
  }

  // Filter queued samples for technician training page
  const queuedTrainingSamples = sessionRecords.filter((s) => s.addedToTechnicianQueue);

  return (
    <MainLayout
      patientCount={patients.length}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <Routes>
        {/* Technican Role Dedicated Routes */}
        {role === 'TECHNICIAN' ? (
          <>
            <Route
              path="/"
              element={
                <TechnicianDataReviewPage
                  sessionRecords={sessionRecords}
                  onAddToTrainingPipeline={handleTechnicianAddToTraining}
                />
              }
            />
            <Route
              path="/technician-training"
              element={
                <ModelTrainingPage
                  queuedSamples={queuedTrainingSamples}
                  onAddNewTrainedModel={handleAddNewTrainedModel}
                />
              }
            />
            <Route
              path="/technician-deployments"
              element={
                <ModelDeploymentPage
                  modelVersions={modelVersions}
                  onDeployModelToEdge={handleDeployModelToEdge}
                />
              }
            />
            <Route path="/metrics" element={<MetricsDashboardPage />} />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  sessionRecords={sessionRecords}
                  onSendAllApprovedForTraining={handleSendAllApprovedForTraining}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          /* Clinical Roles Routes (ADMIN, DOCTOR, NURSE) */
          <>
            <Route
              path="/"
              element={
                <LiveMonitoringPage
                  patients={patients}
                  events={events}
                  searchQuery={searchQuery}
                  onCallCode={handleCallCode}
                  onNotifyDoctor={handleNotifyDoctor}
                  onAddPatient={handleAddPatient}
                  onRequestAdmission={handleRequestAdmission}
                  onDischargePatient={handleDischargePatient}
                  onRequestDischarge={handleRequestDischarge}
                />
              }
            />
            {role === 'ADMIN' && <Route path="/metrics" element={<MetricsDashboardPage />} />}
            <Route
              path="/patients"
              element={
                <PatientManagementPage
                  patients={patients}
                  onAddPatient={handleAddPatient}
                  onRequestAdmission={handleRequestAdmission}
                  onDischargePatient={handleDischargePatient}
                  onRequestDischarge={handleRequestDischarge}
                />
              }
            />
            <Route
              path="/patients-fixed"
              element={<PatientManagementFixedPage patients={patients} />}
            />
            {role === 'DOCTOR' && (
              <Route
                path="/records"
                element={
                  <ClinicalRecordsPage
                    sessionRecords={sessionRecords}
                    onToggleApproveSession={handleToggleApproveSession}
                  />
                }
              />
            )}
            {role === 'ADMIN' && <Route path="/staff-rbac" element={<StaffManagementRBACPage />} />}
            <Route
              path="/settings"
              element={
                <SettingsPage
                  sessionRecords={sessionRecords}
                  onSendAllApprovedForTraining={handleSendAllApprovedForTraining}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </MainLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RBACProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </RBACProvider>
    </AuthProvider>
  );
};

export default App;
