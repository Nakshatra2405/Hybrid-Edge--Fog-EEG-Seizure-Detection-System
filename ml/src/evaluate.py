"""
Single-Pass Test Set Evaluation & Error Analysis
Evaluates the frozen model using the frozen validation threshold theta*.
Computes all backend-compatible metrics (Acc, Prec, Recall, F1, TP, FP, TN, FN)
and distinctly calculates:
1. False Positive Windows per Hour (FPW/h) [Window-level]
2. False Alarms per Hour (FA/h) [Event-level with explicit temporal merging]
"""

import json
from pathlib import Path
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

from ml.src.config import (
    MODELS_DIR,
    REPORTS_DIR,
    WINDOW_SEC,
    ALARM_CONSECUTIVE_WINDOWS,
    ALARM_REFRACTORY_SEC,
)


def calculate_event_level_false_alarms(predictions, window_metadata, total_interictal_hours):
    """
    Computes distinct false alarm events per hour using explicit temporal grouping:
    - Triggers only when ALARM_CONSECUTIVE_WINDOWS consecutive windows are positive
    - Merges alarms occurring within ALARM_REFRACTORY_SEC into 1 event
    - Excludes alarms that overlap true seizure intervals
    """
    if len(predictions) == 0 or total_interictal_hours <= 0:
        return 0, 0.0

    alarm_events = []
    consecutive_count = 0
    in_alarm_state = False
    last_alarm_time = -9999.0

    for idx, (pred, meta) in enumerate(zip(predictions, window_metadata)):
        t_start = meta.get("t_start", idx * WINDOW_SEC)
        is_ictal = (meta.get("label", 0) == 1)

        if pred == 1:
            consecutive_count += 1
            if consecutive_count >= ALARM_CONSECUTIVE_WINDOWS:
                if not in_alarm_state:
                    # Check refractory period
                    if (t_start - last_alarm_time) >= ALARM_REFRACTORY_SEC:
                        alarm_events.append({
                            "t_start": t_start,
                            "is_true_seizure": is_ictal,
                        })
                        last_alarm_time = t_start
                    in_alarm_state = True
        else:
            consecutive_count = 0
            in_alarm_state = False

    # False alarm events are alarm events that do not coincide with an ictal seizure
    false_alarm_events = [a for a in alarm_events if not a["is_true_seizure"]]
    fa_count = len(false_alarm_events)
    fa_per_hour = round(fa_count / total_interictal_hours, 2)
    return fa_count, fa_per_hour


def evaluate_test_set(model, X_test, y_test, window_metadata=None, threshold=None):
    """
    Single-pass evaluation on untouched test set.
    """
    # Load frozen validation threshold if not explicitly passed
    if threshold is None:
        th_file = MODELS_DIR / "decision_threshold.json"
        if th_file.exists():
            with open(th_file, "r") as f:
                th_data = json.load(f)
                threshold = th_data.get("threshold", 0.50)
        else:
            threshold = 0.50

    print(f"[*] Evaluating on Test Set with frozen threshold: {threshold}")
    probs = model.predict(X_test, verbose=0).ravel()
    preds = (probs >= threshold).astype(int)

    acc = float(accuracy_score(y_test, preds))
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, preds, average="binary", zero_division=0)

    cm = confusion_matrix(y_test, preds)
    tn = int(cm[0, 0]) if cm.shape == (2, 2) else 0
    fp = int(cm[0, 1]) if cm.shape == (2, 2) else 0
    fn = int(cm[1, 0]) if cm.shape == (2, 2) else 0
    tp = int(cm[1, 1]) if cm.shape == (2, 2) else int(cm[0, 0])

    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    balanced_acc = float((rec + specificity) / 2.0)

    # 1. Window-Level FPW/h calculation
    interictal_windows = np.sum(y_test == 0)
    total_interictal_hours = (interictal_windows * WINDOW_SEC) / 3600.0
    fpw_per_hour = round(fp / total_interictal_hours, 2) if total_interictal_hours > 0 else 0.0

    # 2. Event-Level FA/h calculation
    meta = window_metadata if window_metadata is not None else [{"label": y} for y in y_test]
    fa_count, fa_per_hour = calculate_event_level_false_alarms(preds, meta, total_interictal_hours)

    metrics = {
        # Fields matching backend schema.sql 'ai_models' table:
        "sample_count": len(y_test),
        "accuracy": round(acc * 100, 2),
        "precision": round(float(prec) * 100, 2),
        "recall": round(float(rec) * 100, 2),
        "f1_score": round(float(f1) * 100, 2),
        "true_positive": tp,
        "false_positive": fp,
        "true_negative": tn,
        "false_negative": fn,
        # Additional clinical & operational metrics:
        "specificity": round(specificity * 100, 2),
        "balanced_accuracy": round(balanced_acc * 100, 2),
        "decision_threshold_used": threshold,
        "total_interictal_hours": round(total_interictal_hours, 3),
        "window_false_positive_per_hour": fpw_per_hour,
        "event_false_alarms_per_hour": fa_per_hour,
        "event_merging_rule": f"{ALARM_CONSECUTIVE_WINDOWS} consecutive windows (4s), {ALARM_REFRACTORY_SEC}s refractory",
    }

    report_path = REPORTS_DIR / "test_report.json"
    with open(report_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"[OK] Test Report Generated: Acc={metrics['accuracy']}%, Sens={metrics['recall']}%, Spec={metrics['specificity']}%, FPW/h={fpw_per_hour}")
    return metrics
