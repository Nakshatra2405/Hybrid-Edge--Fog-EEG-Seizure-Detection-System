import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { UserRole } from '../types/rbac';

interface RBACContextType {
  hasRole: (allowedRoles: UserRole[]) => boolean;
  canManageStaff: () => boolean;
  canDeployModel: () => boolean;
  canCallCode: () => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const RBACProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const canManageStaff = (): boolean => {
    return hasRole(['ADMIN']);
  };

  const canDeployModel = (): boolean => {
    return hasRole(['ADMIN', 'TECHNICIAN']);
  };

  const canCallCode = (): boolean => {
    return hasRole(['ADMIN', 'DOCTOR', 'NURSE']);
  };

  return (
    <RBACContext.Provider value={{ hasRole, canManageStaff, canDeployModel, canCallCode }}>
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = (): RBACContextType => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};
