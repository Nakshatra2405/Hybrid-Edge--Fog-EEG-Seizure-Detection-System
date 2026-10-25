"""
Unit Tests for Disjoint Patient Splits & Leakage Prevention
"""

import unittest
from ml.src.sanity_checks import assert_mutually_exclusive_splits
from ml.src.config import TRAIN_SUBJECTS, VAL_SUBJECTS, TEST_SUBJECTS


class TestSplitLeakage(unittest.TestCase):

    def test_default_splits_are_mutually_exclusive(self):
        """Verifies configured train, validation, and test cohorts are strictly disjoint."""
        res = assert_mutually_exclusive_splits(TRAIN_SUBJECTS, VAL_SUBJECTS, TEST_SUBJECTS)
        self.assertEqual(res["status"], "PASS")
        self.assertEqual(res["train_count"], 4)
        self.assertEqual(res["val_count"], 2)
        self.assertEqual(res["test_count"], 2)
        self.assertEqual(res["total_unique"], 8)

    def test_split_leakage_assertion_catches_overlap(self):
        """Verifies that an intentional patient leak immediately raises an AssertionError."""
        leaky_train = ["chb01", "chb03", "chb05", "chb08"]
        val = ["chb10", "chb14"]
        leaky_test = ["chb02", "chb08"]  # Overlaps on chb08!

        with self.assertRaises(AssertionError) as ctx:
            assert_mutually_exclusive_splits(leaky_train, val, leaky_test)
        self.assertIn("Split Leakage", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
