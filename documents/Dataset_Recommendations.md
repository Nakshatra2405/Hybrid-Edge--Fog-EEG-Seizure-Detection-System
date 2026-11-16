# EEG Dataset Recommendations for Seizure Detection

This document provides a breakdown and recommendation of free, public EEG datasets suitable for training the AI model and building the real-time patient simulator for the **Hybrid Edge–Fog EEG Seizure Detection System**.

---

## 1. Primary Recommendation: CHB-MIT Scalp EEG Database

* **Source**: PhysioNet / Kaggle ([CHB-MIT Scalp EEG Database on PhysioNet](https://physionet.org/content/chbmit/1.0.0/))
* **Size**: ~50 GB raw EDF files (also available as smaller preprocessed subsets on Kaggle).
* **Format**: `.edf` (European Data Format) raw continuous multichannel signals, plus annotation files (`.seizures` / `.edf.seizures`) marking exact seizure start and end timestamps.
* **Channels**: 22 to 23 scalp EEG channels recorded at 256 Hz sampling frequency.
* **Subjects**: 23 pediatric subjects with intractable seizures.

### Why CHB-MIT is Recommended:
1. **Realistic Hospital Simulation**: Provides multi-channel continuous streaming data that matches real clinical ward setups.
2. **Gold Standard Benchmark**: Widely recognized in peer-reviewed literature for seizure detection and prediction algorithms.
3. **Flexible Subsampling**: You can train on a 1-channel or 4-channel subset (e.g. FP1-F3, C3-P3, CZ-PZ) to reduce model compute size for the Raspberry Pi 5.

---

## 2. Fast Prototype Alternative: UCI Epilepsy Seizure Recognition Dataset

* **Source**: Kaggle ([Epilepsy Seizure Recognition on Kaggle](https://www.kaggle.com/datasets/harunresit/epilepsy-seizure-recognition-dataset))
* **Size**: ~30 MB (11,500 samples).
* **Format**: `.csv` file.
* **Details**: A preprocessed, standardized version of the renowned **Bonn EEG Dataset**. Each row contains 178 signal values (representing 1 second of EEG recording sampled at 178 Hz) and a class label (1 = seizure activity, 2–5 = non-seizure activity / healthy).

### Why UCI / Bonn is Useful for Initial Development:
1. **Zero Preprocessing Required**: No complex EDF parsing or multi-channel alignment needed.
2. **Fast Baseline Model Training**: Your AI team can train an initial 1D-CNN, SVM, or Random Forest model within 10–15 minutes.
3. **Quick Edge-Server Pipeline Verification**: Perfect for unblocking the Edge, Server, and Dashboard team members to verify MQTT streaming and inference end-to-end.

---

## 3. Secondary Research Dataset: Bonn University EEG Dataset

* **Source**: University of Bonn / Kaggle mirrors
* **Format**: Text / ASCII files.
* **Details**: 5 sets (A, B, C, D, E), each containing 100 single-channel EEG segments of 23.6 seconds duration (sampled at 173.61 Hz). Sets A & B are from healthy subjects, C & D from seizure-free zones in epileptic patients, and E during seizure activity.

---

## Summary Recommendation Matrix

| Dataset | Best Used For | Format | Preprocessing Effort | Streaming Realism |
| :--- | :--- | :--- | :--- | :--- |
| **CHB-MIT** | **Full System & Final Demo** | `.edf` / NumPy | Medium (MNE / SciPy filtering) | **High** (Multi-channel continuous) |
| **UCI Seizure Data** | **Rapid Pipeline Prototyping** | `.csv` | Very Low (Ready to train) | Medium (1-second chunk streaming) |
| **Bonn Dataset** | **Experimental Benchmarks** | Text / ASCII | Low | Medium |

### Proposed Next Step for AI Team:
1. Start with the **UCI Epilepsy Seizure Recognition Dataset** on Kaggle to build a simple `.tflite` model for immediate pipeline testing.
2. Upgrade to the **CHB-MIT Scalp EEG Database** for final multi-channel hospital simulation and realistic edge deployment on the Raspberry Pi 5.
