"""
CI/CD Model Retraining & INT8 Quantization Entrypoint for GitHub Actions
Runs real TensorFlow UCITinySeizureNet-1D training, evaluation, INT8 quantization,
and C-header export for Arduino Nano 33 BLE. Writes structured metrics JSON and
optionally notifies the hospital backend via webhook callback.
"""

import argparse
import json
import os
import shutil
import time
from pathlib import Path
import requests

from ml.src.config import ML_ROOT, MODELS_DIR, REPORTS_DIR
from ml.src.uci_download import download_uci_dataset, verify_uci_dataset
from ml.src.uci_preprocess import load_and_split_uci
from ml.src.uci_train import train_uci_neural_model
from ml.src.uci_evaluate import evaluate_uci_test_set
from ml.src.uci_quantize import quantize_uci_model


def main():
    parser = argparse.ArgumentParser(description="NeuroWatch AI GitHub Actions Retraining Pipeline")
    parser.add_argument("--version-name", default="AISeizureNet-v4.9-int8.tflite")
    parser.add_argument("--model-id", default="")
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--approved-samples", type=int, default=14)
    parser.add_argument("--callback-url", default="")
    args = parser.parse_args()

    started_at = time.time()
    print("=" * 72)
    print(f"NEUROWATCH AI MLOPS RETRAINING PIPELINE — {args.version_name}")
    print(f"Model ID: {args.model_id or '(manual dispatch)'} | Epochs: {args.epochs}")
    print("=" * 72)

    # 1. Acquire & verify dataset
    csv_path = download_uci_dataset()
    _, health_report = verify_uci_dataset(csv_path)

    # 2. Preprocess & split
    data = load_and_split_uci(csv_path)

    # 3. Train TensorFlow CNN (UCITinySeizureNet-1D)
    cnn_model, best_th, history = train_uci_neural_model(
        data["X_train_cnn"],
        data["y_train"],
        data["X_val_cnn"],
        data["y_val"],
        epochs=args.epochs,
        batch_size=64,
    )

    # 4. Evaluate on held-out test set
    test_metrics = evaluate_uci_test_set(
        cnn_model,
        data["X_test_cnn"],
        data["y_test"],
        threshold=best_th,
    )

    # 5. INT8 Quantization + C Header generation
    float_path, int8_path, header_path, quant_report = quantize_uci_model(
        cnn_model,
        data["X_train_cnn"],
        data["X_test_cnn"],
    )

    # Copy quantized C header to firmware folder for edge builds
    firmware_header = ML_ROOT.parent / "edge" / "firmware" / "Nano33_SeizureClassifier" / "uci_model_data.h"
    if Path(header_path).exists() and firmware_header.parent.exists():
        shutil.copy2(header_path, firmware_header)
        print(f"[OK] Synced quantized C header to {firmware_header}")

    duration_sec = round(time.time() - started_at, 2)
    result_payload = {
        "modelId": args.model_id,
        "versionName": args.version_name,
        "approvedSamplesCount": args.approved_samples,
        "datasetRows": health_report.get("total_rows", 11500),
        "epochsTrained": len(history.history.get("loss", [])),
        "sampleCount": int(test_metrics["sample_count"]),
        "accuracy": float(test_metrics["accuracy"]),
        "precision": float(test_metrics["precision"]),
        "recall": float(test_metrics["recall_sensitivity"]),
        "f1Score": float(test_metrics["f1_score"]),
        "truePositive": int(test_metrics["true_positive"]),
        "falsePositive": int(test_metrics["false_positive"]),
        "trueNegative": int(test_metrics["true_negative"]),
        "falseNegative": int(test_metrics["false_negative"]),
        "validationThreshold": float(best_th),
        "int8SizeKb": float(quant_report["int8_model_size_kb"]),
        "parityMae": float(quant_report["parity_mae"]),
        "parityPassed": bool(quant_report["parity_check_passed"]),
        "durationSec": duration_sec,
        "githubRunId": os.environ.get("GITHUB_RUN_ID", ""),
    }

    result_path = REPORTS_DIR / "ci_training_result.json"
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(result_payload, f, indent=2)
    print(f"[OK] Saved CI training result JSON to {result_path}")

    # 6. Optional webhook callback to hospital backend if publicly reachable
    callback_url = (args.callback_url or "").strip().rstrip("/")
    pipeline_secret = os.environ.get("PIPELINE_SECRET", "")
    if callback_url and args.model_id:
        endpoint = f"{callback_url}/api/v1/models/{args.model_id}/training-callback"
        try:
            resp = requests.post(
                endpoint,
                json=result_payload,
                headers={"X-Pipeline-Secret": pipeline_secret},
                timeout=15,
            )
            print(f"[OK] Callback response ({endpoint}): HTTP {resp.status_code}")
        except Exception as exc:
            print(f"[WARN] Webhook callback skipped/failed: {exc}")


if __name__ == "__main__":
    main()
