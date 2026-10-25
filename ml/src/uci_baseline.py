"""
UCI Classical Baseline Classifier (Random Forest)
Trains a balanced Random Forest model on the 178 EEG sample features
and evaluates performance on the held-out test set.
"""

import json
from pathlib import Path
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import joblib

from ml.src.config import MODELS_DIR, REPORTS_DIR, RANDOM_SEED


def train_uci_baseline(X_train, y_train, X_test, y_test):
    """
    Trains and evaluates a Random Forest baseline on UCI features.
    """
    print("[*] Training Random Forest Baseline on UCI dataset...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        class_weight="balanced",
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # Evaluate on held-out test set
    y_pred = clf.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="binary", zero_division=0)

    cm = confusion_matrix(y_test, y_pred)
    tn = int(cm[0, 0])
    fp = int(cm[0, 1])
    fn = int(cm[1, 0])
    tp = int(cm[1, 1])

    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    balanced_acc = float((rec + specificity) / 2.0)

    # Calculate model size on disk
    model_path = MODELS_DIR / "uci_baseline_rf.joblib"
    joblib.dump(clf, model_path)
    model_size_kb = round(model_path.stat().st_size / 1024.0, 2)

    metrics = {
        "dataset": "UCI Epileptic Seizure Recognition",
        "model_name": "RandomForest_Baseline",
        "sample_count": len(y_test),
        "accuracy": round(acc * 100, 2),
        "precision": round(float(prec) * 100, 2),
        "recall_sensitivity": round(float(rec) * 100, 2),
        "specificity": round(specificity * 100, 2),
        "f1_score": round(float(f1) * 100, 2),
        "balanced_accuracy": round(balanced_acc * 100, 2),
        "true_positive": tp,
        "false_positive": fp,
        "true_negative": tn,
        "false_negative": fn,
        "confusion_matrix": [[tn, fp], [fn, tp]],
        "model_size_kb": model_size_kb,
    }

    report_path = REPORTS_DIR / "uci_baseline_metrics.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"[OK] UCI Baseline Results: Acc={metrics['accuracy']}%, F1={metrics['f1_score']}%, Sens={metrics['recall_sensitivity']}%, Spec={metrics['specificity']}%")
    return clf, metrics
