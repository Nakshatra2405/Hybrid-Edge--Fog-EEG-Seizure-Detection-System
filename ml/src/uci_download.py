"""
UCI Epileptic Seizure Recognition Dataset Downloader & Verifier
Downloads the official dataset, verifies file integrity, validates 11,500 rows,
and saves a detailed data health report.

Dataset Provenance:
- Source: UCI Machine Learning Repository (Dataset ID: 388)
- URL: https://archive.ics.uci.edu/dataset/388/epileptic+seizure+recognition
- Origin: University of Bonn EEG Database (Andrzejak et al., 2001)
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
"""

import os
import json
from pathlib import Path
import requests
import pandas as pd
from tqdm import tqdm

from ml.src.config import ML_ROOT, REPORTS_DIR

UCI_DATA_DIR = ML_ROOT / "data" / "uci"
UCI_CSV_PATH = UCI_DATA_DIR / "data.csv"

# Primary & reliable mirror URLs for the authentic UCI dataset
UCI_URLS = [
    "https://raw.githubusercontent.com/akshayg056/Epileptic-seizure-detection-/master/data.csv",
    "https://raw.githubusercontent.com/apurvnnd/Epileptic-Seizure-Recognition-Using-ANN/master/data.csv",
]


def download_uci_dataset(dest_path=UCI_CSV_PATH):
    """
    Downloads the real UCI Epileptic Seizure Recognition CSV file.
    """
    dest_path = Path(dest_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    if dest_path.exists() and dest_path.stat().st_size > 2000000:
        print(f"[SKIP] UCI dataset already exists locally: {dest_path} ({dest_path.stat().st_size} bytes)")
        return dest_path

    print("Downloading UCI Epileptic Seizure Recognition dataset...")
    for url in UCI_URLS:
        try:
            print(f"Connecting to: {url}")
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()

            total_size = int(response.headers.get("content-length", 0))
            with open(dest_path, "wb") as f, tqdm(
                total=total_size, unit="iB", unit_scale=True, desc="data.csv"
            ) as bar:
                for chunk in response.iter_content(chunk_size=1024 * 64):
                    if chunk:
                        f.write(chunk)
                        bar.update(len(chunk))

            print(f"[OK] Downloaded successfully: {dest_path.stat().st_size} bytes")
            return dest_path
        except Exception as e:
            print(f"[WARN] Failed to download from {url}: {e}")
            if dest_path.exists():
                dest_path.unlink()

    raise RuntimeError(
        "CRITICAL: Failed to download UCI dataset from all configured URLs.\n"
        "Per strict instruction, synthetic data will NOT be substituted.\n"
        "Please check internet connection or manually place 'data.csv' in ml/data/uci/."
    )


def verify_uci_dataset(csv_path=UCI_CSV_PATH):
    """
    Verifies dataset integrity, dimensions, column names, missing values, and label distributions.
    """
    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"UCI dataset file not found: {csv_path}")

    df = pd.read_csv(csv_path)
    print(f"[*] Verifying dataset: {df.shape[0]} rows, {df.shape[1]} columns")

    # Assert exact row count (11,500 samples)
    assert len(df) == 11500, f"Expected 11,500 rows, got {len(df)}"

    # Check target column
    assert "y" in df.columns, "Missing target column 'y'!"

    # Verify original 5-class distribution
    class_counts = df["y"].value_counts().to_dict()
    for c in [1, 2, 3, 4, 5]:
        assert class_counts.get(c, 0) == 2300, f"Class {c} expected 2300 samples, got {class_counts.get(c, 0)}"

    # Verify feature columns (178 points)
    feature_cols = [c for c in df.columns if c not in ["y", "Unnamed: 0"]]
    assert len(feature_cols) == 178, f"Expected 178 feature columns, got {len(feature_cols)}"

    # Check for NaN / missing values
    nan_count = int(df.isna().sum().sum())
    assert nan_count == 0, f"Found {nan_count} NaN values in dataset!"

    # Compute binary distribution: 1 -> Positive (Ictal), 2-5 -> Negative (Interictal/Healthy)
    binary_positive = int(class_counts[1])
    binary_negative = int(sum(class_counts[c] for c in [2, 3, 4, 5]))

    report = {
        "dataset_name": "UCI Epileptic Seizure Recognition",
        "official_url": "https://archive.ics.uci.edu/dataset/388/epileptic+seizure+recognition",
        "provenance": "University of Bonn EEG Database (Andrzejak et al., 2001), formatted by Dr. Ralph Andrzejak / Harun Resit Erdal",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "feature_count_per_sample": len(feature_cols),
        "nan_count": nan_count,
        "original_5_class_distribution": {f"Class {k}": v for k, v in sorted(class_counts.items())},
        "binary_label_mapping": {
            "Positive (Class 1 - Seizure)": binary_positive,
            "Negative (Classes 2-5 - Non-Seizure)": binary_negative,
            "Positive_Ratio": round(binary_positive / len(df), 4),
            "Negative_Ratio": round(binary_negative / len(df), 4),
        },
        "verification_status": "PASS",
    }

    report_path = REPORTS_DIR / "uci_data_health_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[SUCCESS] Dataset verified and health report saved to: {report_path}")
    return df, report


if __name__ == "__main__":
    csv_file = download_uci_dataset()
    verify_uci_dataset(csv_file)
