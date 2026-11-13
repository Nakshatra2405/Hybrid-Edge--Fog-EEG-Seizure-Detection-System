import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AdminRequestNotification } from '../../types/telemetry';

interface MainLayoutProps {
  children: ReactNode;
  patientCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  adminRequests: AdminRequestNotification[];
  onRefreshRequests: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  patientCount,
  searchQuery,
  onSearchChange,
  adminRequests,
  onRefreshRequests,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Header
          patientCount={patientCount}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          adminRequests={adminRequests}
          onRefreshRequests={onRefreshRequests}
        />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
