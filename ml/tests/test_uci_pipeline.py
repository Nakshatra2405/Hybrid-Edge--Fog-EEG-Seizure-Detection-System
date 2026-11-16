"""
Automated Unit Tests for UCI Epileptic Seizure Recognition Pipeline
"""

import unittest
from pathlib import Path
import pandas as pd
import numpy as np

from ml.src.config import MODELS_DIR, REPORTS_DIR
from ml.src.uci_download import UCI_CSV_PATH
from ml.src.uci_preprocess import load_and_split_uci


class TestUCIPipeline(unittest.TestCase):

    def test_uci_dataset_integrity(self):
        """Verifies real UCI CSV has exactly 11,500 rows, 180 columns, and 0 NaNs."""
        self.assertTrue(UCI_CSV_PATH.exists(), "UCI data.csv does not exist")
        df = pd.read_csv(UCI_CSV_PATH)
        self.assertEqual(len(df), 11500)
        self.assertEqual(df.shape[1], 180)
        self.assertEqual(int(df.isna().sum().sum()), 0)

        # Check exact 5-class distribution
        counts = df["y"].value_counts().to_dict()
        for c in [1, 2, 3, 4, 5]:
            self.assertEqual(counts[c], 2300)

    def test_stratified_split_sizes_and_distribution(self):
        """Verifies 70/15/15 stratified split sizes and identical 20% positive ratios."""
        data = load_and_split_uci()
        s = data["summary"]
        self.assertEqual(s["train_samples"], 8050)
        self.assertEqual(s["val_samples"], 1725)
        self.assertEqual(s["test_samples"], 1725)

        # Assert identical stratified class balance
        self.assertAlmostEqual(s["train_positive_ratio"], 0.20, places=2)
        self.assertAlmostEqual(s["val_positive_ratio"], 0.20, places=2)
        self.assertAlmostEqual(s["test_positive_ratio"], 0.20, places=2)

        # Check tensor shapes
        self.assertEqual(data["X_train_cnn"].shape[1:], (1, 178, 1))
        self.assertEqual(data["X_train_cnn"].dtype, np.float32)

    def test_uci_quantization_artifacts(self):
        """Verifies uci_model_int8.tflite and uci_model_data.h exist and are properly bounded."""
        int8_path = MODELS_DIR / "uci_model_int8.tflite"
        header_path = MODELS_DIR / "uci_model_data.h"

        self.assertTrue(int8_path.exists(), "uci_model_int8.tflite was not generated")
        self.assertTrue(header_path.exists(), "uci_model_data.h was not generated")

        int8_size_kb = int8_path.stat().st_size / 1024.0
        self.assertLess(int8_size_kb, 25.0, f"INT8 model exceeds 25 KB: {int8_size_kb} KB")
        self.assertGreater(int8_size_kb, 2.0, "INT8 model unexpectedly small (< 2 KB)")

        with open(header_path, "r") as f:
            content = f.read()
        self.assertIn("alignas(16) const unsigned char g_uci_model_data[]", content)
        self.assertIn("g_uci_model_data_len", content)


if __name__ == "__main__":
    unittest.main()
