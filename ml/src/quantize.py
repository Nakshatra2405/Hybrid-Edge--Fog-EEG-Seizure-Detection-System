"""
TensorFlow Lite INT8 Post-Training Quantization & C-Array Header Exporter
Converts trained models to INT8 flatbuffer for TFLite Micro, verifies host-side
numerical parity, and generates model_data.h for Arduino Nano 33 BLE Sense firmware.
"""

import os
import json
from pathlib import Path
import numpy as np
import tensorflow as tf

from ml.src.config import MODELS_DIR, REPORTS_DIR


def representative_dataset_generator(calibration_samples):
    """
    Yields sample windows for INT8 dynamic range calibration.
    """
    for i in range(min(len(calibration_samples), 100)):
        sample = calibration_samples[i:i+1].astype(np.float32)
        yield [sample]


def convert_and_quantize(model, calibration_data=None):
    """
    Performs INT8 post-training quantization and exports flatbuffers.
    """
    print("[*] Starting TFLite conversion and INT8 quantization...")

    # 1. Standard Float32 TFLite
    converter_float = tf.lite.TFLiteConverter.from_keras_model(model)
    float_tflite = converter_float.convert()
    float_path = MODELS_DIR / "model_float.tflite"
    with open(float_path, "wb") as f:
        f.write(float_tflite)
    float_size_kb = len(float_tflite) / 1024.0

    # 2. INT8 Quantized TFLite
    converter_int8 = tf.lite.TFLiteConverter.from_keras_model(model)
    converter_int8.optimizations = [tf.lite.Optimize.DEFAULT]

    if calibration_data is not None and len(calibration_data) > 0:
        def rep_gen():
            for i in range(min(len(calibration_data), 100)):
                yield [calibration_data[i:i+1].astype(np.float32)]
        converter_int8.representative_dataset = rep_gen
        converter_int8.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS_INT8,
            tf.lite.OpsSet.TFLITE_BUILTINS,
        ]

    int8_tflite = converter_int8.convert()
    int8_path = MODELS_DIR / "model_int8.tflite"
    with open(int8_path, "wb") as f:
        f.write(int8_tflite)
    int8_size_kb = len(int8_tflite) / 1024.0

    print(f"[OK] Float32 TFLite size: {float_size_kb:.2f} KB")
    print(f"[OK] INT8 Quantized TFLite size: {int8_size_kb:.2f} KB")

    # 3. Export to C Header Array (model_data.h)
    header_path = MODELS_DIR / "model_data.h"
    export_to_c_header(int8_tflite, header_path)

    return float_path, int8_path, header_path, float_size_kb, int8_size_kb


def export_to_c_header(tflite_bytes, header_path):
    """
    Converts binary flatbuffer bytes into a standard C byte array header file.
    """
    bytes_per_line = 12
    hex_lines = []
    
    for i in range(0, len(tflite_bytes), bytes_per_line):
        chunk = tflite_bytes[i:i + bytes_per_line]
        hex_lines.append("  " + ", ".join(f"0x{b:02x}" for b in chunk))

    header_content = f"""// Auto-generated TFLite Micro model header for Arduino Nano 33 BLE Sense
// Source model: TinySeizureNet-1D (INT8 Post-Training Quantized)
// Model size: {len(tflite_bytes)} bytes

#ifndef MODEL_DATA_H_
#define MODEL_DATA_H_

#include <cstdint>

alignas(16) const unsigned char g_model_data[] = {{
{",\\n".join(hex_lines)}
}};

const unsigned int g_model_data_len = {len(tflite_bytes)};

#endif  // MODEL_DATA_H_
"""
    with open(header_path, "w") as f:
        f.write(header_content)
    print(f"[OK] C Header exported to: {header_path}")


def verify_quantization_parity(float_model_path, int8_model_path, test_samples):
    """
    Computes Mean Absolute Error between Float32 and INT8 predictions on host test samples.
    """
    # Float32 Interpreter
    interp_float = tf.lite.Interpreter(model_path=str(float_model_path))
    interp_float.allocate_tensors()
    in_idx_f = interp_float.get_input_details()[0]["index"]
    out_idx_f = interp_float.get_output_details()[0]["index"]

    # INT8 Interpreter
    interp_int8 = tf.lite.Interpreter(model_path=str(int8_model_path))
    interp_int8.allocate_tensors()
    in_idx_i = interp_int8.get_input_details()[0]["index"]
    out_idx_i = interp_int8.get_output_details()[0]["index"]

    float_preds = []
    int8_preds = []

    for i in range(min(len(test_samples), 50)):
        sample = test_samples[i:i+1].astype(np.float32)

        # Float inference
        interp_float.set_tensor(in_idx_f, sample)
        interp_float.invoke()
        p_f = interp_float.get_tensor(out_idx_f).ravel()[0]
        float_preds.append(p_f)

        # INT8 inference
        interp_int8.set_tensor(in_idx_i, sample)
        interp_int8.invoke()
        p_i = interp_int8.get_tensor(out_idx_i).ravel()[0]
        int8_preds.append(p_i)

    mae = float(np.mean(np.abs(np.array(float_preds) - np.array(int8_preds))))
    print(f"[*] Quantization Parity Check: MAE = {mae:.4f}")

    parity_report = {
        "quantization_parity_mae": round(mae, 4),
        "samples_tested": len(float_preds),
        "parity_check_passed": bool(mae < 0.05),
    }
    with open(REPORTS_DIR / "quantization_report.json", "w") as f:
        json.dump(parity_report, f, indent=2)

    return mae
