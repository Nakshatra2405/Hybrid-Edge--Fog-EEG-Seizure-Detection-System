import React, { ReactNode } from 'react';
import { useRBAC } from '../../context/RBACContext';
import { UserRole } from '../../types/rbac';

interface PermissionGuardProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ roles, children, fallback = null }) => {
  const { hasRole } = useRBAC();

  if (!hasRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
