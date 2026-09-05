import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  {
    id: 'mod-v4.7',
    versionName: 'AISeizureNet-v4.7-fp16.tflite',
    trainedDate: '2026-08-15',
    trainedBy: 'Alex Rivera (BME Technician)',
    sampleCount: 10,
    accuracy: 97.2,
    precision: 96.8,
    recall: 97.0,
    f1Score: 96.9,
    confusionMatrix: { truePositive: 395, falsePositive: 12, trueNegative: 1210, falseNegative: 11 },
    isDeployed: false,
  },
];

export const AppContent: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'ADMIN';

  const [patients, setPatients] = useState<Patient[]>(initialMockPatients);
  const [events, setEvents] = useState<TelemetryEvent[]>(initialTelemetryEvents);
  const [sessionRecords, setSessionRecords] = useState<EEGSessionRecord[]>(initialSessionRecords);
  const [modelVersions, setModelVersions] = useState<TrainedModelVersion[]>(initialModelVersions);
  const [adminRequests, setAdminRequests] = useState<AdminRequestNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleCallCode = (p: Patient) => {
    alert(`🚨 CODE BLUE DISPATCHED!\n\nPatient: ${p.name} (${p.id})\nLocation: ${p.room}\n\nICU Crash Cart Team & On-Call Physician notified!`);
  };

  const handleNotifyDoctor = (p: Patient) => {
    alert(`🔔 URGENT TELEMETRY NOTIFICATION DISPATCHED!\n\nPatient: ${p.name}\nDoctor: ${p.doctor}\n\nNotification sent to physician mobile app.`);
  };

  const handleAddPatient = (newPatient: Patient) => {
    setPatients([newPatient, ...patients]);
    alert(`✅ Patient ${newPatient.name} (${newPatient.id}) registered & telemetry initialized on ${newPatient.node}!`);
  };

  const handleRequestAdmission = (name: string, room: string, nurseName: string, details: string) => {
    const newReq: AdminRequestNotification = {
      id: `req-adm-${Date.now()}`,
      type: 'admission_request',
      patientName: name,
      requestedByDoctor: user?.name || 'Dr. Sarah Chen',
      room: `${room} (Nurse: ${nurseName})`,
      timestamp: 'Just now',
      details,
      status: 'PENDING',
    };
    setAdminRequests([newReq, ...adminRequests]);
    alert(`📩 Patient Admission Request for "${name}" (Assigned Nurse: ${nurseName}) submitted to System Admin!`);
  };

  const handleDischargePatient = (id: string) => {
    setPatients(
      patients.map((p) => (p.id === id ? { ...p, status: 'Discharged' as const } : p))
    );
    alert(`✅ Patient ${id} has been discharged from active monitoring.`);
  };

  const handleRequestDischarge = (p: Patient) => {
    const newReq: AdminRequestNotification = {
      id: `req-dis-${Date.now()}`,
      type: 'discharge_request',
      patientId: p.id,
      patientName: p.name,
      requestedByDoctor: user?.name || 'Dr. Sarah Chen',
      room: p.room,
      timestamp: 'Just now',
      details: `Physician requested discharge for ${p.name} (${p.id}).`,
      status: 'PENDING',
    };
    setAdminRequests([newReq, ...adminRequests]);
    alert(`📩 Discharge Request for "${p.name}" (${p.id}) submitted to System Admin!`);
  };

  // Doctor approves session for training
  const handleToggleApproveSession = (sessionId: string) => {
    setSessionRecords((prev) =>
      prev.map((rec) => {
        if (rec.sessionId === sessionId) {
          const nextState = !rec.isApprovedForTraining;
          if (nextState) {
            alert(`🧠 EEG Session ${sessionId} approved by Doctor!\n\nIt is now reflected in your Settings page queue to send to the Technician.`);
          }
          return {
            ...rec,
            isApprovedForTraining: nextState,
            approvedTimestamp: nextState ? 'Just now' : 'Pending',
          };
        }
        return rec;
      })
    );
  };

  // Doctor submits approved sessions to Technician
  const handleSendAllApprovedForTraining = () => {
    setSessionRecords((prev) =>
      prev.map((rec) => {
        if (rec.isApprovedForTraining) {
          return { ...rec, addedToTechnicianQueue: false };
        }
        return rec;
      })
    );
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
  const handleDeployModelToEdge = (id: string) => {
    setModelVersions(
      modelVersions.map((m) => ({ ...m, isDeployed: m.id === id }))
    );
  };

  if (!user) {
    return <LoginPage onLoginSuccess={() => {}} />;
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
