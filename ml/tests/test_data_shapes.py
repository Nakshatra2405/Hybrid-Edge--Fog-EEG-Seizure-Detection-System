"""
Unit Tests for Tensor Shapes, Dtypes, and Window Overlap Rules
"""

import unittest
import numpy as np
from ml.src.config import WINDOW_SAMPLES, MIN_OVERLAP_RATIO_ICTAL
from ml.src.preprocess import normalize_window_zscore


class TestDataShapesAndRules(unittest.TestCase):

    def test_window_normalization_shape_and_dtype(self):
        """Verifies per-window normalization produces exact shape and float32 dtype with zero division protection."""
        raw_window = np.random.randn(WINDOW_SAMPLES).astype(np.float64) * 50.0 + 10.0
        norm_window = normalize_window_zscore(raw_window)

        self.assertEqual(norm_window.shape, (WINDOW_SAMPLES,))
        self.assertEqual(norm_window.dtype, np.float32)
        self.assertAlmostEqual(float(np.mean(norm_window)), 0.0, places=4)
        self.assertAlmostEqual(float(np.std(norm_window)), 1.0, places=4)

    def test_flatline_protection(self):
        """Verifies constant / flatline signals do not raise NaN or zero-division exceptions."""
        flat_window = np.ones(WINDOW_SAMPLES, dtype=np.float32) * 42.0
        norm_window = normalize_window_zscore(flat_window)

        self.assertEqual(norm_window.shape, (WINDOW_SAMPLES,))
        self.assertFalse(np.isnan(norm_window).any())
        self.assertTrue((norm_window == 0.0).all())

    def test_boundary_overlap_labeling_logic(self):
        """Verifies exact onset/offset overlap calculations and ambiguous boundary exclusion."""
        window_duration = 2.0
        seizure_start = 10.0
        seizure_end = 20.0

        def get_overlap_ratio(t_start, t_end):
            overlap = max(0.0, min(t_end, seizure_end) - max(t_start, seizure_start))
            return overlap / window_duration

        # Case 1: Pure interictal (0.0s - 2.0s) -> 0% overlap -> Label 0
        self.assertEqual(get_overlap_ratio(0.0, 2.0), 0.0)

        # Case 2: Boundary entry (9.5s - 11.5s) -> 1.5s inside seizure / 2.0s = 0.75 -> Label 1
        ratio_high = get_overlap_ratio(9.5, 11.5)
        self.assertGreaterEqual(ratio_high, MIN_OVERLAP_RATIO_ICTAL)

        # Case 3: Ambiguous entry (9.8s - 11.8s, or 9.0s - 11.0s) -> 1.0s inside seizure = 0.50 -> Label 1
        ratio_exact = get_overlap_ratio(9.0, 11.0)
        self.assertEqual(ratio_exact, 0.50)

        # Case 4: Ambiguous slice (8.5s - 10.5s) -> 0.5s inside seizure / 2.0s = 0.25 -> Excluded (0 < r < 0.5)
        ratio_ambiguous = get_overlap_ratio(8.5, 10.5)
        self.assertEqual(ratio_ambiguous, 0.25)
        self.assertTrue(0.0 < ratio_ambiguous < MIN_OVERLAP_RATIO_ICTAL)


if __name__ == "__main__":
    unittest.main()
