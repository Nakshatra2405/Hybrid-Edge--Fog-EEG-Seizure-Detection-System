"""
Plot Generation for UCI Epileptic Seizure Recognition Experiment
Generates high-resolution publication-quality PNG figures from real evaluation data:
1. Confusion matrices for Baseline (Random Forest) and CNN
2. CNN training & validation loss and accuracy curves
3. Precision-Recall curve for CNN with marked operating threshold
4. Baseline vs. CNN metric comparison bar chart
All figures saved to ml/reports/figures/
"""

import os
import json
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix,
    precision_recall_curve,
    auc,
    accuracy_score,
    precision_recall_fscore_support,
)
import joblib
import tensorflow as tf

from ml.src.config import MODELS_DIR, REPORTS_DIR, RANDOM_SEED
from ml.src.uci_preprocess import load_and_split_uci
from ml.src.uci_train import train_uci_neural_model

FIGURES_DIR = REPORTS_DIR / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

# Set clean aesthetic style
plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.labelsize": 11,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
    "figure.titlesize": 14,
})


def plot_confusion_matrices(y_test, rf_preds, cnn_preds):
    """
    Plots confusion matrix heatmaps for both Baseline and CNN models.
    """
    labels = ["Non-Seizure (0)", "Seizure (1)"]

    # 1. Baseline Confusion Matrix
    cm_rf = confusion_matrix(y_test, rf_preds)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm_rf, annot=True, fmt="d", cmap="Blues", cbar=False,
        xticklabels=labels, yticklabels=labels, ax=ax, annot_kws={"size": 14, "weight": "bold"}
    )
    ax.set_title("Random Forest Baseline: Confusion Matrix\n(UCI Held-Out Test Set, N=1,725)")
    ax.set_xlabel("Predicted Label")
    ax.set_ylabel("True Ground Truth")
    plt.tight_layout()
    out_rf = FIGURES_DIR / "uci_confusion_matrix_baseline.png"
    plt.savefig(out_rf, dpi=300)
    plt.close()
    print(f"[OK] Saved: {out_rf}")

    # 2. CNN Confusion Matrix
    cm_cnn = confusion_matrix(y_test, cnn_preds)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm_cnn, annot=True, fmt="d", cmap="Greens", cbar=False,
        xticklabels=labels, yticklabels=labels, ax=ax, annot_kws={"size": 14, "weight": "bold"}
    )
    ax.set_title("UCITinySeizureNet-1D (CNN): Confusion Matrix\n(UCI Held-Out Test Set, N=1,725, Threshold=0.60)")
    ax.set_xlabel("Predicted Label")
    ax.set_ylabel("True Ground Truth")
    plt.tight_layout()
    out_cnn = FIGURES_DIR / "uci_confusion_matrix_cnn.png"
    plt.savefig(out_cnn, dpi=300)
    plt.close()
    print(f"[OK] Saved: {out_cnn}")


def plot_training_curves(history_data):
    """
    Plots training and validation loss and accuracy curves across epochs.
    """
    epochs = range(1, len(history_data["loss"]) + 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.8))

    # Loss curve
    ax1.plot(epochs, history_data["loss"], "o-", color="#1f77b4", label="Training Loss", linewidth=2)
    ax1.plot(epochs, history_data["val_loss"], "s--", color="#ff7f0e", label="Validation Loss", linewidth=2)
    ax1.set_title("Model Loss per Epoch")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Binary Cross-Entropy Loss")
    ax1.legend(loc="upper right")
    ax1.grid(True, alpha=0.4)

    # Accuracy curve
    ax2.plot(epochs, history_data["accuracy"], "o-", color="#2ca02c", label="Training Accuracy", linewidth=2)
    ax2.plot(epochs, history_data["val_accuracy"], "s--", color="#d62728", label="Validation Accuracy", linewidth=2)
    ax2.set_title("Classification Accuracy per Epoch")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Accuracy")
    ax2.legend(loc="lower right")
    ax2.grid(True, alpha=0.4)

    plt.suptitle("UCITinySeizureNet-1D: Training & Validation Curves", fontsize=14, y=1.02)
    plt.tight_layout()
    out_path = FIGURES_DIR / "uci_cnn_training_curves.png"
    plt.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"[OK] Saved: {out_path}")


def plot_precision_recall_curve(y_test, cnn_probs, threshold=0.60):
    """
    Plots Precision-Recall curve on the held-out test set with marked operating threshold.
    """
    precisions, recalls, thresholds = precision_recall_curve(y_test, cnn_probs)
    pr_auc = auc(recalls, precisions)

    # Find precision & recall at the selected validation threshold (0.60)
    preds_at_th = (cnn_probs >= threshold).astype(int)
    _, rec_th, prec_th, _ = precision_recall_fscore_support(y_test, preds_at_th, average="binary", zero_division=0)

    fig, ax = plt.subplots(figsize=(7, 5.5))
    ax.plot(recalls, precisions, color="#2b5c8f", linewidth=2.5, label=f"CNN PR Curve (PR-AUC = {pr_auc:.3f})")
    ax.plot(rec_th, prec_th, "ro", markersize=9, label=f"Selected Operating Point (Threshold = {threshold:.2f})")

    # Baseline chance line (prevalence = 20%)
    prevalence = np.mean(y_test)
    ax.axhline(y=prevalence, color="gray", linestyle=":", label=f"Random Chance (Prevalence = {prevalence:.1%})")

    ax.set_title("Precision-Recall Curve on Held-Out Test Set\n(UCITinySeizureNet-1D, N=1,725)")
    ax.set_xlabel("Recall (Sensitivity)")
    ax.set_ylabel("Precision (Positive Predictive Value)")
    ax.set_xlim([0.0, 1.05])
    ax.set_ylim([0.0, 1.05])
    ax.legend(loc="lower left")
    ax.grid(True, alpha=0.4)

    plt.tight_layout()
    out_path = FIGURES_DIR / "uci_cnn_precision_recall_curve.png"
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"[OK] Saved: {out_path}")


