"""
UCI Dataset Preprocessing and Stratified Leakage-Safe Splitting
Handles:
1. Binary label mapping: Class 1 -> 1 (Ictal), Classes 2-5 -> 0 (Interictal)
2. Stratified Train / Validation / Test split (70% / 15% / 15%) BEFORE normalization
3. Per-sample z-score normalization on the 178 feature values
4. Formatting tensors for 1D-CNN: shape (N, 1, 178, 1) and Baseline: shape (N, 178)
"""

from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from ml.src.config import RANDOM_SEED
from ml.src.uci_download import UCI_CSV_PATH


def load_and_split_uci(csv_path=UCI_CSV_PATH, random_seed=RANDOM_SEED):
    """
    Loads UCI dataset and performs stratified train/val/test split.
    Splits are performed strictly BEFORE normalization to guarantee zero leakage.
    """
    df = pd.read_csv(csv_path)

    # 1. Feature columns and original labels
    feature_cols = [c for c in df.columns if c not in ["y", "Unnamed: 0"]]
    raw_X = df[feature_cols].values.astype(np.float32)
    raw_y = df["y"].values.astype(np.int32)

    # 2. Binary Label Mapping
    # Class 1: Seizure -> 1
    # Classes 2, 3, 4, 5: Non-Seizure -> 0
    binary_y = (raw_y == 1).astype(np.int32)

    # 3. Stratified Partitioning (70% Train, 15% Val, 15% Test)
    # First split: 70% Train, 30% Temp (Val + Test)
    X_train_raw, X_temp_raw, y_train, y_temp = train_test_split(
        raw_X, binary_y,
        test_size=0.30,
        random_state=random_seed,
        stratify=binary_y,
    )

    # Second split: Split 30% Temp equally into 15% Val and 15% Test
    X_val_raw, X_test_raw, y_val, y_test = train_test_split(
        X_temp_raw, y_temp,
        test_size=0.50,
        random_state=random_seed,
        stratify=y_temp,
    )

    # 4. Per-Sample Normalization: z-score per 178-sample vector
    def normalize_samples(X_mat, eps=1e-4):
        means = np.mean(X_mat, axis=1, keepdims=True)
        stds = np.std(X_mat, axis=1, keepdims=True)
        stds = np.maximum(stds, eps)
        return ((X_mat - means) / stds).astype(np.float32)

    X_train_norm = normalize_samples(X_train_raw)
    X_val_norm = normalize_samples(X_val_raw)
    X_test_norm = normalize_samples(X_test_raw)

    # 5. Format for 1D-CNN: (N, 1, 178, 1)
    X_train_cnn = X_train_norm.reshape(-1, 1, 178, 1)
    X_val_cnn = X_val_norm.reshape(-1, 1, 178, 1)
    X_test_cnn = X_test_norm.reshape(-1, 1, 178, 1)

    split_summary = {
        "train_samples": len(y_train),
        "val_samples": len(y_val),
        "test_samples": len(y_test),
        "train_positive_ratio": round(float(np.mean(y_train)), 4),
        "val_positive_ratio": round(float(np.mean(y_val)), 4),
        "test_positive_ratio": round(float(np.mean(y_test)), 4),
        "cnn_input_shape": list(X_train_cnn.shape[1:]),
    }

    return {
        "X_train_raw": X_train_raw, "X_val_raw": X_val_raw, "X_test_raw": X_test_raw,
        "X_train_norm": X_train_norm, "X_val_norm": X_val_norm, "X_test_norm": X_test_norm,
        "X_train_cnn": X_train_cnn, "X_val_cnn": X_val_cnn, "X_test_cnn": X_test_cnn,
        "y_train": y_train, "y_val": y_val, "y_test": y_test,
        "summary": split_summary,
    }


if __name__ == "__main__":
    data = load_and_split_uci()
    print("[*] UCI Split Summary:", data["summary"])
