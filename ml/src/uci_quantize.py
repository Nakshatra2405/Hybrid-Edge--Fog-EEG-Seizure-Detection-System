"""
UCI Model INT8 Post-Training Quantization & C-Array Header Exporter
Converts UCITinySeizureNet-1D to INT8 flatbuffer, verifies host numerical parity,
and exports uci_model_data.h for microcontrollers.
"""

import json
from pathlib import Path
import numpy as np
import tensorflow as tf

from ml.src.config import MODELS_DIR, REPORTS_DIR


def quantize_uci_model(model, X_train_calib, X_test_eval):
    """
    Performs INT8 quantization using representative training samples and validates parity.
    """
    print("[*] Starting TFLite conversion and INT8 quantization for UCI model...")

    # 1. Float32 TFLite
    conv_float = tf.lite.TFLiteConverter.from_keras_model(model)
    float_bytes = conv_float.convert()
    float_path = MODELS_DIR / "uci_model_float.tflite"
    with open(float_path, "wb") as f:
        f.write(float_bytes)
    float_kb = round(len(float_bytes) / 1024.0, 2)

    # 2. INT8 Quantized TFLite with representative dataset from training data
    conv_int8 = tf.lite.TFLiteConverter.from_keras_model(model)
    conv_int8.optimizations = [tf.lite.Optimize.DEFAULT]

    def rep_dataset():
        for i in range(min(len(X_train_calib), 200)):
            yield [X_train_calib[i:i+1].astype(np.float32)]

    conv_int8.representative_dataset = rep_dataset
    conv_int8.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS_INT8,
        tf.lite.OpsSet.TFLITE_BUILTINS,
    ]

    int8_bytes = conv_int8.convert()
    int8_path = MODELS_DIR / "uci_model_int8.tflite"
    with open(int8_path, "wb") as f:
        f.write(int8_bytes)
    int8_kb = round(len(int8_bytes) / 1024.0, 2)

    print(f"[OK] UCI Float32 TFLite size: {float_kb} KB")
    print(f"[OK] UCI INT8 Quantized TFLite size: {int8_kb} KB")

    # 3. Export to C Header (uci_model_data.h)
    header_path = MODELS_DIR / "uci_model_data.h"
    bytes_per_line = 12
    hex_lines = []
    for i in range(0, len(int8_bytes), bytes_per_line):
        chunk = int8_bytes[i:i + bytes_per_line]
        hex_lines.append("  " + ", ".join(f"0x{b:02x}" for b in chunk))

    header_content = f"""// Auto-generated TFLite Micro model header from UCI Epileptic Seizure dataset
// Source model: UCITinySeizureNet-1D (INT8 Post-Training Quantized)
// Input shape: (1, 178, 1) - 178 samples (1-second window @ 178 Hz)
// Flatbuffer size: {len(int8_bytes)} bytes

#ifndef UCI_MODEL_DATA_H_
#define UCI_MODEL_DATA_H_

#include <cstdint>

alignas(16) const unsigned char g_uci_model_data[] = {{
{",\\n".join(hex_lines)}
}};

const unsigned int g_uci_model_data_len = {len(int8_bytes)};

#endif  // UCI_MODEL_DATA_H_
"""
    with open(header_path, "w") as f:
        f.write(header_content)
    print(f"[OK] Exported C Header to: {header_path}")

    # 4. Host-side numerical parity check
    interp_f = tf.lite.Interpreter(model_path=str(float_path))
    interp_f.allocate_tensors()
    in_idx_f = interp_f.get_input_details()[0]["index"]
    out_idx_f = interp_f.get_output_details()[0]["index"]

    interp_i = tf.lite.Interpreter(model_path=str(int8_path))
    interp_i.allocate_tensors()
    in_idx_i = interp_i.get_input_details()[0]["index"]
    out_idx_i = interp_i.get_output_details()[0]["index"]

    f_preds, i_preds = [], []
    for i in range(min(len(X_test_eval), 100)):
        sample = X_test_eval[i:i+1].astype(np.float32)

        interp_f.set_tensor(in_idx_f, sample)
        interp_f.invoke()
        f_preds.append(interp_f.get_tensor(out_idx_f).ravel()[0])

        interp_i.set_tensor(in_idx_i, sample)
        interp_i.invoke()
        i_preds.append(interp_i.get_tensor(out_idx_i).ravel()[0])

    mae = float(np.mean(np.abs(np.array(f_preds) - np.array(i_preds))))
    print(f"[*] UCI Quantization Parity Check: MAE = {mae:.4f}")

    report = {
        "dataset": "UCI Epileptic Seizure Recognition",
        "float_model_size_kb": float_kb,
        "int8_model_size_kb": int8_kb,
        "c_header_path": str(header_path.name),
        "parity_mae": round(mae, 4),
        "samples_tested": len(f_preds),
        "parity_check_passed": bool(mae < 0.05),
    }

    report_path = REPORTS_DIR / "uci_quantization_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    return float_path, int8_path, header_path, report
