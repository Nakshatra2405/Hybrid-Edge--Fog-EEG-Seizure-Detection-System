"""
Central Configuration for EEG Seizure Detection Pipeline
Enforces strict contracts, seeds, filter specifications, and cohort splits.
"""

from pathlib import Path

# Base Paths
ML_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ML_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
MODELS_DIR = ML_ROOT / "models"
REPORTS_DIR = ML_ROOT / "reports"

# Ensure runtime directories exist
for p in [RAW_DATA_DIR, PROCESSED_DATA_DIR, MODELS_DIR, REPORTS_DIR]:
    p.mkdir(parents=True, exist_ok=True)

# Random Seed for Reproducibility
RANDOM_SEED = 42

# Sampling Rate & Signal Specifications
ORIG_FS = 256.0           # Native CHB-MIT sampling rate (Hz)
TARGET_FS = 128.0         # Downsampled rate for microcontroller (Hz)
DECIMATION_FACTOR = int(ORIG_FS / TARGET_FS)  # 2

# Causal Anti-Aliasing & Bandpass Filter Specifications
# 6th-order Butterworth bandpass (0.5 - 35 Hz)
# Numerically verified: -3.01 dB at 35 Hz, -36.09 dB at 60 Hz, -41.25 dB at 64 Hz Nyquist
FILTER_LOWCUT = 0.5       # Hz (Removes DC drift & electrode sweat artifact)
FILTER_HIGHCUT = 35.0     # Hz (Antialiasing: -41.25 dB attenuation at 64 Hz Nyquist)
FILTER_ORDER = 6          # 3 cascaded second-order sections (biquads)
FILTER_TYPE = "bandpass"

# Windowing Specifications
WINDOW_SEC = 2.0                                # Window duration (seconds)
WINDOW_SAMPLES = int(WINDOW_SEC * TARGET_FS)    # 256 samples
INPUT_SHAPE = (1, WINDOW_SAMPLES, 1)            # Formatted for 1D-CNN (Batch, Height=1, Width=256, Channels=1)

# Overlap & Labeling Rules
TRAIN_ICTAL_STRIDE_SEC = 1.0                    # 50% overlap for positive ictal augmentation
TEST_STRIDE_SEC = 2.0                           # 0% overlap (continuous streaming simulation)
MIN_OVERLAP_RATIO_ICTAL = 0.50                  # >= 50% overlap -> Label 1 (Ictal)
MAX_OVERLAP_RATIO_INTERICTAL = 0.00             # 0% overlap -> Label 0 (Interictal)
# Note: Windows with 0.0 < overlap < 0.50 are ambiguous boundaries and are excluded

# Normalization & Numerical Safety
EPSILON_STD = 1e-4                              # Minimal standard deviation clamp (uV) to avoid zero-division

# Target Channel and Alias Resolver
TARGET_CHANNEL = "C3-P3"
CHANNEL_ALIASES = {
    "C3-P3": ["C3-P3", "EEG C3-P3", "C3-P3.", "EEG C3-P3.", "c3-p3"]
}

# Cohort Splits (Strictly Mutually Exclusive)
TRAIN_SUBJECTS = ["chb01", "chb03", "chb05", "chb07"]
VAL_SUBJECTS = ["chb10", "chb14"]
TEST_SUBJECTS = ["chb02", "chb08"]

# Minimal Smoke-Test Pipeline Targets (Software verification only)
SMOKE_SUBJECT = "chb01"
SMOKE_FILES = ["chb01_01.edf", "chb01_03.edf"]   # chb01_01: baseline normal; chb01_03: contains seizure
SMOKE_SUMMARY_FILE = "chb01-summary.txt"

# Event-Level Alarm Merging Specifications (For secondary FA/h calculation)
ALARM_CONSECUTIVE_WINDOWS = 2                   # Requires 2 consecutive positive windows (4s)
ALARM_REFRACTORY_SEC = 60.0                     # Merge alarms occurring within 60s into 1 event

# PhysioNet CHB-MIT Base URL
PHYSIONET_BASE_URL = "https://physionet.org/files/chbmit/1.0.0"
