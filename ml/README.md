# AI Analytics & TinyML Model Training Pipeline

Welcome to the AI/ML module of the **Hybrid Edge–Fog EEG Seizure Detection System**. This document is the primary reference guide for training, evaluating, quantizing, and deploying the machine learning model to wearable edge hardware.

---

## 🎯 1. Core Problem & Objective

The objective is to perform **real-time, on-device binary classification** of continuous electroencephalogram (EEG) signals:

$$\text{EEG Signal Window } \mathbf{x} \longrightarrow \hat{y} \in [0.0, 1.0] \quad (\text{Seizure Probability})$$

* **Class 0 (Non-Ictal / Normal)**: Healthy background EEG, eye blinks, muscle artifacts, interictal periods ($\hat{y} < 0.70$).
* **Class 1 (Ictal / Seizure Activity)**: Epileptic spike-and-wave discharges, high-amplitude rhythmic bursts ($\hat{y} \ge 0.70$).
* **Emergency Alert Thresholds**:
  * $\ge 70\%$: Amber warning on Doctor / Nurse dashboard.
  * $\ge 85\%$: Critical red alert & Call Code trigger.

---

## 📊 2. Recommended Datasets

### A. Phase 1 (Rapid Prototyping): UCI Epilepsy Seizure Recognition Dataset
* **Source**: [Kaggle - Epilepsy Seizure Recognition](https://www.kaggle.com/datasets/harunresit/epilepsy-seizure-recognition-dataset) (Derived from the University of Bonn EEG database).
* **Format**: CSV file containing 11,500 samples.
* **Input Window**: 178 numerical values per row ($1\text{ second}$ @ $178\text{ Hz}$).
* **Classes**: Class 1 = Seizure (Ictal); Classes 2–5 = Non-seizure (Eyes open, eyes closed, tumor zone, healthy). Convert labels to binary:
  $$\text{Target} = 1 \text{ if } y = 1 \text{ else } 0$$

### B. Phase 2 (Clinical Benchmark): CHB-MIT Scalp EEG Database
* **Source**: [PhysioNet CHB-MIT](https://physionet.org/content/chbmit/1.0.0/)
* **Format**: `.edf` European Data Format files, 23 pediatric patients, sampled at 256 Hz.
* **Channel Selection**: Can be single-channel or 4-channel subset (e.g. `FP1-F3`, `C3-P3`, `CZ-PZ`) segmented into 1-second (256 samples) or 2-second (512 samples) sliding windows.

---

## 🔬 3. Signal Preprocessing Pipeline

Every raw EEG epoch passes through the following preprocessing stages:

```text
Raw Continuous EEG ──► Bandpass Filter (0.5–40 Hz) ──► 50/60 Hz Notch Filter ──► Sliding Window (1s, 50% overlap) ──► Z-Score Normalization
```

1. **Bandpass Filtering**: 4th-order Butterworth filter ($0.5\text{ Hz} \text{ to } 40.0\text{ Hz}$) to eliminate DC drift and high-frequency EMG noise.
2. **Powerline Notch Filtering**: Notch filter at $50\text{ Hz}$ or $60\text{ Hz}$ to remove AC mains interference.
3. **Sliding Window Segmentation**:
   * Window size = 1 second ($N = 178$ or $N = 256$ data points).
   * Step size = 0.5 seconds ($50\%$ overlap during training).
4. **Z-Score Normalization**:
   $$z_i = \frac{x_i - \mu}{\sigma + \epsilon}$$

---

## 🧠 4. Target Model Architecture (TinyML Edge Constraints)

The model **must run on the wearable edge device (Arduino Nano 33 BLE Sense - ARM Cortex-M4 nRF52840)** with **256 KB SRAM** and **1 MB Flash** using **TensorFlow Lite for Microcontrollers (TFLite Micro)**.

### Blueprint: Lightweight 1D-CNN (~10k–15k parameters, < 35 KB RAM footprint)

```python
import tensorflow as tf
from tensorflow.keras import layers, models

def build_tinyml_seizure_cnn(input_length=178):
    model = models.Sequential([
        # Input Layer: 1-second 1D EEG signal
        layers.Input(shape=(input_length, 1)),
        
        # Block 1: Feature Extraction
        layers.Conv1D(filters=16, kernel_size=5, strides=1, padding='same', activation='relu'),
        layers.BatchNormalization(),
        layers.MaxPool1D(pool_size=2),  # Shape: (89, 16)
        
        # Block 2: Higher-Level Pattern Recognition
        layers.Conv1D(filters=32, kernel_size=3, strides=1, padding='same', activation='relu'),
        layers.BatchNormalization(),
        layers.MaxPool1D(pool_size=2),  # Shape: (44, 32)
        
        # Block 3: Spatial Reduction
        layers.Conv1D(filters=32, kernel_size=3, strides=1, padding='same', activation='relu'),
        layers.GlobalAveragePooling1D(), # Shape: (32,)
        
        # Classification Head
        layers.Dropout(0.3),
        layers.Dense(16, activation='relu'),
        layers.Dense(1, activation='sigmoid') # Seizure Probability output [0.0, 1.0]
    ])
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.Precision(), tf.keras.metrics.Recall()]
    )
    return model
```

---

## ⚡ 5. Model Quantization & Microcontroller Export

To run on embedded microcontrollers, the model is converted to **INT8 Full Integer Quantization**:

```python
def quantize_model_to_tflite(keras_model, representative_dataset_gen, output_path='model_int8.tflite'):
    converter = tf.lite.TFLiteConverter.from_keras_model(keras_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_dataset_gen
    
    # Enforce full INT8 quantization
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8
    
    tflite_quant_model = converter.convert()
    
    with open(output_path, 'wb') as f:
        f.write(tflite_quant_model)
    print(f"Quantized model saved to {output_path} ({len(tflite_quant_model) / 1024:.2f} KB)")
    return tflite_quant_model
```

### Export to C Array (`model_data.h`) for Arduino Nano 33 BLE:
```bash
xxd -i model_int8.tflite > ../edge/firmware/Nano33_SeizureDetector/model_data.h
```

---

## 📈 6. Evaluation Metrics Required by Backend & Dashboard

When training or retraining a model version, the script **must compute and output** the exact metrics matching the PostgreSQL `ai_models` database table and the **Technician Model Training & Deployment Suite**:

| Metric | Database Field | Description | Target Benchmark |
| :--- | :--- | :--- | :--- |
| **Accuracy** | `accuracy` | Overall correct predictions | $\ge 97.0\%$ |
| **Precision** | `precision` | Positive Predictive Value ($TP / (TP + FP)$) | $\ge 95.0\%$ |
| **Recall / Sensitivity** | `recall` | Seizure detection rate ($TP / (TP + FN)$) | $\ge 96.0\%$ |
| **F1-Score** | `f1_score` | Harmonic mean of precision and recall | $\ge 95.5\%$ |
| **True Positives** | `true_positive` | Correctly identified seizure epochs | Integer count |
| **False Positives** | `false_positive` | False alarms (normal flagged as seizure) | Minimize |
| **True Negatives** | `true_negative` | Correctly identified normal epochs | Integer count |
| **False Negatives** | `false_negative` | Missed seizures (**critical safety metric**) | $\approx 0$ |
| **Inference Latency** | `edge_latency_ms` | Execution time on Cortex-M4 | $\le 25\text{ ms}$ |

---

## 🔄 7. End-to-End Continuous Retraining & MLOps Loop

The AI pipeline is connected to the full hospital workflow:

```text
┌────────────────────────────────────────┐
│ 1. Doctors Review Clinical EEG Records │ (Mark episodes "Approved for Training" on UI)
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│ 2. Data Added to Retraining Queue      │ (Saved in PostgreSQL clinical_eeg_sessions)
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│ 3. Retraining Triggered via UI/API     │ (POST /api/v1/models/trigger-training)
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│ 4. Automated Training & Evaluation     │ (GitHub Actions / Local Python script trains,
│                                        │  evaluates confusion matrix, quantizes to INT8)
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│ 5. Registration in Database & Cloud    │ (Record inserted into ai_models,
│                                        │  model.bin uploaded to Azure Blob Storage)
└───────────────────┬────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│ 6. Wireless BLE OTA Deployment         │ (Technician reviews metrics on dashboard
│                                        │  and deploys model wirelessly to wearable node)
└────────────────────────────────────────┘
```

---

## 📁 Recommended `ml/` Directory Structure

```text
ml/
├── data/                      # Local dataset storage (UCI CSVs, CHB-MIT EDFs) [Gitignored]
├── notebooks/
│   ├── 01_eda_and_signal_filtering.ipynb   # Signal visualization, FFT, filter verification
│   └── 02_model_experimentation.ipynb     # CNN vs GRU vs SVM baseline comparisons
├── src/
│   ├── dataset.py             # Data loading and batching utilities
│   ├── preprocess.py          # Butterworth filtering, sliding windowing, z-score normalization
│   ├── model.py               # TinyML 1D-CNN & GRU model definitions
│   ├── train.py               # Complete training & metric evaluation script
│   ├── quantize.py            # INT8 post-training quantization & C-header exporter
│   └── evaluate.py            # Confusion matrix generation & benchmark reporter
├── models/                    # Saved model artifacts (.keras, .tflite, model.bin, model_data.h)
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

---

## 📦 Python Dependencies (`requirements.txt`)

```text
tensorflow>=2.14.0
torch>=2.0.0
numpy>=1.24.0
scipy>=1.11.0
scikit-learn>=1.3.0
pandas>=2.1.0
mne>=1.5.0
matplotlib>=3.8.0
seaborn>=0.13.0
```
