import React, { useState } from 'react';
import { EEGSessionRecord, TrainedModelVersion } from '../../types/telemetry';
import { 
  BrainCircuit, 
  Play, 
  CheckCircle, 
  Plus, 
  X, 
  BarChart2, 
  Layers, 
  Zap, 
  ShieldCheck, 
  TrendingUp,
  Cpu
} from 'lucide-react';

interface ModelTrainingPageProps {
  queuedSamples: EEGSessionRecord[];
  onAddNewTrainedModel: (newModel: TrainedModelVersion) => void;
}

export const ModelTrainingPage: React.FC<ModelTrainingPageProps> = ({
  queuedSamples,
  onAddNewTrainedModel,
}) => {
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [hasTrained, setHasTrained] = useState<boolean>(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(false);
  const [modelVersionName, setModelVersionName] = useState<string>('AISeizureNet-v4.9-int8.tflite');

  // Simulated metrics obtained from model training evaluation
  const [evaluationMetrics, setEvaluationMetrics] = useState({
    accuracy: 98.6,
    precision: 98.2,
    recall: 98.4,
    f1Score: 98.3,
    confusionMatrix: {
      truePositive: 428,
      falsePositive: 7,
      trueNegative: 1280,
      falseNegative: 5,
    },
  });

  const handleRunTraining = () => {
    if (queuedSamples.length === 0) {
      alert('⚠️ No samples added for training yet. Go to Data Review & Samples page and click "Add for Training" first!');
      return;
    }

    setIsTraining(true);
    setTimeout(() => {
      setIsTraining(false);
      setHasTrained(true);
      alert('✅ Model Retraining Completed Successfully! Evaluated metrics & confusion matrix are ready below.');
    }, 2500);
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    const newModel: TrainedModelVersion = {
      id: `mod-${Date.now()}`,
      versionName: modelVersionName || 'AISeizureNet-v4.9-int8.tflite',
      trainedDate: new Date().toISOString().split('T')[0],
      trainedBy: 'Alex Rivera (BME Technician)',
      sampleCount: queuedSamples.length,
      accuracy: evaluationMetrics.accuracy,
      precision: evaluationMetrics.precision,
      recall: evaluationMetrics.recall,
      f1Score: evaluationMetrics.f1Score,
      confusionMatrix: evaluationMetrics.confusionMatrix,
      isDeployed: false,
    };

    onAddNewTrainedModel(newModel);
    setIsNameModalOpen(false);
    alert(`🎉 Model "${newModel.versionName}" added to the Version Catalog! Redirect to Model Upload & Edge OTA to deploy.`);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Title Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">AI Model Training & Benchmark Evaluation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Retrain AISeizureNet Quantized Model on Doctor-Approved Datasets & Benchmark Evaluation Metrics
          </p>
        </div>

        {/* Action: Run Training */}
        <button
          onClick={handleRunTraining}
          disabled={isTraining || queuedSamples.length === 0}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          {isTraining ? 'Training AISeizureNet Model...' : 'Train Model Now'}
        </button>
      </div>

      {/* Added Samples Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600" /> Training Dataset Batches ({queuedSamples.length} Sessions)
          </h3>
          <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            Total Slices: {queuedSamples.length * 691200} Data Points
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {queuedSamples.length === 0 ? (
            <p className="text-xs text-slate-400 col-span-full">No samples added yet. Go to Data Review page.</p>
          ) : (
            queuedSamples.map((s) => (
              <div key={s.sessionId} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 font-mono">
                <p className="font-bold text-teal-700">{s.sessionId}</p>
                <p className="text-slate-600 font-sans">{s.classification}</p>
                <p className="text-[10px] text-slate-400">{s.edgeNode}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Model Evaluation & Confusion Matrix Panel (Shown after training) */}
      {hasTrained && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Accuracy</span>
              <h4 className="text-2xl font-extrabold text-teal-700 mt-1">{evaluationMetrics.accuracy}%</h4>
              <p className="text-[10px] text-teal-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +0.2% vs v4.8
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Precision</span>
              <h4 className="text-2xl font-extrabold text-sky-700 mt-1">{evaluationMetrics.precision}%</h4>
              <p className="text-[10px] text-sky-600 mt-1">High Seizure Specificity</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Recall</span>
              <h4 className="text-2xl font-extrabold text-emerald-700 mt-1">{evaluationMetrics.recall}%</h4>
              <p className="text-[10px] text-emerald-600 mt-1">Low False Negatives</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">F1 Score</span>
              <h4 className="text-2xl font-extrabold text-purple-700 mt-1">{evaluationMetrics.f1Score}%</h4>
              <p className="text-[10px] text-purple-600 mt-1">Harmonic Mean Optimal</p>
            </div>
          </div>

          {/* Interactive Confusion Matrix Grid */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart2 className="w-4.5 h-4.5 text-teal-600" /> Model Evaluation Confusion Matrix
              </h3>
              <button
                onClick={() => setIsNameModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Model to Version Catalog
              </button>
            </div>

            <div className="max-w-lg mx-auto p-4 bg-slate-900 rounded-xl text-white font-mono text-center space-y-3">
              <p className="text-xs text-teal-400 font-bold uppercase tracking-wider">Seizure Detection Confusion Matrix</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-teal-950 border border-teal-500/30 rounded-lg">
                  <span className="text-[10px] text-teal-400 block uppercase">True Positive (TP)</span>
                  <span className="text-xl font-bold text-teal-200">{evaluationMetrics.confusionMatrix.truePositive}</span>
                </div>
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg">
                  <span className="text-[10px] text-red-400 block uppercase">False Positive (FP)</span>
                  <span className="text-xl font-bold text-red-300">{evaluationMetrics.confusionMatrix.falsePositive}</span>
                </div>
                <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg">
                  <span className="text-[10px] text-amber-400 block uppercase">False Negative (FN)</span>
                  <span className="text-xl font-bold text-amber-300">{evaluationMetrics.confusionMatrix.falseNegative}</span>
                </div>
                <div className="p-3 bg-emerald-950 border border-emerald-500/30 rounded-lg">
                  <span className="text-[10px] text-emerald-400 block uppercase">True Negative (TN)</span>
                  <span className="text-xl font-bold text-emerald-200">{evaluationMetrics.confusionMatrix.trueNegative}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Model Name Modal */}
      {isNameModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Assign Model Version Name</h3>
              <button onClick={() => setIsNameModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModel} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Model Version Name *</label>
                <input
                  required
                  type="text"
                  value={modelVersionName}
                  onChange={(e) => setModelVersionName(e.target.value)}
                  placeholder="e.g. AISeizureNet-v4.9-int8.tflite"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 font-mono text-[11px] text-slate-600">
                <p>Accuracy: <strong>{evaluationMetrics.accuracy}%</strong></p>
                <p>Precision: <strong>{evaluationMetrics.precision}%</strong></p>
                <p>Recall: <strong>{evaluationMetrics.recall}%</strong></p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Save to Version Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
