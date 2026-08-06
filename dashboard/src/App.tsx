import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RBACProvider } from './context/RBACContext';
import { MainLayout } from './components/layout/MainLayout';

import { initialMockPatients, initialTelemetryEvents } from './services/mockApi';
import { Patient } from './types/patient';
import { TelemetryEvent } from './types/telemetry';

import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { MetricsDashboardPage } from './pages/MetricsDashboardPage';
import { PatientManagementPage } from './pages/PatientManagementPage';
import { ClinicalRecordsPage } from './pages/ClinicalRecordsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PatientManagementFixedPage } from './pages/PatientManagementFixedPage';
import { StaffManagementRBACPage } from './pages/StaffManagementRBACPage';

export const AppContent: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(initialMockPatients);
  const [events, setEvents] = useState<TelemetryEvent[]>(initialTelemetryEvents);
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

  const handleDischargePatient = (id: string) => {
    setPatients(
      patients.map((p) => (p.id === id ? { ...p, status: 'Discharged' as const } : p))
    );
    alert(`✅ Patient ${id} has been discharged from active monitoring.`);
  };

  return (
    <MainLayout
      patientCount={patients.length}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <Routes>
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
              onDischargePatient={handleDischargePatient}
            />
          }
        />
        <Route path="/metrics" element={<MetricsDashboardPage />} />
        <Route
          path="/patients"
          element={
            <PatientManagementPage
              patients={patients}
              onAddPatient={handleAddPatient}
              onDischargePatient={handleDischargePatient}
            />
          }
        />
        <Route
          path="/patients-fixed"
          element={<PatientManagementFixedPage patients={patients} />}
        />
        <Route path="/records" element={<ClinicalRecordsPage />} />
        <Route path="/staff-rbac" element={<StaffManagementRBACPage />} />
        <Route path="/settings" element={<SettingsPage />} />
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
