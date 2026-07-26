# Raspberry Pi 5 Edge Computing Module

This module runs containerized services on the Raspberry Pi 5 for receiving real-time EEG streams, performing AI inference using TensorFlow Lite / ONNX Runtime, sending alerts to the Hospital Server, and managing Over-The-Air (OTA) model updates.

## Folder Contents
- `src/`: Core Python modules for inference, MQTT communication, and OTA handling.
- `models/`: Location where `.tflite` model files are stored.
