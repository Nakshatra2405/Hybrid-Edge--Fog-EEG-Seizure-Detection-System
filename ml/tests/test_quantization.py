"""
Unit Tests for Quantization, Flatbuffer Validation, and C-Header Generation
"""

import unittest
from pathlib import Path
from ml.src.config import MODELS_DIR


class TestQuantizationArtifacts(unittest.TestCase):

    def test_quantized_model_and_header_exist(self):
        """Verifies that model_int8.tflite and model_data.h exist and are properly bounded in size."""
        int8_path = MODELS_DIR / "model_int8.tflite"
        header_path = MODELS_DIR / "model_data.h"

        self.assertTrue(int8_path.exists(), "model_int8.tflite was not generated")
        self.assertTrue(header_path.exists(), "model_data.h was not generated")

        # Size constraints for Arduino Nano 33 BLE Sense (1 MB Flash)
        int8_size_kb = int8_path.stat().st_size / 1024.0
        self.assertLess(int8_size_kb, 30.0, f"INT8 model exceeds 30 KB ({int8_size_kb:.2f} KB)")
        self.assertGreater(int8_size_kb, 2.0, "INT8 model is unexpectedly empty (<2 KB)")

        # Verify C header content
        with open(header_path, "r") as f:
            header_text = f.read()

        self.assertIn("alignas(16) const unsigned char g_model_data[]", header_text)
        self.assertIn("g_model_data_len", header_text)


if __name__ == "__main__":
    unittest.main()
