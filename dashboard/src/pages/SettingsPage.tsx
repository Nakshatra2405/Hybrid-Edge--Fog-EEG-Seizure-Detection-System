import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRBAC } from '../context/RBACContext';
import { Settings, Shield, Sliders, Cpu, UploadCloud, CheckCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { canDeployModel } = useRBAC();
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      alert('✅ OTA Model Package (sha256-e9a8f2) successfully pushed to 42 Edge Nodes!');
      setIsDeploying(false);
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Settings & OTA Model Deployment</h2>
          <p className="text-xs text-slate-500 mt-0.5">Threshold sensitivity, RBAC policies & over-the-air TFLite model updates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> User Account Profile
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">User Name</label>
              <input type="text" value={user?.name || 'Dr. Sarah Chen'} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold" />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Active RBAC Role</label>
              <input type="text" value={user?.role || 'ADMIN'} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold" />
            </div>
          </div>
        </div>

        {/* OTA Deployment */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4" /> Edge AI Model Deployment (OTA)
          </h3>
          <p className="text-xs text-slate-600">Active Model: <strong className="text-slate-900">AISeizureNet-v4.8-int8.tflite (1.4 MB)</strong></p>
          
          {canDeployModel() ? (
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="px-4 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-lg hover:bg-teal-700 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              {isDeploying ? 'Broadcasting OTA Package...' : 'Deploy Model OTA to Edge Nodes'}
            </button>
          ) : (
            <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs font-medium border border-amber-200">
              ⚠️ Role Guard: Only ADMIN or TECHNICIAN can initiate OTA updates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
