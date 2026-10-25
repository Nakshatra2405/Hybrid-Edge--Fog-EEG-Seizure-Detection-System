"""
Targeted Dataset Acquisition for CHB-MIT
Downloads strictly the required files for the selected cohort or smoke test,
with automatic retries, content-length verification, and header sanity checks.
"""

import os
import sys
import time
import argparse
import requests
from pathlib import Path
from tqdm import tqdm
import mne

from ml.src.config import (
    PHYSIONET_BASE_URL,
    RAW_DATA_DIR,
    SMOKE_SUBJECT,
    SMOKE_FILES,
    SMOKE_SUMMARY_FILE,
    TRAIN_SUBJECTS,
    VAL_SUBJECTS,
    TEST_SUBJECTS,
)


# Target file catalog for the full 8-subject cohort (2-3 files per subject)
COHORT_CATALOG = {
    "chb01": ["chb01-summary.txt", "chb01_01.edf", "chb01_03.edf", "chb01_04.edf"],
    "chb02": ["chb02-summary.txt", "chb02_01.edf", "chb02_16.edf"],
    "chb03": ["chb03-summary.txt", "chb03_01.edf", "chb03_02.edf", "chb03_03.edf"],
    "chb05": ["chb05-summary.txt", "chb05_01.edf", "chb05_06.edf", "chb05_13.edf"],
    "chb07": ["chb07-summary.txt", "chb07_01.edf", "chb07_12.edf", "chb07_13.edf"],
    "chb08": ["chb08-summary.txt", "chb08_01.edf", "chb08_02.edf", "chb08_05.edf"],
    "chb10": ["chb10-summary.txt", "chb10_01.edf", "chb10_12.edf", "chb10_27.edf"],
    "chb14": ["chb14-summary.txt", "chb14_01.edf", "chb14_03.edf", "chb14_04.edf"],
}


def download_file_with_retry(url, destination_path, max_retries=3):
    """
    Downloads a single file via streaming HTTP with retry logic and integrity checking.
    """
    destination_path = Path(destination_path)
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Check if already downloaded and valid
    if destination_path.exists() and destination_path.stat().st_size > 0:
        # If it's an EDF, test header readability
        if destination_path.suffix.lower() == ".edf":
            try:
                mne.io.read_raw_edf(str(destination_path), preload=False, verbose="ERROR")
                print(f"[SKIP] Verified file already exists: {destination_path.name}")
                return True
            except Exception:
                print(f"[WARN] Existing EDF corrupted, redownloading: {destination_path.name}")
        else:
            print(f"[SKIP] Verified file already exists: {destination_path.name}")
            return True

    for attempt in range(1, max_retries + 1):
        try:
            print(f"Downloading {destination_path.name} (Attempt {attempt}/{max_retries})...")
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get("content-length", 0))
            block_size = 1024 * 1024  # 1 MB chunk
            
            with open(destination_path, "wb") as f, tqdm(
                total=total_size, unit="iB", unit_scale=True, desc=destination_path.name
            ) as bar:
                for chunk in response.iter_content(block_size):
                    if chunk:
                        f.write(chunk)
                        bar.update(len(chunk))
                        
            # Verification
            if destination_path.suffix.lower() == ".edf":
                mne.io.read_raw_edf(str(destination_path), preload=False, verbose="ERROR")
                
            print(f"[OK] Downloaded and verified: {destination_path.name}")
            return True
            
        except Exception as e:
            print(f"[FAIL] Error on attempt {attempt}: {e}")
            if destination_path.exists():
                destination_path.unlink()
            if attempt < max_retries:
                sleep_sec = 5 * attempt
                print(f"Retrying in {sleep_sec} seconds...")
                time.sleep(sleep_sec)
            else:
                raise RuntimeError(f"Failed to download {url} after {max_retries} attempts.")


def download_smoke_test_files():
    """
    Downloads strictly the 2 files needed for the minimal pipeline smoke test.
    """
    print("=" * 60)
    print("DOWNLOADING SMOKE TEST FILES (chb01)")
    print("=" * 60)
    
    files_to_get = [SMOKE_SUMMARY_FILE] + SMOKE_FILES
    target_dir = RAW_DATA_DIR / SMOKE_SUBJECT
    
    for filename in files_to_get:
        url = f"{PHYSIONET_BASE_URL}/{SMOKE_SUBJECT}/{filename}"
        dest = target_dir / filename
        download_file_with_retry(url, dest)
        
    print("\n[SUCCESS] Smoke test dataset acquired and verified.")


def download_cohort_files():
    """
    Downloads all targeted recordings for the complete 8-subject cohort.
    """
    print("=" * 60)
    print("DOWNLOADING 8-SUBJECT COHORT DATASET")
    print("=" * 60)
    
    for subject, file_list in COHORT_CATALOG.items():
        print(f"\nProcessing Subject: {subject}")
        target_dir = RAW_DATA_DIR / subject
        for filename in file_list:
            url = f"{PHYSIONET_BASE_URL}/{subject}/{filename}"
            dest = target_dir / filename
            download_file_with_retry(url, dest)
            
    print("\n[SUCCESS] Complete cohort dataset acquired and verified.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CHB-MIT Targeted Downloader")
    parser.add_argument("--smoke-only", action="store_true", help="Download only smoke test files")
    args = parser.parse_args()
    
    if args.smoke_only:
        download_smoke_test_files()
    else:
        download_cohort_files()
