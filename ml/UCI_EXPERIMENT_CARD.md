# UCI Epileptic Seizure Recognition Real-Data Experiment Card

## 1. Dataset Provenance & Licensing
- **Dataset Name**: Epileptic Seizure Recognition
- **Official Repository**: UCI Machine Learning Repository (Dataset ID: 388)
- **Official URL**: [https://archive.ics.uci.edu/dataset/388/epileptic+seizure+recognition](https://archive.ics.uci.edu/dataset/388/epileptic+seizure+recognition)
- **Primary Source / Origin**: University of Bonn EEG Database (Andrzejak et al., Phys. Rev. E, 2001)
- **Formatting**: Contributed by Dr. Ralph Andrzejak and Harun Resit Erdal in 2017.
- **License**: Creative Commons Attribution 4.0 International (**CC BY 4.0**)
- **Data Format**: `data.csv` containing 11,500 rows, 178 EEG sample feature columns (`X1` to `X178`), and target column `y`.

---

## 2. Label Mapping & Class Distribution

The original dataset has 5 classes (2,300 rows each, perfectly balanced at 20% each):
- **Class 1**: Seizure activity (recorded intracranial EEG during ictal episodes from epileptogenic zone).
- **Class 2**: Seizure-free EEG recorded from the area of the brain where the tumor was located.
- **Class 3**: Seizure-free EEG recorded from the healthy brain area (hippocampus).
- **Class 4**: Surface scalp EEG with eyes closed (healthy patients).
- **Class 5**: Surface scalp EEG with eyes open (healthy patients).

### Binary Experiment Mapping:
- **Positive ($y=1$, Ictal Seizure)**: Original Class 1 $\rightarrow$ **2,300 samples (20.0%)**
- **Negative ($y=0$, Non-Seizure / Healthy)**: Original Classes 2, 3, 4, 5 $\rightarrow$ **9,200 samples (80.0%)**

---

## 3. Data Partitioning & Leakage Prevention
- **Splitting Strategy**: Stratified Train / Validation / Test split performed **BEFORE** normalization.
  - **Train Set (70%)**: 8,050 samples (1,610 Positive, 6,440 Negative)
  - **Validation Set (15%)**: 1,725 samples (345 Positive, 1,380 Negative)
  - **Test Set (15%)**: 1,725 samples (345 Positive, 1,380 Negative) - Held out completely.
- **Random Seed**: `42`
- **Normalization**: Per-sample $z$-score normalization on each 178-point vector:
  $$x_{\text{norm}} = \frac{x - \mu}{\max(\sigma, 10^{-4})}$$

---

## 4. Evaluated Models & Empirical Results

Evaluated on the **1,725 held-out test samples**:

| Metric | Classical Baseline (Random Forest) | Compact CNN (`UCITinySeizureNet-1D`) |
| :--- | :--- | :--- |
| **Accuracy** | **87.30%** | **92.70%** |
| **F1-Score** | **57.14%** | **82.15%** |
| **Sensitivity (Recall)** | **42.32%** (146 / 345) | **84.06%** (290 / 345) |
| **Specificity** | **98.55%** (1,360 / 1,380) | **94.86%** (1,309 / 1,380) |
| **Balanced Accuracy** | **70.43%** | **89.46%** |
| **Decision Threshold** | N/A (Default 0.5) | **0.60** (Tuned on Validation Set) |
| **Confusion Matrix** | `TN=1360, FP=20, FN=199, TP=146` | `TN=1309, FP=71, FN=55, TP=290` |
| **Float Model Size** | 2,962 KB | **16.14 KB** |
| **INT8 Quantized Size** | N/A | **10.59 KB** |
| **Exported Artifact** | `ml/models/uci_baseline_rf.joblib` | `ml/models/uci_model_data.h` |

---

## 5. TensorFlow Lite INT8 Quantization
- **Float32 Flatbuffer**: `ml/models/uci_model_float.tflite` ($16.14\text{ KB}$)
- **INT8 Quantized Flatbuffer**: `ml/models/uci_model_int8.tflite` ($10.59\text{ KB}$)
- **Quantization Calibration**: Post-Training Quantization (PTQ) using 200 representative training samples.
- **Numerical Parity**: Host-side Mean Absolute Error (MAE) between Float32 and INT8 predictions is **0.0066** (well within the $< 0.05$ threshold).
- **C-Header**: Successfully exported to `ml/models/uci_model_data.h` (`alignas(16) const unsigned char g_uci_model_data[]`, 10,848 bytes).

---

## 6. Critical Scientific Limitations & Honest Disclaimers

1. **No Patient-Level Independence**:
   - The UCI dataset stripped subject identifiers before publication. Because random rows originate from small patient recording pools (5 subjects in Bonn Set E), samples from the same recording session exist in both train and test sets. This evaluation is **sample-stratified**, not patient-independent.
2. **Pre-Segmented Feature Vectors vs. Continuous Streaming**:
   - Each UCI sample is an isolated 1-second segment (178 points @ 178 Hz). This does not replicate continuous scalp streaming with temporal drift, movement artifacts, and electrode disconnects.
3. **Not Proof of Clinical Efficacy**:
   - These metrics demonstrate algorithm functionality on a public benchmark, not clinical diagnostic readiness.

---

## 7. Arduino Nano 33 BLE Sense Hardware Considerations
- **Input Dimension**: The model requires an input vector of shape `(1, 178, 1)`.
- **Flash ROM Fit**: The $10.59\text{ KB}$ INT8 binary uses only ~1% of the Nano 33's 1 MB Flash.
- **Unverified Figures**: SRAM Tensor Arena usage and cycle latency on the Cortex-M4F must be measured directly on physical hardware; host checks only verify operator set compatibility.
