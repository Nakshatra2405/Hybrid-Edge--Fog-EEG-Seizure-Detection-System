# Model Card: TinySeizureNet-1D

## 1. Model Details
- **Architecture Name**: `TinySeizureNet-1D`
- **Model Type**: Compact 1D Convolutional Neural Network (Depthwise-Separable 1D-CNN)
- **Framework**: TensorFlow 2 / Keras -> TensorFlow Lite (INT8 Post-Training Quantized)
- **Target Hardware**: Arduino Nano 33 BLE Sense (Nordic nRF52840, Arm Cortex-M4F @ 64 MHz, 256 KB SRAM, 1 MB Flash)
- **Inference Runtime**: TensorFlow Lite for Microcontrollers (TFLite Micro)
- **Random Seed**: `42`

## 2. Intended Use & Clinical Limitations
- **Intended Purpose**: Academic engineering proof-of-concept demonstrating real-time, low-power seizure classification on edge microcontrollers.
- **Medical Disclaimer**: This model is an academic prototype evaluated on retrospective public benchmark data. It is **not** an FDA-cleared or CE-marked medical device and must **never** be used for primary clinical diagnosis or patient care without prospective clinical trials.

## 3. Signal Processing Contract
- **Input Dimensions**: `(1, 256, 1)` representing 2 seconds of single-channel EEG sampled at 128 Hz.
- **Electrode Channel**: Standard longitudinal bipolar channel `C3-P3` (Left Central-Parietal) with automated alias resolution and loud failure if missing.
- **Filtering**: Causal 6th-order Butterworth IIR bandpass filter (0.5 Hz - 35.0 Hz) using second-order sections (`sosfilt`).
- **Anti-Aliasing Verification**: Attenuation at the 64 Hz Nyquist folding frequency is numerically verified at **-41.25 dB** (gain = 0.00866, $<0.01$) before downsampling from 256 Hz to 128 Hz.
- **Normalization Choice & Trade-Off**: Per-window $z$-score normalization: $x_{\text{norm}} = (x - \mu) / \max(\sigma, 10^{-4}\mu\text{V})$.
  - *Advantage*: Zero data leakage across splits; eliminates inter-subject impedance variations and DC sweat drift; computationally trivial in C.
  - *Limitation*: Strips absolute voltage amplitude ($\mu\text{V}$). The network learns relative temporal waveform morphology and spectral rhythms rather than raw voltage amplitude.

## 4. Evaluation Protocol
- **Patient Isolation**: Strict mutually exclusive patient cohorts (Train, Validation, and Test subjects are pairwise disjoint).
- **Threshold Policy**: Decision threshold $\theta^*$ is selected strictly on the Validation set. The Test set is evaluated exactly once with frozen parameters.
- **Boundary Windows**: Windows with $0.0 < \text{overlap} < 0.50$ across seizure onset/offset are excluded to prevent label boundary noise.
- **Reported Metrics**:
  - `accuracy`, `precision`, `recall` (Sensitivity), `specificity`, `f1_score`, `balanced_accuracy`
  - `window_false_positive_per_hour` (FPW/h): Unmerged false positive 2s windows per hour of interictal EEG.
  - `event_false_alarms_per_hour` (FA/h): Distinct alarm events requiring $\ge 2$ consecutive positive windows (4s) with a 60-second refractory merging window.

## 5. Measured Artifacts & Hardware Feasibility

| Property | Measured Value | Measurement Context |
| :--- | :--- | :--- |
| **Total Trainable Parameters** | 2,417 parameters | Keras Model Architecture |
| **Float32 Model Size** | 15.00 KB | Host filesystem |
| **INT8 Quantized Flatbuffer** | 10.20 KB | Host filesystem (`model_int8.tflite`) |
| **C Byte Array Header** | 10.20 KB (`model_data.h`) | Source header for Arduino sketch |
| **Quantization Parity MAE** | 0.0005 ($< 0.05$ threshold) | Measured on host test windows |
| **Tensor Arena SRAM** | *Unverified Estimate* (~12-18 KB) | **Requires physical measurement on Arduino Nano 33 BLE Sense** |
| **Inference Latency** | *Unverified Estimate* (~10-25 ms) | **Requires physical measurement on Arduino Nano 33 BLE Sense** |
