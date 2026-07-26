# AI Analytics & Model Training Pipeline

This directory handles AI model development for seizure detection:
- `notebooks/`: Exploratory Data Analysis (EDA) and experimental model architecture notebooks.
- `src/dataset.py`: Data loaders for Kaggle datasets (UCI Seizure Data / CHB-MIT EDFs).
- `src/preprocess.py`: EEG signal filtering (bandpass 0.5–40 Hz), window segmentation, and normalization.
- `src/train.py`: Model training script.
- `src/convert_to_tflite.py`: Converts trained PyTorch/TensorFlow models into quantized `.tflite` / `.onnx` models for deployment on Raspberry Pi 5.
- `models/`: Saved model weights (`.h5`, `.pth`, `.tflite`).