def plot_model_comparison(rf_metrics, cnn_metrics):
    """
    Generates side-by-side bar chart comparing Accuracy, Precision, Recall, and F1-Score.
    """
    metrics = ["Accuracy", "Precision", "Recall\n(Sensitivity)", "Specificity", "F1-Score"]
    rf_scores = [
        rf_metrics["accuracy"],
        rf_metrics["precision"],
        rf_metrics["recall_sensitivity"],
        rf_metrics["specificity"],
        rf_metrics["f1_score"],
    ]
    cnn_scores = [
        cnn_metrics["accuracy"],
        cnn_metrics["precision"],
        cnn_metrics["recall_sensitivity"],
        cnn_metrics["specificity"],
        cnn_metrics["f1_score"],
    ]

    x = np.arange(len(metrics))
    width = 0.35

    fig, ax = plt.subplots(figsize=(9, 5.5))
    rects1 = ax.bar(x - width/2, rf_scores, width, label="Random Forest Baseline", color="#4a7bb0", edgecolor="black", linewidth=0.5)
    rects2 = ax.bar(x + width/2, cnn_scores, width, label="UCITinySeizureNet-1D (CNN)", color="#2ca02c", edgecolor="black", linewidth=0.5)

    ax.set_ylabel("Score (%)")
    ax.set_title("Model Performance Comparison on UCI Held-Out Test Set (N=1,725)")
    ax.set_xticks(x)
    ax.set_xticklabels(metrics)
    ax.set_ylim([0, 115])
    ax.legend(loc="upper right")
    ax.grid(axis="y", alpha=0.4)

    # Attach score values on top of bars
    def autolabel(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f"{height:.1f}%",
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 3), textcoords="offset points",
                        ha="center", va="bottom", fontsize=9, weight="bold")

    autolabel(rects1)
    autolabel(rects2)

    plt.tight_layout()
    out_path = FIGURES_DIR / "uci_model_comparison_barchart.png"
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"[OK] Saved: {out_path}")


def generate_all_uci_plots():
    """
    Orchestrates the creation of all 5 figures using verified model predictions and history.
    """
    print("=" * 60)
    print("GENERATING UCI REAL-DATA EXPERIMENT GRAPHS")
    print("=" * 60)

    # 1. Load Data
    data = load_and_split_uci()
    X_test_norm = data["X_test_norm"]
    X_test_cnn = data["X_test_cnn"]
    y_test = data["y_test"]

    # 2. Load Models
    rf_model_path = MODELS_DIR / "uci_baseline_rf.joblib"
    cnn_model_path = MODELS_DIR / "uci_best_model.keras"
    th_path = MODELS_DIR / "uci_decision_threshold.json"

    if not rf_model_path.exists() or not cnn_model_path.exists():
        raise FileNotFoundError("Trained UCI models not found. Run python -m ml.src.uci_pipeline first.")

    rf_model = joblib.load(rf_model_path)
    cnn_model = tf.keras.models.load_model(cnn_model_path)

    threshold = 0.60
    if th_path.exists():
        with open(th_path, "r") as f:
            threshold = json.load(f).get("threshold", 0.60)

    # 3. Model Predictions on Test Set
    rf_preds = rf_model.predict(X_test_norm)
    cnn_probs = cnn_model.predict(X_test_cnn, verbose=0).ravel()
    cnn_preds = (cnn_probs >= threshold).astype(int)

    # 4. Generate Confusion Matrices
    plot_confusion_matrices(y_test, rf_preds, cnn_preds)

    # 5. Generate Precision-Recall Curve
    plot_precision_recall_curve(y_test, cnn_probs, threshold=threshold)

    # 6. Load / Extract Training History
    history_file = REPORTS_DIR / "uci_training_history.json"
    if not history_file.exists():
        print("[*] Re-running training to capture full per-epoch history curves (seed=42)...")
        _, _, history = train_uci_neural_model(
            data["X_train_cnn"], data["y_train"],
            data["X_val_cnn"], data["y_val"],
            epochs=12, batch_size=64
        )
        hist_dict = {
            "loss": [float(x) for x in history.history["loss"]],
            "val_loss": [float(x) for x in history.history["val_loss"]],
            "accuracy": [float(x) for x in history.history["accuracy"]],
            "val_accuracy": [float(x) for x in history.history["val_accuracy"]],
        }
        with open(history_file, "w") as f:
            json.dump(hist_dict, f, indent=2)
    else:
        with open(history_file, "r") as f:
            hist_dict = json.load(f)

    plot_training_curves(hist_dict)

    # 7. Generate Comparison Bar Chart
    with open(REPORTS_DIR / "uci_baseline_metrics.json", "r") as f:
        rf_metrics = json.load(f)
    with open(REPORTS_DIR / "uci_test_report.json", "r") as f:
        cnn_metrics = json.load(f)

    plot_model_comparison(rf_metrics, cnn_metrics)

    print("\n[SUCCESS] All 5 figures generated successfully inside ml/reports/figures/")


if __name__ == "__main__":
    generate_all_uci_plots()
