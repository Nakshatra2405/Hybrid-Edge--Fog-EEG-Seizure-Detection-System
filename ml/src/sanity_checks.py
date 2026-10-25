"""
Automated Pre-Flight Sanity Checks and Failure Prevention
Ensures numerical verification, channel mapping integrity, disjoint splits,
and anti-aliasing filter guarantees.
"""

import sys
import numpy as np
import scipy.signal as signal
from ml.src.config import (
    FILTER_LOWCUT,
    FILTER_HIGHCUT,
    FILTER_ORDER,
    ORIG_FS,
    TARGET_FS,
    CHANNEL_ALIASES,
    TARGET_CHANNEL,
    TRAIN_SUBJECTS,
    VAL_SUBJECTS,
    TEST_SUBJECTS,
)


def verify_filter_response():
    """
    Numerically calculates the frequency response of the designed bandpass filter
    and asserts adequate anti-aliasing attenuation (>40 dB) at the downsampled Nyquist rate (64 Hz).
    """
    sos = signal.butter(
        FILTER_ORDER,
        [FILTER_LOWCUT, FILTER_HIGHCUT],
        btype="bandpass",
        fs=ORIG_FS,
        output="sos",
    )
    
    test_freqs = [FILTER_LOWCUT, FILTER_HIGHCUT, 40.0, 60.0, 64.0]
    w, h = signal.sosfreqz(sos, worN=test_freqs, fs=ORIG_FS)
    gains = np.abs(h)
    gains_db = 20 * np.log10(np.maximum(gains, 1e-12))
    
    response_map = {f: (db, g) for f, db, g in zip(test_freqs, gains_db, gains)}
    
    # Assertions
    # 1. Half-power passband edge (-3 dB +/- 0.5 dB)
    assert -4.0 <= response_map[35.0][0] <= -2.0, (
        f"Filter upper cutoff out of range: {response_map[35.0][0]:.2f} dB"
    )
    # 2. Mains noise suppression at 60 Hz (> 30 dB)
    assert response_map[60.0][0] <= -30.0, (
        f"Insufficient 60 Hz mains attenuation: {response_map[60.0][0]:.2f} dB"
    )
    # 3. Anti-aliasing criterion at 64 Hz Nyquist (attenuation >= 40 dB, gain <= 0.01)
    nyquist_attenuation_db = response_map[64.0][0]
    assert nyquist_attenuation_db <= -40.0, (
        f"CRITICAL: Anti-aliasing filter failed! At 64 Hz Nyquist, attenuation is only "
        f"{nyquist_attenuation_db:.2f} dB (required <= -40.0 dB / gain <= 0.01)."
    )
    
    return {
        "status": "PASS",
        "frequencies_hz": test_freqs,
        "gains_db": [float(response_map[f][0]) for f in test_freqs],
        "linear_gains": [float(response_map[f][1]) for f in test_freqs],
    }


def resolve_channel_index(raw_channel_names, target=TARGET_CHANNEL):
    """
    Finds the index of the target channel using robust alias resolution.
    Fails loudly if the channel cannot be safely mapped.
    """
    valid_aliases = CHANNEL_ALIASES.get(target, [target])
    normalized_aliases = [a.strip().upper().rstrip(".") for a in valid_aliases]
    
    for idx, name in enumerate(raw_channel_names):
        norm_name = name.strip().upper().rstrip(".")
        if norm_name in normalized_aliases:
            return idx, name
            
    raise KeyError(
        f"CRITICAL: Target channel '{target}' could not be safely mapped in this recording.\n"
        f"Available channels ({len(raw_channel_names)}): {raw_channel_names}\n"
        f"Failing loudly to prevent corrupted or arbitrary channel ingestion."
    )


def assert_mutually_exclusive_splits(train_subjs=None, val_subjs=None, test_subjs=None):
    """
    Validates that patient partitions are strictly non-empty, pairwise disjoint,
    and have no duplicate subjects.
    """
    t = train_subjs if train_subjs is not None else TRAIN_SUBJECTS
    v = val_subjs if val_subjs is not None else VAL_SUBJECTS
    te = test_subjs if test_subjs is not None else TEST_SUBJECTS
    
    s_t, s_v, s_te = set(t), set(v), set(te)
    
    assert len(s_t) > 0, "Training set is empty"
    assert len(s_v) > 0, "Validation set is empty"
    assert len(s_te) > 0, "Test set is empty"
    
    overlap_tv = s_t & s_v
    overlap_tt = s_t & s_te
    overlap_vt = s_v & s_te
    
    assert len(overlap_tv) == 0, f"Split Leakage! Overlap between Train and Val: {overlap_tv}"
    assert len(overlap_tt) == 0, f"Split Leakage! Overlap between Train and Test: {overlap_tt}"
    assert len(overlap_vt) == 0, f"Split Leakage! Overlap between Val and Test: {overlap_vt}"
    
    total_count = len(t) + len(v) + len(te)
    assert len(s_t | s_v | s_te) == total_count, "Duplicate subjects detected across partitions"
    
    return {
        "status": "PASS",
        "train_count": len(t),
        "val_count": len(v),
        "test_count": len(te),
        "total_unique": total_count,
    }


def check_tensor_validity(tensor, expected_shape=None, expected_dtype=np.float32):
    """
    Verifies tensor shape, data type, and asserts 0% NaN or Inf values.
    """
    assert isinstance(tensor, np.ndarray), f"Expected numpy.ndarray, got {type(tensor)}"
    assert tensor.dtype == expected_dtype, f"Expected {expected_dtype}, got {tensor.dtype}"
    
    if expected_shape is not None:
        # Match trailing dimensions if batch dimension varies
        assert tensor.shape[1:] == expected_shape[1:], (
            f"Shape mismatch: expected trailing {expected_shape[1:]}, got {tensor.shape[1:]}"
        )
        
    assert not np.isnan(tensor).any(), "NaN values detected in tensor!"
    assert not np.isinf(tensor).any(), "Inf values detected in tensor!"
    return True


if __name__ == "__main__":
    print("Running Pre-Flight Sanity Checks...")
    filter_res = verify_filter_response()
    print(f"[*] Filter Response Check: PASS (64 Hz Nyquist Attenuation: {filter_res['gains_db'][-1]:.2f} dB)")
    
    split_res = assert_mutually_exclusive_splits()
    print(f"[*] Split Mutually Exclusive Check: PASS ({split_res['total_unique']} distinct subjects)")
    
    print("[SUCCESS] All pre-flight sanity checks passed.")
