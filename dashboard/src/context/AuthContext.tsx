import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types/rbac';

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  setUserRole: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let errorMsg = 'Invalid clinical credentials';
      try {
        const errorData = await response.json();
        if (errorData.message) errorMsg = errorData.message;
      } catch {
        // Fallback
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const profile: UserProfile = {
      id: data.user.id,
      name: data.user.fullName,
      email: data.user.email,
      role: data.user.role as UserRole,
      department: data.user.department || '',
      avatarUrl: data.user.avatarUrl,
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

    localStorage.setItem('auth_token', data.accessToken);
    localStorage.setItem('auth_user', JSON.stringify(profile));
    setUser(profile);
  };

  const setUserRole = (role: UserRole) => {
    if (user) {
      const updated = { ...user, role };
      setUser(updated);
      localStorage.setItem('auth_user', JSON.stringify(updated));
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, setUserRole, logout }}>
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
