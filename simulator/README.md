# Patient EEG Simulator

This component simulates live EEG data streams from single or multiple patients and publishes them over MQTT to the Raspberry Pi Edge devices.

## Setup Instructions

1. Place sample EEG data files (`.csv` or `.edf`) in the `data/` folder.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run generator script:
   ```bash
   python src/generator.py
   ```
