"""
UCI Test Set Evaluation Script
Evaluates the trained UCITinySeizureNet-1D on the held-out test set
using the frozen validation threshold.
"""

import json
from pathlib import Path
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

from ml.src.config import MODELS_DIR, REPORTS_DIR


def evaluate_uci_test_set(model, X_test, y_test, threshold=None):
    """
    Evaluates model on held-out test set and saves uci_test_report.json.
    """
    if threshold is None:
        th_file = MODELS_DIR / "uci_decision_threshold.json"
        if th_file.exists():
            with open(th_file, "r") as f:
                th_data = json.load(f)
                threshold = th_data.get("threshold", 0.50)
        else:
            threshold = 0.50

    print(f"[*] Evaluating UCITinySeizureNet-1D on Test Set with frozen threshold: {threshold}")
    probs = model.predict(X_test, verbose=0).ravel()
    preds = (probs >= threshold).astype(int)

    acc = float(accuracy_score(y_test, preds))
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, preds, average="binary", zero_division=0)

    cm = confusion_matrix(y_test, preds)
    tn = int(cm[0, 0])
    fp = int(cm[0, 1])
    fn = int(cm[1, 0])
    tp = int(cm[1, 1])

    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    balanced_acc = float((rec + specificity) / 2.0)

    keras_file = MODELS_DIR / "uci_best_model.keras"
    model_size_kb = round(keras_file.stat().st_size / 1024.0, 2) if keras_file.exists() else 0.0

    metrics = {
        "dataset": "UCI Epileptic Seizure Recognition",
        "model_name": "UCITinySeizureNet_1D",
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
        "decision_threshold_used": threshold,
        "float_model_size_kb": model_size_kb,
    }

    report_path = REPORTS_DIR / "uci_test_report.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"[OK] UCI Test Evaluation Results: Acc={metrics['accuracy']}%, F1={metrics['f1_score']}%, Sens={metrics['recall_sensitivity']}%, Spec={metrics['specificity']}%")
    return metrics
