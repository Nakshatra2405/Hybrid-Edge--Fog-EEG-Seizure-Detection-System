import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types/rbac';

interface AuthContextType {
  user: UserProfile | null;
  setUserRole: (role: UserRole) => void;
  logout: () => void;
}

const defaultAdminUser: UserProfile = {
  id: 'usr-001',
  name: 'Dr. Sarah Chen',
  email: 'sarah.chen@hospital.org',
  role: 'ADMIN',
  department: 'Chief Neurologist / System Admin',
  avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150',
  permissions: [
    { action: 'READ', resource: 'PATIENTS' },
    { action: 'WRITE', resource: 'PATIENTS' },
    { action: 'DELETE', resource: 'PATIENTS' },
    { action: 'DISCHARGE', resource: 'PATIENTS' },
    { action: 'CALL_CODE', resource: 'TELEMETRY' },
    { action: 'MANAGE_STAFF', resource: 'STAFF' },
    { action: 'DEPLOY_MODEL', resource: 'SETTINGS' },
  ],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(defaultAdminUser);

  const setUserRole = (role: UserRole) => {
    if (!user) return;
    setUser({ ...user, role });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUserRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
