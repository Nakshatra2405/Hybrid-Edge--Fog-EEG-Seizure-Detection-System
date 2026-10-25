"""
UCI Epileptic Seizure Recognition End-to-End Pipeline
Executes complete real-data experiment:
1. Dataset verification (11,500 rows, 178 features, 5 original classes mapped to binary)
2. Stratified Train / Val / Test splitting (70% / 15% / 15%)
3. Classical Random Forest baseline training & evaluation
4. Compact CNN (UCITinySeizureNet-1D) training & validation threshold selection
5. Single-pass evaluation of both models on untouched held-out test set
6. INT8 Post-Training Quantization, host parity verification, and C header export
7. Saving all run metadata to ml/reports/
"""

import time
import json
from pathlib import Path

from ml.src.config import REPORTS_DIR
from ml.src.uci_download import download_uci_dataset, verify_uci_dataset
from ml.src.uci_preprocess import load_and_split_uci
from ml.src.uci_baseline import train_uci_baseline
from ml.src.uci_train import train_uci_neural_model
from ml.src.uci_evaluate import evaluate_uci_test_set
from ml.src.uci_quantize import quantize_uci_model


def run_uci_experiment():
    print("=" * 70)
    print("STARTING UCI EPILEPTIC SEIZURE RECOGNITION REAL-DATA EXPERIMENT")
    print("=" * 70)
    start_time = time.time()
    stage_logs = {}

    # Stage 1: Dataset Acquisition & Verification
    print("\n--- STAGE 1: Dataset Acquisition & Verification ---")
    t0 = time.time()
    csv_path = download_uci_dataset()
    df, health_report = verify_uci_dataset(csv_path)
    stage_logs["data_verification"] = {
        "status": "PASS",
        "total_rows": health_report["total_rows"],
        "binary_distribution": health_report["binary_label_mapping"],
        "duration_sec": round(time.time() - t0, 3),
    }

    # Stage 2: Stratified Splitting & Normalization
    print("\n--- STAGE 2: Stratified Splitting & Preprocessing ---")
    t0 = time.time()
    data = load_and_split_uci(csv_path)
    stage_logs["splitting"] = {
        "status": "PASS",
        "summary": data["summary"],
        "duration_sec": round(time.time() - t0, 3),
    }
    print(f"[OK] Split into: Train={data['summary']['train_samples']}, Val={data['summary']['val_samples']}, Test={data['summary']['test_samples']}")

    # Stage 3: Classical ML Baseline (Random Forest)
    print("\n--- STAGE 3: Classical ML Baseline (Random Forest) ---")
    t0 = time.time()
    rf_model, rf_metrics = train_uci_baseline(
        data["X_train_norm"], data["y_train"],
        data["X_test_norm"], data["y_test"]
    )
    stage_logs["baseline_evaluation"] = {
        "status": "PASS",
        "accuracy": rf_metrics["accuracy"],
        "f1_score": rf_metrics["f1_score"],
        "sensitivity": rf_metrics["recall_sensitivity"],
        "specificity": rf_metrics["specificity"],
        "duration_sec": round(time.time() - t0, 3),
    }

    # Stage 4: Neural Network Training & Threshold Tuning
    print("\n--- STAGE 4: Compact CNN Training (UCITinySeizureNet-1D) ---")
    t0 = time.time()
    cnn_model, best_th, history = train_uci_neural_model(
        data["X_train_cnn"], data["y_train"],
        data["X_val_cnn"], data["y_val"],
        epochs=12,
        batch_size=64,
    )
    stage_logs["neural_training"] = {
        "status": "PASS",
        "epochs_trained": len(history.history["loss"]),
        "final_train_loss": round(float(history.history["loss"][-1]), 4),
        "validation_threshold": best_th,
        "duration_sec": round(time.time() - t0, 3),
    }

    # Stage 5: Single-Pass Test Evaluation on Held-Out Test Set
    print("\n--- STAGE 5: Held-Out Test Set Evaluation ---")
    t0 = time.time()
    cnn_metrics = evaluate_uci_test_set(cnn_model, data["X_test_cnn"], data["y_test"], threshold=best_th)
    stage_logs["cnn_test_evaluation"] = {
        "status": "PASS",
        "accuracy": cnn_metrics["accuracy"],
        "f1_score": cnn_metrics["f1_score"],
        "sensitivity": cnn_metrics["recall_sensitivity"],
        "specificity": cnn_metrics["specificity"],
        "balanced_accuracy": cnn_metrics["balanced_accuracy"],
        "duration_sec": round(time.time() - t0, 3),
    }

    # Stage 6: INT8 Quantization & C Header Export
    print("\n--- STAGE 6: INT8 Quantization & C-Header Export ---")
    t0 = time.time()
    float_path, int8_path, header_path, quant_report = quantize_uci_model(
        cnn_model, data["X_train_cnn"], data["X_test_cnn"]
    )
    stage_logs["quantization"] = {
        "status": "PASS" if quant_report["parity_check_passed"] else "FAIL",
        "float_size_kb": quant_report["float_model_size_kb"],
        "int8_size_kb": quant_report["int8_model_size_kb"],
        "parity_mae": quant_report["parity_mae"],
        "c_header": quant_report["c_header_path"],
        "duration_sec": round(time.time() - t0, 3),
    }

    total_duration = round(time.time() - start_time, 2)
    experiment_summary = {
        "experiment_name": "UCI Epileptic Seizure Recognition Real-Data Experiment",
        "dataset_source": "UCI Machine Learning Repository (Dataset 388)",
        "input_format": "178 sample values per example (1-second chunk @ 178 Hz)",
        "total_dataset_rows": 11500,
        "split_sizes": {
            "train": data["summary"]["train_samples"],
            "val": data["summary"]["val_samples"],
            "test": data["summary"]["test_samples"],
        },
        "model_comparison": {
            "Random_Forest_Baseline": {
                "accuracy": rf_metrics["accuracy"],
                "f1_score": rf_metrics["f1_score"],
                "sensitivity": rf_metrics["recall_sensitivity"],
                "specificity": rf_metrics["specificity"],
                "balanced_accuracy": rf_metrics["balanced_accuracy"],
                "confusion_matrix": rf_metrics["confusion_matrix"],
                "model_size_kb": rf_metrics["model_size_kb"],
            },
            "UCITinySeizureNet_1D_CNN": {
                "accuracy": cnn_metrics["accuracy"],
                "f1_score": cnn_metrics["f1_score"],
                "sensitivity": cnn_metrics["recall_sensitivity"],
                "specificity": cnn_metrics["specificity"],
                "balanced_accuracy": cnn_metrics["balanced_accuracy"],
                "confusion_matrix": cnn_metrics["confusion_matrix"],
                "decision_threshold": cnn_metrics["decision_threshold_used"],
                "float_model_size_kb": quant_report["float_model_size_kb"],
                "int8_model_size_kb": quant_report["int8_model_size_kb"],
                "c_header_exported": quant_report["c_header_path"],
            },
        },
        "total_runtime_sec": total_duration,
        "stages": stage_logs,
        "scientific_disclaimer": (
            "This experiment is a dataset-specific benchmark on pre-segmented 178-sample vectors. "
            "Because UCI removes individual subject IDs, this evaluation is sample-stratified rather than patient-separated. "
            "Test metrics must NOT be claimed as proof of general clinical seizure detection or patient generalization."
        ),
    }

    summary_file = REPORTS_DIR / "uci_pipeline_run_summary.json"
    with open(summary_file, "w") as f:
        json.dump(experiment_summary, f, indent=2)

    print("\n" + "=" * 70)
    print(f"[SUCCESS] UCI REAL-DATA EXPERIMENT COMPLETED IN {total_duration}s")
    print(f"Summary saved to: {summary_file}")
    print("=" * 70)
    return experiment_summary


if __name__ == "__main__":
    run_uci_experiment()
