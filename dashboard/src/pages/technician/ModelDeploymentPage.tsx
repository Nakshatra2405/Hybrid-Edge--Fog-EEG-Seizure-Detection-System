import React, { useState } from 'react';
import { TrainedModelVersion } from '../../types/telemetry';
import { 
  UploadCloud, 
  Radio, 
  Cpu, 
  BarChart2, 
  TrendingUp, 
  Layers 
} from 'lucide-react';

interface ModelDeploymentPageProps {
  modelVersions: TrainedModelVersion[];
  onDeployModelToEdge: (id: string) => void;
}

export const ModelDeploymentPage: React.FC<ModelDeploymentPageProps> = ({
  modelVersions,
  onDeployModelToEdge,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(modelVersions[0]?.id || '');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  const selectedModel = modelVersions.find((m) => m.id === selectedModelId) || modelVersions[0];

  const handleUploadToEdge = (id: string) => {
    setIsDeploying(true);
    setTimeout(() => {
      onDeployModelToEdge(id);
      setIsDeploying(false);
      alert(`🚀 SUCCESS! Model "${selectedModel?.versionName}" uploaded & synchronized across 42 Edge Nodes!`);
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Title Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Model Upload & Edge Device OTA Deployment</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Catalog of Trained Model Versions & OTA Firmware Push to Wearable Edge Nodes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Version Catalog Table */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-fit">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Trained Model Version Catalog</span>
            <span className="text-slate-500 font-mono text-[11px]">Select version</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
            {modelVersions.map((model) => {
              const isSelected = selectedModel?.id === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`p-4 transition-colors cursor-pointer flex flex-col gap-2 text-xs ${
                    isSelected ? 'bg-teal-50/80 border-l-4 border-teal-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{model.versionName}</span>
                    {model.isDeployed && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-300 flex items-center gap-1">
                        <Radio className="w-3 h-3 text-emerald-600 animate-ping" /> ACTIVE ON EDGE
                      </span>
                    )}
                  </div>

                  <p className="text-slate-500 text-[11px]">
                    Trained: <span className="font-mono text-slate-700">{model.trainedDate}</span> by {model.trainedBy}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] font-mono pt-1">
                    <div>Acc: <strong className="text-teal-700">{model.accuracy}%</strong></div>
                    <div>Prec: <strong className="text-sky-700">{model.precision}%</strong></div>
                    <div>Rec: <strong className="text-emerald-700">{model.recall}%</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Model Metrics & Evaluation matching Training Page */}
        {selectedModel && (
          <div className="lg:col-span-2 space-y-6">
            {/* Model Title & Upload Action Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-teal-600" /> {selectedModel.versionName}
                  </h3>
                  {selectedModel.isDeployed && (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-300">
                      Active Edge Version
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Trained on {selectedModel.sampleCount} Doctor-Approved Datasets by {selectedModel.trainedBy} ({selectedModel.trainedDate})
                </p>
              </div>

              {/* Upload to Edge Button */}
              <button
                onClick={() => handleUploadToEdge(selectedModel.id)}
                disabled={isDeploying || selectedModel.isDeployed}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 ${
                  selectedModel.isDeployed
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
              >
                <UploadCloud className="w-4.5 h-4.5" />
                {selectedModel.isDeployed
                  ? 'Active on Edge Devices'
                  : isDeploying
                  ? 'Uploading & Flashing Edge Nodes...'
                  : 'Upload to Edge Device'}
              </button>
            </div>

            {/* KPI Stat Cards Grid matching Training Page */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Accuracy</span>
                <h4 className="text-2xl font-extrabold text-teal-700 mt-1">{selectedModel.accuracy}%</h4>
                <p className="text-[10px] text-teal-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Tested Benchmark
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Precision</span>
                <h4 className="text-2xl font-extrabold text-sky-700 mt-1">{selectedModel.precision}%</h4>
                <p className="text-[10px] text-sky-600 mt-1">Seizure Specificity</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Recall</span>
                <h4 className="text-2xl font-extrabold text-emerald-700 mt-1">{selectedModel.recall}%</h4>
                <p className="text-[10px] text-emerald-600 mt-1">Sensitivity Rate</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">F1 Score</span>
                <h4 className="text-2xl font-extrabold text-purple-700 mt-1">{selectedModel.f1Score}%</h4>
                <p className="text-[10px] text-purple-600 mt-1">Harmonic Score</p>
              </div>
            </div>

            {/* Confusion Matrix Grid Panel matching Training Page */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart2 className="w-4.5 h-4.5 text-teal-600" /> Version Benchmark Confusion Matrix
              </h3>

              <div className="max-w-md mx-auto p-4 bg-slate-900 rounded-xl text-white font-mono text-center space-y-3">
                <p className="text-xs text-teal-400 font-bold uppercase tracking-wider">
                  {selectedModel.versionName} Evaluation Slices
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-teal-950 border border-teal-500/30 rounded-lg">
                    <span className="text-[10px] text-teal-400 block uppercase">True Positive (TP)</span>
                    <span className="text-xl font-bold text-teal-200">{selectedModel.confusionMatrix.truePositive}</span>
                  </div>
                  <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg">
                    <span className="text-[10px] text-red-400 block uppercase">False Positive (FP)</span>
                    <span className="text-xl font-bold text-red-300">{selectedModel.confusionMatrix.falsePositive}</span>
                  </div>
                  <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg">
                    <span className="text-[10px] text-amber-400 block uppercase">False Negative (FN)</span>
                    <span className="text-xl font-bold text-amber-300">{selectedModel.confusionMatrix.falseNegative}</span>
                  </div>
                  <div className="p-3 bg-emerald-950 border border-emerald-500/30 rounded-lg">
                    <span className="text-[10px] text-emerald-400 block uppercase">True Negative (TN)</span>
                    <span className="text-xl font-bold text-emerald-200">{selectedModel.confusionMatrix.trueNegative}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
