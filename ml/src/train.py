"""
Model Training & Validation Threshold Tuning Pipeline
Trains TinySeizureNet-1D with class weighting and optimizes the decision
threshold strictly on validation data.
"""

import json
from pathlib import Path
import numpy as np
import tensorflow as tf
from sklearn.metrics import precision_recall_fscore_support

from ml.src.config import MODELS_DIR, REPORTS_DIR, RANDOM_SEED
from ml.src.model import build_tiny_seizure_net


def compute_class_weights(y_train):
    """
    Computes class weights to manage class imbalance: N_total / (2 * N_class)
    """
    n_neg = np.sum(y_train == 0)
    n_pos = np.sum(y_train == 1)
    if n_pos == 0:
        return {0: 1.0, 1: 1.0}
    weight_for_0 = float((1 / n_neg) * (len(y_train) / 2.0))
    weight_for_1 = float((1 / n_pos) * (len(y_train) / 2.0))
    return {0: weight_for_0, 1: weight_for_1}


def tune_validation_threshold(model, X_val, y_val):
    """
    Sweeps decision threshold on the Validation set to maximize F1 score.
    Saves the chosen threshold to decision_threshold.json.
    """
    val_probs = model.predict(X_val, verbose=0).ravel()
    best_th = 0.50
    best_f1 = -1.0
    best_stats = {}

    thresholds = np.linspace(0.15, 0.85, 15)
    for th in thresholds:
        preds = (val_probs >= th).astype(int)
        prec, rec, f1, _ = precision_recall_fscore_support(y_val, preds, average="binary", zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best_th = float(th)
            best_stats = {
                "threshold": round(float(th), 3),
                "val_f1": round(float(f1) * 100, 2),
                "val_recall": round(float(rec) * 100, 2),
                "val_precision": round(float(prec) * 100, 2),
            }

    # Save to file
    with open(MODELS_DIR / "decision_threshold.json", "w") as f:
        json.dump(best_stats, f, indent=2)

    print(f"[OK] Validation Threshold Tuned: theta*={best_stats['threshold']} (Val F1={best_stats['val_f1']}%)")
    return best_th, best_stats


def train_neural_model(X_train, y_train, X_val, y_val, epochs=15, batch_size=32):
    """
    Trains TinySeizureNet-1D and tunes threshold on validation data.
    """
    tf.keras.utils.set_random_seed(RANDOM_SEED)
    class_weights = compute_class_weights(y_train)
    print(f"[*] Training with class weights: 0: {class_weights[0]:.2f}, 1: {class_weights[1]:.2f}")

    model = build_tiny_seizure_net(input_shape=X_train.shape[1:])

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        )
    ]

    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1,
    )

    # Save best floating-point model
    model_save_path = MODELS_DIR / "best_model.keras"
    model.save(model_save_path)
    print(f"[OK] Best float32 model saved to: {model_save_path}")

    # Tune threshold strictly on validation set
    best_th, val_stats = tune_validation_threshold(model, X_val, y_val)
    return model, best_th, history
