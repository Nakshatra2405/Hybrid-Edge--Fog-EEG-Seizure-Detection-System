"""
UCI Neural Network Training & Validation Threshold Tuning Pipeline
Trains UCITinySeizureNet-1D with class weighting and tunes the decision threshold
strictly on validation data.
"""

import json
from pathlib import Path
import numpy as np
import tensorflow as tf
from sklearn.metrics import precision_recall_fscore_support

from ml.src.config import MODELS_DIR, REPORTS_DIR, RANDOM_SEED
from ml.src.uci_model import build_uci_tiny_seizure_net


def compute_uci_class_weights(y_train):
    """
    Computes class weights to balance the 1:4 positive-to-negative ratio.
    """
    n_neg = np.sum(y_train == 0)
    n_pos = np.sum(y_train == 1)
    weight_0 = float((1 / n_neg) * (len(y_train) / 2.0))
    weight_1 = float((1 / n_pos) * (len(y_train) / 2.0))
    return {0: weight_0, 1: weight_1}


def tune_uci_validation_threshold(model, X_val, y_val):
    """
    Sweeps decision threshold on the Validation set to maximize F1 score.
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

    with open(MODELS_DIR / "uci_decision_threshold.json", "w") as f:
        json.dump(best_stats, f, indent=2)

    print(f"[OK] UCI Validation Threshold Tuned: theta*={best_stats['threshold']} (Val F1={best_stats['val_f1']}%)")
    return best_th, best_stats


def train_uci_neural_model(X_train, y_train, X_val, y_val, epochs=15, batch_size=64):
    """
    Trains UCITinySeizureNet-1D and optimizes threshold on validation set.
    """
    tf.keras.utils.set_random_seed(RANDOM_SEED)
    class_weights = compute_uci_class_weights(y_train)
    print(f"[*] Training UCITinySeizureNet-1D with class weights: {class_weights}")

    model = build_uci_tiny_seizure_net(input_shape=X_train.shape[1:])

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=4,
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

    model_path = MODELS_DIR / "uci_best_model.keras"
    model.save(model_path)
    print(f"[OK] Saved trained model to: {model_path}")

    best_th, val_stats = tune_uci_validation_threshold(model, X_val, y_val)
    return model, best_th, history
