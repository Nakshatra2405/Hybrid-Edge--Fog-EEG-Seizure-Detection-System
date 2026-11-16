# Machine Learning Pipeline: Edge-First EEG Seizure Detection

This directory contains the complete AI/ML training, validation, quantization, and evaluation pipeline for the **Hybrid Edge-Fog EEG Seizure Detection System**.

All machine learning development is strictly self-contained within `ml/`.

---

## 1. Directory Structure

```text
ml/
├── data/                               # Local dataset storage (Gitignored)
│   └── raw/chb01/                      # CHB-MIT EDF and summary files
├── models/                             # Trained models and exported weights
│   ├── baseline_rf.joblib              # Classical Random Forest baseline
│   ├── best_model.keras                # Trained Float32 TinySeizureNet-1D
│   ├── decision_threshold.json         # Optimal threshold tuned on Validation set
│   ├── model_float.tflite              # Float32 TFLite model (15.0 KB)
│   ├── model_int8.tflite               # INT8 Quantized model (10.2 KB)
│   └── model_data.h                    # C-array header for Arduino Nano 33 BLE Sense
├── reports/                            # Machine-readable audit reports
│   ├── smoke_test_report.json          # End-to-end pipeline verification report
│   ├── baseline_metrics.json           # Classical ML baseline performance
│   ├── test_report.json                # Single-pass test evaluation metrics
│   └── quantization_report.json        # Host-side INT8 parity verification
├── src/                                # Core pipeline source code
│   ├── config.py                       # Global parameters, paths, seeds, filters
│   ├── sanity_checks.py                # Pre-flight assertions (filter response, disjoint splits)
│   ├── download_data.py                # Targeted CHB-MIT acquisition with retries
│   ├── preprocess.py                   # Causal SOS filtering, decimation, z-score, boundary exclusion
│   ├── baseline.py                     # Welch spectral bandpowers + Hjorth Random Forest
│   ├── model.py                        # TinySeizureNet-1D architecture (2,417 params)
│   ├── train.py                        # Model training loop & validation threshold tuning
│   ├── evaluate.py                     # Single-pass test evaluation (FPW/h & FA/h)
│   ├── quantize.py                     # INT8 PTQ & C-header exporter
│   └── smoke_test.py                   # Minimal end-to-end pipeline execution harness
├── tests/                              # Automated unit tests
│   ├── test_data_shapes.py             # Verifies tensor dimensions, dtypes, boundary exclusions
│   ├── test_split_leakage.py           # Asserts zero subject overlap across partitions
│   └── test_quantization.py            # Verifies INT8 size and C-header generation
├── MODEL_CARD.md                       # Formal model card and limitations
├── requirements.txt                    # Pinned Python dependencies
└── README.md                           # This guide
```

---

## 2. Quickstart & Verification Commands

### Step 1: Install Dependencies
```bash
pip install -r ml/requirements.txt
```

### Step 2: Run Unit Tests
```bash
python -m unittest discover -s ml/tests -p "test_*.py"
```

### Step 3: Run Pre-Flight Sanity Checks
```bash
python -m ml.src.sanity_checks
```
*Numerically verifies filter attenuation at 64 Hz Nyquist (-41.25 dB) and asserts mutually exclusive patient partitions.*

### Step 4: Run the Complete End-to-End Pipeline Smoke Test
```bash
python -m ml.src.smoke_test
```
*Executes the entire lifecycle in under 5 seconds: preprocessing, baseline model, neural training, validation thresholding, test evaluation, INT8 quantization, and C-array export.*

---

## 3. Key Design Decisions for Project Jury Defense

1. **Why Patient-Separated Partitioning**:
   - Rather than randomly shuffling adjacent windows (which causes severe cross-window leakage and deceptive 99% accuracy), training, validation, and test sets are split strictly by patient ID (`assert_mutually_exclusive_splits`).
2. **Causal Preprocessing**:
   - Offline zero-phase filtering (`filtfilt`) uses future samples unavailable on a wearable streaming device. We use **causal IIR filtering** (`scipy.signal.sosfilt`), matching real-time MCU execution.
3. **Anti-Aliasing Filter Response**:
   - Before decimating from 256 Hz to 128 Hz, a 6th-order Butterworth bandpass (0.5–35 Hz) provides **-41.25 dB attenuation** at the 64 Hz Nyquist frequency, preventing high-frequency and 60 Hz mains aliasing.
4. **Per-Window Normalization**:
   - Zero-mean unit-variance scaling is applied per 2-second window. This eliminates train-to-test distribution leakage and compensates for inter-patient electrode impedance drift.
5. **False Alarm Reporting**:
   - We report both **Window-Level False Positive Windows per Hour (FPW/h)** and **Event-Level False Alarms per Hour (FA/h)** (requiring 2 consecutive positive windows and a 60s refractory window).
6. **TinyML Footprint**:
   - `TinySeizureNet-1D` contains only **2,417 parameters**, quantizing to **10.2 KB INT8 flatbuffer** (`model_data.h`), comfortably fitting within the Arduino Nano 33 BLE Sense's 1 MB Flash.
   - *Honest Note*: Actual Tensor Arena SRAM allocation and inference latency must be verified on physical hardware.
