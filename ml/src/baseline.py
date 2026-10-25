"""
Classical Machine Learning Baseline Pipeline
Extracts spectral bandpower (Welch) and Hjorth parameters from EEG windows
and trains an interpretable Random Forest classifier as an academic benchmark.
"""

import json
from pathlib import Path
import numpy as np
import scipy.signal as signal
from scipy.stats import kurtosis, skew
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import joblib

from ml.src.config import TARGET_FS, MODELS_DIR, REPORTS_DIR


def extract_eeg_features(window_1d, fs=TARGET_FS):
    """
    Extracts 9 classical domain-specific EEG features from a 1D window:
    - 5 spectral bandpowers (Delta, Theta, Alpha, Beta, Gamma)
    - 3 Hjorth parameters (Activity, Mobility, Complexity)
    - 1 higher-order moment (Kurtosis)
    """
    # 1. Welch Periodogram for Bandpowers
    freqs, psd = signal.welch(window_1d, fs=fs, nperseg=min(len(window_1d), int(fs)))
    
    def bandpower(f_low, f_high):
        mask = (freqs >= f_low) & (freqs < f_high)
        if not np.any(mask):
            return 0.0
        return float(np.trapz(psd[mask], freqs[mask]))

    bp_delta = bandpower(0.5, 4.0)
    bp_theta = bandpower(4.0, 8.0)
    bp_alpha = bandpower(8.0, 12.0)
    bp_beta = bandpower(12.0, 30.0)
    bp_gamma = bandpower(30.0, 35.0)

    # 2. Hjorth Parameters
    activity = float(np.var(window_1d))
    diff1 = np.diff(window_1d)
    var_diff1 = np.var(diff1)
    mobility = float(np.sqrt(var_diff1 / (activity + 1e-12)))

    diff2 = np.diff(diff1)
    var_diff2 = np.var(diff2)
    complexity = float(np.sqrt(var_diff2 / (var_diff1 + 1e-12)) / (mobility + 1e-12))

    # 3. Statistical Moment
    kurt = float(kurtosis(window_1d))

    return [
        bp_delta, bp_theta, bp_alpha, bp_beta, bp_gamma,
        activity, mobility, complexity, kurt
    ]


def extract_features_dataset(X):
    """
    Extracts features for a batch of windows with shape (N, 1, 256, 1).
    """
    N = len(X)
    feats = []
    for i in range(N):
        w = X[i].squeeze()
        feats.append(extract_eeg_features(w))
    return np.array(feats, dtype=np.float32)


def train_baseline_model(X_train, y_train, X_val, y_val):
    """
    Trains and validates a Random Forest baseline on engineered EEG features.
    """
    print("[*] Extracting features for Classical ML Baseline...")
    feat_train = extract_features_dataset(X_train)
    feat_val = extract_features_dataset(X_val)

    # Class-weighted Random Forest to manage imbalance
    clf = RandomForestClassifier(
        n_estimators=50,
        max_depth=8,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(feat_train, y_train)

    # Evaluate on Validation set
    y_pred = clf.predict(feat_val)
    acc = float(accuracy_score(y_val, y_pred))
    prec, rec, f1, _ = precision_recall_fscore_support(y_val, y_pred, average="binary", zero_division=0)
    
    cm = confusion_matrix(y_val, y_pred)
    tn = int(cm[0, 0]) if cm.shape == (2, 2) else 0
    fp = int(cm[0, 1]) if cm.shape == (2, 2) else 0
    fn = int(cm[1, 0]) if cm.shape == (2, 2) else 0
    tp = int(cm[1, 1]) if cm.shape == (2, 2) else int(cm[0, 0])

    metrics = {
        "model_type": "RandomForest_Baseline",
        "sample_count": len(y_val),
        "accuracy": round(acc * 100, 2),
        "precision": round(float(prec) * 100, 2),
        "recall": round(float(rec) * 100, 2),
        "f1_score": round(float(f1) * 100, 2),
        "true_positive": tp,
        "false_positive": fp,
        "true_negative": tn,
        "false_negative": fn,
    }

    # Save model and report
    joblib.dump(clf, MODELS_DIR / "baseline_rf.joblib")
    with open(REPORTS_DIR / "baseline_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"[OK] Baseline trained: Acc={metrics['accuracy']}%, F1={metrics['f1_score']}%, Recall={metrics['recall']}%")
    return clf, metrics
